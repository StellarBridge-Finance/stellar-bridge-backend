# AI.md — StellarBridge Finance Contract Layer

> Generated: 2026-05-02  
> Scope: 30% scaffold — Payroll, Escrow, Compliance contracts on Soroban

---

## What Was Built

This repo is the **smart contract layer** of the StellarBridge Finance platform — a cross-border payroll network built on Stellar/Soroban.

### Workspace Layout

```
stellar-bridge-finance-contract/
├── Cargo.toml                    # workspace root
├── crates/
│   └── types/                    # shared types used by all contracts
│       └── src/lib.rs
└── contracts/
    ├── payroll/src/lib.rs        # payroll batch management
    ├── escrow/src/lib.rs         # fund locking & release
    └── compliance/src/lib.rs    # KYC/AML whitelist
```

---

## Shared Types (`crates/types`)

All contracts import from this crate. Key types:

| Type | Description |
|---|---|
| `Recipient` | `{ address, amount, currency }` — one payroll recipient |
| `Payroll` | `{ id, employer, total_amount, currency, recipients, status }` |
| `PayrollStatus` | `Pending → Approved → Executed / Cancelled` |
| `Escrow` | `{ id, depositor, beneficiary, amount, currency, released }` |
| `ComplianceStatus` | `Whitelisted / Revoked / Pending` |

---

## Contract Interfaces

### 1. Payroll Contract

**Purpose:** Stores payroll batches on-chain. The backend reads these to build Stellar path payment transactions.

| Function | Auth | Description |
|---|---|---|
| `create_payroll(employer, recipients, currency, total_amount) → u64` | employer | Creates a new payroll batch, returns ID |
| `approve_payroll(caller, id)` | employer/admin | Moves status from Pending → Approved |
| `execute_payroll(caller, id)` | backend signer | Moves status to Executed, emits `payroll_executed` event |
| `get_status(id) → Payroll` | anyone | Returns full payroll record |

**Event emitted on execute:** `(payroll_executed, id) → total_amount`

---

### 2. Escrow Contract

**Purpose:** Locks employer funds before payroll is approved. Released only after compliance + approval.

| Function | Auth | Description |
|---|---|---|
| `create_escrow(depositor, beneficiary, amount, currency) → u64` | depositor | Locks funds, returns escrow ID |
| `release(depositor, id)` | depositor | Releases to beneficiary, emits `escrow_released` |
| `refund(depositor, id)` | depositor | Returns funds to depositor, emits `escrow_refunded` |
| `get_escrow(id) → Escrow` | anyone | Returns escrow record |

---

### 3. Compliance Contract

**Purpose:** On-chain KYC/AML registry. Backend syncs KYC provider results here.

| Function | Auth | Description |
|---|---|---|
| `whitelist(admin, user)` | admin | Marks address as KYC-passed |
| `revoke(admin, user)` | admin | Revokes compliance for an address |
| `is_allowed(user) → bool` | anyone | Returns true if whitelisted |
| `get_status(user) → ComplianceStatus` | anyone | Returns raw status |

---

## How the 3 Repos Connect

```
stellar-bridge-finance-contract   (this repo)
        ↕  contract IDs + events
stellar-bridge-backend            (NestJS API)
        ↕  REST/WebSocket
stellar-bridge-finance-frontend   (Employer Dashboard)
```

### Backend (`stellar-bridge-backend`) Integration

The backend is the **orchestration layer**. It:

1. **Deploys contracts** using `soroban contract deploy` and stores the contract IDs in its DB/env.
2. **Calls `create_payroll`** when an employer submits a payroll batch via the API.
3. **Calls `create_escrow`** to lock employer funds before approval.
4. **Checks `is_allowed`** on the compliance contract before executing any payment.
5. **Calls `approve_payroll` + `execute_payroll`** after compliance passes.
6. **Listens for `payroll_executed` events** via Horizon event streaming to trigger actual Stellar `PathPaymentStrictSend` operations.
7. **Calls `release`** on the escrow contract after payment is confirmed on-chain.

**Required env vars in backend:**
```env
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
PAYROLL_CONTRACT_ID=C...
ESCROW_CONTRACT_ID=C...
COMPLIANCE_CONTRACT_ID=C...
ADMIN_SECRET_KEY=S...
```

**Calling contracts from Node.js (Stellar SDK v12+):**
```ts
import { Contract, SorobanRpc, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

const server = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL);
const contract = new Contract(process.env.PAYROLL_CONTRACT_ID);

// Example: check compliance before paying
const isAllowed = await server.simulateTransaction(
  new TransactionBuilder(sourceAccount, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(contract.call('is_allowed', userAddress))
    .setTimeout(30)
    .build()
);
```

---

### Frontend (`stellar-bridge-finance-frontend`) Integration

The frontend **never calls contracts directly**. It talks only to the backend API.

Key API endpoints the frontend will consume (to be built in backend):

| Endpoint | Description |
|---|---|
| `POST /payroll` | Submit payroll batch (employer) |
| `GET /payroll/:id` | Poll payroll status |
| `POST /payroll/:id/approve` | Approve payroll |
| `GET /compliance/:address` | Check KYC status |
| `GET /escrow/:id` | Get escrow state |

The frontend should display payroll status by polling `GET /payroll/:id` which the backend resolves by calling `get_status` on the contract.

---

## Deployment Steps

```bash
# 1. Build all contracts
cargo build --target wasm32-unknown-unknown --release

# 2. Deploy each contract (run once per network)
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payroll.wasm \
  --source ADMIN_SECRET_KEY \
  --network testnet

# Repeat for escrow and compliance — save the returned contract IDs

# 3. Set contract IDs in backend .env
PAYROLL_CONTRACT_ID=<id from step 2>
ESCROW_CONTRACT_ID=<id from step 2>
COMPLIANCE_CONTRACT_ID=<id from step 2>
```

---

## What's Left (70%)

| Phase | Work |
|---|---|
| Streaming salary contract | Real-time per-second salary drip |
| Token transfer integration | Actual `token::transfer` calls inside execute_payroll |
| Multi-sig approval | DAO-style payroll approval |
| Contract tests | `#[cfg(test)]` unit tests for all contracts |
| Scripts | `scripts/deploy-contracts.sh`, `scripts/setup-accounts.ts` |
| Anchor integration | Off-ramp hooks for NGN/KES fiat withdrawal |