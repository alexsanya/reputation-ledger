import { Program } from "@coral-xyz/anchor";
import { Gateway } from "../target/types/gateway";
import { PublicKey } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import Keccak from 'keccak';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

export interface TestContext {
    program: Program<Gateway>;
    connection: Connection;
    user: anchor.Wallet;
    service: anchor.Wallet;
    jobHash: Buffer;
    resultHash: Buffer;
    price: anchor.BN;
    mint: PublicKey;
    userTokenAccount: PublicKey;
    vaultAuthority: PublicKey;
    orderPda: PublicKey;
    configPda: PublicKey;
    orderVaultTokenAccount: PublicKey;
    recipientTokenAccount: PublicKey;
    vaultTokenAccount: PublicKey;
}

export async function setup(): Promise<TestContext> {

  anchor.setProvider(anchor.AnchorProvider.env());

  const service = anchor.web3.Keypair.generate();

  // Test constants
  const jobHash = Keccak('keccak256').update("test job hash").digest();
  const resultHash = Keccak('keccak256').update("test result hash").digest();
  const price = new anchor.BN(1_000_000); // 1 token with 6 decimals

  // Test accounts

  const program = anchor.workspace.gateway as Program<Gateway>;
  const provider = anchor.getProvider();
  const connection = provider.connection;
  const user = provider.wallet;

  // Test accounts
  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let vaultAuthority: PublicKey;
  let vaultTokenAccount: PublicKey;
  let orderPda: PublicKey;
  let configPda: PublicKey;
  let orderVaultTokenAccount: PublicKey;
    await connection.requestAirdrop(service.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
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

    [vaultTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), mint.toBuffer()],
      program.programId
    );

    let recipientTokenAccount = await anchor.utils.token.associatedAddress({
        mint,
        owner: service.publicKey
    });

    return {
        program,
        connection,
        user,
        service,
        jobHash,
        resultHash,
        price,
        mint,
        userTokenAccount,
        vaultAuthority,
        orderPda,
        configPda,
        orderVaultTokenAccount,
        recipientTokenAccount,
        vaultTokenAccount,
    }
}