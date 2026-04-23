-- ── Organiser Rebates & Monthly Bonus System ──────────────────────────────────

-- Rebates table: stores per-battle entry rebates for organisers
CREATE TABLE IF NOT EXISTS organiser_rebates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  prize_pool      NUMERIC(12,2) NOT NULL DEFAULT 0,
  entry_fee       NUMERIC(12,2) NOT NULL DEFAULT 0,
  rebate_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  rebate_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  tier_label      TEXT NOT NULL DEFAULT '',   -- e.g. "$501-$1000"
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

-- Monthly bonus table: bonus cash rewards for high volume months
CREATE TABLE IF NOT EXISTS organiser_monthly_bonuses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  prize_volume    NUMERIC(14,2) NOT NULL DEFAULT 0,
  tier_label      TEXT NOT NULL DEFAULT '',   -- e.g. "$10,000+"
  bonus_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  paid_at         TIMESTAMPTZ,
  UNIQUE (organiser_id, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rebates_organiser    ON organiser_rebates(organiser_id);
CREATE INDEX IF NOT EXISTS idx_rebates_tournament   ON organiser_rebates(tournament_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bonus_org    ON organiser_monthly_bonuses(organiser_id);
