import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

import { TestContext } from "./setup";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import nacl from "tweetnacl";
import { sendAndConfirmRawTransaction } from "@solana/web3.js";
import { Order, serializeOrder } from "./utils";
import { AnchorError } from "@coral-xyz/anchor";
import { ecsign, keccak256, privateToAddress } from "ethereumjs-util";

// Note: The recovery byte for Secp256k1 signatures has an arbitrary constant of 27 added for these
//       Ethereum and Bitcoin signatures. This is why you will see (recoveryId - 27) throughout the tests.
//       The Solana Secp256k1Program needs the recovery byte to be in the range [0;3].
// Ref:  https://ethereum.github.io/yellowpaper/paper.pdf

export async function commitSuccess(ctx: TestContext) {
  const orderData = new Order({
    user: ctx.user.publicKey.toBytes(),
    job_hash: new Uint8Array(ctx.jobHash),
    price: ctx.price,
    mint: new Uint8Array(ctx.mint.toBuffer()),
    price_valid_until: BigInt(100500),
    deadline: BigInt(3600),
  });

  const message = serializeOrder(orderData);
  const signature = await nacl.sign.detached(message, ctx.service.secretKey);

  let tx = new anchor.web3.Transaction()
    .add(
      // Secp256k1 instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
        publicKey: ctx.service.publicKey.toBytes(),
        message,
        signature,
      })
    )
    .add(
      // Our instruction
      await ctx.program.methods
        .commit(ctx.jobHash)
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
        skipPreflight: false,
      }
    );

    const order = await ctx.program.account.order.fetch(ctx.orderPda);
    assert.isDefined(order.status.started);
    assert.equal(order.user.toBase58(), ctx.user.publicKey.toBase58());
    const orderJobHash = Buffer.from(order.jobHash).toString("hex");
    const ctxJobHash = Buffer.from(ctx.jobHash).toString("hex");
    assert.equal(orderJobHash, ctxJobHash);
    assert.equal(order.price.toString(), orderData.price.toString());
    assert.equal(
      order.priceValidUntil.toString(),
      orderData.price_valid_until.toString()
    );
    assert.equal(order.deadline.toString(), orderData.deadline.toString());

    // Check vault balance
    const vaultAccount = await getAccount(
      ctx.connection,
      ctx.orderVaultTokenAccount
    );
    assert.equal(vaultAccount.amount, ctx.price);

    // Check user balance
    const userAccount = await getAccount(ctx.connection, ctx.userTokenAccount);
    assert.equal(userAccount.amount, BigInt(1_000_000));
  } catch (error) {
    console.log(error);
    assert.fail(
      `Should not have failed with the following error:\n${error.msg}`
    );
  }
}

export async function commitWrongInstruction(ctx: TestContext) {
  const privateKey = Buffer.from(
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "hex"
  );
  const ethAddress = privateToAddress(privateKey);
  const message = Buffer.from("verify-me:123", "utf-8");
  const messageHash = keccak256(message);
  const { r, s, v } = ecsign(messageHash, privateKey);
  const signature = Buffer.concat([r, s]); // 64 bytes
  const recoveryId = v - 27;
  let tx = new anchor.web3.Transaction()
    .add(
      // Secp256k1 instruction
      anchor.web3.Secp256k1Program.createInstructionWithEthAddress({
        ethAddress,
        message,
        signature,
        recoveryId,
      })
    )
    .add(
      //check that the instruction fails with code ErrorCode::InvalidSignature
      await ctx.program.methods
        .commit(ctx.jobHash)
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
        skipPreflight: false,
      }
    );
    assert.fail("Should have failed with InvalidSignature");
  } catch (error) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log) => log.includes("Error Code: InvalidProgramId"))
    );
  }
}

