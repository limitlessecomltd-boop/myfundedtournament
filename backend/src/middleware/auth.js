const jwt = require("jsonwebtoken");
const db  = require("../config/db");

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token required" });
  }
  try {
    const payload = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const { rows } = await db.query("SELECT id, is_admin FROM users WHERE id=$1", [payload.id]);
    if (!rows.length) return res.status(401).json({ error: "User not found" });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: "Admin access required" });
  next();
}

module.exports = { authenticate, requireAdmin };
