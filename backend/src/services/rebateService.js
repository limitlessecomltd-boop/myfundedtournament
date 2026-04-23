"use strict";
const db = require("../config/db");

// ── Entry Rebate Tiers (based on prize pool per battle) ──────────────────────
const REBATE_TIERS = [
  { min: 2001, max: Infinity, pct: 50, label: "$2,001–$5,000+" },
  { min: 1001, max: 2000,     pct: 40, label: "$1,001–$2,000"  },
  { min:  501, max: 1000,     pct: 30, label: "$501–$1,000"    },
  { min:    1, max:  500,     pct: 15, label: "$1–$500"        },
];

// ── Monthly Volume Bonus Tiers ───────────────────────────────────────────────
// cumulative = true means bonus is net of previous tier
const MONTHLY_TIERS = [
  { min: 500000, bonus: 10000, label: "$500,000+"  },
  { min: 100000, bonus:  1500, label: "$100,000+"  },
  { min:  50000, bonus:   600, label: "$50,000+"   },
  { min:  25000, bonus:   250, label: "$25,000+"   },
  { min:  10000, bonus:   100, label: "$10,000+"   },
];

// ── Get rebate tier for a given prize pool ────────────────────────────────────
function getRebateTier(prizePool) {
  return REBATE_TIERS.find(t => prizePool >= t.min && prizePool <= t.max) || null;
}

// ── Calculate & upsert rebate for a completed battle ─────────────────────────
async function calculateAndSaveRebate(tournamentId) {
  // Fetch tournament details
  const { rows } = await db.query(
    `SELECT t.id, t.organiser_id, t.entry_fee,
            COALESCE(t.prize_pool,0) AS prize_pool,
            t.organiser_pct, t.status
     FROM tournaments t WHERE t.id = $1`,
    [tournamentId]
  );
  if (!rows.length) return null;
  const t = rows[0];
  if (!t.organiser_id) return null;

  const prizePool  = parseFloat(t.prize_pool || 0);
  const entryFee   = parseFloat(t.entry_fee  || 0);
  const tier       = getRebateTier(prizePool);
  if (!tier || entryFee <= 0) return null;

  const rebateAmt  = parseFloat(((entryFee * tier.pct) / 100).toFixed(2));

  // Upsert: one rebate per battle per organiser
  const { rows: saved } = await db.query(`
    INSERT INTO organiser_rebates
      (organiser_id, tournament_id, prize_pool, entry_fee, rebate_pct, rebate_amount, tier_label, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
    ON CONFLICT (tournament_id) DO UPDATE
      SET prize_pool=$3, entry_fee=$4, rebate_pct=$5, rebate_amount=$6, tier_label=$7
    RETURNING *
  `, [t.organiser_id, tournamentId, prizePool, entryFee, tier.pct, rebateAmt, tier.label])
  .catch(async () => {
    // If no unique constraint yet, just insert if not exists
    const exists = await db.query(
      "SELECT id FROM organiser_rebates WHERE tournament_id=$1", [tournamentId]
    );
    if (exists.rows.length) return { rows: exists.rows };
    return db.query(`
      INSERT INTO organiser_rebates
        (organiser_id, tournament_id, prize_pool, entry_fee, rebate_pct, rebate_amount, tier_label, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *
    `, [t.organiser_id, tournamentId, prizePool, entryFee, tier.pct, rebateAmt, tier.label]);
  });

  return saved.rows[0] || null;
}

// ── Get rebates for organiser ─────────────────────────────────────────────────
async function getOrganiserRebates(organiserId) {
  const { rows } = await db.query(`
    SELECT r.*, t.name AS battle_name, t.status AS battle_status
    FROM organiser_rebates r
    LEFT JOIN tournaments t ON t.id = r.tournament_id
    WHERE r.organiser_id = $1
    ORDER BY r.created_at DESC
  `, [organiserId]);
  return rows;
}

// ── Get rebate summary for organiser ─────────────────────────────────────────
async function getOrganiserRebateSummary(organiserId) {
  const { rows } = await db.query(`
    SELECT
      COALESCE(SUM(rebate_amount), 0)                                   AS total_rebates,
      COALESCE(SUM(rebate_amount) FILTER (WHERE status='pending'), 0)   AS pending_rebates,
      COALESCE(SUM(rebate_amount) FILTER (WHERE status='paid'), 0)      AS paid_rebates,
      COUNT(*)                                                           AS total_rebate_events,
      COUNT(*) FILTER (WHERE status='pending')                          AS pending_count
    FROM organiser_rebates WHERE organiser_id=$1
  `, [organiserId]);
  return rows[0] || {};
}

// ── Calculate monthly bonus ───────────────────────────────────────────────────
async function calculateMonthlyBonus(organiserId) {
  const now   = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);

  // Sum prize_pool of all completed battles in last 30 days
  const { rows } = await db.query(`
    SELECT COALESCE(SUM(COALESCE(prize_pool,0)),0) AS volume
    FROM tournaments
    WHERE organiser_id=$1
      AND status='ended'
      AND updated_at >= $2
  `, [organiserId, start.toISOString()]);

  const volume     = parseFloat(rows[0]?.volume || 0);
  const matchedTiers = MONTHLY_TIERS.filter(t => volume >= t.min).sort((a,b) => b.min - a.min);
  if (!matchedTiers.length) return { volume, bonus: 0, tier: null };

  const topTier  = matchedTiers[0];
  // Deduct lower tier bonuses (net calculation)
  const lowerBonus = matchedTiers.slice(1).reduce((s,t) => s + t.bonus, 0);
  const netBonus   = topTier.bonus - lowerBonus;

  return { volume, bonus: topTier.bonus, netBonus, tier: topTier, matchedTiers };
}

// ── Get monthly bonuses for organiser ────────────────────────────────────────
async function getOrganiserMonthlyBonuses(organiserId) {
  const { rows } = await db.query(`
    SELECT * FROM organiser_monthly_bonuses
    WHERE organiser_id=$1
    ORDER BY period_start DESC
  `, [organiserId]);
  return rows;
}

// ── Get full rebates dashboard data ──────────────────────────────────────────
async function getRebatesDashboard(organiserId) {
  const [rebates, summary, bonuses, monthlyCalc] = await Promise.all([
    getOrganiserRebates(organiserId),
    getOrganiserRebateSummary(organiserId),
    getOrganiserMonthlyBonuses(organiserId),
    calculateMonthlyBonus(organiserId),
  ]);

  return {
    rebates,
    summary,
    bonuses,
    currentMonth: monthlyCalc,
    tiers: {
      rebate:  REBATE_TIERS,
      monthly: MONTHLY_TIERS,
    },
  };
}

module.exports = {
  REBATE_TIERS,
  MONTHLY_TIERS,
  getRebateTier,
  calculateAndSaveRebate,
  getOrganiserRebates,
  getOrganiserRebateSummary,
  calculateMonthlyBonus,
  getOrganiserMonthlyBonuses,
  getRebatesDashboard,
};
