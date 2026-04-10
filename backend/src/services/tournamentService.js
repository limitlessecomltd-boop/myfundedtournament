const db = require("../config/db");
const { lockTournamentEntries } = require("./entryService");
const email = require("./emailService");
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
      COUNT(DISTINCT e.id) FILTER (WHERE e.status IN ('active','completed')) AS active_entries,
      COUNT(DISTINCT e.user_id) FILTER (WHERE e.status IN ('active','completed','breached','disqualified')) AS unique_traders,
      -- Winner info
      wu.username AS winner_username,
      we.profit_pct AS winner_profit_pct
    FROM tournaments t
    LEFT JOIN entries e ON e.tournament_id = t.id
    LEFT JOIN entries we ON we.id = t.winner_entry_id
    LEFT JOIN users wu ON wu.id = we.user_id
    WHERE t.id = $1
    GROUP BY t.id, wu.username, we.profit_pct
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

    // Send battle-starting emails to all active participants
    try {
      const { rows: participants } = await db.query(
        `SELECT e.id, u.email, u.username FROM entries e JOIN users u ON u.id=e.user_id
         WHERE e.tournament_id=$1 AND e.status='active'`, [t.id]
      );
      for (const p of participants) {
        email.sendBattleStarting({
          email:p.email, username:p.username,
          tournamentName:t.name, tournamentId:t.id, endTime:endTime,
        }).catch(e => console.error('[Email] sendBattleStarting failed for', p.email, ':', e.message));
      }
      if (participants.length) console.log(`[Email] Battle-starting sent to ${participants.length} traders`);
    } catch(e) { console.warn('[Email] sendBattleStarting error:', e.message); }

    console.log(`[AutoStart] Battle full → Started: ${t.name} (${t.active_entries}/${t.max_entries})`);

    // Immediately create 2 replacement registration slots
    await ensureRegistrationSlots();
  }
}

