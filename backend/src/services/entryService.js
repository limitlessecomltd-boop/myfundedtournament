const db = require("../config/db");
const { connectAccount } = require("./metaApiService");
const { createEntryPayment } = require("./paymentService");

const MAX_ACTIVE_PER_TRADER  = 1;  // 1 active at a time
const MAX_TOTAL_PER_TRADER   = 2;   // 1 original + 1 re-entry

/**
 * Create a new entry (or re-entry) for a trader in a tournament.
 * Validates re-entry limits and creates the NOWPayments invoice.
 */
async function createEntry(userId, tournamentId, mt5Login, mt5Password, mt5Server, broker) {
  // Check tournament exists and is open for registration
  const { rows: tours } = await db.query(
    "SELECT * FROM tournaments WHERE id=$1",
    [tournamentId]
  );
  if (!tours.length) throw new Error("Tournament not found");
  const tournament = tours[0];
  if (!["upcoming", "registration", "active"].includes(tournament.status)) {
    throw new Error("Tournament is not accepting entries");
  }

  // Count trader's existing entries
  const { rows: existing } = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active_count
    FROM entries
    WHERE tournament_id=$1 AND user_id=$2
  `, [tournamentId, userId]);

  const total  = parseInt(existing[0].total);
  const active = parseInt(existing[0].active_count);

  if (total >= MAX_TOTAL_PER_TRADER) {
    throw new Error("Maximum 1 re-entry allowed per tournament. You have used both entries.");
  }

  // Re-entry only unlocks after first entry is breached/completed
  if (total >= 1) {
    const { rows: firstEntry } = await db.query(`
      SELECT COUNT(*) AS still_alive
      FROM entries
      WHERE tournament_id=$1 AND user_id=$2
        AND status NOT IN ('breached','disqualified','completed')
    `, [tournamentId, userId]);

    if (parseInt(firstEntry[0].still_alive) > 0) {
      throw new Error("Re-entry only unlocks after your first entry is breached or completed.");
    }
  }

  // Max 1 active at a time
  if (active >= MAX_ACTIVE_PER_TRADER) {
    throw new Error("You already have an active entry. Re-entry unlocks after it is breached.");
  }

  const entryNumber = total + 1;

  // Create entry record (pending payment)
  const { rows } = await db.query(`
    INSERT INTO entries (
      tournament_id, user_id, entry_number,
      mt5_login, mt5_password, mt5_server, broker, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_payment')
    RETURNING *
  `, [tournamentId, userId, entryNumber, mt5Login, mt5Password, mt5Server, broker]);

  const entry = rows[0];

  // Create NOWPayments invoice
  const paymentInfo = await createEntryPayment(
    userId, tournamentId, entry.id, tournament.entry_fee
  );

  return { entry, payment: paymentInfo };
}

/**
 * After payment confirmed, connect the MT5 account to MetaApi
 * and record the starting balance.
 */
async function activateEntryMetaApi(entryId) {
  const { rows } = await db.query("SELECT * FROM entries WHERE id=$1", [entryId]);
  if (!rows.length) return;
  const entry = rows[0];

  // ── Try Bridge first (self-hosted, free) ─────────────────────────────────
  const bridgeUrl    = process.env.BRIDGE_URL;
  const bridgeSecret = process.env.BRIDGE_SECRET;

  if (bridgeUrl && bridgeSecret) {
    try {
      const r = await fetch(`${bridgeUrl}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bridge-Secret': bridgeSecret },
        body: JSON.stringify({
          mt5_login:     entry.mt5_login,
          mt5_password:  entry.mt5_password,
          mt5_server:    entry.mt5_server,
          broker:        entry.broker,
          entry_id:      entryId,
          tournament_id: entry.tournament_id
        }),
        timeout: 10000
      });
      const data = await r.json();
      if (data.ok) {
        // Mark entry as bridge-connected (use entry_id as bridge_account_id)
        await db.query(`
          UPDATE entries SET
            metaapi_account_id = $1,
            starting_balance   = $2,
            current_balance    = $2,
            current_equity     = $2,
            locked_at          = NOW()
          WHERE id = $3
        `, [`bridge:${entry.mt5_login}`, entry.starting_balance || 1000, entryId]);
        console.log(`[Bridge] Entry ${entryId} connected via bridge — Login: ${entry.mt5_login}`);
        return;
      }
    } catch (err) {
      console.error(`[Bridge] Connection failed for ${entryId}:`, err.message);
      console.log(`[Bridge] Falling back to MetaApi...`);
    }
  }

  // ── Fallback: MetaApi ────────────────────────────────────────────────────
  try {
    const { connectAccount } = require('./metaApiService');
    const metaapiId = await connectAccount(
      entry.mt5_login,
      entry.mt5_password,
      entry.mt5_server,
      entry.broker
    );
    const { getMetaApi } = require("../config/metaapi");
    const api = getMetaApi();
    const account = await api.metatraderAccountApi.getAccount(metaapiId);
    const conn = account.getRPCConnection();
    await conn.connect();
    await conn.waitSynchronized();
    const info = await conn.getAccountInformation();
    await conn.close();
    await db.query(`
      UPDATE entries SET
        metaapi_account_id = $1,
        starting_balance   = $2,
        current_balance    = $2,
        current_equity     = $2,
        locked_at          = NOW()
      WHERE id = $3
    `, [metaapiId, info.balance, entryId]);
    console.log(`[MetaApi] Entry ${entryId} activated, balance: $${info.balance}`);
  } catch (err) {
    console.error(`[Entry] Activation failed for ${entryId}:`, err.message);
  }
}

/**
 * Lock all active entries when a tournament transitions to active.
 * Once locked, MT5 account cannot be changed.
 */
async function lockTournamentEntries(tournamentId) {
  await db.query(`
    UPDATE entries
    SET locked_at = NOW()
    WHERE tournament_id = $1
      AND status = 'active'
      AND locked_at IS NULL
  `, [tournamentId]);
  console.log(`[Entry] All entries locked for tournament ${tournamentId}`);
}

/**
 * Get all entries for a user in a tournament (for profile / my entries view).
 */
async function getUserEntries(userId, tournamentId) {
  const { rows } = await db.query(`
    SELECT e.*,
      COUNT(t.id) FILTER (WHERE t.status='closed' AND NOT t.excluded) AS valid_trades,
      COUNT(t.id) FILTER (WHERE t.excluded) AS excluded_trades_count
    FROM entries e
    LEFT JOIN trades t ON t.entry_id = e.id
    WHERE e.user_id=$1 AND e.tournament_id=$2
    GROUP BY e.id
    ORDER BY e.entry_number
  `, [userId, tournamentId]);
  return rows;
}

module.exports = { createEntry, activateEntryMetaApi, lockTournamentEntries, getUserEntries };
