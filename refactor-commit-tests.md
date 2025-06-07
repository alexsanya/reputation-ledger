# Refactoring Plan for `commit.ts` Anchor Test File

This document outlines a refactoring strategy to improve readability, modularity, and maintainability of the `commit.ts` test suite for a Solana Anchor program.

---

## ✅ Problems Identified

- Many tests **repeat the same setup**: building an `Order`, serializing it, signing it, and preparing a transaction.
- Long transaction definitions are hard to follow and maintain.
- Lack of **shared utility functions** to isolate setup logic.
- All test cases live in a single file, making navigation difficult.

---

## ✅ Refactoring Strategy

### 1. Split Tests into Individual Files

Refactor into a `tests/commit/` directory:

```
tests/
├── commit/
│   ├── valid.test.ts
│   ├── invalid_signature.test.ts
│   ├── wrong_job_hash.test.ts
│   ├── replay_attack.test.ts
│   └── index.ts  ← optional group runner
```

Each file should include **one test scenario**, keeping tests short and focused.

---

### 2. Extract Shared Setup Logic to Helpers

Move shared setup logic to `tests/helpers/commit.ts`:

```ts
export async function buildOrderMessage(ctx: TestContext): Promise<Uint8Array> {
  const order = new Order({
    user: ctx.user.publicKey.toBytes(),
    job_hash: new Uint8Array(ctx.jobHash),
    price: ctx.price,
    mint: new Uint8Array(ctx.mint.toBuffer()),
    price_valid_until: BigInt(100500),
    deadline: BigInt(3600),
  });
  return serializeOrder(order);
}

export async function signEd25519(message: Uint8Array, secretKey: Uint8Array) {
  return nacl.sign.detached(message, secretKey);
}

export async function buildCommitTx(ctx: TestContext, message: Uint8Array, signature: Uint8Array) {
  const tx = new anchor.web3.Transaction()
    .add(anchor.web3.Ed25519Program.createInstructionWithPublicKey({
      publicKey: ctx.service.publicKey.toBytes(),
      message,
      signature,
    }))
    .add(await ctx.program.methods
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
      .instruction());

  return tx;
}
```

---

### 3. Make Tests Clean and Declarative

```ts
import { buildOrderMessage, signEd25519, buildCommitTx } from "../helpers/commit";

it("commits successfully", async () => {
  const message = await buildOrderMessage(ctx);
  const signature = await signEd25519(message, ctx.service.secretKey);
  const tx = await buildCommitTx(ctx, message, signature);

  const { blockhash, lastValidBlockHeight } = await ctx.provider.connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = ctx.user.publicKey;
  tx.sign(ctx.user.payer);

  const sig = await sendAndConfirmRawTransaction(ctx.provider.connection, tx.serialize());
  assert.ok(sig);
});
```

---

### Bonus: Improve Naming

Rename generic variables like `ctx` to `testCtx` or `env` for clarity.

---

## ✅ TL;DR

| Strategy                      | Benefit                                  |
|------------------------------|-------------------------------------------|
| Split tests by scenario      | Easier to scan, edit, and understand      |
| Move shared logic to helpers | Reduce repetition, isolate complexity     |
| Use declarative test names   | Self-documenting behavior                 |
| Keep transactions readable   | Easier debugging and audit trail          |
