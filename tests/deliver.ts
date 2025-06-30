import { getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { TestContext } from "./setup";
import { AnchorError } from "@coral-xyz/anchor";
import { getDeliverTransaction } from "./helpers/deliver";
import { buildCommitTransaction, buildOrderMessage, createMintAndTokenAccount, prepareAndSubmitTransaction, signEd25519 } from "./helpers/commit";
import { Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import Keccak from 'keccak';

export async function deliverSuccess(ctx: TestContext) {
    await getDeliverTransaction(ctx, ctx.service).rpc();

    const order = await ctx.program.account.order.fetch(ctx.orderPda);
    assert.isDefined(order.status.completed);
    const vaultBalance = (await getAccount(ctx.connection, ctx.vaultTokenAccount)).amount;
    assert.equal(vaultBalance, ctx.price);

    try {
      await getAccount(ctx.connection, ctx.orderVaultTokenAccount);
      assert.fail("Order vault token account should be closed");
    } catch (error) {
      assert.equal(error.name, "TokenAccountNotFoundError");
    }
} 

export async function deliverUnauthorized(ctx: TestContext) {
    try {
      await getDeliverTransaction(ctx, ctx.user.payer).rpc();
      assert.fail("Should have failed");
    } catch (error) {
        assert.isTrue(error instanceof AnchorError);
        const err: AnchorError = error;
        assert.strictEqual(err.error.errorCode.code, "ConstraintHasOne");
    }
}

export async function replayDeliver(ctx: TestContext) {
    try {
        await getDeliverTransaction(ctx, ctx.service).rpc();
        assert.fail("Should have failed");
    } catch (error) {
        assert.isTrue(error instanceof AnchorError);
        const err: AnchorError = error;
        assert.equal(err.error.origin, "order_vault_token_account");
        assert.strictEqual(err.error.errorCode.code, "AccountNotInitialized");
    }
}

export async function wrongTokenAccountOwner(ctx: TestContext) {
    const { fakeTokenAccount } = await createMintAndTokenAccount(ctx, ctx.user.publicKey, 2_000_000, ctx.mint);
    try {
        await getDeliverTransaction(ctx, ctx.service, {
          orderVaultTokenAccount: fakeTokenAccount.address
        }).rpc();
        assert.fail("Should have failed");
    } catch (error) {
        assert.isTrue(error instanceof AnchorError);
        const err: AnchorError = error;
        assert.strictEqual(err.error.errorCode.code, "InvalidOrderVaultTokenAccountOwner");
    }
}

export async function wrongOrderAccount(ctx: TestContext) {
    try {
      const emptyDataAccount = Keypair.generate();
      const space = 145;
      const lamports = await ctx.connection.getMinimumBalanceForRentExemption(space);
      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: ctx.user.publicKey,
          newAccountPubkey: emptyDataAccount.publicKey,
          lamports,
          space,
          programId: ctx.program.programId
        })
      );
      await sendAndConfirmTransaction(ctx.connection, tx, [
        ctx.user.payer,
        emptyDataAccount
      ]);
      await getDeliverTransaction(ctx, ctx.service, {
        order: emptyDataAccount.publicKey
      }).rpc();
      assert.fail("Should have failed");
    } catch (error) {
        assert.isTrue(error instanceof AnchorError);
        const err: AnchorError = error;
        assert.strictEqual(err.error.errorCode.code, "AccountDiscriminatorMismatch");
        assert.strictEqual(err.error.origin, "order");
    }
}

export async function deliverAfterDeadline(ctx: TestContext) {
  const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;
  const job_hash = Keccak('keccak256').update("deliverAfterDeadline").digest();
  const message = await buildOrderMessage(ctx, {
    job_hash,
    deadline: BigInt(Math.floor(Date.now() / 1000) - ONE_DAY_IN_MS)
  });
  const signature = await signEd25519(message, ctx.service.secretKey);
  const [orderPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("order"), ctx.user.publicKey.toBuffer(), job_hash],
    ctx.program.programId
  );
  const [orderVaultTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), orderPda.toBuffer()],
    ctx.program.programId
  );
  const tx = await buildCommitTransaction({
    ...ctx,
    orderPda,
    jobHash: job_hash,
    orderVaultTokenAccount,
  }, message, signature);

  await prepareAndSubmitTransaction(ctx, tx);

  try {
      await getDeliverTransaction(ctx, ctx.service, {
          order: orderPda,
      }).rpc();
      assert.fail("Should have failed");
  } catch (error) {
      assert.isTrue(error instanceof AnchorError);
      const err: AnchorError = error;
      assert.strictEqual(err.error.errorCode.code, "DeliverAfterDeadline");
  }
}