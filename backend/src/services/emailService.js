/**
 * Email Service — MFT transactional emails via Resend
 * Domain: myfundedtournament.com (verified)
 * From:   MyFundedTournament <noreply@myfundedtournament.com>
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM     = process.env.EMAIL_FROM || 'MyFundedTournament <noreply@myfundedtournament.com>';
const SITE_URL = process.env.FRONTEND_URL || 'https://myfundedtournament.vercel.app';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log(`[Email] RESEND_API_KEY not set — skipping: ${subject} → ${to}`);
    return { skipped: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Resend error');
    console.log(`[Email] ✓ "${subject}" → ${to} (${data.id})`);
    return data;
  } catch (err) {
    console.error(`[Email] ✗ "${subject}" → ${to}:`, err.message);
    return { error: err.message };
  }
}

// ─── Base template ────────────────────────────────────────────────────────────
function base(content, accentColor = '#FFD700') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MyFundedTournament</title>
</head>
<body style="margin:0;padding:0;background:#070b14;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <div style="max-width:580px;margin:0 auto;padding:32px 20px 48px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.2);border-radius:12px;padding:10px 20px;">
        <span style="background:#FFD700;color:#000;font-weight:900;font-size:13px;letter-spacing:-.3px;padding:3px 8px;border-radius:6px;">MFT</span>
        <span style="font-size:14px;font-weight:700;color:#fff;letter-spacing:.02em;">MyFunded<span style="color:#FFD700;">Tournament</span></span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#0d1219;border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden;">
      <div style="height:3px;background:linear-gradient(90deg,${accentColor},${accentColor}88,transparent);"></div>
      <div style="padding:32px 28px;">
        ${content}
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:24px;text-align:center;font-size:12px;color:rgba(255,255,255,.25);line-height:1.8;">
      <p style="margin:0;">MyFundedTournament · 90-Minute Trading Battles</p>
      <p style="margin:4px 0 0;"><a href="${SITE_URL}" style="color:rgba(255,215,0,.5);text-decoration:none;">${SITE_URL}</a></p>
      <p style="margin:8px 0 0;font-size:11px;">You received this because you have an active account on MFT.</p>
    </div>
  </div>
</body>
</html>`;
}

function btn(text, url, bg = '#FFD700', fg = '#000') {
  return `<a href="${url}" style="display:inline-block;background:${bg};color:${fg};font-weight:700;font-size:15px;padding:14px 32px;border-radius:11px;text-decoration:none;margin-top:24px;letter-spacing:.01em;">${text}</a>`;
}

function row(label, value, valueColor = '#fff') {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
    <span style="color:rgba(255,255,255,.4);font-size:13px;">${label}</span>
    <span style="font-weight:700;color:${valueColor};font-size:14px;">${value}</span>
  </div>`;
}

// ─── 1. Payment Confirmed ─────────────────────────────────────────────────────
async function sendPaymentConfirmed({ email: to, username, tournamentName, entryFee, tournamentId }) {
  const name = username || to.split('@')[0];
  return sendEmail({
    to,
    subject: `✅ Entry confirmed — ${tournamentName}`,
    html: base(`
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#22C55E;">Payment Confirmed!</h2>
      <p style="margin:0 0 20px;color:rgba(255,255,255,.5);font-size:13px;">Your spot is secured</p>
      <p style="color:rgba(255,255,255,.7);line-height:1.7;margin:0 0 20px;">
        Hey <strong style="color:#fff;">${name}</strong> — your <strong style="color:#FFD700;">$${entryFee} USDT</strong> entry has been confirmed.
        You're registered for <strong style="color:#fff;">${tournamentName}</strong>. Get ready to trade!
      </p>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:4px 16px;margin-bottom:24px;">
        ${row('Tournament', tournamentName)}
        ${row('Entry fee', `$${entryFee} USDT`, '#FFD700')}
        ${row('Status', '✅ Confirmed', '#22C55E')}
      </div>
      <div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.15);border-radius:12px;padding:16px 20px;margin-bottom:8px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,215,0,.6);margin-bottom:10px;">What happens next</div>
        <ol style="margin:0;padding-left:18px;color:rgba(255,255,255,.65);font-size:14px;line-height:1.9;">
          <li>Keep your MT5 demo account ready</li>
          <li>Wait for all spots to fill — battle auto-starts</li>
          <li>You'll get an email the moment the battle begins</li>
          <li>Trade for 90 minutes — highest % gain wins the prize pool</li>
        </ol>
      </div>
      <div style="text-align:center;">
        ${btn('View Your Battle →', `${SITE_URL}/tournaments/${tournamentId}`)}
      </div>
    `, '#22C55E'),
  });
}

// ─── 2. Battle Starting ───────────────────────────────────────────────────────
async function sendBattleStarting({ email: to, username, tournamentName, tournamentId, endTime }) {
  const name = username || to.split('@')[0];
  const endStr = endTime ? new Date(endTime).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'UTC' }) + ' UTC' : 'check dashboard';
  return sendEmail({
    to,
    subject: `⚔️ Battle is LIVE — ${tournamentName}`,
    html: base(`
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:52px;line-height:1;">⚔️</div>
      </div>
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#FFD700;text-align:center;">Your Battle is LIVE!</h2>
      <p style="text-align:center;color:rgba(255,255,255,.5);margin:0 0 24px;font-size:13px;">${tournamentName}</p>
      <p style="color:rgba(255,255,255,.7);line-height:1.7;margin:0 0 20px;">
        Hey <strong style="color:#fff;">${name}</strong> — all spots are filled and the battle has started.
        Open MT5 <strong style="color:#FFD700;">right now</strong> and start trading. The clock is running!
      </p>
      <div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#EF4444;margin-bottom:10px;">⚠️ Important Rules</div>
        <ul style="margin:0;padding-left:18px;color:rgba(255,255,255,.65);font-size:14px;line-height:2;">
          <li>Close <strong style="color:#fff;">ALL trades</strong> by <strong style="color:#EF4444;">${endStr}</strong> (3 min before end)</li>
          <li>Open trades at end time will <strong>not</strong> count toward your score</li>
          <li>Minimum 31 seconds per trade — shorter trades are excluded</li>
          <li>No hedging — simultaneous BUY+SELL on same pair is disqualified</li>
        </ul>
      </div>
      <div style="text-align:center;">
        ${btn('⚔️ Go to Battle Dashboard →', `${SITE_URL}/tournaments/${tournamentId}`, '#EF4444', '#fff')}
      </div>
    `, '#EF4444'),
  });
}

// ─── 3. Winner Notification ───────────────────────────────────────────────────
async function sendWinnerNotification({ email: to, username, tournamentName, profitPct, prizeAmount, tournamentId }) {
  const name = username || to.split('@')[0];
  const pct  = parseFloat(profitPct || 0);
  const prize = parseFloat(prizeAmount || 0);
  return sendEmail({
    to,
    subject: `🏆 You won ${tournamentName}!${prize > 0 ? ` Claim $${prize.toFixed(0)}` : ''}`,
    html: base(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:64px;line-height:1;">🏆</div>
      </div>
      <h2 style="font-size:26px;font-weight:800;text-align:center;margin:0 0 6px;color:#FFD700;">Congratulations, ${name}!</h2>
      <p style="text-align:center;color:rgba(255,255,255,.5);margin:0 0 24px;font-size:13px;">You're the ${tournamentName} champion</p>
      <div style="background:rgba(255,215,0,.07);border:2px solid rgba(255,215,0,.25);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,215,0,.5);margin-bottom:12px;">Your Result</div>
        <div style="font-size:42px;font-weight:900;color:${pct >= 0 ? '#22C55E' : '#EF4444'};letter-spacing:-2px;line-height:1;">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</div>
        <div style="color:rgba(255,255,255,.4);font-size:13px;margin-top:6px;">% gain on starting balance</div>
        ${prize > 0 ? `
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);">
          <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,215,0,.5);margin-bottom:8px;">Prize Pool</div>
          <div style="font-size:48px;font-weight:900;color:#FFD700;letter-spacing:-2px;line-height:1;">$${prize.toFixed(0)}</div>
        </div>` : ''}
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:4px 16px;margin-bottom:24px;">
        ${row('Option A — Funded Account', prize > 0 ? `$${(prize * 0.9).toFixed(0)} (90%)` : 'Funded Account', '#FFD700')}
        ${row('Option B — Instant USDT', prize > 0 ? `$${(prize * 0.8).toFixed(0)} (80%)` : 'Instant USDT', '#22C55E')}
      </div>
      <p style="color:rgba(255,255,255,.4);font-size:13px;text-align:center;margin:0 0 4px;">⏳ Your claim expires in <strong style="color:#FFD700;">7 days</strong>. Don't wait!</p>
      <div style="text-align:center;">
        ${btn('🏆 Claim Your Prize →', `${SITE_URL}/claim/${tournamentId}`)}
      </div>
    `),
  });
}

// ─── 4. Battle Results (all participants) ─────────────────────────────────────
async function sendBattleResults({ email: to, username, tournamentName, position, profitPct, winnerName, winnerPct, tournamentId }) {
  const name = username || to.split('@')[0];
  const pct  = parseFloat(profitPct || 0);
  const wPct = parseFloat(winnerPct || 0);
  return sendEmail({
    to,
    subject: `📊 ${tournamentName} results — you finished #${position}`,
    html: base(`
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;">Battle Results</h2>
      <p style="margin:0 0 20px;color:rgba(255,255,255,.5);font-size:13px;">${tournamentName} has ended</p>
      <p style="color:rgba(255,255,255,.7);line-height:1.7;margin:0 0 20px;">
        Hey <strong style="color:#fff;">${name}</strong> — the battle is over. Here's how you did:
      </p>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:4px 16px;margin-bottom:20px;">
        ${row('Your position', `#${position}`, position === 1 ? '#FFD700' : '#fff')}
        ${row('Your gain', `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, pct >= 0 ? '#22C55E' : '#EF4444')}
        ${row('Champion', winnerName || 'Unknown', '#FFD700')}
        ${row("Champion's gain", `+${wPct.toFixed(2)}%`, '#FFD700')}
      </div>
      <div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.15);border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,.65);line-height:1.7;">
          Every battle sharpens your edge. Study the leaderboard, refine your strategy, and come back stronger. 
          The next battle is always one entry away.
        </p>
      </div>
      <div style="text-align:center;">
        ${btn('Join Next Battle →', `${SITE_URL}/tournaments`, '#FFD700', '#000')}
      </div>
    `, 'rgba(255,255,255,.3)'),
  });
}

// ─── 5. Guild organiser — player joined ──────────────────────────────────────
async function sendOrganiserJoinNotification({ email: to, username, tournamentName, joinedCount, maxCount, tournamentId }) {
  const name = username || to.split('@')[0];
  const pct  = Math.round((joinedCount / maxCount) * 100);
  const full = joinedCount >= maxCount;
  return sendEmail({
    to,
    subject: `👥 ${joinedCount}/${maxCount} spots filled — ${tournamentName}`,
    html: base(`
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#FF6400;">Guild Battle Update</h2>
      <p style="margin:0 0 20px;color:rgba(255,255,255,.5);font-size:13px;">${tournamentName}</p>
      <p style="color:rgba(255,255,255,.7);line-height:1.7;margin:0 0 20px;">
        Hey <strong style="color:#fff;">${name}</strong> — a new trader just joined your battle!
      </p>
      <div style="background:rgba(255,100,0,.06);border:1px solid rgba(255,100,0,.2);border-radius:14px;padding:24px;text-align:center;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,100,0,.6);margin-bottom:12px;">Spots Filled</div>
        <div style="font-size:48px;font-weight:900;color:#FF6400;letter-spacing:-2px;line-height:1;">${joinedCount}<span style="font-size:24px;color:rgba(255,100,0,.5)"> / ${maxCount}</span></div>
        <!-- Progress bar -->
        <div style="margin-top:16px;background:rgba(255,255,255,.08);border-radius:99px;height:8px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#FF6400,#FFD700);border-radius:99px;"></div>
        </div>
        <div style="margin-top:10px;font-size:13px;color:rgba(255,255,255,.4);">
          ${full ? '<span style="color:#22C55E;font-weight:700;">🚀 All spots filled — battle starting now!</span>' : `${maxCount - joinedCount} spot${maxCount - joinedCount !== 1 ? 's' : ''} remaining`}
        </div>
      </div>
      <div style="text-align:center;">
        ${btn('View Your Battle →', `${SITE_URL}/battle/${tournamentId}`, '#FF6400', '#fff')}
      </div>
    `, '#FF6400'),
  });
}

// ─── 6. Guild organiser — payout ─────────────────────────────────────────────
async function sendOrganiserPayout({ email: to, username, tournamentName, payoutAmount }) {
  const name   = username || to.split('@')[0];
  const amount = parseFloat(payoutAmount || 0);
  return sendEmail({
    to,
    subject: `💰 Your Guild Battle earnings: $${amount.toFixed(2)} USDT — ${tournamentName}`,
    html: base(`
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#FF6400;">Guild Battle Complete!</h2>
      <p style="margin:0 0 20px;color:rgba(255,255,255,.5);font-size:13px;">${tournamentName} has ended</p>
      <p style="color:rgba(255,255,255,.7);line-height:1.7;margin:0 0 20px;">
        Hey <strong style="color:#fff;">${name}</strong> — your battle has finished. Here are your organiser earnings:
      </p>
      <div style="background:rgba(255,100,0,.06);border:2px solid rgba(255,100,0,.25);border-radius:14px;padding:28px;text-align:center;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,100,0,.6);margin-bottom:12px;">Your Earnings</div>
        <div style="font-size:52px;font-weight:900;color:#FF6400;letter-spacing:-2px;line-height:1;">$${amount.toFixed(2)}</div>
        <div style="color:rgba(255,255,255,.4);font-size:13px;margin-top:8px;">USDT TRC-20</div>
      </div>
      <p style="color:rgba(255,255,255,.45);font-size:13px;line-height:1.7;text-align:center;margin:0 0 24px;">
        Our team will process your payout within 24 hours to your registered wallet. 
        Ready to run another one?
      </p>
      <div style="text-align:center;">
        ${btn('🔥 Create Another Battle →', `${SITE_URL}/guild`, '#FF6400', '#fff')}
      </div>
    `, '#FF6400'),
  });
}


// ─── 7. Welcome / Signup ─────────────────────────────────────────────────────
async function sendWelcome({ email: to, username }) {
  const name = username || to.split('@')[0];
  return sendEmail({
    to,
    subject: `Welcome to MyFundedTournament, ${name}! 🏆`,
    html: base(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:52px;line-height:1;">🏆</div>
      </div>
      <h2 style="font-size:24px;font-weight:800;text-align:center;margin:0 0 6px;color:#FFD700;">Welcome, ${name}!</h2>
      <p style="text-align:center;color:rgba(255,255,255,.5);margin:0 0 24px;font-size:13px;">Your account is ready</p>
      <p style="color:rgba(255,255,255,.7);line-height:1.7;margin:0 0 20px;">
        You've joined the most competitive 90-minute trading battle platform. 
        Enter a battle, trade your MT5 demo, and if you have the highest % gain — 
        you win a <strong style="color:#FFD700;">real funded trading account</strong>. No evaluation. No demo phase. Just win.
      </p>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:4px 16px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <span style="color:rgba(255,255,255,.4);font-size:13px;">Battle Duration</span>
          <span style="font-weight:700;color:#fff;font-size:14px;">90 Minutes</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <span style="color:rgba(255,255,255,.4);font-size:13px;">1st Prize — Funded Account</span>
          <span style="font-weight:700;color:#FFD700;font-size:14px;">90% of prize pool</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <span style="color:rgba(255,255,255,.4);font-size:13px;">1st Prize — Instant USDT</span>
          <span style="font-weight:700;color:#22C55E;font-size:14px;">80% of prize pool</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
          <span style="color:rgba(255,255,255,.4);font-size:13px;">Entry Fee</span>
          <span style="font-weight:700;color:#fff;font-size:14px;">From $25 USDT</span>
        </div>
      </div>
      <div style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.15);border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,215,0,.6);margin-bottom:10px;">How to get started</div>
        <ol style="margin:0;padding-left:18px;color:rgba(255,255,255,.65);font-size:14px;line-height:2;">
          <li>Connect your MT5 demo at Exness, ICMarkets or Tickmill</li>
          <li>Pay the entry fee in USDT via ForumPay</li>
          <li>Trade for 90 minutes — highest % gain wins</li>
          <li>Choose your prize: funded account or instant USDT</li>
        </ol>
      </div>
      <div style="text-align:center;">
        ${btn('Browse Battles →', `${SITE_URL}/tournaments`)}
      </div>
      <p style="text-align:center;color:rgba(255,255,255,.25);font-size:12px;margin-top:20px;">
        Want to run your own battle for your community? Check out <a href="${SITE_URL}/guild" style="color:rgba(255,215,0,.5);text-decoration:none;">Guild Battles ⚔️</a>
      </p>
    `),
  });
}

module.exports = {
  sendWelcome,
  sendPaymentConfirmed,
  sendBattleStarting,
  sendWinnerNotification,
  sendBattleResults,
  sendOrganiserJoinNotification,
  sendOrganiserPayout,
};
