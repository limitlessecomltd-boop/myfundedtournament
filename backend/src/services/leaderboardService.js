const db = require("../config/db");

/**
 * Full leaderboard for a tournament.
 * Ranked by profit_pct (% gain) — primary metric.
 * All entries shown separately, grouped info available via user profile.
 */
async function getLeaderboard(tournamentId, limit = 100) {
  const { rows } = await db.query(`
    SELECT
      e.id,
      e.user_id,
      e.entry_number,
      e.broker,
      e.mt5_login,
      e.profit_pct,
      e.profit_abs,
      e.total_trades,
      e.winning_trades,
      e.excluded_trades,
      e.max_drawdown_pct,
      e.starting_balance,
      e.current_balance,
      e.current_equity,
      e.status,
      u.username,
      RANK() OVER (ORDER BY e.profit_pct DESC) AS position
    FROM entries e
    JOIN users u ON u.id = e.user_id
    WHERE e.tournament_id = $1
      AND e.status IN ('active','completed')
    ORDER BY e.profit_pct DESC
    LIMIT $2
  `, [tournamentId, limit]);

  return rows.map(r => ({
    ...r,
    win_rate: r.total_trades > 0
      ? Math.round((r.winning_trades / r.total_trades) * 100)
      : 0,
    display_name: r.username
      || `Trader #${r.entry_number}`
  }));
}

/**
 * Get all entries for one user in one tournament (for profile grouping).
 */
async function getUserTournamentEntries(userId, tournamentId) {
  const { rows } = await db.query(`
    SELECT e.*,
      RANK() OVER (ORDER BY e.profit_pct DESC) AS position
    FROM entries e
    WHERE e.tournament_id=$1
      AND e.user_id=$2
    ORDER BY e.entry_number
  `, [tournamentId, userId]);
  return rows;
}

module.exports = { getLeaderboard, getUserTournamentEntries };
