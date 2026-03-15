const express = require('express');
const router = express.Router();
const { createPayment, getPaymentStatus, verifyIpnSignature } = require('../services/paymentService');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// POST /api/payments/create — create a NOWPayments payment for an entry
router.post('/create', authenticate, async (req, res) => {
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

    const payment = await createPayment({
      orderId,
      amount: parseFloat(entry.entry_fee),
      description: `MFT Entry Fee — ${entry.name}`,
      callbackUrl,
    });

    await pool.query(
      `INSERT INTO payments (entry_id, user_id, tournament_id, nowpayments_id, payment_address, amount_usd, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'usdttrc20', 'waiting')`,
      [entry_id, userId, tournament_id, payment.payment_id, payment.pay_address, entry.entry_fee]
    );
    await pool.query(`UPDATE entries SET payment_id = $1 WHERE id = $2`, [payment.payment_id, entry_id]);

    res.json({ success: true, payment_id: payment.payment_id, pay_address: payment.pay_address, pay_amount: payment.pay_amount, pay_currency: 'USDT (TRC-20)', status: payment.payment_status });
  } catch (err) {
    console.error('Payment create error:', err.message);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.get('/:paymentId/status', authenticate, async (req, res) => {
  try {
    const status = await getPaymentStatus(req.params.paymentId);
    res.json({ success: true, status: status.payment_status, payment: status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    const body = JSON.parse(req.body);
    const valid = await verifyIpnSignature(body, signature);
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });
    const { payment_id, payment_status } = body;
    const statusMap = { waiting: 'waiting', confirming: 'confirming', confirmed: 'confirmed', finished: 'confirmed', failed: 'failed', expired: 'expired' };
    const ourStatus = statusMap[payment_status] || 'waiting';
    await pool.query(`UPDATE payments SET status = $1 WHERE nowpayments_id = $2`, [ourStatus, payment_id.toString()]);
    if (ourStatus === 'confirmed') {
      const { rows } = await pool.query(`UPDATE entries e SET status = 'active' FROM payments p WHERE p.nowpayments_id = $1 AND p.entry_id = e.id RETURNING e.tournament_id`, [payment_id.toString()]);
      if (rows.length) await pool.query(`UPDATEtournaments SET prize_pool = prize_pool + entry_fee WHERE id = $1`, [rows[0].tournament_id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook failed' });
  }
});

module.exports = router;
