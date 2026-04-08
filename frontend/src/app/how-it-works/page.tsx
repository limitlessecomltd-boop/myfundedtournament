"use client";
import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Register & Pay Entry",
    emoji: "🔐",
    color: "#FFD700",
    dim: "rgba(255,215,0,.08)",
    border: "rgba(255,215,0,.22)",
    tagline: "Takes 2 minutes. No bank needed.",
    desc: "Create your free MFT account and choose your battle tier — Starter Bullet ($25) or Pro Bullet ($50). Pay your entry fee in USDT (TRC-20) directly from Binance, any crypto exchange, or your own wallet.",
    substeps: [
      { icon:"👤", text:"Sign up with email at myfundedtournament.vercel.app" },
      { icon:"⚔️", text:"Browse open battles and pick Starter ($25) or Pro ($50)" },
      { icon:"💳", text:"Pay entry fee in USDT — scan a QR or copy the wallet address" },
      { icon:"✅", text:"Payment confirms automatically — you're registered for the battle!" },
    ],
    why: "Unlike prop firms charging $155+ for an evaluation, your entire entry fee goes straight into the prize pool. The top 3 traders get most of it back — as real capital.",
    whyIcon: "💡",
  },
  {
    n: "02",
    title: "Open Your FREE MT5 Demo",
    emoji: "📊",
    color: "#60a5fa",
    dim: "rgba(96,165,250,.08)",
    border: "rgba(96,165,250,.22)",
    tagline: "Free in 5 minutes. No deposit required.",
    desc: "Open a free MT5 demo account at one of our 3 supported brokers — Exness, ICMarkets, or Tickmill. Get a $1,000 demo balance. Submit your investor (read-only) password to MFT so we can track your trades live.",
    substeps: [
      { icon:"🏦", text:"Go to Exness, ICMarkets, or Tickmill — all free, no deposit needed" },
      { icon:"📱", text:"Download MetaTrader 5 (MT5) — available on mobile, tablet and desktop" },
      { icon:"🔑", text:"Copy your investor (read-only) password from your broker dashboard" },
      { icon:"📋", text:"Paste your account number and investor password into MFT" },
    ],
    why: "We only ask for your read-only investor password — this means we can watch your trades live but have ZERO ability to place trades or withdraw funds. Your money is 100% safe.",
    whyIcon: "🔒",
  },
  {
    n: "03",
    title: "Wait for the 90-Minute Battle to Start",
    emoji: "⏳",
    color: "#22C55E",
    dim: "rgba(34,197,94,.08)",
    border: "rgba(34,197,94,.22)",
    tagline: "Starts automatically when 25 entries are collected.",
    desc: "Once your payment is confirmed, watch the live countdown circle on the homepage and your dashboard. When 25 entries are collected, the 90-minute battle begins automatically and the countdown starts for everyone.",
    substeps: [
      { icon:"🔵", text:"Watch the live circle fill up as more traders join — fills to 25 or 50" },
      { icon:"⚡", text:"At 25 entries: battle starts instantly, 90-minute countdown begins" },
      { icon:"📲", text:"You get a notification — open MT5 and start trading immediately" },
      { icon:"👀", text:"Live leaderboard shows everyone's % gain in real time every 60 seconds" },
    ],
    why: "The countdown is live for everyone — traders, spectators, everyone on the homepage can see exactly how long the battle has left. Full transparency.",
    whyIcon: "🌐",
  },
  {
    n: "04",
    title: "Trade for 90 Minutes — Beat Everyone",
    emoji: "📈",
    color: "#FFD700",
    dim: "rgba(255,215,0,.08)",
    border: "rgba(255,215,0,.22)",
    tagline: "Pure skill. Highest % gain wins.",
    desc: "Trade any forex pairs on your MT5 demo. We track your % gain every 60 seconds via MetaApi. The leaderboard updates live. Your goal: end with the highest percentage gain on your starting $1,000 balance.",
    substeps: [
      { icon:"💹", text:"Trade any currency pairs — EURUSD, GBPUSD, XAUUSD, any pair" },
      { icon:"📊", text:"Your % gain is tracked every 60 seconds — leaderboard updates live" },
      { icon:"⚠️", text:"CRITICAL: Close all trades 3 minutes before the 90-minute end time" },
      { icon:"🏁", text:"Final leaderboard locks — top 3 traders are declared winners" },
    ],
    why: "The 3-minute close rule is strict: any trade still open in the final 3 minutes will NOT count toward your score. Set an alarm — don't lose your gains to an open trade!",
    whyIcon: "⚠️",
  },
  {
    n: "05",
    title: "Win & Receive Your Funded Account",
    emoji: "🏆",
    color: "#22C55E",
    dim: "rgba(34,197,94,.08)",
    border: "rgba(34,197,94,.22)",
    tagline: "Real capital. Real withdrawals. No evaluation.",
    desc: "The trader with the highest % gain wins! Choose your reward: take 90% of the prize pool as a real funded trading account with daily withdrawals, or take 75% as an instant USDT cashout. Only the 1st place winner is rewarded.",
    substeps: [
      { icon:"🥇", text:"Option A: Funded live account (90% of prize pool) — real capital, daily withdrawals" },
      { icon:"💵", text:"Option B: Instant USDT cashout (75% of prize pool) — paid within 24 hours" },
                  { icon:"🎖️", text:"Winner receives a Gold Certificate issued on-chain as proof of achievement" },
    ],
    why: "A $25 entry with 25 participants = $625 prize pool. Winner chooses: $562 funded account OR $468 instant USDT. A $50 entry with 25 participants = $1,250 pool. Winner chooses: $1,125 funded account OR $937 instant USDT.",
    whyIcon: "💰",
  },
];

