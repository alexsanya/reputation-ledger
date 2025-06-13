import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { TestContext } from "../setup";
import {
  buildOrderMessage,
  signEd25519,
  buildCommitTransaction,
  prepareAndSubmitTransaction,
  createMintAndTokenAccount,
} from "../helpers/commit";

export async function commitWrongMint(testCtx: TestContext) {
  const { fakeMint, fakeTokenAccount } = await createMintAndTokenAccount(testCtx, testCtx.user.publicKey, 2_000_000);

  // Build order message with correct mint but use fake mint in transaction
  const message = await buildOrderMessage(testCtx);
  const signature = await signEd25519(message, testCtx.service.secretKey);
  
  // Create transaction with wrong mint
  const tx = await buildCommitTransaction(testCtx, message, signature);
  
  // Replace the accounts with fake ones
  const instructionIndex = tx.instructions.findIndex(ix => 
    ix.programId.equals(testCtx.program.programId)
  );
  
  if (instructionIndex !== -1) {
    tx.instructions[instructionIndex] = await testCtx.program.methods
      .commit(Array.from(testCtx.jobHash))
      .accounts({
        user: testCtx.user.publicKey,
        userTokenAccount: fakeTokenAccount.address,
        orderVaultTokenAccount: testCtx.orderVaultTokenAccount,
        mint: fakeMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([testCtx.user.payer])
      .instruction();
  }

  try {
    await prepareAndSubmitTransaction(testCtx, tx);
    assert.fail("Should have failed with InvalidMint");
  } catch (error: any) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log: string) => log.includes("Error Code: InvalidMint"))
    );
  }
}

export async function commitInsufficientFunds(testCtx: TestContext) {
  // Build order message with 3x the price (more than user has)
  const message = await buildOrderMessage(testCtx, {
    price: testCtx.price * BigInt(3),
  });
  
  const signature = await signEd25519(message, testCtx.service.secretKey);
  const tx = await buildCommitTransaction(testCtx, message, signature);

  try {
    await prepareAndSubmitTransaction(testCtx, tx);
    assert.fail("Should have failed with InsufficientFunds");
  } catch (error: any) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log: string) => log.includes("Error: insufficient funds"))
    );
  }
} 

export async function commitWrongTokenAccountOwner(testCtx: TestContext) {

  const fakeTokenAccount = await getOrCreateAssociatedTokenAccount(
    testCtx.connection,
    testCtx.user.payer,
    testCtx.mint,
    testCtx.service.publicKey
  );

  await mintTo(
    testCtx.connection,
    testCtx.user.payer,
    testCtx.mint,
    fakeTokenAccount.address,
    testCtx.user.payer,
    2_000_000 // 2 tokens
  );
  
  const message = await buildOrderMessage(testCtx);
  const signature = await signEd25519(message, testCtx.service.secretKey);
  const tx = await buildCommitTransaction(testCtx, message, signature);
  const instructionIndex = tx.instructions.findIndex(ix => 
    ix.programId.equals(testCtx.program.programId)
  );
  if (instructionIndex !== -1) {
    tx.instructions[instructionIndex] = await testCtx.program.methods
      .commit(Array.from(testCtx.jobHash))
      .accounts({
        user: testCtx.user.publicKey,
        userTokenAccount: fakeTokenAccount.address,
        orderVaultTokenAccount: testCtx.orderVaultTokenAccount,
        mint: testCtx.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([testCtx.user.payer])
      .instruction();
  }

  try {
    await prepareAndSubmitTransaction(testCtx, tx);
    assert.fail("Should have failed with InvalidTokenAccountOwner");
  } catch (error: any) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log: string) => log.includes("Error Code: InvalidTokenAccountOwner"))
    );
  }
} 