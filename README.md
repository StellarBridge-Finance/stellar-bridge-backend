# stellar-bridge-backend

Payroll orchestration API for **StellarBridge Finance** — a cross-border payroll network built on Stellar/Soroban. This service sits between the Soroban smart contracts and the employer dashboard, handling payroll batching, escrow management, KYC compliance checks, and Stellar transaction execution.

---

## Repo Map (3-repo org)

```
stellar-bridge-finance-contract   ← Soroban contracts (Rust)
        ↕  contract IDs + on-chain events
stellar-bridge-backend            ← this repo (NestJS)
        ↕  REST API
stellar-bridge-finance-frontend   ← employer dashboard (React/Next.js)
```

The backend is the **only** service that talks to the blockchain. The frontend never calls contracts directly.

---

## Architecture

```
HTTP Request
     │
     ▼
NestJS Controller
     │
     ▼
Service Layer
  ├── PayrollService   → StellarService.createPayroll / approvePayroll / executePayroll
  ├── EscrowService    → StellarService.createEscrow / releaseEscrow / refundEscrow
  └── ComplianceService→ StellarService.isAllowed / whitelistAddress / revokeAddress
     │
     ▼
StellarService  (src/services/stellar.service.ts)
  ├── simulate()       → read-only contract calls via Soroban RPC
  └── buildAndSend()   → simulate → assemble → sign → send → poll confirmation
     │
     ▼
Soroban RPC  ──►  Payroll Contract
                  Escrow Contract
                  Compliance Contract
```

---

## Contract Connection

The three Soroban contracts live in `stellar-bridge-finance-contract`. After deploying them, paste their IDs into `.env`. The backend calls them via `@stellar/stellar-sdk` v12.

### How each contract is used

| Contract | When the backend calls it |
|---|---|
| **Payroll** | `POST /payroll` → `create_payroll`; `POST /payroll/:id/approve` → `approve_payroll`; `POST /payroll/:id/execute` → `execute_payroll` |
| **Escrow** | `POST /escrow` → `create_escrow`; `POST /escrow/:id/release` → `release`; `POST /escrow/:id/refund` → `refund` |
| **Compliance** | Before every `execute_payroll` → `is_allowed`; admin routes → `whitelist` / `revoke` |

### Full payroll flow

```
Employer                Backend                      Soroban Contracts
   │                       │                               │
   │  POST /escrow          │                               │
   │──────────────────────►│  createEscrow()               │
   │                       │──────────────────────────────►│ escrow.create_escrow
   │                       │◄──────────────────────────────│ escrow ID
   │  POST /payroll         │                               │
   │──────────────────────►│  createPayroll()              │
   │                       │──────────────────────────────►│ payroll.create_payroll
   │                       │◄──────────────────────────────│ payroll ID
   │  POST /payroll/:id/approve                             │
   │──────────────────────►│  approvePayroll()             │
   │                       │──────────────────────────────►│ payroll.approve_payroll
   │  POST /payroll/:id/execute                             │
   │──────────────────────►│  isAllowed() per recipient    │
   │                       │──────────────────────────────►│ compliance.is_allowed
   │                       │  executePayroll()             │
   │                       │──────────────────────────────►│ payroll.execute_payroll
   │                       │                               │ emits payroll_executed
   │  POST /escrow/:id/release                              │
   │──────────────────────►│  releaseEscrow()              │
   │                       │──────────────────────────────►│ escrow.release
   │◄──────────────────────│ { txHash }                    │
```

### Contract call internals (`StellarService`)

Every mutation goes through `buildAndSend()`:

```
1. getAccount()          — fetch current sequence number
2. TransactionBuilder    — wrap the contract.call() operation
3. simulateTransaction() — get footprint + auth from Soroban RPC
4. assembleTransaction() — inject simulation result
5. sign()                — admin keypair signs
6. sendTransaction()     — broadcast to network
7. poll getTransaction() — wait for SUCCESS (up to 20s)
```

Read-only calls (e.g. `get_status`, `is_allowed`) use `simulate()` only — no fee, no signing.

---

## Project Structure

```
src/
├── main.ts                          # bootstrap, global prefix /api/v1
├── app.module.ts                    # root module, TypeORM, ConfigModule
├── services/
│   └── stellar.service.ts           # all Soroban contract calls
└── modules/
    ├── payroll/
    │   ├── payroll.controller.ts    # POST /payroll, POST /:id/approve|execute, GET /:id
    │   ├── payroll.service.ts
    │   ├── payroll.dto.ts
    │   └── payroll.module.ts
    ├── compliance/
    │   ├── compliance.controller.ts # GET /:address, POST|DELETE /:address/whitelist
    │   ├── compliance.service.ts
    │   └── compliance.module.ts
    └── escrow/
        ├── escrow.controller.ts     # POST /escrow, POST /:id/release|refund, GET /:id
        ├── escrow.service.ts
        ├── escrow.dto.ts
        └── escrow.module.ts
db/
└── schema.sql                       # payroll_batches, payroll_recipients, escrows, compliance_records
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Contracts deployed from `stellar-bridge-finance-contract` (see that repo's `Ai.md`)

### 1. Clone and install

```bash
git clone https://github.com/your-org/stellar-bridge-backend.git
cd stellar-bridge-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/stellarbridge

SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
HORIZON_URL=https://horizon-testnet.stellar.org

# Paste contract IDs after deploying from stellar-bridge-finance-contract
PAYROLL_CONTRACT_ID=C...
ESCROW_CONTRACT_ID=C...
COMPLIANCE_CONTRACT_ID=C...

ADMIN_SECRET_KEY=S...
```

### 3. Set up the database

```bash
psql $DATABASE_URL -f db/schema.sql
```

### 4. Run

```bash
npm run start:dev
```

API is available at `http://localhost:3000/api/v1`.

---

## API Reference

### Payroll

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/payroll` | Create payroll batch |
| `POST` | `/api/v1/payroll/:id/approve` | Approve batch |
| `POST` | `/api/v1/payroll/:id/execute` | Execute (compliance checked first) |
| `GET` | `/api/v1/payroll/:id` | Get status |

**Create payroll body:**
```json
{
  "employer": "GABC...XYZ",
  "currency": "USDC",
  "totalAmount": 5000.00,
  "recipients": [
    { "address": "GDEF...123", "amount": 2500.00, "currency": "USDC" },
    { "address": "GHIJ...456", "amount": 2500.00, "currency": "NGN" }
  ]
}
```

### Compliance

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/compliance/:address` | Check KYC status |
| `POST` | `/api/v1/compliance/:address/whitelist` | Whitelist address (admin) |
| `DELETE` | `/api/v1/compliance/:address/whitelist` | Revoke address (admin) |

### Escrow

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/escrow` | Lock employer funds |
| `POST` | `/api/v1/escrow/:id/release?depositor=G...` | Release to beneficiary |
| `POST` | `/api/v1/escrow/:id/refund?depositor=G...` | Refund to depositor |
| `GET` | `/api/v1/escrow/:id` | Get escrow state |

> Amounts are in stroops on-chain (1 unit = 10⁻⁷). The API accepts and returns human-readable decimals.

---

## Tests

```bash
npm test
```

22 unit tests across 6 suites. All services and controllers are tested with a mocked `StellarService` — no live network required.

```
PASS  src/modules/payroll/payroll.service.spec.ts
PASS  src/modules/payroll/payroll.controller.spec.ts
PASS  src/modules/compliance/compliance.service.spec.ts
PASS  src/modules/compliance/compliance.controller.spec.ts
PASS  src/modules/escrow/escrow.service.spec.ts
PASS  src/modules/escrow/escrow.controller.spec.ts

Test Suites: 6 passed  |  Tests: 22 passed
```

---

## Connecting the Contracts (Step-by-Step)

If you haven't deployed the contracts yet:

```bash
# In stellar-bridge-finance-contract repo
cargo build --target wasm32-unknown-unknown --release

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payroll.wasm \
  --source $ADMIN_SECRET_KEY \
  --network testnet
# → copy returned C... ID → PAYROLL_CONTRACT_ID

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow.wasm \
  --source $ADMIN_SECRET_KEY \
  --network testnet
# → copy returned C... ID → ESCROW_CONTRACT_ID

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/compliance.wasm \
  --source $ADMIN_SECRET_KEY \
  --network testnet
# → copy returned C... ID → COMPLIANCE_CONTRACT_ID
```

Paste all three IDs into `.env`, then start the backend. `StellarService.onModuleInit()` will instantiate the contract clients on boot and log `Soroban contracts initialised`.

---

## What's Built (30%)

| Module | Status |
|--------|--------|
| NestJS project scaffold | ✅ |
| `StellarService` — all 3 contract bindings | ✅ |
| Payroll module (CRUD + execute) | ✅ |
| Compliance module (KYC check + admin) | ✅ |
| Escrow module (lock / release / refund) | ✅ |
| DB schema | ✅ |
| Unit tests (22 passing) | ✅ |

## What's Next (70%)

| Feature | Notes |
|---------|-------|
| Auth / JWT | Employer login, route guards |
| FX Service | DEX path-finding, `GET /fx/quote` |
| Wallet Service | Balance queries, account creation |
| CSV payroll upload | `POST /payroll/upload` multipart |
| Horizon event listener | Stream `payroll_executed` → trigger `PathPaymentStrictSend` |
| Retry queue (Redis/BullMQ) | Failed transaction retry logic |
| Salary streaming contract | Per-second drip integration |
| Anchor off-ramp | NGN/KES fiat withdrawal hooks |

---

## Stack

- **Runtime:** Node.js 20 / NestJS 10
- **Language:** TypeScript 5
- **Blockchain SDK:** `@stellar/stellar-sdk` v12
- **Database:** PostgreSQL + TypeORM
- **Testing:** Jest + ts-jest + `@nestjs/testing`
