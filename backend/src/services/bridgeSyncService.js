/**
 * bridgeSyncService.js — polls C# bridge every 30s, updates ALL active entries.
 * Fixes: removed metaapi_account_id filter, uses 90-day history, writes all metrics.
 */
const db   = require("../config/db");
const cron = require("node-cron");

const BRIDGE          = process.env.MT5_BRIDGE_URL || "http://38.60.196.145:5099";
const DEFAULT_BALANCE = 1000;

async function bf(path) {
  const r = await fetch(`${BRIDGE}${path}`, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`Bridge ${r.status}`);
  return r.json();
}

async function syncActiveEntries() {
  try {
    // All active entries with an mt5_login — NO metaapi_account_id filter
    const { rows: entries } = await db.query(`
      SELECT e.id, e.mt5_login, e.starting_balance
      FROM   entries e
      JOIN   tournaments t ON t.id = e.tournament_id
      WHERE  e.status = 'active'
        AND  e.mt5_login IS NOT NULL
    `);

    if (!entries.length) return;

    // One health call to know what's connected
    let connected = new Set();
    try {
      const h = await bf("/health");
      connected = new Set((h.accounts||[]).map(a => String(a.login)));
    } catch(e) { console.error("[BridgeSync] health failed:", e.message); return; }

    console.log(`[BridgeSync] syncing ${entries.length} entries, bridge has ${connected.size} accounts`);

    for (const entry of entries) {
      const login    = String(entry.mt5_login);
      const startBal = parseFloat(entry.starting_balance || DEFAULT_BALANCE);
      if (!connected.has(login)) continue;

      try {
        const [acc, open, hist] = await Promise.all([
          bf(`/account?login=${login}`).catch(()=>null),
          bf(`/trades/open?login=${login}`).catch(()=>[]),
          bf(`/trades/history?login=${login}&days=90`).catch(()=>[]),
        ]);
        if (!acc || acc.error) continue;

        const balance   = parseFloat(acc.balance || startBal);
        const equity    = parseFloat(acc.equity  || balance);
        const profitAbs = Math.round((balance - startBal) * 100) / 100;
        const profitPct = Math.round((profitAbs / startBal) * 10000) / 100;

        // Real trades only — filter out Balance/deposit rows
        const closed = (Array.isArray(hist) ? hist : [])
          .filter(t => t.symbol && t.symbol.trim() !== "" && t.type !== "Balance");
        const wins   = closed.filter(t => parseFloat(t.profit) > 0).length;
        const total  = closed.length;
        const winRate = total > 0 ? Math.round(wins/total*100) : 0;

        // Max drawdown
        let maxDD=0, peak=startBal, running=startBal;
        [...closed].sort((a,b)=>new Date(a.close_time||0)-new Date(b.close_time||0))
          .forEach(t => {
            running += parseFloat(t.profit||0);
            if (running>peak) peak=running;
            const dd = peak>0 ? Math.round((peak-running)/peak*10000)/100 : 0;
            if (dd>maxDD) maxDD=dd;
          });

        await db.query(`
          UPDATE entries SET
            starting_balance = COALESCE(starting_balance, $1),
            current_balance  = $2,
            current_equity   = $3,
            profit_abs       = $4,
            profit_pct       = $5,
            total_trades     = $6,
            winning_trades   = $7,
            max_drawdown_pct = $8
          WHERE id = $9
        `, [startBal, balance, equity, profitAbs, profitPct, total, wins, maxDD, entry.id]);

        console.log(`[BridgeSync] ${login}: $${balance} (${profitPct>0?'+':''}${profitPct}%) ${total} trades wr=${winRate}%`);

      } catch(err) { console.warn(`[BridgeSync] ${login}:`, err.message); }
    }
  } catch(err) { console.error("[BridgeSync] fatal:", err.message); }
}

function startBridgeSyncCron() {
  syncActiveEntries().catch(console.error);
  cron.schedule("*/30 * * * * *", () => syncActiveEntries().catch(console.error));
  console.log("[BridgeSync] started — all active entries every 30s");
}

module.exports = { startBridgeSyncCron, syncActiveEntries };
