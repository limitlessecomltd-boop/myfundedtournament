"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

const fmt = (n: any, d=2) => parseFloat((parseFloat(n)||0).toFixed(d)).toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d});

export default function AdminGuild() {
  const [battles,  setBattles]  = useState<any[]>([]);
  const [summary,  setSummary]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");

  useEffect(()=>{
    adminApi.getGuildBattles()
      .then((res:any) => {
        const data = Array.isArray(res) ? res : res.data || [];
        setBattles(data);
        if (res.summary) setSummary(res.summary);
        else {
          // Compute summary from data if not returned
          const total_commissions_paid = data.filter((b:any)=>b.status==='ended').reduce((s:number,b:any)=>s+parseFloat(b.commission_earned||0),0);
          const commissions_pending    = data.filter((b:any)=>b.status!=='ended').reduce((s:number,b:any)=>s+parseFloat(b.commission_earned||0),0);
          const total_prize_volume     = data.reduce((s:number,b:any)=>s+parseFloat(b.prize_pool||0),0);
          const platform_earnings      = data.reduce((s:number,b:any)=>s+parseFloat(b.prize_pool||0)*0.10,0);
          setSummary({ total_battles:data.length, completed_battles:data.filter((b:any)=>b.status==='ended').length, total_commissions_paid, commissions_pending, total_prize_volume, platform_earnings, unique_organisers: new Set(data.map((b:any)=>b.organiser_id)).size });
        }
      })
      .finally(()=>setLoading(false));
  },[]);

  const statusColor: Record<string,string> = {
    registration:"#FFD700", active:"#22C55E", ended:"rgba(255,255,255,.3)", cancelled:"#EF4444"
  };

  const filtered = filter === "all" ? battles : battles.filter(b => b.status === filter);

  // Per-organiser commission rollup
  const byOrganiser = battles.reduce((acc:any, b:any) => {
    const key = b.organiser_id || "unknown";
    if (!acc[key]) acc[key] = { name: b.organiser_username||"Unknown", email: b.organiser_email||"", total:0, paid:0, pending:0, battles:0 };
    const comm = parseFloat(b.commission_earned || 0);
    acc[key].battles++;
    acc[key].total += comm;
    if (b.status === "ended") acc[key].paid += comm;
    else acc[key].pending += comm;
    return acc;
  }, {});
  const organisers = Object.values(byOrganiser).sort((a:any,b:any) => b.total - a.total);

  return (
    <div className="adm-content-pad" style={{ background:"#030508", minHeight:"100vh" }}>
      <style>{`
        .adm-content-pad{padding:clamp(14px,2.5vw,32px) clamp(14px,3vw,36px);}
        .comm-kpi{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;}
        .comm-kpi-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:16px 18px;}
        .org-table{width:100%;border-collapse:collapse;font-size:13px;}
        .org-table th{padding:9px 14px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.3);border-bottom:1px solid rgba(255,255,255,.06);}
        .org-table td{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.03);color:rgba(255,255,255,.7);}
        .org-table tr:last-child td{border:none;}
        .adm-table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        @media(max-width:1100px){.comm-kpi{grid-template-columns:repeat(3,1fr);}}
        @media(max-width:768px){.comm-kpi{grid-template-columns:1fr 1fr;gap:9px;}}
        @media(max-width:480px){.comm-kpi{grid-template-columns:1fr;}}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,100,0,.5)", marginBottom:6 }}>Admin</div>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:26, fontWeight:900, color:"#fff", letterSpacing:"-1px", marginBottom:3 }}>
          🔥 Guild Battles &amp; Commissions
        </h1>
        <div style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>Community battles · organiser earnings · platform revenue</div>
      </div>

      {/* KPI Summary */}
      {summary && (
        <div className="comm-kpi">
          <div className="comm-kpi-card" style={{ borderColor:"rgba(255,100,0,.3)" }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,100,0,.6)", marginBottom:8 }}>Commissions Paid</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:900, color:"#FF6400", lineHeight:1, letterSpacing:"-1px" }}>
              ${fmt(summary.total_commissions_paid)}
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:4 }}>to organisers · completed battles</div>
          </div>
          <div className="comm-kpi-card" style={{ borderColor:"rgba(255,215,0,.25)" }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,215,0,.5)", marginBottom:8 }}>Commissions Pending</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:900, color:"#FFD700", lineHeight:1, letterSpacing:"-1px" }}>
              ${fmt(summary.commissions_pending)}
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:4 }}>active &amp; filling battles</div>
          </div>
          <div className="comm-kpi-card" style={{ borderColor:"rgba(34,197,94,.2)" }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(34,197,94,.5)", marginBottom:8 }}>Platform Earnings (10%)</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:900, color:"#22C55E", lineHeight:1, letterSpacing:"-1px" }}>
              ${fmt(summary.platform_earnings || parseFloat(summary.total_prize_volume||0)*0.1)}
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:4 }}>MFT flat 10% take</div>
          </div>
          <div className="comm-kpi-card">
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(96,165,250,.5)", marginBottom:8 }}>Prize Volume</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:900, color:"#60a5fa", lineHeight:1, letterSpacing:"-1px" }}>
              ${fmt(summary.total_prize_volume, 0)}
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:4 }}>total prize pool generated</div>
          </div>
          <div className="comm-kpi-card">
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:8 }}>Organisers</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:900, color:"#fff", lineHeight:1 }}>
              {summary.unique_organisers || organisers.length}
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:4 }}>{summary.total_battles} battles total · {summary.completed_battles} ended</div>
          </div>
        </div>
      )}

      {/* Per-organiser commission breakdown */}
      {organisers.length > 0 && (
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, marginBottom:24, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Commission by Organiser</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{organisers.length} organisers</div>
          </div>
          <div className="adm-table-scroll">
            <table className="org-table">
              <thead><tr>
                <th>Organiser</th><th>Battles</th><th>Total Earned</th><th>Paid Out</th><th>Pending</th>
              </tr></thead>
              <tbody>
                {(organisers as any[]).map((o:any, i:number) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight:600, color:"#FF6400" }}>{o.name}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{o.email}</div>
                    </td>
                    <td style={{ color:"rgba(255,255,255,.6)" }}>{o.battles}</td>
                    <td><span style={{ fontWeight:700, color:"#FF6400", fontFamily:"'Space Grotesk',sans-serif" }}>${fmt(o.total)}</span></td>
                    <td><span style={{ color:"#22C55E" }}>${fmt(o.paid)}</span></td>
                    <td><span style={{ color:"#FFD700" }}>${fmt(o.pending)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {["all","registration","active","ended"].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${filter===f?"rgba(255,100,0,.4)":"rgba(255,255,255,.08)"}`,
              background: filter===f?"rgba(255,100,0,.1)":"transparent", color:filter===f?"#FF6400":"rgba(255,255,255,.4)",
              cursor:"pointer", fontSize:12, fontWeight:filter===f?700:400, fontFamily:"'Space Grotesk',sans-serif", textTransform:"capitalize" }}>
            {f === "all" ? `All (${battles.length})` : `${f} (${battles.filter(b=>b.status===f).length})`}
          </button>
        ))}
      </div>

      {/* Battle list */}
      {loading ? <div className="spinner"/> : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", border:"1px dashed rgba(255,100,0,.15)", borderRadius:16 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🔥</div>
          <div style={{ color:"rgba(255,255,255,.35)", fontSize:14 }}>No guild battles found</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map((b:any) => {
            const pool    = parseFloat(b.prize_pool || 0);
            const orgPct  = parseFloat(b.organiser_pct||0);
            const platPct = 10;
            const commission = parseFloat(b.commission_earned || (pool * orgPct / 100));
            const platAmt    = pool * platPct / 100;
            const isPaid     = b.status === "ended";

            return (
              <div key={b.id} style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,100,0,.18)", borderRadius:14, padding:"18px 22px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:7, marginBottom:6, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                        background:`${statusColor[b.status]||"#fff"}18`, border:`1px solid ${statusColor[b.status]||"#fff"}40`,
                        color:statusColor[b.status]||"#fff", textTransform:"capitalize" }}>{b.status}</span>
                      {b.slug && (
                        <a href={`/battle/${b.slug}`} target="_blank" rel="noreferrer"
                          style={{ fontSize:10, color:"#FF6400", textDecoration:"none", background:"rgba(255,100,0,.08)", borderRadius:20, padding:"2px 8px", border:"1px solid rgba(255,100,0,.2)" }}>
                          🔗 /battle/{b.slug}
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:3 }}>{b.name}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
                      By <strong style={{ color:"#FF6400" }}>{b.organiser_username||"—"}</strong>
                      {" · "}{b.active_entries||0}/{b.max_entries} traders{" · "}${b.entry_fee} entry
                    </div>
                  </div>

                  {/* Commission + platform split */}
                  <div style={{ display:"flex", gap:8 }}>
                    <div style={{ background:"rgba(255,100,0,.06)", border:"1px solid rgba(255,100,0,.2)", borderRadius:9, padding:"10px 14px", textAlign:"center" }}>
                      <div style={{ fontSize:9, color:"rgba(255,100,0,.6)", fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>
                        {isPaid ? "✅ Paid" : "Organiser"}
                      </div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:900, color:"#FF6400" }}>${fmt(commission)}</div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:2 }}>{orgPct}%</div>
                    </div>
                    <div style={{ background:"rgba(255,215,0,.05)", border:"1px solid rgba(255,215,0,.15)", borderRadius:9, padding:"10px 14px", textAlign:"center" }}>
                      <div style={{ fontSize:9, color:"rgba(255,215,0,.5)", fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>Platform</div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:900, color:"#FFD700" }}>${fmt(platAmt)}</div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:2 }}>10%</div>
                    </div>
                  </div>
                </div>

                {/* Detail chips */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8, marginTop:14 }}>
                  {[
                    { l:"Entry Fee",    v:`$${b.entry_fee}` },
                    { l:"Max Players",  v:b.max_entries },
                    { l:"Joined",       v:`${b.active_entries||0}/${b.max_entries}` },
                    { l:"Winner %",     v:`${b.winner_pct||90}%` },
                    { l:"Organiser %",  v:`${orgPct}%` },
                    { l:"Prize Pool",   v:`$${fmt(pool,0)}` },
                  ].map(({l,v})=>(
                    <div key={l} style={{ background:"rgba(255,255,255,.025)", borderRadius:7, padding:"7px 11px" }}>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,.28)", marginBottom:2, textTransform:"uppercase", letterSpacing:".08em" }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.75)" }}>{v}</div>
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
