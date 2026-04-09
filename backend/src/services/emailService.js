/**
 * Email Service — MFT transactional emails via Resend
 * 
 * Setup: Sign up at resend.com, get API key, add to Railway env:
 *   RESEND_API_KEY=re_xxxxxxxxxxxx
 *   EMAIL_FROM=MFT <noreply@yourdomain.com>
 * 
 * Free tier: 3,000 emails/month — plenty for early stage
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'MyFundedTournament <noreply@myfundedtournament.com>';
const SITE_URL = process.env.FRONTEND_URL || 'https://myfundedtournament.vercel.app';

// Send via Resend REST API (no package dependency issues)
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log(`[Email] RESEND_API_KEY not set — skipping email to ${to}: ${subject}`);
    return { skipped: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Resend API error');
    console.log(`[Email] Sent "${subject}" to ${to} — id: ${data.id}`);
    return data;
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
    return { error: err.message };
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MyFundedTournament</title>
</head>
<body style="margin:0;padding:0;background:#050810;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#FFD700;border-radius:10px;padding:8px 16px;">
        <span style="font-size:18px;font-weight:900;color:#000;letter-spacing:-0.5px;">MFT</span>
      </div>
      <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,.4);">MyFundedTournament</div>
    </div>
    <!-- Content -->
    <div style="background:#0d1219;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="margin-top:24px;text-align:center;font-size:12px;color:rgba(255,255,255,.25);">
      <p>MyFundedTournament · 90-Minute Trading Battles · myfundedtournament.com</p>
      <p><a href="${SITE_URL}" style="color:rgba(255,215,0,.6);text-decoration:none;">${SITE_URL}</a></p>
    </div>
  </div>
</body>
</html>`;
}

function btn(text, url, color = '#FFD700', textColor = '#000') {
  return `<a href="${url}" style="display:inline-block;background:${color};color:${textColor};font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;text-decoration:none;margin-top:20px;">${text}</a>`;
}

// ── Email functions ──────────────────────────────────────────────────────────

/** Payment confirmed — entry activated */
async function sendPaymentConfirmed({ email, username, tournamentName, entryFee, tournamentId }) {
  const name = username || email.split('@')[0];
  return sendEmail({
    to: email,
    subject: `✅ You're in! ${tournamentName} battle`,
    html: baseTemplate(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#22C55E;">Payment Confirmed!</h2>
      <p style="color:rgba(255,255,255,.65);line-height:1.7;margin:0 0 16px;">
        Hey ${name}, your $${entryFee} USDT payment has been confirmed. 
        You're registered for <strong style="color:#fff;">${tournamentName}</strong>!
      </p>
      <div style="background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.2);border-radius:10px;padding:16px;margin:20px 0;">
        <div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:6px;">NEXT STEPS</div>
        <p style="color:rgba(255,255,255,.75);margin:0;line-height:1.7;font-size:14px;">
          1. Keep your MT5 demo account open<br>
          2. Wait for all 25 spots to fill<br>
          3. You'll get another email when battle starts<br>
          4. Trade for 90 minutes — highest % gain wins!
        </p>
      </div>
      ${btn('View Your Battle →', `${SITE_URL}/tournaments/${tournamentId}`)}
    `),
  });
}

/** Battle starting in 5 minutes */
async function sendBattleStarting({ email, username, tournamentName, tournamentId, endTime }) {
  const name = username || email.split('@')[0];
  const endStr = new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sendEmail({
    to: email,
    subject: `⚔️ Battle starts in 5 minutes — ${tournamentName}`,
    html: baseTemplate(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#FFD700;">Your battle starts NOW!</h2>
      <p style="color:rgba(255,255,255,.65);line-height:1.7;margin:0 0 16px;">
        Hey ${name}, <strong style="color:#fff;">${tournamentName}</strong> is starting in 5 minutes. 
        Open MT5 and get ready to trade!
      </p>
      <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:16px;margin:20px 0;">
        <div style="font-size:13px;font-weight:700;color:#EF4444;margin-bottom:6px;">⚠️ IMPORTANT</div>
        <p style="color:rgba(255,255,255,.7);margin:0;font-size:14px;line-height:1.7;">
          Close ALL trades by <strong>${endStr}</strong> (3 min before end).<br>
          Open trades at end time will NOT count towards your score!
        </p>
      </div>
      ${btn('⚔️ Go to Battle →', `${SITE_URL}/tournaments/${tournamentId}`, '#EF4444', '#fff')}
    `),
  });
}

