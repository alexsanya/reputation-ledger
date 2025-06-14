import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TestContext } from "../setup";
import { Keypair } from "@solana/web3.js";

export function getDeliverTransaction(ctx: TestContext, signer: Keypair, overrides: any = {}) {
    return ctx.program.methods
      .deliver(ctx.resultHash)
      .accounts({
        authority: signer.publicKey,
        order: ctx.orderPda,
        orderVaultTokenAccount: ctx.orderVaultTokenAccount,
        vaultAuthority: ctx.vaultAuthority,
        vaultTokenAccount: ctx.vaultTokenAccount,
        config: ctx.configPda,
        mint: ctx.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        ...overrides
      })
      .signers([signer])
}
