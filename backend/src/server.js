require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { initWebSocket } = require("./websocket/liveSocket");
const { startSyncCron } = require("./services/metaApiService");
const { startTournamentCron } = require("./services/tournamentService");

const tournamentRoutes = require("./routes/tournaments");
const entryRoutes      = require("./routes/entries");
const paymentRoutes    = require("./routes/payments");
const leaderboardRoutes = require("./routes/leaderboard");
const userRoutes       = require("./routes/users");
const adminRoutes      = require("./routes/admin");
const guildRoutes      = require("./routes/guild");
const errorHandler     = require("./middleware/errorHandler");

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
startSyncCron();
startTournamentCron();

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`MyFundedTournament API on port ${PORT}`));
module.exports = app;
