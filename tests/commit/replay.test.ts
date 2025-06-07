import { assert } from "chai";
import { TestContext } from "../setup";
import {
  buildOrderMessage,
  signEd25519,
  buildCommitTransaction,
  prepareAndSubmitTransaction,
} from "../helpers/commit";
import { AnchorError } from "@coral-xyz/anchor";

export async function commitReplayAttack(testCtx: TestContext) {
  const message = await buildOrderMessage(testCtx);
  const signature = await signEd25519(message, testCtx.service.secretKey);
  const tx = await buildCommitTransaction(testCtx, message, signature);

  try {
    const sig = await prepareAndSubmitTransaction(testCtx, tx);
  } catch (error: any) {
    assert.isDefined(error.logs);
    assert.isTrue(error.logs.some(err => err === `Allocate: account Address { address: ${testCtx.orderPda.toBase58()}, base: None } already in use`))
  }
} 