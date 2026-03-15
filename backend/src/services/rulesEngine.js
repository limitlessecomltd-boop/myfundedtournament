const db = require("../config/db");

const MIN_TRADE_DURATION_SECONDS = 31;

/**
 * Run all rules against an entry's trades.
 * Called after every MetaApi sync.
 */
async function checkRules(entryId) {
  await checkHFT(entryId);
  await checkHedging(entryId);
}

/**
 * HFT Rule: Any closed trade with duration < 31 seconds is excluded from score.
 * The trade stays in the DB but is marked excluded = true and violation = 'hft'.
 * A violation record is created for admin visibility.
 */
async function checkHFT(entryId) {
  const { rows: hftTrades } = await db.query(`
    SELECT * FROM trades
    WHERE entry_id = $1
      AND status = 'closed'
      AND excluded = FALSE
      AND duration_seconds IS NOT NULL
      AND duration_seconds < $2
  `, [entryId, MIN_TRADE_DURATION_SECONDS]);

  for (const trade of hftTrades) {
    await db.query(
      "UPDATE trades SET excluded=TRUE, violation='hft' WHERE id=$1",
      [trade.id]
    );

    await db.query(`
      INSERT INTO violations (entry_id, type, description, evidence, status)
      VALUES ($1, 'hft', $2, $3, 'auto_resolved')
      ON CONFLICT DO NOTHING
    `, [
      entryId,
      `Trade #${trade.mt5_ticket} on ${trade.pair} was open for ${trade.duration_seconds}s (min ${MIN_TRADE_DURATION_SECONDS}s). Excluded from score.`,
      JSON.stringify({
        ticket: trade.mt5_ticket,
        pair: trade.pair,
        durationSeconds: trade.duration_seconds,
        profit: trade.profit
      })
    ]);

    console.log(`[Rules] HFT violation: entry ${entryId}, trade ${trade.mt5_ticket}, ${trade.duration_seconds}s`);
  }
}

/**
 * Hedging Rule: If a trader has both a BUY and SELL open on the same pair
 * at the same time, both trades are excluded from score.
 * Checked on open trades only.
 */
async function checkHedging(entryId) {
  // Get all currently open trades grouped by pair
  const { rows: openTrades } = await db.query(`
    SELECT pair, side, id, mt5_ticket, open_time
    FROM trades
    WHERE entry_id = $1
      AND status = 'open'
      AND excluded = FALSE
    ORDER BY pair, open_time
  `, [entryId]);

  // Group by pair
  const byPair = {};
  for (const trade of openTrades) {
    if (!byPair[trade.pair]) byPair[trade.pair] = [];
    byPair[trade.pair].push(trade);
  }

  for (const [pair, trades] of Object.entries(byPair)) {
    const hasBuy  = trades.some(t => t.side === "buy");
    const hasSell = trades.some(t => t.side === "sell");

    if (hasBuy && hasSell) {
      // Exclude all trades on this pair
      for (const trade of trades) {
        await db.query(
          "UPDATE trades SET excluded=TRUE, violation='hedge' WHERE id=$1",
          [trade.id]
        );
      }

      await db.query(`
        INSERT INTO violations (entry_id, type, description, evidence, status)
        VALUES ($1, 'hedge', $2, $3, 'auto_resolved')
      `, [
        entryId,
        `Hedging detected on ${pair}: simultaneous BUY and SELL positions. All ${pair} trades excluded.`,
        JSON.stringify({ pair, trades: trades.map(t => ({ ticket: t.mt5_ticket, side: t.side })) })
      ]);

      console.log(`[Rules] Hedge violation: entry ${entryId}, pair ${pair}`);
    }
  }
}

module.exports = { checkRules };
