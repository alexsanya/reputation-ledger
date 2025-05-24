# 🧾 Solana Reputation Ledger

A trustless reputation system for service providers—built on Solana.

## 🔍 What Is It?

A blockchain-based reputation ledger that brings full transparency to online services. Every interaction—quote, delivery, payment, and feedback—is recorded on-chain, publicly visible, and immutable.

## 🛠 Use Cases

- ✅ One-time freelance jobs  
- 🔐 Crypto API gateways  
- 🤝 Any service requiring prepayment and proof-of-work delivery

## 💡 Why This Matters

Before you hire someone or pay for a service, wouldn’t it be nice to:

- Browse their past work history?
- See whether past clients were happy?
- Know you can get a refund if things go wrong?

This project enables exactly that—on-chain. No middlemen, no fake reviews, no hidden deals.

---

## 🔄 Workflow

1. **Client Requests a Quote**  
   Sends order data off-chain to the service provider.

2. **Service Responds**  
   Provides a signed offer including price, deadline, and expiration.

3. **Client Accepts**  
   Locks funds on-chain using the service’s signed offer.

4. **Service Delivers**  
   Commits the output hash on-chain to claim the locked funds.

5. **Time Check**  
   If the deadline passes with no delivery, client can claim a full refund.

6. **Client Feedback**  
   If the result is poor, client can mark the order as **“unsatisfied”** on-chain.

---

## 📖 What’s Recorded On-Chain?

- 🔎 What was ordered (hash)
- 📦 What was delivered (hash)  
- 💰 What it cost (traceble SPL token transfer)
- ⏱ How long it took  
- 😊 Was the client satisfied?  

---

## 🔐 Trust Through Transparency

The system doesn’t enforce quality—but it makes everything visible:

- Any client can audit past jobs  
- Anyone can verify feedback claims  
- Reputation is earned, not gamed  

---

## 📌 Project Goals

- Build an open, inspectable on-chain reputation layer  
- Encourage better service through visibility, not censorship  
- Enable crypto-native commerce with built-in accountability

---

## 🚧 Status

🔧 Still in early development. Core program logic is being implemented in Rust using Solana’s low-level APIs.

---

## 📄 License

MIT

