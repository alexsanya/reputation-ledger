import * as anchor from '@coral-xyz/anchor';
import { assert } from "chai";
import { getAccount } from "@solana/spl-token";

import { TestContext } from './setup';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import nacl from "tweetnacl";
import { sendAndConfirmRawTransaction } from '@solana/web3.js';

// Note: The recovery byte for Secp256k1 signatures has an arbitrary constant of 27 added for these
//       Ethereum and Bitcoin signatures. This is why you will see (recoveryId - 27) throughout the tests.
//       The Solana Secp256k1Program needs the recovery byte to be in the range [0;3].
// Ref:  https://ethereum.github.io/yellowpaper/paper.pdf


export async function commit(ctx: TestContext) {

    const MSG = Uint8Array.from(
        Buffer.from('this is such a good message to sign')
    );
    console.log("Service public key: ", ctx.service.publicKey.toBase58());
    const signature = await nacl.sign.detached(MSG, ctx.service.secretKey);
    
    let tx = new anchor.web3.Transaction()
        .add(
            // Secp256k1 instruction
            anchor.web3.Ed25519Program.createInstructionWithPublicKey({
                publicKey: ctx.service.publicKey.toBytes(),
                message: MSG,
                signature
            })
        )
        .add(
            // Our instruction
            await ctx.program.methods
                .commit(
                    ctx.jobHash,
                    ctx.price
                )
                .accounts({
                    user: ctx.user.publicKey,
                    order: ctx.orderPda,
                    userTokenAccount: ctx.userTokenAccount,
                    orderVaultTokenAccount: ctx.orderVaultTokenAccount,
                    mint: ctx.mint,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                })
                .signers([ctx.user.payer])
                .instruction()
        );

        try {
            const { lastValidBlockHeight, blockhash } =
                await ctx.provider.connection.getLatestBlockhash();
            tx.lastValidBlockHeight = lastValidBlockHeight;
            tx.recentBlockhash = blockhash;
            tx.feePayer = ctx.user.publicKey;

            tx.sign(ctx.user.payer);

            const sig = await sendAndConfirmRawTransaction(
                ctx.provider.connection,
                tx.serialize(),
                {
                    commitment: "confirmed",
                    skipPreflight: false
                }
            );
            console.log("sig: ", sig);

            const order = await ctx.program.account.order.fetch(ctx.orderPda);
            assert.isDefined(order.status.started);

            // Check vault balance
            const vaultAccount = await getAccount(ctx.connection, ctx.orderVaultTokenAccount);
            assert.equal(Number(vaultAccount.amount), ctx.price.toNumber());

            // If all goes well, we're good!
        } catch (error) {
            console.log(error);
            assert.fail(
                `Should not have failed with the following error:\n${error.msg}`
            );
        }

}

