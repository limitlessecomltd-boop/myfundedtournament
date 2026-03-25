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


// POST /api/entries/verify-mt5 — verify MT5 credentials before payment
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

    const fetch = require('node-fetch');
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

module.exports = router;
