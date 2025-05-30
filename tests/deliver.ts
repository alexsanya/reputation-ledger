import * as anchor from "@coral-xyz/anchor";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";
import { TestContext } from "./setup";
import { AnchorError } from "@coral-xyz/anchor";

export async function deliverSuccess(ctx: TestContext) {
    const tx = await ctx.program.methods
      .deliver(ctx.resultHash)
      .accounts({
        authority: ctx.service.publicKey,
        order: ctx.orderPda,
        orderVaultTokenAccount: ctx.orderVaultTokenAccount,
        vaultAuthority: ctx.vaultAuthority,
        vaultTokenAccount: ctx.vaultTokenAccount,
        config: ctx.configPda,
        mint: ctx.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([ctx.service])
      .rpc();

    const order = await ctx.program.account.order.fetch(ctx.orderPda);
    assert.isDefined(order.status.completed);
    const vaultBalance = (await getAccount(ctx.connection, ctx.vaultTokenAccount)).amount;
    assert.equal(vaultBalance, ctx.price);
} 

export async function deliverUnauthorized(ctx: TestContext) {
    try {
      await ctx.program.methods
        .deliver(ctx.resultHash)
        .accounts({
          authority: ctx.user.publicKey,
          order: ctx.orderPda,
          orderVaultTokenAccount: ctx.orderVaultTokenAccount,
          vaultAuthority: ctx.vaultAuthority,
          vaultTokenAccount: ctx.vaultTokenAccount,
          config: ctx.configPda,
          mint: ctx.mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([ctx.user.payer])
        .rpc();

      assert.fail("Should have failed");
    } catch (error) {
        assert.isTrue(error instanceof AnchorError);
        const err: AnchorError = error;
        assert.strictEqual(err.error.errorCode.code, "ConstraintHasOne");
    }
}

export async function deliverWrongMint(ctx: TestContext) {
    try {
      await ctx.program.methods
        .deliver(ctx.resultHash)
        .accounts({
          authority: ctx.user.publicKey,
          order: ctx.orderPda,
          orderVaultTokenAccount: ctx.orderVaultTokenAccount,
          vaultAuthority: ctx.vaultAuthority,
          vaultTokenAccount: ctx.vaultTokenAccount,
          config: ctx.configPda,
          mint: ctx.mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([ctx.user.payer])
        .rpc();

      assert.fail("Should have failed");
    } catch (error) {
        assert.isTrue(error instanceof AnchorError);
        const err: AnchorError = error;
        assert.strictEqual(err.error.errorCode.code, "ConstraintHasOne");
    }
}