const express = require("express");
const emailService = require('../services/emailService');
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");

// Register
router.post("/register", async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(`
      INSERT INTO users (email, username, password_hash)
      VALUES (LOWER($1), $2, $3) RETURNING id, email, username, created_at
    `, [email, username, hash]);

    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    // Send welcome email (non-blocking)
    emailService.sendWelcome({ email: rows[0].email, username: rows[0].username }).catch(() => {});
    res.status(201).json({ success: true, token, user: rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    next(err);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query("SELECT * FROM users WHERE email=LOWER($1)", [email]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { password_hash, ...user } = rows[0];
    res.json({ success: true, token, user });
  } catch (err) { next(err); }
});

// My profile
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.email, u.username, u.is_admin, u.wallet_address, u.created_at,
        COUNT(DISTINCT e.id) AS total_entries,
        COUNT(DISTINCT e.tournament_id) AS total_tournaments,
        COUNT(DISTINCT t.id) FILTER (WHERE t.winner_entry_id = e.id) AS wins
      FROM users u
      LEFT JOIN entries e ON e.user_id = u.id
      LEFT JOIN tournaments t ON t.id = e.tournament_id
      WHERE u.id=$1
      GROUP BY u.id
    `, [req.user.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// Update profile
router.patch("/me", authenticate, async (req, res, next) => {
  try {
    const { username, walletAddress, wallet_address } = req.body;
    const finalWalletAddress = walletAddress || wallet_address;
    const { rows } = await db.query(`
      UPDATE users SET
        username       = COALESCE($1, username),
        wallet_address = COALESCE($2, wallet_address)
      WHERE id=$3 RETURNING id, email, username, wallet_address
    `, [username, finalWalletAddress, req.user.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// My tournament history
router.get("/me/tournaments", authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT DISTINCT ON (t.id)
        t.id, t.name, t.tier, t.entry_fee, t.prize_pool, t.status, t.start_time, t.end_time,
        MAX(e.profit_pct) AS best_profit_pct,
        MAX(e.profit_abs) AS best_profit_abs,
        COUNT(e.id) AS entry_count,
        BOOL_OR(t.winner_entry_id = e.id) AS is_winner
      FROM tournaments t
      JOIN entries e ON e.tournament_id = t.id AND e.user_id=$1
      GROUP BY t.id
      ORDER BY t.id, t.start_time DESC
    `, [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// Submit payout request
router.post("/payout-request", authenticate, async (req, res, next) => {
  try {
    const { fundedAccountId, walletAddress, currency, type, grossProfit } = req.body;

    if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

    // Accept pending_kyc (cashout choice) or active accounts
    const { rows: fa } = await db.query(
      `SELECT * FROM funded_accounts WHERE id=$1 AND user_id=$2 AND status IN ('pending_kyc','active')`,
      [fundedAccountId, req.user.id]
    );
    if (!fa.length) return res.status(404).json({ error: "Funded account not found" });
    const account = fa[0];

    // For cashout type: trader gets 75% of prize pool
    // For profit withdrawal from active account: trader gets their split
    let traderAmount, platformAmount;
    if (type === 'cashout') {
      // account_size is the 90% of pool — 80% cashout = account_size * (80/90)
      const poolEquivalent = parseFloat(account.account_size) / 0.9;
      traderAmount   = poolEquivalent * 0.80;
      platformAmount = poolEquivalent * 0.10; // platform keeps difference
    } else {
      const profit  = parseFloat(grossProfit || 0);
      const tSplit  = parseFloat(account.trader_split_pct || 90) / 100;
      traderAmount   = profit * tSplit;
      platformAmount = profit * (1 - tSplit);
    }

    // Mark funded account as cashout_requested to prevent duplicate claims
    await db.query(
      `UPDATE funded_accounts SET status = 'cashout_requested' WHERE id = $1 AND status = 'pending_kyc'`,
      [fundedAccountId]
    );

    const { rows } = await db.query(`
      INSERT INTO payout_requests
        (funded_account_id, user_id, gross_profit, trader_amount, platform_amount, wallet_address, currency)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [fundedAccountId, req.user.id,
        type === 'cashout' ? traderAmount : parseFloat(grossProfit || 0),
        traderAmount, platformAmount, walletAddress, currency || "usdttrc20"]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
