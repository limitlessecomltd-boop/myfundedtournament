# MyFundedTournament — Quick Setup Guide

## What's Different From v1
- NO smart contracts or blockchain deployment needed
- Payments via NOWPayments (traders pay from Binance, any exchange, or wallet)
- Trading tracked via MetaApi (connects to trader's own MT5 demo account)
- Winner determined by % gain — fairer than absolute profit
- Re-entry system: 5 active, 10 total per tournament
- Full admin panel for payouts, KYC, funded accounts, violations

---

## Step 1 — Accounts to Create

| Service | URL | What For |
|---------|-----|----------|
| MetaApi | app.metaapi.cloud | Connect to trader MT5 accounts |
| NOWPayments | nowpayments.io | Accept USDT entry fees |
| Supabase | supabase.com | Database (free tier) |
| Railway | railway.app | Host backend (free tier) |
| Vercel | vercel.com | Host frontend (free) |
| GitHub | github.com | Store code |

---

## Step 2 — MetaApi Setup

1. Sign up at app.metaapi.cloud
2. Go to API tokens → Create token
3. Copy the token — this goes in your backend .env as METAAPI_TOKEN
4. MetaApi free tier: 5 accounts, 10 API calls/minute
5. For production: upgrade to a paid plan ($30-50/month for 100+ accounts)

---

## Step 3 — NOWPayments Setup

1. Sign up at nowpayments.io
2. Add your USDT wallet address (TRC-20 recommended — lowest fees)
3. Go to Store Settings → IPN Settings
4. Set IPN callback URL to: https://your-backend-url.railway.app/api/payments/webhook
5. Copy your API Key and IPN Secret → backend .env
6. Enable USDT TRC-20 as accepted currency

---

## Step 4 — Database Setup (Supabase)

1. Create project at supabase.com
2. Go to SQL Editor → New Query
3. Open backend/db/migrations/all_migrations.sql
4. Paste all contents → Run
5. Go to Settings → Database → copy Connection String (URI)
6. Paste as DATABASE_URL in backend .env

---

## Step 5 — Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in all values in .env
npm run dev
```

You should see:
```
MyFundedTournament API on port 4000
WebSocket server initialized at /ws
MetaApi sync cron started (every 60s)
Tournament lifecycle cron started
```

---

## Step 6 — Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL
npm run dev
```

Open http://localhost:3000 — you should see the MyFundedTournament website.

---

## Step 7 — Create Admin User

After backend is running, set your user as admin directly in the database:

In Supabase SQL editor:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your@email.com';
```

Then log in at your website and you'll see the Admin link in the navbar.

---

## Step 8 — Create Your First Tournament

1. Go to /admin/tournaments
2. Click "Create Tournament"
3. Fill in name, tier, entry fee, dates
4. Set registration open time (when traders can join)
5. Set start time (when trading begins — accounts locked at this time)
6. Set end time (7 days after start)

---

## Step 9 — Deploy to Production

### Backend (Railway)
1. Push code to GitHub
2. New project on Railway → Deploy from GitHub → select backend folder
3. Add all environment variables from .env
4. Copy your Railway URL (e.g. myfundedtournament-backend.up.railway.app)

### Frontend (Vercel)
1. New project on Vercel → import from GitHub → select frontend folder
2. Set NEXT_PUBLIC_API_URL = https://your-railway-url
3. Set NEXT_PUBLIC_WS_URL = wss://your-railway-url
4. Deploy

---

## How Traders Join

1. Trader registers on your website
2. Clicks "Enter Tournament"
3. Opens a FREE MT5 demo account at Exness/ICMarkets/Tickmill
4. Submits their account number + investor password (read-only)
5. Pays entry fee via NOWPayments link (can pay from Binance — no wallet needed)
6. Payment confirmed → account connected to MetaApi → starts trading
7. Stats update every 60 seconds on their dashboard

---

## How Winner Is Determined

1. Tournament end time reached → backend cron fires
2. Finds entry with highest profit_pct (% gain vs starting balance)
3. Creates funded_account record for winner (status: pending_kyc)
4. Admin panel shows new funded account in queue

---

## Funded Account Workflow (Your Team)

1. Winner appears in /admin/funded-accounts
2. Contact winner → ask them to register at your partner broker
3. Verify their KYC docs → update status to "kyc_done"
4. Fund their account at the broker → update status to "funded"
5. Set to "active" → they can now start trading and request payouts

---

## Payout Workflow

1. Winner requests payout from their profile page
2. Appears in /admin/payouts
3. Your team verifies the profit amount on the broker platform
4. Send USDT to their wallet
5. Enter TX hash → mark as "paid"

---

## Rules Enforced Automatically

| Rule | How |
|------|-----|
| Min 31s trade | Checked on every MetaApi sync — trade excluded from score |
| No hedging | Buy + sell same pair checked on open positions — excluded |
| No deposit | Balance > starting balance → instant disqualify + violation logged |
| Account locked | MT5 login locked in DB at tournament start — no edit possible |

---

## Monthly Costs (Estimate)

| Service | Free Tier | Paid |
|---------|-----------|------|
| MetaApi | 5 accounts | ~$30-50/mo for 100 accounts |
| NOWPayments | Free (1% fee) | Reduced fees on higher volumes |
| Railway | $5 credit/mo | ~$10-20/mo |
| Vercel | Free | Free for most usage |
| Supabase | Free tier | $25/mo if exceeded |
| **Total** | ~$0 to start | ~$65-100/mo at scale |
