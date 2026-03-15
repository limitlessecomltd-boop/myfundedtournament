const axios = require('axios');
const crypto = require('crypto');

const NOWPAYMENTS_API = 'https://api.nowpayments.io/v1';
const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

// NOWPayments handles the wallet — funds go to your NOWPayments account
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

module.exports = { createPayment, getPaymentStatus, verifyIpnSignature, getAvailableCurrencies, getMinimumPaymentAmount };
