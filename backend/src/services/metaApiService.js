const { getMetaApi } = require("../config/metaapi");
const db = require("../config/db");
const { checkRules } = require("./rulesEngine");
const cron = require("node-cron");

/**
 * Connect a trader's MT5 account to MetaApi using investor (read-only) password.
 * Returns the MetaApi account ID for future reference.
 */
async function connectAccount(mt5Login, mt5Password, mt5Server, broker) {
  const api = getMetaApi();
  const provisioningApi = api.metatraderAccountApi;

  const account = await provisioningApi.createAccount({
    name: `MyFundedTournament-${mt5Login}`,
    type: "cloud",
    login: mt5Login,
    password: mt5Password,
    server: mt5Server,
    platform: "mt5",
    application: "MetaApi",
    magic: 0,
    quoteStreamingIntervalInSeconds: 2.5,
    reliability: "regular",
  });

  await account.deploy();
  await account.waitConnected();

  return account.id;
}

/**
 * Fetch latest account info and all trades for an entry.
 * Syncs everything to the database and runs the rules engine.
 */
async function syncEntry(entry) {
  try {
    const api = getMetaApi();
    const account = await api.metatraderAccountApi.getAccount(entry.metaapi_account_id);
    const connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized();

    // ── Account info ──────────────────────────────────────────────────────
    const info = await connection.getAccountInformation();
    const balance = info.balance;
    const equity  = info.equity;

    // Deposit breach: balance grew above starting balance
    if (balance > parseFloat(entry.starting_balance) + 0.01) {
      await flagDepositBreach(entry, balance);
      await connection.close();
      return;
    }

    // ── Pull all closed deals ─────────────────────────────────────────────
    const deals = await connection.getDealsByTimeRange(
      new Date(entry.locked_at || entry.created_at),
      new Date()
    );

    // Upsert each trade
    for (const deal of deals) {
      if (deal.type !== "DEAL_TYPE_BUY" && deal.type !== "DEAL_TYPE_SELL") continue;
      await upsertTrade(entry.id, deal);
    }

    // ── Run rules engine ──────────────────────────────────────────────────
    await checkRules(entry.id);

    // ── Recalculate stats ─────────────────────────────────────────────────
    await recalculateEntryStats(entry.id, entry.starting_balance, balance, equity);

    await connection.close();
  } catch (err) {
    console.error(`[MetaApi] Sync failed for entry ${entry.id}:`, err.message);
  }
}

async function upsertTrade(entryId, deal) {
  const openTime  = deal.time ? new Date(deal.time) : null;
  const closeTime = deal.doneTime ? new Date(deal.doneTime) : null;
  const durationSeconds = (openTime && closeTime)
    ? Math.floor((closeTime - openTime) / 1000)
    : null;

  await db.query(`
    INSERT INTO trades (
      entry_id, mt5_ticket, pair, side, lot_size,
      open_price, close_price, open_time, close_time,
      duration_seconds, profit, swap, commission, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (entry_id, mt5_ticket) DO UPDATE SET
      close_price = EXCLUDED.close_price,
      close_time  = EXCLUDED.close_time,
      duration_seconds = EXCLUDED.duration_seconds,
      profit      = EXCLUDED.profit,
      status      = EXCLUDED.status
  `, [
    entryId, deal.id, deal.symbol,
    deal.type === "DEAL_TYPE_BUY" ? "buy" : "sell",
    deal.volume, deal.price, deal.closePrice,
    openTime, closeTime, durationSeconds,
    deal.profit || 0, deal.swap || 0, deal.commission || 0,
    closeTime ? "closed" : "open"
  ]);
}

async function recalculateEntryStats(entryId, startingBalance, balance, equity) {
  // Only count non-excluded closed trades
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='closed' AND NOT excluded) AS total_trades,
      COUNT(*) FILTER (WHERE status='closed' AND NOT excluded AND profit > 0) AS winning_trades,
      COUNT(*) FILTER (WHERE excluded = TRUE) AS excluded_trades,
      COALESCE(SUM(profit + swap + commission) FILTER (WHERE status='closed' AND NOT excluded), 0) AS net_profit
    FROM trades WHERE entry_id = $1
  `, [entryId]);

  const stats = rows[0];
  const startBal  = parseFloat(startingBalance);
  const profitAbs = parseFloat(stats.net_profit);
  const profitPct = startBal > 0 ? (profitAbs / startBal) * 100 : 0;

  await db.query(`
    UPDATE entries SET
      current_balance  = $1,
      current_equity   = $2,
      profit_abs       = $3,
      profit_pct       = $4,
      total_trades     = $5,
      winning_trades   = $6,
      excluded_trades  = $7
    WHERE id = $8
  `, [balance, equity, profitAbs, profitPct,
      stats.total_trades, stats.winning_trades, stats.excluded_trades,
      entryId]);
}

async function flagDepositBreach(entry, newBalance) {
  await db.query(
    "UPDATE entries SET status='disqualified' WHERE id=$1",
    [entry.id]
  );
  await db.query(`
    INSERT INTO violations (entry_id, type, description, evidence, status)
    VALUES ($1, 'deposit', 'Balance exceeded starting balance — deposit detected', $2, 'auto_resolved')
  `, [entry.id, JSON.stringify({ startingBalance: entry.starting_balance, detectedBalance: newBalance })]);

  console.log(`[Rules] Entry ${entry.id} auto-disqualified: deposit detected`);
}

/**
 * Sync all active entries across all active tournaments every 60 seconds.
 */
function startSyncCron() {
  cron.schedule("* * * * *", async () => {
    try {
      const { rows: entries } = await db.query(`
        SELECT e.*, t.start_time, t.end_time
        FROM entries e
        JOIN tournaments t ON t.id = e.tournament_id
        WHERE e.status = 'active'
          AND t.status = 'active'
          AND e.metaapi_account_id IS NOT NULL
      `);

      for (const entry of entries) {
        await syncEntry(entry);
      }
    } catch (err) {
      console.error("[Sync cron] Error:", err.message);
    }
  });

  console.log("MetaApi sync cron started (every 60s)");
}

module.exports = { connectAccount, syncEntry, startSyncCron };
