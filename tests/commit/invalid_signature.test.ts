import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { TestContext } from "../setup";
import {
  buildOrderMessage,
  signEd25519,
  buildCommitTransaction,
  buildSecp256k1CommitTransaction,
  prepareAndSubmitTransaction,
  createEthSignature,
} from "../helpers/commit";
import { AnchorError } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export async function commitWrongInstruction(testCtx: TestContext) {
  const { ethAddress, message, signature, recoveryId } = createEthSignature(
    "verify-me:123",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  );

  const tx = await buildSecp256k1CommitTransaction(
    testCtx,
    ethAddress,
    message,
    signature,
    recoveryId
  );

  try {
    await prepareAndSubmitTransaction(testCtx, tx);
    assert.fail("Should have failed with InvalidProgramId");
  } catch (error: any) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log: string) => log.includes("Error Code: InvalidProgramId"))
    );
  }
}

export async function commitWrongSignature(testCtx: TestContext) {
  const message = await buildOrderMessage(testCtx);
  // Sign with wrong key (user instead of service)
  const signature = await signEd25519(message, testCtx.user.payer.secretKey);
  
  const tx = await buildCommitTransaction(
    testCtx,
    message,
    signature,
    testCtx.user.publicKey.toBytes()
  );

  try {
    await prepareAndSubmitTransaction(testCtx, tx);
    assert.fail("Should have failed with InvalidSignature");
  } catch (error: any) {
    assert.isTrue(
      error.logs.some((log: string) => log.includes("Error Code: InvalidSignature"))
    );
  }
}

export async function commitMissingInstruction(testCtx: TestContext) {
  try {
    // Try to commit without the signature verification instruction
    await testCtx.program.methods
      .commit(Array.from(testCtx.jobHash))
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
      .rpc();
      
    assert.fail("Should have failed");
  } catch (error) {
    assert.isTrue(error instanceof AnchorError);
    const err: AnchorError = error;
    assert.strictEqual(err.error.errorMessage, "Invalid program id");
  }
} 