CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(255) UNIQUE,
  username       VARCHAR(30) UNIQUE,
  wallet_address VARCHAR(100),
  password_hash  VARCHAR(255),
  is_admin       BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- ─── TOURNAMENTS ─────────────────────────────────────────────────────────────
CREATE TYPE tournament_tier   AS ENUM ('starter', 'pro', 'elite');
CREATE TYPE tournament_status AS ENUM ('upcoming', 'registration', 'active', 'ended', 'cancelled');

CREATE TABLE IF NOT EXISTS tournaments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(100) NOT NULL,
  tier              tournament_tier NOT NULL,
  entry_fee         NUMERIC(18,2) NOT NULL,
  max_entries       INTEGER NOT NULL DEFAULT 200,
  max_active_per_trader INTEGER NOT NULL DEFAULT 5,
  max_total_per_trader  INTEGER NOT NULL DEFAULT 10,
  registration_open TIMESTAMP NOT NULL,
  start_time        TIMESTAMP NOT NULL,
  end_time          TIMESTAMP NOT NULL,
  status            tournament_status DEFAULT 'upcoming',
  prize_pool        NUMERIC(18,2) DEFAULT 0,
  winner_entry_id   UUID,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ─── ENTRIES (one per MT5 account per re-entry) ───────────────────────────────
CREATE TYPE entry_status AS ENUM ('pending_payment','active','breached','disqualified','completed');

CREATE TABLE IF NOT EXISTS entries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id     UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_number      INTEGER NOT NULL,          -- 1..10 for this user in this tournament
  mt5_login         VARCHAR(50) NOT NULL,
  mt5_password      VARCHAR(100) NOT NULL,     -- investor (read-only) password
  mt5_server        VARCHAR(100) NOT NULL,     -- broker server name
  broker            VARCHAR(50) NOT NULL,      -- exness / icmarkets / tickmill / other
  metaapi_account_id VARCHAR(100),             -- MetaApi account ID after connection
  starting_balance  NUMERIC(18,2),
  current_balance   NUMERIC(18,2),
  current_equity    NUMERIC(18,2),
  profit_abs        NUMERIC(18,2) DEFAULT 0,
  profit_pct        NUMERIC(10,4) DEFAULT 0,   -- PRIMARY ranking metric
  total_trades      INTEGER DEFAULT 0,
  winning_trades    INTEGER DEFAULT 0,
  excluded_trades   INTEGER DEFAULT 0,         -- HFT / hedge violations
  max_drawdown_pct  NUMERIC(10,4) DEFAULT 0,
  status            entry_status DEFAULT 'pending_payment',
  locked_at         TIMESTAMP,                 -- when tournament went active
  payment_id        VARCHAR(100),              -- NOWPayments payment ID
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, user_id, entry_number)
);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TYPE payment_status AS ENUM ('waiting','confirming','confirmed','failed','expired');

CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id          UUID REFERENCES entries(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  tournament_id     UUID NOT NULL REFERENCES tournaments(id),
  nowpayments_id    VARCHAR(100) UNIQUE,
  payment_address   VARCHAR(200),
  amount_usd        NUMERIC(18,2) NOT NULL,
  currency          VARCHAR(20) DEFAULT 'usdttrc20',
  status            payment_status DEFAULT 'waiting',
  confirmed_at      TIMESTAMP,
  tx_hash           VARCHAR(200),
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ─── TRADES (synced from MetaApi) ────────────────────────────────────────────
CREATE TYPE trade_status AS ENUM ('open','closed');
CREATE TYPE trade_violation AS ENUM ('hft','hedge','none');

CREATE TABLE IF NOT EXISTS trades (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id          UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  mt5_ticket        BIGINT NOT NULL,
  pair              VARCHAR(20) NOT NULL,
  side              VARCHAR(10) NOT NULL,      -- buy / sell
  lot_size          NUMERIC(10,2) NOT NULL,
  open_price        NUMERIC(18,6),
  close_price       NUMERIC(18,6),
  open_time         TIMESTAMP,
  close_time        TIMESTAMP,
  duration_seconds  INTEGER,
  profit            NUMERIC(18,2) DEFAULT 0,
  swap              NUMERIC(18,2) DEFAULT 0,
  commission        NUMERIC(18,2) DEFAULT 0,
  status            trade_status DEFAULT 'open',
  violation         trade_violation DEFAULT 'none',
  excluded          BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(entry_id, mt5_ticket)
);

-- ─── VIOLATIONS (admin review queue) ─────────────────────────────────────────
CREATE TYPE violation_type   AS ENUM ('hft','hedge','deposit','account_change');
CREATE TYPE violation_status AS ENUM ('auto_resolved','pending_review','dismissed','disqualified');

CREATE TABLE IF NOT EXISTS violations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id        UUID NOT NULL REFERENCES entries(id),
  type            violation_type NOT NULL,
  description     TEXT,
  evidence        JSONB,
  status          violation_status DEFAULT 'auto_resolved',
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─── FUNDED ACCOUNTS ─────────────────────────────────────────────────────────
CREATE TYPE funded_status AS ENUM ('pending_kyc','kyc_done','funded','active','suspended','closed');

CREATE TABLE IF NOT EXISTS funded_accounts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id          UUID NOT NULL REFERENCES entries(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  tournament_id     UUID NOT NULL REFERENCES tournaments(id),
  account_size      NUMERIC(18,2) NOT NULL,    -- 90% of prize pool
  broker_account    VARCHAR(100),
  broker_name       VARCHAR(50),
  max_drawdown_pct  NUMERIC(5,2) DEFAULT 100,
  daily_drawdown_pct NUMERIC(5,2) DEFAULT 20,
  trader_split_pct  NUMERIC(5,2) DEFAULT 90,
  platform_split_pct NUMERIC(5,2) DEFAULT 10,
  status            funded_status DEFAULT 'pending_kyc',
  kyc_verified_at   TIMESTAMP,
  funded_at         TIMESTAMP,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ─── PAYOUT REQUESTS ─────────────────────────────────────────────────────────
CREATE TYPE payout_status AS ENUM ('pending','approved','paid','rejected');

CREATE TABLE IF NOT EXISTS payout_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funded_account_id UUID NOT NULL REFERENCES funded_accounts(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  gross_profit      NUMERIC(18,2) NOT NULL,
  trader_amount     NUMERIC(18,2) NOT NULL,    -- 90%
  platform_amount   NUMERIC(18,2) NOT NULL,    -- 10%
  wallet_address    VARCHAR(200) NOT NULL,
  currency          VARCHAR(20) DEFAULT 'usdttrc20',
  status            payout_status DEFAULT 'pending',
  tx_hash           VARCHAR(200),
  processed_by      UUID REFERENCES users(id),
  processed_at      TIMESTAMP,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_entries_tournament   ON entries(tournament_id);
CREATE INDEX idx_entries_user         ON entries(user_id);
CREATE INDEX idx_entries_profit_pct   ON entries(tournament_id, profit_pct DESC);
CREATE INDEX idx_entries_status       ON entries(status);
CREATE INDEX idx_trades_entry         ON trades(entry_id);
CREATE INDEX idx_trades_status        ON trades(status);
CREATE INDEX idx_payments_nowpayments ON payments(nowpayments_id);
CREATE INDEX idx_violations_entry     ON violations(entry_id);
CREATE INDEX idx_violations_status    ON violations(status);
