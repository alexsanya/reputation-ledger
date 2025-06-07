import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { setup, TestContext } from "./setup";
import { deliverSuccess, deliverUnauthorized } from "./deliver";
import { withdraw } from "./withdraw";
import { commitSuccess, commitWrongSignature, commitMissingInstruction, commitWrongInstruction, commitWrongMint, commitInsufficientFunds } from "./commit";

describe("gateway", () => {
  // Configure the client to use the local cluster.
  let ctx: TestContext;

  before(async () => {
    ctx = await setup();
  });

  describe("Commit", async () => {
    it("Missing instruction", async () => {
      await commitMissingInstruction(ctx);
    });
    it("Wrong program id", async () => {
      await commitWrongInstruction(ctx);
    });
    it("Wrong signer", async () => {
      await commitWrongSignature(ctx);
    });
    it("Wrong mint", async () => {
      await commitWrongMint(ctx);
    });

    it("Replay attack", async () => {
      // TODO: Implement replay attack
      //await commitReplayAttack(ctx);
    });

    it("Wrong job hash", async () => {
      // TODO: Implement wrong job hash
      //await commitWrongJobHash(ctx);
    });

    it("Wrong token account owner", async () => {
      // TODO: Implement wrong token account owner
      //await commitWrongTokenAccountOwner(ctx);
    });

    it("Insufficient funds", async () => {
      await commitInsufficientFunds(ctx);
    });

    it("Expired price", async () => {
      // TODO: Implement expired price
      //await commitExpiredPrice(ctx);
    });

    it("Success", async () => {
      await commitSuccess(ctx);
    });
  });

  describe("Deliver", async () => {
    it("Deliver unauthorized", async () => {
      await deliverUnauthorized(ctx);
    });
    it("Delivers the result", async () => {
      await deliverSuccess(ctx);
    });
  });

  describe("Withdraw", async () => {
    it("Withdraws tokens from vault", async () => {
      await withdraw(ctx);
    });
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
