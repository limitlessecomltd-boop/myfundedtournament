"use client";
import Link from "next/link";
import { useState } from "react";

const STEPS = [
  { n:"01", icon:"⚙️", title:"Set Your Battle Rules", desc:"Choose your battle name, entry fee ($1–$10,000), max players (5–200), and how much the winner gets (50–90%). You set the rules — your community plays by them." },
  { n:"02", icon:"🔗", title:"Get Your Custom Link", desc:'Every Guild Battle gets a unique shareable link like myfundedtournament.vercel.app/battle/your-battle-name. Share it on Discord, Telegram, Twitter — anywhere your community lives.' },
  { n:"03", icon:"👥", title:"Your Community Joins", desc:"Traders click your link, pay the entry fee in USDT, connect their MT5 demo account, and wait for the battle to start. All automated — no manual work from you." },
  { n:"04", icon:"⚔️", title:"90-Minute Battle Runs", desc:"When all spots fill, the battle auto-starts with a 5-minute countdown. Traders compete for 90 minutes on their MT5 demo. Live leaderboard updates every 60 seconds." },
  { n:"05", icon:"💰", title:"Everyone Gets Paid", desc:"Winner gets their funded account or cashout. You get your organiser percentage automatically. Platform takes its flat 10%. Transparent, instant, no disputes." },
];

const FAQS = [
  { q:"How much do I earn?", a:"You earn: 100% − winner% − 10% platform. If you set winner at 80%, you get 10%. On a $1,000 pool → you get $100. On a $10,000 pool → $1,000. The more traders join, the more you earn." },
  { q:"When do I get paid?", a:"Automatically when the 90-minute battle ends and results are finalised. No manual withdrawal needed — it processes to your account instantly." },
  { q:"Do I need to manage anything during the battle?", a:"Nothing. Once the battle starts, it's 100% automated. Live leaderboard, trade tracking, winner determination — all handled by MFT. You just collect your share." },
  { q:"Can I run multiple battles at once?", a:"Yes. Create as many Guild Battles as you want. Each one has its own link, its own pool, its own payout. Run weekly battles for your community." },
  { q:"What's the minimum entry fee I can set?", a:"Minimum $1 USDT per trader. Maximum $10,000. We recommend $10–$50 for community battles and higher for premium VIP battles." },
  { q:"Do I need to deposit anything to create a battle?", a:"No. Creating a Guild Battle is free. You only earn when traders enter and the battle runs. Zero upfront cost." },
];

