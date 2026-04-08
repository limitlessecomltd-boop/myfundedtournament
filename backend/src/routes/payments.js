/**
 * payments.js — ForumPay crypto payment routes (v2)
 * Exact API params from: https://github.com/forumpay/payment-gateway-php-client
 */
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate } = require('../middleware/auth');
const email   = require('../services/emailService');
const { CURRENCIES, ping, getRate, startPayment, checkPayment, cancelPayment, mapStatus } = require('../services/forumPayService');

const BRIDGE_URL    = process.env.MT5_BRIDGE_URL || 'http://38.60.196.145:5099';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET  || 'mft_bridge_secret_2024';
const BACKEND_URL   = process.env.BACKEND_URL    || 'https://myfundedtournament-production.up.railway.app';

// ── GET /api/payments/currencies ─────────────────────────────────────────────
router.get('/currencies', (_req, res) => res.json({ success: true, data: CURRENCIES }));

// ── GET /api/payments/ping ────────────────────────────────────────────────────
router.get('/ping', async (_req, res) => {
  try {
    const r = await ping();
    res.json({ success: true, data: r });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── GET /api/payments/rate?amount=50&currency=USDT_TRC20 ─────────────────────
router.get('/rate', authenticate, async (req, res) => {
  try {
    const { amount, currency } = req.query;
    if (!amount || !currency) return res.status(400).json({ error: 'amount and currency required' });
    const data = await getRate(parseFloat(amount), currency);
    res.json({ success: true, data });
  } catch (e) {
    console.error('[ForumPay] rate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/payments/create ─────────────────────────────────────────────────
router.post('/create', authenticate, async (req, res) => {
  try {
    const { entry_id, currency = 'USDT_TRC20' } = req.body;
    if (!CURRENCIES.find(c => c.id === currency)) {
      return res.status(400).json({ error: 'Invalid currency: ' + currency });
    }
    const userId = req.user.id;

    // Load entry + tournament
    const { rows } = await db.query(`
      SELECT t.entry_fee, t.name AS tournament_name, e.id AS entry_id,
             e.status, e.tournament_id
      FROM entries e JOIN tournaments t ON t.id = e.tournament_id
      WHERE e.id = $1 AND e.user_id = $2
    `, [entry_id, userId]);
    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });
    const entry = rows[0];
    if (entry.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Entry is not awaiting payment (status: ' + entry.status + ')' });
    }

    // Check for an existing active payment we can reuse
    const { rows: existing } = await db.query(
      `SELECT * FROM payments WHERE entry_id=$1 AND status IN ('waiting','confirming') ORDER BY created_at DESC LIMIT 1`,
      [entry_id]
    );
    if (existing.length && existing[0].payment_address && existing[0].currency === currency) {
      const p = existing[0];
      console.log('[ForumPay] Reusing existing payment:', p.nowpayments_id);
      return res.json({
        success: true, reused: true,
        payment_id: p.nowpayments_id,
        address:    p.payment_address,
        amount:     p.amount_crypto || p.amount_usd,
        amount_usd: parseFloat(p.amount_usd),
        currency:   p.currency,
        status:     p.status,
      });
    }

    // Cancel any existing payment in different currency
    if (existing.length && existing[0].payment_address) {
      try {
        await cancelPayment({ currency: existing[0].currency, paymentId: existing[0].nowpayments_id, address: existing[0].payment_address });
      } catch {}
      await db.query(`UPDATE payments SET status='expired' WHERE id=$1`, [existing[0].id]);
    }

    // Generate our order ID — used as payment_id in ForumPay
    const orderId = 'mft_' + entry_id.replace(/-/g,'').slice(0,16) + '_' + Date.now();
    const amount  = parseFloat(entry.entry_fee);
    const ipnUrl  = BACKEND_URL + '/api/payments/webhook';

    console.log('[ForumPay] StartPayment:', { orderId, amount, currency });
    const fp = await startPayment({ invoiceAmount: amount, currency, paymentId: orderId, referenceNo: orderId, webhookUrl: ipnUrl });
    console.log('[ForumPay] StartPayment response:', JSON.stringify(fp));

    // ForumPay StartPayment returns: address, amount, sid, valid_until, notice, ...
    const address   = fp.address;
    const cryptoAmt = fp.amount || fp.invoice_amount || String(amount);
    const sid       = fp.sid;     // session ID — needed for CheckPayment in some flows
    const notice    = fp.notice;

    if (!address) throw new Error('ForumPay did not return an address. Response: ' + JSON.stringify(fp));

    // Store payment — nowpayments_id column reused as forumpay payment_id (orderId)
    await db.query(`
      INSERT INTO payments
        (entry_id, user_id, tournament_id, nowpayments_id, payment_address,
         amount_usd, amount_crypto, currency, status, reference_no)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'waiting',$9)
      ON CONFLICT (nowpayments_id) DO UPDATE SET
        payment_address = EXCLUDED.payment_address,
        amount_crypto   = EXCLUDED.amount_crypto,
        currency        = EXCLUDED.currency,
        status          = 'waiting'
    `, [entry_id, userId, entry.tournament_id, orderId, address, amount, String(cryptoAmt), currency, orderId]);

    await db.query(`UPDATE entries SET payment_id=$1 WHERE id=$2`, [orderId, entry_id]);

    res.json({ success:true, payment_id:orderId, address, amount:cryptoAmt, amount_usd:amount, currency, notice, status:'waiting' });
  } catch (err) {
    console.error('[ForumPay] Create error:', err.message);
    res.status(500).json({ error: 'Payment creation failed: ' + err.message });
  }
});

// ── GET /api/payments/:paymentId/status ──────────────────────────────────────
router.get('/:paymentId/status', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { rows } = await db.query(
      `SELECT p.*, e.status AS entry_status
       FROM payments p LEFT JOIN entries e ON e.id=p.entry_id
       WHERE p.nowpayments_id=$1`,
      [paymentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Payment not found' });
    const p = rows[0];

    if (p.status === 'confirmed') {
      return res.json({ success:true, status:'confirmed', confirmed:true, entry_status:p.entry_status });
    }

    // CheckPayment requires currency + paymentId + address
    if (!p.payment_address || !p.currency) {
      return res.json({ success:true, status:p.status, confirmed:false });
    }

    try {
      const fp = await checkPayment({ currency: p.currency, paymentId, address: p.payment_address });
      console.log('[ForumPay] CheckPayment:', JSON.stringify(fp));

      const ourStatus = mapStatus(fp.status);
      const confirmed = ourStatus === 'confirmed';

      if (ourStatus !== p.status) {
        await db.query(`UPDATE payments SET status=$1, confirmed_at=CASE WHEN $1='confirmed' THEN NOW() ELSE confirmed_at END WHERE nowpayments_id=$2`, [ourStatus, paymentId]);
        if (confirmed && p.entry_id) await activateEntry(p.entry_id, p.tournament_id, p.user_id);
        if ((ourStatus==='expired'||ourStatus==='failed') && p.entry_id) {
          await db.query(`UPDATE entries SET status='cancelled' WHERE id=$1 AND status='pending_payment'`, [p.entry_id]);
        }
      }

      res.json({
        success: true, status: ourStatus, confirmed,
        entry_status: p.entry_status,
        // Live details for UI
        unconfirmed_amount:    fp.unconfirmed_amount,
        confirmed_amount:      fp.confirmed_amount,
        waiting_confirmations: fp.waiting_confirmations,
        confirmations:         fp.confirmations,
        invoice_amount:        fp.invoice_amount,
        amount:                fp.amount,
        risk:                  fp.risk,
      });
    } catch (fpErr) {
      console.warn('[ForumPay] CheckPayment failed:', fpErr.message);
      res.json({ success:true, status:p.status, confirmed: p.status==='confirmed' });
    }
  } catch (err) {
    console.error('[ForumPay] Status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/webhook (ForumPay IPN) ─────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('[ForumPay] Webhook received:', JSON.stringify({
      payment_id: body?.payment_id, status: body?.status, reference_no: body?.reference_no,
    }));
    if (!body?.payment_id) return res.status(400).json({ error:'Invalid body' });

    const ourStatus = mapStatus(body.status);
    const paymentId = String(body.payment_id);

    const { rows: updated } = await db.query(`
      UPDATE payments SET status=$1,
        confirmed_at=CASE WHEN $1='confirmed' THEN NOW() ELSE confirmed_at END
      WHERE nowpayments_id=$2
      RETURNING entry_id, tournament_id, user_id, reference_no, currency, payment_address
    `, [ourStatus, paymentId]);

    if (!updated.length) {
      console.warn('[ForumPay] Webhook: payment not found:', paymentId);
      return res.json({ success: true });
    }
    const { entry_id, tournament_id, user_id, reference_no } = updated[0];

    // Security: verify reference_no matches
    if (body.reference_no && reference_no && body.reference_no !== reference_no) {
      console.error('[ForumPay] reference_no mismatch! Got:', body.reference_no, 'Expected:', reference_no);
      return res.status(400).json({ error: 'reference_no mismatch' });
    }

    if (ourStatus === 'confirmed') await activateEntry(entry_id, tournament_id, user_id);
    if ((ourStatus==='expired'||ourStatus==='failed') && entry_id) {
      await db.query(`UPDATE entries SET status='cancelled' WHERE id=$1 AND status='pending_payment'`, [entry_id]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[ForumPay] Webhook error:', err.message);
    res.json({ success:true, error:err.message });
  }
});

// ── POST /api/payments/cancel ─────────────────────────────────────────────────
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { payment_id } = req.body;
    const { rows } = await db.query(`SELECT currency, payment_address FROM payments WHERE nowpayments_id=$1`, [payment_id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await cancelPayment({ currency: rows[0].currency, paymentId: payment_id, address: rows[0].payment_address });
    await db.query(`UPDATE payments SET status='expired' WHERE nowpayments_id=$1`, [payment_id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Helper: activate entry ────────────────────────────────────────────────────
async function activateEntry(entryId, tournamentId, userId) {
  try {
    const { rows } = await db.query(
      `UPDATE entries SET status='active' WHERE id=$1 AND status='pending_payment' RETURNING id, tournament_id`,
      [entryId]
    );
    if (!rows.length) { console.log('[ForumPay] Entry already active:', entryId); return; }
    const tId = rows[0].tournament_id || tournamentId;
    await db.query(`UPDATE tournaments SET prize_pool=COALESCE(prize_pool,0)+(SELECT entry_fee FROM tournaments WHERE id=$1) WHERE id=$1`, [tId]);
    console.log('[ForumPay] Entry activated:', entryId);
    try {
      const { rows: info } = await db.query(`
        SELECT u.email, u.username, t.name AS tournament_name, t.entry_fee, t.id AS tournament_id
        FROM entries e JOIN users u ON u.id=e.user_id JOIN tournaments t ON t.id=e.tournament_id WHERE e.id=$1
      `, [entryId]);
      if (info.length) await email.sendPaymentConfirmed({ email:info[0].email, username:info[0].username, tournamentName:info[0].tournament_name, entryFee:parseFloat(info[0].entry_fee), tournamentId:info[0].tournament_id });
    } catch {}
    connectMt5ToBridge(entryId).catch(e => console.warn('[Bridge]', e.message));
  } catch (e) { console.error('[ForumPay] activateEntry:', e.message); }
}

async function connectMt5ToBridge(entryId) {
  const { rows } = await db.query(`SELECT mt5_login, mt5_password, mt5_server FROM entries WHERE id=$1`, [entryId]);
  if (!rows.length || !rows[0].mt5_login) return;
  const { mt5_login, mt5_password, mt5_server } = rows[0];
  const r = await fetch(BRIDGE_URL + '/connect-account', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ login:String(mt5_login), password:mt5_password, server:mt5_server||'Exness-MT5Trial15', secret:BRIDGE_SECRET }) });
  const d = await r.json();
  console.log('[Bridge] connect', mt5_login, d.connected ? 'OK' : (d.error||'fail'));
}

module.exports = router;
