/**
 * payments.js — ForumPay crypto payment routes
 * Replaces NOWPayments with ForumPay sandbox integration.
 */
const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const { authenticate } = require('../middleware/auth');
const email    = require('../services/emailService');
const { CURRENCIES, getRate, startPayment, checkPayment, cancelPayment, mapStatus } = require('../services/forumPayService');

const BRIDGE_URL    = process.env.MT5_BRIDGE_URL || 'http://38.60.196.145:5099';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET  || 'mft_bridge_secret_2024';
const BACKEND_URL   = process.env.BACKEND_URL    || 'https://myfundedtournament-production.up.railway.app';

// ── GET /api/payments/currencies ─────────────────────────────────────────────
router.get('/currencies', (req, res) => {
  res.json({ success: true, data: CURRENCIES });
});

// ── GET /api/payments/probe-forumpay ─────────────────────────────────────────
// Diagnostic: try all endpoint name variations to find correct ForumPay paths
router.get('/probe-forumpay', async (req, res) => {
  const { FORUMPAY_API, AUTH, FORUMPAY_POS_ID } = require('../services/forumPayService');
  const paths = [
    '/GetRate', '/getRate', '/get_rate', '/rate',
    '/StartPayment', '/startPayment', '/start_payment',
    '/CheckPayment', '/checkPayment', '/check_payment',
    '/ping', '/Ping',
    '/GetCryptoCurrencyList', '/getCryptoCurrencyList',
  ];
  const results = {};
  for (const p of paths) {
    try {
      const url = `${FORUMPAY_API}${p}?pos_id=${FORUMPAY_POS_ID}&invoice_currency=USD&invoice_amount=25&currency=USDT_TRC20`;
      const r = await fetch(url, { headers: { Authorization: AUTH }, signal: AbortSignal.timeout(5000) });
      const d = await r.json();
      results[p] = d.err_code === 'unknownEndpoint' ? 'NOT_FOUND' : (d.err ? d.err : 'OK:' + JSON.stringify(d).slice(0,80));
    } catch(e) { results[p] = 'ERROR:' + e.message; }
  }
  res.json(results);
});

