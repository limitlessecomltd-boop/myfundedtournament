/**
 * forumPayService.js — ForumPay Payment Gateway v2
 * Endpoints from PHP client: https://github.com/forumpay/payment-gateway-php-client
 * Base URL sandbox: https://sandbox.api.forumpay.com/pay/v2/
 */
const FORUMPAY_BASE   = process.env.FORUMPAY_API_URL    || 'https://sandbox.api.forumpay.com/pay/v2';
const FORUMPAY_USER   = process.env.FORUMPAY_API_USER   || 'ae334300-b206-44b8-a5d0-a27fef8c25ed';
const FORUMPAY_SECRET = process.env.FORUMPAY_API_SECRET || '47b4FnhONLlxVM6Zj6ht9JNTg5G765d-zpUOFz-VbGjFpEyyNAQVvwu3WPHt';
const FORUMPAY_POS_ID = process.env.FORUMPAY_POS_ID     || '35bfa16d-0462-4bf8-b722-af0a6f6ca49e';
const AUTH_HEADER     = 'Basic ' + Buffer.from(FORUMPAY_USER + ':' + FORUMPAY_SECRET).toString('base64');

const CURRENCIES = [
  { id:'USDT_TRC20',   name:'USDT',     network:'TRC-20',  icon:'T', color:'#27A17C' },
  { id:'USDT',         name:'USDT',     network:'ERC-20',  icon:'T', color:'#27A17C' },
  { id:'USDT_POLYGON', name:'USDT',     network:'Polygon', icon:'T', color:'#7F3CDE' },
  { id:'USDT_SOLANA',  name:'USDT',     network:'Solana',  icon:'T', color:'#9945FF' },
  { id:'USDC',         name:'USDC',     network:'ERC-20',  icon:'$', color:'#2775CA' },
  { id:'BTC',          name:'Bitcoin',  network:'BTC',     icon:'B', color:'#F89D2F' },
  { id:'ETH',          name:'Ethereum', network:'ETH',     icon:'E', color:'#828384' },
  { id:'LTC',          name:'Litecoin', network:'LTC',     icon:'L', color:'#385D9A' },
];

async function fpGet(endpoint, params) {
  const clean = {};
  for (const [k, v] of Object.entries(params || {})) { if (v != null) clean[k] = v; }
  const url = FORUMPAY_BASE + '/' + endpoint + '?' + new URLSearchParams(clean).toString();
  console.log('[ForumPay] GET /' + endpoint, Object.keys(clean).join(','));
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  const txt = await res.text();
  let d; try { d = JSON.parse(txt); } catch { throw new Error('ForumPay non-JSON: ' + txt.slice(0,200)); }
  if (d.err || d.error) throw new Error('ForumPay ' + endpoint + ': ' + (d.err||d.error) + ' (' + (d.err_code||'') + ')');
  return d;
}

async function fpPost(endpoint, params) {
  const clean = {};
  for (const [k, v] of Object.entries(params || {})) { if (v != null) clean[k] = v; }
  const url = FORUMPAY_BASE + '/' + endpoint;
  console.log('[ForumPay] POST /' + endpoint, Object.keys(clean).join(','));
  const res = await fetch(url, { method:'POST', headers:{ Authorization:AUTH_HEADER, 'Content-Type':'application/x-www-form-urlencoded', Accept:'application/json' }, body: new URLSearchParams(clean).toString(), signal: AbortSignal.timeout(20000) });
  const txt = await res.text();
  let d; try { d = JSON.parse(txt); } catch { throw new Error('ForumPay non-JSON: ' + txt.slice(0,200)); }
  if (d.err || d.error) throw new Error('ForumPay ' + endpoint + ': ' + (d.err||d.error) + ' (' + (d.err_code||'') + ')');
  return d;
}

async function ping() { return fpGet('Ping', {}); }

async function getRate(invoiceAmount, currency) {
  return fpGet('GetRate', { pos_id: FORUMPAY_POS_ID, invoice_currency:'USD', invoice_amount: String(invoiceAmount), currency, accept_zero_confirmations:'false' });
}

async function startPayment({ invoiceAmount, currency, paymentId, referenceNo, webhookUrl }) {
  return fpPost('StartPayment', {
    pos_id: FORUMPAY_POS_ID, invoice_currency:'USD', invoice_amount: String(invoiceAmount),
    currency, payment_id: paymentId, reference_no: referenceNo,
    accept_zero_confirmations:'false', auto_accept_underpayment:'false', auto_accept_underpayment_min:'0',
    auto_accept_overpayment:'false', auto_accept_late_payment:'false',
    webhook_url: webhookUrl, locale:'en-GB',
  });
}

// CheckPayment REQUIRES all 4: pos_id, currency, payment_id, address
async function checkPayment({ currency, paymentId, address }) {
  return fpGet('CheckPayment', { pos_id: FORUMPAY_POS_ID, currency, payment_id: paymentId, address, locale:'en-GB' });
}

async function cancelPayment({ currency, paymentId, address }) {
  return fpGet('CancelPayment', { pos_id: FORUMPAY_POS_ID, currency, payment_id: paymentId, address, reason:'customer_request', comment:'Cancelled', locale:'en-GB' });
}

async function getCurrencyList() {
  return fpGet('GetCurrencyList', { invoice_currency:'USD', locale:'en-GB' });
}

function mapStatus(s) {
  if (!s) return 'waiting';
  const m = { new:'waiting', waiting:'waiting', in_progress:'waiting', confirming:'confirming', confirmed:'confirmed', cancelled:'expired', canceled:'expired', expired:'expired', failed:'failed', underpaid:'confirming', overpaid:'confirmed', '0':'waiting','1':'waiting','2':'confirming','3':'confirmed','4':'expired','5':'failed' };
  return m[String(s).toLowerCase()] || m[String(s)] || 'waiting';
}

module.exports = { CURRENCIES, ping, getRate, startPayment, checkPayment, cancelPayment, getCurrencyList, mapStatus };
