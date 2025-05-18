import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Gateway } from "../target/types/gateway";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("gateway", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.gateway as Program<Gateway>;
  const provider = anchor.getProvider();
  const connection = provider.connection;
  const wallet = provider.wallet;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("funds the vault with SPL tokens", async () => {
    // 1. Create a new mint and user/vault token accounts
    const mint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6 // decimals
    );

    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );

    // 2. Mint tokens to user
    const amount = 1_000_000;
    await mintTo(
      connection,
      wallet.payer,
      mint,
      userTokenAccount.address,
      wallet.payer,
      amount
    );

    // 3. Derive vaultAuthority PDA
    const [vaultAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority")],
      program.programId
    );
    // 4. Derive vaultTokenAccount PDA (same seeds as in Rust)
    const [vaultTokenAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), mint.toBuffer()],
      program.programId
    );

    // 5. Call fund_me
    await program.methods.fundMe(new anchor.BN(amount)).accounts({
      user: wallet.publicKey,
      userTokenAccount: userTokenAccount.address,
      vaultAuthority,
      vaultTokenAccount,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    // 6. Check vault balance
    const vaultAccountInfo = await getAccount(connection, vaultTokenAccount);
    assert.equal(Number(vaultAccountInfo.amount), amount, "Vault should have received the tokens");
  });
});
