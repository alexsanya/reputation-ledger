import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { setup, TestContext } from "./setup";
import { deliverAfterDeadline, deliverSuccess, deliverUnauthorized, replayDeliver, wrongOrderAccount, wrongTokenAccountOwner } from "./deliver";
import { withdraw, withdrawWrongAuthority, withdrawWrongConfig } from "./withdraw";
import { commitWrongSignature } from "./commit/invalid_signature.test";
import { commitWrongInstruction } from "./commit/invalid_signature.test";
import { commitMissingInstruction } from "./commit/invalid_signature.test";
import { commitWrongMint, commitWrongTokenAccountOwner } from "./commit/wrong_data.test";
import { commitInsufficientFunds } from "./commit/wrong_data.test";
import { commitSuccess } from "./commit/valid.test";
import { commitReplayAttack } from "./commit/replay.test";
import { commitWrongJobHash } from "./commit/wrong_job_hash.test";
import { commitExpiredPrice } from "./commit/expired_price.test";
import { declineSuccess } from "./decline/valid.test";
import { refundSuccess } from "./refund/valid.test";
import { refundBeforeDeadline } from "./refund/before_deadline.test";

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

    it("Wrong job hash", async () => {
      await commitWrongJobHash(ctx);
    });

    it("Wrong token account owner", async () => {
      await commitWrongTokenAccountOwner(ctx);
    });

    it("Insufficient funds", async () => {
      await commitInsufficientFunds(ctx);
    });

    it("Expired price", async () => {
      await commitExpiredPrice(ctx);
    });

    it("Success", async () => {
      await commitSuccess(ctx);
    });

    it("Replay attack", async () => {
      await commitReplayAttack(ctx);
    });
  });

  describe("Deliver", async () => {
    it("Deliver unauthorized", async () => {
      await deliverUnauthorized(ctx);
    });
    it("Wrong token account owner", async () => {
      await wrongTokenAccountOwner(ctx);
    });
    it("Wrong order account", async () => {
      await wrongOrderAccount(ctx);
    });
    it("Deliver after deadline", async () => {
      await deliverAfterDeadline(ctx);
    });
    it("Delivers the result", async () => {
      await deliverSuccess(ctx);
    });
    it("Replay deliver", async () => {
      await replayDeliver(ctx);
    });
  });

  describe("Withdraw", async () => {
    it("Wrong authority", async () => {
      await withdrawWrongAuthority(ctx);
    });
    it("Wrong config", async () => {
      await withdrawWrongConfig(ctx);
    });
    it("Withdraws tokens from vault", async () => {
      await withdraw(ctx);
    });
  });

  describe("Decline", async () => {
    let ctx_decline: TestContext;

    before(async () => {
      ctx_decline = await setup({ service: ctx.service, run_initialize: false, jobString: "new job hash" });
    });

    it("Declines the order", async () => {
      await commitSuccess(ctx_decline);
      await declineSuccess(ctx_decline);
    });
  });

  describe("Refund", async () => {
    it("Refund before deadline", async () => {
      await refundBeforeDeadline(ctx);
    });
    it("Allows refund after timeout", async () => {
      await refundSuccess(ctx);
    });
  });
});
