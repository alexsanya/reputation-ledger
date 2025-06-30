import { assert } from "chai";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TestContext } from "../setup";
import { commitOrder } from "../helpers/order";
import { AnchorError } from "@coral-xyz/anchor";

export async function refundBeforeDeadline(ctx: TestContext) {
    const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;
    let deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY_IN_MS);
    const { orderPda, orderVaultTokenAccount } = await commitOrder(ctx, "refundBeforeDeadline", deadline);

    try {
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
    } catch (error) {
      assert.isTrue(error instanceof AnchorError);
      const err: AnchorError = error;
      assert.strictEqual(err.error.errorCode.code, "RefundBeforeDeadline");
    }
}