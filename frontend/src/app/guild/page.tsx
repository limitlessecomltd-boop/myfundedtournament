"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guildApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Defined outside component to prevent remount on every state change
function Field({ label, hint, children }: { label:string; hint?:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, letterSpacing:".06em",
        textTransform:"uppercase", color:"rgba(255,255,255,.45)", marginBottom:7 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:5 }}>{hint}</div>}
    </div>
  );
}

export default function GuildBattlePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=form, 2=preview, 3=done
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    entryFee: "20",
    maxEntries: "25",
    winnerPct: "80",
  });

  const fee     = parseFloat(form.entryFee) || 0;
  const max     = parseInt(form.maxEntries) || 0;
  const wPct    = parseFloat(form.winnerPct) || 80;
  const platPct = 10;
  const oPct    = Math.max(0, 100 - wPct - platPct);
  const pool    = fee * max;
  const winnerAmt  = Math.floor(pool * wPct / 100);
  const orgAmt     = Math.floor(pool * oPct / 100);
  const platAmt    = Math.floor(pool * platPct / 100);

  const isValid = form.name.trim().length >= 3
    && fee >= 1 && fee <= 10000
    && max >= 2 && max <= 200
    && wPct >= 50 && wPct <= 90;

  async function handleCreate() {
    if (!user) { router.push("/login"); return; }
    setCreating(true); setError("");
    try {
      const battle = await guildApi.create({
        name: form.name.trim(),
        entryFee: fee,
        maxEntries: max,
        winnerPct: wPct,
      });
      setCreated(battle);
      setStep(3);
    } catch(e: any) {
      setError(e?.response?.data?.error || "Failed to create battle");
    } finally { setCreating(false); }
  }


  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:860, margin:"0 auto", padding:"40px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom:36 }}>
          <Link href="/tournaments" style={{ fontSize:13, color:"rgba(255,255,255,.4)", textDecoration:"none",
            display:"inline-flex", alignItems:"center", gap:6, marginBottom:20 }}>
            ← Back to Tournaments
          </Link>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(255,100,0,.08)", border:"1px solid rgba(255,100,0,.25)",
            borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:700,
            color:"#FF6400", marginBottom:16, display:"block" }}>
            🔥 Guild Battle
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
            fontSize:36, fontWeight:900, color:"#fff", letterSpacing:"-1.5px", marginBottom:10 }}>
            Create Your Guild Battle
          </h1>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.45)", maxWidth:560 }}>
            You're the organiser. Set the rules, invite your community, collect your share when they battle.
          </p>
        </div>

        {step === 3 && created ? (
          /* ── SUCCESS ── */
          <div style={{ background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.3)",
            borderRadius:20, padding:40, textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
            <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
              fontSize:28, fontWeight:900, color:"#22C55E", marginBottom:12 }}>
              Guild Battle Created!
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.5)", marginBottom:28 }}>
              <strong style={{ color:"#fff" }}>{created.name}</strong> is now open for registration.
              Share the link with your community!
            </p>
            <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
              borderRadius:12, padding:"14px 20px", marginBottom:28, wordBreak:"break-all",
              fontSize:13, color:"#60a5fa", fontFamily:"monospace" }}>
              {typeof window !== "undefined" ? window.location.origin : ""}/tournaments/{created.id}
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href={`/tournaments/${created.id}`} className="btn btn-primary btn-lg">
                View Battle →
              </Link>
              <Link href="/guild/mine" className="btn btn-ghost btn-lg">
                My Guild Battles
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:28, alignItems:"start" }}>

            {/* ── FORM ── */}
            <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,100,0,.2)",
              borderRadius:20, padding:32 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#FF6400", marginBottom:24 }}>
                ⚙️ Configure Your Battle
              </div>

              <Field label="Battle Name" hint="Min 3 characters · Your community will see this">
                <input className="input" placeholder="e.g. Alpha Traders Showdown"
                  value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))}
                  onKeyDown={e => e.stopPropagation()}
                  maxLength={80} style={{ borderColor: form.name.length >= 3 ? "rgba(255,100,0,.4)" : undefined }}/>
              </Field>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <Field label="Entry Fee (USDT)" hint="$1 – $10,000 per trader">
                  <input className="input" type="number" min="1" max="10000" step="1"
                    value={form.entryFee} onChange={e => setForm(f=>({...f, entryFee:e.target.value}))} onKeyDown={e => e.stopPropagation()}/>
                </Field>
                <Field label="Max Players" hint="2 – 200 traders">
                  <input className="input" type="number" min="2" max="200" step="1"
                    value={form.maxEntries} onChange={e => setForm(f=>({...f, maxEntries:e.target.value}))} onKeyDown={e => e.stopPropagation()}/>
                </Field>
              </div>

              <Field label={`Winner Payout — ${wPct}%`}
                hint={`You keep ${oPct}% · Platform keeps 10% · Total = 100%`}>
                <div style={{ marginBottom:10 }}>
                  <input type="range" min="50" max="90" step="5" value={form.winnerPct}
                    onChange={e => setForm(f=>({...f, winnerPct:e.target.value}))}
                    onKeyDown={e => { if(e.key === " ") e.preventDefault(); }}
                    style={{ width:"100%", accentColor:"#FF6400" }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11,
                  color:"rgba(255,255,255,.35)" }}>
                  <span>50% (min)</span><span>90% (max)</span>
                </div>
                {/* Visual breakdown bar */}
                <div style={{ marginTop:12, height:10, borderRadius:5, overflow:"hidden",
                  display:"flex", gap:2 }}>
                  <div style={{ width:`${wPct}%`, background:"#FFD700", borderRadius:"4px 0 0 4px" }}/>
                  <div style={{ width:`${oPct}%`, background:"#FF6400" }}/>
                  <div style={{ width:`${platPct}%`, background:"rgba(255,255,255,.25)", borderRadius:"0 4px 4px 0" }}/>
                </div>
                <div style={{ display:"flex", gap:16, marginTop:6, fontSize:11 }}>
                  <span style={{ color:"#FFD700" }}>🥇 Winner {wPct}%</span>
                  <span style={{ color:"#FF6400" }}>🏆 You {oPct}%</span>
                  <span style={{ color:"rgba(255,255,255,.35)" }}>🏛 Platform 10%</span>
                </div>
              </Field>

              {error && (
                <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
                  borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#EF4444" }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={!isValid || creating || !user}
                className="btn"
                style={{ width:"100%", justifyContent:"center",
                  background: isValid && user ? "#FF6400" : "rgba(255,255,255,.1)",
                  color: isValid && user ? "#fff" : "rgba(255,255,255,.3)",
                  fontWeight:800, fontSize:16, padding:"15px",
                  border:"none", borderRadius:11, cursor: isValid && user ? "pointer" : "not-allowed",
                  transition:"all .2s" }}>
                {!user ? "Login to Create →" :
                 creating ? "Creating..." :
                 !isValid ? "Fill all fields correctly" :
                 "🔥 Launch Guild Battle →"}
              </button>

              {!user && (
                <div style={{ textAlign:"center", marginTop:12 }}>
                  <Link href="/login" style={{ color:"#FF6400", fontSize:13 }}>
                    Sign in to create a Guild Battle →
                  </Link>
                </div>
              )}
            </div>

            {/* ── LIVE PREVIEW ── */}
            <div style={{ position:"sticky", top:80 }}>
              <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,100,0,.25)",
                borderRadius:18, padding:24, marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em",
                  textTransform:"uppercase", color:"rgba(255,100,0,.7)", marginBottom:14 }}>
                  Live Preview
                </div>

                {/* Battle card preview */}
                <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:4 }}>
                  {form.name || "Your Battle Name"}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:16, fontStyle:"italic" }}>
                  Organised by {user?.username || user?.email?.split("@")[0] || "you"}
                </div>

                {/* Prize pool */}
                <div style={{ background:"rgba(255,100,0,.06)", border:"1px solid rgba(255,100,0,.15)",
                  borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:4 }}>PRIZE POOL</div>
                  <div style={{ fontSize:28, fontWeight:900, color:"#FF6400",
                    fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                    ${pool.toLocaleString()}
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>
                    {max} traders × ${fee} USDT
                  </div>
                </div>

                {/* Payout breakdown */}
                {[
                  { label:"🥇 Winner receives", amt:winnerAmt, pct:wPct, color:"#FFD700" },
                  { label:"🏆 You receive", amt:orgAmt, pct:oPct, color:"#FF6400" },
                  { label:"🏛 Platform fee", amt:platAmt, pct:platPct, color:"rgba(255,255,255,.3)" },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"9px 0",
                    borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>{r.label}</span>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ fontSize:15, fontWeight:800, color:r.color }}>
                        ${r.amt.toLocaleString()}
                      </span>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginLeft:5 }}>
                        ({r.pct}%)
                      </span>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop:14, fontSize:12, color:"rgba(255,255,255,.35)",
                  background:"rgba(255,255,255,.03)", borderRadius:8, padding:"8px 12px" }}>
                  ⚡ Battle auto-starts when {max} traders join · 90 min · MT5 demo
                </div>
              </div>

              {/* Info box */}
              <div style={{ background:"rgba(255,100,0,.04)", border:"1px solid rgba(255,100,0,.15)",
                borderRadius:14, padding:"16px 18px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#FF6400", marginBottom:10 }}>
                  How Guild Battle works
                </div>
                {[
                  "You create the battle with your own rules",
                  "Share the link with your community",
                  "They pay the entry fee & trade for 90 min",
                  "Winner gets their % as a funded account",
                  "You get your organiser % automatically",
                  "Platform takes flat 10% — transparent",
                ].map((t,i) => (
                  <div key={i} style={{ display:"flex", gap:8, fontSize:12,
                    color:"rgba(255,255,255,.5)", marginBottom:6 }}>
                    <span style={{ color:"#FF6400", flexShrink:0 }}>→</span>{t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
