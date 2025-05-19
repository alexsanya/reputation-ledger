# Job Escrow System Design (Solana Program)

## 🎯 Goal

Design a trustless, transparent system on Solana where users pay for off-chain task execution, and the blockchain serves as an immutable ledger of all lifecycle events. On-chain logs are used for off-chain indexing and reputation tracking.

---

## 🧭 Workflow Overview

### 👤 Actors:

* **Client**: Requests a job and locks funds
* **Service**: Evaluates, starts, and completes or aborts jobs
* **Smart Contract**: Escrows tokens, emits events, and manages job lifecycle

### 📑 Order Lifecycle:

1. **Estimate**: Client sends job hash → Order PDA created → `OrderPlaced` event emitted
2. **Evaluate**: Service assigns price → writes to Order PDA → emits `EvaluationMade`
3. **Commit**: Client pays → vault receives SPL tokens → emits `Start`
4. **Deliver**: Service completes job → writes result → emits `Completed`
5. **Decline**: Service aborts job → refunds client → emits `Abort`
6. **Refund**: Client claims refund after timeout → emits `Refund`

---

## 📦 Account Structure

### `Order` PDA

* Created by program using seeds `["order", user, job_hash]`
* Stores full job metadata
* Prevents spoofing and unauthorized writes

### `Vault` Token Account

* PDA storing locked SPL tokens per job
* Authority: fixed program-controlled PDA

---

## ⚙️ Instructions

### `Estimate`

* Inputs: `job_hash`
* Actions:

  * Derives and initializes `Order` PDA
  * Emits `OrderPlaced { user, job_hash }`

### `Evaluate`

* Inputs: `price`
* Actions:

  * Writes price to order account
  * Emits `EvaluationMade { order, price }`

### `Commit`

* Inputs: `user_token_account`
* Actions:

  * Transfers SPL tokens from user → vault PDA
  * Emits `Start { order }`

### `Deliver`

* Inputs: `result_hash`
* Actions:

  * Writes `result_hash` to order account
  * Emits `Completed { order, result_hash }`

### `Decline`

* Called by service
* Refunds user
* Emits `Abort { order }`

### `Refund`

* Called by client after timeout
* Checks if not completed
* Refunds user
* Emits `Refund { order }`

---

## 🛡 Security Design

* Program creates all PDAs to prevent spoofing
* Token transfers require explicit signer/authority
* Refunds protected by timeout and flags (`completed`, `refunded`)
* SPL token transfers use `CpiContext::new_with_signer`

---

## 📊 Indexing Strategy

* Emits `#[event]` for each lifecycle action
* Indexed by Helius or Triton
* Events contain `order_pubkey`, `user_pubkey`, `job_hash`, `timestamp`
* No on-chain global counter required (Helius provides sequencing)

---

## 🚫 Re-Entrancy & Safety

* Solana does not support dynamic re-entrancy
* External CPIs do not cause re-entrancy unless explicitly re-invoked
* All state is updated **before** any external CPI

---

## ✅ Summary

| Component      | Design Choice                        |
| -------------- | ------------------------------------ |
| Order Storage  | PDA per order (program-derived)      |
| Vault          | PDA token account                    |
| Indexing       | Off-chain via Helius events          |
| Refunds        | Timeout-based + abort logic          |
| Re-entrancy    | Avoided via execution order and CPIs |
| Sequential IDs | Not needed (Helius handles ordering) |
| Concurrency    | Safe due to Solana's account locks   |

---

Would you like to extend this design to support sharded logs, job reputation scores, or multi-party arbitration?
