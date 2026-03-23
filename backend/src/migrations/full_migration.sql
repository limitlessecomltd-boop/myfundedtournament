-- ═══════════════════════════════════════════════════════════════════════
-- MFT FULL DATABASE MIGRATION
-- Run this in Supabase SQL Editor (copy all, paste, click Run)
-- All statements use IF NOT EXISTS — safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════════

-- ── Guild Battle columns (tournaments table) ──────────────────────────
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS tier_type            VARCHAR(20)   DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS organiser_id         UUID          REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS winner_pct           NUMERIC(5,2)  DEFAULT 90.00,
  ADD COLUMN IF NOT EXISTS organiser_pct        NUMERIC(5,2)  DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS platform_pct         NUMERIC(5,2)  DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS custom_name          VARCHAR(120),
  ADD COLUMN IF NOT EXISTS is_public            BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS organiser_paid       BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS organiser_payout_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS slug                 VARCHAR(120)  UNIQUE;

-- ── Organiser profile columns (users table) ───────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name   VARCHAR(80),
  ADD COLUMN IF NOT EXISTS bio            VARCHAR(300),
  ADD COLUMN IF NOT EXISTS total_hosted   INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned      BOOLEAN   DEFAULT FALSE;

-- ── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tournaments_organiser ON tournaments(organiser_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_tier_type ON tournaments(tier_type);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug      ON tournaments(slug);
CREATE INDEX IF NOT EXISTS idx_users_banned          ON users(is_banned);

-- ── Fix existing ugly tournament names ────────────────────────────────
-- Removes timestamp suffix from auto-generated names
UPDATE tournaments
SET name = REGEXP_REPLACE(name, ' #\d{10,}$', '')
WHERE name ~ ' #\d{10,}$';

-- ── Verify (shows column counts after migration) ──────────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='tournaments') AS tournament_columns,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users') AS user_columns,
  (SELECT COUNT(*) FROM tournaments WHERE name ~ ' #\d{10,}$') AS ugly_names_remaining;
