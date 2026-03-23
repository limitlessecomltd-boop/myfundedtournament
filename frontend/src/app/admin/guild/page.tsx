"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function AdminGuild() {
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    adminApi.getGuildBattles().then(setBattles).finally(()=>setLoading(false));
  },[]);

  const statusColor: Record<string,string> = {
    registration:"#FFD700", active:"#22C55E", ended:"rgba(255,255,255,.35)", cancelled:"#EF4444"
  };

  const totalPool    = battles.reduce((s,b)=>s+parseFloat(b.pool_collected||0),0);
  const totalEarning = battles.reduce((s,b)=>{
    const pool = parseFloat(b.pool_collected||0);
    const pPct = parseFloat(b.platform_pct||10);
    return s + (pool * pPct / 100);
  },0);

  return (
    <div style={{ padding:"32px 36px", background:"#030508", minHeight:"100vh" }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px", marginBottom:4 }}>
          🔥 Guild Battles
        </h1>
        <div style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>
          Community-organised battles overview
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
        {[
          { label:"Total Guild Battles", value:battles.length, color:"#FF6400", icon:"🔥" },
          { label:"Total Pool Collected", value:`$${totalPool.toFixed(2)}`, color:"#22C55E", icon:"💰" },
          { label:"Platform Earnings (10%)", value:`$${totalEarning.toFixed(2)}`, color:"#FFD700", icon:"🏛" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(13,18,29,.95)",
            border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"16px 20px",
            display:"flex", gap:14, alignItems:"center" }}>
            <span style={{ fontSize:28 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:4,
                textTransform:"uppercase", letterSpacing:".06em" }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:900, color:s.color,
                fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? <div className="spinner"/> : battles.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0",
          border:"1px dashed rgba(255,100,0,.2)", borderRadius:16 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔥</div>
          <div style={{ color:"rgba(255,255,255,.4)", fontSize:15 }}>
            No Guild Battles yet — run Supabase migration to enable
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {battles.map((b:any) => {
            const pool    = parseFloat(b.pool_collected||0);
            const orgPct  = parseFloat(b.organiser_pct||0);
            const platPct = parseFloat(b.platform_pct||10);
            const orgAmt  = pool * orgPct / 100;
            const platAmt = pool * platPct / 100;
            return (
              <div key={b.id} style={{ background:"rgba(13,18,29,.95)",
                border:"1px solid rgba(255,100,0,.2)", borderRadius:14, padding:"18px 22px" }}>
                <div style={{ display:"flex", alignItems:"flex-start",
                  justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ display:"flex", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20,
                        background:`${statusColor[b.status]||"#fff"}18`,
                        border:`1px solid ${statusColor[b.status]||"#fff"}44`,
                        color:statusColor[b.status]||"#fff" }}>{b.status}</span>
                      {b.slug && (
                        <a href={`/battle/${b.slug}`} target="_blank" rel="noreferrer"
                          style={{ fontSize:11, color:"#FF6400", textDecoration:"none",
                            background:"rgba(255,100,0,.1)", borderRadius:20, padding:"2px 8px",
                            border:"1px solid rgba(255,100,0,.2)" }}>
                          🔗 /battle/{b.slug}
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:4 }}>{b.name}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>
                      Organiser: <strong style={{ color:"#FF6400" }}>{b.organiser_username||"—"}</strong>
                      {" · "}{b.organiser_email}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:3 }}>
                      Platform earned (10%)
                    </div>
                    <div style={{ fontSize:22, fontWeight:900, color:"#FFD700",
                      fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                      ${platAmt.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
                  gap:10, marginTop:14 }}>
                  {[
                    { l:"Entry Fee", v:`$${b.entry_fee}` },
                    { l:"Max Players", v:b.max_entries },
                    { l:"Joined", v:`${b.active_entries||0}/${b.max_entries}` },
                    { l:"Winner %", v:`${b.winner_pct||90}%` },
                    { l:"Organiser %", v:`${orgPct}%  ($${orgAmt.toFixed(2)})` },
                    { l:"Pool Collected", v:`$${pool.toFixed(2)}` },
                  ].map(({l,v})=>(
                    <div key={l} style={{ background:"rgba(255,255,255,.03)",
                      borderRadius:8, padding:"8px 12px" }}>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.8)" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
