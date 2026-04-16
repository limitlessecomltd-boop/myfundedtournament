/**
 * userService.js â Full user storage, hash ID generation, and event logging
 *
 * Responsibilities:
 *  - Generate a deterministic hash_id for each user
 *  - Store the complete signup payload (all fields + metadata)
 *  - Log signup events and login events to audit tables
 *  - Expose helpers for profile update and lookup
 */

const db     = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// âââ HASH ID ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

/**
 * Generates a deterministic, public-safe SHA-256 hash ID for a user.
 * Uses: userId + email + created_at epoch (+ secret salt if set).
 * Always the same for the same user â safe to expose in URLs / leaderboards.
 */
function generateHashId(userId, email, createdAt) {
  const salt   = process.env.HASH_ID_SALT || 'mft-2025-salt';
  const epoch  = new Date(createdAt).getTime();
  const source = `${userId}:${email.toLowerCase()}:${epoch}:${salt}`;
  return crypto.createHash('sha256').update(source).digest('hex');
}

// âââ DEVICE / BROWSER PARSING âââââââââââââââââââââââââââââââââââââââââââââââ

/**
 * Lightweight UA parser â no dependency needed.
 * Returns { device_type, browser, os }
 */
function parseUserAgent(ua = '') {
  const s = ua.toLowerCase();
  const device_type = /mobile|android|iphone|ipad/.test(s)
    ? (/ipad/.test(s) ? 'tablet' : 'mobile')
    : 'desktop';

  const browser =
    s.includes('firefox')  ? 'Firefox'  :
    s.includes('edg/')      ? 'Edge'     :
    s.includes('chrome')    ? 'Chrome'   :
    s.includes('safari')    ? 'Safari'   :
    s.includes('opera')     ? 'Opera'    : 'Unknown';

  const os =
    s.includes('windows')   ? 'Windows'  :
    s.includes('mac os')     ? 'macOS'    :
    s.includes('android')   ? 'Android'  :
    s.includes('iphone') || s.includes('ipad') ? 'iOS' :
    s.includes('linux')     ? 'Linux'    : 'Unknown';

  return { device_type, browser, os };
}

// âââ GET REAL IP âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// âââ CREATE USER (full signup storage) âââââââââââââââââââââââââââââââââââââââ

/**
 * Creates a new user with ALL data captured from signup.
 * Stores everything â IP, UA, referrer, source, country, timezone, names, etc.
 * Also writes a signup event log row.
 */
async function createUser(payload, req) {
  const {
    email, password, username, display_name, first_name, last_name,
    phone, country, timezone, avatar_url, bio, signup_source, referrer,
  } = payload;

  if (!email || !password) throw Object.assign(new Error('Email and password required'), { status: 400 });

  const password_hash  = await bcrypt.hash(password, 12);
  const ip_address     = getIp(req);
  const ua             = req.headers['user-agent'] || '';
  const { device_type, browser, os } = parseUserAgent(ua);
  const http_referrer  = referrer || req.headers['referer'] || req.headers['referrer'] || null;
  const source         = signup_source || 'organic';

  const { rows } = await db.query(`
    INSERT INTO users (
      email, username, password_hash,
      display_name, first_name, last_name,
      phone, country, timezone, avatar_url, bio,
      signup_ip, signup_user_agent, signup_referrer, signup_source,
      is_verified, login_count, updated_at
    ) VALUES (
      LOWER($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, FALSE, 0, NOW()
    )
    RETURNING id, email, username, display_name, first_name, last_name,
              phone, country, timezone, avatar_url, bio,
              signup_ip, signup_source, is_admin, created_at
  `, [
    email, username || null, password_hash,
    display_name || username || null, first_name || null, last_name || null,
    phone || null, country || null, timezone || null, avatar_url || null, bio || null,
    ip_address, ua, http_referrer, source
  ]);

  const user = rows[0];

  // Generate & store hash_id
  const hash_id = generateHashId(user.id, user.email, user.created_at);
  await db.query(`UPDATE users SET hash_id = $1 WHERE id = $2`, [hash_id, user.id]);
  user.hash_id = hash_id;

  // Log signup event
  await db.query(`
    INSERT INTO user_signup_events (
      user_id, hash_id, email, username,
      ip_address, user_agent, referrer, source,
      country, timezone, device_type, browser, os, raw_headers
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
  `, [
    user.id, hash_id, user.email, user.username,
    ip_address, ua, http_referrer, source,
    country || null, timezone || null, device_type, browser, os,
    JSON.stringify({
      'user-agent': ua,
      'accept-language': req.headers['accept-language'] || null,
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'origin': req.headers['origin'] || null,
      'referer': http_referrer,
    })
  ]).catch(err => console.error('[signup event]', err.message));

  return user;
}

