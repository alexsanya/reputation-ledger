import { Program } from "@coral-xyz/anchor";
import { Gateway } from "../target/types/gateway";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import Keccak from 'keccak';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

export interface TestContext {
    program: Program<Gateway>;
    connection: Connection;
    user: anchor.Wallet;
    service: Keypair;
    jobHash: Buffer;
    resultHash: Buffer;
    price: bigint,
    mint: PublicKey;
    userTokenAccount: PublicKey;
    vaultAuthority: PublicKey;
    orderPda: PublicKey;
    configPda: PublicKey;
    orderVaultTokenAccount: PublicKey;
    vaultTokenAccount: PublicKey;
    recipientTokenAccount: PublicKey;
    provider: anchor.AnchorProvider;
}

export async function setup(opts: { service?: Keypair, run_initialize?: boolean, jobString?: string } = { run_initialize: true }): Promise<TestContext> {

  anchor.setProvider(anchor.AnchorProvider.env());

  const service = opts.service || Keypair.generate();

  // Test constants
  const jobHash = Keccak('keccak256').update(opts.jobString || "test job hash").digest();
  const resultHash = Keccak('keccak256').update("test result hash").digest();
  const price = BigInt(1_000_000);

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
  let recipientTokenAccount: PublicKey;
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

    if (opts.run_initialize) {
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
    }

    // Derive orderVaultTokenAccount PDA (do not create ATA)
    [orderVaultTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), orderPda.toBuffer()],
      program.programId
    );

    // Create recipient token account for the service
    const recipientAta = await getOrCreateAssociatedTokenAccount(
      connection,
      service,
      mint,
      service.publicKey
    );
    recipientTokenAccount = recipientAta.address;

    [vaultTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), mint.toBuffer()],
      program.programId
    );

    return {
        provider,
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
        vaultTokenAccount,
        recipientTokenAccount,
    }
}