const express = require("express");
const router  = express.Router();
const { authenticate } = require("../middleware/auth");
const { createGuildBattle, getMyGuildBattles } = require("../services/tournamentService");
const db = require("../config/db");

// Generate URL-safe slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

// POST /api/guild — create a new guild battle
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { name, entryFee, maxEntries, winnerPct } = req.body;
    const baseSlug = generateSlug(name);
    
    // Ensure slug is unique
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 10) {
      const { rows } = await db.query("SELECT id FROM tournaments WHERE slug=$1", [slug]);
      if (!rows.length) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const battle = await createGuildBattle(req.user.id, { name, entryFee, maxEntries, winnerPct, slug });
    
    // Update total_hosted for organiser
    await db.query(
      "UPDATE users SET total_hosted = COALESCE(total_hosted, 0) + 1 WHERE id = $1",
      [req.user.id]
    );

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

// GET /api/guild — all public guild battles (safe: handles missing columns)
router.get("/", async (req, res, next) => {
  try {
    // Check if guild columns exist first
    const colCheck = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='tournaments' AND column_name='tier_type'"
    );
    if (!colCheck.rows.length) {
      // Columns not migrated yet — return empty array gracefully
      return res.json({ success: true, data: [], migrationRequired: true });
    }
    
    const { rows } = await db.query(`
      SELECT t.*,
        COALESCE(u.display_name, u.username, split_part(u.email,'@',1)) AS organiser_username,
        COALESCE(u.total_hosted, 0) AS organiser_total_hosted,
        u.bio AS organiser_bio,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS active_entries,
        COUNT(DISTINCT e.user_id) AS unique_traders
      FROM tournaments t
      LEFT JOIN users u ON u.id = t.organiser_id
      LEFT JOIN entries e ON e.tournament_id = t.id
      WHERE t.tier_type = 'guild' AND t.is_public = true
        AND t.status IN ('registration','active')
      GROUP BY t.id, u.display_name, u.username, u.email, u.total_hosted, u.bio
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// GET /api/guild/slug/:slug — get by slug (custom link)
router.get("/slug/:slug", async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*,
        COALESCE(u.display_name, u.username, split_part(u.email,'@',1)) AS organiser_username,
        COALESCE(u.total_hosted, 0) AS organiser_total_hosted,
        u.bio AS organiser_bio,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS active_entries,
        COUNT(DISTINCT e.user_id) AS unique_traders
      FROM tournaments t
      LEFT JOIN users u ON u.id = t.organiser_id
      LEFT JOIN entries e ON e.tournament_id = t.id
      WHERE t.slug = $1
      GROUP BY t.id, u.display_name, u.username, u.email, u.total_hosted, u.bio
    `, [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: "Battle not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/guild/:id — single guild battle by ID
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*,
        COALESCE(u.display_name, u.username, split_part(u.email,'@',1)) AS organiser_username,
        COALESCE(u.total_hosted, 0) AS organiser_total_hosted,
        u.bio AS organiser_bio,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status != 'pending_payment') AS active_entries,
        COUNT(DISTINCT e.user_id) AS unique_traders
      FROM tournaments t
      LEFT JOIN users u ON u.id = t.organiser_id
      LEFT JOIN entries e ON e.tournament_id = t.id
      WHERE t.id = $1
      GROUP BY t.id, u.display_name, u.username, u.email, u.total_hosted, u.bio
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