// âââ LOGIN ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function loginUser(email, password, req) {
  const ip_address = getIp(req);
  const ua = req.headers['user-agent'] || '';

  const { rows } = await db.query('SELECT * FROM users WHERE email = LOWER($1)', [email]);

  if (!rows.length) {
    await logLoginEvent(null, null, ip_address, ua, false, 'user_not_found');
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const user = rows[0];

  if (user.is_banned) {
    await logLoginEvent(user.id, user.hash_id, ip_address, ua, false, 'account_banned');
    throw Object.assign(new Error('Account suspended'), { status: 403 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await logLoginEvent(user.id, user.hash_id, ip_address, ua, false, 'wrong_password');
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  await db.query(`
    UPDATE users SET
      last_login_at = NOW(),
      last_login_ip = $1,
      login_count   = COALESCE.login_count, 0) + 1,
      updated_at    = NOW()
    WHERE id = $2
  `, [ip_address, user.id]);

  await logLoginEvent(user.id, user.hash_id, ip_address, ua, true, null);

  const { password_hash, ...safeUser } = user;
  return safeUser;
}

async function logLoginEvent(userId, hashId, ip, ua, success, failReason) {
  try {
    await db.query(`
      INSERT INTO user_login_events (user_id, hash_id, ip_address, user_agent, success, fail_reason)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId || null, hashId || null, ip, ua, success, failReason || null]);
  } catch (err) {
    console.error('[login event]', err.message);
  }
}

async function getFullProfile(userId) {
  const { rows } = await db.query(`
    SELECT
      u.id, u.hash_id, u.email, u.username, u.display_name,
      u.first_name, u.last_name, u.phone, u.country, u.timezone,
      u.avatar_url, u.bio, u.wallet_address,
      u.is_admin, u.is_verified, u.is_banned,
      u.signup_ip, u.signup_source, u.signup_referrer,
      u.last_login_at, u.last_login_ip, u.login_count,
      u.total_deposited, u.total_won,
      u.created_at, u.updated_at,
      COUNT(DISTINCT e.id) AS total_entries,
      COUNT(DISTINCT e.tournament_id) AS total_tournaments,
      COUNT(DISTINCT t.id) FILTER (WHERE t.winner_entry_id = e.id) AS wins,
      COALESCE(MAX(e.profit_pct), 0) AS best_profit_pct
    FROM users u
    LEFT JOIN entries e ON e.user_id = u.id
    LEFT JOIN tournaments t ON t.id = e.tournament_id
    WHERE u.id = $1
    GROUP BY u.id
  `, [userId]);
  return rows[0] || null;
}

async function updateProfile(userId, fields) {
  const allowed = [
    'username', 'display_name', 'first_name', 'last_name',
    'phone', 'country', 'timezone', 'avatar_url', 'bio', 'wallet_address'
  ];
  const updates = [], values = [];
  let idx = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) { updates.push(`${key} = $${idx++}`); values.push(fields[key]); }
  }
  if (!updates.length) throw Object.assign(new Error('No valid fields'), { status: 400 });
  updates.push('updated_at = NOW()');
  values.push(userId);
  const { rows } = await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING
      id, hash_id, email, username, display_name, first_name, last_name,
      phone, country, timezone, avatar_url, bio, wallet_address, updated_at`,
    values
  );
  return rows[0];
}

async function getUserByHashId(hashId) {
  const { rows } = await db.query(
    `SELECT id, hash_id, email, username, display_name, avatar_url,
            country, is_admin, created_at FROM users WHERE hash_id = $1`,
    [hashId]
  );
  return rows[0] || null;
}

module.exports = {
  createUser, loginUser, getFullProfile, updateProfile, getUserByHashId,
  generateHashId, parseUserAgent,
};
