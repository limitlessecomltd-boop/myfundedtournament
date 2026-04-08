/**
 * forumPayService.js
 * ForumPay crypto payment gateway integration.
 * Sandbox API: https://sandbox.api.forumpay.com/pay/v2/
 */
const db = require('../config/db');

const FORUMPAY_API     = process.env.FORUMPAY_API_URL    || 'https://sandbox.api.forumpay.com/pay/v2';
const FORUMPAY_USER    = process.env.FORUMPAY_API_USER   || 'ae334300-b206-44b8-a5d0-a27fef8c25ed';
const FORUMPAY_SECRET  = process.env.FORUMPAY_API_SECRET || '47b4FnhONLlxVM6Zj6ht9JNTg5G765d-zpUOFz-VbGjFpEyyNAQVvwu3WPHt';
const FORUMPAY_POS_ID  = process.env.FORUMPAY_POS_ID     || '35bfa16d-0462-4bf8-b722-af0a6f6ca49e';

const AUTH = 'Basic ' + Buffer.from(`${FORUMPAY_USER}:${FORUMPAY_SECRET}`).toString('base64');

// Supported currencies shown in UI (symbol → display label + network label)
const CURRENCIES = [
  { id: 'USDT_TRC20',  name: 'USDT',    network: 'TRC-20',  icon: '₮' },
  { id: 'USDT',        name: 'USDT',    network: 'ERC-20',  icon: '₮' },
  { id: 'USDT_POLYGON',name: 'USDT',    network: 'Polygon', icon: '₮' },
  { id: 'USDT_SOLANA', name: 'USDT',    network: 'Solana',  icon: '₮' },
  { id: 'USDC',        name: 'USDC',    network: 'ERC-20',  icon: '$' },
  { id: 'BTC',         name: 'Bitcoin', network: 'BTC',     icon: '₿' },
  { id: 'ETH',         name: 'Ethereum',network: 'ETH',     icon: 'Ξ' },
  { id: 'LTC',         name: 'Litecoin',network: 'LTC',     icon: 'Ł' },
];

async function fpFetch(path, params = {}) {
  const qs = new URLSearchParams({ pos_id: FORUMPAY_POS_ID, ...params }).toString();
  const url = `${FORUMPAY_API}${path}?${qs}`;
  console.log('[ForumPay] GET', url.replace(FORUMPAY_POS_ID, '***'));
  const r = await fetch(url, {
    headers: { Authorization: AUTH, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (data.err) throw new Error(`ForumPay error: ${data.err} (${data.err_code})`);
  return data;
}

async function fpPost(path, params = {}) {
  const body = new URLSearchParams({ pos_id: FORUMPAY_POS_ID, ...params });
  const url  = `${FORUMPAY_API}${path}`;
  console.log('[ForumPay] POST', path);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (data.err) throw new Error(`ForumPay error: ${data.err} (${data.err_code})`);
  return data;
}

/** Get live rate for a currency. Returns { rate, amount_crypto, network_processing_fee, ... } */
async function getRate(invoiceAmount, currency) {
  return fpFetch('/GetRate', {
    invoice_currency: 'USD',
    invoice_amount:   String(invoiceAmount),
    currency,
  });
}

/** Start a payment. Returns { payment_id, address, amount, notice, ... } */
async function startPayment({ invoiceAmount, currency, orderId, ipnUrl }) {
  return fpPost('/StartPayment', {
    invoice_currency: 'USD',
    invoice_amount:   String(invoiceAmount),
    currency,
    reference_no:     orderId,
    ipn_url:          ipnUrl,
  });
}

/** Check payment status. Returns { status, confirmed_amount, unconfirmed_amount, ... } */
async function checkPayment(paymentId) {
  return fpFetch('/CheckPayment', { payment_id: paymentId });
}

/** Cancel a pending payment */
async function cancelPayment(paymentId) {
  return fpFetch('/CancelPayment', { payment_id: paymentId });
}

/** Map ForumPay status → our internal status */
function mapStatus(fpStatus) {
  // ForumPay statuses: 0=new, 1=waiting, 2=confirming, 3=confirmed, 4=cancelled, 5=failed
  const map = {
    '0': 'waiting',   // new
    '1': 'waiting',   // waiting for payment
    '2': 'confirming',// payment seen, awaiting confirmations
    '3': 'confirmed', // confirmed
    '4': 'expired',   // cancelled
    '5': 'failed',    // failed
    // Also handle string names
    'new':        'waiting',
    'waiting':    'waiting',
    'confirming': 'confirming',
    'confirmed':  'confirmed',
    'cancelled':  'expired',
    'failed':     'failed',
  };
  return map[String(fpStatus)] || 'waiting';
}

module.exports = { CURRENCIES, getRate, startPayment, checkPayment, cancelPayment, mapStatus, FORUMPAY_API, AUTH: 'Basic ' + Buffer.from(`${FORUMPAY_USER}:${FORUMPAY_SECRET}`).toString('base64'), FORUMPAY_POS_ID };