// ─── Hard-close all open positions at 87 min (3 min before battle end) ────────
// Runs server-side so positions are closed even if trader closed their browser.
// Only fires once per entry (tracked via hard_closed_at column).
async function hardClosePositionsAt87Min() {
  const BRIDGE = process.env.MT5_BRIDGE_URL || 'http://38.60.196.145:5099';
  const SECRET = process.env.BRIDGE_SECRET   || 'mft_bridge_secret_2024';

  // Find active tournaments in their final 3 minutes (between 87–90 min mark)
  const { rows: tournaments } = await db.query(`
    SELECT id, name, end_time FROM tournaments
    WHERE status = 'active'
      AND end_time > NOW()
      AND end_time <= NOW() + INTERVAL '3 minutes'
  `);

  for (const t of tournaments) {
    // Get all active entries that haven't been hard-closed yet
    const { rows: entries } = await db.query(`
      SELECT id, mt5_login FROM entries
      WHERE tournament_id = $1
        AND status = 'active'
        AND mt5_login IS NOT NULL
        AND (hard_closed_at IS NULL)
    `, [t.id]);

    if (!entries.length) continue;
    console.log(`[HardClose] ${t.name} — closing ${entries.length} entries at 87 min`);

    for (const entry of entries) {
      try {
        const r = await fetch(`${BRIDGE}/close-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: String(entry.mt5_login), secret: SECRET }),
          signal: AbortSignal.timeout(8000)
        });
        const result = await r.json();
        console.log(`[HardClose] Entry ${entry.id} login ${entry.mt5_login}: closed=${result.closed} failed=${result.failed}`);
        // Mark as hard-closed so we don't try again
        await db.query(`UPDATE entries SET hard_closed_at = NOW() WHERE id = $1`, [entry.id]);
      } catch (e) {
        console.error(`[HardClose] Failed for entry ${entry.id}:`, e.message);
      }
    }
  }
}


async function finalizeDueTournaments() {
  const { rows } = await db.query(`
    SELECT * FROM tournaments
    WHERE status='active' AND end_time <= NOW()
  `);

  for (const t of rows) {
    console.log(`[Finalizing] ${t.name}`);

    // Enforce 3-minute rule: exclude trades still open in final 3 minutes
    // Exclude any still-open trades (3-min rule) — use valid violation type 'none'
    await db.query(`
      UPDATE trades SET excluded = TRUE
      WHERE entry_id IN (
        SELECT id FROM entries WHERE tournament_id = $1 AND status = 'active'
      )
      AND status = 'open'
      AND excluded = FALSE
    `, [t.id]);

    // Get winner — highest profit_pct among non-disqualified active entries
    const { rows: top } = await db.query(`
      SELECT e.id, e.user_id, e.profit_pct, e.profit_abs, u.username, u.email
      FROM entries e
      JOIN users u ON u.id = e.user_id
      WHERE e.tournament_id = $1
        AND e.status = 'active'
        AND e.status != 'disqualified'
      ORDER BY e.profit_pct DESC
      LIMIT 1
    `, [t.id]);

    if (top.length) {
      const winner = top[0];

      // Calculate prize using correct payout percentages
      const pool    = parseFloat(t.prize_pool || 0);
      const wPct    = parseFloat(t.winner_pct  || 90);
      const oPct    = parseFloat(t.organiser_pct || 0);
      const fundedSize = pool > 0 ? pool * (wPct / 100) : 0;

      // Mark tournament ended with winner
      await db.query(
        `UPDATE tournaments SET status='ended', winner_entry_id=$1 WHERE id=$2`,
        [winner.id, t.id]
      );

      // Mark all active entries as completed
      await db.query(
        `UPDATE entries SET status='completed' WHERE tournament_id=$1 AND status='active'`,
        [t.id]
      );

      // Create funded account record for winner (always — even if prize_pool=0)
      await db.query(`
        INSERT INTO funded_accounts (entry_id, user_id, tournament_id, account_size, status)
        VALUES ($1, $2, $3, $4, 'pending_kyc')
        ON CONFLICT DO NOTHING
      `, [winner.id, winner.user_id, t.id, fundedSize]);

      // For guild battles — record organiser payout amount
      if ((t.tier_type === 'guild' || t.tier === 'guild') && t.organiser_id && oPct > 0) {
        const orgAmount = pool * (oPct / 100);
        await db.query(
          `UPDATE tournaments SET organiser_payout_amount = $1 WHERE id = $2`,
          [orgAmount, t.id]
        );
        console.log(`[Finalized] Guild organiser payout: $${orgAmount.toFixed(2)}`);
      }

      console.log(`[Finalized] ${t.name} → 🏆 Winner: ${winner.username || winner.email} +${parseFloat(winner.profit_pct).toFixed(2)}% | Prize: $${fundedSize.toFixed(2)}`);

      // Send winner notification email
      try {
        await email.sendWinnerNotification({
          email: winner.email, username: winner.username,
          tournamentName: t.name, profitPct: winner.profit_pct,
          prizeAmount: fundedSize, tournamentId: t.id,
        });
      } catch(e) { console.warn('[Email] Winner email failed:', e.message); }

      // Send results to all participants
      try {
        const { rows: allEntries } = await db.query(`
          SELECT e.profit_pct, u.email, u.username,
            RANK() OVER (ORDER BY e.profit_pct DESC) AS position
          FROM entries e
          JOIN users u ON u.id = e.user_id
          WHERE e.tournament_id = $1 AND e.status = 'completed'
        `, [t.id]);
        for (const entry of allEntries) {
          if (entry.email === winner.email) continue; // winner already got a better email
          await email.sendBattleResults({
            email: entry.email, username: entry.username,
            tournamentName: t.name, position: parseInt(entry.position),
            profitPct: entry.profit_pct, winnerName: winner.username || winner.email,
            winnerPct: winner.profit_pct, tournamentId: t.id,
          }).catch(() => {});
        }
      } catch(e) { console.warn('[Email] Results emails failed:', e.message); }

      // Send organiser payout email for guild battles
      if ((t.tier_type === 'guild' || t.tier === 'guild') && t.organiser_id) {
        try {
          const orgAmount = pool * (parseFloat(t.organiser_pct || 0) / 100);
          if (orgAmount > 0) {
            const { rows: org } = await db.query(
              'SELECT email, username FROM users WHERE id=$1', [t.organiser_id]
            );
            if (org.length) {
              await email.sendOrganiserPayout({
                email: org[0].email, username: org[0].username,
                tournamentName: t.name, payoutAmount: orgAmount,
              });
            }
          }
        } catch(e) { console.warn('[Email] Organiser payout email failed:', e.message); }
      }
    } else {
      // No entries — just end the tournament
      await db.query(`UPDATE tournaments SET status='ended' WHERE id=$1`, [t.id]);
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
      await hardClosePositionsAt87Min();   // force-close all open positions at 87 min
      await finalizeDueTournaments();
      await ensureRegistrationSlots();
    } catch (err) {
      console.error("[Cron Error]", err.message);
    }
  });

  console.log("Tournament lifecycle cron started (30s interval)");
}


// ─── Finalize a specific tournament by ID ─────────────────────────────────────
async function finalizeOneTournament(tournamentId) {
  // First sync profit_pct from bridge for all active entries
  const BRIDGE = process.env.MT5_BRIDGE_URL || 'http://38.60.196.145:5099';
  const { rows: activeEntries } = await db.query(
    `SELECT id, mt5_login, starting_balance FROM entries WHERE tournament_id=$1 AND status='active'`,
    [tournamentId]
  );
  for (const entry of activeEntries) {
    try {
      const acc = await fetch(`${BRIDGE}/account?login=${entry.mt5_login}`).then(r=>r.json()).catch(()=>null);
      if (acc && acc.balance && !acc.error) {
        const startBal = parseFloat(entry.starting_balance || 1000);
        const bal      = parseFloat(acc.balance);
        const profitAbs = bal - startBal;
        const profitPct = ((profitAbs / startBal) * 100).toFixed(4);
        await db.query(
          `UPDATE entries SET current_balance=$1, current_equity=$2, profit_abs=$3, profit_pct=$4 WHERE id=$5`,
          [bal, parseFloat(acc.equity || bal), profitAbs.toFixed(2), profitPct, entry.id]
        );
      }
    } catch(e) { console.warn('[finalizeOne] sync error for', entry.mt5_login, e.message); }
  }

  // Set end_time to past if not already past (forces cron to pick it up)
  await db.query(
    `UPDATE tournaments SET end_time=NOW() - INTERVAL '1 second'
     WHERE id=$1 AND (end_time IS NULL OR end_time > NOW())`,
    [tournamentId]
  );

  // Re-check: run finalize for this specific tournament
  const { rows } = await db.query(
    `SELECT * FROM tournaments WHERE id=$1 AND status='active' AND end_time <= NOW()`,
    [tournamentId]
  );

  if (!rows.length) {
    // Tournament may already be ended or not active — try to re-finalize
    const { rows: t2 } = await db.query(`SELECT * FROM tournaments WHERE id=$1`, [tournamentId]);
    if (!t2.length) throw new Error('Tournament not found');
    // Force re-run even if ended (for recovery)
    const { rows: ended } = await db.query(
      `SELECT * FROM tournaments WHERE id=$1 AND end_time <= NOW()`, [tournamentId]
    );
    if (ended.length) {
      await db.query(`UPDATE tournaments SET status='active' WHERE id=$1 AND status='ended'`, [tournamentId]);
      await finalizeDueTournaments();
      return { done: true, recovered: true };
    }
    return { done: false, reason: 'Tournament not eligible for finalization' };
  }

  await finalizeDueTournaments();
  return { done: true };
}

module.exports = {
  getAllTournaments, getTournamentById,
  createTournament, startTournamentCron,
  createGuildBattle, getMyGuildBattles, getOrganiserCommissionSummary,
  finalizeDueTournaments,
  finalizeOneTournament,
};

// ─── Guild Battle ─────────────────────────────────────────────────────────────

async function createGuildBattle(organiserId, { name, entryFee, maxEntries, winnerPct, slug }) {
  // Validate
  const fee     = parseFloat(entryFee);
  const max     = parseInt(maxEntries);
  const wPct    = parseFloat(winnerPct);   // e.g. 80
  const platPct = 10;                       // always 10%
  const oPct    = 100 - wPct - platPct;     // organiser gets the rest

  if (fee < 1 || fee > 10000)   throw new Error("Entry fee must be between $1 and $10,000");
  if (max < 2 || max > 200)     throw new Error("Players must be between 2 and 200");
  if (wPct < 50 || wPct > 90)   throw new Error("Winner payout must be between 50% and 90%");
  if (oPct < 0)                  throw new Error("Percentages exceed 100%");

  const now       = new Date();
  const farFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { rows } = await db.query(`
    INSERT INTO tournaments (
      name, tier, tier_type, entry_fee, max_entries,
      registration_open, start_time, end_time, status,
      organiser_id, winner_pct, organiser_pct, platform_pct, slug
    ) VALUES ($1,'guild','guild',$2,$3,$4,$5,$6,'registration',$7,$8,$9,$10,$11)
    RETURNING *
  `, [name, fee, max, now.toISOString(), farFuture, farFuture,
      organiserId, wPct, oPct, platPct, slug || null]);

  return rows[0];
}

async function getMyGuildBattles(organiserId) {
  const { rows } = await db.query(`
    SELECT t.*,
      COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS active_entries,
      COUNT(DISTINCT e.user_id) AS unique_traders,
      COALESCE(t.prize_pool, 0) AS prize_pool,
      ROUND(COALESCE(t.prize_pool, 0) * COALESCE(t.organiser_pct, 0) / 100, 2) AS commission_earned,
      CASE WHEN t.status = 'ended' THEN
        ROUND(COALESCE(t.prize_pool, 0) * COALESCE(t.organiser_pct, 0) / 100, 2)
      ELSE 0 END AS commission_paid,
      CASE WHEN t.status != 'ended' THEN
        ROUND(COALESCE(t.prize_pool, 0) * COALESCE(t.organiser_pct, 0) / 100, 2)
      ELSE 0 END AS commission_pending
    FROM tournaments t
    LEFT JOIN entries e ON e.tournament_id = t.id
    WHERE t.organiser_id = $1
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `, [organiserId]);
  return rows;
}

// Get commission summary for a guild organiser
async function getOrganiserCommissionSummary(organiserId) {
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE tier_type='guild' OR tier='guild') AS total_battles,
      COUNT(*) FILTER (WHERE (tier_type='guild' OR tier='guild') AND status='ended') AS completed_battles,
      COUNT(*) FILTER (WHERE (tier_type='guild' OR tier='guild') AND status IN ('registration','active')) AS active_battles,
      COALESCE(SUM(CASE WHEN status='ended'
        THEN ROUND(COALESCE(prize_pool,0) * COALESCE(organiser_pct,0) / 100, 2)
        ELSE 0 END), 0) AS total_earned,
      COALESCE(SUM(CASE WHEN status IN ('registration','active')
        THEN ROUND(COALESCE(prize_pool,0) * COALESCE(organiser_pct,0) / 100, 2)
        ELSE 0 END), 0) AS pending_earnings,
      COALESCE(SUM(COALESCE(prize_pool,0)), 0) AS total_prize_volume
    FROM tournaments
    WHERE organiser_id = $1
  `, [organiserId]);
  return rows[0];
}

