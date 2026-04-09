const db = require('../config/db');
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { createEntry, getUserEntries } = require("../services/entryService");
const db = require("../config/db");

// Create new entry / re-entry
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { tournamentId, mt5Login, mt5Password, mt5Server, broker } = req.body;
    if (!tournamentId || !mt5Login || !mt5Password || !mt5Server || !broker) {
      return res.status(400).json({ error: "All MT5 fields are required" });
    }
    const rawForwarded = req.headers['x-forwarded-for'] || '';
    const payerIp = rawForwarded.split(',').map(s=>s.trim()).find(ip => !ip.startsWith('10.') && !ip.startsWith('172.') && !ip.startsWith('192.168.') && ip !== '127.0.0.1') || rawForwarded.split(',')[0].trim() || req.ip || '8.8.8.8';
    console.log('[Entry] payerIp resolved:', payerIp, 'from x-forwarded-for:', rawForwarded, 'req.ip:', req.ip);
    const result = await createEntry(
      req.user.id, tournamentId,
      mt5Login, mt5Password, mt5Server, broker, payerIp
    );
    // Notify guild organiser when someone joins their battle
    try {
      if (result?.entry?.tournament_id) {
        const { rows: tour } = await db.query(
          `SELECT t.*, u.email AS org_email, u.username AS org_username,
            COUNT(e.id) FILTER (WHERE e.status != 'pending_payment') AS joined_count
           FROM tournaments t
           LEFT JOIN users u ON u.id = t.organiser_id
           LEFT JOIN entries e ON e.tournament_id = t.id
           WHERE t.id = $1 AND t.tier = 'guild' AND t.organiser_id IS NOT NULL
           GROUP BY t.id, u.email, u.username`,
          [result.entry.tournament_id]
        );
        if (tour.length && tour[0].org_email) {
          const { sendOrganiserJoinNotification } = require('../services/emailService');
          sendOrganiserJoinNotification({
            email: tour[0].org_email, username: tour[0].org_username,
            tournamentName: tour[0].name,
            joinedCount: parseInt(tour[0].joined_count),
            maxCount: tour[0].max_entries,
            tournamentId: tour[0].id,
          }).catch(() => {});
        }
      }
    } catch(_) {}
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Get my entries for a tournament
router.get("/my/:tournamentId", authenticate, async (req, res, next) => {
  try {
    const data = await getUserEntries(req.user.id, req.params.tournamentId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Get entry details including trades
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const { rows: entries } = await db.query(`
      SELECT e.*,
             t.name        AS tournament_name,
             t.start_time  AS tournament_start,
             t.end_time    AS tournament_end,
             t.status      AS tournament_status,
             t.tier        AS tournament_tier,
             t.prize_pool  AS tournament_prize_pool
      FROM   entries e
      JOIN   tournaments t ON t.id = e.tournament_id
      WHERE  e.id=$1 AND e.user_id=$2
    `, [req.params.id, req.user.id]);
    if (!entries.length) return res.status(404).json({ error: "Not found" });

    const { rows: trades } = await db.query(`
      SELECT * FROM trades
      WHERE entry_id=$1
      ORDER BY open_time DESC
      LIMIT 200
    `, [req.params.id]);

    const { rows: violations } = await db.query(
      "SELECT * FROM violations WHERE entry_id=$1 ORDER BY created_at DESC",
      [req.params.id]
    );

    res.json({ success: true, data: { entry: entries[0], trades, violations } });
  } catch (err) { next(err); }
});


router.post('/verify-mt5', async (req, res) => {
  try {
    const mt5_login = req.body.mt5_login || req.body.mt5Login;
    const mt5_password = req.body.mt5_password || req.body.mt5Password;
    const mt5_server = req.body.mt5_server || req.body.mt5Server || '';
    if (!mt5_login || !mt5_password) return res.status(400).json({ valid: false, error: 'Login and password required', received: Object.keys(req.body) });
    const BRIDGE = process.env.MT5_BRIDGE_URL || 'http://38.60.196.145:5099';
    const SECRET = process.env.BRIDGE_SECRET || 'mft_bridge_secret_2024';
    const r = await fetch(BRIDGE + '/verify-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: String(mt5_login), password: mt5_password, server: mt5_server || '', secret: SECRET })
    });
    const d = await r.json();
    return res.json(d);
  } catch (e) {
    console.error('[verify-mt5]', e.message);
    return res.status(500).json({ valid: false, error: 'Bridge connection failed: ' + e.message });
  }
});


