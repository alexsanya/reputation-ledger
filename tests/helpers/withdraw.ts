import * as anchor from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TestContext } from "../setup";

export function buildWithdrawTransaction(ctx: TestContext, overrides: any = {}) {
    return ctx.program.methods
        .withdraw()
        .accounts({
            authority:  ctx.service.publicKey,
            config: ctx.configPda,
            vaultTokenAccount: ctx.vaultTokenAccount,
            recipientTokenAccount: ctx.recipientTokenAccount,
            vaultAuthority: ctx.vaultAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
            mint: ctx.mint,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            ...overrides
        })
        .signers([overrides.signer || ctx.service])
}