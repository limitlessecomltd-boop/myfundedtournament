-- Add Guild Battle support to tournaments table
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS tier_type     VARCHAR(20) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS organiser_id  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS winner_pct    NUMERIC(5,2) DEFAULT 90.00,
  ADD COLUMN IF NOT EXISTS organiser_pct NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS platform_pct  NUMERIC(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS custom_name   VARCHAR(120),
  ADD COLUMN IF NOT EXISTS is_public     BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS organiser_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS organiser_payout_amount NUMERIC(12,2);

CREATE INDEX IF NOT EXISTS idx_tournaments_organiser ON tournaments(organiser_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_tier_type ON tournaments(tier_type);

-- Add slug for custom joining links (e.g. /battle/alpha-traders-showdown)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS slug VARCHAR(120) UNIQUE;

-- Add organiser profile fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name    VARCHAR(80),
  ADD COLUMN IF NOT EXISTS bio             VARCHAR(300),
  ADD COLUMN IF NOT EXISTS total_hosted    INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON tournaments(slug);
