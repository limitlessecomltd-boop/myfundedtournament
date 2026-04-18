"use client";
import Link from "next/link";
import HeroAnimation from "@/components/ui/HeroAnimation";
import { useState, useEffect } from "react";
import { BulletTrain } from "@/components/ui/BulletTrain";
import { tournamentApi } from "@/lib/api";

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
      "Win 80% instant USDT cashout or 90% funded account",
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
      "Win 80% instant USDT cashout or 90% funded account",
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
  { n:"03", title:"Trade Actively till End", desc:"We track your % gain live via our MT5 bridge every 10 seconds. Close all trades 3 minutes before the 90-minute mark.", icon:"M18 20V10M12 20V4M6 20v-6" },
  { n:"04", title:"Win your funded account", desc:"Highest % gain wins the prize pool! Choose your reward: 90% as a live funded broker account, or 80% as instant USDT cashout. Only the champion is rewarded — no evaluation needed.", icon:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
];

const RULES = [
  { title:"Min 31s per trade", desc:"Trades closed in under 31 seconds are excluded from your score — not a disqualification.", color:"#FFD700" },
  { title:"No hedging", desc:"Simultaneous buy and sell on the same pair are excluded from score.", color:"#60a5fa" },
  { title:"No external deposit", desc:"Adding funds to your demo after tournament start = instant disqualification.", color:"#EF4444" },
  { title:"Close all trades 3 min early", desc:"All trades must be closed at least 3 minutes before the 90-minute mark or they won't count.", color:"#22C55E" },
];

const COMPARISON = [
  { feature:"Min. Cost",            mft:"$25",           ftmo:"$155+",                      broker:"$10+" },
  { feature:"Evaluation Required",  mft:"❌ None",        ftmo:"✅ Mandatory",                broker:"N/A" },
  { feature:"Payout Denial",        mft:"❌ Never",       ftmo:"⚠️ Possible",                 broker:"⚠️ Possible" },
  { feature:"Demo Account Risk",    mft:"✅ Zero",        ftmo:"❌ Real evaluation",           broker:"❌ Real money" },
  { feature:"Re-entries",           mft:"✅ 1 re-entry",  ftmo:"❌ No re-entry in same eval",  broker:"N/A" },
  { feature:"Prize Transparency",   mft:"✅ 100% live",   ftmo:"❌ Fixed payouts",             broker:"❌ Spread-based" },
  { feature:"Time to First Payout", mft:"90 Minutes",    ftmo:"14 / 30 days",                broker:"Varies" },
  { feature:"Profit Share",         mft:"90%",           ftmo:"80–90%",                      broker:"100% (high risk)" },
  { feature:"Beginner-Friendly",    mft:"✅ Yes",         ftmo:"❌ Hard",                      broker:"⚠️ Risky" },
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
  { q:"What does the winner receive?", a:"The winner gets their choice: either 90% of the prize pool as a real funded trading account (live broker, real capital, daily withdrawals), OR 80% of the prize pool as an instant USDT cashout. Only the 1st place winner is rewarded." },
  { q:"What is a Guild Battle?", a:"Guild Battle is our custom battle program for community organisers. You set the entry fee, player count (5–200), and winner payout percentage (50–90%). You earn an organiser share automatically when the battle ends. Platform always takes a flat 10%." },
  { q:"How much do I earn as a Guild Battle organiser?", a:"You keep whatever is left after the winner's share and the 10% platform fee. Example: if you set winner at 80%, you get 10% (platform gets 10%). On a $1,000 prize pool that means $800 to winner, $100 to you, $100 to platform." },
  { q:"Who can create a Guild Battle?", a:"Any registered MFT user can create a Guild Battle. Simply go to the Guild Battle section, set your parameters, and share the link with your community. The battle auto-starts when all spots are filled." },
];

const EYEBROW_STYLE = {
  fontSize:11, fontWeight:700 as const, letterSpacing:".2em", textTransform:"uppercase" as const,
  color:"#FFD700", marginBottom:16, display:"flex", alignItems:"center", gap:10,
};
const EYEBROW_LINE = { content:"", display:"block", width:30, height:1, background:"#FFD700", flexShrink:0 } as any;
const SEC_TITLE = {
  fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(40px,5vw,64px)",
  lineHeight:1, letterSpacing:"2px", marginBottom:18, color:"#fff",
};
const CARD = {
  background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.08)",
  borderRadius:18, padding:30, transition:"border-color .25s",
};

