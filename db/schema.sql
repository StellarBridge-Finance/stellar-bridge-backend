-- StellarBridge Finance — DB Schema
-- Run once: psql $DATABASE_URL -f db/schema.sql

CREATE TABLE IF NOT EXISTS payroll_batches (
  id            BIGSERIAL PRIMARY KEY,
  contract_id   BIGINT NOT NULL,          -- on-chain payroll ID
  employer      VARCHAR(56) NOT NULL,     -- Stellar public key (G...)
  currency      VARCHAR(12) NOT NULL,
  total_amount  NUMERIC(20,7) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|approved|executed|cancelled
  tx_hash       VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_recipients (
  id            BIGSERIAL PRIMARY KEY,
  batch_id      BIGINT NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
  address       VARCHAR(56) NOT NULL,
  amount        NUMERIC(20,7) NOT NULL,
  currency      VARCHAR(12) NOT NULL
);

CREATE TABLE IF NOT EXISTS escrows (
  id            BIGSERIAL PRIMARY KEY,
  contract_id   BIGINT NOT NULL,          -- on-chain escrow ID
  depositor     VARCHAR(56) NOT NULL,
  beneficiary   VARCHAR(56) NOT NULL,
  amount        NUMERIC(20,7) NOT NULL,
  currency      VARCHAR(12) NOT NULL,
  released      BOOLEAN NOT NULL DEFAULT FALSE,
  tx_hash       VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_records (
  address       VARCHAR(56) PRIMARY KEY,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',  -- whitelisted|revoked|pending
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_employer ON payroll_batches(employer);
CREATE INDEX IF NOT EXISTS idx_escrow_depositor ON escrows(depositor);
