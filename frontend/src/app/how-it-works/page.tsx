"use client";
import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Register & Pay Entry",
    emoji: "🔐",
    color: "#60a5fa",
    dim: "rgba(96,165,250,.08)",
    border: "rgba(96,165,250,.2)",
    tagline: "Takes 2 minutes. No bank needed.",
    desc: "Create your free MFT account and pick a tournament tier that suits you — Hours Bullet ($20), Daily Pill ($50), or Weekly Marathon ($100). Pay your entry fee in USDT from Binance, any exchange, or a crypto wallet.",
    substeps: [
      { icon: "👤", text: "Sign up with email at myfundedtournament.vercel.app" },
      { icon: "🏆", text: "Browse open tournaments and pick your tier" },
      { icon: "💳", text: "Pay entry fee in USDT — scan a QR or copy the address" },
      { icon: "✅", text: "Payment confirms automatically — you're registered!" },
    ],
    why: "Unlike prop firms charging $155+ for an evaluation, your entry fee goes directly into the prize pool. Most of it comes back to YOU.",
    whyIcon: "💡",
  },
  {
    n: "02",
    title: "Open Your FREE MT5 Demo",
    emoji: "📊",
    color: "#FFD700",
    dim: "rgba(255,215,0,.08)",
    border: "rgba(255,215,0,.2)",
    tagline: "Free in 5 minutes. No deposit required.",
    desc: "Open a free demo account at one of our supported brokers: Exness, ICMarkets, or Tickmill. It's completely free — no real money required. Then submit your investor (read-only) password to MFT.",
    substeps: [
      { icon: "🌐", text: "Go to Exness, ICMarkets, or Tickmill" },
      { icon: "📝", text: "Register and open a free MT5 demo account" },
      { icon: "🔑", text: "Copy your account number and INVESTOR password (read-only)" },
      { icon: "📤", text: "Submit them to MFT — we connect via MetaApi" },
    ],
    why: "Investor password is READ-ONLY — we can only VIEW your trades, never touch your money. Your account is 100% safe.",
    whyIcon: "🔒",
  },
  {
    n: "03",
    title: "Trade Actively Till the End",
    emoji: "📈",
    color: "#22C55E",
    dim: "rgba(34,197,94,.08)",
    border: "rgba(34,197,94,.2)",
    tagline: "Trade your best. We track everything live.",
    desc: "Once the tournament starts, trade your MT5 demo account however you like. Scalp, swing, day trade — any strategy. Our system syncs your stats every 60 seconds. Watch your rank on the live leaderboard.",
    substeps: [
      { icon: "🚀", text: "Tournament starts when minimum entries are reached" },
      { icon: "📉", text: "Trade on your MT5 demo account normally" },
      { icon: "📡", text: "MetaApi syncs your stats every 60 seconds" },
      { icon: "🏅", text: "Watch your % gain ranking on the live leaderboard" },
    ],
    why: "Unlike brokers where you risk real money, your demo balance is virtual. Maximum upside, zero financial risk.",
    whyIcon: "🛡️",
  },
  {
    n: "04",
    title: "Win & Claim Your Reward",
    emoji: "🏆",
    color: "#FFD700",
    dim: "rgba(255,215,0,.08)",
    border: "rgba(255,215,0,.2)",
    tagline: "Highest % gain wins. Simple.",
    desc: "When the tournament ends, the trader with the highest percentage gain wins 90% of the prize pool as a real funded trading account. 2nd place gets 3× entry fee back, 3rd gets 2× entry fee — all in USDT.",
    substeps: [
      { icon: "⏰", text: "Tournament ends at the scheduled time" },
      { icon: "🥇", text: "1st: Funded trading account worth 90% of prize pool" },
      { icon: "🥈", text: "2nd: 3× your entry fee returned in USDT" },
      { icon: "🥉", text: "3rd: 2× your entry fee returned in USDT" },
    ],
    why: "No payout denial. No KYC delays. Winners receive funds within 24-48 hours. We built this for traders, not bureaucrats.",
    whyIcon: "⚡",
  },
];

const VS_POINTS = [
  { icon: "💰", title: "vs Prop Firms (FTMO etc.)", points: ["FTMO charges $155+ just to START", "You can fail and lose everything", "Evaluation rules are strict & stressful", "Takes weeks to get a payout", "MFT: Pay $20, compete on a FREE demo, win in hours"] },
  { icon: "🏦", title: "vs Brokers (Exness etc.)", points: ["Real broker = real money at risk", "Spreads and swaps eat your profits", "You can blow your account in minutes", "No competitive prize structure", "MFT: Zero real money risk. Compete for prizes on demo accounts"] },
  { icon: "📚", title: "vs Trading Courses", points: ["Courses cost $500–$5,000", "You still have to trade with real money", "No guaranteed outcome", "Certificates mean nothing", "MFT: Put $20 in, prove your skill LIVE, win real capital"] },
];

