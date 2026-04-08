require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { initWebSocket } = require("./websocket/liveSocket");
const db = require("./config/db");

// Auto-migrate: add ForumPay columns if not present
db.query(`
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_crypto VARCHAR(50);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_no  VARCHAR(200);
`).then(() => console.log('[DB] ForumPay columns ready'))
  .catch(e => console.warn('[DB] Migration note:', e.message));

// Add missing enum values
db.query(`ALTER TYPE entry_status ADD VALUE IF NOT EXISTS 'cancelled'`)
  .then(() => console.log('[DB] entry_status cancelled value ready'))
  .catch(e => console.warn('[DB] entry_status migration:', e.message));
// MetaApi sync replaced by C# bridge — bridge polls every 30s automatically
const { startTournamentCron } = require("./services/tournamentService");

const tournamentRoutes = require("./routes/tournaments");
const entryRoutes      = require("./routes/entries");
const paymentRoutes    = require("./routes/payments");
const leaderboardRoutes = require("./routes/leaderboard");
const userRoutes       = require("./routes/users");
const adminRoutes      = require("./routes/admin");
const guildRoutes      = require("./routes/guild");
const errorHandler     = require("./middleware/errorHandler");
const { startBridgeSyncCron } = require("./services/bridgeSyncService");

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

app.use("/api/tournaments",  tournamentRoutes);
app.use("/api/entries",      entryRoutes);
app.use("/api/payments",     paymentRoutes);
app.use("/api/leaderboard",  leaderboardRoutes);
app.use("/api/users",        userRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/guild",         guildRoutes);

app.get("/health", (req, res) => res.json({
  status: "ok",
  ts: new Date(),
  backendUrl: process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://myfundedtournament-production.up.railway.app",
}));
app.use(errorHandler);

initWebSocket(httpServer);
startBridgeSyncCron();
startTournamentCron();

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`MyFundedTournament API on port ${PORT}`));
module.exports = app;
