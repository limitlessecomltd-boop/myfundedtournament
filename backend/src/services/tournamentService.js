const db = require("../config/db");
const { lockTournamentEntries } = require("./entryService");
const cron = require("node-cron");

async function getAllTournaments(filter) {
  let where = "";
  if (filter && filter !== "all") where = `WHERE t.status = '${filter}'`;
  const { rows } = await db.query(`
    SELECT t.*,
      COUNT(DISTINCT e.id) FILTER (WHERE e.status='active') AS active_entries,
      COUNT(DISTINCT e.user_id) AS unique_traders
    FROM tournaments t
    LEFT JOIN entries e ON e.tournament_id = t.id
    ${where}
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `);
  return rows;
}

async function getTournamentById(id) {
  const { rows } = await db.query(`
    SELECT t.*,
      COUNT(DISTINCT e.id) FILTER (WHERE e.status='active') AS active_entries,
      COUNT(DISTINCT e.user_id) AS unique_traders
    FROM tournaments t
    LEFT JOIN entries e ON e.tournament_id = t.id
    WHERE t.id = $1
    GROUP BY t.id
  `, [id]);
  return rows[0] || null;
}

async function createTournament(data) {
  const { name, tier, entryFee, maxEntries, registrationOpen, startTime, endTime } = data;
  const { rows } = await db.query(`
    INSERT INTO tournaments (name, tier, entry_fee, max_entries, registration_open, start_time, end_time, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'registration') RETURNING *
  `, [name, tier, entryFee, maxEntries || 25, registrationOpen, startTime, endTime]);
  return rows[0];
}

// ─── Auto-create 2 replacement registration battles ──────────────────────────
async function ensureRegistrationSlots() {
  // Count open registration slots per tier
  const { rows: counts } = await db.query(`
    SELECT tier, COUNT(*) as cnt
    FROM tournaments
    WHERE status = 'registration'
    GROUP BY tier
  `);

  const starterOpen = counts.find(r => r.tier === "starter")?.cnt || 0;
  const proOpen     = counts.find(r => r.tier === "pro")?.cnt || 0;

  const now = new Date();
  const farFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  if (parseInt(starterOpen) < 1) {
    // Get next sequential number for Starter Bullet
    const { rows: numRow } = await db.query(
      "SELECT COUNT(*) as total FROM tournaments WHERE tier='starter'"
    );
    const num = parseInt(numRow[0].total) + 1;
    await db.query(`
      INSERT INTO tournaments (name, tier, entry_fee, max_entries, registration_open, start_time, end_time, status)
      VALUES ($1,'starter',25,25,$2,$3,$4,'registration')
    `, [`Starter Bullet #${num}`, now.toISOString(), farFuture, farFuture]);
    console.log(`[AutoSlot] Created Starter Bullet #${num}`);
  }

  if (parseInt(proOpen) < 1) {
    // Get next sequential number for Pro Bullet
    const { rows: numRow } = await db.query(
      "SELECT COUNT(*) as total FROM tournaments WHERE tier='pro'"
    );
    const num = parseInt(numRow[0].total) + 1;
    await db.query(`
      INSERT INTO tournaments (name, tier, entry_fee, max_entries, registration_open, start_time, end_time, status)
      VALUES ($1,'pro',50,25,$2,$3,$4,'registration')
    `, [`Pro Bullet #${num}`, now.toISOString(), farFuture, farFuture]);
    console.log(`[AutoSlot] Created Pro Bullet #${num}`);
  }
}

// ─── Check if any registration battles are full → start them ─────────────────
async function checkAndStartFullBattles() {
  const { rows: full } = await db.query(`
    SELECT t.id, t.name, t.tier, t.max_entries, t.entry_fee,
      COUNT(DISTINCT e.id) FILTER (WHERE e.status='active') AS active_entries
    FROM tournaments t
    LEFT JOIN entries e ON e.tournament_id = t.id
    WHERE t.status = 'registration'
    GROUP BY t.id
    HAVING COUNT(DISTINCT e.id) FILTER (WHERE e.status='active') >= t.max_entries
  `);

  for (const t of full) {
    const now = new Date();
    // 5-minute prep window, then 90-minute battle
    const startTime = new Date(now.getTime() + 5 * 60 * 1000);
    const endTime   = new Date(startTime.getTime() + 90 * 60 * 1000);

    await db.query(`
      UPDATE tournaments
      SET status='active', start_time=$1, end_time=$2
      WHERE id=$3
    `, [startTime.toISOString(), endTime.toISOString(), t.id]);

    await lockTournamentEntries(t.id);
    console.log(`[AutoStart] Battle full → Started: ${t.name} (${t.active_entries}/${t.max_entries})`);

    // Immediately create 2 replacement registration slots
    await ensureRegistrationSlots();
  }
}

