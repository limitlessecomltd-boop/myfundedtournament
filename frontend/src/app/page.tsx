"use client";
import Link from "next/link";
import MFTLogo from "@/components/ui/MFTLogo";

const TIERS = [
  { key:"starter", name:"Starter", fee:"$10", color:"var(--blue)", dim:"rgba(96,165,250,.1)", border:"rgba(96,165,250,.2)", max:50 },
  { key:"pro",     name:"Pro",     fee:"$50", color:"var(--gold)", dim:"rgba(255,215,0,.08)",  border:"rgba(255,215,0,.25)",  max:30, featured:true },
  { key:"elite",   name:"Elite",   fee:"$100",color:"var(--green)",dim:"rgba(34,197,94,.08)", border:"rgba(34,197,94,.2)",   max:20 },
];
const STEPS = [
  { n:"01", icon:<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>, title:"Register & pay entry", desc:"Pay USDT via crypto link or wallet. Works from Binance or any exchange — no personal wallet needed." },
  { n:"02", icon:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>, title:"Open your MT5 demo", desc:"Create a free demo at Exness, ICMarkets or Tickmill. Submit your investor (read-only) password." },
  { n:"03", icon:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>, title:"Trade for 7 days", desc:"We track your % gain live via MetaApi every 60 seconds. Your performance on the leaderboard updates in real time." },
  { n:"04", icon:<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>, title:"Win your funded account", desc:"Highest % gain wins 90% of the prize pool as a real funded account. 2nd gets 3× fee, 3rd gets 2× fee." },
];
const PRIZES = [
  { place:"1st", medal:"🥇", color:"var(--gold)", label:"Tournament Champion", reward:"Funded Account", detail:"90% of total prize pool", cert:"Gold Certificate" },
  { place:"2nd", medal:"🥈", color:"var(--silver)", label:"Runner Up", reward:"3× Entry Fee", detail:"Cash returned in USDT", cert:"Silver Certificate" },
  { place:"3rd", medal:"🥉", color:"var(--bronze)", label:"Top Finisher", reward:"2× Entry Fee", detail:"Cash returned in USDT", cert:"Bronze Certificate" },
];
const RULES = [
  { title:"Min 31s per trade", desc:"Trades closed in under 31 seconds are excluded from your % gain score — not a disqualification.", color:"var(--gold)" },
  { title:"No hedging", desc:"Simultaneous buy and sell on the same pair are excluded from score.", color:"var(--blue)" },
  { title:"No external deposit", desc:"Adding funds to your demo after tournament start = instant disqualification.", color:"var(--red)" },
  { title:"Account locked at start", desc:"Your MT5 credentials are locked at tournament start. No changes possible.", color:"var(--green)" },
];

