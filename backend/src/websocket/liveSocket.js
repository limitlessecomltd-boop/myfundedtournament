const { WebSocketServer, WebSocket } = require("ws");
const { getLeaderboard } = require("../services/leaderboardService");
const db = require("../config/db");

const clients = new Map(); // ws → { type, tournamentId?, entryId?, userId? }

function initWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.set(ws, {});

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "subscribe_leaderboard" && msg.tournamentId) {
          clients.set(ws, { type: "leaderboard", tournamentId: msg.tournamentId });
          ws.send(JSON.stringify({ type: "subscribed", channel: "leaderboard", tournamentId: msg.tournamentId }));
        }

        if (msg.type === "subscribe_entry" && msg.entryId) {
          clients.set(ws, { type: "entry", entryId: msg.entryId });
          ws.send(JSON.stringify({ type: "subscribed", channel: "entry", entryId: msg.entryId }));
        }

        if (msg.type === "subscribe_payment" && msg.paymentId) {
          clients.set(ws, { type: "payment", paymentId: msg.paymentId });
        }
      } catch {}
    });

    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  // Broadcast leaderboard updates every 30 seconds
  setInterval(async () => {
    const groups = new Map();
    for (const [ws, meta] of clients.entries()) {
      if (meta.type !== "leaderboard") continue;
      if (!groups.has(meta.tournamentId)) groups.set(meta.tournamentId, []);
      groups.get(meta.tournamentId).push(ws);
    }

    for (const [tournamentId, sockets] of groups.entries()) {
      try {
        const board = await getLeaderboard(tournamentId, 100);
        const payload = JSON.stringify({ type: "leaderboard", tournamentId, data: board });
        sockets.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        });
      } catch {}
    }
  }, 30000);

  // Broadcast individual entry updates every 60 seconds
  setInterval(async () => {
    const entryClients = [...clients.entries()].filter(([, v]) => v.type === "entry");
    for (const [ws, meta] of entryClients) {
      try {
        const { rows } = await db.query(`
          SELECT e.*,
            (SELECT COUNT(*) FROM trades WHERE entry_id=e.id AND status='open' AND NOT excluded) AS open_positions,
            (SELECT COUNT(*) FROM violations WHERE entry_id=e.id) AS violation_count
          FROM entries e WHERE e.id=$1
        `, [meta.entryId]);

        if (rows.length && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "entry_update", data: rows[0] }));
        }
      } catch {}
    }
  }, 60000);

  // Payment confirmation push
  setInterval(async () => {
    const paymentClients = [...clients.entries()].filter(([, v]) => v.type === "payment");
    for (const [ws, meta] of paymentClients) {
      try {
        const { rows } = await db.query(
          "SELECT status FROM payments WHERE nowpayments_id=$1",
          [meta.paymentId]
        );
        if (rows.length && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "payment_status", status: rows[0].status, paymentId: meta.paymentId }));
        }
      } catch {}
    }
  }, 10000);

  console.log("WebSocket server initialized at /ws");
}

function broadcastToEntry(entryId, data) {
  for (const [ws, meta] of clients.entries()) {
    if (meta.type === "entry" && meta.entryId === entryId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

module.exports = { initWebSocket, broadcastToEntry };