// ─── Finalize ended battles ───────────────────────────────────────────────────
async function finalizeDueTournaments() {
  const { rows } = await db.query(`
    SELECT * FROM tournaments
    WHERE status='active' AND end_time <= NOW()
  `);

  for (const t of rows) {
    const { rows: top } = await db.query(`
      SELECT e.id, e.user_id, e.profit_pct, u.username, u.email
      FROM entries e
      JOIN users u ON u.id = e.user_id
      WHERE e.tournament_id=$1 AND e.status='active'
      ORDER BY e.profit_pct DESC
      LIMIT 1
    `, [t.id]);

    if (top.length) {
      const winner = top[0];
      // fundedSize calculated below per tier
      await db.query(`UPDATE tournaments SET status='ended', winner_entry_id=$1 WHERE id=$2`, [winner.id, t.id]);
      await db.query("UPDATE entries SET status='completed' WHERE tournament_id=$1 AND status='active'", [t.id]);
      await db.query(`
        INSERT INTO funded_accounts (entry_id, user_id, tournament_id, account_size, status)
        VALUES ($1,$2,$3,$4,'pending_kyc')
      `, [winner.id, winner.user_id, t.id, fundedSize]);
      console.log(`[Finalized] ${t.name} → Winner: ${winner.username || winner.email} +${winner.profit_pct?.toFixed(2)}%`);
    } else {
      await db.query("UPDATE tournaments SET status='ended' WHERE id=$1", [t.id]);
      console.log(`[Finalized] ${t.name} → No entries, ended.`);
    }
  }
}

// ─── Cron: every 30 seconds ───────────────────────────────────────────────────
function startTournamentCron() {
  // Run immediately on startup
  ensureRegistrationSlots().catch(console.error);

  // Then every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      await checkAndStartFullBattles();
      await finalizeDueTournaments();
      await ensureRegistrationSlots();
    } catch (err) {
      console.error("[Cron Error]", err.message);
    }
  });

  console.log("Tournament lifecycle cron started (30s interval)");
}

module.exports = {
  getAllTournaments, getTournamentById,
  createTournament, startTournamentCron,
  createGuildBattle, getMyGuildBattles
};

// ─── Guild Battle ─────────────────────────────────────────────────────────────

async function createGuildBattle(organiserId, { name, entryFee, maxEntries, winnerPct }) {
  // Validate
  const fee     = parseFloat(entryFee);
  const max     = parseInt(maxEntries);
  const wPct    = parseFloat(winnerPct);   // e.g. 80
  const platPct = 10;                       // always 10%
  const oPct    = 100 - wPct - platPct;     // organiser gets the rest

  if (fee < 1 || fee > 10000)   throw new Error("Entry fee must be between $1 and $10,000");
  if (max < 5 || max > 200)     throw new Error("Players must be between 5 and 200");
  if (wPct < 50 || wPct > 90)   throw new Error("Winner payout must be between 50% and 90%");
  if (oPct < 0)                  throw new Error("Percentages exceed 100%");

  const now       = new Date();
  const farFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { rows } = await db.query(`
    INSERT INTO tournaments (
      name, tier, tier_type, entry_fee, max_entries,
      registration_open, start_time, end_time, status,
      organiser_id, winner_pct, organiser_pct, platform_pct
    ) VALUES ($1,'guild','guild',$2,$3,$4,$5,$6,'registration',$7,$8,$9,$10)
    RETURNING *
  `, [name, fee, max, now.toISOString(), farFuture, farFuture,
      organiserId, wPct, oPct, platPct]);

  return rows[0];
}

async function getMyGuildBattles(organiserId) {
  const { rows } = await db.query(`
    SELECT t.*,
      COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS active_entries,
      COUNT(DISTINCT e.user_id) AS unique_traders
    FROM tournaments t
    LEFT JOIN entries e ON e.tournament_id = t.id
    WHERE t.organiser_id = $1
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `, [organiserId]);
  return rows;
}