const RULES = [
  { icon:"⏱️", title:"Min 31 seconds per trade", desc:"Any trade closed in under 31 seconds is excluded from your score. It won't disqualify you — the trade just doesn't count.", color:"#FFD700" },
  { icon:"🚫", title:"No hedging allowed", desc:"Opening simultaneous buy and sell on the same pair is not allowed. Hedged trades are excluded from your score.", color:"#60a5fa" },
  { icon:"💰", title:"No external deposits", desc:"Adding funds to your demo account after the tournament starts results in instant, permanent disqualification. No exceptions.", color:"#EF4444" },
  { icon:"🔒", title:"Account locked at start", desc:"Your MT5 credentials are locked the moment the battle starts. No changing accounts or credentials mid-battle.", color:"#22C55E" },
  { icon:"⚠️", title:"Close all trades 3 min early", desc:"All open trades MUST be closed at least 3 minutes before the 90-minute mark. Open trades in the final 3 minutes will NOT count toward your score.", color:"#EF4444" },
  { icon:"📊", title:"Starting balance fixed at $1,000", desc:"All traders start with exactly $1,000 demo balance. Your score is measured as % gain from this starting point.", color:"#60a5fa" },
];

const BROKERS = [
  { name:"Exness", logo:"🟢", desc:"Most popular. Fast execution. Supports MT5 demo. Takes 2 min to open.", color:"#22C55E" },
  { name:"ICMarkets", logo:"🔵", desc:"Raw spreads. Excellent for scalping. MT5 demo available instantly.", color:"#60a5fa" },
  { name:"Tickmill", logo:"🟡", desc:"Low latency. Professional-grade MT5. Demo in under 3 minutes.", color:"#FFD700" },
];

