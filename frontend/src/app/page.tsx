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
  { feature:"Entry Cost", mft:"From $20 USDT", ftmo:"$155+", broker:"Capital at risk" },
  { feature:"Evaluation Required", mft:"❌ None", ftmo:"✅ Mandatory", broker:"N/A" },
  { feature:"Payout Denial", mft:"❌ Never", ftmo:"⚠️ Possible", broker:"⚠️ Possible" },
  { feature:"Demo Account Risk", mft:"✅ Zero", ftmo:"❌ Real evaluation", broker:"❌ Real money" },
  { feature:"Min. Deposit", mft:"$0", ftmo:"$6,000+", broker:"$200+" },
  { feature:"Prize Transparency", mft:"✅ 100% live", ftmo:"❌ Fixed payouts", broker:"❌ Spread-based" },
  { feature:"Re-entries", mft:"✅ Up to 10", ftmo:"❌ Pay again", broker:"N/A" },
  { feature:"Time to First Payout", mft:"Hours / Days", ftmo:"30–90 days", broker:"Varies" },
  { feature:"Profit Share", mft:"90%", ftmo:"80–90%", broker:"100% (high risk)" },
  { feature:"Beginner-Friendly", mft:"✅ Yes", ftmo:"❌ Hard", broker:"⚠️ Risky" },
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

      {/* HERO */}
      <section style={{ maxWidth:1280, margin:"0 auto", padding:"60px 40px 40px", display:"grid", gridTemplateColumns:"1fr 400px", gap:48, alignItems:"center", minHeight:"88vh", position:"relative" }}>
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background:"radial-gradient(ellipse 700px 600px at 65% 35%, rgba(34,197,94,.06) 0%, transparent 70%), radial-gradient(ellipse 500px 400px at 15% 70%, rgba(255,215,0,.04) 0%, transparent 60%)" }}/>

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.2)", borderRadius:100, padding:"5px 14px 5px 8px", fontSize:12, fontWeight:600, color:"#FFD700", marginBottom:28 }}>
            <span className="live-dot"/>
            4 Live Tournaments &middot; 347 Active Traders
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:"clamp(36px,4vw,54px)", fontWeight:800, lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:20, color:"#fff" }}>
            Compete Demo.<br/>
            <span style={{ color:"#FFD700" }}>Win Real</span>{" "}
            <span style={{ color:"rgba(255,255,255,.45)" }}>Funding.</span>
          </h1>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.5)", lineHeight:1.7, maxWidth:500, marginBottom:28 }}>
            Enter MT5 demo tournaments at{" "}
            <strong style={{ color:"rgba(255,255,255,.8)" }}>Exness, ICMarkets or Tickmill.</strong>{" "}
            Your entry fee joins the prize pool. Top trader wins a{" "}
            <strong style={{ color:"rgba(255,255,255,.8)" }}>real funded account</strong> — no evaluation needed.
          </p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:28 }}>
            <span className="pill pill-green">Winner takes 90% Funds</span>
            <span className="pill pill-gold">Zero Evaluation</span>
            <span className="pill pill-blue">Daily Withdrawals</span>
          </div>
          <div style={{ display:"flex", gap:12, marginBottom:36 }}>
            <Link href="/tournaments" className="btn btn-primary btn-lg">Browse Tournaments</Link>
            <Link href="/how-it-works" className="btn btn-ghost btn-lg">How It Works</Link>
          </div>
          <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
            {["MT5 demo — zero risk","Transparent prize pool","No payout denial ever"].map(t=>(
              <div key={t} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"rgba(255,255,255,.35)", fontWeight:500 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* AI Character */}
        <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ position:"absolute", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,215,0,.1) 0%, rgba(34,197,94,.06) 40%, transparent 70%)" }}/>
          <div style={{ position:"absolute", width:330, height:330, borderRadius:"50%", border:"1px solid rgba(255,215,0,.12)" }}/>
          <div style={{ position:"absolute", width:290, height:290, borderRadius:"50%", border:"1px solid rgba(255,215,0,.07)" }}/>
          <div style={{ position:"relative" }}>
            <Image src="/ai-character.png" alt="MFT Champion" width={380} height={420} style={{ objectFit:"contain", filter:"hue-rotate(220deg) saturate(1.3) brightness(1.05)" }} priority/>
            <div style={{ position:"absolute", bottom:"30%", left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,.75)", border:"1px solid rgba(255,215,0,.4)", borderRadius:8, padding:"4px 14px", backdropFilter:"blur(8px)", textAlign:"center", whiteSpace:"nowrap" }}>
              <div style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontWeight:900, fontSize:13, color:"#FFD700", letterSpacing:"1px" }}>MFT</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.55)", letterSpacing:"0.5px" }}>MyFundedTournament</div>
            </div>
          </div>
          <div style={{ position:"absolute", top:"8%", left:"-8%", background:"rgba(10,14,24,.95)", border:"1px solid rgba(34,197,94,.3)", borderRadius:12, padding:"10px 14px", zIndex:3 }}>
            <div style={{ fontSize:18, fontWeight:900, color:"#22C55E" }}>90%</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.4)" }}>Winner Prize</div>
          </div>
          <div style={{ position:"absolute", top:"12%", right:"-6%", background:"rgba(10,14,24,.95)", border:"1px solid rgba(255,215,0,.3)", borderRadius:12, padding:"10px 14px", zIndex:3 }}>
            <div style={{ fontSize:18, fontWeight:900, color:"#FFD700" }}>$20</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.4)" }}>Start from</div>
          </div>
          <div style={{ position:"absolute", bottom:"6%", left:"-4%", background:"rgba(10,14,24,.95)", border:"1px solid rgba(96,165,250,.3)", borderRadius:12, padding:"10px 14px", zIndex:3 }}>
            <div style={{ fontSize:18, fontWeight:900, color:"#60a5fa" }}>0%</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.4)" }}>Payout Denial</div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.8)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 40px", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            { val:"Transparent", label:"Prize Money", color:"#FFD700" },
            { val:"0%", label:"No Payout Denial Ever", color:"#22C55E" },
            { val:"90%", label:"Winner's Prize Share", color:"#fff" },
            { val:"100%", label:"Drawdown Limit on Funded Account", color:"#60a5fa" },
          ].map(({ val, label, color })=>(
            <div key={label} style={{ padding:"28px 24px", borderRight:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
              <div style={{ fontSize:30, fontWeight:900, color, letterSpacing:"-1px", marginBottom:6, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{val}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRIZE STRUCTURE */}
      <section style={{ maxWidth:1280, margin:"0 auto", padding:"80px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Prize Structure</div>
          <h2 className="section-title" style={{ fontSize:32, marginBottom:12 }}>What winners receive</h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:480, margin:"0 auto" }}>Every tournament rewards the top 3 traders. First place wins a fully funded trading account.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
          {PRIZES.map(p=>(
            <div key={p.place} style={{ background:p.bg, border:`1px solid ${p.border}`, borderRadius:16, padding:28, position:"relative" }}>
              {p.featured && <div style={{ position:"absolute", top:16, right:16, background:"#FFD700", color:"#000", fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, textTransform:"uppercase" }}>Top Prize</div>}
              <div style={{ fontSize:36, marginBottom:12 }}>{p.medal}</div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:8 }}>{p.label}</div>
              <div style={{ fontSize:28, fontWeight:900, color:p.color, letterSpacing:"-1px", marginBottom:6, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{p.reward}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", marginBottom:16 }}>{p.detail}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontWeight:600, padding:"8px 12px", background:"rgba(255,255,255,.04)", borderRadius:8, border:"1px solid rgba(255,255,255,.06)" }}>
                {p.cert}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.6)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"80px 40px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:52 }}>
            <div>
              <div className="section-eyebrow">Simple as 4 steps</div>
              <h2 className="section-title" style={{ fontSize:32 }}>How it works</h2>
            </div>
            <Link href="/how-it-works" style={{ fontSize:13, color:"#FFD700", textDecoration:"none", fontWeight:600 }}>Full Visual Guide →</Link>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24 }}>
            {STEPS.map((s,i)=>(
              <div key={s.n} style={{ position:"relative" }}>
                {i<3&&<div style={{ position:"absolute", top:20, left:"calc(100% - 12px)", width:24, height:1, background:"rgba(255,215,0,.15)", zIndex:0 }}/>}
                <div style={{ width:40, height:40, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.2)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,215,0,.5)", letterSpacing:".12em", marginBottom:8 }}>STEP {s.n}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:8, lineHeight:1.3 }}>{s.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section style={{ maxWidth:1280, margin:"0 auto", padding:"80px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Choose your battle</div>
          <h2 className="section-title" style={{ fontSize:32, marginBottom:12 }}>Three tiers. One winner takes it all.</h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>Pick an entry level. Open your MT5 demo. Trade till the end. Highest % gain wins the funded account.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
          {TIERS.map(t=>(
            <div key={t.name} style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:16, padding:28, position:"relative" }}>
              {t.featured&&<div style={{ position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)", background:"#FFD700", color:"#000", fontSize:10, fontWeight:800, padding:"4px 16px", borderRadius:"0 0 10px 10px", whiteSpace:"nowrap" }}>Most Popular</div>}
              <div style={{ marginTop:t.featured?14:0 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:8 }}>{t.name}</div>
                <div style={{ fontSize:32, fontWeight:900, color:t.color, letterSpacing:"-1px", marginBottom:4, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{t.fee}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginBottom:16 }}>entry fee</div>
              </div>
              <div style={{ background:"rgba(255,255,255,.04)", borderRadius:10, padding:"12px 14px", marginBottom:18, border:"1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.7)", fontWeight:600, marginBottom:4 }}>&#9201; {t.duration}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>&#128176; Starts with {t.balance}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
                {t.features.map((f,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:13, color:"rgba(255,255,255,.5)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0, marginTop:2 }}><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/tournaments" className="btn" style={{ width:"100%", justifyContent:"center", background:t.featured?"#FFD700":"rgba(255,255,255,.06)", color:t.featured?"#000":"rgba(255,255,255,.8)", border:t.featured?"none":`1px solid ${t.border}`, fontWeight:700, display:"flex" }}>
                Join {t.name} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* RULES */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"80px 40px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"start" }}>
            <div>
              <div className="section-eyebrow">Fair play</div>
              <h2 className="section-title" style={{ fontSize:32, marginBottom:16 }}>Simple rules, auto-enforced</h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7, marginBottom:8, fontWeight:600 }}>
                Rules auto-enforced via our cutting edge technology.
              </p>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.35)", lineHeight:1.7, marginBottom:28 }}>
                All checks happen automatically in real time — no manual review, no grey areas, no disputes.
              </p>
              <Link href="/tournaments" className="btn btn-primary">See Open Tournaments</Link>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {RULES.map(r=>(
                <div key={r.title} style={{ background:"rgba(13,18,29,.8)", border:"1px solid rgba(255,255,255,.06)", borderRadius:12, padding:18, display:"flex", gap:14 }}>
                  <div style={{ width:6, borderRadius:3, flexShrink:0, background:r.color, opacity:.7 }}/>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.85)", marginBottom:4 }}>{r.title}</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.5 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section style={{ maxWidth:1280, margin:"0 auto", padding:"80px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div className="section-eyebrow">Why MFT wins</div>
          <h2 className="section-title" style={{ fontSize:32, marginBottom:12 }}>MFT vs FTMO vs Traditional Brokers</h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:500, margin:"0 auto" }}>See exactly why thousands of traders choose MFT over expensive prop firms and risky brokers.</p>
        </div>
        <div style={{ borderRadius:16, border:"1px solid rgba(255,255,255,.08)", overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr", background:"rgba(13,18,29,.95)" }}>
            <div style={{ padding:"18px 20px", fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".08em" }}>Feature</div>
            {[{ name:"MyFundedTournament", color:"#FFD700", highlight:true },{ name:"FTMO", color:"rgba(255,255,255,.5)" },{ name:"Broker (Exness)", color:"rgba(255,255,255,.5)" }].map(col=>(
              <div key={col.name} style={{ padding:"18px 20px", textAlign:"center", background:col.highlight?"rgba(255,215,0,.07)":"transparent", borderLeft:col.highlight?"1px solid rgba(255,215,0,.15)":"1px solid rgba(255,255,255,.05)" }}>
                {col.highlight&&<div style={{ fontSize:10, fontWeight:700, color:"#FFD700", letterSpacing:".1em", textTransform:"uppercase", marginBottom:4 }}>&#11088; Best Choice</div>}
                <div style={{ fontSize:14, fontWeight:700, color:col.color }}>{col.name}</div>
              </div>
            ))}
          </div>
          {COMPARISON.map((row,i)=>(
            <div key={row.feature} style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr", borderTop:"1px solid rgba(255,255,255,.05)", background:i%2===0?"rgba(7,9,15,.4)":"transparent" }}>
              <div style={{ padding:"14px 20px", fontSize:13, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{row.feature}</div>
              <div style={{ padding:"14px 20px", textAlign:"center", fontSize:13, fontWeight:700, color:"#22C55E", background:"rgba(255,215,0,.03)", borderLeft:"1px solid rgba(255,215,0,.08)" }}>{row.mft}</div>
              <div style={{ padding:"14px 20px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,.45)", borderLeft:"1px solid rgba(255,255,255,.05)" }}>{row.ftmo}</div>
              <div style={{ padding:"14px 20px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,.45)", borderLeft:"1px solid rgba(255,255,255,.05)" }}>{row.broker}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div style={{ maxWidth:860, margin:"0 auto", padding:"80px 40px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div className="section-eyebrow">Got questions?</div>
            <h2 className="section-title" style={{ fontSize:32, marginBottom:12 }}>Frequently Asked Questions</h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>Everything you need to know before your first tournament.</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {FAQS.map((faq,i)=>(
              <details key={i} style={{ background:"rgba(13,18,29,.8)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, overflow:"hidden" }}>
                <summary style={{ padding:"18px 22px", fontSize:14, fontWeight:600, color:"rgba(255,255,255,.85)", cursor:"pointer", listStyle:"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  {faq.q}
                  <span style={{ fontSize:18, color:"#FFD700", flexShrink:0, marginLeft:12 }}>+</span>
                </summary>
                <div style={{ padding:"14px 22px 18px", fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7, borderTop:"1px solid rgba(255,255,255,.05)" }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"80px 40px", textAlign:"center" }}>
          <div style={{ maxWidth:560, margin:"0 auto" }}>
            <div className="section-eyebrow" style={{ marginBottom:16 }}>Ready to compete?</div>
            <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:36, fontWeight:800, letterSpacing:"-1px", color:"#fff", marginBottom:14, lineHeight:1.1 }}>
              Start trading your way to a{" "}
              <span style={{ color:"#FFD700" }}>funded account</span>
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", marginBottom:32, lineHeight:1.6 }}>
              No evaluation. No minimum target. Just trade your MT5 demo, beat the competition, and win real capital.
            </p>
            <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
              <Link href="/tournaments" className="btn btn-ghost btn-lg">View All Tournaments</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
