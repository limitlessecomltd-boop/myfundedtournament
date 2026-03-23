"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

const TABS = ["pending_review","confirmed","dismissed"];

export default function AdminViolations() {
  const [viols, setViols] = useState<any[]>([]);
  const [tab, setTab]     = useState("pending_review");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]     = useState("");

  const load = (t=tab) => {
    setLoading(true);
    fetch(`https://myfundedtournament-production.up.railway.app/api/admin/violations?status=${t}`,
      {headers:{Authorization:"Bearer "+localStorage.getItem("fc_token")}})
      .then(r=>r.json())
      .then(d=>setViols(d.data||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>load(),[]);

  const flash=(m:string)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};

  async function update(id:string,status:string) {
    await fetch(
      `https://myfundedtournament-production.up.railway.app/api/admin/violations/${id}`,
      { method:"PATCH",
        headers:{Authorization:"Bearer "+localStorage.getItem("fc_token"),"Content-Type":"application/json"},
        body:JSON.stringify({status}) }
    );
    flash(`✅ Violation ${status}`); load();
  }

  const typeColor:Record<string,string>={hft:"#EF4444",hedge:"#FF6400",deposit:"#a78bfa",account_change:"#60a5fa"};
  const typeIcon:Record<string,string>={hft:"⚡",hedge:"↔️",deposit:"💰",account_change:"🔄"};

  return (
    <div style={{ padding:"32px 36px", background:"#030508", minHeight:"100vh" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>Violations</h1>
        <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>
          Rule breach review — DQ traders, clear false positives
        </div>
      </div>

      {msg && <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.3)",
        borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#22C55E" }}>{msg}</div>}

      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>{ setTab(t); load(t); }}
            style={{ padding:"7px 16px", borderRadius:8, cursor:"pointer",
              fontSize:13, fontWeight:tab===t?700:500,
              background:tab===t?"rgba(239,68,68,.12)":"rgba(255,255,255,.04)",
              border:tab===t?"1px solid rgba(239,68,68,.3)":"1px solid rgba(255,255,255,.08)",
              color:tab===t?"#EF4444":"rgba(255,255,255,.5)",
              textTransform:"capitalize" }}>
            {t.replace("_"," ")}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner"/> : viols.length===0 ? (
        <div style={{ textAlign:"center", padding:"60px 0",
          border:"1px dashed rgba(255,255,255,.08)", borderRadius:16 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
          <div style={{ color:"rgba(255,255,255,.4)", fontSize:15 }}>
            No {tab.replace("_"," ")} violations
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {viols.map((v:any)=>(
            <div key={v.id} style={{ background:"rgba(13,18,29,.95)",
              border:"1px solid rgba(239,68,68,.15)", borderRadius:14, padding:"18px 22px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                <div>
                  <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:20,
                      background:`${typeColor[v.type]||"#fff"}18`,
                      border:`1px solid ${typeColor[v.type]||"#fff"}44`,
                      color:typeColor[v.type]||"#fff" }}>
                      {typeIcon[v.type]} {v.type?.toUpperCase()}
                    </span>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Entry #{v.entry_number}</span>
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>
                    {v.username||v.email}
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:3 }}>
                    MT5: {v.mt5_login} · {v.tournament_name}
                  </div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.55)", marginTop:8,
                    background:"rgba(255,255,255,.03)", borderRadius:8, padding:"8px 12px",
                    lineHeight:1.6 }}>
                    {v.description}
                  </div>
                </div>
                {tab === "pending_review" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
                    <button onClick={()=>update(v.id,"disqualified")}
                      style={{ background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.3)",
                        borderRadius:9, padding:"8px 16px", cursor:"pointer",
                        fontSize:13, fontWeight:700, color:"#EF4444" }}>
                      🚫 Disqualify
                    </button>
                    <button onClick={()=>update(v.id,"dismissed")}
                      style={{ background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)",
                        borderRadius:9, padding:"8px 16px", cursor:"pointer",
                        fontSize:13, fontWeight:700, color:"#22C55E" }}>
                      ✅ Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