// ── GET /api/payments/rate ───────────────────────────────────────────────────
// Get live exchange rate: ?amount=50&currency=USDT_TRC20
router.get('/rate', authenticate, async (req, res) => {
  try {
    const { amount, currency } = req.query;
    if (!amount || !currency) return res.status(400).json({ error: 'amount and currency required' });
    const rate = await getRate(parseFloat(amount), currency);
    res.json({ success: true, data: rate });
  } catch (err) {
    console.error('[ForumPay] getRate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/create ─────────────────────────────────────────────────
// Create a ForumPay payment for an entry
router.post('/create', authenticate, async (req, res) => {
  try {
    const { entry_id, currency = 'USDT_TRC20' } = req.body;
    const userId = req.user.id;

    // Validate currency
    const validCurrency = CURRENCIES.find(c => c.id === currency);
    if (!validCurrency) return res.status(400).json({ error: 'Invalid currency' });

    // Get entry + tournament
    const { rows } = await db.query(
      `SELECT t.entry_fee, t.name AS tournament_name, e.id AS entry_id,
              e.status, e.tournament_id, e.payment_id
       FROM entries e
       JOIN tournaments t ON t.id = e.tournament_id
       WHERE e.id = $1 AND e.user_id = $2`,
      [entry_id, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });
    const entry = rows[0];

    if (entry.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Entry is not awaiting payment' });
    }

    // Check for existing active ForumPay payment
    const { rows: existing } = await db.query(
      `SELECT * FROM payments
       WHERE entry_id = $1 AND status IN ('waiting','confirming')
       ORDER BY created_at DESC LIMIT 1`,
      [entry_id]
    );

    if (existing.length && existing[0].payment_address) {
      const p = existing[0];
      const fp_id = p.nowpayments_id; // reusing column for forumpay_payment_id
      try {
        const live = await checkPayment(fp_id);
        if (!['cancelled','failed'].includes(mapStatus(live.status))) {
          return res.json({
            success: true,
            payment_id: fp_id,
            address:    p.payment_address,
            amount:     p.amount_crypto || p.amount_usd,
            currency:   p.currency,
            currency_meta: validCurrency,
            status:     mapStatus(live.status),
            reused:     true,
          });
        }
      } catch {}
      // If check fails or cancelled, fall through to create new
    }

    const orderId   = `mft_${entry_id}_${Date.now()}`;
    const ipnUrl    = `${BACKEND_URL}/api/payments/webhook`;
    const amount    = parseFloat(entry.entry_fee);

    // Start payment with ForumPay
    const fp = await startPayment({ invoiceAmount: amount, currency, orderId, ipnUrl });

    console.log('[ForumPay] StartPayment response:', JSON.stringify(fp));

    const paymentId = fp.payment_id || fp.id || orderId;
    const address   = fp.address;
    const cryptoAmt = fp.amount || fp.invoice_amount;
    const notice    = fp.notice;

    // Save to DB (reuse nowpayments_id column for forumpay payment_id)
    await db.query(
      `INSERT INTO payments
         (entry_id, user_id, tournament_id, nowpayments_id, payment_address,
          amount_usd, amount_crypto, currency, status, reference_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'waiting',$9)
       ON CONFLICT (nowpayments_id) DO UPDATE SET
         payment_address=EXCLUDED.payment_address,
         amount_crypto=EXCLUDED.amount_crypto,
         status='waiting'`,
      [entry_id, userId, entry.tournament_id,
       String(paymentId), address,
       amount, String(cryptoAmt || amount), currency,
       orderId]
    );

    await db.query(`UPDATE entries SET payment_id=$1 WHERE id=$2`, [String(paymentId), entry_id]);

    res.json({
      success:       true,
      payment_id:    paymentId,
      address,
      amount:        cryptoAmt,
      amount_usd:    amount,
      currency,
      currency_meta: validCurrency,
      notice,
      status:        'waiting',
    });
  } catch (err) {
    console.error('[ForumPay] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create payment: ' + err.message });
  }
});

// ── GET /api/payments/:paymentId/status ──────────────────────────────────────
// Frontend polls this every 10s while waiting for confirmation
router.get('/:paymentId/status', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const { rows } = await db.query(
      `SELECT p.*, e.status AS entry_status
       FROM payments p LEFT JOIN entries e ON e.id = p.entry_id
       WHERE p.nowpayments_id = $1`,
      [paymentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Payment not found' });
    const p = rows[0];

    if (p.status === 'confirmed') {
      return res.json({ success: true, status: 'confirmed', confirmed: true, entry_status: p.entry_status });
    }

    // Live check from ForumPay
    try {
      const fp = await checkPayment(paymentId);
      const ourStatus = mapStatus(fp.status);
      const confirmed = ourStatus === 'confirmed';

      if (ourStatus !== p.status) {
        await db.query(
          `UPDATE payments SET status=$1,
           confirmed_at=CASE WHEN $1='confirmed' THEN NOW() ELSE confirmed_at END
           WHERE nowpayments_id=$2`,
          [ourStatus, paymentId]
        );
        if (confirmed && p.entry_id) {
          await activateEntry(p.entry_id, p.tournament_id, p.user_id);
        }
        if ((ourStatus === 'expired' || ourStatus === 'failed') && p.entry_id) {
          await db.query(
            `UPDATE entries SET status='cancelled' WHERE id=$1 AND status='pending_payment'`,
            [p.entry_id]
          );
        }
      }

      res.json({
        success:            true,
        status:             ourStatus,
        confirmed,
        entry_status:       p.entry_status,
        // ForumPay-specific details for frontend display
        unconfirmed_amount: fp.unconfirmed_amount,
        confirmed_amount:   fp.confirmed_amount,
        waiting_confirmations: fp.waiting_confirmations,
        confirmations:      fp.confirmations,
      });
    } catch (fpErr) {
      console.warn('[ForumPay] checkPayment failed:', fpErr.message);
      res.json({ success: true, status: p.status, confirmed: p.status === 'confirmed' });
    }
  } catch (err) {
    console.error('[ForumPay] Status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// ForumPay IPN — called when payment status changes
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('[ForumPay] Webhook:', JSON.stringify({
      payment_id: body?.payment_id,
      status:     body?.status,
      reference:  body?.reference_no,
    }));

    if (!body?.payment_id) return res.status(400).json({ error: 'Invalid body' });

    const ourStatus = mapStatus(body.status);
    const paymentId = String(body.payment_id);

    // Verify reference_no matches what we stored
    const { rows: updated } = await db.query(
      `UPDATE payments SET status=$1,
       confirmed_at=CASE WHEN $1='confirmed' THEN NOW() ELSE confirmed_at END
       WHERE nowpayments_id=$2
       RETURNING entry_id, tournament_id, user_id, reference_no`,
      [ourStatus, paymentId]
    );

    if (!updated.length) {
      console.warn('[ForumPay] Webhook: payment not found:', paymentId);
      return res.json({ success: true });
    }

    const { entry_id, tournament_id, user_id, reference_no } = updated[0];

    // Security: verify reference_no
    if (body.reference_no && reference_no && body.reference_no !== reference_no) {
      console.error('[ForumPay] reference_no mismatch! Webhook ignored.');
      return res.status(400).json({ error: 'reference_no mismatch' });
    }

    if (ourStatus === 'confirmed') {
      await activateEntry(entry_id, tournament_id, user_id);
    }
    if (ourStatus === 'expired' || ourStatus === 'failed') {
      if (entry_id) {
        await db.query(
          `UPDATE entries SET status='cancelled' WHERE id=$1 AND status='pending_payment'`,
          [entry_id]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[ForumPay] Webhook error:', err.message);
    res.json({ success: true, error: err.message });
  }
});

// ── POST /api/payments/cancel ─────────────────────────────────────────────────
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { payment_id } = req.body;
    await cancelPayment(payment_id);
    await db.query(`UPDATE payments SET status='expired' WHERE nowpayments_id=$1`, [String(payment_id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: activate entry after confirmed payment ────────────────────────────
async function activateEntry(entryId, tournamentId, userId) {
  try {
    const { rows } = await db.query(
      `UPDATE entries SET status='active'
       WHERE id=$1 AND status='pending_payment'
       RETURNING id, tournament_id`,
      [entryId]
    );
    if (!rows.length) { console.log(`[ForumPay] Entry ${entryId} already active`); return; }

    const tId = rows[0].tournament_id || tournamentId;
    await db.query(
      `UPDATE tournaments SET prize_pool=COALESCE(prize_pool,0)+(SELECT entry_fee FROM tournaments WHERE id=$1) WHERE id=$1`,
      [tId]
    );
    console.log(`✅ [ForumPay] Entry ${entryId} activated`);

    try {
      const { rows: info } = await db.query(
        `SELECT u.email, u.username, t.name AS tournament_name, t.entry_fee, t.id AS tournament_id
         FROM entries e JOIN users u ON u.id=e.user_id JOIN tournaments t ON t.id=e.tournament_id
         WHERE e.id=$1`, [entryId]
      );
      if (info.length) {
        await email.sendPaymentConfirmed({
          email: info[0].email, username: info[0].username,
          tournamentName: info[0].tournament_name,
          entryFee: parseFloat(info[0].entry_fee),
          tournamentId: info[0].tournament_id,
        });
      }
    } catch (e) { console.warn('[Email] failed:', e.message); }

    connectMt5ToBridge(entryId).catch(e => console.warn('[Bridge]', e.message));
  } catch (err) { console.error('[ForumPay] activateEntry error:', err.message); }
}

async function connectMt5ToBridge(entryId) {
  const { rows } = await db.query(
    `SELECT mt5_login, mt5_password, mt5_server FROM entries WHERE id=$1`, [entryId]
  );
  if (!rows.length || !rows[0].mt5_login) return;
  const { mt5_login, mt5_password, mt5_server } = rows[0];
  const r = await fetch(`${BRIDGE_URL}/connect-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: String(mt5_login), password: mt5_password, server: mt5_server||'Exness-MT5Trial15', secret: BRIDGE_SECRET }),
  });
  const d = await r.json();
  console.log(`[Bridge] connect ${mt5_login}:`, d.connected ? '✅' : d.error);
}

module.exports = router;
