// ─── leaderboard.js ──────────────────────────────────────────────────────────
const express = require("express");
const lbRouter = express.Router();
const { getLeaderboard, getUserTournamentEntries } = require("../services/leaderboardService");
const { authenticate } = require("../middleware/auth");

lbRouter.get("/:tournamentId", async (req, res, next) => {
  try {
    const data = await getLeaderboard(req.params.tournamentId, parseInt(req.query.limit) || 100);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

lbRouter.get("/:tournamentId/me", authenticate, async (req, res, next) => {
  try {
    const data = await getUserTournamentEntries(req.user.id, req.params.tournamentId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = lbRouter;
