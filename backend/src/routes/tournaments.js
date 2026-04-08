// ─── tournaments.js ───────────────────────────────────────────────────────────
const express = require("express");
const router = express.Router();
const { getAllTournaments, getTournamentById } = require("../services/tournamentService");
const db = require('../config/db');

router.get("/", async (req, res, next) => {
  try {
    const data = await getAllTournaments(req.query.filter);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const data = await getTournamentById(req.params.id);
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;

// ── GET /api/tournaments/:id/certificates ──────────────────────────────────

router.get('/:id/certificates', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get tournament details
    const { rows: tours } = await db.query(
      `SELECT t.*, u.username AS organiser_username
       FROM tournaments t
       LEFT JOIN users u ON u.id = t.organiser_id
       WHERE t.id = $1`, [id]
    );
    if (!tours.length) return res.status(404).json({ error: 'Tournament not found' });
    const t = tours[0];

    // Tournament must be ended to have certificates
    if (t.status !== 'ended') {
      return res.json({ success: true, data: [], tournament: t, message: 'Tournament has not ended yet' });
    }

    // Get top-3 finishers (completed or breached entries, ranked by profit_pct)
    const { rows: top3 } = await db.query(`
      SELECT
        e.id, e.profit_pct, e.profit_abs, e.total_trades, e.winning_trades,
        e.broker, e.mt5_login, e.starting_balance,
        u.username, u.email,
        RANK() OVER (ORDER BY e.profit_pct DESC) AS position,
        ROUND(
          CASE WHEN e.total_trades > 0
            THEN (e.winning_trades::numeric / e.total_trades) * 100
            ELSE 0
          END
        ) AS win_rate
      FROM entries e
      JOIN users u ON u.id = e.user_id
      WHERE e.tournament_id = $1
        AND e.status IN ('completed', 'active', 'breached', 'disqualified')
      ORDER BY e.profit_pct DESC
      LIMIT 1
    `, [id]);

    const pool    = parseFloat(t.prize_pool || 0);
    const wPct    = parseFloat(t.winner_pct || 90);
    const entryFee = parseFloat(t.entry_fee || 0);

    const prizes = [
      pool > 0 ? pool * (wPct / 100) : 0,                    // 1st: % of prize pool
    ];
    const prizeDescs = [
      pool > 0 ? `Funded Account · ${wPct}% of $${pool.toFixed(0)} prize pool` : 'Funded Account',
    ];

    const issueDate = t.end_time
      ? new Date(t.end_time).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
      : new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

    const certificates = top3.map((e, i) => {
      const pos = parseInt(e.position);
      const suffix = '1ST';
      // Short cert ID from tournament + entry
      const certId = `MFT-${issueDate.replace(/ /g,'-').toUpperCase()}-${suffix}-${e.id.slice(0,6).toUpperCase()}`;
      return {
        id:             e.id,
        place:          pos,
        tournamentName: t.name,
        winnerName:     e.username,
        walletId:       `${e.broker || 'MT5'}:${String(e.mt5_login || '').slice(-4).padStart(8,'*')}`,
        profitPct:      parseFloat(parseFloat(e.profit_pct).toFixed(2)),
        profitAbs:      parseFloat(parseFloat(e.profit_abs || 0).toFixed(2)),
        winRate:        parseInt(e.win_rate || 0),
        totalTrades:    parseInt(e.total_trades || 0),
        prizeAmount:    prizes[i] || 0,
        prizeDesc:      prizeDescs[i] || '',
        issueDate,
        certId,
        broker:         e.broker || 'MT5',
      };
    });

    res.json({ success: true, data: certificates, tournament: { id: t.id, name: t.name, status: t.status, tier: t.tier, end_time: t.end_time, prize_pool: t.prize_pool } });
  } catch (err) { next(err); }
});