export default function HomePage() {
  return (
    <div>
      {/* ── HERO ── */}
      <section style={{ minHeight:"90vh", display:"flex", alignItems:"center", padding:"0 40px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 55% at 68% 40%,rgba(34,197,94,.07) 0%,transparent 60%),radial-gradient(ellipse 50% 50% at 18% 65%,rgba(255,215,0,.05) 0%,transparent 55%)" }}/>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)", backgroundSize:"80px 80px", maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)" }}/>

        <div style={{ flex:1, maxWidth:620, position:"relative", zIndex:2 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,215,0,.07)", border:"1px solid rgba(255,215,0,.18)", borderRadius:100, padding:"6px 14px 6px 8px", fontSize:12, fontWeight:600, color:"var(--gold)", marginBottom:24 }}>
            <span className="live-dot"/>
            4 Live Tournaments · 347 Active Traders
          </div>

          <h1 style={{ fontFamily:"var(--font-head)", fontSize:"clamp(48px,6vw,68px)", fontWeight:900, lineHeight:1.0, letterSpacing:"-2.5px", marginBottom:18, color:"#fff" }}>
            Compete Demo.<br/>
            <span style={{ color:"var(--gold)" }}>Win Real</span><br/>
            <span style={{ color:"rgba(255,255,255,.5)" }}>Funding.</span>
          </h1>

          <div className="tagline-shine-wrap" style={{ marginBottom:22 }}>
            <span className="tagline-shine" style={{ fontSize:20, letterSpacing:".04em" }}>Compete Demo. Win Real Funding.</span>
          </div>

          <p style={{ fontSize:16, color:"rgba(255,255,255,.48)", lineHeight:1.75, maxWidth:480, marginBottom:30 }}>
            Enter MT5 demo tournaments at <strong style={{ color:"rgba(255,255,255,.78)" }}>Exness, ICMarkets or Tickmill.</strong>{" "}
            Your entry fee joins the prize pool. Top trader wins a <strong style={{ color:"rgba(255,255,255,.78)" }}>real funded account</strong> — no evaluation.
          </p>

          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:30 }}>
            <span className="pill pill-green">Winner takes 90% Funds</span>
            <span className="pill pill-gold">100% Drawdown</span>
            <span className="pill pill-blue">Daily Withdrawals</span>
          </div>

          <div style={{ display:"flex", gap:12, marginBottom:44 }}>
            <Link href="/tournaments" className="btn btn-primary btn-lg">Browse Tournaments</Link>
            <a href="#how-it-works" className="btn btn-ghost btn-lg">How It Works</a>
          </div>

          <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
            {[["MT5 demo — no manipulation","M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],["Fees tracked transparently","M20 6 9 17 4 12"],["Daily withdrawals","M3 11h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2V11zM7 11V7a5 5 0 0110 0v4"]].map(([t])=>(
              <div key={t} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"rgba(255,255,255,.38)", fontWeight:500 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Floating card */}
        <div style={{ flex:"0 0 380px", marginLeft:60, position:"relative", zIndex:2 }}>
          <div style={{ background:"rgba(12,16,26,.92)", border:"1px solid rgba(255,255,255,.08)", borderRadius:18, padding:22, boxShadow:"0 24px 80px rgba(0,0,0,.5),0 0 0 1px rgba(255,215,0,.05)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>Pro Challenge — Live</span>
              <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:600, color:"var(--green)" }}>
                <span className="live-dot" style={{ width:5, height:5 }}/>Live
              </span>
            </div>
            <div style={{ fontFamily:"var(--font-head)", fontSize:40, fontWeight:900, color:"var(--gold)", letterSpacing:"-1.5px", lineHeight:1, marginBottom:3 }}>$14,850</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.33)", marginBottom:18 }}>Total prize pool · 27 traders competing</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              {[["Entry Fee","$50 USDT"],["Sim Balance","$10,000"],["Winner Gets","90% Funds","var(--gold)"],["Ends In","3d 14h","var(--green)"]].map(([l,v,c])=>(
                <div key={l} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.06)", borderRadius:9, padding:"11px 13px" }}>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.32)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:(c as string)||"var(--text)" }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="pbar" style={{ marginBottom:5 }}><div className="pbar-fill" style={{ width:"90%", background:"linear-gradient(90deg,var(--green),#4ade80)" }}/></div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:9.5, color:"rgba(255,255,255,.3)", marginBottom:14 }}>
              <span>27 / 30 spots filled</span><span style={{ color:"var(--red)" }}>3 left</span>
            </div>
            <Link href="/tournaments" className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }}>Join This Tournament →</Link>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div style={{ background:"rgba(255,255,255,.02)", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", padding:"24px 40px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)", textAlign:"center" }}>
          {[["$48,500","Total Live Prize Pool","var(--gold)"],["347","Active Traders Now","var(--green)"],["90%","Winner's Prize Share","var(--text)"],["100%","Drawdown Limit on Funded Account","var(--blue)"]].map(([v,l,c])=>(
            <div key={l} style={{ borderRight:"1px solid var(--border)", padding:"0 20px" }}>
              <div style={{ fontFamily:"var(--font-head)", fontSize:30, fontWeight:900, letterSpacing:"-1px", marginBottom:4, color:c as string }}>{v}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.38)", fontWeight:500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRIZE STRUCTURE ── */}
      <section style={{ padding:"80px 40px 0", maxWidth:1280, margin:"0 auto" }}>
        <div className="section-eyebrow" style={{ textAlign:"center" }}>Prize Structure</div>
        <div className="section-title" style={{ textAlign:"center", marginBottom:14, fontSize:36 }}>What winners receive</div>
        <p style={{ textAlign:"center", color:"rgba(255,255,255,.4)", fontSize:15, marginBottom:52, maxWidth:500, margin:"0 auto 52px" }}>Every tournament rewards the top 3 traders. First place wins a fully funded trading account.</p>
        <div className="grid-3" style={{ gap:16 }}>
          {PRIZES.map((p,i) => (
            <div key={p.place} style={{ background:i===0?"linear-gradient(135deg,rgba(20,15,5,1) 0%,rgba(35,25,5,1) 100%)":"rgba(13,18,29,.95)", border:`1px solid ${p.color}33`, borderRadius:18, padding:28, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${p.color},transparent)` }}/>
              {i===0 && <div style={{ position:"absolute", top:16, right:16, background:"var(--gold)", color:"#000", fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20 }}>Top Prize</div>}
              <div style={{ fontSize:36, marginBottom:12 }}>{p.medal}</div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:11, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase", color:`${p.color}aa`, marginBottom:6 }}>{p.label}</div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:26, fontWeight:900, color:p.color, letterSpacing:"-.5px", marginBottom:4 }}>{p.reward}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:20 }}>{p.detail}</div>
              <div style={{ padding:"8px 14px", background:`${p.color}10`, border:`1px solid ${p.color}22`, borderRadius:8, fontSize:11, fontWeight:600, color:p.color }}>
                🏅 {p.cert} issued on-chain
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding:"80px 40px", maxWidth:1280, margin:"0 auto" }}>
        <div className="section-eyebrow">Simple as 4 steps</div>
        <div className="section-title" style={{ marginBottom:40, fontSize:36 }}>How it works</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1px", background:"rgba(255,255,255,.055)", borderRadius:18, overflow:"hidden" }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background:"#080c14", padding:28 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,215,0,.5)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:16 }}>Step {s.n}</div>
              <div style={{ width:40, height:40, borderRadius:10, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.15)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round">{s.icon}</svg>
              </div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:15, fontWeight:700, color:"#fff", marginBottom:8, letterSpacing:"-.1px" }}>{s.title}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TIERS ── */}
      <section style={{ padding:"0 40px 80px", maxWidth:1280, margin:"0 auto" }}>
        <div className="section-eyebrow">Choose your battle</div>
        <div className="section-title" style={{ marginBottom:14, fontSize:36 }}>Three tiers. One winner takes it all.</div>
        <p style={{ color:"rgba(255,255,255,.4)", fontSize:15, marginBottom:52, maxWidth:480 }}>Pick an entry level. Open your MT5 demo. Trade for 7 days. Highest % gain wins the funded account.</p>
        <div className="grid-3" style={{ gap:16 }}>
          {TIERS.map(t => (
            <div key={t.key} style={{ background:t.featured?"linear-gradient(135deg,rgba(20,15,5,1) 0%,rgba(35,25,5,1) 100%)":"rgba(13,18,29,.95)", border:`1px solid ${t.border}`, borderRadius:18, padding:28, position:"relative", overflow:"hidden", transition:".2s" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1.5, background:`linear-gradient(90deg,transparent,${t.color},transparent)` }}/>
              {t.featured && <div style={{ position:"absolute", top:18, right:18, background:"var(--gold)", color:"#000", fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20 }}>Most Popular</div>}
              <div style={{ display:"inline-flex", padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, background:t.dim, color:t.color, border:`1px solid ${t.border}`, marginBottom:20 }}>{t.name}</div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:48, fontWeight:900, letterSpacing:"-2px", lineHeight:1, marginBottom:4, color:"#fff" }}>{t.fee}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.3)", marginBottom:22, fontWeight:500 }}>USDT entry fee</div>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10, marginBottom:26 }}>
                {["$10,000 simulated balance",`${t.max} traders max · 7 day duration`,"Up to 10 re-entries per tournament","Winner: 90% funded · 100% drawdown","2nd place: 3× fee returned","3rd place: 2× fee returned"].map(item=>(
                  <li key={item} style={{ fontSize:13, color:"rgba(255,255,255,.6)", display:"flex", alignItems:"center", gap:10 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/tournaments" className="btn" style={{ width:"100%", justifyContent:"center", background:t.featured?"var(--gold)":t.dim, color:t.featured?"#000":t.color, border:t.featured?"none":`1px solid ${t.border}`, fontWeight:700 }}>
                Join {t.name} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── RULES ── */}
      <section id="rules" style={{ padding:"0 40px 80px", maxWidth:1280, margin:"0 auto" }}>
        <div className="section-eyebrow">Fair play</div>
        <div className="section-title" style={{ marginBottom:14, fontSize:36 }}>Rules auto-enforced via MetaApi</div>
        <p style={{ color:"rgba(255,255,255,.4)", fontSize:15, marginBottom:48, maxWidth:480 }}>Clean, objective, and automatically checked every 60 seconds. No manual review needed.</p>
        <div className="grid-2" style={{ gap:12 }}>
          {RULES.map(r => (
            <div key={r.title} style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderLeft:`3px solid ${r.color}`, borderRadius:"0 10px 10px 0", padding:"18px 22px", display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{ width:34, height:34, borderRadius:9, background:`${r.color}15`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:5 }}>{r.title}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", lineHeight:1.6 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CERTIFICATES SECTION ── */}
      <section style={{ padding:"0 40px 80px", maxWidth:1280, margin:"0 auto" }}>
        <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,.06) 0%,rgba(34,197,94,.04) 100%)", border:"1px solid rgba(255,215,0,.14)", borderRadius:24, padding:"56px 48px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:40, flexWrap:"wrap" }}>
          <div>
            <div className="section-eyebrow">Proof of Achievement</div>
            <div style={{ fontFamily:"var(--font-head)", fontSize:34, fontWeight:900, letterSpacing:"-1px", color:"#fff", lineHeight:1.1, marginBottom:14 }}>
              Win a certificate.<br/>
              <span style={{ color:"var(--gold)" }}>Share your glory.</span>
            </div>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:440, lineHeight:1.7 }}>
              Every top-3 finisher receives a downloadable on-chain certificate. Gold for the champion, silver for runner-up, bronze for 3rd place. Verifiable at cert.mft.io.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14, flexShrink:0 }}>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {[["🥇","Champion Certificate","var(--gold)"],["🥈","Runner Up Certificate","var(--silver)"],["🥉","Top Finisher Certificate","var(--bronze)"]].map(([m,l,c])=>(
                <div key={l as string} style={{ background:`${c as string}10`, border:`1px solid ${c as string}28`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:20 }}>{m as string}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:c as string }}>{l as string}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>Issued on-chain</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/tournaments" className="btn btn-primary btn-lg" style={{ textAlign:"center", justifyContent:"center" }}>
              Compete to Win One →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:"0 40px 80px", maxWidth:1280, margin:"0 auto" }}>
        <div style={{ textAlign:"center" }}>
          <div className="section-eyebrow">Ready to compete?</div>
          <div style={{ fontFamily:"var(--font-head)", fontSize:44, fontWeight:900, letterSpacing:"-1.5px", color:"#fff", marginBottom:14 }}>
            Your funded account is<br/><span style={{ color:"var(--gold)" }}>one tournament away.</span>
          </div>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.4)", marginBottom:32 }}>No evaluation. No monthly fees. Enter, trade, win.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/tournaments" className="btn btn-primary btn-lg">Browse All Tournaments →</Link>
            <Link href="/register" className="btn btn-ghost btn-lg">Create Free Account</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
