import { getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { TestContext } from "./setup";
import { buildWithdrawTransaction } from "./helpers/withdraw";
import { AnchorError } from "@coral-xyz/anchor";
import { Keypair, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";

export async function withdraw(ctx: TestContext) {
    // Get initial balances
    const initialVaultBalance = (await getAccount(ctx.connection, ctx.vaultTokenAccount)).amount;
    const initialRecipientBalance = (await getAccount(ctx.connection, ctx.recipientTokenAccount)).amount;

    // Withdraw tokens
    await buildWithdrawTransaction(ctx).rpc();

    // Check final balances
    const finalVaultBalance = (await getAccount(ctx.connection, ctx.vaultTokenAccount)).amount;
    const finalRecipientBalance = (await getAccount(ctx.connection, ctx.recipientTokenAccount)).amount;

    // Verify vault is empty
    assert.equal(Number(finalVaultBalance), 0, "Vault should be empty after withdrawal");
    
    // Verify recipient received the tokens
    assert.equal(
        Number(finalRecipientBalance) - Number(initialRecipientBalance),
        Number(initialVaultBalance),
        "Recipient should receive all tokens from vault"
    );
} 

export async function withdrawWrongAuthority(ctx: TestContext) {
    try {
        await buildWithdrawTransaction(ctx, {
            authority: ctx.user.publicKey,
            signer: ctx.user.payer,
            recipientTokenAccount: ctx.userTokenAccount
        }).rpc();
        assert.fail("Should have failed");
    } catch (error) {
        assert.isTrue(error instanceof AnchorError);
        const err: AnchorError = error;
        assert.strictEqual(err.error.errorCode.code, "ConstraintHasOne");
        assert.strictEqual(err.error.origin, "config");
    }
}

export async function withdrawWrongConfig(ctx: TestContext) {
    try {
      const emptyDataAccount = Keypair.generate();
      const space = 104;
      const lamports = await ctx.connection.getMinimumBalanceForRentExemption(space);
      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: ctx.service.publicKey,
          newAccountPubkey: emptyDataAccount.publicKey,
          lamports,
          space,
          programId: ctx.program.programId
        })
      );
      await sendAndConfirmTransaction(ctx.connection, tx, [
        ctx.service,
        emptyDataAccount
      ]);
        await buildWithdrawTransaction(ctx, {
            config: emptyDataAccount.publicKey
        }).rpc();
        assert.fail("Should have failed");
    } catch (error) {
        assert.isTrue(error instanceof AnchorError);
        const err: AnchorError = error;
        assert.strictEqual(err.error.errorCode.code, "AccountDiscriminatorMismatch");
        assert.strictEqual(err.error.origin, "config");
    }
}