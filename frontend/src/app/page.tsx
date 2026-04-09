"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { BulletTrain } from "@/components/ui/BulletTrain";
import { tournamentApi } from "@/lib/api";

// ── Two Plans ─────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Starter Bullet",
    tagline: "Chance to win $500 in 90 Minutes only.",
    fee: "$25 USDT",
    color: "#FFD700",
    bg: "rgba(255,215,0,.07)",
    border: "rgba(255,215,0,.28)",
    maxEntries: 25,
    features: [
      "A 90 Minutes trading battle",
      "Starts with $1,000 demo balance",
      "1 re-entry allowed per battle",
      "Track total collection live in dashboard",
      "Winner gets 90% funded account — no evaluation",
                  "Battle starts when all 25 spots fill",
    ],
  },
  {
    name: "Pro Bullet",
    tagline: "Chance to win $1,000 in 90 Minutes only.",
    fee: "$50 USDT",
    color: "#22C55E",
    bg: "rgba(34,197,94,.06)",
    border: "rgba(34,197,94,.25)",
    maxEntries: 25,
    featured: true,
    features: [
      "A 90 Minutes trading battle",
      "Starts with $1,000 demo balance",
      "1 re-entry allowed per battle",
      "Track total collection live in dashboard",
      "Winner gets 90% funded account — no evaluation",
                  "Battle starts when all 25 spots fill",
    ],
  },
];

const PRIZES = [
  { place:"1st", medal:"🥇", color:"#FFD700", bg:"rgba(255,215,0,.06)", border:"rgba(255,215,0,.2)", label:"Tournament Champion", reward:"90% Funded Account", detail:"Live broker account — trade with real capital", cert:"Gold Certificate issued on-chain", featured:true },
  { place:"1st", medal:"💵", color:"#22C55E", bg:"rgba(34,197,94,.05)", border:"rgba(34,197,94,.2)", label:"Instant Cashout Option", reward:"80% USDT Cashout", detail:"Prefer cash? Take 80% instantly in USDT", cert:"Gold Certificate issued on-chain", featured:false },
];

