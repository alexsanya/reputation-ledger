import { TOKEN_PROGRAM_ID, getAccount, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { assert } from "chai";
import { TestContext } from "./setup";
import * as anchor from "@coral-xyz/anchor";

export async function withdraw(ctx: TestContext) {
    console.log("Starting withdraw test");
    console.log("Mint:", ctx.mint.toBase58());
    console.log("Vault Authority:", ctx.vaultAuthority.toBase58());
    console.log("Service:", ctx.service.publicKey.toBase58());

    // Create recipient token account
    console.log("Creating recipient token account...");
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        ctx.connection,
        ctx.service,
        ctx.mint,
        ctx.service.publicKey
    );
    console.log("Recipient token account created:", recipientTokenAccount.address.toBase58());

    // Get initial balances
    console.log("Getting initial balances...");
    const initialVaultBalance = (await getAccount(ctx.connection, ctx.vaultTokenAccount)).amount;
    console.log("Initial vault balance:", initialVaultBalance.toString());

    const initialRecipientBalance = (await getAccount(ctx.connection, recipientTokenAccount.address)).amount;
    console.log("Initial recipient balance:", initialRecipientBalance.toString());

    // Withdraw tokens
    console.log("Calling withdraw instruction...");
    await ctx.program.methods
        .withdraw()
        .accounts({
            authority: ctx.service.publicKey,
            config: ctx.configPda,
            vaultTokenAccount: ctx.vaultTokenAccount,
            recipientTokenAccount: recipientTokenAccount.address,
            vaultAuthority: ctx.vaultAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.service])
        .rpc();

    console.log("Withdraw instruction completed");

    // Check final balances
    console.log("Getting final balances...");
    const finalVaultBalance = (await getAccount(ctx.connection, ctx.vaultTokenAccount)).amount;
    console.log("Final vault balance:", finalVaultBalance.toString());

    const finalRecipientBalance = (await getAccount(ctx.connection, recipientTokenAccount.address)).amount;
    console.log("Final recipient balance:", finalRecipientBalance.toString());

    // Verify vault is empty
    assert.equal(Number(finalVaultBalance), 0, "Vault should be empty after withdrawal");
    
    // Verify recipient received the tokens
    assert.equal(
        Number(finalRecipientBalance) - Number(initialRecipientBalance),
        Number(initialVaultBalance),
        "Recipient should receive all tokens from vault"
    );
} 