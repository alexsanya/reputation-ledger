import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { TestContext } from "./setup";
import * as anchor from "@coral-xyz/anchor";
export async function withdraw(ctx: TestContext) {
    // Get initial balances
    const initialVaultBalance = (await getAccount(ctx.connection, ctx.vaultTokenAccount)).amount;
    const initialRecipientBalance = (await getAccount(ctx.connection, ctx.recipientTokenAccount)).amount;

    // Withdraw tokens
    await ctx.program.methods
        .withdraw()
        .accounts({
            authority: ctx.service.publicKey,
            config: ctx.configPda,
            vaultTokenAccount: ctx.vaultTokenAccount,
            recipientTokenAccount: ctx.recipientTokenAccount,
            vaultAuthority: ctx.vaultAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
            mint: ctx.mint,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([ctx.service])
        .rpc();

    // Check final balances
    const finalVaultBalance = (await getAccount(ctx.connection, ctx.vaultTokenAccount)).amount;
    const finalRecipientBalance = (await getAccount(ctx.connection, ctx.recipientTokenAccount)).amount;

    // Verify vault is empty
    assert.equal(Number(finalVaultBalance), 0, "Vault should be empty after withdrawal");
    
    // Verify recipient received the tokens
    assert.equal(
        Number(finalRecipientBalance) - Number(initialRecipientBalance),
        Number(initialVaultBalance),
        "Recipient should receive all tokens from vault"
    );
} 