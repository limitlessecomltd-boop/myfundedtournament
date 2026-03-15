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

module.exports = router;
