import { assert } from "chai";
import * as anchor from "@coral-xyz/anchor";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TestContext } from "../setup";
import { commitOrder } from "../helpers/order";

export async function refundSuccess(ctx: TestContext) {
    const { orderPda, orderVaultTokenAccount } = await commitOrder(ctx, "refundSuccess");

    await ctx.program.methods
      .refund()
      .accounts({
        user: ctx.user.publicKey,
        order: orderPda,
        userTokenAccount: ctx.userTokenAccount,
        orderVaultTokenAccount,
        mint: ctx.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .signers([ctx.user.payer])
      .rpc();

    // Fetch the order and check status
    const order = await ctx.program.account.order.fetch(orderPda);
    assert.isDefined(order.status.refunded);

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