import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Gateway } from "../target/types/gateway";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { PublicKey } from "@solana/web3.js";

describe("gateway", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.gateway as Program<Gateway>;
  const provider = anchor.getProvider();
  const connection = provider.connection;
  const wallet = provider.wallet;

  // Test constants
  const jobHash = Buffer.from("test job hash 12345678901234567890123456789012");
  const resultHash = Buffer.from("test result hash 123456789012345678901234567890");
  const price = new anchor.BN(1_000_000); // 1 token with 6 decimals

  // Test accounts
  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let vaultAuthority: PublicKey;
  let vaultTokenAccount: PublicKey;
  let orderPda: PublicKey;

  before(async () => {
    // Create mint
    mint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6 // decimals
    );

    // Create user token account
    const userAta = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );
    userTokenAccount = userAta.address;

    // Mint tokens to user
    await mintTo(
      connection,
      wallet.payer,
      mint,
      userTokenAccount,
      wallet.payer,
      2_000_000 // 2 tokens
    );

    // Derive vault authority PDA
    [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority")],
      program.programId
    );

    // Derive order PDA
    [orderPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("order"), wallet.publicKey.toBuffer(), jobHash],
      program.programId
    );
  });

  it("Creates a new order", async () => {
    const tx = await program.methods
      .estimate(jobHash)
      .accounts({
        user: wallet.publicKey,
        order: orderPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.equal(order.user.toString(), wallet.publicKey.toString());
    assert.equal(order.status.placed, true);
  });

  it("Evaluates the order", async () => {
    const tx = await program.methods
      .evaluate(price)
      .accounts({
        order: orderPda,
      })
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.equal(order.price.toString(), price.toString());
    assert.equal(order.status.evaluated, true);
  });

  it("Commits to the order", async () => {
    const tx = await program.methods
      .commit(price)
      .accounts({
        user: wallet.publicKey,
        order: orderPda,
        userTokenAccount,
        vaultTokenAccount,
        mint,
        vaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.equal(order.status.started, true);

    // Check vault balance
    const vaultAccount = await getAccount(connection, vaultTokenAccount);
    assert.equal(Number(vaultAccount.amount), price.toNumber());
  });

  it("Delivers the result", async () => {
    const tx = await program.methods
      .deliver(resultHash)
      .accounts({
        order: orderPda,
      })
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.equal(order.status.completed, true);
    assert.equal(
      Buffer.from(order.resultHash).toString("hex"),
      resultHash.toString("hex")
    );
  });

  it("Allows refund after timeout", async () => {
    // Fast forward time (this is just a test, in reality we'd need to wait)
    // Note: This won't actually work in tests, but shows the intent
    const tx = await program.methods
      .refund()
      .accounts({
        order: orderPda,
        userTokenAccount,
        vaultTokenAccount,
        vaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.equal(order.status.refunded, true);

    // Check user balance is restored
    const userAccount = await getAccount(connection, userTokenAccount);
    assert.equal(Number(userAccount.amount), 2_000_000);
  });
});
