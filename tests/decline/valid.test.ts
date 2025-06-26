import { assert } from "chai";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TestContext } from "../setup";
import * as anchor from "@coral-xyz/anchor";

export async function declineSuccess(ctx: TestContext) {
  // Call the decline instruction
  await getDeclineTransaction(ctx, ctx.service).rpc();

  // Fetch the order and check status
  const order = await ctx.program.account.order.fetch(ctx.orderPda);
  assert.isDefined(order.status.aborted);

  // Check that the user's token balance is restored
  const userAccount = await getAccount(ctx.connection, ctx.userTokenAccount);
  assert.equal(Number(userAccount.amount), 2_000_000);

  // Check order vault token account is closed
  try {
    await getAccount(ctx.connection, ctx.orderVaultTokenAccount);
    assert.fail("Order vault token account should be closed");
  } catch (error) {
    assert.equal(error.name, "TokenAccountNotFoundError");
  }
}

// Helper to build the decline transaction, similar to getDeliverTransaction
function getDeclineTransaction(ctx: TestContext, authority: anchor.web3.Keypair) {
  return ctx.program.methods
    .decline()
    .accounts({
      authority: authority.publicKey,
      user: ctx.user.publicKey,
      order: ctx.orderPda,
      userTokenAccount: ctx.userTokenAccount,
      orderVaultTokenAccount: ctx.orderVaultTokenAccount,
      config: ctx.configPda,
      mint: ctx.mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId
    })
    .signers([authority]);
} 