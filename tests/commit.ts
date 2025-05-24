import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";
import { TestContext } from "./setup";
import { getAccount } from "@solana/spl-token";
import { PublicKey, Secp256k1Program, Transaction } from "@solana/web3.js";
import { ecsign, toRpcSig, bufferToHex, privateToAddress, keccak256 } from "ethereumjs-util";

export async function commit(ctx: TestContext) {

  const message = Buffer.from("job:1234;price:500", "utf-8");
  const messageHash = keccak256(message);

  // Backend private key
  const privateKey = Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex");

  // ECDSA sign (secp256k1)
  const { r, s, v } = ecsign(messageHash, privateKey);
  const ethAddress = privateToAddress(privateKey); // last 20 bytes of pubkey

  const signature = Buffer.concat([r, s]); // 64 bytes
  const recoveryId = v - 27;  

    const secpInstruction = Secp256k1Program.createInstructionWithEthAddress({
      ethAddress,
      message,
      signature,
      recoveryId,
    });


    const programInstruction = await ctx.program.methods
  .commit(ctx.price) // your Anchor method
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
  .instruction(); 

  const tx = new Transaction().add(
    secpInstruction,       // 🔐 Signature verification syscall (must come first!)
    programInstruction     // 🎯 Your Anchor program instruction
  );
  const provider = anchor.getProvider();
  const txSig = await provider.sendAndConfirm(tx, []);
  console.log("Transaction Signature:", txSig);


    const order = await ctx.program.account.order.fetch(ctx.orderPda);
    assert.isDefined(order.status.started);

    // Check vault balance
    const vaultAccount = await getAccount(ctx.connection, ctx.orderVaultTokenAccount);
    assert.equal(Number(vaultAccount.amount), ctx.price.toNumber());
} 