import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { TestContext } from "./setup";
import { setup } from "./setup";
import { estimate } from "./estimate";
import { evaluate } from "./evaluate";
import { commit } from "./commit";
import { deliver } from "./deliver";

describe("gateway", () => {
  // Configure the client to use the local cluster.
  let ctx: TestContext;

  before(async () => {
    ctx = await setup();
  });

  it("Estimate order", async () => {
    await estimate(ctx);
  });

  it("Evaluates the order", async () => {
    await evaluate(ctx);
  });

  it("Commits to the order", async () => {
    await commit(ctx);
  });

  it("Delivers the result", async () => {
    await deliver(ctx);
  });

  it.skip("Allows refund after timeout", async () => {
    const tx = await ctx.program.methods
      .refund()
      .accounts({
        order: ctx.orderPda,
        userTokenAccount: ctx.userTokenAccount,
        orderVaultTokenAccount: ctx.orderVaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const order = await ctx.program.account.order.fetch(ctx.orderPda);
    assert.isDefined(order.status.refunded);

    // Check user balance is restored
    const userAccount = await getAccount(ctx.connection, ctx.userTokenAccount);
    assert.equal(Number(userAccount.amount), 2_000_000);
  });
});