const STEPS = [
  { n:"01", title:"Register & pay entry", desc:"Pay USDT via crypto link or wallet. Works from Binance or any exchange — no personal wallet needed.", icon:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" },
  { n:"02", title:"Open your MT5 demo", desc:"Create a free demo at Exness, ICMarkets or Tickmill. Submit your investor (read-only) password.", icon:"M22 12h-4l-3 9L9 3l-3 9H2" },
  { n:"03", title:"Trade Actively till End", desc:"We track your % gain live via MetaApi every 60 seconds. Close all trades 3 minutes before the 90-minute mark.", icon:"M18 20V10M12 20V4M6 20v-6" },
  { n:"04", title:"Win your funded account", desc:"Highest % gain wins the prize pool! Choose your reward: 90% as a live funded broker account with real capital, or 80% as instant USDT cashout. Only the champion is rewarded — no evaluation needed.", icon:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
];

const RULES = [
  { title:"Min 31s per trade", desc:"Trades closed in under 31 seconds are excluded from your score — not a disqualification.", color:"#FFD700" },
  { title:"No hedging", desc:"Simultaneous buy and sell on the same pair are excluded from score.", color:"#60a5fa" },
  { title:"No external deposit", desc:"Adding funds to your demo after tournament start = instant disqualification.", color:"#EF4444" },
  { title:"Close all trades 3 min early", desc:"All trades must be closed at least 3 minutes before the 90-minute mark or they won't count.", color:"#22C55E" },
];

const COMPARISON = [
  { feature:"Min. Cost",            mft:"$25",           ftmo:"$155+",                       broker:"$10+" },
  { feature:"Evaluation Required",  mft:"❌ None",        ftmo:"✅ Mandatory",                 broker:"N/A" },
  { feature:"Payout Denial",        mft:"❌ Never",       ftmo:"⚠️ Possible",                  broker:"⚠️ Possible" },
  { feature:"Demo Account Risk",    mft:"✅ Zero",        ftmo:"❌ Real evaluation",            broker:"❌ Real money" },
  { feature:"Re-entries",           mft:"✅ 1 re-entry",  ftmo:"❌ No re-entry in same eval",   broker:"N/A" },
  { feature:"Prize Transparency",   mft:"✅ 100% live",   ftmo:"❌ Fixed payouts",              broker:"❌ Spread-based" },
  { feature:"Time to First Payout", mft:"90 Minutes",    ftmo:"14 / 30 days",                 broker:"Varies" },
  { feature:"Profit Share",         mft:"90%",           ftmo:"80–90%",                       broker:"100% (high risk)" },
  { feature:"Beginner-Friendly",    mft:"✅ Yes",         ftmo:"❌ Hard",                       broker:"⚠️ Risky" },
];

const FAQS = [
  { q:"What is MyFundedTournament?", a:"MyFundedTournament is a 90-minute forex trading battle where traders pay a small USDT entry fee to compete on MT5 demo accounts. The trader with the highest % gain wins a real funded trading account — no evaluation needed." },
  { q:"How long is each battle?", a:"Each battle is exactly 90 minutes. The countdown starts automatically once 25 traders have joined. You must close all your trades at least 3 minutes before the end." },
  { q:"How many traders compete per battle?", a:"Exactly 25 traders per battle — for both Starter Bullet ($25) and Pro Bullet ($50). Are you good enough to beat just 25 traders? The small field makes every battle winnable." },
  { q:"How many re-entries can I make?", a:"You get 1 re-entry per tournament. If your first entry doesn't go well, you can enter once more with a fresh MT5 demo account for another chance to win." },
  { q:"When does a battle start?", a:"The 90-minute battle starts automatically once all 25 spots are filled. After the last spot fills, there's a 5-minute prep window, then the countdown begins for everyone." },
  { q:"What is the 3-minute close rule?", a:"All open trades must be closed at least 3 minutes before the 90-minute end time. Any trade still open in the final 3 minutes will NOT count toward your score. The circle turns red to warn you." },
  { q:"Do I need a real trading account?", a:"No. You open a free MT5 demo account at Exness, ICMarkets, or Tickmill. You only submit your investor (read-only) password — we never touch your real funds." },
  { q:"How is the winner decided?", a:"The trader with the highest percentage gain on their starting $1,000 demo balance wins. Purely performance-based — best trader in 90 minutes wins, period." },
  { q:"How do I pay the entry fee?", a:"Entry fees are paid in crypto via ForumPay. Choose from USDT, BTC, ETH, LTC and more. Pay directly from any wallet or exchange — no account required." },
  { q:"What does the winner receive?", a:"The winner gets their choice: either 90% of the prize pool as a real funded trading account (live broker, real capital, daily withdrawals), OR 80% of the prize pool as an instant USDT cashout. Only the 1st place winner is rewarded. For a $25 entry with 25 traders: pool is $625, so winner gets $562.50 funded account or $500 instant USDT." },
  { q:"What is a Guild Battle?", a:"Guild Battle is our custom battle program for community organisers. You set the entry fee, player count (5–200), and winner payout percentage (50–90%). You earn an organiser share automatically when the battle ends. Platform always takes a flat 10%. Perfect for trading communities, Discord servers, or group challenges." },
  { q:"How much do I earn as a Guild Battle organiser?", a:"You keep whatever is left after the winner's share and the 10% platform fee. Example: if you set winner at 80%, you get 10% (platform gets 10%). On a $1,000 prize pool that means $800 to winner, $100 to you, $100 to platform. You can set winner % between 50% and 90% — giving you between 0% and 40% as organiser." },
  { q:"Who can create a Guild Battle?", a:"Any registered MFT user can create a Guild Battle. Simply go to the Guild Battle section, set your parameters, and share the link with your community. The battle auto-starts when all spots are filled, just like standard battles." },
];



export default function HomePage() {
  // Live tournament data from API
  const [liveTournaments, setLiveTournaments] = useState<any[]>([]);
  const [guildBattles,    setGuildBattles]    = useState<any[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [traderCount, setTraderCount] = useState(0);

  useEffect(() => {
    const load = () => {
      tournamentApi.getAll("all")
        .then(data => {
          setLiveTournaments(data);
          // Count: both active AND registration battles count as "live"
          const open = data.filter((t:any) => ["active","registration"].includes(t.status));
          setLiveCount(open.length);
          // Total unique traders across all open battles
          const total = open.reduce((s:number,t:any) => s + parseInt(String(t.unique_traders||0)), 0);
          setTraderCount(total);
          // Guild battles for homepage — max 3
          const gOpen = open.filter((t:any) => t.tier === 'guild' || t.tier_type === 'guild').slice(0,3);
          setGuildBattles(gOpen);
        })
        .catch(() => {});
    };
    load();
    // Refresh every 30s
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  // Get live data for a specific plan tier
  function getPlanData(tier: string) {
    const t = liveTournaments.find(t => t.tier === tier && ["registration","active"].includes(t.status));
    return {
      joined: parseInt(String(t?.active_entries || 0)),
      max: t?.max_entries || 25,
      endTime: t?.end_time ? new Date(t.end_time) : null,
      status: t?.status || "registration",
    };
  }

  return (
    <div style={{ background:"#050810", overflowX:"hidden" }}>
      <style>{`
        @media(max-width:768px){
          .hero-grid{ grid-template-columns:1fr !important; padding:28px 16px 20px !important; }
          .hero-photo{ display:none !important; }
          .hero-actions{ flex-direction:column !important; }
          .hero-actions a,.hero-actions button{ width:100% !important; justify-content:center !important; }
          .stats-bar{ grid-template-columns:1fr 1fr !important; padding:0 16px !important; }
          .plans-grid{ grid-template-columns:1fr !important; }
          .prize-grid{ grid-template-columns:1fr !important; }
          .rules-2col{ grid-template-columns:1fr !important; gap:28px !important; }
          .steps-grid{ grid-template-columns:1fr 1fr !important; }
          .comp-wrap{ overflow-x:auto; }
          .comp-wrap table{ min-width:500px; }
          .faq-list{ grid-template-columns:1fr !important; }
          .broker-grid{ grid-template-columns:1fr !important; }
          .page-pad-inner{ padding-left:16px !important; padding-right:16px !important; }
          .sec-title{ font-size:24px !important; }
          .section-title{ font-size:22px !important; }
          .cta-h{ font-size:28px !important; }
        }
        @media(max-width:480px){
          .stats-bar{ grid-template-columns:1fr !important; }
          .steps-grid{ grid-template-columns:1fr !important; }
          .prize-grid{ grid-template-columns:1fr !important; }
        }
      `}</style>
      <style>{`
        @media(max-width:900px){
          .hero-grid{grid-template-columns:1fr !important;}
          .hero-photo{display:none !important;}
          .stats-bar{grid-template-columns:1fr 1fr !important;}
          .grid-3-r{grid-template-columns:1fr !important;}
          .grid-4-r{grid-template-columns:1fr 1fr !important;}
          .plans-grid{grid-template-columns:1fr !important;}
          .rules-2col{grid-template-columns:1fr !important;gap:32px !important;}
          .page-pad{padding:48px 20px !important;}
          .hero-pad{padding:48px 20px 32px !important;}
          .faq-pad{padding:48px 20px !important;}
          .cta-h{font-size:28px !important;}
          .sec-title{font-size:26px !important;}
        }
        @media(max-width:560px){
          .grid-4-r{grid-template-columns:1fr !important;}
          .stats-bar{grid-template-columns:1fr !important;}
          .comp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        }
        details summary::-webkit-details-marker{display:none;}
      `}</style>

      {/* ═══ HERO ═══ */}
      <section className="hero-pad hero-grid" style={{ maxWidth:1280, margin:"0 auto", padding:"52px 48px 36px", display:"grid", gridTemplateColumns:"1fr 480px", gap:56, alignItems:"center" }}>
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background:"radial-gradient(ellipse 700px 600px at 68% 38%, rgba(34,197,94,.06) 0%, transparent 70%), radial-gradient(ellipse 500px 400px at 12% 65%, rgba(255,215,0,.04) 0%, transparent 60%)" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.22)", borderRadius:100, padding:"6px 16px 6px 10px", fontSize:13, fontWeight:600, color:"#FFD700", marginBottom:28 }}>
            <span className="live-dot"/>{liveCount} Live Battle{liveCount !== 1 ? "s" : ""} &middot; {traderCount} Active Trader{traderCount !== 1 ? "s" : ""}
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:"clamp(40px,4.8vw,64px)", fontWeight:800, lineHeight:1.08, letterSpacing:"-2px", marginBottom:22, color:"#fff" }}>
            Your Community.<br/>
            <span style={{ color:"#FFD700" }}>Your Battle.</span>{" "}
            <span style={{ color:"rgba(255,255,255,.42)" }}>Real Funding on the Line.</span>
          </h1>
          <p style={{ fontSize:17, color:"rgba(255,255,255,.58)", lineHeight:1.75, maxWidth:500, marginBottom:28 }}>
            Join a public battle or launch your own <strong style={{ color:"#FFD700", fontWeight:700 }}>Guild Battle</strong> for your trading community. Entry fees build the prize pool — the best trader wins a <strong style={{ color:"rgba(255,255,255,.85)", fontWeight:600 }}>real funded account</strong> or <strong style={{ color:"#22C55E", fontWeight:600 }}>instant USDT cashout.</strong>
          </p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:32 }}>
            <span className="pill" style={{background:"rgba(139,92,246,.15)",border:"1px solid rgba(139,92,246,.35)",color:"#a78bfa"}}>⚔️ Guild Battles</span>
            <span className="pill pill-gold">Public Battles</span>
            <span className="pill pill-blue">90 Min · Zero Evaluation</span>
          </div>
          <div className="hero-actions" style={{ display:"flex", gap:14, marginBottom:36, flexWrap:"wrap" }}>
            <Link href="/tournaments" className="btn btn-primary btn-lg">Join a Battle Now</Link>
            <Link href="/how-it-works" className="btn btn-ghost btn-lg">How It Works</Link>
          </div>
          <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
            {["Set your own entry fee","Earn as organiser","No payout denial ever"].map(t=>(
              <div key={t} style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:"rgba(255,255,255,.45)", fontWeight:500 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>{t}
              </div>
            ))}
          </div>
        </div>

        {/* Hero Visual — clean SVG, no competitor branding */}
        <div className="hero-photo" style={{ position:"relative", zIndex:1 }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"radial-gradient(circle at 50% 60%, rgba(255,215,0,.13) 0%, rgba(34,197,94,.07) 45%, transparent 70%)", transform:"scale(1.05)" }}/>
          <div style={{ position:"absolute", inset:"-4%", borderRadius:"50%", border:"1px solid rgba(255,215,0,.14)" }}/>
          <div style={{ position:"absolute", inset:"-10%", borderRadius:"50%", border:"1px solid rgba(255,215,0,.07)" }}/>
          <div style={{ position:"relative" }}>
            <svg width="480" height="480" viewBox="0 0 480 500" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", height:"auto", display:"block" }}>
              {/* Dark background circle */}
              <circle cx="240" cy="240" r="220" fill="#0a0f1e" opacity="0.8"/>
              <circle cx="240" cy="240" r="200" fill="none" stroke="rgba(255,215,0,0.08)" strokeWidth="1"/>

              {/* Chart candlestick visualization */}
              {/* Bullish candles - green */}
              <rect x="80" y="280" width="18" height="80" rx="3" fill="rgba(34,197,94,0.15)" stroke="#22C55E" strokeWidth="1.5"/>
              <rect x="88" y="260" width="2" height="22" fill="#22C55E"/>
              <rect x="88" y="358" width="2" height="20" fill="#22C55E"/>

              <rect x="110" y="240" width="18" height="100" rx="3" fill="rgba(34,197,94,0.2)" stroke="#22C55E" strokeWidth="1.5"/>
              <rect x="118" y="220" width="2" height="22" fill="#22C55E"/>
              <rect x="118" y="338" width="2" height="22" fill="#22C55E"/>

              <rect x="140" y="200" width="18" height="110" rx="3" fill="rgba(34,197,94,0.25)" stroke="#22C55E" strokeWidth="1.5"/>
              <rect x="148" y="180" width="2" height="22" fill="#22C55E"/>
              <rect x="148" y="308" width="2" height="22" fill="#22C55E"/>

              {/* Bearish candle - red */}
              <rect x="170" y="220" width="18" height="70" rx="3" fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="1.5"/>
              <rect x="178" y="200" width="2" height="22" fill="#EF4444"/>
              <rect x="178" y="288" width="2" height="22" fill="#EF4444"/>

              {/* Strong bullish run */}
              <rect x="200" y="170" width="18" height="120" rx="3" fill="rgba(34,197,94,0.3)" stroke="#22C55E" strokeWidth="1.5"/>
              <rect x="208" y="148" width="2" height="24" fill="#22C55E"/>
              <rect x="208" y="288" width="2" height="20" fill="#22C55E"/>

              <rect x="230" y="130" width="18" height="130" rx="3" fill="rgba(34,197,94,0.35)" stroke="#22C55E" strokeWidth="1.5"/>
              <rect x="238" y="108" width="2" height="24" fill="#22C55E"/>
              <rect x="238" y="258" width="2" height="22" fill="#22C55E"/>

              <rect x="260" y="100" width="18" height="140" rx="3" fill="rgba(34,197,94,0.4)" stroke="#22C55E" strokeWidth="1.5"/>
              <rect x="268" y="78" width="2" height="24" fill="#22C55E"/>
              <rect x="268" y="238" width="2" height="22" fill="#22C55E"/>

              {/* Small dip */}
              <rect x="290" y="130" width="18" height="80" rx="3" fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="1.5"/>
              <rect x="298" y="110" width="2" height="22" fill="#EF4444"/>
              <rect x="298" y="208" width="2" height="22" fill="#EF4444"/>

              {/* Final big bull candle */}
              <rect x="320" y="80" width="18" height="160" rx="3" fill="rgba(34,197,94,0.5)" stroke="#22C55E" strokeWidth="2"/>
              <rect x="328" y="58" width="2" height="24" fill="#22C55E"/>
              <rect x="328" y="238" width="2" height="24" fill="#22C55E"/>

              <rect x="350" y="60" width="18" height="170" rx="3" fill="rgba(34,197,94,0.6)" stroke="#22C55E" strokeWidth="2"/>
              <rect x="358" y="38" width="2" height="24" fill="#22C55E"/>
              <rect x="358" y="228" width="2" height="24" fill="#22C55E"/>

              {/* Trend line */}
              <polyline points="89,360 119,320 149,290 179,270 209,230 239,195 269,160 299,180 329,140 359,110"
                fill="none" stroke="rgba(255,215,0,0.6)" strokeWidth="2" strokeDasharray="none" strokeLinecap="round"/>

              {/* +% gain badge — top center, clear of candles */}
              <rect x="158" y="22" width="164" height="46" rx="10" fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.5)" strokeWidth="1.5"/>
              <text x="240" y="41" textAnchor="middle" fill="#22C55E" fontSize="14" fontWeight="800" fontFamily="'Space Grotesk',system-ui,sans-serif">+47.3% gain</text>
              <text x="240" y="58" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="system-ui,sans-serif">XAUUSD · 90 min battle</text>

              {/* Bottom axis line */}
              <line x1="70" y1="390" x2="410" y2="390" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

              {/* Glow effect behind chart */}
              <ellipse cx="240" cy="240" rx="150" ry="120" fill="rgba(34,197,94,0.04)"/>
            </svg>
            <div style={{ position:"absolute", bottom:"30%", left:"50%", transform:"translateX(-50%)", background:"rgba(5,8,16,.82)", border:"1.5px solid rgba(255,215,0,.55)", borderRadius:10, padding:"6px 18px", backdropFilter:"blur(10px)", textAlign:"center", whiteSpace:"nowrap" }}>
              <div style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontWeight:900, fontSize:15, color:"#FFD700", letterSpacing:"2px" }}>MFT</div>
              <div style={{ fontSize:9.5, color:"rgba(255,255,255,.6)", letterSpacing:"0.6px", marginTop:1 }}>MyFundedTournament</div>
            </div>
            <div style={{ position:"absolute", top:"10%", left:"-8%", background:"rgba(10,14,24,.95)", border:"1px solid rgba(34,197,94,.4)", borderRadius:14, padding:"10px 16px" }}>
              <div style={{ fontSize:22, fontWeight:900, color:"#22C55E", lineHeight:1 }}>90%</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:3 }}>Winner Prize</div>
            </div>
            <div style={{ position:"absolute", top:"14%", right:"-8%", background:"rgba(10,14,24,.95)", border:"1px solid rgba(255,215,0,.4)", borderRadius:14, padding:"10px 16px" }}>
              <div style={{ fontSize:22, fontWeight:900, color:"#FFD700", lineHeight:1 }}>$25</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:3 }}>Start from</div>
            </div>
            <div style={{ position:"absolute", bottom:"10%", left:"-8%", background:"rgba(10,14,24,.95)", border:"1px solid rgba(255,215,0,.4)", borderRadius:14, padding:"10px 16px" }}>
              <div style={{ fontSize:22, fontWeight:900, color:"#FFD700", lineHeight:1 }}>90m</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:3 }}>Battle Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.85)", marginTop:16 }}>
        <div className="stats-bar" style={{ maxWidth:1280, margin:"0 auto", padding:"0 48px", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            { val:"Transparent",  label:"Prize Money",                       color:"#FFD700" },
            { val:"90 Min",       label:"Trading Battle",                    color:"#22C55E" },
            { val:"90%",          label:"Funded Account Prize",              color:"#fff" },
            { val:"100%",         label:"Drawdown Limit on Funded Account",  color:"#60a5fa" },
          ].map(({ val, label, color })=>(
            <div key={label} style={{ padding:"26px 20px", borderRight:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
              <div style={{ fontSize:"clamp(22px,2.8vw,32px)", fontWeight:900, color, letterSpacing:"-1px", marginBottom:6, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{val}</div>
              <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"rgba(255,255,255,.42)", fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ PRIZE STRUCTURE ═══ */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Prize Structure</div>
          <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>What winners receive</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:520, margin:"0 auto" }}>The champion takes all. Choose 90% as a real funded trading account with daily withdrawals, or 80% as instant USDT cashout — paid within 24 hours. No evaluation. No demo phase. Just win.</p>
        </div>
        <div className="grid-3-r" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:22, maxWidth:760, margin:"0 auto" }}>
          {PRIZES.map(p=>(
            <div key={p.place} style={{ background:p.bg, border:`1px solid ${p.border}`, borderRadius:18, padding:30, position:"relative" }}>
              {p.featured&&<div style={{ position:"absolute", top:16, right:16, background:"#FFD700", color:"#000", fontSize:10, fontWeight:800, padding:"3px 12px", borderRadius:20, textTransform:"uppercase" }}>Top Prize</div>}
              <div style={{ fontSize:38, marginBottom:14 }}>{p.medal}</div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.32)", marginBottom:8 }}>{p.label}</div>
              <div style={{ fontSize:30, fontWeight:900, color:p.color, letterSpacing:"-1px", marginBottom:8, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{p.reward}</div>
              <div style={{ fontSize:14, color:"rgba(255,255,255,.42)", marginBottom:18 }}>{p.detail}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontWeight:600, padding:"9px 14px", background:"rgba(255,255,255,.04)", borderRadius:9, border:"1px solid rgba(255,255,255,.06)" }}>{p.cert}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.6)" }}>
        <div className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:52, flexWrap:"wrap", gap:14 }}>
            <div>
              <div className="section-eyebrow">Simple as 4 steps</div>
              <h2 className="sec-title section-title" style={{ fontSize:34 }}>How it works</h2>
            </div>
            <Link href="/how-it-works" style={{ fontSize:14, color:"#FFD700", textDecoration:"none", fontWeight:600 }}>Full Visual Guide &rarr;</Link>
          </div>
          <div className="grid-4-r" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:28 }}>
            {STEPS.map((s,i)=>(
              <div key={s.n} style={{ position:"relative" }}>
                {i<3&&<div style={{ position:"absolute", top:20, left:"calc(100% - 14px)", width:28, height:1, background:"rgba(255,215,0,.18)", zIndex:0 }}/>}
                <div style={{ width:44, height:44, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.22)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,215,0,.5)", letterSpacing:".14em", marginBottom:8 }}>STEP {s.n}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:9, lineHeight:1.3 }}>{s.title}</div>
                <div style={{ fontSize:13.5, color:"rgba(255,255,255,.42)", lineHeight:1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE TWO PLANS ═══ */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Choose your battle</div>
          <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>Two plans. 90 minutes. One winner takes it all.</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)" }}>Pick your entry. Open your MT5 demo. Trade for 90 minutes. Highest % gain wins the funded account.</p>
        </div>
        <div className="plans-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28, maxWidth:900, margin:"0 auto" }}>
          {PLANS.map(p=>(
            <div key={p.name} style={{ background:p.bg, border:`1px solid ${p.border}`, borderRadius:20, padding:34, position:"relative" }}>
              {p.featured&&<div style={{ position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)", background:"#22C55E", color:"#000", fontSize:10, fontWeight:800, padding:"4px 20px", borderRadius:"0 0 12px 12px", whiteSpace:"nowrap" }}>Most Popular</div>}
              <div style={{ marginTop:p.featured?16:0 }}>
                <div style={{ fontSize:12, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:10 }}>{p.name}</div>
                <div style={{ fontSize:36, fontWeight:900, color:p.color, letterSpacing:"-1px", marginBottom:6, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{p.fee}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", marginBottom:18, fontStyle:"italic" }}>{p.tagline}</div>
              </div>

              {/* Bullet Train Registration */}
              <div style={{ marginBottom:20 }}>
                {(() => {
                  const tier = p.name.includes('Pro') ? 'pro' : 'starter';
                  const live = getPlanData(tier);
                  return <BulletTrain joined={live.joined} max={live.max} fee={parseInt(p.fee.replace('$','').replace(' USDT',''))} tier={tier}/>;
                })()}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:26 }}>
                {p.features.map((f,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:9, fontSize:13.5, color:"rgba(255,255,255,.55)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0, marginTop:2 }}><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/tournaments" className="btn" style={{ width:"100%", justifyContent:"center", display:"flex", background:p.featured?"#22C55E":"#FFD700", color:"#000", border:"none", fontWeight:800, fontSize:15, padding:"14px" }}>
                Join {p.name} &rarr;
              </Link>
            </div>
          ))}
        </div>

        {/* ── Guild Battle Section ── */}
        <div style={{ marginTop:32, display:"grid", gridTemplateColumns:"320px 1fr", gap:16, alignItems:"stretch" }}>

          {/* ═══ LEFT — Create Your Battle (compact) ═══ */}
          <div style={{ background:"linear-gradient(145deg, rgba(255,100,0,.12) 0%, rgba(255,40,0,.03) 100%)",
            border:"1px solid rgba(255,100,0,.3)", borderRadius:20, padding:"24px",
            position:"relative", overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ position:"absolute", top:-50, right:-50, width:160, height:160,
              background:"radial-gradient(circle, rgba(255,100,0,.2) 0%, transparent 65%)", pointerEvents:"none" }}/>
            <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", flex:1 }}>
              {/* Badge */}
              <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                background:"rgba(255,100,0,.12)", border:"1px solid rgba(255,100,0,.3)",
                borderRadius:20, padding:"3px 12px", fontSize:10, fontWeight:700,
                color:"#FF6400", letterSpacing:".08em", textTransform:"uppercase",
                marginBottom:14, alignSelf:"flex-start" }}>
                ⚔️ Guild Battles
              </div>
              <h3 style={{ fontSize:20, fontWeight:900, color:"#fff", marginBottom:6,
                letterSpacing:"-.4px", lineHeight:1.15 }}>
                Create Your<br/><span style={{ color:"#FF6400" }}>Battle</span>
              </h3>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.65, marginBottom:16 }}>
                You set the rules. Your community competes. You earn your organiser share automatically.
              </p>
              {/* Feature rows */}
              <div style={{ background:"rgba(0,0,0,.25)", borderRadius:10, overflow:"hidden", marginBottom:16 }}>
                {[
                  { icon:"⚙️", label:"Entry fee",    val:"$1–$10,000" },
                  { icon:"👥", label:"Players",       val:"5–200 traders" },
                  { icon:"💰", label:"Your earnings", val:"Up to 40%" },
                  { icon:"🏛", label:"Platform",      val:"Flat 10% only" },
                ].map((f,i)=>(
                  <div key={f.label} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"9px 12px", fontSize:12,
                    borderBottom: i<3 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                    <span style={{ color:"rgba(255,255,255,.35)", display:"flex", gap:7, alignItems:"center" }}>
                      {f.icon} {f.label}
                    </span>
                    <span style={{ color:"rgba(255,255,255,.7)", fontWeight:700 }}>{f.val}</span>
                  </div>
                ))}
              </div>
              {/* Payout example */}
              <div style={{ background:"rgba(255,100,0,.06)", border:"1px solid rgba(255,100,0,.15)",
                borderRadius:10, padding:"12px 14px", marginBottom:18 }}>
                <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,100,0,.6)",
                  letterSpacing:".12em", textTransform:"uppercase", marginBottom:8 }}>
                  Example — 50 traders × $20
                </div>
                <div style={{ display:"flex", gap:0 }}>
                  {[
                    { l:"🥇 Winner", p:"80%", v:"$800", c:"#FFD700" },
                    { l:"🏆 You",    p:"10%", v:"$100", c:"#FF6400" },
                    { l:"🏛 MFT",   p:"10%", v:"$100", c:"rgba(255,255,255,.25)" },
                  ].map((r,i)=>(
                    <div key={r.l} style={{ flex:1, textAlign:"center",
                      borderRight: i<2 ? "1px solid rgba(255,255,255,.05)" : "none", padding:"0 2px" }}>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,.28)", marginBottom:2 }}>{r.l} ({r.p})</div>
                      <div style={{ fontSize:14, fontWeight:900, color:r.c }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/guild" style={{ display:"flex", alignItems:"center", justifyContent:"center",
                gap:8, background:"linear-gradient(135deg,#FF6400,#FF3000)", color:"#fff",
                fontWeight:800, fontSize:13, padding:"12px", borderRadius:11,
                textDecoration:"none", marginTop:"auto",
                boxShadow:"0 4px 18px rgba(255,80,0,.35)" }}>
                🔥 Create Guild Battle →
              </Link>
            </div>
          </div>

          {/* ═══ RIGHT — Join Active Community Battles (big box) ═══ */}
          <div style={{ background:"rgba(10,14,24,.9)", border:"1px solid rgba(255,255,255,.07)",
            borderRadius:20, padding:"24px", display:"flex", flexDirection:"column" }}>

            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginBottom:10,
                  background: guildBattles.length > 0 ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.04)",
                  border:`1px solid ${guildBattles.length > 0 ? "rgba(34,197,94,.25)" : "rgba(255,255,255,.07)"}`,
                  borderRadius:20, padding:"3px 12px", fontSize:10, fontWeight:700,
                  color: guildBattles.length > 0 ? "#22C55E" : "rgba(255,255,255,.25)",
                  letterSpacing:".08em", textTransform:"uppercase" }}>
                  {guildBattles.length > 0
                    ? <><span style={{ width:5, height:5, borderRadius:"50%", background:"#22C55E",
                        boxShadow:"0 0 5px #22C55E", display:"inline-block", marginRight:5 }}/>
                       {guildBattles.length} Active Now</>
                    : "No Active Battles"}
                </div>
                <h3 style={{ fontSize:20, fontWeight:900, color:"#fff", margin:0,
                  letterSpacing:"-.4px", lineHeight:1.15 }}>
                  Join Active<br/><span style={{ color:"#FFD700" }}>Community Battles</span>
                </h3>
              </div>
              <Link href="/guild" style={{ fontSize:12, color:"rgba(255,255,255,.4)", textDecoration:"none",
                fontWeight:600, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)",
                borderRadius:20, padding:"6px 14px", whiteSpace:"nowrap" }}>
                View All →
              </Link>
            </div>

            {/* Vertical battle cards or empty */}
            {guildBattles.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:14, flex:1 }}>
                {guildBattles.map((g:any) => {
                  const filled   = parseInt(g.active_entries)||0;
                  const max      = g.max_entries||0;
                  const pct      = max > 0 ? Math.round((filled/max)*100) : 0;
                  const pool     = parseFloat(g.prize_pool)||0;
                  const fee      = parseFloat(g.entry_fee)||0;
                  const winPct   = parseFloat(g.winner_pct)||90;
                  const isActive = g.status === 'active';
                  const prizePool= pool > 0 ? pool : fee * filled;
                  const potentialPool = fee * max;
                  const cashout  = prizePool * 0.80;
                  const funded   = prizePool * (winPct/100);
                  return (
                    <div key={g.id} style={{ background: isActive
                        ? "linear-gradient(135deg,rgba(255,100,0,.07) 0%,rgba(255,60,0,.02) 100%)"
                        : "rgba(255,255,255,.025)",
                      border:`1px solid ${isActive ? "rgba(255,100,0,.25)" : "rgba(255,255,255,.07)"}`,
                      borderRadius:16, padding:"20px 22px", flex:1 }}>

                      {/* Top: name + status */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                        <div>
                          <div style={{ fontSize:18, fontWeight:900, color:"#fff", letterSpacing:"-.4px", marginBottom:3 }}>
                            {g.name}
                          </div>
                          <div style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>
                            Organised by community · MT5 demo · 90 min battle
                          </div>
                        </div>
                        <div style={{ background: isActive ? "rgba(239,68,68,.15)" : "rgba(255,215,0,.08)",
                          border:`1px solid ${isActive ? "rgba(239,68,68,.35)" : "rgba(255,215,0,.2)"}`,
                          borderRadius:20, padding:"4px 12px", fontSize:10, fontWeight:800,
                          color: isActive ? "#EF4444" : "#FFD700",
                          letterSpacing:".06em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                          {isActive ? "● Live" : "● Open"}
                        </div>
                      </div>

                      {/* Stats: 5 chips */}
                      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                        {[
                          { label:"Entry Fee",      val:`$${fee.toFixed(0)} USDT`,       c:"#fff" },
                          { label:"Prize Pool",     val:`$${prizePool > 0 ? prizePool.toFixed(0) : "~$"+potentialPool.toFixed(0)}`, c:"#FF6400" },
                          { label:"Funded Prize",   val:`$${funded.toFixed(0)}`,          c:"#FFD700" },
                          { label:"80% Cashout",    val:`$${cashout.toFixed(0)}`,         c:"#22C55E" },
                          { label:"Traders",        val:`${filled} / ${max}`,             c:"rgba(255,255,255,.6)" },
                        ].map(s=>(
                          <div key={s.label} style={{ background:"rgba(255,255,255,.04)",
                            border:"1px solid rgba(255,255,255,.06)", borderRadius:8, padding:"7px 12px" }}>
                            <div style={{ fontSize:9, color:"rgba(255,255,255,.28)", textTransform:"uppercase",
                              letterSpacing:".1em", marginBottom:3 }}>{s.label}</div>
                            <div style={{ fontSize:13, fontWeight:800, color:s.c }}>{s.val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom:16 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>
                            Spots filled — {pct}%
                          </span>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700 }}>
                            {max - filled} spot{max-filled !== 1 ? "s" : ""} remaining
                          </span>
                        </div>
                        <div style={{ background:"rgba(255,255,255,.06)", borderRadius:99, height:6, overflow:"hidden" }}>
                          <div style={{ width:`${pct}%`, height:"100%", borderRadius:99, transition:"width .5s ease",
                            background: isActive
                              ? "linear-gradient(90deg,#EF4444,#FF6400)"
                              : "linear-gradient(90deg,#FF6400,#FFD700)" }}/>
                        </div>
                      </div>

                      {/* Join button */}
                      <Link href={`/battle/${g.slug||g.id}`} style={{ display:"flex", alignItems:"center",
                        justifyContent:"center", gap:8, textDecoration:"none",
                        background: isActive
                          ? "linear-gradient(135deg,#EF4444,#FF6400)"
                          : "linear-gradient(135deg,#FF6400,#FFD700)",
                        color:"#fff", fontWeight:800, fontSize:13, padding:"11px 20px",
                        borderRadius:10, letterSpacing:".02em",
                        boxShadow: isActive ? "0 4px 16px rgba(239,68,68,.3)" : "0 4px 16px rgba(255,100,0,.3)" }}>
                        {isActive ? "⚔️ Watch Live Battle →" : "⚔️ Join This Battle →"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty state */
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", textAlign:"center", padding:"32px 0" }}>
                <div style={{ fontSize:48, marginBottom:16, opacity:.2 }}>⚔️</div>
                <div style={{ fontSize:17, fontWeight:700, color:"rgba(255,255,255,.25)", marginBottom:8 }}>
                  No active community battles yet
                </div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.15)", lineHeight:1.7, maxWidth:300, marginBottom:24 }}>
                  Community organisers create battles for their trading groups.
                  Set the rules, share the link — battle starts automatically when all spots fill.
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
                  {["⚡ Auto-starts when full","🏆 Winner takes the pool","🔗 Custom shareable link","💰 Organiser earns automatically"].map(t=>(
                    <div key={t} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)",
                      borderRadius:20, padding:"5px 12px", fontSize:11, color:"rgba(255,255,255,.25)", fontWeight:600 }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </section>

      {/* ═══ RULES ═══ */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div className="page-pad rules-2col" style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"start" }}>
          <div>
            <div className="section-eyebrow">Fair play</div>
            <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:18 }}>Simple rules, auto-enforced</h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.52)", lineHeight:1.75, marginBottom:8, fontWeight:600 }}>Rules auto-enforced via our cutting edge technology.</p>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.34)", lineHeight:1.75, marginBottom:32 }}>All checks happen automatically in real time — no manual review, no grey areas, no disputes.</p>
            <Link href="/tournaments" className="btn btn-primary">See Open Battles</Link>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {RULES.map(r=>(
              <div key={r.title} style={{ background:"rgba(13,18,29,.8)", border:"1px solid rgba(255,255,255,.06)", borderRadius:13, padding:20, display:"flex", gap:16 }}>
                <div style={{ width:6, borderRadius:3, flexShrink:0, background:r.color, opacity:.7 }}/>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.85)", marginBottom:5 }}>{r.title}</div>
                  <div style={{ fontSize:13.5, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Why MFT wins</div>
          <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>MFT vs FTMO vs Traditional Brokers</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:520, margin:"0 auto" }}>See exactly why thousands of traders choose MFT over expensive prop firms and risky brokers.</p>
        </div>
        <div className="comp-scroll">
          <table style={{ width:"100%", borderRadius:16, border:"1px solid rgba(255,255,255,.08)", overflow:"hidden", borderCollapse:"separate", borderSpacing:0, minWidth:560 }}>
            <thead>
              <tr style={{ background:"rgba(13,18,29,.95)" }}>
                <th style={{ padding:"18px 22px", fontSize:12, fontWeight:700, color:"rgba(255,255,255,.38)", textTransform:"uppercase", letterSpacing:".08em", textAlign:"left", borderBottom:"1px solid rgba(255,255,255,.08)" }}>Feature</th>
                <th style={{ padding:"18px 22px", textAlign:"center", background:"rgba(255,215,0,.07)", borderLeft:"1px solid rgba(255,215,0,.15)", borderBottom:"1px solid rgba(255,215,0,.1)" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#FFD700", letterSpacing:".1em", textTransform:"uppercase", marginBottom:5 }}>&#11088; Best Choice</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#FFD700" }}>MyFundedTournament</div>
                </th>
                <th style={{ padding:"18px 22px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.5)" }}>FTMO</div></th>
                <th style={{ padding:"18px 22px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.5)" }}>Broker (Exness)</div></th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row,i)=>(
                <tr key={row.feature} style={{ background:i%2===0?"rgba(7,9,15,.4)":"transparent" }}>
                  <td style={{ padding:"14px 22px", fontSize:14, color:"rgba(255,255,255,.6)", fontWeight:500, borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.feature}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14, fontWeight:700, color:"#22C55E", background:"rgba(255,215,0,.03)", borderLeft:"1px solid rgba(255,215,0,.08)", borderBottom:"1px solid rgba(255,215,0,.05)" }}>{row.mft}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14, color:"rgba(255,255,255,.45)", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.ftmo}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14, color:"rgba(255,255,255,.45)", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.broker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:22, background:"rgba(255,215,0,.04)", border:"1px solid rgba(255,215,0,.12)", borderRadius:12, padding:"15px 20px" }}>
          <p style={{ fontSize:11.5, color:"rgba(255,255,255,.28)", lineHeight:1.75, margin:0 }}>
            <strong style={{ color:"rgba(255,215,0,.45)", fontWeight:700 }}>Disclaimer: </strong>
            MyFundedTournament is a skills-based demo trading competition platform. All trading takes place on MT5 demo accounts using virtual funds — no real money is traded or at risk during tournaments. Entry fees fund the prize pool. Past demo performance does not guarantee live account results. Funded account prizes are subject to KYC verification and our standard terms. FTMO and broker data is based on publicly available information and may change. MFT is not a broker, investment advisor, or financial institution. Forex trading involves substantial risk and is not suitable for all investors.
          </p>
        </div>
      </section>


      {/* ═══ PRIZE BREAKDOWN ═══ */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div className="section-eyebrow">Prize Breakdown</div>
            <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>How the Prize Pool Works</h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:540, margin:"0 auto" }}>
              100% transparent. Every entry fee goes into the pool. Here's exactly what each winner receives.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, maxWidth:900, margin:"0 auto" }}>
            {[
              {
                name:"Starter Bullet", color:"#FFD700", border:"rgba(255,215,0,.25)",
                bg:"rgba(255,215,0,.05)", pool:625, sub:"25 traders × $25 USDT",
                rows:[
                  { medal:"🥇", label:"Winner — Funded Account (90%)", val:562.5,  color:"#FFD700" },
                  { medal:"💵", label:"Winner — Instant Cashout (80%)", val:500, color:"#22C55E" },
                  { medal:"🏛️", label:"Platform Fee (10%)",             val:62.5,   color:"rgba(255,255,255,.3)" },
                ]
              },
              {
                name:"Pro Bullet", color:"#22C55E", border:"rgba(34,197,94,.25)",
                bg:"rgba(34,197,94,.05)", pool:1250, sub:"25 traders × $50 USDT",
                rows:[
                  { medal:"🥇", label:"Winner — Funded Account (90%)", val:1125,   color:"#FFD700" },
                  { medal:"💵", label:"Winner — Instant Cashout (80%)", val:1000,  color:"#22C55E" },
                  { medal:"🏛️", label:"Platform Fee (10%)",             val:125,    color:"rgba(255,255,255,.3)" },
                ]
              },
            ].map(plan => (
              <div key={plan.name} style={{ background:plan.bg, border:`1px solid ${plan.border}`, borderRadius:18, overflow:"hidden" }}>
                {/* Header */}
                <div style={{ padding:"22px 26px", borderBottom:`1px solid ${plan.border}` }}>
                  <div style={{ fontSize:12, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.4)", marginBottom:6 }}>{plan.name}</div>
                  <div style={{ fontSize:32, fontWeight:900, color:plan.color, letterSpacing:"-1px", fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                    ${plan.pool.toLocaleString()} Pool
                  </div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginTop:4 }}>{plan.sub}</div>
                </div>
                {/* Rows */}
                <div style={{ padding:"8px 0" }}>
                  {plan.rows.map((row, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 26px", borderBottom: i < plan.rows.length-1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:18 }}>{row.medal}</span>
                        <span style={{ fontSize:13, color:"rgba(255,255,255,.55)" }}>{row.label}</span>
                      </div>
                      <span style={{ fontSize:15, fontWeight:800, color:row.color, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                        ${row.val.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div className="faq-pad" style={{ maxWidth:860, margin:"0 auto", padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div className="section-eyebrow">Got questions?</div>
            <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>Frequently Asked Questions</h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)" }}>Everything you need to know before your first 90-minute battle.</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {FAQS.map((faq,i)=>(
              <details key={i} style={{ background:"rgba(13,18,29,.8)", border:"1px solid rgba(255,255,255,.07)", borderRadius:13, overflow:"hidden" }}>
                <summary style={{ padding:"18px 24px", fontSize:15, fontWeight:600, color:"rgba(255,255,255,.85)", cursor:"pointer", listStyle:"none", display:"flex", justifyContent:"space-between", alignItems:"center", gap:14 }}>
                  <span>{faq.q}</span>
                  <span style={{ fontSize:22, color:"#FFD700", flexShrink:0 }}>+</span>
                </summary>
                <div style={{ padding:"14px 24px 20px", fontSize:14.5, color:"rgba(255,255,255,.5)", lineHeight:1.75, borderTop:"1px solid rgba(255,255,255,.05)" }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)" }}>
        <div className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)", textAlign:"center" }}>
          <div style={{ maxWidth:580, margin:"0 auto" }}>
            <div className="section-eyebrow" style={{ marginBottom:18 }}>Ready to battle?</div>
            <h2 className="cta-h" style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:38, fontWeight:800, letterSpacing:"-1.2px", color:"#fff", marginBottom:16, lineHeight:1.1 }}>
              90 minutes to prove your skill.<br/><span style={{ color:"#FFD700" }}>Win a funded account.</span>
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", marginBottom:36, lineHeight:1.7 }}>No evaluation. No minimum target. Just trade your MT5 demo, beat the competition in 90 minutes, and win real capital.</p>
            <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
              <Link href="/tournaments" className="btn btn-ghost btn-lg">View Live Battles</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
// Thu Apr  9 07:45:54 UTC 2026
