const db     = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ── Hash ID ───────────────────────────────────────────────────────────────────
function generateHashId(userId, email, createdAt) {
  const salt   = process.env.HASH_ID_SALT || 'mft-2025-salt';
  const epoch  = new Date(createdAt).getTime();
  const source = `${userId}:${email.toLowerCase()}:${epoch}:${salt}`;
  return crypto.createHash('sha256').update(source).digest('hex');
}

// ── UA parser ─────────────────────────────────────────────────────────────────
function parseUserAgent(ua = '') {
  const s = ua.toLowerCase();
  const device_type = /mobile|android|iphone|ipad/.test(s)
    ? (/ipad/.test(s) ? 'tablet' : 'mobile') : 'desktop';
  const browser =
    s.includes('firefox') ? 'Firefox' :
    s.includes('edg/')    ? 'Edge'    :
    s.includes('chrome')  ? 'Chrome'  :
    s.includes('safari')  ? 'Safari'  : 'Unknown';
  const os =
    s.includes('windows') ? 'Windows' :
    s.includes('mac os')  ? 'macOS'   :
    s.includes('android') ? 'Android' :
    s.includes('iphone') || s.includes('ipad') ? 'iOS' :
    s.includes('linux')   ? 'Linux'   : 'Unknown';
  return { device_type, browser, os };
}

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

// ── Create user ───────────────────────────────────────────────────────────────
async function createUser(payload, req) {
  const {
    email, password, username, display_name, first_name, last_name,
    phone, country, timezone, avatar_url, bio, signup_source, referrer,
  } = payload;

  if (!email || !password) throw Object.assign(new Error('Email and password required'), { status: 400 });

  const password_hash = await bcrypt.hash(password, 12);
  const ip_address    = getIp(req);
  const ua            = req.headers['user-agent'] || '';
  const { device_type, browser, os } = parseUserAgent(ua);
  const http_referrer = referrer || req.headers['referer'] || req.headers['referrer'] || null;
  const source        = signup_source || 'organic';

  // Insert — only use columns guaranteed to exist on base schema
  const { rows } = await db.query(`
    INSERT INTO users (email, username, password_hash)
    VALUES (LOWER($1), $2, $3)
    RETURNING id, email, username, is_admin, created_at
  `, [email, username || null, password_hash]);

  const user = rows[0];
  const hash_id = generateHashId(user.id, user.email, user.created_at);

  // Try to update extended fields if columns exist (migration may not have run)
  try {
    await db.query(`
      UPDATE users SET
        hash_id         = $1,
        display_name    = $2,
        first_name      = $3,
        last_name       = $4,
        phone           = $5,
        country         = $6,
        timezone        = $7,
        avatar_url      = $8,
        bio             = $9,
        signup_ip       = $10,
        signup_user_agent = $11,
        signup_referrer = $12,
        signup_source   = $13,
        is_verified     = FALSE,
        login_count     = 0,
        updated_at      = NOW()
      WHERE id = $14
    `, [
      hash_id,
      display_name || username || null,
      first_name   || null,
      last_name    || null,
      phone        || null,
      country      || null,
      timezone     || null,
      avatar_url   || null,
      bio          || null,
      ip_address, ua, http_referrer, source,
      user.id
    ]);
  } catch (_) { /* columns not yet migrated — ignore */ }

  user.hash_id = hash_id;

  // Log signup event (non-fatal)
  try {
    await db.query(`
      INSERT INTO user_signup_events
        (user_id, hash_id, email, username, ip_address, user_agent,
         referrer, source, country, timezone, device_type, browser, os, raw_headers)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [
      user.id, hash_id, user.email, user.username,
      ip_address, ua, http_referrer, source,
      country || null, timezone || null, device_type, browser, os,
      JSON.stringify({ 'user-agent': ua, origin: req.headers['origin'] || null }),
    ]);
  } catch (_) { /* table may not exist yet */ }

  return user;
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function loginUser(email, password, req) {
  const ip_address = getIp(req);
  const ua         = req.headers['user-agent'] || '';

  const { rows } = await db.query('SELECT * FROM users WHERE email = LOWER($1)', [email]);

  if (!rows.length) {
    await logLoginEvent(null, null, ip_address, ua, false, 'user_not_found');
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const user = rows[0];

  if (user.is_banned) {
    await logLoginEvent(user.id, user.hash_id || null, ip_address, ua, false, 'account_banned');
    throw Object.assign(new Error('Account suspended'), { status: 403 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await logLoginEvent(user.id, user.hash_id || null, ip_address, ua, false, 'wrong_password');
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  // Update login stats — wrapped so it never breaks login if columns missing
  try {
    await db.query(`
      UPDATE users
      SET last_login_at = NOW(),
          last_login_ip = $1,
          login_count   = COALESCE(login_count, 0) + 1,
          updated_at    = NOW()
      WHERE id = $2
    `, [ip_address, user.id]);
  } catch (_) { /* columns not yet migrated */ }

  await logLoginEvent(user.id, user.hash_id || null, ip_address, ua, true, null);

  const { password_hash, ...safeUser } = user;
  return safeUser;
}

async function logLoginEvent(userId, hashId, ip, ua, success, failReason) {
  try {
    await db.query(`
      INSERT INTO user_login_events (user_id, hash_id, ip_address, user_agent, success, fail_reason)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [userId || null, hashId || null, ip, ua, success, failReason || null]);
  } catch (_) { /* table may not exist yet */ }
}

// ── Get full profile ──────────────────────────────────────────────────────────
async function getFullProfile(userId) {
  const { rows } = await db.query(`
    SELECT
      u.id, u.email, u.username, u.is_admin, u.wallet_address, u.created_at,
      COUNT(DISTINCT e.id)                                          AS total_entries,
      COUNT(DISTINCT e.tournament_id)                               AS total_tournaments,
      COUNT(DISTINCT t.id) FILTER (WHERE t.winner_entry_id = e.id) AS wins
    FROM users u
    LEFT JOIN entries e    ON e.user_id = u.id
    LEFT JOIN tournaments t ON t.id = e.tournament_id
    WHERE u.id = $1
    GROUP BY u.id
  `, [userId]);
  return rows[0] || null;
}

// ── Update profile ────────────────────────────────────────────────────────────
async function updateProfile(userId, fields) {
  const allowed = ['username', 'wallet_address'];
  // Add extended fields if they might exist
  const extended = ['display_name','first_name','last_name','phone','country','timezone','avatar_url','bio'];
  const updates = [], values = [];
  let idx = 1;
  for (const key of [...allowed, ...extended]) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${idx++}`);
      values.push(fields[key]);
    }
  }
  if (!updates.length) throw Object.assign(new Error('No valid fields to update'), { status: 400 });
  values.push(userId);
  const { rows } = await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, username, wallet_address`,
    values
  );
  return rows[0];
}

// ── Lookup by hash ID ─────────────────────────────────────────────────────────
async function getUserByHashId(hashId) {
  const { rows } = await db.query(
    `SELECT id, email, username, is_admin, created_at FROM users WHERE hash_id = $1`,
    [hashId]
  );
  return rows[0] || null;
}

module.exports = {
  createUser, loginUser, getFullProfile, updateProfile,
  getUserByHashId, generateHashId, parseUserAgent,
};
