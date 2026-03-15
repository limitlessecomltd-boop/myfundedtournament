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
    ORDER BY t.start_time DESC
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
  const {
    name, tier, entryFee, maxEntries,
    registrationOpen, startTime, endTime
  } = data;

  const { rows } = await db.query(`
    INSERT INTO tournaments (name, tier, entry_fee, max_entries, registration_open, start_time, end_time)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [name, tier, entryFee, maxEntries || 200, registrationOpen, startTime, endTime]);
  return rows[0];
}

// ─── Lifecycle cron (runs every minute) ──────────────────────────────────────

async function activateDueTournaments() {
  const { rows } = await db.query(`
    SELECT * FROM tournaments
    WHERE status IN ('upcoming','registration') AND start_time <= NOW()
  `);
  for (const t of rows) {
    await db.query("UPDATE tournaments SET status='active' WHERE id=$1", [t.id]);
    await lockTournamentEntries(t.id);
    console.log(`[Tournament] Activated: ${t.name}`);
  }
}

async function openRegistrationDue() {
  const { rows } = await db.query(`
    SELECT * FROM tournaments
    WHERE status='upcoming' AND registration_open <= NOW()
  `);
  for (const t of rows) {
    await db.query("UPDATE tournaments SET status='registration' WHERE id=$1", [t.id]);
    console.log(`[Tournament] Registration opened: ${t.name}`);
  }
}

async function finalizeDueTournaments() {
  const { rows } = await db.query(`
    SELECT * FROM tournaments
    WHERE status='active' AND end_time <= NOW()
  `);
  for (const t of rows) {
    // Find winner — highest profit_pct among active entries
    const { rows: top } = await db.query(`
      SELECT e.id, e.user_id, e.profit_pct, e.profit_abs, u.username, u.email
      FROM entries e
      JOIN users u ON u.id = e.user_id
      WHERE e.tournament_id=$1 AND e.status='active'
      ORDER BY e.profit_pct DESC
      LIMIT 1
    `, [t.id]);

    if (top.length) {
      const winner = top[0];
      const fundedSize = parseFloat(t.prize_pool) * 0.9;

      await db.query(`
        UPDATE tournaments SET status='ended', winner_entry_id=$1 WHERE id=$2
      `, [winner.id, t.id]);

      // Mark all entries as completed
      await db.query(
        "UPDATE entries SET status='completed' WHERE tournament_id=$1 AND status='active'",
        [t.id]
      );

      // Create funded account record for winner
      await db.query(`
        INSERT INTO funded_accounts
          (entry_id, user_id, tournament_id, account_size, status)
        VALUES ($1,$2,$3,$4,'pending_kyc')
      `, [winner.id, winner.user_id, t.id, fundedSize]);

      console.log(`[Tournament] Finalized: ${t.name}. Winner: ${winner.username || winner.email}, +${winner.profit_pct.toFixed(2)}%, funded $${fundedSize}`);
    } else {
      await db.query("UPDATE tournaments SET status='ended' WHERE id=$1", [t.id]);
    }
  }
}

function startTournamentCron() {
  cron.schedule("* * * * *", async () => {
    await openRegistrationDue();
    await activateDueTournaments();
    await finalizeDueTournaments();
  });
  console.log("Tournament lifecycle cron started");
}

module.exports = {
  getAllTournaments, getTournamentById,
  createTournament, startTournamentCron
};
