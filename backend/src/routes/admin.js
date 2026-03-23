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

router.delete("/tournaments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM entries WHERE tournament_id=$1", [id]);
    await db.query("DELETE FROM tournaments WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/admin/test-email — send a test email to verify Resend is working
router.post('/test-email', authenticate, isAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    const recipient = to || req.user.email;

    const result = await email.sendPaymentConfirmed({
      email:          recipient,
      username:       'Admin Test',
      tournamentName: 'Test Battle',
      entryFee:       25,
      tournamentId:   'test-123',
    });

    if (result.skipped) {
      return res.json({ success: false, message: 'RESEND_API_KEY not set — email skipped' });
    }
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, message: `Test email sent to ${recipient}`, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get("/users", async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    let where = "WHERE 1=1";
    const vals = [];
    if (search) {
      vals.push(`%${search}%`);
      where += ` AND (u.email ILIKE $${vals.length} OR u.username ILIKE $${vals.length})`;
    }
    const { rows } = await db.query(`
      SELECT u.*,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS total_entries,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_entries,
        COUNT(DISTINCT fa.id) AS funded_accounts,
        COALESCE(SUM(p.amount_usd) FILTER (WHERE p.status='confirmed'), 0) AS total_spent,
        MAX(e.created_at) AS last_entry_at
      FROM users u
      LEFT JOIN entries e ON e.user_id = u.id
      LEFT JOIN funded_accounts fa ON fa.user_id = u.id
      LEFT JOIN payments p ON p.user_id = u.id
      ${where}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${vals.length+1} OFFSET $${vals.length+2}
    `, [...vals, limit, offset]);

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM users u ${where}`, vals
    );
    res.json({ success: true, data: rows, total: parseInt(countRows[0].count) });
  } catch (err) { next(err); }
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const { is_admin, is_banned, username } = req.body;
    const sets = []; const vals = [req.params.id];
    if (is_admin !== undefined) { vals.push(is_admin); sets.push(`is_admin=$${vals.length}`); }
    if (is_banned !== undefined) { vals.push(is_banned); sets.push(`is_banned=$${vals.length}`); }
    if (username !== undefined) { vals.push(username); sets.push(`username=$${vals.length}`); }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(",")} WHERE id=$1 RETURNING *`, vals
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ─── PAYMENTS (admin) ────────────────────────────────────────────────────────
router.get("/payments", async (req, res, next) => {
  try {
    const { status, limit = 100 } = req.query;
    let where = status ? "WHERE p.status=$1" : "WHERE 1=1";
    const vals = status ? [status] : [];
    const { rows } = await db.query(`
      SELECT p.*,
        u.email, u.username,
        t.name AS tournament_name, t.tier,
        e.entry_number
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN entries e ON e.id = p.entry_id
      LEFT JOIN tournaments t ON t.id = p.tournament_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${vals.length+1}
    `, [...vals, limit]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.patch("/payments/:id/confirm", async (req, res, next) => {
  try {
    // Manually confirm a payment
    await db.query(
      `UPDATE payments SET status='confirmed', confirmed_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    // Also activate the associated entry
    const { rows } = await db.query(
      `SELECT entry_id FROM payments WHERE id=$1`, [req.params.id]
    );
    if (rows[0]?.entry_id) {
      await db.query(
        `UPDATE entries SET status='active' WHERE id=$1 AND status='pending_payment'`,
        [rows[0].entry_id]
      );
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── FINANCE ────────────────────────────────────────────────────────────────
router.get("/finance", async (req, res, next) => {
  try {
    const [revenue, daily, byTier, topTraders, recentWinners] = await Promise.all([
      // Total revenue breakdown
      db.query(`
        SELECT
          COALESCE(SUM(amount_usd) FILTER (WHERE status='confirmed'), 0) AS confirmed_revenue,
          COALESCE(SUM(amount_usd) FILTER (WHERE status='waiting'), 0) AS pending_revenue,
          COUNT(*) FILTER (WHERE status='confirmed') AS confirmed_count,
          COUNT(*) FILTER (WHERE status='waiting') AS pending_count,
          COUNT(*) FILTER (WHERE status='expired') AS expired_count
        FROM payments
      `),
      // Daily revenue last 14 days
      db.query(`
        SELECT DATE(confirmed_at) AS day, COALESCE(SUM(amount_usd),0) AS revenue, COUNT(*) AS entries
        FROM payments
        WHERE status='confirmed' AND confirmed_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(confirmed_at)
        ORDER BY day ASC
      `),
      // Revenue by tier
      db.query(`
        SELECT t.tier, COALESCE(SUM(p.amount_usd),0) AS revenue, COUNT(p.id) AS entries
        FROM payments p
        JOIN entries e ON e.id = p.entry_id
        JOIN tournaments t ON t.id = e.tournament_id
        WHERE p.status='confirmed'
        GROUP BY t.tier
      `),
      // Top spenders
      db.query(`
        SELECT u.email, u.username,
          COALESCE(SUM(p.amount_usd),0) AS total_spent,
          COUNT(p.id) AS entry_count
        FROM users u
        JOIN payments p ON p.user_id = u.id
        WHERE p.status='confirmed'
        GROUP BY u.id, u.email, u.username
        ORDER BY total_spent DESC LIMIT 10
      `),
      // Recent winners
      db.query(`
        SELECT fa.*, u.email, u.username, t.name AS tournament_name, e.profit_pct
        FROM funded_accounts fa
        JOIN users u ON u.id = fa.user_id
        JOIN tournaments t ON t.id = fa.tournament_id
        JOIN entries e ON e.id = fa.entry_id
        ORDER BY fa.created_at DESC LIMIT 10
      `),
    ]);
    res.json({
      success: true,
      data: {
        revenue: revenue.rows[0],
        daily: daily.rows,
        byTier: byTier.rows,
        topTraders: topTraders.rows,
        recentWinners: recentWinners.rows,
      }
    });
  } catch (err) { next(err); }
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────
// In-memory settings (persist via DB in future)
let platformSettings = {
  autoLoop: true,
  maintenanceMode: false,
  announcementBanner: "",
  announcementActive: false,
  platformFeePercent: 10,
  minEntryFee: 1,
  maxEntryFee: 10000,
};

router.get("/settings", async (req, res) => {
  res.json({ success: true, data: platformSettings });
});

router.patch("/settings", async (req, res) => {
  platformSettings = { ...platformSettings, ...req.body };
  res.json({ success: true, data: platformSettings });
});

// ─── GUILD BATTLES (admin view) ───────────────────────────────────────────────
router.get("/guild", async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*,
        COALESCE(u.username, split_part(u.email,'@',1)) AS organiser_username,
        u.email AS organiser_email,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS active_entries,
        COUNT(DISTINCT e.user_id) AS unique_traders,
        COALESCE(SUM(p.amount_usd) FILTER (WHERE p.status='confirmed'), 0) AS pool_collected
      FROM tournaments t
      LEFT JOIN users u ON u.id = t.organiser_id
      LEFT JOIN entries e ON e.tournament_id = t.id
      LEFT JOIN payments p ON p.tournament_id = t.id
      WHERE t.tier_type = 'guild'
      GROUP BY t.id, u.username, u.email
      ORDER BY t.created_at DESC
    `).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ─── ACTIVITY FEED ────────────────────────────────────────────────────────────
router.get("/activity", async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      (SELECT 'entry' AS type, e.created_at AS ts,
        u.username AS actor, t.name AS context,
        e.status AS detail, e.id AS ref_id
       FROM entries e
       JOIN users u ON u.id = e.user_id
       JOIN tournaments t ON t.id = e.tournament_id
       ORDER BY e.created_at DESC LIMIT 10)
      UNION ALL
      (SELECT 'payment' AS type, p.created_at AS ts,
        u.username AS actor, t.name AS context,
        p.status AS detail, p.id::text AS ref_id
       FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN tournaments t ON t.id = p.tournament_id
       ORDER BY p.created_at DESC LIMIT 10)
      UNION ALL
      (SELECT 'winner' AS type, fa.created_at AS ts,
        u.username AS actor, t.name AS context,
        fa.status AS detail, fa.id AS ref_id
       FROM funded_accounts fa
       JOIN users u ON u.id = fa.user_id
       JOIN tournaments t ON t.id = fa.tournament_id
       ORDER BY fa.created_at DESC LIMIT 5)
      ORDER BY ts DESC LIMIT 20
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ─── RENAME TOURNAMENT ────────────────────────────────────────────────────────
router.patch("/tournaments/:id/rename", async (req, res, next) => {
  try {
    const { name } = req.body;
    const { rows } = await db.query(
      `UPDATE tournaments SET name=$1 WHERE id=$2 RETURNING *`,
      [name, req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ─── FORCE START / END ────────────────────────────────────────────────────────
router.post("/tournaments/:id/force-start", async (req, res, next) => {
  try {
    const now = new Date();
    const end = new Date(now.getTime() + 90 * 60 * 1000);
    await db.query(
      `UPDATE tournaments SET status='active', start_time=$1, end_time=$2 WHERE id=$3`,
      [now.toISOString(), end.toISOString(), req.params.id]
    );
    res.json({ success: true, message: "Battle force-started" });
  } catch (err) { next(err); }
});

router.post("/tournaments/:id/force-end", async (req, res, next) => {
  try {
    await db.query(
      `UPDATE tournaments SET status='ended', end_time=NOW() WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true, message: "Battle force-ended" });
  } catch (err) { next(err); }
});
