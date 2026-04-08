const db = require("../config/db");
const { startPayment, CURRENCIES } = require("./forumPayService");

const MAX_ACTIVE_PER_TRADER  = 1;
const MAX_TOTAL_PER_TRADER   = 2;

/**
 * Create a new entry (or re-entry) for a trader in a tournament.
 */
async function createEntry(userId, tournamentId, mt5Login, mt5Password, mt5Server, broker) {
  const { rows: tours } = await db.query("SELECT * FROM tournaments WHERE id=$1", [tournamentId]);
  if (!tours.length) throw new Error("Tournament not found");
  const tournament = tours[0];
  if (!["upcoming", "registration", "active"].includes(tournament.status)) {
    throw new Error("Tournament is not accepting entries");
  }

  const { rows: existing } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status != 'pending_payment') AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active_count
    FROM entries
    WHERE tournament_id=$1 AND user_id=$2
  `, [tournamentId, userId]);

  const total  = parseInt(existing[0].total);
  const active = parseInt(existing[0].active_count);

  if (total >= MAX_TOTAL_PER_TRADER) {
    throw new Error("Maximum 1 re-entry allowed per tournament. You have used both entries.");
  }

  if (total >= 1) {
    const { rows: firstEntry } = await db.query(`
      SELECT COUNT(*) AS still_alive
      FROM entries
      WHERE tournament_id=$1 AND user_id=$2
        AND status NOT IN ('breached','disqualified','completed','pending_payment')
    `, [tournamentId, userId]);
    if (parseInt(firstEntry[0].still_alive) > 0) {
      throw new Error("Re-entry only unlocks after your first entry is breached or completed.");
    }
  }

  if (active >= MAX_ACTIVE_PER_TRADER) {
    throw new Error("You already have an active entry. Re-entry unlocks after it is breached.");
  }

  const entryNumber = total + 1;

  const { rows } = await db.query(`
    INSERT INTO entries (
      tournament_id, user_id, entry_number,
      mt5_login, mt5_password, mt5_server, broker, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_payment')
    ON CONFLICT (tournament_id, user_id, entry_number)
    DO UPDATE SET
      mt5_login    = EXCLUDED.mt5_login,
      mt5_password = EXCLUDED.mt5_password,
      mt5_server   = EXCLUDED.mt5_server,
      broker       = EXCLUDED.broker,
      payment_id   = NULL,
      status       = 'pending_payment'
    RETURNING *
  `, [tournamentId, userId, entryNumber, mt5Login, mt5Password, mt5Server, broker]);

  const entry = rows[0];
  // Create ForumPay payment — default to USDT_TRC20, frontend can switch currency
  const BACKEND_URL = process.env.BACKEND_URL || 'https://myfundedtournament-production.up.railway.app';
  const referenceNo = 'mft_' + entry.id.replace(/-/g,'').slice(0,16) + '_' + Date.now();
  const fp = await startPayment({
    invoiceAmount: parseFloat(tournament.entry_fee),
    currency:      'USDT_TRC20',
    referenceNo,
    webhookUrl:    BACKEND_URL + '/api/payments/webhook',
    payerIp:       '127.0.0.1',
  });
  // ForumPay payment_id comes from GetRate (embedded in startPayment response)
  const fpPaymentId = fp.forumpay_payment_id || fp.payment_id || referenceNo;
  // Save payment to DB
  await db.query(
    `INSERT INTO payments (entry_id, user_id, tournament_id, nowpayments_id, payment_address, amount_usd, amount_crypto, currency, status, reference_no)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'USDT_TRC20','waiting',$8)
     ON CONFLICT (nowpayments_id) DO NOTHING`,
    [entry.id, userId, tournamentId, fpPaymentId, fp.address, parseFloat(tournament.entry_fee), String(fp.amount||fp.rate_amount||''), referenceNo]
  );
  await db.query('UPDATE entries SET payment_id=$1 WHERE id=$2', [fpPaymentId, entry.id]);
  const paymentInfo = {
    paymentId:  fpPaymentId,
    address:    fp.address,
    amount:     fp.amount || fp.rate_amount,
    amount_usd: parseFloat(tournament.entry_fee),
    currency:   'USDT_TRC20',
    notice:     fp.notice,
    status:     'waiting',
  };
  return { entry, payment: paymentInfo };
}

/**
 * After payment confirmed, connect MT5 account to C# Bridge.
 * Records starting balance and marks entry as connected.
 */
async function activateEntryMetaApi(entryId) {
  const { rows } = await db.query("SELECT * FROM entries WHERE id=$1", [entryId]);
  if (!rows.length) return;
  const entry = rows[0];

  const BRIDGE = process.env.MT5_BRIDGE_URL || 'http://38.60.196.145:5099';
  const SECRET = process.env.BRIDGE_SECRET   || 'mft_bridge_secret_2024';

  try {
    const r = await fetch(`${BRIDGE}/connect-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login:    String(entry.mt5_login),
        password: entry.mt5_password,
        server:   entry.mt5_server || 'Exness-MT5Trial15',
        secret:   SECRET,
      }),
    });
    const data = await r.json();
    if (!data.connected) throw new Error(data.error || 'Bridge connect failed');

    // Wait up to 10s for balance to be available from bridge
    let balance = 1000;
    for (let i = 0; i < 5; i++) {
      await new Promise(res => setTimeout(res, 2000));
      try {
        const ar = await fetch(`${BRIDGE}/account?login=${entry.mt5_login}`);
        const acc = await ar.json();
        if (acc.balance && !acc.error) { balance = acc.balance; break; }
      } catch (_) {}
    }

    await db.query(`
      UPDATE entries SET
        metaapi_account_id = $1,
        starting_balance   = $2,
        current_balance    = $2,
        current_equity     = $2,
        locked_at          = NOW()
      WHERE id = $3
    `, [`bridge:${entry.mt5_login}`, balance, entryId]);

    console.log(`[Bridge] Entry ${entryId} activated — Login: ${entry.mt5_login} Balance: $${balance}`);
  } catch (err) {
    console.error(`[Bridge] Activation failed for entry ${entryId}:`, err.message);
  }
}

/**
 * Lock all active entries when a tournament transitions to active.
 */
async function lockTournamentEntries(tournamentId) {
  await db.query(`
    UPDATE entries SET locked_at = NOW()
    WHERE tournament_id=$1 AND status='active' AND locked_at IS NULL
  `, [tournamentId]);
  console.log(`[Entry] All entries locked for tournament ${tournamentId}`);
}

/**
 * Get all entries for a user in a tournament.
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
