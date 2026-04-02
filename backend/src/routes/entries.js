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
    const result = await createEntry(
      req.user.id, tournamentId,
      mt5Login, mt5Password, mt5Server, broker
    );
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
    const { rows: entries } = await db.query(
      "SELECT * FROM entries WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
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

module.exports = router;