/** You won! Claim your prize */
async function sendWinnerNotification({ email, username, tournamentName, profitPct, prizeAmount, tournamentId }) {
  const name = username || email.split('@')[0];
  return sendEmail({
    to: email,
    subject: `🏆 You won ${tournamentName}! Claim your $${prizeAmount} prize`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:64px;">🏆</div>
      </div>
      <h2 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 16px;color:#FFD700;">
        Congratulations ${name}!
      </h2>
      <p style="color:rgba(255,255,255,.65);line-height:1.7;text-align:center;margin:0 0 20px;">
        You won <strong style="color:#fff;">${tournamentName}</strong> with a 
        <strong style="color:#22C55E;">+${parseFloat(profitPct).toFixed(2)}% gain!</strong>
      </p>
      <div style="background:rgba(255,215,0,.08);border:2px solid rgba(255,215,0,.3);border-radius:14px;padding:24px;text-align:center;margin:20px 0;">
        <div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:8px;">YOUR PRIZE</div>
        <div style="font-size:42px;font-weight:900;color:#FFD700;">$${parseFloat(prizeAmount).toFixed(0)}</div>
        <div style="font-size:13px;color:rgba(255,255,255,.4);margin-top:6px;">Choose: Funded Account (90%) or Instant USDT (80%)</div>
      </div>
      <div style="text-align:center;">
        ${btn('🏆 Claim Your Prize →', `${SITE_URL}/claim/${tournamentId}`, '#FFD700', '#000')}
      </div>
      <p style="color:rgba(255,255,255,.35);font-size:12px;text-align:center;margin-top:20px;">
        Your claim expires in 7 days. Don't wait!
      </p>
    `),
  });
}

/** Battle results (all participants) */
async function sendBattleResults({ email, username, tournamentName, position, profitPct, winnerName, winnerPct, tournamentId }) {
  const name = username || email.split('@')[0];
  const won = position === 1;
  return sendEmail({
    to: email,
    subject: won
      ? `🏆 You won ${tournamentName}!`
      : `📊 ${tournamentName} results — you finished #${position}`,
    html: baseTemplate(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;color:${won?'#FFD700':'#fff'};">
        ${won ? '🏆 You won!' : `Battle results — ${tournamentName}`}
      </h2>
      <p style="color:rgba(255,255,255,.65);line-height:1.7;margin:0 0 20px;">
        Hey ${name}, ${tournamentName} has ended!
      </p>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="color:rgba(255,255,255,.4);font-size:13px;">Your position</span>
          <span style="font-weight:700;color:${won?'#FFD700':'#fff'};font-size:16px;">#${position}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="color:rgba(255,255,255,.4);font-size:13px;">Your gain</span>
          <span style="font-weight:700;color:${parseFloat(profitPct)>0?'#22C55E':'#EF4444'};font-size:16px;">
            ${parseFloat(profitPct)>0?'+':''}${parseFloat(profitPct).toFixed(2)}%
          </span>
        </div>
        ${!won ? `
        <div style="display:flex;justify-content:space-between;">
          <span style="color:rgba(255,255,255,.4);font-size:13px;">Winner (${winnerName})</span>
          <span style="font-weight:700;color:#FFD700;font-size:16px;">+${parseFloat(winnerPct).toFixed(2)}%</span>
        </div>` : ''}
      </div>
      ${won
        ? btn('🏆 Claim Your Prize →', `${SITE_URL}/claim/${tournamentId}`, '#FFD700', '#000')
        : btn('Join Next Battle →', `${SITE_URL}/tournaments`, '#FFD700', '#000')
      }
    `),
  });
}

/** Guild Battle organiser — someone joined */
async function sendOrganiserJoinNotification({ email, username, tournamentName, joinedCount, maxCount, tournamentId }) {
  const name = username || email.split('@')[0];
  return sendEmail({
    to: email,
    subject: `👥 New trader joined your Guild Battle (${joinedCount}/${maxCount})`,
    html: baseTemplate(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#FF6400;">Guild Battle Update</h2>
      <p style="color:rgba(255,255,255,.65);line-height:1.7;margin:0 0 16px;">
        Hey ${name}, a new trader just joined <strong style="color:#fff;">${tournamentName}</strong>!
      </p>
      <div style="background:rgba(255,100,0,.06);border:1px solid rgba(255,100,0,.2);border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
        <div style="font-size:36px;font-weight:900;color:#FF6400;">${joinedCount} / ${maxCount}</div>
        <div style="color:rgba(255,255,255,.4);font-size:13px;margin-top:6px;">spots filled</div>
        ${joinedCount >= maxCount
          ? '<div style="color:#22C55E;font-weight:700;margin-top:10px;">🚀 Battle will start soon!</div>'
          : `<div style="color:rgba(255,255,255,.35);font-size:13px;margin-top:8px;">${maxCount-joinedCount} spots remaining</div>`
        }
      </div>
      ${btn('View Your Battle →', `${SITE_URL}/battle/${tournamentId}`, '#FF6400', '#fff')}
    `),
  });
}

/** Guild Battle organiser — payout ready */
async function sendOrganiserPayout({ email, username, tournamentName, payoutAmount }) {
  const name = username || email.split('@')[0];
  return sendEmail({
    to: email,
    subject: `💰 Your Guild Battle earnings: $${parseFloat(payoutAmount).toFixed(2)} USDT`,
    html: baseTemplate(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#FF6400;">Your Guild Battle Ended!</h2>
      <p style="color:rgba(255,255,255,.65);line-height:1.7;margin:0 0 16px;">
        Hey ${name}, <strong style="color:#fff;">${tournamentName}</strong> has finished. Here are your earnings:
      </p>
      <div style="background:rgba(255,100,0,.06);border:2px solid rgba(255,100,0,.3);border-radius:14px;padding:24px;text-align:center;margin-bottom:20px;">
        <div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:8px;">YOUR ORGANISER EARNINGS</div>
        <div style="font-size:42px;font-weight:900;color:#FF6400;">$${parseFloat(payoutAmount).toFixed(2)}</div>
        <div style="font-size:13px;color:rgba(255,255,255,.4);margin-top:6px;">USDT TRC-20</div>
      </div>
      <p style="color:rgba(255,255,255,.45);font-size:13px;line-height:1.7;">
        Our team will process your payout within 24 hours. Create another Guild Battle anytime!
      </p>
      ${btn('🔥 Create Another Battle →', `${SITE_URL}/guild`, '#FF6400', '#fff')}
    `),
  });
}

module.exports = {
  sendPaymentConfirmed,
  sendBattleStarting,
  sendWinnerNotification,
  sendBattleResults,
  sendOrganiserJoinNotification,
  sendOrganiserPayout,
};