export default function HowItWorksPage() {
  return (
    <div style={{ background: "#050810", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(7,9,15,.8)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 40px 40px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 100, padding: "5px 16px", fontSize: 12, fontWeight: 600, color: "#FFD700", marginBottom: 24 }}>
            ⚡ Simplest path to a funded account
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 800, letterSpacing: "-1.5px", color: "#fff", marginBottom: 16, lineHeight: 1.1 }}>
            How MyFundedTournament Works
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.45)", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 32px" }}>
            From zero to a funded account in 4 simple steps. No evaluation. No real money risk. Just your trading skill.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary btn-lg">Start for $20</Link>
            <Link href="/tournaments" className="btn btn-ghost btn-lg">Browse Tournaments</Link>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 40px" }}>
        {STEPS.map((step, i) => (
          <div key={step.n}>
            {/* Connector */}
            {i > 0 && (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 2, height: 40, background: "linear-gradient(to bottom, rgba(255,215,0,.3), rgba(255,215,0,.08))", borderRadius: 2 }} />
                  <div style={{ fontSize: 18, color: "rgba(255,215,0,.5)" }}>↓</div>
                </div>
              </div>
            )}

            {/* Step card */}
            <div style={{ background: step.dim, border: `1px solid ${step.border}`, borderRadius: 20, padding: "36px 40px", position: "relative", overflow: "hidden" }}>
              {/* Step number badge */}
              <div style={{ position: "absolute", top: 28, right: 32, fontSize: 80, fontWeight: 900, color: step.color, opacity: .05, fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", lineHeight: 1 }}>
                {step.n}
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${step.color}20`, border: `1.5px solid ${step.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                  {step.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 6 }}>STEP {step.n}</div>
                  <h2 style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6, lineHeight: 1.2 }}>{step.title}</h2>
                  <div style={{ fontSize: 13, color: step.color, fontWeight: 600 }}>{step.tagline}</div>
                </div>
              </div>

              <p style={{ fontSize: 15, color: "rgba(255,255,255,.55)", lineHeight: 1.75, marginBottom: 28 }}>{step.desc}</p>

              {/* Sub-steps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {step.substeps.map((sub, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(0,0,0,.3)", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{sub.icon}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.5, fontWeight: 500 }}>{sub.text}</span>
                  </div>
                ))}
              </div>

              {/* Why it's better callout */}
              <div style={{ background: "rgba(0,0,0,.35)", borderRadius: 12, padding: "14px 18px", border: `1px solid ${step.border}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{step.whyIcon}</span>
                <div style={{ fontSize: 13, color: step.color, fontWeight: 600, lineHeight: 1.6 }}>{step.why}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Why better section */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(7,9,15,.7)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 12 }}>The honest comparison</div>
            <h2 style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 12 }}>
              Why MFT beats the alternatives
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", maxWidth: 480, margin: "0 auto" }}>
              We built MFT because every other option either costs too much, risks your real money, or both.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {VS_POINTS.map(vs => (
              <div key={vs.title} style={{ background: "rgba(13,18,29,.8)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{vs.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 20, lineHeight: 1.3 }}>{vs.title}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {vs.points.map((p, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: i === vs.points.length - 1 ? "#22C55E" : "rgba(255,255,255,.4)", fontWeight: i === vs.points.length - 1 ? 600 : 400, paddingTop: i === vs.points.length - 1 ? 10 : 0, borderTop: i === vs.points.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none" }}>
                      {i === vs.points.length - 1 ? "✅ " : "❌ "}{p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick FAQ */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", fontSize: 28, fontWeight: 800, color: "#fff" }}>Still have questions?</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
          {[
            { q: "What if I lose?", a: "You simply don't win the prize. Your only loss is the entry fee — just like any competition. No blown accounts, no debt." },
            { q: "How long does payout take?", a: "1st place (funded account) within 48hrs. 2nd & 3rd place USDT payouts within 24hrs of tournament end." },
            { q: "Can I use any trading strategy?", a: "Yes! Scalping, swing trading, news trading — any strategy is allowed as long as trades stay open 31+ seconds." },
            { q: "What if the tournament doesn't fill?", a: "If minimum 20 entries aren't reached, the tournament doesn't start and all entry fees are refunded automatically." },
          ].map((item, i) => (
            <div key={i} style={{ background: "rgba(13,18,29,.8)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>{item.q}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", background: "rgba(255,215,0,.05)", border: "1px solid rgba(255,215,0,.15)", borderRadius: 20, padding: "40px 32px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
          <h3 style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Ready to compete?</h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", marginBottom: 24 }}>Join thousands of traders competing for real funded accounts every day.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary btn-lg">Start for $20 USDT</Link>
            <Link href="/tournaments" className="btn btn-ghost btn-lg">See Live Tournaments</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
