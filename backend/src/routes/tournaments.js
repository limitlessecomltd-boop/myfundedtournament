// ─── tournaments.js ───────────────────────────────────────────────────────────
const express = require("express");
const router = express.Router();
const { getAllTournaments, getTournamentById } = require("../services/tournamentService");

router.get("/", async (req, res, next) => {
  try {
    const data = await getAllTournaments(req.query.filter);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const data = await getTournamentById(req.params.id);
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
