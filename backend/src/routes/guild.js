const express = require("express");
const router  = express.Router();
const { authenticate } = require("../middleware/auth");
const { createGuildBattle, getMyGuildBattles } = require("../services/tournamentService");
const db = require("../config/db");

// POST /api/guild — create a new guild battle
router.post("/", authenticate, async (req, res, next) => {
  try {
    const battle = await createGuildBattle(req.user.id, req.body);
    res.status(201).json({ success: true, data: battle });
  } catch (err) { next(err); }
});

// GET /api/guild/mine — get my guild battles as organiser
router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const battles = await getMyGuildBattles(req.user.id);
    res.json({ success: true, data: battles });
  } catch (err) { next(err); }
});

// GET /api/guild — all public guild battles
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*,
        u.username AS organiser_username,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS active_entries,
        COUNT(DISTINCT e.user_id) AS unique_traders
      FROM tournaments t
      LEFT JOIN users u ON u.id = t.organiser_id
      LEFT JOIN entries e ON e.tournament_id = t.id
      WHERE t.tier_type = 'guild' AND t.is_public = true
        AND t.status IN ('registration','active')
      GROUP BY t.id, u.username
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// GET /api/guild/:id — single guild battle details
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*, u.username AS organiser_username,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS active_entries,
        COUNT(DISTINCT e.user_id) AS unique_traders
      FROM tournaments t
      LEFT JOIN users u ON u.id = t.organiser_id
      LEFT JOIN entries e ON e.tournament_id = t.id
      WHERE t.id = $1
      GROUP BY t.id, u.username
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
