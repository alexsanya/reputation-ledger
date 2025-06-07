import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import nacl from "tweetnacl";
import { TestContext } from "../setup";
import { Order, serializeOrder } from "../utils";
import { ecsign, keccak256, privateToAddress } from "ethereumjs-util";

export interface CommitOrderData {
  user?: Uint8Array;
  job_hash?: Uint8Array;
  price?: bigint;
  mint?: Uint8Array;
  price_valid_until?: bigint;
  deadline?: bigint;
}

const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

export async function buildOrderMessage(
  testCtx: TestContext,
  overrides: CommitOrderData = {}
): Promise<Uint8Array> {
  const orderData = new Order({
    user: overrides.user || testCtx.user.publicKey.toBytes(),
    job_hash: overrides.job_hash || new Uint8Array(testCtx.jobHash),
    price: overrides.price || testCtx.price,
    mint: overrides.mint || new Uint8Array(testCtx.mint.toBuffer()),
    price_valid_until: overrides.price_valid_until || BigInt(Date.now() + ONE_DAY_IN_MS),
    deadline: overrides.deadline || BigInt(3600),
  });

  return serializeOrder(orderData);
}

export async function signEd25519(message: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array> {
  return nacl.sign.detached(message, secretKey);
}

export async function buildCommitTransaction(
  testCtx: TestContext,
  message: Uint8Array,
  signature: Uint8Array,
  signerPublicKey: Uint8Array = testCtx.service.publicKey.toBytes()
): Promise<anchor.web3.Transaction> {
  const tx = new anchor.web3.Transaction()
    .add(
      // Ed25519 signature verification instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
        publicKey: signerPublicKey,
        message,
        signature,
      })
    )
    .add(
      // Commit instruction
      await testCtx.program.methods
        .commit(Array.from(testCtx.jobHash)) // Convert Buffer to number array
        .accounts({
          user: testCtx.user.publicKey,
          order: testCtx.orderPda,
          userTokenAccount: testCtx.userTokenAccount,
          orderVaultTokenAccount: testCtx.orderVaultTokenAccount,
          mint: testCtx.mint,
          config: testCtx.configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .signers([testCtx.user.payer])
        .instruction()
    );

  return tx;
}

export async function buildSecp256k1CommitTransaction(
  testCtx: TestContext,
  ethAddress: Buffer,
  message: Buffer,
  signature: Buffer,
  recoveryId: number
): Promise<anchor.web3.Transaction> {
  const tx = new anchor.web3.Transaction()
    .add(
      // Secp256k1 signature verification instruction
      anchor.web3.Secp256k1Program.createInstructionWithEthAddress({
        ethAddress,
        message,
        signature,
        recoveryId,
      })
    )
    .add(
      // Commit instruction
      await testCtx.program.methods
        .commit(Array.from(testCtx.jobHash)) // Convert Buffer to number array
        .accounts({
          user: testCtx.user.publicKey,
          order: testCtx.orderPda,
          userTokenAccount: testCtx.userTokenAccount,
          orderVaultTokenAccount: testCtx.orderVaultTokenAccount,
          mint: testCtx.mint,
          config: testCtx.configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .signers([testCtx.user.payer])
        .instruction()
    );

  return tx;
}

export async function prepareAndSubmitTransaction(
  testCtx: TestContext,
  tx: anchor.web3.Transaction
): Promise<string> {
  const { lastValidBlockHeight, blockhash } =
    await testCtx.provider.connection.getLatestBlockhash();
  
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.recentBlockhash = blockhash;
  tx.feePayer = testCtx.user.publicKey;

  tx.sign(testCtx.user.payer);

  const { sendAndConfirmRawTransaction } = await import("@solana/web3.js");
  
  return sendAndConfirmRawTransaction(
    testCtx.provider.connection,
    tx.serialize(),
    {
      commitment: "confirmed",
      skipPreflight: false,
    }
  );
}

export function createEthSignature(message: string, privateKeyHex: string) {
  const privateKey = Buffer.from(privateKeyHex, "hex");
  const ethAddress = privateToAddress(privateKey);
  const messageBuffer = Buffer.from(message, "utf-8");
  const messageHash = keccak256(messageBuffer);
  const { r, s, v } = ecsign(messageHash, privateKey);
  const signature = Buffer.concat([r, s]); // 64 bytes
  const recoveryId = v - 27;
  
  return {
    ethAddress,
    message: messageBuffer,
    signature,
    recoveryId,
  };
} 