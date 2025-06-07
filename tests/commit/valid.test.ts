import { assert } from "chai";
import { getAccount } from "@solana/spl-token";
import { TestContext } from "../setup";
import {
  buildOrderMessage,
  signEd25519,
  buildCommitTransaction,
  prepareAndSubmitTransaction,
} from "../helpers/commit";

export async function commitSuccess(testCtx: TestContext) {
  const message = await buildOrderMessage(testCtx);
  const signature = await signEd25519(message, testCtx.service.secretKey);
  const tx = await buildCommitTransaction(testCtx, message, signature);

  const sig = await prepareAndSubmitTransaction(testCtx, tx);

  // Verify the order was created and has correct data
  const order = await testCtx.program.account.order.fetch(testCtx.orderPda);
  assert.isDefined(order.status.started);
  assert.equal(order.user.toBase58(), testCtx.user.publicKey.toBase58());
  
  const orderJobHash = Buffer.from(order.jobHash).toString("hex");
  const ctxJobHash = Buffer.from(testCtx.jobHash).toString("hex");
  assert.equal(orderJobHash, ctxJobHash);
  assert.equal(order.price.toString(), testCtx.price.toString());

  // Check vault balance
  const vaultAccount = await getAccount(
    testCtx.connection,
    testCtx.orderVaultTokenAccount
  );
  assert.equal(vaultAccount.amount, testCtx.price);

  // Check user balance (should be reduced by price)
  const userAccount = await getAccount(testCtx.connection, testCtx.userTokenAccount);
  assert.equal(userAccount.amount, BigInt(1_000_000));
} 