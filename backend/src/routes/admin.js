const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { createTournament } = require("../services/tournamentService");
const db = require("../config/db");

router.use(authenticate, requireAdmin);

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
router.get("/dashboard", async (req, res, next) => {
  try {
    const [tournaments, revenue, payouts, violations, funded] = await Promise.all([
      db.query("SELECT status, COUNT(*) FROM tournaments GROUP BY status"),
      db.query("SELECT COALESCE(SUM(amount_usd),0) AS total FROM payments WHERE status='confirmed'"),
      db.query("SELECT status, COUNT(*) FROM payout_requests GROUP BY status"),
      db.query("SELECT status, COUNT(*) FROM violations GROUP BY status"),
      db.query("SELECT status, COUNT(*) FROM funded_accounts GROUP BY status"),
    ]);

    res.json({
      success: true,
      data: {
        tournaments: tournaments.rows,
        totalRevenue: revenue.rows[0].total,
        payouts: payouts.rows,
        violations: violations.rows,
        fundedAccounts: funded.rows,
      }
    });
  } catch (err) { next(err); }
});

// ─── TOURNAMENTS ─────────────────────────────────────────────────────────────
router.get("/tournaments", async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status='active') AS active_entries,
        COUNT(DISTINCT e.id) AS total_entries
      FROM tournaments t
      LEFT JOIN entries e ON e.tournament_id = t.id
      GROUP BY t.id ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post("/tournaments", async (req, res, next) => {
  try {
    const tournament = await createTournament(req.body);
    res.status(201).json({ success: true, data: tournament });
  } catch (err) { next(err); }
});

router.patch("/tournaments/:id", async (req, res, next) => {
  try {
    const allowed = ["name","status","entry_fee","start_time","end_time","registration_open"];
    const sets = allowed
      .filter(k => req.body[k] !== undefined)
      .map((k, i) => `${k}=$${i + 2}`)
      .join(", ");
    const vals = allowed.filter(k => req.body[k] !== undefined).map(k => req.body[k]);

    const { rows } = await db.query(
      `UPDATE tournaments SET ${sets} WHERE id=$1 RETURNING *`,
      [req.params.id, ...vals]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ─── PAYOUTS ─────────────────────────────────────────────────────────────────
router.get("/payouts", async (req, res, next) => {
  try {
    const status = req.query.status || "pending";
    const { rows } = await db.query(`
      SELECT pr.*, u.email, u.username,
        fa.account_size, fa.broker_name,
        t.name AS tournament_name
      FROM payout_requests pr
      JOIN users u ON u.id = pr.user_id
      JOIN funded_accounts fa ON fa.id = pr.funded_account_id
      JOIN tournaments t ON t.id = fa.tournament_id
      WHERE pr.status=$1
      ORDER BY pr.created_at DESC
    `, [status]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.patch("/payouts/:id", async (req, res, next) => {
  try {
    const { status, txHash, notes } = req.body;
    const { rows } = await db.query(`
      UPDATE payout_requests SET
        status=$1, tx_hash=$2, notes=$3,
        processed_by=$4, processed_at=NOW()
      WHERE id=$5 RETURNING *
    `, [status, txHash, notes, req.user.id, req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ─── FUNDED ACCOUNTS ─────────────────────────────────────────────────────────
router.get("/funded-accounts", async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT fa.*, u.email, u.username,
        t.name AS tournament_name, t.prize_pool,
        e.profit_pct AS winning_profit_pct
      FROM funded_accounts fa
      JOIN users u ON u.id = fa.user_id
      JOIN tournaments t ON t.id = fa.tournament_id
      JOIN entries e ON e.id = fa.entry_id
      ORDER BY fa.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.patch("/funded-accounts/:id", async (req, res, next) => {
  try {
    const { status, brokerAccount, brokerName, notes } = req.body;
    const { rows } = await db.query(`
      UPDATE funded_accounts SET
        status=$1, broker_account=$2, broker_name=$3, notes=$4,
        kyc_verified_at = CASE WHEN $1='kyc_done' THEN NOW() ELSE kyc_verified_at END,
        funded_at = CASE WHEN $1='funded' THEN NOW() ELSE funded_at END
      WHERE id=$5 RETURNING *
    `, [status, brokerAccount, brokerName, notes, req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ─── VIOLATIONS ──────────────────────────────────────────────────────────────
router.get("/violations", async (req, res, next) => {
  try {
    const status = req.query.status || "pending_review";
    const { rows } = await db.query(`
      SELECT v.*, u.email, u.username,
        e.mt5_login, e.entry_number, t.name AS tournament_name
      FROM violations v
      JOIN entries e ON e.id = v.entry_id
      JOIN users u ON u.id = e.user_id
      JOIN tournaments t ON t.id = e.tournament_id
      WHERE v.status=$1
      ORDER BY v.created_at DESC
    `, [status]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.patch("/violations/:id", async (req, res, next) => {
  try {
    const { status } = req.body;

    const { rows } = await db.query(`
      UPDATE violations SET
        status=$1, reviewed_by=$2, reviewed_at=NOW()
      WHERE id=$3 RETURNING *
    `, [status, req.user.id, req.params.id]);

    // If disqualified, update the entry too
    if (status === "disqualified") {
      await db.query(
        "UPDATE entries SET status='disqualified' WHERE id=$1",
        [rows[0].entry_id]
      );
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ─── ENTRIES (admin view) ─────────────────────────────────────────────────────
router.get("/entries", async (req, res, next) => {
  try {
    const { tournamentId, userId } = req.query;
    let where = "WHERE 1=1";
    const vals = [];
    if (tournamentId) { vals.push(tournamentId); where += ` AND e.tournament_id=$${vals.length}`; }
    if (userId) { vals.push(userId); where += ` AND e.user_id=$${vals.length}`; }

    const { rows } = await db.query(`
      SELECT e.*, u.email, u.username, t.name AS tournament_name
      FROM entries e
      JOIN users u ON u.id = e.user_id
      JOIN tournaments t ON t.id = e.tournament_id
      ${where}
      ORDER BY e.created_at DESC
      LIMIT 200
    `, vals);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
