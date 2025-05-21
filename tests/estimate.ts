import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { TestContext } from "./setup";

export async function estimate(ctx: TestContext) {
    const config = await ctx.program.account.config.fetch(ctx.configPda);
    console.log(config);
    await ctx.program.methods
      .estimate(ctx.jobHash)
      .accounts({
        user: ctx.user.publicKey,
        order: ctx.orderPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([ctx.user.payer])
      .rpc();

    const order = await ctx.program.account.order.fetch(ctx.orderPda);
    assert.equal(order.user.toString(), ctx.user.publicKey.toString());
    assert.isDefined(order.status.placed);
}