/**
 * bridgeSyncService.js
 * Polls the C# bridge every 30s and updates entry stats in Supabase.
 * Replaces MetaApi sync cron — bridge handles the MT5 connection.
 */
const db   = require("../config/db");
const cron = require("node-cron");

const BRIDGE = process.env.MT5_BRIDGE_URL || "http://38.60.196.145:5099";
const STARTING_BALANCE = 1000;

async function bridgeFetch(path) {
  const r = await fetch(`${BRIDGE}${path}`, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`Bridge ${path} returned ${r.status}`);
  return r.json();
}

async function syncActiveEntries() {
  try {
    // Get all active entries that use the bridge
    const { rows: entries } = await db.query(`
      SELECT e.id, e.mt5_login, e.starting_balance, e.tournament_id
      FROM entries e
      JOIN tournaments t ON t.id = e.tournament_id
      WHERE e.status = 'active'
        AND t.status = 'active'
        AND e.mt5_login IS NOT NULL
        AND e.metaapi_account_id LIKE 'bridge:%'
    `);

    if (!entries.length) return;

    for (const entry of entries) {
      try {
        const login = String(entry.mt5_login);
        const startBal = parseFloat(entry.starting_balance || STARTING_BALANCE);

        // Fetch account info and trades in parallel
        const [acc, openTrades, history] = await Promise.all([
          bridgeFetch(`/account?login=${login}`).catch(() => null),
          bridgeFetch(`/trades/open?login=${login}`).catch(() => []),
          bridgeFetch(`/trades/history?login=${login}&days=1`).catch(() => []),
        ]);

        if (!acc || acc.error) continue;

        const balance   = parseFloat(acc.balance || startBal);
        const equity    = parseFloat(acc.equity  || balance);
        const profitAbs = Math.round((balance - startBal) * 100) / 100;
        const profitPct = Math.round((profitAbs / startBal) * 10000) / 100;

        const closed   = Array.isArray(history) ? history : [];
        const wins     = closed.filter(t => parseFloat(t.profit) > 0).length;
        const total    = closed.length;
        const winRate  = total > 0 ? Math.round(wins / total * 100) : 0;

        // Max drawdown calculation
        let maxDD = 0, peak = startBal, running = startBal;
        const sorted = [...closed].sort((a,b) => new Date(a.close_time) - new Date(b.close_time));
        for (const t of sorted) {
          running += parseFloat(t.profit || 0);
          if (running > peak) peak = running;
          const dd = Math.round((peak - running) / peak * 10000) / 100;
          if (dd > maxDD) maxDD = dd;
        }

        await db.query(`
          UPDATE entries SET
            current_balance  = $1,
            current_equity   = $2,
            profit_abs       = $3,
            profit_pct       = $4,
            total_trades     = $5,
            winning_trades   = $6,
            max_drawdown_pct = $7
          WHERE id = $8
        `, [balance, equity, profitAbs, profitPct, total, wins, maxDD, entry.id]);

      } catch (err) {
        // Silent — individual entry errors shouldn't crash the loop
        console.warn(`[BridgeSync] Entry ${entry.id} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error("[BridgeSync] Sync loop error:", err.message);
  }
}

function startBridgeSyncCron() {
  // Run immediately on startup
  syncActiveEntries().catch(console.error);

  // Then every 30 seconds
  cron.schedule("*/30 * * * * *", () => {
    syncActiveEntries().catch(console.error);
  });

  console.log("[BridgeSync] Bridge sync cron started (30s interval)");
}

module.exports = { startBridgeSyncCron, syncActiveEntries };
