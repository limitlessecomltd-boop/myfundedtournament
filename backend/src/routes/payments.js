const express = require('express');
const router = express.Router();
const { createPayment, getPaymentStatus, verifyIpnSignature } = require('../services/paymentService');
const { pool } = require('../config/db');
const { auth } = require('../middleware/auth');

// POST /api/payments/create — create a NOWPayments payment for an entry
router.post('/create', auth, async (req, res) => {
  try {
    const { entry_id, tournament_id } = req.body;
    const userId = req.user.id;

    // Get tournament entry fee
    const { rows } = await pool.query(
      `SELECT t.entry_fee, t.name, e.id as entry_id, e.status
       FROM entries e
       JOIN tournaments t ON t.id = e.tournament_id
       WHERE e.id = $1 AND e.user_id = $2`,
      [entry_id, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });
    const entry = rows[0];
    if (entry.status !== 'pending_payment') return res.status(400).json({ error: 'Entry already paid' });

    const orderId = `MFT-${entry_id}-${Date.now()}`;
    const callbackUrl = `${process.env.API_URL}/api/payments/webhook`;

    // NOWPayments generates a fresh USDT TRC-20 address for this payment
    // Funds go to your NOWPayments account — withdraw anytime from their dashboard
    const payment = await createPayment({
      orderId,
      amount: parseFloat(entry.entry_fee),
      description: `MFT Entry Fee — ${entry.name}`,
      callbackUrl,
    });

    // Save payment record
    await pool.query(
      `INSERT INTO payments (entry_id, user_id, tournament_id, nowpayments_id, payment_address, amount_usd, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'usdttrc20', 'waiting')`,
      [entry_id, userId, tournament_id, payment.payment_id, payment.pay_address, entry.entry_fee]
    );

    // Update entry with payment ID
    await pool.query(`UPDATE entries SET payment_id = $1 WHERE id = $2`, [payment.payment_id, entry_id]);

    res.json({
      success: true,
      payment_id: payment.payment_id,
      pay_address: payment.pay_address,       // Dynamic USDT TRC-20 address for THIS payment
      pay_amount: payment.pay_amount,          // Exact amount to send (in USDT)
      price_amount: payment.price_amount,      // USD amount
      pay_currency: 'USDT (TRC-20)',
      expires_at: payment.expiration_estimate_date,
      status: payment.payment_status,
    });
  } catch (err) {
    console.error('Payment create error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// GET /api/payments/:paymentId/status — poll payment status
router.get('/:paymentId/status', auth, async (req, res) => {
  try {
    const status = await getPaymentStatus(req.params.paymentId);
    res.json({ success: true, status: status.payment_status, payment: status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// POST /api/payments/webhook — NOWPayments IPN callback
// NOWPayments calls this when payment status changes
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    const body = JSON.parse(req.body);

    // Verify it's really from NOWPayments
    const valid = await verifyIpnSignature(body, signature);
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });

    const { payment_id, payment_status, order_id } = body;

    // Map NOWPayments status to our status
    const statusMap = {
      waiting: 'waiting', confirming: 'confirming',
      confirmed: 'confirmed', finished: 'confirmed',
      failed: 'failed', expired: 'expired', refunded: 'failed',
    };
    const ourStatus = statusMap[payment_status] || 'waiting';

    // Update payment record
    await pool.query(
      `UPDATE payments SET status = $1, confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE confirmed_at END
       WHERE nowpayments_id = $2`,
      [ourStatus, payment_id.toString()]
    );

    // If confirmed — activate the entry and add to prize pool
    if (ourStatus === 'confirmed') {
      const { rows } = await pool.query(
        `UPDATE entries e SET status = 'active'
         FROM payments p
         WHERE p.nowpayments_id = $1 AND p.entry_id = e.id
         RETURNING e.tournament_id, e.id`,
        [payment_id.toString()]
      );
      if (rows.length) {
        // Add entry fee to prize pool
        await pool.query(
          `UPDATE tournaments SET prize_pool = prize_pool + (SELECT entry_fee FROM tournaments WHERE id = $1) WHERE id = $1`,
          [rows[0].tournament_id]
        );
        console.log(`✅ Payment confirmed — Entry ${rows[0].id} activated`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