router.post('/verify-mt5', authenticate, async (req, res) => {
  try {
    const { mt5Login, mt5Password, mt5Server } = req.body;
    if (!mt5Login || !mt5Password || !mt5Server) {
      return res.status(400).json({ error: 'All MT5 fields required' });
    }

    const bridgeUrl    = process.env.BRIDGE_URL;
    const bridgeSecret = process.env.BRIDGE_SECRET;

    if (!bridgeUrl || !bridgeSecret) {
      return res.status(503).json({ error: 'Verification service unavailable' });
    }

    const r = await fetch(`${bridgeUrl}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Secret': bridgeSecret
      },
      body: JSON.stringify({
        mt5_login:    mt5Login,
        mt5_password: mt5Password,
        mt5_server:   mt5Server
      }),
      timeout: 15000
    });

    const data = await r.json();
    return res.json(data);

  } catch (err) {
    console.error('[Verify MT5]', err.message);
    return res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});


// Resolve broker server name to IP
router.post('/resolve-server', (req, res) => {
  const { server } = req.body;
  if (!server) return res.status(400).json({ error: 'server required' });
  const map = {
    'Exness-MT5Trial': '47.91.105.29',
    'Exness-MT5Real8': '196.191.218.8',
    'Exness-MT5Real7': '196.191.218.7',
    'Exness-MT5Real6': '196.191.218.6',
    'Exness-MT5Real5': '196.191.218.5',
    'Exness-MT5Real4': '196.191.218.4',
    'Exness-MT5Real3': '196.191.218.3',
    'Exness-MT5Real2': '196.191.218.2',
    'Exness-MT5Real': '196.191.218.1',
  };
  for (const [key, ip] of Object.entries(map)) {
    if (server.toLowerCase().startsWith(key.toLowerCase())) return res.json({ ip: ip.split(':')[0], server });
  }
  // Try DNS resolve as fallback
  require('dns').lookup(server, (err, address) => {
    if (!err && address) return res.json({ ip: address.split(':')[0], server });
    res.json({ ip: null, error: 'Unknown server - check spelling', server });
  });
});


// Get live MT5 data for an entry from C# bridge
router.get('/:id/mt5', async (req, res) => {
  try {
    const { id } = req.params;
    // Get entry to find mt5_login
    const { rows } = await db.query(
      `SELECT mt5_login, mt5_password, starting_balance, status FROM entries WHERE id = $1`,
      [id]
    );
    const entry = rows[0];
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (!entry.mt5_login) return res.status(404).json({ error: 'No MT5 account linked' });

    const BRIDGE = process.env.MT5_BRIDGE_URL || 'http://38.60.196.145:5099';
    const login = String(entry.mt5_login);
    const startBal = entry.starting_balance || 1000;

    // Fetch account + trades in parallel
    const [accRes, tradesRes, histRes] = await Promise.all([
      fetch(BRIDGE + '/account?login=' + login).then(r => r.json()).catch(() => null),
      fetch(BRIDGE + '/trades/open?login=' + login).then(r => r.json()).catch(() => []),
      fetch(BRIDGE + '/trades/history?login=' + login + '&days=90').then(r => r.json()).catch(() => [])
    ]);

    if (!accRes || accRes.error) return res.status(503).json({ error: 'Account not connected to bridge' });

    const balance = accRes.balance || startBal;
    const equity = accRes.equity || balance;
    const profit = accRes.profit || 0;
    const profitAbs = Math.round((balance - startBal) * 100) / 100;
    const profitPct = Math.round((profitAbs / startBal) * 10000) / 100;

    // Calculate win rate from history
    // Real trades only — strip Balance/deposit/credit rows
    const isTrade = t => t.symbol && t.symbol.trim() !== "" &&
                         !["balance","deposit","credit","withdrawal"].includes((t.type||"").toLowerCase());
    const closed = (Array.isArray(histRes) ? histRes : []).filter(isTrade);
    const wins = closed.filter(t => parseFloat(t.profit) > 0).length;
    const losses = closed.filter(t => parseFloat(t.profit) <= 0).length;
    const winRate = closed.length > 0 ? Math.round(wins / closed.length * 100) : 0;

    // Max drawdown
    let maxDD = 0;
    let peak = startBal;
    const sorted = [...closed].sort((a,b) => new Date(a.close_time) - new Date(b.close_time));
    let running = startBal;
    for(const t of sorted) {
      running += t.profit;
      if(running > peak) peak = running;
      const dd = Math.round((peak - running) / peak * 10000) / 100;
      if(dd > maxDD) maxDD = dd;
    }

    // Write live stats back to DB so leaderboard + profile stay current
    db.query(`
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
    `, [startBal, balance, equity, profitAbs, profitPct, closed.length, wins, maxDD, id]).catch(()=>{});

    res.json({
      login: accRes.login,
      balance,
      equity,
      profit,
      profit_abs: profitAbs,
      profit_pct: profitPct,
      starting_balance: startBal,
      open_trades: Array.isArray(tradesRes) ? tradesRes : [],
      trade_history: closed,
      total_trades: closed.length + (Array.isArray(tradesRes) ? tradesRes.length : 0),
      wins,
      losses,
      win_rate: winRate,
      max_drawdown: maxDD,
      currency: accRes.currency || 'USD',
      source: 'csharp_bridge'
    });
  } catch (e) {
    console.error('[mt5 route]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Force-close all open trades via bridge (called by frontend at tournament end)
router.post('/:id/close-all', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT e.mt5_login, e.mt5_password, e.status, t.end_time
       FROM entries e JOIN tournaments t ON t.id=e.tournament_id
       WHERE e.id=$1 AND e.user_id=$2`,
      [id, req.user.id]
    );
    const entry = rows[0];
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (!entry.mt5_login) return res.status(400).json({ error: 'No MT5 account' });

    const BRIDGE = process.env.MT5_BRIDGE_URL || 'http://38.60.196.145:5099';
    const r = await fetch(`${BRIDGE}/close-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: String(entry.mt5_login), secret: process.env.BRIDGE_SECRET || 'mft_bridge_secret_2024' }),
      signal: AbortSignal.timeout(15000)
    });
    const result = await r.json();
    console.log('[close-all] entry', id, 'result:', result);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('[close-all]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
