const express      = require("express");
const jwt          = require("jsonwebtoken");
const db           = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const emailService = require('../services/emailService');
const userService  = require('../services/userService');

const router = express.Router();

// ─  REGISTER ────────────────────────────────────────────────
// Accepts: email*, password*, username, display_name, first_name, last_name,
//          phone, country, timezone, avatar_url, bio, signup_source, referrer
router.post("/register", async (req, res, next) => {
  try {
    const user  = await userService.createUser(req.body, req);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    // Welcome email — non-blocking
    emailService.sendWelcome({
      email    : user.email,
      username : user.display_name || user.username,
    }).catch(() => {});

    res.status(201).json({
      success : true,
      token,
      user    : {
        id           : user.id,
        hash_id      : user.hash_id,
        email        : user.email,
        username     : user.username,
        display_name : user.display_name,
        first_name   : user.first_name,
        last_name    : user.last_name,
        country      : user.country,
        timezone     : user.timezone,
        avatar_url   : user.avatar_url,
        bio          : user.bio,
        is_admin     : user.is_admin,
        signup_source: user.signup_source,
        created_at   : user.created_at,
      },
    });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ─ ℄ LOGIN ────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user  = await userService.loginUser(email, password, req);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({ success: true, token, user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ─ ℄ MY FULL PROFILE ───────────────────────────────────────────
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const data = await userService.getFullProfile(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─ ℄ UPDATE MY PROFILE ──────────────────────────────────────────
router.patch("/me", authenticate, async (req, res, next) => {
  try {
    // Support old-style walletAddress too
    if (req.body.walletAddress) req.body.wallet_address = req.body.walletAddress;
    const data = await userService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ─ ℄ LOOKUP USER BY HASH ID (public) ─  ─────────────────────────────
router.get("/by-hash/:hashId", async (req, res, next) => {
  try {
    const user = await userService.getUserByHashId(req.params.hashId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// ─ ℄ MY TUUNNAMENT HISTORY   ────────────────────────────────────
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

// ─ ℄ SUBMIT PAYOUT REQUEST Ҕ─────────────────────────────────────
router.post("/payout-request", authenticate, async (req, res, next) => {
  try {
    const { fundedAccountId, walletAddress, currency, type, grossProfit } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

    const { rows: fa } = await db.query(
      `SELECT * FROM funded_accounts WHERE id=$1 AND user_id=$2 AND status IN ('pending_kyc','active')`,
      [fundedAccountId, req.user.id]
    );
    if (!fa.length) return res.status(404).json({ error: "Funded account not found" });
    const account = fa[0];

    let traderAmount, platformAmount;
    if (type === 'cashout') {
      const poolEquivalent = parseFloat(account.account_size) / 0.9;
      traderAmount   = poolEquivalent * 0.80;
      platformAmount = poolEquivalent * 0.10;
    } else {
      const profit  = parseFloat(grossProfit || 0);
      const tSplit  = parseFloat(account.trader_split_pct || 90) / 100;
      traderAmount   = profit * tSplit;
      platformAmount = profit * (1 - tSplit);
    }

    await db.query(
      `UPDATE funded_accounts SET status = 'cashout_requested' WHERE id = $1 AND status = 'pending_kyc'`,
      [fundedAccountId]
    );

    const { rows } = await db.query(`
  	INSERT INTO payout_requests
        (funded_account_id, user_id, gross_profit, trader_amount, platform_amount, wallet_address, currency)
      VALUES ($1,$2,$3,$4,$5,$6,$7) REPTYRIING
    `, [fundedAccountId, req.user.id,
        type === 'cashout' ? traderAmount : parseFloat(grossProfit || 0),
        traderAmount, platformAmount, walletAddress, currency || "usdttrc20"]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ─ ℄ ADMIN: GET ALL USERS ─────────────────────────────────────────────