export default function EarnPage() {
  const [fee, setFee]     = useState(20);
  const [players, setPlayers] = useState(50);
  const [wPct, setWPct]   = useState(80);
  const platPct = 10;
  const oPct    = 100 - wPct - platPct;
  const pool    = fee * players;
  const [openFaq, setOpenFaq] = useState<number|null>(null);

  return (
    <div style={{ background:"#050810", minHeight:"100vh", overflowX:"hidden" }}>
      <style>{`
        @media(max-width:768px){
          .earn-hero{padding:48px 20px 36px !important;}
          .earn-hero h1{font-size:30px !important;}
          .earn-grid{grid-template-columns:1fr !important;}
          .earn-steps{grid-template-columns:1fr !important;}
          .earn-calc{flex-direction:column !important;}
          .earn-faqs{grid-template-columns:1fr !important;}
        }
      `}</style>

      {/* ── HERO ── */}
      <div className="earn-hero" style={{ background:"linear-gradient(180deg,rgba(255,100,0,.07) 0%,transparent 60%)",
        borderBottom:"1px solid rgba(255,100,0,.12)", padding:"80px 48px 64px", textAlign:"center" }}>
        <div style={{ maxWidth:760, margin:"0 auto" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(255,100,0,.1)", border:"1px solid rgba(255,100,0,.3)",
            borderRadius:100, padding:"6px 18px", fontSize:13, fontWeight:700,
            color:"#FF6400", marginBottom:24, letterSpacing:".04em" }}>
            🔥 Guild Battle Program
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
            fontSize:52, fontWeight:900, color:"#fff", letterSpacing:"-2.5px",
            lineHeight:1.05, marginBottom:20 }}>
            Run Your Own Trading Battle.<br/>
            <span style={{ color:"#FF6400" }}>Earn as the Organiser.</span>
          </h1>
          <p style={{ fontSize:18, color:"rgba(255,255,255,.5)", lineHeight:1.75,
            marginBottom:36, maxWidth:580, margin:"0 auto 36px" }}>
            Have a trading community? Create a custom 90-minute battle for your traders.
            You set the rules, share the link, and collect your organiser share automatically.
            <strong style={{ color:"rgba(255,255,255,.8)" }}> No upfront cost. No manual work.</strong>
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff",
              fontWeight:800, fontSize:16, padding:"14px 32px", borderRadius:11, border:"none" }}>
              🔥 Create Guild Battle Now →
            </Link>
            <Link href="/guild/mine" className="btn btn-ghost" style={{ fontSize:15, padding:"14px 24px" }}>
              My Guild Battles
            </Link>
          </div>
        </div>
      </div>

      {/* ── EARNINGS CALCULATOR ── */}
      <div style={{ maxWidth:960, margin:"0 auto", padding:"72px 24px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase",
            color:"rgba(255,255,255,.3)", marginBottom:12 }}>Earnings Calculator</div>
          <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
            fontSize:32, fontWeight:900, color:"#fff", letterSpacing:"-1px", marginBottom:12 }}>
            See How Much You Could Earn
          </h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)" }}>
            Drag the sliders to calculate your potential earnings
          </p>
        </div>

        <div className="earn-calc" style={{ display:"flex", gap:28, alignItems:"stretch" }}>
          {/* Sliders */}
          <div style={{ flex:1, background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,100,0,.2)",
            borderRadius:20, padding:32 }}>
            {[
              { label:"Entry Fee per Trader", val:`$${fee} USDT`, min:1, max:500, step:1,
                state:fee, set:setFee, hint:"Recommended: $10–$100" },
              { label:"Number of Players", val:`${players} traders`, min:5, max:200, step:5,
                state:players, set:setPlayers, hint:"Min 5, Max 200" },
              { label:"Winner Payout %", val:`${wPct}% to winner`, min:50, max:90, step:5,
                state:wPct, set:setWPct, hint:`You keep ${oPct}% · Platform 10%` },
            ].map(s => (
              <div key={s.label} style={{ marginBottom:28 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{s.label}</span>
                  <span style={{ fontSize:14, fontWeight:800, color:"#FF6400" }}>{s.val}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step}
                  value={s.state} onChange={e => s.set(Number(e.target.value))}
                  style={{ width:"100%", accentColor:"#FF6400", height:6 }}/>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:5 }}>{s.hint}</div>
              </div>
            ))}
          </div>

          {/* Results */}
          <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:"rgba(255,100,0,.08)", border:"1px solid rgba(255,100,0,.3)",
              borderRadius:16, padding:24, flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,100,0,.7)",
                letterSpacing:".08em", textTransform:"uppercase", marginBottom:16 }}>Your Earnings</div>
              <div style={{ fontSize:44, fontWeight:900, color:"#FF6400",
                fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
                letterSpacing:"-2px", marginBottom:4 }}>
                ${Math.floor(pool * oPct / 100).toLocaleString()}
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:24 }}>
                as organiser ({oPct}% of ${pool.toLocaleString()} pool)
              </div>
              {[
                { label:"Prize Pool", val:`$${pool.toLocaleString()}`, color:"rgba(255,255,255,.7)" },
                { label:`🥇 Winner (${wPct}%)`, val:`$${Math.floor(pool*wPct/100).toLocaleString()}`, color:"#FFD700" },
                { label:`🏆 You (${oPct}%)`, val:`$${Math.floor(pool*oPct/100).toLocaleString()}`, color:"#FF6400" },
                { label:"🏛 Platform (10%)", val:`$${Math.floor(pool*0.1).toLocaleString()}`, color:"rgba(255,255,255,.3)" },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between",
                  padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
            <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff",
              fontWeight:800, fontSize:15, padding:"14px", justifyContent:"center",
              display:"flex", textDecoration:"none", borderRadius:12, border:"none" }}>
              Create This Battle →
            </Link>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"72px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase",
              color:"rgba(255,255,255,.3)", marginBottom:12 }}>For Organisers</div>
            <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
              fontSize:32, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
              How It Works
            </h2>
          </div>
          <div className="earn-steps" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 }}>
            {STEPS.map(step => (
              <div key={step.n} style={{ background:"rgba(13,18,29,.9)",
                border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"24px 22px",
                position:"relative" }}>
                <div style={{ position:"absolute", top:16, right:16, fontSize:28,
                  fontWeight:900, color:"rgba(255,100,0,.12)",
                  fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                  {step.n}
                </div>
                <div style={{ fontSize:28, marginBottom:14 }}>{step.icon}</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:10 }}>{step.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.7 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CUSTOM LINK FEATURE ── */}
      <div style={{ maxWidth:960, margin:"0 auto", padding:"72px 24px" }}>
        <div style={{ background:"linear-gradient(135deg,rgba(255,100,0,.06) 0%,rgba(255,215,0,.04) 100%)",
          border:"1px solid rgba(255,100,0,.2)", borderRadius:24, padding:"48px",
          display:"flex", gap:40, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:260 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
              color:"rgba(255,100,0,.7)", marginBottom:12 }}>Custom Battle Links</div>
            <h3 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
              fontSize:26, fontWeight:900, color:"#fff", marginBottom:14, letterSpacing:"-0.5px" }}>
              Your Battle, Your Link
            </h3>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.75, marginBottom:20 }}>
              Every Guild Battle gets a clean, shareable URL based on your battle name.
              Share it on social media, Discord, or Telegram. Traders land directly on
              your battle page — no searching, no confusion.
            </p>
            {[
              "Unique link per battle",
              "Competitor list shown on join page",
              "Live rankings once battle starts",
              "Your organiser profile shown to all traders",
            ].map(t => (
              <div key={t} style={{ display:"flex", gap:10, fontSize:13,
                color:"rgba(255,255,255,.55)", marginBottom:8 }}>
                <span style={{ color:"#FF6400" }}>→</span>{t}
              </div>
            ))}
          </div>
          <div style={{ flexShrink:0, minWidth:260 }}>
            {/* Mock URL display */}
            <div style={{ background:"rgba(5,8,16,.8)", borderRadius:14,
              border:"1px solid rgba(255,100,0,.3)", overflow:"hidden" }}>
              <div style={{ background:"rgba(255,255,255,.04)", padding:"10px 16px",
                borderBottom:"1px solid rgba(255,100,0,.15)", display:"flex", gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"rgba(239,68,68,.5)" }}/>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"rgba(255,215,0,.5)" }}/>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"rgba(34,197,94,.5)" }}/>
              </div>
              <div style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginBottom:6, fontFamily:"monospace" }}>
                  myfundedtournament.vercel.app/
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:"#FF6400", fontFamily:"monospace" }}>
                  battle/alpha-traders-cup
                </div>
                <div style={{ marginTop:14, padding:"10px 14px",
                  background:"rgba(255,100,0,.06)", borderRadius:10,
                  border:"1px solid rgba(255,100,0,.15)" }}>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginBottom:4 }}>Created by</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#FF6400" }}>Alpha_Master</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>5 battles hosted</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div style={{ maxWidth:860, margin:"0 auto", padding:"72px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
              fontSize:30, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
              Organiser FAQ
            </h2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background:"rgba(13,18,29,.9)",
                border:"1px solid rgba(255,255,255,.07)", borderRadius:14, overflow:"hidden" }}>
                <button onClick={() => setOpenFaq(openFaq===i?null:i)}
                  style={{ width:"100%", display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"18px 22px", background:"none",
                    border:"none", cursor:"pointer", textAlign:"left" }}>
                  <span style={{ fontSize:15, fontWeight:600, color:"#fff" }}>{faq.q}</span>
                  <span style={{ fontSize:20, color:"#FF6400", marginLeft:12, flexShrink:0 }}>
                    {openFaq===i ? "−" : "+"}
                  </span>
                </button>
                {openFaq===i && (
                  <div style={{ padding:"0 22px 18px", fontSize:14,
                    color:"rgba(255,255,255,.5)", lineHeight:1.75 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ textAlign:"center", padding:"72px 24px",
        background:"linear-gradient(0deg,rgba(255,100,0,.05) 0%,transparent 100%)" }}>
        <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:36, fontWeight:900, color:"#fff", letterSpacing:"-1.5px",
          marginBottom:16, lineHeight:1.1 }}>
          Ready to run your first<br/>
          <span style={{ color:"#FF6400" }}>Guild Battle?</span>
        </h2>
        <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", marginBottom:36 }}>
          Free to create. Earn automatically. Zero upfront cost.
        </p>
        <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff",
          fontWeight:800, fontSize:18, padding:"16px 40px", borderRadius:12,
          border:"none", textDecoration:"none" }}>
          🔥 Create Your Guild Battle Now →
        </Link>
      </div>
    </div>
  );
}
