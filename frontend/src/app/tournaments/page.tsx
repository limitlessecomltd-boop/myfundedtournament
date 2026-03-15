"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tournamentApi } from "@/lib/api";
import { Tournament } from "@/types";

function StatusDot({ status }: { status: string }) {
  const c = status==="active"?"#22C55E":status==="registration"?"#FFD700":"rgba(255,255,255,.3)";
  return <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block", marginRight:6, boxShadow:status==="active"?`0 0 6px ${c}`:undefined }}/>
}

function PlanBadge({ tier }: { tier: string }) {
  const color = tier==="pro" ? "#22C55E" : "#FFD700";
  const name = tier==="pro" ? "Pro Bullet" : "Starter Bullet";
  return <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20, background:`${color}18`, border:`1px solid ${color}44`, color }}>{name}</span>;
}

function LiveCard({ t }: { t: Tournament }) {
  const fillPct = Math.min(100, Math.round(((t.active_entries||0) / t.max_entries) * 100));
  const isActive = t.status === "active";
  const color = (t.tier==="pro") ? "#22C55E" : "#FFD700";

  return (
    <div style={{ background:"rgba(13,18,29,.95)", border:`1px solid ${color}33`, borderRadius:18, padding:24, position:"relative", overflow:"hidden" }}>
      {isActive && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}88)` }}/>}
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <PlanBadge tier={t.tier}/>
        <div style={{ display:"flex", alignItems:"center", fontSize:12, fontWeight:700, color: isActive?"#22C55E":"#FFD700" }}>
          <StatusDot status={t.status}/>
          {isActive ? "LIVE" : t.status==="registration" ? "OPEN" : "UPCOMING"}
        </div>
      </div>
      <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:4, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{t.name}</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:16, fontStyle:"italic" }}>
        Are you good enough to beat only {t.max_entries} traders?
      </div>
      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        {[
          ["Entry Fee", `$${t.entry_fee} USDT`],
          ["Prize Pool", `$${Number(t.prize_pool||0).toLocaleString()}`],
          ["Demo Balance", "$1,000"],
        ].map(([l,v])=>(
          <div key={l} style={{ background:"rgba(255,255,255,.03)", borderRadius:10, padding:"10px 12px", border:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:3, textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div>
            <div style={{ fontSize:15, fontWeight:700, color:l==="Prize Pool"?color:"#fff" }}>{v}</div>
          </div>
        ))}
      </div>
      {/* Fill bar */}
      <div style={{ marginBottom:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:5 }}>
          <span>{t.active_entries||0} / {t.max_entries} traders joined</span>
          <span style={{ color }}>{fillPct}% full</span>
        </div>
        <div style={{ height:6, background:"rgba(255,255,255,.07)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${fillPct}%`, background:`linear-gradient(90deg,${color},${color}cc)`, borderRadius:3, transition:"width .3s" }}/>
        </div>
        {!isActive && <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:5 }}>Battle starts within 5 min after {t.max_entries} entries</div>}
      </div>
      <div style={{ marginTop:18 }}>
        <Link href={`/tournaments/${t.id}`} className="btn" style={{ width:"100%", justifyContent:"center", display:"flex", background:color, color:"#000", fontWeight:800, fontSize:15, padding:"13px" }}>
          {isActive ? "⚔️ Battle is Live →" : "Join Battle →"}
        </Link>
      </div>
    </div>
  );
}

// Past tournament modal
function PastModal({ t, onClose }: { t: any, onClose: ()=>void }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#0d1219", border:"1px solid rgba(255,255,255,.1)", borderRadius:20, padding:32, maxWidth:640, width:"100%", maxHeight:"80vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <PlanBadge tier={t.tier}/>
            <div style={{ fontSize:22, fontWeight:800, color:"#fff", marginTop:8, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{t.name}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.38)", marginTop:4 }}>
              {t.active_entries} traders · ${t.entry_fee} entry · ${Number(t.prize_pool||0).toLocaleString()} pool
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,.4)", fontSize:24, cursor:"pointer", padding:"0 4px" }}>✕</button>
        </div>

        {/* Winners */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:12 }}>🏆 Winners</div>
          {[
            { place:"1st", medal:"🥇", color:"#FFD700", prize:`Funded Account (90% = $${Math.floor(Number(t.prize_pool||0)*0.9)})` },
            { place:"2nd", medal:"🥈", color:"#b4c0d8", prize:`$${parseFloat(t.entry_fee||0)*4} USDT (4× fee)` },
            { place:"3rd", medal:"🥉", color:"#CD7F32", prize:`$${parseFloat(t.entry_fee||0)*2} USDT (2× fee)` },
          ].map(w=>(
            <div key={w.place} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"rgba(255,255,255,.03)", borderRadius:10, marginBottom:8, border:`1px solid ${w.color}22` }}>
              <span style={{ fontSize:22 }}>{w.medal}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:w.color }}>{w.place} Place</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{w.prize}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
          {[
            ["Total Entries", t.active_entries||0],
            ["Prize Pool", `$${Number(t.prize_pool||0).toLocaleString()}`],
            ["Duration", "90 min"],
            ["Entry Fee", `$${t.entry_fee} USDT`],
            ["Platform Fee", `$${Math.floor(Number(t.prize_pool||0)*0.1)}`],
            ["Status", t.status],
          ].map(([l,v])=>(
            <div key={l} style={{ background:"rgba(255,255,255,.03)", borderRadius:10, padding:"10px 12px", border:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff", textTransform:"capitalize" }}>{String(v)}</div>
            </div>
          ))}
        </div>

        <Link href={`/tournaments/${t.id}`} className="btn btn-ghost" style={{ width:"100%", justifyContent:"center", display:"flex" }}>
          View Full Leaderboard →
        </Link>
      </div>
    </div>
  );
}