export default function HowItWorksPage() {
  return (
    <div style={{ background:"#050810", minHeight:"100vh", overflowX:"hidden" }}>
      <style>{`
        @media(max-width:768px){
          .step-grid{ grid-template-columns:1fr !important; }
          .rules-grid{ grid-template-columns:1fr !important; }
          .brokers-grid{ grid-template-columns:1fr !important; }
          .prize-calc-grid{ grid-template-columns:1fr !important; }
          .hiw-hero h1{ font-size:28px !important; }
          .hiw-hero{ padding:40px 16px 32px !important; }
          .step-content{ padding:20px 16px !important; }
          .step-substeps{ grid-template-columns:1fr !important; }
          .hiw-section{ padding-left:16px !important; padding-right:16px !important; }
        }
      `}</style>

      <style>{`
        @media(max-width:768px){
          .hiw-hero h1{font-size:32px !important;}
          .step-grid{flex-direction:column !important;}
          .rules-grid{grid-template-columns:1fr !important;}
          .brokers-grid{grid-template-columns:1fr !important;}
          .page-pad{padding:48px 20px !important;}
        }
      `}</style>

      {/* ─── Hero ─── */}
      <div className="hiw-hero" style={{ textAlign:"center", padding:"72px 40px 56px", maxWidth:800, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.22)", borderRadius:100, padding:"6px 18px", fontSize:13, fontWeight:700, color:"#FFD700", marginBottom:28, letterSpacing:".04em" }}>
          ⚡ Simplest path to a funded account
        </div>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:48, fontWeight:900, color:"#fff", letterSpacing:"-2px", lineHeight:1.05, marginBottom:20 }}>
          How <span style={{ color:"#FFD700" }}>MyFundedTournament</span> Works
        </h1>
        <p style={{ fontSize:17, color:"rgba(255,255,255,.5)", lineHeight:1.75, marginBottom:36, maxWidth:620, margin:"0 auto 36px" }}>
          From zero to a funded account in <strong style={{ color:"rgba(255,255,255,.85)" }}>90 minutes</strong>. No evaluation. No minimum target. Just trade your MT5 demo and beat the competition.
        </p>
        <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
          <Link href="/register" className="btn btn-primary btn-lg">Start for $25</Link>
          <Link href="/tournaments" className="btn btn-ghost btn-lg">Browse Live Battles</Link>
        </div>
      </div>

      {/* ─── Timeline Steps ─── */}
      <div className="page-pad" style={{ maxWidth:900, margin:"0 auto", padding:"0 40px 80px" }}>
        {STEPS.map((step, i) => (
          <div key={step.n} style={{ position:"relative", marginBottom:i < STEPS.length-1 ? 0 : 0 }}>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div style={{ position:"absolute", left:31, top:72, bottom:-32, width:2, background:"linear-gradient(180deg,rgba(255,215,0,.3),rgba(255,255,255,.04))", zIndex:0 }}/>
            )}

            <div style={{ display:"flex", gap:24, marginBottom:32, position:"relative", zIndex:1 }}>
              {/* Step number circle */}
              <div style={{ flexShrink:0, width:64, height:64, borderRadius:"50%", background:step.dim, border:`2px solid ${step.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>
                {step.emoji}
              </div>

              {/* Content */}
              <div style={{ flex:1, background:"rgba(13,18,29,.95)", border:`1px solid ${step.border}`, borderRadius:18, padding:"28px 32px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, fontWeight:800, letterSpacing:".14em", color:step.color, textTransform:"uppercase" }}>STEP {step.n}</span>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.35)", fontStyle:"italic" }}>{step.tagline}</span>
                </div>
                <h3 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:22, fontWeight:800, color:"#fff", marginBottom:12, letterSpacing:"-.5px" }}>{step.title}</h3>
                <p style={{ fontSize:14.5, color:"rgba(255,255,255,.5)", lineHeight:1.75, marginBottom:22 }}>{step.desc}</p>

                {/* Sub-steps */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:22 }}>
                  {step.substeps.map((sub, j) => (
                    <div key={j} style={{ display:"flex", alignItems:"flex-start", gap:10, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, padding:"10px 14px" }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{sub.icon}</span>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.55)", lineHeight:1.5 }}>{sub.text}</span>
                    </div>
                  ))}
                </div>

                {/* Why box */}
                <div style={{ display:"flex", gap:12, background:step.dim, border:`1px solid ${step.border}`, borderRadius:12, padding:"14px 18px" }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{step.whyIcon}</span>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,.55)", lineHeight:1.65, margin:0 }}>{step.why}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── The 3-Minute Rule Callout ─── */}
      <div style={{ background:"rgba(239,68,68,.06)", borderTop:"1px solid rgba(239,68,68,.2)", borderBottom:"1px solid rgba(239,68,68,.2)" }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"36px 40px", display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ fontSize:52, flexShrink:0 }}>⚠️</div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:"#EF4444", marginBottom:8, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>The 3-Minute Close Rule — Read This Carefully</div>
            <p style={{ fontSize:14.5, color:"rgba(255,255,255,.55)", lineHeight:1.75, margin:0 }}>
              When the countdown hits <strong style={{ color:"#EF4444" }}>3:00 remaining</strong>, you MUST have all your trades closed. Any trade still open after that point <strong style={{ color:"#EF4444" }}>will not count toward your score</strong> — no exceptions. The leaderboard circle turns red at 3 minutes to warn you. Set an alarm. Don't lose your profit because of an open trade.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Rules ─── */}
      <div className="page-pad" style={{ maxWidth:900, margin:"0 auto", padding:"72px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:12 }}>Fair Play</div>
          <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:32, fontWeight:800, color:"#fff", letterSpacing:"-1px", marginBottom:12 }}>Battle Rules</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:480, margin:"0 auto" }}>All rules are auto-enforced by our system in real time. No manual review, no grey areas.</p>
        </div>
        <div className="rules-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {RULES.map(r => (
            <div key={r.title} style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"18px 20px", display:"flex", gap:14 }}>
              <span style={{ fontSize:24, flexShrink:0 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:r.color, marginBottom:5 }}>{r.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Supported Brokers ─── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.6)" }}>
        <div className="page-pad" style={{ maxWidth:900, margin:"0 auto", padding:"72px 40px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:12 }}>Supported Platforms</div>
            <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:32, fontWeight:800, color:"#fff", letterSpacing:"-1px", marginBottom:12 }}>3 Supported Brokers</h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:480, margin:"0 auto" }}>All three offer free MT5 demo accounts with no deposit required. Open one in under 5 minutes.</p>
          </div>
          <div className="brokers-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:18 }}>
            {BROKERS.map(b => (
              <div key={b.name} style={{ background:"rgba(13,18,29,.95)", border:`1px solid ${b.color}33`, borderRadius:16, padding:"24px 22px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:14 }}>{b.logo}</div>
                <div style={{ fontSize:18, fontWeight:800, color:"#fff", marginBottom:8 }}>{b.name}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.42)", lineHeight:1.6, marginBottom:16 }}>{b.desc}</div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:`${b.color}15`, border:`1px solid ${b.color}44`, borderRadius:20, padding:"4px 14px" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:b.color }}>✓ Supported</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:28, background:"rgba(96,165,250,.06)", border:"1px solid rgba(96,165,250,.18)", borderRadius:12, padding:"16px 20px", textAlign:"center" }}>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", margin:0 }}>
              💡 <strong style={{ color:"rgba(255,255,255,.65)" }}>Important:</strong> You only submit your <strong style={{ color:"rgba(96,165,250,.8)" }}>investor (read-only) password</strong> — never your master password. We have zero ability to place trades or withdraw funds from your account.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Prize Structure ─── */}
      <div className="page-pad" style={{ maxWidth:900, margin:"0 auto", padding:"72px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:12 }}>Prize Breakdown</div>
          <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:32, fontWeight:800, color:"#fff", letterSpacing:"-1px", marginBottom:12 }}>How the Prize Pool Works</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:520, margin:"0 auto" }}>100% transparent. Every entry fee goes into the pool. Here's exactly what each winner receives.</p>
        </div>

        {/* Example calculations */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28 }}>
          {[
            { plan:"Starter Bullet", fee:25, entries:25, color:"#FFD700", border:"rgba(255,215,0,.25)" },
            { plan:"Pro Bullet", fee:50, entries:25, color:"#22C55E", border:"rgba(34,197,94,.25)" },
          ].map(p => {
            const pool = p.fee * p.entries;
            const first = pool * 0.9;
                            const platform = pool * 0.1;
            return (
              <div key={p.plan} style={{ background:"rgba(13,18,29,.95)", border:`1px solid ${p.border}`, borderRadius:16, padding:"24px" }}>
                <div style={{ fontSize:12, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:6 }}>{p.plan}</div>
                <div style={{ fontSize:28, fontWeight:900, color:p.color, letterSpacing:"-1px", marginBottom:4, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>${pool.toLocaleString()} Pool</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginBottom:20 }}>{p.entries} traders × ${p.fee} USDT</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    { label:"🥇 1st Place (Funded Account)", val:`$${first.toLocaleString()}`, color:p.color },
{ label:"💵 Winner Cashout Option (75%)", val:`$${Math.floor(pool*0.75)}`, color:"#22C55E" },
                    { label:"🏛️ Platform Fee (10%)", val:`$${platform}`, color:"rgba(255,255,255,.3)" },
                  ].map(r => (
                    <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.45)" }}>{r.label}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:r.color }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Guild Battle Section ─── */}
      <div style={{ background:"rgba(255,100,0,.03)", borderTop:"1px solid rgba(255,100,0,.15)", borderBottom:"1px solid rgba(255,100,0,.15)" }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"72px 40px" }}>
          <div style={{ display:"flex", gap:40, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:280 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase",
                color:"rgba(255,100,0,.7)", marginBottom:12 }}>🔥 For Community Leaders</div>
              <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
                fontSize:30, fontWeight:900, color:"#fff", letterSpacing:"-1px", marginBottom:14 }}>
                Run a Guild Battle — Earn as Organiser
              </h2>
              <p style={{ fontSize:15, color:"rgba(255,255,255,.45)", lineHeight:1.75, marginBottom:24 }}>
                Have a trading community or Discord server? Create a custom battle for your members.
                You set the entry fee, player count, and winner payout %. You earn your organiser
                share automatically when the battle ends — no manual work required.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:28 }}>
                {[
                  ["⚙️", "Set your own rules", "Custom entry fee ($1–$10,000), players (5–200), winner %"],
                  ["💰", "Earn automatically", "Your organiser % paid out when battle finalises"],
                  ["🏛", "Flat 10% platform fee", "Always 10% to MFT — winner + organiser split the rest"],
                  ["🔗", "Share your link", "Battle auto-starts when all spots fill — just share and wait"],
                ].map(([icon, title, desc]) => (
                  <div key={String(title)} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:2 }}>{title}</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/guild" style={{ display:"inline-flex", alignItems:"center", gap:8,
                background:"#FF6400", color:"#fff", fontWeight:800, fontSize:15,
                padding:"13px 28px", borderRadius:11, textDecoration:"none" }}>
                🔥 Create Guild Battle →
              </a>
            </div>

            {/* Example card */}
            <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,100,0,.3)",
              borderRadius:18, padding:28, minWidth:260 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,100,0,.7)",
                letterSpacing:".08em", textTransform:"uppercase", marginBottom:16 }}>
                Example Payout
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", marginBottom:4 }}>50 traders × $20 USDT</div>
              <div style={{ fontSize:26, fontWeight:900, color:"#FF6400",
                fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", marginBottom:20 }}>
                $1,000 Pool
              </div>
              {[
                { label:"🥇 Winner (80%)", val:"$800", color:"#FFD700" },
                { label:"🏆 Organiser (10%)", val:"$100", color:"#FF6400" },
                { label:"🏛 Platform (10%)", val:"$100", color:"rgba(255,255,255,.35)" },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", padding:"10px 0",
                  borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>{r.label}</span>
                  <span style={{ fontSize:15, fontWeight:800, color:r.color }}>{r.val}</span>
                </div>
              ))}
              <div style={{ marginTop:14, fontSize:12, color:"rgba(255,255,255,.3)", lineHeight:1.6 }}>
                You set winner % from 50–90%. Your cut = 100% − winner% − 10% platform.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CTA ─── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.6)" }}>
        <div style={{ maxWidth:700, margin:"0 auto", padding:"72px 40px", textAlign:"center" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:18 }}>Ready?</div>
          <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:36, fontWeight:900, color:"#fff", letterSpacing:"-1.2px", marginBottom:16, lineHeight:1.1 }}>
            90 minutes to prove your skill.<br/><span style={{ color:"#FFD700" }}>Win a funded account.</span>
          </h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", marginBottom:36, lineHeight:1.75 }}>
            Start for just $25 USDT. Trade your MT5 demo for 90 minutes. If you have the best % gain — you win real funded capital. No evaluation. No minimum balance. Just results.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
            <Link href="/tournaments" className="btn btn-ghost btn-lg">View Live Battles →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
