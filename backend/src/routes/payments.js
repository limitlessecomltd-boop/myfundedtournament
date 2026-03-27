const axios = require('axios');
    // Auto-create MT5 demo account for trader
    if (paymentRecord && paymentRecord.entry_id) { createDemoAccountForEntry(supabase, paymentRecord.entry_id).catch(console.error); }

const express = require('express');
const router  = express.Router();
const { createPayment, getPaymentStatus, verifyIpnSignature } = require('../services/paymentService');
const { activateEntryMetaApi } = require('../services/entryService');
const email = require('../services/emailService');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ POST /api/payments/create Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Called by frontend after entry is created Ã¢ÂÂ generates a NOWPayments invoice
router.post('/create', authenticate, async (req, res) => {
  try {
    const { entry_id, tournament_id } = req.body;
    const userId = req.user.id;

    // Get entry + tournament details
    const { rows } = await db.query(
      `SELECT t.entry_fee, t.name AS tournament_name, e.id AS entry_id, e.status, e.tournament_id
       FROM entries e
       JOIN tournaments t ON t.id = e.tournament_id
       WHERE e.id = $1 AND e.user_id = $2`,
      [entry_id, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });
    const entry = rows[0];
    if (entry.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Entry is already paid or active' });
    }

    // Check if payment already exists for this entry
    const { rows: existing } = await db.query(
      `SELECT * FROM payments WHERE entry_id = $1 AND status IN ('waiting','confirming','confirmed')`,
      [entry_id]
    );
    if (existing.length) {
      // Return existing payment
      return res.json({
        success: true,
        payment_id: existing[0].nowpayments_id,
        pay_address: existing[0].payment_address,
        pay_amount: existing[0].amount_usd,
        price_amount: existing[0].amount_usd,
        pay_currency: 'USDT (TRC-20)',
        paymentUrl: `https://nowpayments.io/payment?iid=${existing[0].nowpayments_id}`,
        status: existing[0].status,
        reused: true,
      });
    }

    const BACKEND = process.env.BACKEND_URL || process.env.RAILWAY_STATIC_URL
      ? `https://${process.env.RAILWAY_STATIC_URL}`
      : 'https://myfundedtournament-production.up.railway.app';

    const callbackUrl = `${BACKEND}/api/payments/webhook`;

    // Create NOWPayments invoice
    const payment = await createPayment({
      orderId: `entry_${entry_id}_${Date.now()}`,
      amount: parseFloat(entry.entry_fee),
      description: `MFT Entry Ã¢ÂÂ ${entry.tournament_name}`,
      callbackUrl,
    });

    // Save to DB
    await db.query(
      `INSERT INTO payments (entry_id, user_id, tournament_id, nowpayments_id, payment_address, amount_usd, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'usdttrc20', 'waiting')
       ON CONFLICT (nowpayments_id) DO NOTHING`,
      [entry_id, userId, entry.tournament_id || tournament_id,
       payment.payment_id.toString(), payment.pay_address,
       parseFloat(entry.entry_fee)]
    );

    // Link payment to entry
    await db.query(`UPDATE entries SET payment_id = $1 WHERE id = $2`,
      [payment.payment_id.toString(), entry_id]);

    res.json({
      success: true,
      payment_id: payment.payment_id,
      pay_address: payment.pay_address,
      pay_amount: payment.pay_amount,
      price_amount: payment.price_amount,
      pay_currency: 'USDT (TRC-20)',
      paymentUrl: `https://nowpayments.io/payment?iid=${payment.payment_id}`,
      expires_at: payment.expiration_estimate_date,
      status: payment.payment_status,
    });
  } catch (err) {
    console.error('[Payment] Create error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create payment. Please try again.' });
  }
});

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ GET /api/payments/:paymentId/status Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Frontend polls this to check payment status
router.get('/:paymentId/status', authenticate, async (req, res) => {
  try {
    const paymentId = req.params.paymentId;

    // Check local DB first
    const { rows } = await db.query(
      `SELECT p.*, e.status AS entry_status
       FROM payments p
       LEFT JOIN entries e ON e.id = p.entry_id
       WHERE p.nowpayments_id = $1`,
      [paymentId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Payment not found' });

    // If already confirmed locally, return that
    if (rows[0].status === 'confirmed') {
      return res.json({
        success: true,
        status: 'confirmed',
        confirmed: true,
        entry_status: rows[0].entry_status,
        payment: rows[0],
      });
    }

    // Otherwise check live status from NOWPayments API
    try {
      const live = await getPaymentStatus(paymentId);
      const statusMap = {
        waiting: 'waiting', confirming: 'confirming',
        confirmed: 'confirmed', finished: 'confirmed',
        failed: 'failed', expired: 'expired', refunded: 'failed',
      };
      const ourStatus = statusMap[live.payment_status] || rows[0].status;

      // Update if status changed
      if (ourStatus !== rows[0].status) {
        await db.query(
          `UPDATE payments SET status = $1,
           confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE confirmed_at END
           WHERE nowpayments_id = $2`,
          [ourStatus, paymentId]
        );

        // Activate entry if now confirmed
        if (ourStatus === 'confirmed' && rows[0].entry_id) {
          await activateEntry(rows[0].entry_id, rows[0].tournament_id, rows[0].user_id);
        }
      }

      res.json({
        success: true,
        status: ourStatus,
        confirmed: ourStatus === 'confirmed',
        live_status: live.payment_status,
        payment: rows[0],
      });
    } catch {
      // NOWPayments API down Ã¢ÂÂ return local status
      res.json({
        success: true,
        status: rows[0].status,
        confirmed: rows[0].status === 'confirmed',
        payment: rows[0],
      });
    }
  } catch (err) {
    console.error('[Payment] Status error:', err.message);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ POST /api/payments/webhook Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// NOWPayments IPN callback Ã¢ÂÂ called when payment status changes
// IMPORTANT: Must be registered BEFORE express.json() globally parses the body,
// OR we just use the already-parsed body (since express.json is global in server.js)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    const body = req.body;

    console.log('[Webhook] Received:', JSON.stringify({ 
      payment_id: body?.payment_id,
      payment_status: body?.payment_status,
      order_id: body?.order_id,
      hasSignature: !!signature 
    }));

    if (!body || !body.payment_id) {
      console.warn('[Webhook] Empty or invalid body');
      return res.status(400).json({ error: 'Invalid webhook body' });
    }

    // Verify IPN signature Ã¢ÂÂ log but don't block if invalid (prevents missed payments)
    if (signature && process.env.NOWPAYMENTS_IPN_SECRET) {
      const valid = await verifyIpnSignature(body, signature);
      if (!valid) {
        console.warn('[Webhook] Signature mismatch for payment', body.payment_id, 'Ã¢ÂÂ processing anyway');
        // Don't return 401 Ã¢ÂÂ still process the payment to avoid missing confirmations
      }
    }

    const { payment_id, payment_status, order_id } = body;
    const paymentIdStr = payment_id.toString();

    console.log(`[Webhook] Payment ${paymentIdStr} Ã¢ÂÂ ${payment_status}`);

    const statusMap = {
      waiting: 'waiting', confirming: 'confirming',
      confirmed: 'confirmed', finished: 'confirmed',
      failed: 'failed', expired: 'expired', refunded: 'failed',
    };
    const ourStatus = statusMap[payment_status] || 'waiting';

    // Update payment record
    const { rows: updated } = await db.query(
      `UPDATE payments SET status = $1,
       confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE confirmed_at END
       WHERE nowpayments_id = $2
       RETURNING entry_id, tournament_id, user_id, status`,
      [ourStatus, paymentIdStr]
    );

    if (!updated.length) {
      console.warn(`[Webhook] Payment ${paymentIdStr} not found in DB`);
      // Still return 200 to stop NOWPayments retrying
      return res.json({ success: true, note: 'Payment not found' });
    }

    // Activate entry if confirmed
    if (ourStatus === 'confirmed') {
      const { entry_id, tournament_id, user_id } = updated[0];
      await activateEntry(entry_id, tournament_id, user_id);
    }

    // Handle expiry Ã¢ÂÂ clean up pending_payment entry so trader can retry
    if (ourStatus === 'expired' || ourStatus === 'failed') {
      const { entry_id } = updated[0];
      if (entry_id) {
        await db.query(
          `UPDATE entries SET status = 'cancelled' WHERE id = $1 AND status = 'pending_payment'`,
          [entry_id]
        );
        console.log(`[Webhook] Entry ${entry_id} cancelled due to ${ourStatus} payment`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    // Always return 200 to NOWPayments or they'll keep retrying
    res.json({ success: true, error: err.message });
  }
});

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Helper: activate entry after confirmed payment Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
async function activateEntry(entryId, tournamentId, userId) {
  try {
    // Activate the entry
    const { rows } = await db.query(
      `UPDATE entries SET status = 'active'
       WHERE id = $1 AND status = 'pending_payment'
       RETURNING id, tournament_id`,
      [entryId]
    );

    if (!rows.length) {
      console.log(`[Payment] Entry ${entryId} already active or not pending`);
      return;
    }

    const tId = rows[0].tournament_id || tournamentId;

    // Add entry fee to prize pool
    await db.query(
      `UPDATE tournaments
       SET prize_pool = COALESCE(prize_pool, 0) + (SELECT entry_fee FROM tournaments WHERE id = $1)
       WHERE id = $1`,
      [tId]
    );

    console.log(`Ã¢ÂÂ [Payment] Entry ${entryId} activated, prize pool updated`);

    // Send confirmation email
    try {
      const { rows: entryInfo } = await db.query(`
        SELECT u.email, u.username, t.name AS tournament_name, t.entry_fee, t.id AS tournament_id
        FROM entries e
        JOIN users u ON u.id = e.user_id
        JOIN tournaments t ON t.id = e.tournament_id
        WHERE e.id = $1
      `, [entryId]);
      if (entryInfo.length) {
        await email.sendPaymentConfirmed({
          email:          entryInfo[0].email,
          username:       entryInfo[0].username,
          tournamentName: entryInfo[0].tournament_name,
          entryFee:       parseFloat(entryInfo[0].entry_fee),
          tournamentId:   entryInfo[0].tournament_id,
        });
      }
    } catch (emailErr) {
      console.warn('[Email] Payment confirmed email failed:', emailErr.message);
    }

    // Connect MT5 account to MetaApi (async Ã¢ÂÂ don't block the response)
    activateEntryMetaApi(entryId).catch(err => {
      console.warn(`[Payment] MetaApi activation failed for ${entryId}:`, err.message);
    });

  } catch (err) {
    console.error(`[Payment] activateEntry failed for ${entryId}:`, err.message);
  }
}


async function createDemoAccountForEntry(supabase, entryId) {
  try {
    const { data: entry } = await supabase.from('entries').select('id,user_id,tournament_id').eq('id', entryId).single();
    if (!entry) return console.error('[Demo] Entry not found:', entryId);
    const { data: user } = await supabase.from('users').select('id,email,username,nickname,phone').eq('id', entry.user_id).single();
    if (!user) return console.error('[Demo] User not found for entry:', entryId);
    const name = (user.nickname || user.username || 'MFT Trader').substring(0,32);
    const email = user.email;
    const phone = user.phone || '0000000000';
    const BRIDGE_URL = process.env.BRIDGE_URL || 'http://38.60.196.145:5099';
    const BRIDGE_SECRET = process.env.BRIDGE_SECRET || 'mft_bridge_secret_2024';
    console.log('[Demo] Creating MT5 demo for', email, 'name=', name);
    const resp = await axios.post(BRIDGE_URL + '/create-demo-account', { name, email, phone, secret: BRIDGE_SECRET }, { timeout: 30000 });
    const { login, password, investor_password, server } = resp.data;
    await supabase.from('entries').update({ mt5_login: login.toString(), mt5_password: password, mt5_server: server, status: 'pending' }).eq('id', entryId);
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'MFT <noreply@myfundedtournament.com>',
      to: email,
      subject: 'Your MT5 Demo Account is Ready — MyFundedTournament',
      html: '<div style="font-family:Inter,sans-serif;background:#0a0e1a;color:#fff;padding:32px;border-radius:12px;max-width:600px;margin:0 auto"><h1 style="color:#FFD700">MyFundedTournament</h1><p style="color:#22C55E">Your demo trading account has been created!</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:12px;background:#111827;color:#9CA3AF;border-radius:8px 8px 0 0">Login</td><td style="padding:12px;background:#111827;font-weight:700;font-size:18px">'+login+'</td></tr><tr><td style="padding:12px;background:#1F2937;color:#9CA3AF">Password</td><td style="padding:12px;background:#1F2937;font-weight:700">'+password+'</td></tr><tr><td style="padding:12px;background:#111827;color:#9CA3AF">Server</td><td style="padding:12px;background:#111827;font-weight:700">'+server+'</td></tr></table><div style="padding:16px;background:#1F2937;border-radius:8px;border-left:4px solid #FFD700;margin:16px 0"><p style="color:#FFD700;font-weight:700;margin:0">Starting Balance: $1,000.00</p><p style="color:#9CA3AF;font-size:14px;margin:8px 0 0">Open MetaTrader 5 and connect using the credentials above. Good luck!</p></div><p style="color:#6B7280;font-size:12px">MyFundedTournament · Compete Demo. Win Real Funding.</p></div>'
    });
    console.log('[Demo] Account created and email sent login=', login);
  } catch (err) {
    console.error('[Demo] createDemoAccountForEntry error:', err.message);
  }
}

module.exports = router;
