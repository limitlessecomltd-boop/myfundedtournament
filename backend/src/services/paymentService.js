const axios = require('axios');
const crypto = require('crypto');

const NOWPAYMENTS_API = 'https://api.nowpayments.io/v1';
const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

// NOWPayments handles the wallet â funds go to your NOWPayments account
// You withdraw from your NOWPayments dashboard whenever you want
// No static wallet address needed here

async function createPayment({ orderId, amount, description, callbackUrl }) {
  const response = await axios.post(
    `${NOWPAYMENTS_API}/payment`,
    {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: 'usdttrc20',
      order_id: orderId,
      order_description: description,
      ipn_callback_url: callbackUrl,
      is_fixed_rate: false,
      is_fee_paid_by_user: false,
    },
    { headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' } }
  );
  return response.data;
  // Returns: { payment_id, payment_status, pay_address, price_amount, pay_amount, pay_currency, order_id }
  // pay_address is the dynamic USDT TRC-20 address generated per payment
}

async function getPaymentStatus(paymentId) {
  const response = await axios.get(
    `${NOWPAYMENTS_API}/payment/${paymentId}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  return response.data;
}

async function verifyIpnSignature(body, signature) {
  // Sort body keys alphabetically and hash with IPN secret
  const sortedBody = Object.keys(body).sort().reduce((acc, key) => {
    acc[key] = body[key];
    return acc;
  }, {});
  const hmac = crypto.createHmac('sha512', IPN_SECRET);
  hmac.update(JSON.stringify(sortedBody));
  const expectedSig = hmac.digest('hex');
  return expectedSig === signature;
}

async function getAvailableCurrencies() {
  const response = await axios.get(`${NOWPAYMENTS_API}/currencies`, {
    headers: { 'x-api-key': API_KEY }
  });
  return response.data;
}

async function getMinimumPaymentAmount(currency = 'usdttrc20') {
  const response = await axios.get(
    `${NOWPAYMENTS_API}/min-amount?currency_from=${currency}&currency_to=${currency}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  return response.data;
}

/**
 * createEntryPayment â convenience wrapper used by entryService.
 * Creates a NOWPayments invoice for a tournament entry fee.
 * Returns { paymentId, address, amount, currency, paymentUrl }
 */
async function createEntryPayment(userId, tournamentId, entryId, entryFee) {
  const BACKEND_URL = process.env.BACKEND_URL || 'https://myfundedtournament-production.up.railway.app';

  const data = await createPayment({
    orderId:     `entry_${entryId}_${Date.now()}`,
    amount:      parseFloat(entryFee),
    description: `MFT Tournament Entry â ${entryId}`,
    callbackUrl: `${BACKEND_URL}/api/payments/webhook`,
  });

  // Persist payment record to DB
  const db = require('../config/db');
  await db.query(`
    INSERT INTO payments (entry_id, user_id, tournament_id, nowpayments_id, payment_address, amount_usd, currency, status)
    VALUES ($1,$2,$3,$4,$5,$6,'usdttrc20','waiting')
    ON CONFLICT (nowpayments_id) DO NOTHING
  `, [entryId, userId, tournamentId, data.payment_id, data.pay_address, parseFloat(entryFee)]);

  return {
    paymentId:  data.payment_id,
    address:    data.pay_address,
    amount:     data.pay_amount,
    currency:   data.pay_currency.toUpperCase(),
    paymentUrl: `https://nowpayments.io/payment?iid=${data.payment_id}`,
  };
}

module.exports = { createPayment, createEntryPayment, getPaymentStatus, verifyIpnSignature, getAvailableCurrencies, getMinimumPaymentAmount };
