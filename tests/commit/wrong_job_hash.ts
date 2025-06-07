import { assert } from "chai";
import Keccak from 'keccak';
import { TestContext } from "../setup";
import {
  buildOrderMessage,
  signEd25519,
  buildCommitTransaction,
  prepareAndSubmitTransaction,
} from "../helpers/commit";

export async function commitWrongJobHash(testCtx: TestContext) {
  const message = await buildOrderMessage(testCtx, {
    job_hash: Keccak('keccak256').update("wrong job hash").digest()
  });
  // Sign with wrong key (user instead of service)
  const signature = await signEd25519(message, testCtx.service.secretKey);
  
  const tx = await buildCommitTransaction(
    testCtx,
    message,
    signature,
    testCtx.service.publicKey.toBytes()
  );

  try {
    await prepareAndSubmitTransaction(testCtx, tx);
    assert.fail("Should have failed with InvalidJobHash");
  } catch (error: any) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log: string) => log.includes("Error Code: InvalidJobHash"))
    );
  }
} 