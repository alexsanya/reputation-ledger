import { TestContext } from "../setup";
import { buildCommitTransaction, buildOrderMessage, prepareAndSubmitTransaction, signEd25519 } from "./commit";
import { PublicKey } from "@solana/web3.js";
import Keccak from 'keccak';

export interface OrderAccounts {
  orderPda: PublicKey;
  orderVaultTokenAccount: PublicKey;
}

export async function commitOrder(ctx: TestContext, job_name: string, deadline?: bigint): Promise<OrderAccounts> {
  const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;
  const job_hash = Keccak('keccak256').update(job_name).digest();
  const message = await buildOrderMessage(ctx, {
    job_hash,
    deadline: deadline || BigInt(Math.floor(Date.now() / 1000) - ONE_DAY_IN_MS)
  });
  const signature = await signEd25519(message, ctx.service.secretKey);
  const [orderPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("order"), ctx.user.publicKey.toBuffer(), job_hash],
    ctx.program.programId
  );
  const [orderVaultTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), orderPda.toBuffer()],
    ctx.program.programId
  );
  const tx = await buildCommitTransaction({
    ...ctx,
    orderPda,
    jobHash: job_hash,
    orderVaultTokenAccount,
  }, message, signature);

  await prepareAndSubmitTransaction(ctx, tx);

  return { orderPda, orderVaultTokenAccount };
}