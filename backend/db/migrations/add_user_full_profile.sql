-- ─── ENHANCED USER PROFILE MIGRATION ─────────────────────────────────────────
-- Adds: hash_id, full profile fields, signup metadata, session tracking

-- 1. Add new columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hash_id          VARCHAR(64)  UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS first_name       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone            VARCHAR(30),
  ADD COLUMN IF NOT EXISTS country          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS timezone         VARCHAR(60),
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS signup_ip        VARCHAR(64),
  ADD COLUMN IF NOT EXISTS signup_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS signup_referrer  TEXT,
  ADD COLUMN IF NOT EXISTS signup_source    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_login_at    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_login_ip    VARCHAR(64),
  ADD COLUMN IF NOT EXISTS login_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_reason    TEXT,
  ADD COLUMN IF NOT EXISTS total_deposited  NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_won        NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMP DEFAULT NOW();

-- 2. Backfill hash_id for any existing users
UPDATE users
SET hash_id = ENCODE(SHA256((id::TEXT || email || EXTRACT(EPOCH FROM created_at)::TEXT)::BYTEA), 'hex')
WHERE hash_id IS NULL;

-- 3. User signup events log
CREATE TABLE IF NOT EXISTS user_signup_events (
  id              UUID PRIMARY KEY DEFAULT,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hash_id         VARCHAR(64) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  username        VARCHAR(30),
  ip_address      VARCHAR(64),
  user_agent      TEXT,
  referrer        TEXT,
  source          VARCHAR(50),
  country         VARCHAR(10),
  timezone        VARCHAR(60),
  device_type     VARCHAR(20),
  browser         VARCHAR(50),
  os              VARCHAR(50),
  signup_at       TIMESTAMP DEFAULT NOW(),
  raw_headers     JSONB
);

-- 4. User login events log
CREATE TABLE IF NOT EXISTS user_login_events (
  id          UUID PRIMARY KEY DEFAULT,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hash_id     VARCHAR(64) NO NULL,
  ip_address  VARCHAR(64),
  user_agent  TEXT,
  success     BOOLEAN DEFAULT TRUE,
  fail_reason VARCHAR(100),
  logged_at   TIMESTAMP DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_users_hash_id          ON users(hash_id);
CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_signup_events_uid  ON user_signup_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_events_uid   ON user_login_events(user_id);