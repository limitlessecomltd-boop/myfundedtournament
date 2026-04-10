const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { getAllTournaments, getTournamentById, finalizeOneTournament, finalizeDueTournaments } = require('../services/tournamentService');
const db = require("../config/db");
const email = require("../services/emailService");

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


// POST /api/admin/run-migration — run the full DB migration
router.post('/run-migration', async (req, res) => {
  const steps = [];
  const run = async (label, sql) => {
    try {
      await db.query(sql);
      steps.push({ ok: true, label });
    } catch(err) {
      steps.push({ ok: false, label, error: err.message });
    }
  };

  await run('Add guild to tier enum',         `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='guild' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='tournament_tier')) THEN ALTER TYPE tournament_tier ADD VALUE 'guild'; END IF; END $$`);
  await run('Add tier_type to tournaments',            `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tier_type VARCHAR(20) DEFAULT 'standard'`);
  await run('Add organiser_id to tournaments',         `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS organiser_id UUID REFERENCES users(id)`);
  await run('Add winner_pct to tournaments',           `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_pct NUMERIC(5,2) DEFAULT 90.00`);
  await run('Add organiser_pct to tournaments',        `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS organiser_pct NUMERIC(5,2) DEFAULT 0.00`);
  await run('Add platform_pct to tournaments',         `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS platform_pct NUMERIC(5,2) DEFAULT 10.00`);
  await run('Add is_public to tournaments',            `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE`);
  await run('Add organiser_paid to tournaments',       `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS organiser_paid BOOLEAN DEFAULT FALSE`);
  await run('Add organiser_payout_amount to tournaments', `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS organiser_payout_amount NUMERIC(12,2)`);
  await run('Add slug to tournaments',                 `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS slug VARCHAR(120) UNIQUE`);
  await run('Add display_name to users',               `ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(80)`);
  await run('Add bio to users',                        `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(300)`);
  await run('Add total_hosted to users',               `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_hosted INTEGER DEFAULT 0`);
  await run('Add is_banned to users',                  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE`);
  await run('Create slug index',                       `CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON tournaments(slug)`);
  await run('Create tier_type index',                  `CREATE INDEX IF NOT EXISTS idx_tournaments_tier_type ON tournaments(tier_type)`);
  await run('Create organiser index',                  `CREATE INDEX IF NOT EXISTS idx_tournaments_organiser ON tournaments(organiser_id)`);
  await run('Fix ugly tournament names',               `UPDATE tournaments SET name = REGEXP_REPLACE(name, ' #\\d{10,}$', '') WHERE name ~ ' #\\d{10,}$'`);

  const failed = steps.filter(s => !s.ok);
  const ok     = steps.filter(s => s.ok);
  console.log(`[Migration] ${ok.length} ok, ${failed.length} failed`);
  res.json({ success: failed.length === 0, steps, ok: ok.length, failed: failed.length });
});

// POST /api/admin/entries/:id/connect-metaapi — manually trigger MetaApi connection
router.post('/entries/:id/connect-metaapi', async (req, res) => {
  try {
    const { id } = req.params;
    const { mt5Login, mt5Password, mt5Server, broker } = req.body;

    // Update entry credentials if provided
    if (mt5Login || mt5Password || mt5Server || broker) {
      const sets = [];
      const vals = [id];
      if (mt5Login)    { vals.push(mt5Login);    sets.push(`mt5_login=$${vals.length}`); }
      if (mt5Password) { vals.push(mt5Password);  sets.push(`mt5_password=$${vals.length}`); }
      if (mt5Server)   { vals.push(mt5Server);    sets.push(`mt5_server=$${vals.length}`); }
      if (broker)      { vals.push(broker);       sets.push(`broker=$${vals.length}`); }
      if (sets.length) {
        await db.query(`UPDATE entries SET ${sets.join(',')} WHERE id=$1`, vals);
      }
    }

    // Trigger Bridge connection async
    const { activateEntryMetaApi } = require('../services/entryService');
    res.json({ success: true, message: 'Bridge connection triggered — check back in 15s' });

    // Run async after response
    activateEntryMetaApi(id).then(() => {
      console.log(`[Admin] Bridge manually connected for entry ${id}`);
    }).catch(err => {
      console.error(`[Admin] Bridge manual connect failed for entry ${id}:`, err.message);
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/resend-entry-email — resend payment confirmed email for a specific entry
router.post('/resend-entry-email', async (req, res, next) => {
  try {
    const { entryId } = req.body;
    if (!entryId) return res.status(400).json({ error: 'entryId required' });

    const { rows } = await db.query(`
      SELECT u.email, u.username, t.name AS tournament_name, t.entry_fee, t.id AS tournament_id, e.status
      FROM entries e
      JOIN users u ON u.id = e.user_id
      JOIN tournaments t ON t.id = e.tournament_id
      WHERE e.id = $1
    `, [entryId]);

    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });
    const info = rows[0];

    const { sendPaymentConfirmed } = require('../services/emailService');
    const result = await sendPaymentConfirmed({
      email: info.email,
      username: info.username,
      tournamentName: info.tournament_name,
      entryFee: parseFloat(info.entry_fee),
      tournamentId: info.tournament_id
    });

    if (result?.skipped) return res.json({ success: false, message: 'RESEND_API_KEY not set' });
    res.json({ success: true, message: `Payment confirmed email resent to ${info.email}`, id: result?.id });
  } catch (err) { next(err); }
});


router.post('/bridge-deploy', async (req, res) => {
  try {
    const DEPLOY_URL = 'http://38.60.196.145:9090/deploy';
    const DEPLOY_SECRET = 'mft_deploy_secret_2024';
    const r = await fetch(DEPLOY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: DEPLOY_SECRET })
    });
    const d = await r.json();
    res.json({ success: true, bridge: d });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/bridge-deploy/status — check deploy progress
router.get('/bridge-deploy/status', async (req, res) => {
  try {
    const r = await fetch('http://38.60.196.145:9090/deploy/status');
    const d = await r.json();
    res.json(d);
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
      // Full activation: connect bridge, stamp starting_balance
      activateEntryMetaApi(rows[0].entry_id).catch(e => console.warn('[Admin confirm]', e.message));
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
      SELECT * FROM (
        (SELECT 'entry' AS type, e.created_at AS ts,
          u.username AS actor, t.name AS context,
          e.status AS detail, e.id::text AS ref_id,
          CONCAT(u.username, ' joined ', t.name) AS description
         FROM entries e
         JOIN users u ON u.id = e.user_id
         JOIN tournaments t ON t.id = e.tournament_id
         ORDER BY e.created_at DESC LIMIT 8)
        UNION ALL
        (SELECT 'payment' AS type, p.created_at AS ts,
          u.username AS actor, t.name AS context,
          p.status AS detail, p.id::text AS ref_id,
          CONCAT(u.username, ' payment ', p.status, ' $', p.amount_usd) AS description
         FROM payments p
         LEFT JOIN users u ON u.id = p.user_id
         LEFT JOIN tournaments t ON t.id = p.tournament_id
         ORDER BY p.created_at DESC LIMIT 8)
        UNION ALL
        (SELECT 'winner' AS type, fa.created_at AS ts,
          u.username AS actor, t.name AS context,
          fa.status AS detail, fa.id::text AS ref_id,
          CONCAT(u.username, ' won ', t.name) AS description
         FROM funded_accounts fa
         JOIN users u ON u.id = fa.user_id
         JOIN tournaments t ON t.id = fa.tournament_id
         ORDER BY fa.created_at DESC LIMIT 5)
      ) combined
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
    // Full finalization: sync balances, determine winner, create funded account, send emails
    const result = await finalizeOneTournament(req.params.id);
    res.json({ success: true, message: "Battle finalized", result });
  } catch (err) { next(err); }
});

// Also expose a /finalize-all for cron recovery
router.post("/finalize-all", async (req, res, next) => {
  try {
    await finalizeDueTournaments();
    res.json({ success: true, message: 'Finalization run complete' });
  } catch (err) { next(err); }
});

// Test email — sends one of each template to verify Resend config
router.post("/test-email", async (req, res, next) => {
  try {
    const { to, type = 'winner' } = req.body;
    if (!to) return res.status(400).json({ error: 'to email required' });

    let result;
    if (type === 'payment') {
      result = await email.sendPaymentConfirmed({ email:to, username:to.split('@')[0], tournamentName:'Pro Bullet', entryFee:50, tournamentId:'test' });
    } else if (type === 'starting') {
      result = await email.sendBattleStarting({ email:to, username:to.split('@')[0], tournamentName:'Pro Bullet', tournamentId:'test', endTime: new Date(Date.now()+90*60000) });
    } else if (type === 'results') {
      // Use real winner data from DB if available, otherwise fallback to demo
      let winnerName = 'Champion', winnerPct = 14.2, tournamentName = 'Pro Bullet';
      try {
        const { rows } = await db.query(`
          SELECT u.username, e.profit_pct, t.name
          FROM tournaments t
          JOIN entries e ON e.id = t.winner_entry_id
          JOIN users u ON u.id = e.user_id
          WHERE t.status = 'ended' AND t.winner_entry_id IS NOT NULL
          ORDER BY t.end_time DESC LIMIT 1
        `);
        if (rows.length) { winnerName = rows[0].username; winnerPct = parseFloat(rows[0].profit_pct); tournamentName = rows[0].name; }
      } catch(_) {}
      result = await email.sendBattleResults({
        email: to, username: to.split('@')[0], tournamentName,
        position: 2, profitPct: -1.23,
        winnerName, winnerPct, tournamentId: 'test'
      });
    } else if (type === 'welcome') {
      result = await email.sendWelcome({ email:to, username:to.split('@')[0] });
    } else {
      // Default: winner notification
      result = await email.sendWinnerNotification({ email:to, username:to.split('@')[0], tournamentName:'Pro Bullet', profitPct:14.2, prizeAmount:562.50, tournamentId:'test' });
    }

    if (result?.skipped) return res.json({ success: false, message: 'RESEND_API_KEY not set — email skipped' });
    res.json({ success: true, message: `Test email (${type}) sent to ${to}`, id: result?.id });
  } catch (err) { next(err); }
});

// Recovery: create funded_account for a tournament winner if missing
router.post("/tournaments/:id/create-prize", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: t } = await db.query(`SELECT * FROM tournaments WHERE id=$1 AND status='ended' AND winner_entry_id IS NOT NULL`, [id]);
    if (!t.length) return res.status(404).json({ error: 'Tournament not ended or no winner' });
    const tour = t[0];
    const { rows: e } = await db.query(`SELECT e.*, u.username, u.email FROM entries e JOIN users u ON u.id=e.user_id WHERE e.id=$1`, [tour.winner_entry_id]);
    if (!e.length) return res.status(404).json({ error: 'Winner entry not found' });
    const winner = e[0];
    const pool = parseFloat(tour.prize_pool || 0);
    const wPct = parseFloat(tour.winner_pct || 90);
    const fundedSize = pool > 0 ? pool * (wPct / 100) : 0;
    const { rows: fa } = await db.query(`
      INSERT INTO funded_accounts (entry_id, user_id, tournament_id, account_size, status)
      VALUES ($1, $2, $3, $4, 'pending_kyc')
      ON CONFLICT DO NOTHING RETURNING *
    `, [winner.id, winner.user_id, id, fundedSize]);
    res.json({ success: true, created: fa.length > 0, fundedSize, winner: winner.username });
  } catch (err) { next(err); }
});
