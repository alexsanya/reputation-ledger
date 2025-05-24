import * as anchor from '@coral-xyz/anchor';
import { ethers } from 'ethers';
import { assert } from "chai";
import { getAccount } from "@solana/spl-token";

import { TestContext } from './setup';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { privateToAddress, ecsign, keccak256 } from 'ethereumjs-util';
import nacl from "tweetnacl";
import { sendAndConfirmRawTransaction } from '@solana/web3.js';

// Note: The recovery byte for Secp256k1 signatures has an arbitrary constant of 27 added for these
//       Ethereum and Bitcoin signatures. This is why you will see (recoveryId - 27) throughout the tests.
//       The Solana Secp256k1Program needs the recovery byte to be in the range [0;3].
// Ref:  https://ethereum.github.io/yellowpaper/paper.pdf


export async function ethSignature(ctx: TestContext) {
    let eth_address: string; // Ethereum address to be recovered and checked against
    let full_sig: string; // 64 bytes + recovery byte
    let signature: Uint8Array; // 64 bytes of sig
    let recoveryId: number; // recovery byte (u8)
    let actual_message: Buffer; // actual signed message with Ethereum Message prefix

    const eth_signer: ethers.Wallet = ethers.Wallet.createRandom();
    /// Sample Create Signature function that signs with ethers signMessage
    async function createSignature(
        name: string,
        age: number,
        signer = eth_signer
    ): Promise<string> {
        // keccak256 hash of the message

        // get hash as Uint8Array of size 32
        const messageHashBytes: Uint8Array = Buffer.from("job:1234;price:500", "utf-8");

        // Signed message that is actually this:
        // sign(keccak256("\x19Ethereum Signed Message:\n" + len(messageHash) + messageHash)))
        const signature = await signer.signMessage(messageHashBytes);

        return signature;
    }
    const PERSON = { name: 'ben', age: 49 }; // mock data
    full_sig = await createSignature(PERSON.name, PERSON.age);
    actual_message = Buffer.from("job:1234;price:500", "utf-8");
    eth_address = eth_signer.address;
    
    // make signature an Uint8Array of size 64
    signature = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
        signature[i] = parseInt(full_sig.slice(i * 2, (i + 1) * 2), 16);
    }
    
    recoveryId = parseInt(full_sig.slice(-2), 16);
        // Construct transaction made of 2 instructions:
        //      - Secp256k1 sig verification instruction to the Secp256k1Program
        //      - Custom instruction to our program
        // The second instruction checks that the 1st one has been sent in the same transaction.
        // It checks that program_id, accounts, and data are what should have been send for
        // the params that we are intending to check.
        // If the first instruction doesn't fail and our instruction manages to deserialize
        // the data and check that it is correct, it means that the sig verification was successful.
        // Otherwise it failed.
        
        const message = Buffer.from("hello-secure-world");

        // 1. Generate an ECDSA keypair (secp256k1)
        const privateKey = Buffer.from(
          "4c0883a69102937d6231471b5dbb6204fe512961708279b7b197f59b31cfb291", // example private key
          "hex"
        );
        const ethAddress = privateToAddress(privateKey); // 20-byte Ethereum-style address
      
        // 2. Hash the message with keccak256
        const messageHash = keccak256(message);
      
      


        const MSG = Uint8Array.from(
            Buffer.from('this is such a good message to sign')
        );
        console.log("Service public key: ", ctx.service.publicKey.toBase58());
        signature = await nacl.sign.detached(MSG, ctx.service.secretKey);
        
        let tx = new anchor.web3.Transaction()
            .add(
                // Secp256k1 instruction
                anchor.web3.Ed25519Program.createInstructionWithPublicKey({
                    publicKey: ctx.service.publicKey.toBytes(),
                    message: MSG,
                    signature: signature,
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
            //await ctx.provider.connection.sendRawTransaction(tx.serialize());

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

