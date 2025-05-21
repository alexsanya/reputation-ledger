import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { TestContext } from "./setup";

export async function evaluate(ctx: TestContext) {
    const tx = await ctx.program.methods
      .evaluate(ctx.price, new anchor.BN(Date.now() / 1000 + 3600)) // 1 hour deadline
      .accounts({
        order: ctx.orderPda,
        authority: ctx.service.publicKey,
        config: ctx.configPda,
      })
      .signers([ctx.service])
      .rpc();

    const order = await ctx.program.account.order.fetch(ctx.orderPda);
    assert.equal(order.price.toString(), ctx.price.toString());
    assert.isDefined(order.status.evaluated);
} 