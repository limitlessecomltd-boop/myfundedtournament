"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function AdminFinance() {
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    adminApi.finance().then(setData).finally(()=>setLoading(false));
  },[]);

  function exportCSV() {
    if (!data?.topTraders) return;
    const rows = [
      ["Email","Username","Total Spent","Entries"],
      ...data.topTraders.map((t:any)=>[t.email,t.username||"",t.total_spent,t.entry_count])
    ];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="mft-finance.csv"; a.click();
  }

  if (loading) return (
    <div style={{ padding:40, display:"flex", justifyContent:"center" }}><div className="spinner"/></div>
  );

  const rev      = data?.revenue||{};
  const daily    = data?.daily||[];
  const byTier   = data?.byTier||[];
  const traders  = data?.topTraders||[];
  const winners  = data?.recentWinners||[];

  const maxRev   = Math.max(...daily.map((d:any)=>parseFloat(d.revenue||0)),1);

  return (
    <div style={{ padding:"32px 36px", background:"#030508", minHeight:"100vh" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
            fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>Finance</h1>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>Platform revenue & P&L</div>
        </div>
        <button onClick={exportCSV} style={{ background:"rgba(34,197,94,.1)",
          border:"1px solid rgba(34,197,94,.3)", borderRadius:9, padding:"9px 18px",
          cursor:"pointer", fontSize:13, fontWeight:700, color:"#22C55E" }}>
          ⬇️ Export CSV
        </button>
      </div>

      {/* Revenue cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
        gap:14, marginBottom:28 }}>
        {[
          { label:"Confirmed Revenue", value:`$${parseFloat(rev.confirmed_revenue||0).toFixed(2)}`, color:"#22C55E" },
          { label:"Pending Revenue", value:`$${parseFloat(rev.pending_revenue||0).toFixed(2)}`, color:"#FFD700" },
          { label:"Confirmed Entries", value:rev.confirmed_count||0, color:"#60a5fa" },
          { label:"Pending Entries", value:rev.pending_count||0, color:"rgba(255,255,255,.5)" },
          { label:"Expired", value:rev.expired_count||0, color:"#EF4444" },
        ].map(s=>(
          <div key={s.label} style={{ background:"rgba(13,18,29,.95)",
            border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"16px 20px" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:6,
              textTransform:"uppercase", letterSpacing:".06em" }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:s.color,
              fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24, marginBottom:24 }}>
        {/* Daily revenue chart */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:14, padding:"20px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:20 }}>
            Daily Revenue (Last 14 Days)
          </div>
          {daily.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,.3)", fontSize:14 }}>
              No revenue data yet
            </div>
          ) : (
            <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:160 }}>
              {daily.map((d:any,i:number)=>{
                const h = Math.max(4, Math.round((parseFloat(d.revenue)/maxRev)*140));
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column",
                    alignItems:"center", gap:4 }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.4)" }}>
                      ${parseFloat(d.revenue).toFixed(0)}
                    </div>
                    <div style={{ width:"100%", height:h, borderRadius:"4px 4px 0 0",
                      background:"linear-gradient(180deg,#22C55E,rgba(34,197,94,.4))",
                      minHeight:4 }}/>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", whiteSpace:"nowrap" }}>
                      {new Date(d.day).toLocaleDateString([],{month:"short",day:"numeric"})}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By tier */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:14, padding:"20px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
            Revenue by Tier
          </div>
          {byTier.length===0 ? (
            <div style={{ color:"rgba(255,255,255,.3)", fontSize:13, textAlign:"center", padding:"30px 0" }}>
              No data yet
            </div>
          ) : byTier.map((t:any)=>(
            <div key={t.tier} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"12px 0",
              borderBottom:"1px solid rgba(255,255,255,.05)" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#fff", textTransform:"capitalize" }}>
                  {t.tier}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
                  {t.entries} entries
                </div>
              </div>
              <div style={{ fontSize:18, fontWeight:900,
                color: t.tier==="pro"?"#22C55E":t.tier==="guild"?"#FF6400":"#FFD700",
                fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                ${parseFloat(t.revenue).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        {/* Top traders */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:14, padding:"20px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
            Top Spenders
          </div>
          {traders.length===0 ? (
            <div style={{ color:"rgba(255,255,255,.3)", fontSize:13, textAlign:"center", padding:"30px 0" }}>
              No data yet
            </div>
          ) : traders.map((t:any,i:number)=>(
            <div key={t.email} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
              <span style={{ fontSize:16, width:24, textAlign:"center",
                color:i===0?"#FFD700":i===1?"#b4c0d8":i===2?"#CD7F32":"rgba(255,255,255,.3)" }}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
              </span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{t.username||t.email}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{t.entry_count} entries</div>
              </div>
              <div style={{ fontSize:15, fontWeight:800, color:"#22C55E" }}>
                ${parseFloat(t.total_spent).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Recent winners */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:14, padding:"20px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
            Recent Winners
          </div>
          {winners.length===0 ? (
            <div style={{ color:"rgba(255,255,255,.3)", fontSize:13, textAlign:"center", padding:"30px 0" }}>
              No winners yet
            </div>
          ) : winners.map((w:any)=>(
            <div key={w.id} style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#FFD700" }}>🏆 {w.username||w.email}</span>
                <span style={{ fontSize:13, fontWeight:800, color:"#22C55E" }}>
                  ${parseFloat(w.account_size||0).toFixed(0)}
                </span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{w.tournament_name}</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>
                  +{parseFloat(w.profit_pct||0).toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
