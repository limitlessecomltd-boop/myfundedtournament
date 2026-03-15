"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tournamentApi } from "@/lib/api";
import { Tournament } from "@/types";
import { BulletTrain } from "@/components/ui/BulletTrain";

function PlanBadge({ tier }: { tier: string }) {
  const color = tier === "pro" ? "#22C55E" : "#FFD700";
  const name = tier === "pro" ? "Pro Bullet" : "Starter Bullet";
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20,
      background:`${color}18`, border:`1px solid ${color}44`, color }}>
      {name}
    </span>
  );
}

// ── Registration card (filling up) ────────────────────────────────────────────
function RegistrationCard({ t }: { t: Tournament }) {
  const filled = parseInt(String(t.active_entries)) || 0;
  const max = t.max_entries;
  const pct = Math.min(100, Math.round((filled / max) * 100));
  const color = t.tier === "pro" ? "#22C55E" : "#FFD700";
  const spotsLeft = max - filled;

  return (
    <div style={{ background:"rgba(13,18,29,.95)", border:`1px solid ${color}44`,
      borderRadius:18, padding:24, position:"relative", overflow:"hidden" }}>
      {/* Top accent */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
        background:`linear-gradient(90deg,${color}88,transparent)` }}/>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <PlanBadge tier={t.tier}/>
        <div style={{ fontSize:11, fontWeight:700, color:"#FFD700", background:"rgba(255,215,0,.08)",
          border:"1px solid rgba(255,215,0,.2)", borderRadius:20, padding:"2px 10px" }}>
          OPEN FOR ENTRY
        </div>
      </div>

      <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:4,
        fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{t.name}</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:18, fontStyle:"italic" }}>
        Are you good enough to beat only {max} traders?
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
        {[
          ["Entry Fee", `$${t.entry_fee} USDT`],
          ["Max Traders", String(max)],
          ["Demo Balance", "$1,000"],
        ].map(([l,v]) => (
          <div key={l} style={{ background:"rgba(255,255,255,.03)", borderRadius:10,
            padding:"9px 12px", border:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:3,
              textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Bullet Train */}
      <div style={{ marginBottom:6 }}>
        <BulletTrain joined={filled} max={max} fee={Number(t.entry_fee)} tier={t.tier as "starter"|"pro"}/>
      </div>

      <div style={{ marginTop:14 }}>
        <Link href={`/tournaments/${t.id}`} className="btn" style={{ width:"100%",
          justifyContent:"center", display:"flex",
          background:color, color:"#000", fontWeight:800, fontSize:15, padding:"13px" }}>
          Grab Your Spot →
        </Link>
      </div>
    </div>
  );
}

// ── Live/Active card ───────────────────────────────────────────────────────────
function LiveCard({ t }: { t: Tournament }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const color = t.tier === "pro" ? "#22C55E" : "#FFD700";

  useEffect(() => {
    const end = new Date(t.end_time).getTime();
    const update = () => setTimeLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [t.end_time]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isWarning = timeLeft <= 3 * 60 && timeLeft > 0;
  const total = 90 * 60;
  const pct = Math.max(0, Math.min(100, (timeLeft / total) * 100));

  return (
    <div style={{ background:"rgba(13,18,29,.95)", border:`2px solid ${color}66`,
      borderRadius:18, padding:24, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:4,
        background:`linear-gradient(90deg,${color},${color}88)` }}/>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <PlanBadge tier={t.tier}/>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:800,
          color:"#22C55E" }}>
          <span className="live-dot"/>LIVE BATTLE
        </div>
      </div>

      <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:16,
        fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{t.name}</div>

      {/* Countdown */}
      <div style={{ textAlign:"center", marginBottom:18, padding:"16px",
        background: isWarning ? "rgba(239,68,68,.08)" : "rgba(255,255,255,.03)",
        borderRadius:12, border:`1px solid ${isWarning?"rgba(239,68,68,.3)":"rgba(255,255,255,.06)"}` }}>
        <div style={{ fontSize:38, fontWeight:900, color: isWarning ? "#EF4444" : color,
          fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", letterSpacing:"-2px", lineHeight:1 }}>
          {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:6 }}>
          {isWarning ? "⚠️ CLOSE ALL TRADES NOW!" : "minutes remaining"}
        </div>
        <div style={{ height:4, background:"rgba(255,255,255,.07)", borderRadius:2,
          overflow:"hidden", marginTop:10 }}>
          <div style={{ height:"100%", width:`${pct}%`,
            background: isWarning ? "#EF4444" : color,
            borderRadius:2, transition:"width 1s linear" }}/>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
        {[
          ["Traders", String(t.active_entries || 0)],
          ["Prize Pool", `$${Number(t.prize_pool||0).toLocaleString()}`],
          ["Entry", `$${t.entry_fee}`],
        ].map(([l,v]) => (
          <div key={l} style={{ background:"rgba(255,255,255,.03)", borderRadius:10,
            padding:"9px 12px", border:"1px solid rgba(255,255,255,.05)", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:15, fontWeight:800, color: l==="Prize Pool"?color:"#fff" }}>{v}</div>
          </div>
        ))}
      </div>

      <Link href={`/tournaments/${t.id}`} className="btn" style={{ width:"100%",
        justifyContent:"center", display:"flex",
        background:`${color}22`, color, border:`1px solid ${color}44`,
        fontWeight:700, fontSize:14, padding:"12px" }}>
        ⚔️ Watch Live Leaderboard →
      </Link>
    </div>
  );
}

// ── Past card ─────────────────────────────────────────────────────────────────
function PastModal({ t, onClose }: { t: any, onClose: ()=>void }) {
  const pool = Number(t.prize_pool || 0);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:"#0d1219", border:"1px solid rgba(255,255,255,.1)",
        borderRadius:20, padding:32, maxWidth:600, width:"100%",
        maxHeight:"80vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <PlanBadge tier={t.tier}/>
            <div style={{ fontSize:22, fontWeight:800, color:"#fff", marginTop:8,
              fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{t.name}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.38)", marginTop:4 }}>
              {t.active_entries} traders · ${t.entry_fee} entry · ${pool.toLocaleString()} pool
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:"rgba(255,255,255,.4)", fontSize:24, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:".1em",
            textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:12 }}>🏆 Winners</div>
          {[
            { place:"1st", medal:"🥇", color:"#FFD700", prize:`Funded Account — $${Math.floor(pool*0.9).toLocaleString()}` },
            { place:"2nd", medal:"🥈", color:"#b4c0d8", prize:`$${(parseFloat(t.entry_fee||0)*4).toFixed(0)} USDT (4× fee)` },
            { place:"3rd", medal:"🥉", color:"#CD7F32", prize:`$${(parseFloat(t.entry_fee||0)*2).toFixed(0)} USDT (2× fee)` },
          ].map(w => (
            <div key={w.place} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"10px 14px", background:"rgba(255,255,255,.03)",
              borderRadius:10, marginBottom:8, border:`1px solid ${w.color}22` }}>
              <span style={{ fontSize:22 }}>{w.medal}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:w.color }}>{w.place} Place</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{w.prize}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
          {[
            ["Participants", t.active_entries||0],
            ["Prize Pool", `$${pool.toLocaleString()}`],
            ["Duration", "90 min"],
            ["Entry Fee", `$${t.entry_fee}`],
            ["Platform (10%)", `$${Math.floor(pool*0.1)}`],
            ["Status", "Ended"],
          ].map(([l,v]) => (
            <div key={l} style={{ background:"rgba(255,255,255,.03)", borderRadius:10,
              padding:"10px 12px", border:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{String(v)}</div>
            </div>
          ))}
        </div>

        <Link href={`/tournaments/${t.id}`} className="btn btn-ghost"
          style={{ width:"100%", justifyContent:"center", display:"flex" }}>
          View Full Leaderboard & Results →
        </Link>
      </div>
    </div>
  );
}

function PastCard({ t, onClick }: { t: Tournament, onClick: ()=>void }) {
  const pool = Number(t.prize_pool || 0);
  return (
    <div onClick={onClick} style={{ background:"rgba(13,18,29,.7)",
      border:"1px solid rgba(255,255,255,.07)", borderRadius:14,
      padding:"16px 20px", cursor:"pointer", display:"flex",
      alignItems:"center", gap:16, flexWrap:"wrap",
      transition:"all .15s" }}
      onMouseEnter={e => { (e.currentTarget as any).style.borderColor="rgba(255,255,255,.18)"; (e.currentTarget as any).style.background="rgba(13,18,29,.98)"; }}
      onMouseLeave={e => { (e.currentTarget as any).style.borderColor="rgba(255,255,255,.07)"; (e.currentTarget as any).style.background="rgba(13,18,29,.7)"; }}>
      <div style={{ fontSize:28 }}>📊</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.8)", marginBottom:5 }}>{t.name}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <PlanBadge tier={t.tier}/>
          <span style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
            {t.active_entries} traders · ${t.entry_fee} entry
          </span>
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#FFD700" }}>${pool.toLocaleString()}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>prize pool</div>
      </div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>View details →</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TournamentsPage() {
  const [all, setAll] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const load = () => {
    tournamentApi.getAll("all")
      .then(data => { setAll(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  const registration = all.filter(t => t.status === "registration");
  const active       = all.filter(t => t.status === "active");
  const past         = all.filter(t => ["ended","cancelled"].includes(t.status));

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 40px" }}>

        <div style={{ marginBottom:40 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em",
            textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:10 }}>
            90-Minute Trading Battles
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
            fontSize:36, fontWeight:900, color:"#fff", letterSpacing:"-1.5px", marginBottom:10 }}>
            Live Battles & Results
          </h1>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.42)" }}>
            Are you good enough to beat only 25 traders? Pick a plan, grab a spot, trade for 90 minutes.
          </p>
        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}>
            <div className="spinner"/>
          </div>
        ) : (
          <>
            {/* ── OPEN FOR REGISTRATION ── */}
            {registration.length > 0 && (
              <div style={{ marginBottom:48 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                  <span style={{ fontSize:18, fontWeight:800, color:"#FFD700",
                    fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                    Open for Registration
                  </span>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.3)",
                    background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.2)",
                    borderRadius:20, padding:"2px 10px", color:"#FFD700" }}>
                    Grab your spot!
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
                  {registration.map(t => <RegistrationCard key={t.id} t={t}/>)}
                </div>
              </div>
            )}

            {/* ── LIVE BATTLES ── */}
            {active.length > 0 && (
              <div style={{ marginBottom:48 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                  <span className="live-dot"/>
                  <span style={{ fontSize:18, fontWeight:800, color:"#fff",
                    fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                    Live Battles
                  </span>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.3)",
                    background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)",
                    borderRadius:20, padding:"2px 10px", color:"#22C55E" }}>
                    {active.length} in progress
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
                  {active.map(t => <LiveCard key={t.id} t={t}/>)}
                </div>
              </div>
            )}

            {/* Empty state */}
            {registration.length === 0 && active.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 0",
                border:"1px dashed rgba(255,255,255,.08)", borderRadius:16, marginBottom:48 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
                <div style={{ fontSize:16, fontWeight:600, color:"rgba(255,255,255,.5)", marginBottom:6 }}>
                  No battles right now
                </div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.3)" }}>
                  New registration opens automatically. Check back in a moment!
                </div>
              </div>
            )}

            {/* ── PAST BATTLES ── */}
            {past.length > 0 && (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                  <span style={{ fontSize:18, fontWeight:800, color:"rgba(255,255,255,.5)",
                    fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                    Past Battles
                  </span>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.3)",
                    background:"rgba(255,255,255,.05)", borderRadius:20,
                    padding:"2px 10px" }}>{past.length}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {past.map(t => <PastCard key={t.id} t={t} onClick={()=>setSelected(t)}/>)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <PastModal t={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
