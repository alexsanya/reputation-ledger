import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Gateway } from "../target/types/gateway";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { PublicKey } from "@solana/web3.js";
import Keccak from 'keccak';

describe("gateway", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.gateway as Program<Gateway>;
  const provider = anchor.getProvider();
  const connection = provider.connection;
  const user = provider.wallet;

  // create and fund a new wallet, name it service
  const service = anchor.web3.Keypair.generate();

  // Test constants
  const jobHash = Keccak('keccak256').update("test job hash").digest();
  const resultHash = Keccak('keccak256').update("test result hash").digest();
  const price = new anchor.BN(1_000_000); // 1 token with 6 decimals

  // Test accounts
  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let vaultAuthority: PublicKey;
  let vaultTokenAccount: PublicKey;
  let orderPda: PublicKey;
  let configPda: PublicKey;
  let orderVaultTokenAccount: PublicKey;

  before(async () => {
    await connection.requestAirdrop(service.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    // Create mint
    mint = await createMint(
      connection,
      user.payer,
      user.publicKey,
      null,
      6 // decimals
    );

    // Create user token account
    const userAta = await getOrCreateAssociatedTokenAccount(
      connection,
      user.payer,
      mint,
      user.publicKey
    );
    userTokenAccount = userAta.address;

    // Mint tokens to user
    await mintTo(
      connection,
      user.payer,
      mint,
      userTokenAccount,
      user.payer,
      2_000_000 // 2 tokens
    );

    // Derive vault authority PDA
    [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority")],
      program.programId
    );

    // Derive order PDA
    [orderPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("order"), user.publicKey.toBuffer(), jobHash],
      program.programId
    );

    // Derive config PDA
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    // Initialize config
    await program.methods
      .initialize()
      .accounts({
        user: service.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([service])
      .rpc();

    // Derive orderVaultTokenAccount PDA (do not create ATA)
    [orderVaultTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), orderPda.toBuffer()],
      program.programId
    );
  });

  it("Creates a new order", async () =>{
    assert.equal(true, true);
    const config = await program.account.config.fetch(configPda);
    console.log(config);
    await program.methods
      .estimate(jobHash)
      .accounts({
        user: user.publicKey,
        order: orderPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user.payer])
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.equal(order.user.toString(), user.publicKey.toString());
    assert.isDefined(order.status.placed);
  })

  it("Evaluates the order", async () => {
    const tx = await program.methods
      .evaluate(price, new anchor.BN(Date.now() / 1000 + 3600)) // 1 hour deadline
      .accounts({
        order: orderPda,
        authority: service.publicKey,
        config: configPda,
      })
      .signers([service])
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.equal(order.price.toString(), price.toString());
    assert.isDefined(order.status.evaluated);
  });

  it("Commits to the order", async () => {
    const tx = await program.methods
      .commit(price)
      .accounts({
        user: user.publicKey,
        order: orderPda,
        userTokenAccount,
        orderVaultTokenAccount,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user.payer])
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.isDefined(order.status.started);

    // Check vault balance
    const vaultAccount = await getAccount(connection, orderVaultTokenAccount);
    assert.equal(Number(vaultAccount.amount), price.toNumber());
  });

  it("Delivers the result", async () => {
    const tx = await program.methods
      .deliver(resultHash)
      .accounts({
        authority: service.publicKey,
        order: orderPda,
        orderVaultTokenAccount,
        vaultAuthority,
        vaultTokenAccount,
        config: configPda,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([service])
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.isDefined(order.status.completed);
    assert.equal(order.resultHash, resultHash);
  });

  it.skip("Allows refund after timeout", async () => {
    const tx = await program.methods
      .refund()
      .accounts({
        order: orderPda,
        userTokenAccount,
        orderVaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    assert.isDefined(order.status.refunded);

    // Check user balance is restored
    const userAccount = await getAccount(connection, userTokenAccount);
    assert.equal(Number(userAccount.amount), 2_000_000);
  });
});
