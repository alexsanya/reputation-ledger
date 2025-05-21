import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";
import { TestContext } from "./setup";
import { getAccount } from "@solana/spl-token";

export async function commit(ctx: TestContext) {
    const tx = await ctx.program.methods
      .commit(ctx.price)
      .accounts({
        user: ctx.user.publicKey,
        order: ctx.orderPda,
        userTokenAccount: ctx.userTokenAccount,
        orderVaultTokenAccount: ctx.orderVaultTokenAccount,
        mint: ctx.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([ctx.user.payer])
      .rpc();

    const order = await ctx.program.account.order.fetch(ctx.orderPda);
    assert.isDefined(order.status.started);

    // Check vault balance
    const vaultAccount = await getAccount(ctx.connection, ctx.orderVaultTokenAccount);
    assert.equal(Number(vaultAccount.amount), ctx.price.toNumber());
} 