export async function commitWrongSignature(ctx: TestContext) {
  const orderData = new Order({
    user: ctx.user.publicKey.toBytes(),
    job_hash: new Uint8Array(ctx.jobHash),
    price: ctx.price,
    mint: new Uint8Array(ctx.mint.toBuffer()),
    price_valid_until: BigInt(100500),
    deadline: BigInt(3600),
  });

  const message = serializeOrder(orderData);
  const signature = await nacl.sign.detached(message, ctx.user.payer.secretKey);

  let tx = new anchor.web3.Transaction()
    .add(
      // Secp256k1 instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
        publicKey: ctx.user.publicKey.toBytes(),
        message,
        signature,
      })
    )
    .add(
      //check that the instruction fails with code ErrorCode::InvalidSignature
      await ctx.program.methods
        .commit(ctx.jobHash)
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
        skipPreflight: false,
      }
    );
    assert.fail("Should have failed with InvalidSignature");
  } catch (error) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log) => log.includes("Error Code: InvalidSignature"))
    );
  }
}

export async function commitMissingInstruction(ctx: TestContext) {
  try {
    // Our instruction
    await ctx.program.methods
      .commit(ctx.jobHash)
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
      .rpc();
    assert.fail("Should have failed");
  } catch (error) {
    assert.isTrue(error instanceof AnchorError);
    const err: AnchorError = error;
    assert.strictEqual(err.error.errorMessage, "Invalid program id");
  }
}

export async function commitWrongMint(ctx: TestContext) {
  const fakeMint = await createMint(
    ctx.connection,
    ctx.user.payer,
    ctx.user.publicKey,
    null,
    6 // decimals
  );
  const fakeTokenAccount = await getOrCreateAssociatedTokenAccount(
    ctx.connection,
    ctx.user.payer,
    fakeMint,
    ctx.user.publicKey
  );

  await mintTo(
    ctx.connection,
    ctx.user.payer,
    fakeMint,
    fakeTokenAccount.address,
    ctx.user.payer,
    2_000_000 // 2 tokens
  );

  const orderData = new Order({
    user: ctx.user.publicKey.toBytes(),
    job_hash: new Uint8Array(ctx.jobHash),
    price: ctx.price,
    mint: ctx.mint.toBuffer(),
    price_valid_until: BigInt(100500),
    deadline: BigInt(3600),
  });

  const message = serializeOrder(orderData);
  const signature = await nacl.sign.detached(message, ctx.service.secretKey);

  let tx = new anchor.web3.Transaction()
    .add(
      // Secp256k1 instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
        publicKey: ctx.service.publicKey.toBytes(),
        message,
        signature,
      })
    )
    .add(
      // Our instruction
      await ctx.program.methods
        .commit(ctx.jobHash)
        .accounts({
          user: ctx.user.publicKey,
          order: ctx.orderPda,
          userTokenAccount: fakeTokenAccount.address,
          orderVaultTokenAccount: ctx.orderVaultTokenAccount,
          mint: fakeMint,
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
        skipPreflight: false,
      }
    );

    assert.fail("Should have failed with InvalidMint");
  } catch (error) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log) => log.includes("Error Code: InvalidMint"))
    );
  }
}

export async function commitInsufficientFunds(ctx: TestContext) {
  const orderData = new Order({
    user: ctx.user.publicKey.toBytes(),
    job_hash: new Uint8Array(ctx.jobHash),
    price: ctx.price * BigInt(3),
    mint: new Uint8Array(ctx.mint.toBuffer()),
    price_valid_until: BigInt(100500),
    deadline: BigInt(3600),
  });

  const message = serializeOrder(orderData);
  const signature = await nacl.sign.detached(message, ctx.service.secretKey);

  let tx = new anchor.web3.Transaction()
    .add(
      // Secp256k1 instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
        publicKey: ctx.service.publicKey.toBytes(),
        message,
        signature,
      })
    )
    .add(
      // Our instruction
      await ctx.program.methods
        .commit(ctx.jobHash)
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
        skipPreflight: false,
      }
    );
    assert.fail("Should have failed with InsufficientFunds");
  } catch (error) {
    assert.isDefined(error.logs);
    assert.isTrue(
      error.logs.some((log) => log.includes("Error: insufficient funds"))
    );
  }
}