export default function HomePage() {
  const [liveTournaments, setLiveTournaments] = useState<any[]>([]);
  const [guildBattles,    setGuildBattles]    = useState<any[]>([]);
  const [liveCount,   setLiveCount]   = useState(0);
  const [traderCount, setTraderCount] = useState(0);

  useEffect(() => {
    const load = () => {
      tournamentApi.getAll("all")
        .then(data => {
          setLiveTournaments(data);
          const open = data.filter((t:any) => ["active","registration"].includes(t.status));
          setLiveCount(open.length);
          const total = open.reduce((s:number,t:any) => s + parseInt(String(t.unique_traders||0)), 0);
          setTraderCount(total);
          const gOpen = open.filter((t:any) => t.tier === 'guild' || t.tier_type === 'guild').slice(0,3);
          setGuildBattles(gOpen);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

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
    <div style={{ background:"#030508", overflowX:"hidden", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @keyframes hpulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);}}
        @keyframes hfadeup{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}
        @keyframes shimmer{0%{background-position:0% center;}100%{background-position:200% center;}}
        @keyframes hticker{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
        .hp-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#FFD700;animation:hpulse 2s infinite;flex-shrink:0;}
        .hp-h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(38px,10vw,112px);line-height:.92;letter-spacing:2px;margin-bottom:20px;animation:hfadeup .9s .1s ease both;}
        .hp-h1 .l1,.hp-h1 .l2{display:block;color:#fff;}
        .hp-h1 .l3{display:block;background:linear-gradient(135deg,#FFD700 0%,#FF6400 50%,#FFD700 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:hfadeup .9s .2s ease both,shimmer 4s linear 1s infinite;}
        .hp-ticker{background:rgba(8,13,21,.95);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);padding:13px 0;overflow:hidden;}
        .hp-ticker-inner{display:flex;gap:60px;animation:hticker 35s linear infinite;white-space:nowrap;}
        .hp-tick{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);display:flex;align-items:center;gap:8px;}
        .hp-tick span{color:#FFD700;}
        .hp-stat-val{font-family:'Bebas Neue',sans-serif;font-size:clamp(26px,3vw,40px);letter-spacing:1px;line-height:1;}
        .hp-eyebrow{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#FFD700;margin-bottom:16px;display:flex;align-items:center;gap:10px;}
        .hp-eyebrow::before{content:'';display:block;width:30px;height:1px;background:#FFD700;flex-shrink:0;}
        .hp-sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4.5vw,60px);line-height:1;letter-spacing:2px;margin-bottom:18px;color:#fff;}
        .hp-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:30px;transition:border-color .25s;}
        .hp-card:hover{border-color:rgba(255,215,0,.25);}
        .hp-step-num{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,rgba(255,215,0,.15),rgba(255,100,0,.1));border:1px solid rgba(255,215,0,.25);display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-family:'Bebas Neue',sans-serif;font-size:28px;color:#FFD700;}
        .hp-check{color:#22C55E;font-weight:700;flex-shrink:0;margin-top:2px;}
        .hp-faq summary{padding:18px 24px;font-size:15px;font-weight:600;color:rgba(255,255,255,.85);cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:14px;font-family:'DM Sans',sans-serif;}
        .hp-faq summary::-webkit-details-marker{display:none;}
        .hp-faq[open] summary{color:#FFD700;}
        details summary::-webkit-details-marker{display:none;}
        @media(max-width:900px){
          .hp-hero-grid{grid-template-columns:1fr !important;}
          .hp-hero-right{display:none !important;}
          .hp-stats-grid{grid-template-columns:1fr 1fr !important;}
          .hp-plans-grid{grid-template-columns:1fr !important;}
          .hp-steps-grid{grid-template-columns:1fr 1fr !important;}
          .hp-rules-grid{grid-template-columns:1fr !important;gap:32px !important;}
          .hp-guild-grid{grid-template-columns:1fr !important;}
          .hp-prize-grid{grid-template-columns:1fr !important;}
          .hp-breakdown-grid{grid-template-columns:1fr !important;}
          .hp-wrap{padding:80px 24px !important;}
          .hp-hero-wrap{padding:88px 20px 48px !important;grid-template-columns:1fr !important;}
          .hp-h1{font-size:clamp(38px,11vw,72px) !important;letter-spacing:1px !important;margin-bottom:16px !important;}
          .hp-badge{font-size:11px !important;padding:7px 14px 7px 12px !important;}
          .hp-hero-btns{flex-direction:column !important;gap:10px !important;}
          .hp-hero-btns a{width:100% !important;justify-content:center !important;text-align:center !important;display:block !important;}
        }
        @media(max-width:560px){
          .hp-stats-grid{grid-template-columns:1fr !important;}
          .hp-steps-grid{grid-template-columns:1fr !important;}
          .comp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
          .hp-h1{font-size:clamp(36px,12vw,56px) !important;margin-bottom:14px !important;}
          .hp-trust-pills{gap:12px !important;}
          .hp-trust-pills>div{font-size:12px !important;}
        }
      `}</style>

      {/* cursor glow */}
      <div style={{ position:"fixed", width:400, height:400, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(255,215,0,.04) 0%,transparent 70%)",
        pointerEvents:"none", zIndex:0, top:0, left:0, transform:"translate(-50%,-50%)" }}
        id="hp-glow"/>
      <script dangerouslySetInnerHTML={{ __html:`
        document.addEventListener('mousemove',function(e){
          var g=document.getElementById('hp-glow');
          if(g){g.style.left=e.clientX+'px';g.style.top=e.clientY+'px';}
        });
      `}}/>

      {/* ─── TICKER ─────────────────────────────────────────────────────────── */}
      <div className="hp-ticker" style={{ marginTop:72 }}>
        <div className="hp-ticker-inner">
          {["⚔️ 90-Minute Battles — LIVE NOW","💰 Instant USDT Payouts — ON-CHAIN","🏆 Funded Accounts — AS PRIZES","📊 Real MT5 Accounts — VERIFIED","🔥 Guild Battles — CREATE YOURS","⚡ Zero Evaluation — JUST WIN",
            "⚔️ 90-Minute Battles — LIVE NOW","💰 Instant USDT Payouts — ON-CHAIN","🏆 Funded Accounts — AS PRIZES","📊 Real MT5 Accounts — VERIFIED","🔥 Guild Battles — CREATE YOURS","⚡ Zero Evaluation — JUST WIN"].map((t,i)=>(
            <div key={i} className="hp-tick"><span>{t}</span></div>
          ))}
        </div>
      </div>

      {/* ─── HERO ────────────────────────────────────────────────────────────── */}
      <div style={{ position:"relative", overflow:"hidden" }}>
        {/* background glows */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,215,0,.07) 0%,transparent 60%),radial-gradient(ellipse 40% 40% at 80% 50%,rgba(255,100,0,.05) 0%,transparent 60%),radial-gradient(ellipse 60% 80% at 20% 80%,rgba(34,197,94,.04) 0%,transparent 60%)" }}/>
        {/* grid */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage:"linear-gradient(rgba(255,215,0,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,.03) 1px,transparent 1px)",
          backgroundSize:"60px 60px",
          maskImage:"radial-gradient(ellipse 70% 70% at 50% 50%,black 20%,transparent 80%)" as any }}/>

        <section className="hp-hero-wrap" style={{ maxWidth:1280, margin:"0 auto",
          padding:"clamp(88px,10vw,110px) clamp(16px,5vw,60px) clamp(40px,6vw,70px)", display:"grid", gridTemplateColumns:"1fr 480px",
          gap:56, alignItems:"center" }} >

          <div style={{ position:"relative", zIndex:1, animation:"hfadeup .9s ease both" }}>
            {/* Live badge */}
            <div className="hp-badge" style={{ display:"inline-flex", alignItems:"center", gap:8,
              background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.2)",
              borderRadius:100, padding:"8px 20px 8px 14px", fontSize:12, fontWeight:600,
              color:"#FFD700", marginBottom:32, letterSpacing:".08em", textTransform:"uppercase" }}>
              <span className="hp-badge" style={{ display:"contents" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#FFD700", animation:"hpulse 2s infinite" }}/>
              </span>
              {liveCount} Live Battle{liveCount !== 1 ? "s" : ""} &middot; {traderCount} Active Trader{traderCount !== 1 ? "s" : ""}
            </div>

            <h1 className="hp-h1">
              <span className="l1">WORLD FIRST</span>
              <span className="l2">TRADING BATTLE</span>
              <span className="l3">PLATFORM</span>
            </h1>

            <p style={{ fontSize:"clamp(14px,4vw,17px)", color:"rgba(255,255,255,.6)", lineHeight:1.75,
              maxWidth:"min(520px,100%)", marginBottom:28, fontWeight:300, animation:"hfadeup .9s .3s ease both" }}>
              Join a public battle or launch your own{" "}
              <strong style={{ color:"#FFD700", fontWeight:600 }}>Guild Battle</strong> as an organiser.
              Entry fees build the prize pool — the best trader wins{" "}
              <strong style={{ color:"#22C55E", fontWeight:600 }}>instant USDT cashout</strong>{" "}
              or a <strong style={{ color:"rgba(255,255,255,.85)", fontWeight:600 }}>real funded broker account</strong>{" "}
              within 90 minutes.
            </p>

            {/* action buttons */}
            <div className="hp-hero-btns" style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:32,
              animation:"hfadeup .9s .4s ease both" }}}>
              <Link href="/tournaments" style={{ background:"linear-gradient(135deg,#FFD700,#FFA500)",
                color:"#000", fontWeight:700, fontSize:15, padding:"15px 36px",
                borderRadius:8, textDecoration:"none", letterSpacing:".04em",
                boxShadow:"0 0 32px rgba(255,215,0,.25)", transition:"all .25s" }}>
                Join a Battle Now
              </Link>
              <Link href="/how-it-works" style={{ background:"transparent",
                border:"1px solid rgba(255,255,255,.2)", color:"#fff",
                fontWeight:600, fontSize:15, padding:"15px 36px", borderRadius:8,
                textDecoration:"none", letterSpacing:".04em", transition:"all .25s" }}>
                How It Works
              </Link>
            </div>

            {/* trust pills */}
            <div className="hp-trust-pills" style={{ display:"flex", gap:20, flexWrap:"wrap", animation:"hfadeup .9s .5s ease both" }}}>
              {["Set your own entry fee","Earn as organiser","No payout denial ever"].map(t=>(
                <div key={t} style={{ display:"flex", alignItems:"center", gap:7,
                  fontSize:13, color:"rgba(255,255,255,.45)", fontWeight:500 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>{t}
                </div>
              ))}
            </div>
          </div>

          <div className="hp-hero-right" style={{ position:"relative", zIndex:1,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <HeroAnimation />
          </div>
        </section>
      </div>

      {/* ─── STATS BAR ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", borderBottom:"1px solid rgba(255,255,255,.06)",
        background:"rgba(8,13,21,.9)" }}>
        <div className="hp-stats-grid" style={{ maxWidth:1280, margin:"0 auto",
          padding:"0 60px", display:"grid", gridTemplateColumns:"repeat(4,1fr)",
          gap:"1px", background:"rgba(255,255,255,.06)" }}>
          {[
            { val:"Transparent",  label:"Prize Money",                      color:"#FFD700" },
            { val:"90 Min",       label:"Trading Battle",                   color:"#22C55E" },
            { val:"90%",          label:"Funded Account Prize",             color:"#fff" },
            { val:"100%",         label:"Drawdown Limit on Funded Account", color:"#60a5fa" },
          ].map(({ val, label, color })=>(
            <div key={label} style={{ padding:"28px 20px", textAlign:"center", background:"#030508" }}>
              <div className="hp-stat-val" style={{ color, marginBottom:6,
                fontFamily:"'Bebas Neue',sans-serif" }}>{val}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.38)", fontWeight:500,
                letterSpacing:".06em", textTransform:"uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PRIZE STRUCTURE ────────────────────────────────────────────────── */}
      <section className="hp-wrap" style={{ maxWidth:1280, margin:"0 auto",
        padding:"100px 60px" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div className="hp-eyebrow" style={{ justifyContent:"center" }}>
            <span style={{ width:30, height:1, background:"#FFD700", display:"block" }}/>
            Prize Structure
          </div>
          <h2 className="hp-sec-title">WHAT WINNERS RECEIVE</h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.45)", maxWidth:540, margin:"0 auto", lineHeight:1.7 }}>
            The champion takes all. Choose{" "}
            <strong style={{color:"#22C55E"}}>80% as instant USDT cashout</strong>{" "}
            — paid within 24 hours — or{" "}
            <strong style={{color:"#FFD700"}}>90% as a real funded trading account</strong>{" "}
            with daily withdrawals. No evaluation. Just win.
          </p>
        </div>
        <div className="hp-prize-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:20, maxWidth:760, margin:"0 auto" }}>
          {PRIZES.map(p=>(
            <div key={p.place} className="hp-card" style={{ background:p.bg,
              border:`1px solid ${p.border}`, position:"relative" }}>
              {p.featured && (
                <div style={{ position:"absolute", top:16, right:16, background:"#FFD700",
                  color:"#000", fontSize:10, fontWeight:800, padding:"3px 14px",
                  borderRadius:20, textTransform:"uppercase", letterSpacing:".08em" }}>
                  Top Prize
                </div>
              )}
              <div style={{ fontSize:40, marginBottom:16 }}>{p.medal}</div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".14em",
                textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:8 }}>
                {p.label}
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32,
                color:p.color, letterSpacing:"1px", marginBottom:8 }}>
                {p.reward}
              </div>
              <div style={{ fontSize:14, color:"rgba(255,255,255,.45)", marginBottom:20 }}>
                {p.detail}
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontWeight:600,
                padding:"10px 14px", background:"rgba(255,255,255,.04)",
                borderRadius:10, border:"1px solid rgba(255,255,255,.06)" }}>
                {p.cert}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(8,13,21,.7)" }}>
        <div className="hp-wrap" style={{ maxWidth:1280, margin:"0 auto", padding:"100px 60px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end",
            marginBottom:56, flexWrap:"wrap", gap:14 }}>
            <div>
              <div className="hp-eyebrow">Simple as 4 steps</div>
              <h2 className="hp-sec-title" style={{ marginBottom:0 }}>HOW IT WORKS</h2>
            </div>
            <Link href="/how-it-works" style={{ fontSize:14, color:"#FFD700",
              textDecoration:"none", fontWeight:600 }}>
              Full Visual Guide →
            </Link>
          </div>
          <div className="hp-steps-grid" style={{ display:"grid",
            gridTemplateColumns:"repeat(4,1fr)", gap:24, position:"relative" }}>
            <div style={{ position:"absolute", top:32, left:"10%", right:"10%", height:1,
              background:"linear-gradient(90deg,transparent,rgba(255,215,0,.2) 20%,rgba(255,215,0,.2) 80%,transparent)" }}/>
            {STEPS.map(s=>(
              <div key={s.n} className="hp-card" style={{ textAlign:"center" }}>
                <div className="hp-step-num" style={{ margin:"0 auto 20px" }}>{s.n}</div>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,215,0,.5)",
                  letterSpacing:".14em", marginBottom:8 }}>STEP {s.n}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#fff",
                  marginBottom:10, lineHeight:1.3 }}>{s.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.45)",
                  lineHeight:1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLANS ──────────────────────────────────────────────────────────── */}
      <section className="hp-wrap" style={{ maxWidth:1280, margin:"0 auto", padding:"100px 60px" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div className="hp-eyebrow" style={{ justifyContent:"center" }}>
            <span style={{ width:30, height:1, background:"#FFD700", display:"block" }}/>
            Choose your battle
          </div>
          <h2 className="hp-sec-title">TWO PLANS. 90 MINUTES. ONE WINNER TAKES IT ALL.</h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.45)", lineHeight:1.7 }}>
            Pick your entry. Open your MT5 demo. Trade for 90 minutes. Highest % gain wins.
          </p>
        </div>

        <div className="hp-plans-grid" style={{ display:"grid",
          gridTemplateColumns:"1fr 1fr", gap:24, maxWidth:900, margin:"0 auto 28px" }}>
          {PLANS.map(p=>(
            <div key={p.name} style={{ background:p.bg, border:`1px solid ${p.border}`,
              borderRadius:20, padding:34, position:"relative" }}>
              {p.featured && (
                <div style={{ position:"absolute", top:-1, left:"50%",
                  transform:"translateX(-50%)", background:"#22C55E", color:"#000",
                  fontSize:10, fontWeight:800, padding:"4px 20px",
                  borderRadius:"0 0 12px 12px", whiteSpace:"nowrap",
                  letterSpacing:".08em" }}>
                  Most Popular
                </div>
              )}
              <div style={{ marginTop:p.featured ? 16 : 0 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em",
                  textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:8 }}>
                  {p.name}
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44,
                  color:p.color, letterSpacing:"1px", marginBottom:6, lineHeight:1 }}>
                  {p.fee}
                </div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)",
                  marginBottom:20, fontStyle:"italic" }}>{p.tagline}</div>
              </div>

              <div style={{ marginBottom:20 }}>
                {(() => {
                  const tier = p.name.includes('Pro') ? 'pro' : 'starter';
                  const live = getPlanData(tier);
                  return <BulletTrain joined={live.joined} max={live.max}
                    fee={parseInt(p.fee.replace('$','').replace(' USDT',''))} tier={tier}/>;
                })()}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:26 }}>
                {p.features.map((f,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start",
                    gap:9, fontSize:13.5, color:"rgba(255,255,255,.55)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke={p.color} strokeWidth="2.5" strokeLinecap="round"
                      style={{ flexShrink:0, marginTop:2 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/tournaments" style={{ width:"100%", justifyContent:"center",
                display:"flex", background:p.featured ? "#22C55E" : "#FFD700",
                color:"#000", fontWeight:800, fontSize:15, padding:"14px",
                borderRadius:10, textDecoration:"none", letterSpacing:".04em" }}>
                Join {p.name} →
              </Link>
            </div>
          ))}
        </div>

        {/* Guild section */}
        <div className="hp-guild-grid" style={{ marginTop:16, display:"grid",
          gridTemplateColumns:"320px 1fr", gap:16, alignItems:"stretch" }}>

          {/* Create Guild */}
          <div style={{ background:"linear-gradient(145deg,rgba(255,100,0,.12),rgba(255,40,0,.03))",
            border:"1px solid rgba(255,100,0,.3)", borderRadius:20, padding:24,
            position:"relative", overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ position:"absolute", top:-50, right:-50, width:160, height:160,
              background:"radial-gradient(circle,rgba(255,100,0,.2) 0%,transparent 65%)",
              pointerEvents:"none" }}/>
            <div style={{ position:"relative", zIndex:1, display:"flex",
              flexDirection:"column", flex:1 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                background:"rgba(255,100,0,.12)", border:"1px solid rgba(255,100,0,.3)",
                borderRadius:20, padding:"3px 12px", fontSize:10, fontWeight:700,
                color:"#FF6400", letterSpacing:".1em", textTransform:"uppercase",
                marginBottom:14, alignSelf:"flex-start" }}>
                ⚔️ Guild Battles
              </div>
              <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28,
                letterSpacing:"1px", color:"#fff", marginBottom:6, lineHeight:1.1 }}>
                CREATE YOUR<br/><span style={{ color:"#FF6400" }}>BATTLE</span>
              </h3>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.65, marginBottom:16 }}>
                You set the rules. Your community competes. You earn your organiser share automatically.
              </p>
              <div style={{ background:"rgba(0,0,0,.25)", borderRadius:10, overflow:"hidden", marginBottom:16 }}>
                {[
                  { icon:"⚙️", label:"Entry fee",    val:"$1–$10,000" },
                  { icon:"👥", label:"Players",       val:"5–200 traders" },
                  { icon:"💰", label:"Your earnings", val:"Up to 40%" },
                  { icon:"🏛", label:"Platform",      val:"Flat 10% only" },
                ].map((f,i)=>(
                  <div key={f.label} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"9px 12px", fontSize:12,
                    borderBottom:i<3?"1px solid rgba(255,255,255,.04)":"none" }}>
                    <span style={{ color:"rgba(255,255,255,.35)", display:"flex", gap:7, alignItems:"center" }}>
                      {f.icon} {f.label}
                    </span>
                    <span style={{ color:"rgba(255,255,255,.7)", fontWeight:700 }}>{f.val}</span>
                  </div>
                ))}
              </div>
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
                      borderRight:i<2?"1px solid rgba(255,255,255,.05)":"none", padding:"0 2px" }}>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,.28)", marginBottom:2 }}>
                        {r.l} ({r.p})
                      </div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:r.c }}>
                        {r.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/guild" style={{ display:"flex", alignItems:"center",
                justifyContent:"center", gap:8, background:"linear-gradient(135deg,#FF6400,#FF3000)",
                color:"#fff", fontWeight:800, fontSize:13, padding:"13px", borderRadius:11,
                textDecoration:"none", marginTop:"auto",
                boxShadow:"0 4px 18px rgba(255,80,0,.35)" }}>
                🔥 Create Guild Battle →
              </Link>
            </div>
          </div>

          {/* Active Guild Battles */}
          <div style={{ background:"rgba(10,14,24,.9)", border:"1px solid rgba(255,255,255,.07)",
            borderRadius:20, padding:24, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginBottom:10,
                  background:guildBattles.length > 0 ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.04)",
                  border:`1px solid ${guildBattles.length > 0 ? "rgba(34,197,94,.25)" : "rgba(255,255,255,.07)"}`,
                  borderRadius:20, padding:"3px 12px", fontSize:10, fontWeight:700,
                  color:guildBattles.length > 0 ? "#22C55E" : "rgba(255,255,255,.25)",
                  letterSpacing:".08em", textTransform:"uppercase" }}>
                  {guildBattles.length > 0
                    ? <><span style={{ width:5, height:5, borderRadius:"50%", background:"#22C55E",
                        display:"inline-block", marginRight:5 }}/>{guildBattles.length} Active Now</>
                    : "No Active Battles"}
                </div>
                <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24,
                  letterSpacing:"1px", color:"#fff", margin:0, lineHeight:1.1 }}>
                  JOIN ACTIVE<br/><span style={{ color:"#FFD700" }}>COMMUNITY BATTLES</span>
                </h3>
              </div>
              <Link href="/guild" style={{ fontSize:12, color:"rgba(255,255,255,.4)",
                textDecoration:"none", fontWeight:600, background:"rgba(255,255,255,.05)",
                border:"1px solid rgba(255,255,255,.08)", borderRadius:20,
                padding:"6px 14px", whiteSpace:"nowrap" }}>
                View All →
              </Link>
            </div>

            {guildBattles.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:14, flex:1 }}>
                {guildBattles.map((g:any) => {
                  const filled = parseInt(g.active_entries)||0;
                  const max    = g.max_entries||0;
                  const pct    = max > 0 ? Math.round((filled/max)*100) : 0;
                  const pool   = parseFloat(g.prize_pool)||0;
                  const fee    = parseFloat(g.entry_fee)||0;
                  const winPct = parseFloat(g.winner_pct)||90;
                  const isActive = g.status === 'active';
                  const prizePool = pool > 0 ? pool : fee * filled;
                  const cashout   = prizePool * 0.80;
                  const funded    = prizePool * (winPct/100);
                  return (
                    <div key={g.id} style={{ background:isActive
                        ? "linear-gradient(135deg,rgba(255,100,0,.07),rgba(255,60,0,.02))"
                        : "rgba(255,255,255,.025)",
                      border:`1px solid ${isActive ? "rgba(255,100,0,.25)" : "rgba(255,255,255,.07)"}`,
                      borderRadius:16, padding:"20px 22px", flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"flex-start", marginBottom:14 }}>
                        <div>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22,
                            letterSpacing:"1px", color:"#fff", marginBottom:3 }}>
                            {g.name}
                          </div>
                          <div style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>
                            Community organised · MT5 demo · 90 min battle
                          </div>
                        </div>
                        <div style={{ background:isActive ? "rgba(239,68,68,.15)" : "rgba(255,215,0,.08)",
                          border:`1px solid ${isActive ? "rgba(239,68,68,.35)" : "rgba(255,215,0,.2)"}`,
                          borderRadius:20, padding:"4px 12px", fontSize:10, fontWeight:800,
                          color:isActive ? "#EF4444" : "#FFD700",
                          letterSpacing:".06em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                          {isActive ? "● Live" : "● Open"}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                        {[
                          { label:"Entry Fee",    val:`$${fee.toFixed(0)} USDT`,  c:"#fff" },
                          { label:"Prize Pool",   val:`$${prizePool > 0 ? prizePool.toFixed(0) : "~$"+(fee*max).toFixed(0)}`, c:"#FF6400" },
                          { label:"Funded Prize", val:`$${funded.toFixed(0)}`,    c:"#FFD700" },
                          { label:"80% Cashout",  val:`$${cashout.toFixed(0)}`,   c:"#22C55E" },
                          { label:"Traders",      val:`${filled} / ${max}`,       c:"rgba(255,255,255,.6)" },
                        ].map(s=>(
                          <div key={s.label} style={{ background:"rgba(255,255,255,.04)",
                            border:"1px solid rgba(255,255,255,.06)", borderRadius:8, padding:"7px 12px" }}>
                            <div style={{ fontSize:9, color:"rgba(255,255,255,.28)",
                              textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>
                              {s.label}
                            </div>
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13,
                              fontWeight:500, color:s.c }}>{s.val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom:16 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>
                            Spots filled — {pct}%
                          </span>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700 }}>
                            {max - filled} spot{max-filled !== 1 ? "s" : ""} remaining
                          </span>
                        </div>
                        <div style={{ background:"rgba(255,255,255,.06)", borderRadius:99,
                          height:5, overflow:"hidden" }}>
                          <div style={{ width:`${pct}%`, height:"100%", borderRadius:99,
                            background:isActive
                              ? "linear-gradient(90deg,#EF4444,#FF6400)"
                              : "linear-gradient(90deg,#FF6400,#FFD700)" }}/>
                        </div>
                      </div>
                      <Link href={`/battle/${g.slug||g.id}`} style={{ display:"flex",
                        alignItems:"center", justifyContent:"center", gap:8,
                        textDecoration:"none",
                        background:isActive
                          ? "linear-gradient(135deg,#EF4444,#FF6400)"
                          : "linear-gradient(135deg,#FF6400,#FFD700)",
                        color:"#fff", fontWeight:800, fontSize:13,
                        padding:"11px 20px", borderRadius:10,
                        letterSpacing:".04em" }}>
                        {isActive ? "⚔️ Watch Live Battle →" : "⚔️ Join This Battle →"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                textAlign:"center", padding:"32px 0" }}>
                <div style={{ fontSize:48, marginBottom:16, opacity:.15 }}>⚔️</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20,
                  letterSpacing:"1px", color:"rgba(255,255,255,.2)", marginBottom:8 }}>
                  NO ACTIVE COMMUNITY BATTLES YET
                </div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.15)", lineHeight:1.7,
                  maxWidth:300, marginBottom:24 }}>
                  Community organisers create battles for their trading groups.
                  Set the rules, share the link — battle starts automatically when all spots fill.
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
                  {["⚡ Auto-starts when full","🏆 Winner takes the pool",
                    "🔗 Custom shareable link","💰 Organiser earns automatically"].map(t=>(
                    <div key={t} style={{ background:"rgba(255,255,255,.03)",
                      border:"1px solid rgba(255,255,255,.06)", borderRadius:20,
                      padding:"5px 12px", fontSize:11,
                      color:"rgba(255,255,255,.2)", fontWeight:600 }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── RULES ──────────────────────────────────────────────────────────── */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(8,13,21,.6)" }}>
        <div className="hp-rules-grid hp-wrap" style={{ maxWidth:1280, margin:"0 auto",
          padding:"100px 60px", display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:64, alignItems:"start" }}>
          <div>
            <div className="hp-eyebrow">Fair play</div>
            <h2 className="hp-sec-title">SIMPLE RULES,<br/>AUTO-ENFORCED</h2>
            <p style={{ fontSize:16, color:"rgba(255,255,255,.5)", lineHeight:1.75,
              marginBottom:8, fontWeight:600 }}>
              Rules auto-enforced via cutting edge technology.
            </p>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.32)", lineHeight:1.75, marginBottom:36 }}>
              All checks happen automatically in real time — no manual review, no grey areas, no disputes.
            </p>
            <Link href="/tournaments" style={{ background:"linear-gradient(135deg,#FFD700,#FFA500)",
              color:"#000", fontWeight:700, fontSize:14, padding:"14px 32px",
              borderRadius:8, textDecoration:"none", letterSpacing:".04em",
              display:"inline-block" }}>
              See Open Battles
            </Link>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {RULES.map(r=>(
              <div key={r.title} className="hp-card" style={{ display:"flex", gap:16 }}>
                <div style={{ width:4, borderRadius:2, flexShrink:0,
                  background:r.color, opacity:.8, alignSelf:"stretch" }}/>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.85)",
                    marginBottom:5 }}>{r.title}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.4)",
                    lineHeight:1.6 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─────────────────────────────────────────────────────── */}
      <section className="hp-wrap" style={{ maxWidth:1280, margin:"0 auto",
        padding:"100px 60px" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div className="hp-eyebrow" style={{ justifyContent:"center" }}>
            <span style={{ width:30, height:1, background:"#FFD700", display:"block" }}/>
            Why MFT wins
          </div>
          <h2 className="hp-sec-title">MFT VS FTMO VS TRADITIONAL BROKERS</h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.4)", maxWidth:520, margin:"0 auto" }}>
            See exactly why thousands of traders choose MFT over expensive prop firms and risky brokers.
          </p>
        </div>
        <div className="comp-scroll">
          <table style={{ width:"100%", borderRadius:16, border:"1px solid rgba(255,255,255,.08)",
            overflow:"hidden", borderCollapse:"separate", borderSpacing:0, minWidth:560 }}>
            <thead>
              <tr style={{ background:"rgba(13,18,29,.95)" }}>
                <th style={{ padding:"18px 22px", fontSize:11, fontWeight:700,
                  color:"rgba(255,255,255,.35)", textTransform:"uppercase",
                  letterSpacing:".1em", textAlign:"left",
                  borderBottom:"1px solid rgba(255,255,255,.08)" }}>Feature</th>
                <th style={{ padding:"18px 22px", textAlign:"center",
                  background:"rgba(255,215,0,.07)",
                  borderLeft:"1px solid rgba(255,215,0,.15)",
                  borderBottom:"1px solid rgba(255,215,0,.1)" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#FFD700",
                    letterSpacing:".1em", textTransform:"uppercase", marginBottom:5 }}>
                    ⭐ Best Choice
                  </div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16,
                    color:"#FFD700", letterSpacing:"1px" }}>
                    MyFundedTournament
                  </div>
                </th>
                <th style={{ padding:"18px 22px", textAlign:"center",
                  borderLeft:"1px solid rgba(255,255,255,.05)",
                  borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.45)" }}>FTMO</div>
                </th>
                <th style={{ padding:"18px 22px", textAlign:"center",
                  borderLeft:"1px solid rgba(255,255,255,.05)",
                  borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.45)" }}>Broker (Exness)</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row,i)=>(
                <tr key={row.feature} style={{ background:i%2===0?"rgba(8,13,21,.5)":"transparent" }}>
                  <td style={{ padding:"14px 22px", fontSize:14,
                    color:"rgba(255,255,255,.55)", fontWeight:500,
                    borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.feature}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14,
                    fontWeight:700, color:"#22C55E",
                    background:"rgba(255,215,0,.03)",
                    borderLeft:"1px solid rgba(255,215,0,.08)",
                    borderBottom:"1px solid rgba(255,215,0,.05)",
                    fontFamily:"'DM Mono',monospace" }}>{row.mft}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14,
                    color:"rgba(255,255,255,.4)",
                    borderLeft:"1px solid rgba(255,255,255,.05)",
                    borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.ftmo}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14,
                    color:"rgba(255,255,255,.4)",
                    borderLeft:"1px solid rgba(255,255,255,.05)",
                    borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.broker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:20, background:"rgba(255,215,0,.04)",
          border:"1px solid rgba(255,215,0,.1)", borderRadius:12, padding:"14px 20px" }}>
          <p style={{ fontSize:11.5, color:"rgba(255,255,255,.25)", lineHeight:1.75, margin:0 }}>
            <strong style={{ color:"rgba(255,215,0,.4)", fontWeight:700 }}>Disclaimer: </strong>
            MyFundedTournament is a skills-based demo trading competition platform. All trading takes place on MT5 demo accounts using virtual funds — no real money is traded or at risk during tournaments. Entry fees fund the prize pool. Past demo performance does not guarantee live account results. Funded account prizes are subject to KYC verification and our standard terms. FTMO and broker data is based on publicly available information and may change. MFT is not a broker, investment advisor, or financial institution. Forex trading involves substantial risk and is not suitable for all investors.
          </p>
        </div>
      </section>

      {/* ─── PRIZE BREAKDOWN ────────────────────────────────────────────────── */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(8,13,21,.6)" }}>
        <div className="hp-wrap" style={{ maxWidth:1280, margin:"0 auto", padding:"100px 60px" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div className="hp-eyebrow" style={{ justifyContent:"center" }}>
              <span style={{ width:30, height:1, background:"#FFD700", display:"block" }}/>
              Prize Breakdown
            </div>
            <h2 className="hp-sec-title">HOW THE PRIZE POOL WORKS</h2>
            <p style={{ fontSize:16, color:"rgba(255,255,255,.4)", maxWidth:540, margin:"0 auto" }}>
              100% transparent. Every entry fee goes into the pool.
              Here's exactly what each winner receives.
            </p>
          </div>
          <div className="hp-breakdown-grid" style={{ display:"grid",
            gridTemplateColumns:"1fr 1fr", gap:24, maxWidth:900, margin:"0 auto" }}>
            {[
              {
                name:"Starter Bullet", color:"#FFD700", border:"rgba(255,215,0,.25)",
                bg:"rgba(255,215,0,.05)", pool:625, sub:"25 traders × $25 USDT",
                rows:[
                  { medal:"🥇", label:"Winner — Funded Account (90%)", val:562.5,  color:"#FFD700" },
                  { medal:"💵", label:"Winner — Instant Cashout (80%)", val:500,   color:"#22C55E" },
                  { medal:"🏛️", label:"Platform Fee (10%)",             val:62.5,   color:"rgba(255,255,255,.3)" },
                ]
              },
              {
                name:"Pro Bullet", color:"#22C55E", border:"rgba(34,197,94,.25)",
                bg:"rgba(34,197,94,.05)", pool:1250, sub:"25 traders × $50 USDT",
                rows:[
                  { medal:"🥇", label:"Winner — Funded Account (90%)", val:1125,  color:"#FFD700" },
                  { medal:"💵", label:"Winner — Instant Cashout (80%)", val:1000, color:"#22C55E" },
                  { medal:"🏛️", label:"Platform Fee (10%)",             val:125,   color:"rgba(255,255,255,.3)" },
                ]
              },
            ].map(plan => (
              <div key={plan.name} style={{ background:plan.bg,
                border:`1px solid ${plan.border}`, borderRadius:18, overflow:"hidden" }}>
                <div style={{ padding:"22px 26px", borderBottom:`1px solid ${plan.border}` }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em",
                    textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:6 }}>
                    {plan.name}
                  </div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36,
                    color:plan.color, letterSpacing:"2px", lineHeight:1 }}>
                    ${plan.pool.toLocaleString()} Pool
                  </div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginTop:4 }}>
                    {plan.sub}
                  </div>
                </div>
                <div style={{ padding:"8px 0" }}>
                  {plan.rows.map((row, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", padding:"13px 26px",
                      borderBottom:i < plan.rows.length-1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:18 }}>{row.medal}</span>
                        <span style={{ fontSize:13, color:"rgba(255,255,255,.55)" }}>{row.label}</span>
                      </div>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:15,
                        fontWeight:500, color:row.color }}>
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

      {/* ─── FAQ ────────────────────────────────────────────────────────────── */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(8,13,21,.5)" }}>
        <div className="hp-wrap" style={{ maxWidth:860, margin:"0 auto", padding:"100px 60px" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div className="hp-eyebrow" style={{ justifyContent:"center" }}>
              <span style={{ width:30, height:1, background:"#FFD700", display:"block" }}/>
              Got questions?
            </div>
            <h2 className="hp-sec-title">FREQUENTLY ASKED QUESTIONS</h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)" }}>
              Everything you need to know before your first 90-minute battle.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {FAQS.map((faq,i)=>(
              <details key={i} className="hp-faq" style={{ background:"rgba(13,18,29,.9)",
                border:"1px solid rgba(255,255,255,.07)", borderRadius:13, overflow:"hidden" }}>
                <summary className="hp-faq">
                  <span>{faq.q}</span>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28,
                    color:"#FFD700", flexShrink:0, lineHeight:1 }}>+</span>
                </summary>
                <div style={{ padding:"14px 24px 20px", fontSize:14.5,
                  color:"rgba(255,255,255,.5)", lineHeight:1.75,
                  borderTop:"1px solid rgba(255,255,255,.05)" }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────────────── */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)",
        position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0,
          background:"radial-gradient(ellipse 70% 80% at 50% 50%,rgba(255,215,0,.06) 0%,transparent 70%)" }}/>
        <div className="hp-wrap" style={{ maxWidth:1280, margin:"0 auto",
          padding:"120px 60px", textAlign:"center", position:"relative", zIndex:1 }}>
          <div style={{ maxWidth:640, margin:"0 auto" }}>
            <div className="hp-eyebrow" style={{ justifyContent:"center", marginBottom:20 }}>
              <span style={{ width:30, height:1, background:"#FFD700", display:"block" }}/>
              Ready to battle?
            </div>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",
              fontSize:"clamp(52px,6vw,88px)", letterSpacing:"2px",
              color:"#fff", marginBottom:20, lineHeight:.95 }}>
              90 MINUTES TO<br/>PROVE YOUR SKILL
            </h2>
            <p style={{ fontSize:16, color:"rgba(255,255,255,.4)", marginBottom:40, lineHeight:1.7 }}>
              No evaluation. No minimum target. Just trade your MT5 demo,
              beat the competition in 90 minutes, and win{" "}
              <strong style={{ color:"#22C55E" }}>instant USDT</strong> or a{" "}
              <strong style={{ color:"#FFD700" }}>funded account.</strong>
            </p>
            <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/register" style={{ background:"linear-gradient(135deg,#FFD700,#FFA500)",
                color:"#000", fontWeight:700, fontSize:16, padding:"18px 44px",
                borderRadius:8, textDecoration:"none", letterSpacing:".04em",
                boxShadow:"0 0 40px rgba(255,215,0,.25)" }}>
                Create Free Account
              </Link>
              <Link href="/tournaments" style={{ background:"transparent",
                border:"1px solid rgba(255,255,255,.2)", color:"#fff",
                fontWeight:600, fontSize:16, padding:"18px 44px",
                borderRadius:8, textDecoration:"none", letterSpacing:".04em" }}>
                View Live Battles
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