function PastCard({ t, onClick }: { t: Tournament, onClick: ()=>void }) {
  return (
    <div onClick={onClick} style={{ background:"rgba(13,18,29,.7)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"16px 20px", cursor:"pointer", transition:"border-color .15s, background .15s", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}
      onMouseEnter={e=>{(e.currentTarget as any).style.borderColor="rgba(255,255,255,.15)";(e.currentTarget as any).style.background="rgba(13,18,29,.95)";}}
      onMouseLeave={e=>{(e.currentTarget as any).style.borderColor="rgba(255,255,255,.07)";(e.currentTarget as any).style.background="rgba(13,18,29,.7)";}}>
      <div style={{ fontSize:28 }}>📊</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.8)", marginBottom:4 }}>{t.name}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <PlanBadge tier={t.tier}/>
          <span style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>{t.active_entries} traders · ${t.entry_fee} entry</span>
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:16, fontWeight:800, color:"#FFD700" }}>${Number(t.prize_pool||0).toLocaleString()}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>prize pool</div>
      </div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", flexShrink:0 }}>View details →</div>
    </div>
  );
}

export default function TournamentsPage() {
  const [all, setAll] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    tournamentApi.getAll("all").then(setAll).finally(() => setLoading(false));
  }, []);

  const live = all.filter(t => ["active","registration","upcoming"].includes(t.status));
  const past = all.filter(t => ["ended","cancelled"].includes(t.status));

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 40px" }}>

        {/* Header */}
        <div style={{ marginBottom:40 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:10 }}>90-Minute Trading Battles</div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:36, fontWeight:900, color:"#fff", letterSpacing:"-1.5px", marginBottom:10 }}>
            Live Battles & Results
          </h1>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.42)" }}>
            Are you good enough to beat only 25 traders? Join a 90-minute battle and win a funded account.
          </p>
        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}>
            <div className="spinner"/>
          </div>
        ) : (
          <>
            {/* ── LIVE SECTION ── */}
            <div style={{ marginBottom:52 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <span className="live-dot"/>
                <span style={{ fontSize:18, fontWeight:800, color:"#fff", fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>Live & Open Battles</span>
                <span style={{ fontSize:13, color:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.06)", borderRadius:20, padding:"2px 10px" }}>{live.length}</span>
              </div>
              {live.length === 0 ? (
                <div style={{ textAlign:"center", padding:"52px 0", border:"1px dashed rgba(255,255,255,.08)", borderRadius:16 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
                  <div style={{ fontSize:16, fontWeight:600, color:"rgba(255,255,255,.5)", marginBottom:6 }}>No battles right now</div>
                  <div style={{ fontSize:14, color:"rgba(255,255,255,.3)" }}>New battle starts as soon as 25 traders join. Check back soon!</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
                  {live.map(t => <LiveCard key={t.id} t={t}/>)}
                </div>
              )}
            </div>

            {/* ── PAST SECTION ── */}
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <span style={{ fontSize:18, fontWeight:800, color:"rgba(255,255,255,.6)", fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>Past Battles</span>
                <span style={{ fontSize:13, color:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.06)", borderRadius:20, padding:"2px 10px" }}>{past.length}</span>
              </div>
              {past.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,.3)", fontSize:14 }}>No past battles yet.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {past.map(t => <PastCard key={t.id} t={t} onClick={()=>setSelected(t)}/>)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Past tournament modal */}
      {selected && <PastModal t={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
