"use client";
import Link from "next/link";
import Image from "next/image";

const TIERS = [
  { name:"Hours Bullet", fee:"$20 USDT", color:"#60a5fa", bg:"rgba(96,165,250,.06)", border:"rgba(96,165,250,.2)", duration:"Fast 4 Hours duration", balance:"$1,000 demo balance",
    features:["Up to 10 re-entries per tournament","Track total collection live in dashboard","Winner gets 90% of fee collections","2nd place: 3× fee returned","3rd place: 2× fee returned","Tournament starts with minimum 20 entries"] },
  { name:"Daily Pill", fee:"$50 USDT", color:"#FFD700", bg:"rgba(255,215,0,.07)", border:"rgba(255,215,0,.25)", duration:"24 Hours duration", balance:"$1,000 demo balance", featured:true,
    features:["Up to 10 re-entries per tournament","Track total collection live in dashboard","Winner gets 90% of fee collections","2nd place: 3× fee returned","3rd place: 2× fee returned","Tournament starts with minimum 20 entries"] },
  { name:"Weekly Marathon", fee:"$100 USDT", color:"#22C55E", bg:"rgba(34,197,94,.06)", border:"rgba(34,197,94,.2)", duration:"5 trading days (Mon–Fri)", balance:"$1,000 demo balance",
    features:["Up to 10 re-entries per tournament","Track total collection live in dashboard","Winner gets 90% of fee collections","2nd place: 3× fee returned","3rd place: 2× fee returned","Tournament starts with minimum 20 entries"] },
];
const PRIZES = [
  { place:"1st", medal:"🥇", color:"#FFD700", bg:"rgba(255,215,0,.06)", border:"rgba(255,215,0,.2)", label:"Tournament Champion", reward:"Funded Account", detail:"90% of total prize pool", cert:"Gold Certificate issued on-chain", featured:true },
  { place:"2nd", medal:"🥈", color:"#b4c0d8", bg:"rgba(180,192,216,.04)", border:"rgba(180,192,216,.15)", label:"Runner Up", reward:"3× Entry Fee", detail:"Cash returned in USDT", cert:"Silver Certificate issued on-chain" },
  { place:"3rd", medal:"🥉", color:"#CD7F32", bg:"rgba(205,127,50,.04)", border:"rgba(205,127,50,.15)", label:"Top Finisher", reward:"2× Entry Fee", detail:"Cash returned in USDT", cert:"Bronze Certificate issued on-chain" },
];
const STEPS = [
  { n:"01", title:"Register & pay entry", desc:"Pay USDT via crypto link or wallet. Works from Binance or any exchange — no personal wallet needed.", icon:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" },
  { n:"02", title:"Open your MT5 demo", desc:"Create a free demo at Exness, ICMarkets or Tickmill. Submit your investor (read-only) password.", icon:"M22 12h-4l-3 9L9 3l-3 9H2" },
  { n:"03", title:"Trade Actively till End", desc:"We track your % gain live via MetaApi every 60 seconds. Your leaderboard rank updates in real time.", icon:"M18 20V10M12 20V4M6 20v-6" },
  { n:"04", title:"Win your funded account", desc:"Highest % gain wins 90% of the prize pool as a real funded account. 2nd gets 3× fee, 3rd gets 2× fee.", icon:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
];
const RULES = [
  { title:"Min 31s per trade", desc:"Trades closed in under 31 seconds are excluded from your score — not a disqualification.", color:"#FFD700" },
  { title:"No hedging", desc:"Simultaneous buy and sell on the same pair are excluded from score.", color:"#60a5fa" },
  { title:"No external deposit", desc:"Adding funds to your demo after tournament start = instant disqualification.", color:"#EF4444" },
  { title:"Account locked at start", desc:"Your MT5 credentials are locked at tournament start. No changes possible.", color:"#22C55E" },
];
const COMPARISON = [
  { feature:"Min. Cost",            mft:"$20",             ftmo:"$155+",                          broker:"$10+" },
  { feature:"Evaluation Required",  mft:"❌ None",          ftmo:"✅ Mandatory",                   broker:"N/A" },
  { feature:"Payout Denial",        mft:"❌ Never",         ftmo:"⚠️ Possible",                    broker:"⚠️ Possible" },
  { feature:"Demo Account Risk",    mft:"✅ Zero",          ftmo:"❌ Real evaluation",              broker:"❌ Real money" },
  { feature:"Re-entries",           mft:"✅ Up to 10",      ftmo:"❌ No re-entry in same eval",     broker:"N/A" },
  { feature:"Prize Transparency",   mft:"✅ 100% live",     ftmo:"❌ Fixed payouts",                broker:"❌ Spread-based" },
  { feature:"Time to First Payout", mft:"Hours / Days",    ftmo:"14 / 30 days",                   broker:"Varies" },
  { feature:"Profit Share",         mft:"90%",             ftmo:"80–90%",                         broker:"100% (high risk)" },
  { feature:"Beginner-Friendly",    mft:"✅ Yes",           ftmo:"❌ Hard",                         broker:"⚠️ Risky" },
];
const FAQS = [
  { q:"What is MyFundedTournament?", a:"MyFundedTournament is a forex trading competition platform where traders pay a small USDT entry fee to compete on MT5 demo accounts. The trader with the highest % gain wins a real funded trading account — no evaluation, no minimum balance required." },
  { q:"Do I need a real trading account?", a:"No. You open a free MT5 demo account at Exness, ICMarkets, or Tickmill. You only submit your investor (read-only) password — we never touch your funds." },
  { q:"How is the winner decided?", a:"The trader with the highest percentage gain on their starting demo balance wins. It is purely performance-based — the best trader wins, period." },
  { q:"How do I pay the entry fee?", a:"Entry fees are paid in USDT (TRC-20) via NOWPayments. You can pay directly from Binance, any crypto exchange, or your wallet — no personal wallet setup required." },
  { q:"What happens to the entry fees?", a:"All entry fees go into the prize pool. 90% goes to 1st place (funded account), 3x fee to 2nd place, 2x fee to 3rd place. The platform takes 10% to cover operations." },
  { q:"Can I enter multiple times?", a:"Yes! You can re-enter up to 10 times per tournament, each with a fresh MT5 demo account. Each re-entry is a new chance to win." },
  { q:"When does a tournament start?", a:"Tournaments start automatically once a minimum of 20 entries are collected. This ensures a fair competitive prize pool for all participants." },
  { q:"How do I receive my winnings?", a:"Winners receive a real funded trading account (1st place) or USDT sent directly to their wallet (2nd and 3rd place). Payouts are processed within 24-48 hours of tournament end." },
  { q:"Is my MT5 password safe?", a:"We only require your investor (read-only) password, which grants zero ability to place trades or withdraw funds. Your account is completely safe." },
  { q:"What brokers are supported?", a:"Currently Exness, ICMarkets, and Tickmill. All three offer free MT5 demo accounts you can open in minutes with no deposit required." },
];

export default function HomePage() {
  return (
    <div style={{ background:"#050810" }}>
      <style>{`
        /* ── Mobile ── */
        @media(max-width:900px){
          .hero-grid{grid-template-columns:1fr !important;}
          .hero-photo{display:none !important;}
          .stats-bar{grid-template-columns:1fr 1fr !important;}
          .grid-3-r{grid-template-columns:1fr !important;}
          .grid-4-r{grid-template-columns:1fr 1fr !important;}
          .rules-2col{grid-template-columns:1fr !important; gap:32px !important;}
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

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="hero-pad hero-grid" style={{
        maxWidth:1280, margin:"0 auto",
        padding:"52px 48px 36px",
        display:"grid",
        gridTemplateColumns:"1fr 480px",
        gap:56,
        alignItems:"center",
      }}>

        {/* Background glows */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
          background:"radial-gradient(ellipse 700px 600px at 68% 38%, rgba(34,197,94,.06) 0%, transparent 70%), radial-gradient(ellipse 500px 400px at 12% 65%, rgba(255,215,0,.04) 0%, transparent 60%)"
        }}/>

        {/* ── LEFT: Text ── */}
        <div style={{ position:"relative", zIndex:1 }}>

          {/* Live badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.22)",
            borderRadius:100, padding:"6px 16px 6px 10px",
            fontSize:13, fontWeight:600, color:"#FFD700", marginBottom:28 }}>
            <span className="live-dot"/>
            4 Live Tournaments &middot; 347 Active Traders
          </div>

          {/* H1 */}
          <h1 style={{
            fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
            fontSize:"clamp(40px,4.8vw,64px)",
            fontWeight:800, lineHeight:1.08,
            letterSpacing:"-2px",
            marginBottom:22, color:"#fff"
          }}>
            Compete Demo.<br/>
            <span style={{ color:"#FFD700" }}>Win Real</span>{" "}
            <span style={{ color:"rgba(255,255,255,.42)" }}>Funding.</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize:17, color:"rgba(255,255,255,.58)",
            lineHeight:1.75, maxWidth:500, marginBottom:28,
            fontFamily:"'Inter',system-ui,sans-serif"
          }}>
            Enter MT5 demo tournaments at{" "}
            <strong style={{ color:"rgba(255,255,255,.85)", fontWeight:600 }}>Exness, ICMarkets or Tickmill.</strong>{" "}
            Your entry fee joins the prize pool. Top trader wins a{" "}
            <strong style={{ color:"rgba(255,255,255,.85)", fontWeight:600 }}>real funded account</strong> — no evaluation needed.
          </p>

          {/* Pills */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:32 }}>
            <span className="pill pill-green">Winner takes 90% Funds</span>
            <span className="pill pill-gold">Zero Evaluation</span>
            <span className="pill pill-blue">Daily Withdrawals</span>
          </div>

          {/* CTA Buttons */}
          <div style={{ display:"flex", gap:14, marginBottom:36, flexWrap:"wrap" }}>
            <Link href="/tournaments" className="btn btn-primary btn-lg">Browse Tournaments</Link>
            <Link href="/how-it-works" className="btn btn-ghost btn-lg">How It Works</Link>
          </div>

          {/* Trust row */}
          <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
            {[
              ["MT5 demo — zero risk",    "#22C55E"],
              ["Transparent prize pool",  "#22C55E"],
              ["No payout denial ever",   "#22C55E"],
            ].map(([t, c]) => (
              <div key={t as string} style={{ display:"flex", alignItems:"center", gap:7,
                fontSize:13, color:"rgba(255,255,255,.45)", fontWeight:500 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={c as string} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Photo ── */}
        <div className="hero-photo" style={{ position:"relative", zIndex:1 }}>

          {/* Glow rings behind photo */}
          <div style={{
            position:"absolute", inset:0, borderRadius:"50%",
            background:"radial-gradient(circle at 50% 60%, rgba(255,215,0,.13) 0%, rgba(34,197,94,.07) 45%, transparent 70%)",
            transform:"scale(1.05)"
          }}/>
          <div style={{ position:"absolute", inset:"-4%", borderRadius:"50%",
            border:"1px solid rgba(255,215,0,.14)" }}/>
          <div style={{ position:"absolute", inset:"-10%", borderRadius:"50%",
            border:"1px solid rgba(255,215,0,.07)" }}/>

          {/* Photo wrapper */}
          <div style={{ position:"relative" }}>
            <Image
              src="/ai-character.png"
              alt="MFT Champion Trader"
              width={480}
              height={480}
              priority
              style={{ width:"100%", height:"auto", display:"block",
                filter:"hue-rotate(218deg) saturate(1.25) brightness(1.04)",
                borderRadius:8
              }}
            />

            {/* ── MFT shirt logo overlay ── */}
            <div style={{
              position:"absolute",
              bottom:"30%", left:"50%",
              transform:"translateX(-50%)",
              background:"rgba(5,8,16,.82)",
              border:"1.5px solid rgba(255,215,0,.55)",
              borderRadius:10,
              padding:"6px 18px",
              backdropFilter:"blur(10px)",
              WebkitBackdropFilter:"blur(10px)",
              textAlign:"center",
              whiteSpace:"nowrap",
              boxShadow:"0 4px 24px rgba(0,0,0,.5)"
            }}>
              <div style={{
                fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
                fontWeight:900, fontSize:15,
                color:"#FFD700", letterSpacing:"2px"
              }}>MFT</div>
              <div style={{ fontSize:9.5, color:"rgba(255,255,255,.6)",
                letterSpacing:"0.6px", marginTop:1 }}>
                MyFundedTournament
              </div>
            </div>

            {/* Floating badge: 90% */}
            <div style={{
              position:"absolute", top:"10%", left:"-8%",
              background:"rgba(10,14,24,.95)",
              border:"1px solid rgba(34,197,94,.4)",
              borderRadius:14, padding:"10px 16px",
              boxShadow:"0 8px 32px rgba(0,0,0,.4)"
            }}>
              <div style={{ fontSize:22, fontWeight:900, color:"#22C55E", lineHeight:1 }}>90%</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:3 }}>Winner Prize</div>
            </div>

            {/* Floating badge: $20 */}
            <div style={{
              position:"absolute", top:"14%", right:"-8%",
              background:"rgba(10,14,24,.95)",
              border:"1px solid rgba(255,215,0,.4)",
              borderRadius:14, padding:"10px 16px",
              boxShadow:"0 8px 32px rgba(0,0,0,.4)"
            }}>
              <div style={{ fontSize:22, fontWeight:900, color:"#FFD700", lineHeight:1 }}>$20</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:3 }}>Start from</div>
            </div>

            {/* Floating badge: 0% Denial */}
            <div style={{
              position:"absolute", bottom:"10%", left:"-8%",
              background:"rgba(10,14,24,.95)",
              border:"1px solid rgba(96,165,250,.4)",
              borderRadius:14, padding:"10px 16px",
              boxShadow:"0 8px 32px rgba(0,0,0,.4)"
            }}>
              <div style={{ fontSize:22, fontWeight:900, color:"#60a5fa", lineHeight:1 }}>0%</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:3 }}>Payout Denial</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.85)" }}>
        <div className="stats-bar" style={{ maxWidth:1280, margin:"0 auto", padding:"0 48px", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            { val:"Transparent", label:"Prize Money",                     color:"#FFD700" },
            { val:"0%",          label:"No Payout Denial Ever",           color:"#22C55E" },
            { val:"90%",         label:"Winner's Prize Share",            color:"#fff" },
            { val:"100%",        label:"Drawdown Limit on Funded Account", color:"#60a5fa" },
          ].map(({ val, label, color })=>(
            <div key={label} style={{ padding:"26px 20px", borderRight:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
              <div style={{ fontSize:"clamp(22px,2.8vw,32px)", fontWeight:900, color,
                letterSpacing:"-1px", marginBottom:6,
                fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{val}</div>
              <div style={{ fontSize:"clamp(11px,1.3vw,13px)", color:"rgba(255,255,255,.42)", fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRIZE STRUCTURE */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"80px 48px" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Prize Structure</div>
          <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>What winners receive</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:500, margin:"0 auto" }}>
            Every tournament rewards the top 3 traders. First place wins a fully funded trading account.
          </p>
        </div>
        <div className="grid-3-r" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:22 }}>
          {PRIZES.map(p=>(
            <div key={p.place} style={{ background:p.bg, border:`1px solid ${p.border}`, borderRadius:18, padding:30, position:"relative" }}>
              {p.featured && <div style={{ position:"absolute", top:16, right:16, background:"#FFD700", color:"#000", fontSize:10, fontWeight:800, padding:"3px 12px", borderRadius:20, textTransform:"uppercase" }}>Top Prize</div>}
              <div style={{ fontSize:38, marginBottom:14 }}>{p.medal}</div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.32)", marginBottom:8 }}>{p.label}</div>
              <div style={{ fontSize:30, fontWeight:900, color:p.color, letterSpacing:"-1px", marginBottom:8, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{p.reward}</div>
              <div style={{ fontSize:14, color:"rgba(255,255,255,.42)", marginBottom:18 }}>{p.detail}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontWeight:600, padding:"9px 14px", background:"rgba(255,255,255,.04)", borderRadius:9, border:"1px solid rgba(255,255,255,.06)" }}>{p.cert}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.6)" }}>
        <div className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"80px 48px" }}>
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
                {i<3 && <div style={{ position:"absolute", top:20, left:"calc(100% - 14px)", width:28, height:1, background:"rgba(255,215,0,.18)", zIndex:0 }}/>}
                <div style={{ width:44, height:44, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.22)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18, position:"relative", zIndex:1 }}>
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

      {/* TIERS */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"80px 48px" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Choose your battle</div>
          <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>Three tiers. One winner takes it all.</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)" }}>Pick an entry level. Open your MT5 demo. Trade till the end. Highest % gain wins.</p>
        </div>
        <div className="grid-3-r" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:22 }}>
          {TIERS.map(t=>(
            <div key={t.name} style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:18, padding:30, position:"relative" }}>
              {t.featured && <div style={{ position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)", background:"#FFD700", color:"#000", fontSize:10, fontWeight:800, padding:"4px 18px", borderRadius:"0 0 10px 10px", whiteSpace:"nowrap" }}>Most Popular</div>}
              <div style={{ marginTop:t.featured ? 16 : 0 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.32)", marginBottom:8 }}>{t.name}</div>
                <div style={{ fontSize:34, fontWeight:900, color:t.color, letterSpacing:"-1px", marginBottom:4, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{t.fee}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.28)", marginBottom:18 }}>entry fee</div>
              </div>
              <div style={{ background:"rgba(255,255,255,.04)", borderRadius:10, padding:"13px 15px", marginBottom:20, border:"1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.72)", fontWeight:600, marginBottom:5 }}>&#9201; {t.duration}</div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.48)" }}>&#128176; Starts with {t.balance}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:24 }}>
                {t.features.map((f,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:9, fontSize:13.5, color:"rgba(255,255,255,.5)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0, marginTop:2 }}><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/tournaments" className="btn" style={{ width:"100%", justifyContent:"center", display:"flex",
                background:t.featured ? "#FFD700" : "rgba(255,255,255,.06)",
                color:t.featured ? "#000" : "rgba(255,255,255,.8)",
                border:t.featured ? "none" : `1px solid ${t.border}`,
                fontWeight:700, fontSize:15 }}>
                Join {t.name} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* RULES */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div className="page-pad rules-2col" style={{ maxWidth:1280, margin:"0 auto", padding:"80px 48px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"start" }}>
          <div>
            <div className="section-eyebrow">Fair play</div>
            <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:18 }}>Simple rules, auto-enforced</h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.52)", lineHeight:1.75, marginBottom:10, fontWeight:600 }}>
              Rules auto-enforced via our cutting edge technology.
            </p>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.34)", lineHeight:1.75, marginBottom:32 }}>
              All checks happen automatically in real time — no manual review, no grey areas, no disputes.
            </p>
            <Link href="/tournaments" className="btn btn-primary">See Open Tournaments</Link>
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

      {/* COMPARISON */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"80px 48px" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Why MFT wins</div>
          <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>MFT vs FTMO vs Traditional Brokers</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:520, margin:"0 auto" }}>
            See exactly why thousands of traders choose MFT over expensive prop firms and risky brokers.
          </p>
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
                <th style={{ padding:"18px 22px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.5)" }}>FTMO</div>
                </th>
                <th style={{ padding:"18px 22px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.5)" }}>Broker (Exness)</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row,i)=>(
                <tr key={row.feature} style={{ background:i%2===0 ? "rgba(7,9,15,.4)" : "transparent" }}>
                  <td style={{ padding:"14px 22px", fontSize:14, color:"rgba(255,255,255,.6)", fontWeight:500, borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.feature}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14, fontWeight:700, color:"#22C55E", background:"rgba(255,215,0,.03)", borderLeft:"1px solid rgba(255,215,0,.08)", borderBottom:"1px solid rgba(255,215,0,.05)" }}>{row.mft}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14, color:"rgba(255,255,255,.45)", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.ftmo}</td>
                  <td style={{ padding:"14px 22px", textAlign:"center", fontSize:14, color:"rgba(255,255,255,.45)", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.broker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Disclaimer */}
        <div style={{ marginTop:22, background:"rgba(255,215,0,.04)", border:"1px solid rgba(255,215,0,.12)", borderRadius:12, padding:"15px 20px" }}>
          <p style={{ fontSize:11.5, color:"rgba(255,255,255,.28)", lineHeight:1.75, margin:0 }}>
            <strong style={{ color:"rgba(255,215,0,.45)", fontWeight:700 }}>Disclaimer: </strong>
            MyFundedTournament is a skills-based demo trading competition platform. All trading takes place on MT5 demo accounts using virtual funds — no real money is traded or at risk during tournaments. Entry fees fund the prize pool. Past demo performance does not guarantee live account results. Funded account prizes are subject to KYC verification and our standard terms. FTMO and broker data is based on publicly available information and may change. MFT is not a broker, investment advisor, or financial institution. Forex trading involves substantial risk and is not suitable for all investors.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div className="faq-pad" style={{ maxWidth:860, margin:"0 auto", padding:"80px 48px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div className="section-eyebrow">Got questions?</div>
            <h2 className="sec-title section-title" style={{ fontSize:34, marginBottom:14 }}>Frequently Asked Questions</h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)" }}>Everything you need to know before your first tournament.</p>
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

      {/* CTA */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)" }}>
        <div className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"80px 48px", textAlign:"center" }}>
          <div style={{ maxWidth:580, margin:"0 auto" }}>
            <div className="section-eyebrow" style={{ marginBottom:18 }}>Ready to compete?</div>
            <h2 className="cta-h" style={{
              fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
              fontSize:38, fontWeight:800, letterSpacing:"-1.2px",
              color:"#fff", marginBottom:16, lineHeight:1.1
            }}>
              Start trading your way to a{" "}<span style={{ color:"#FFD700" }}>funded account</span>
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", marginBottom:36, lineHeight:1.7 }}>
              No evaluation. No minimum target. Just trade your MT5 demo, beat the competition, and win real capital.
            </p>
            <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
              <Link href="/tournaments" className="btn btn-ghost btn-lg">View All Tournaments</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
