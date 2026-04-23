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

// Add hard_closed_at column for server-side 87-min position close tracking
db.query(`ALTER TABLE entries ADD COLUMN IF NOT EXISTS hard_closed_at TIMESTAMPTZ`)
  .then(() => console.log('[DB] hard_closed_at column ready'))
  .catch(e => console.warn('[DB] hard_closed_at migration:', e.message));

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

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "https://myfundedtournament.vercel.app",
  "https://www.myfundedtournament.com",
  "https://myfundedtournament.com",
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

app.use("/api/tournaments",  tournamentRoutes);
app.use("/api/entries",      entryRoutes);
app.use("/api/payments",     paymentRoutes);
app.use("/api/leaderboard",  leaderboardRoutes);
app.use("/api/users",        userRoutes);
app.use("/api/admin",        adminRoutes);

// Standalone migration endpoint — no auth middleware, uses secret
app.post("/api/migrate", async (req, res) => {
  try {
    const { secret } = req.body || {};
    if (secret !== (process.env.DEPLOY_SECRET || "mft_deploy_secret_2024")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const db = require("./config/db");
    const sqls = [
      `CREATE TABLE IF NOT EXISTS organiser_rebates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organiser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        prize_pool NUMERIC(12,2) NOT NULL DEFAULT 0,
        entry_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
        rebate_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
        rebate_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        tier_label TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS organiser_monthly_bonuses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organiser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        prize_volume NUMERIC(14,2) NOT NULL DEFAULT 0,
        tier_label TEXT NOT NULL DEFAULT '',
        bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        paid_at TIMESTAMPTZ,
        UNIQUE (organiser_id, period_start)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_rebates_organiser ON organiser_rebates(organiser_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rebates_tournament ON organiser_rebates(tournament_id)`,
      `CREATE INDEX IF NOT EXISTS idx_monthly_bonus_org ON organiser_monthly_bonuses(organiser_id)`,
    ];
    for (const sql of sqls) await db.query(sql);
    res.json({ success: true, tables: ["organiser_rebates", "organiser_monthly_bonuses"] });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
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
