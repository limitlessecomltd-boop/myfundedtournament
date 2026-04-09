"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function AdminFundedAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected,setSelected]  = useState<any>(null);
  const [form, setForm]         = useState({status:"",brokerAccount:"",brokerName:"",notes:""});
  const [msg, setMsg]           = useState("");

  const load = () => {
    setLoading(true);
    fetch("https://myfundedtournament-production.up.railway.app/api/admin/funded-accounts",
      {headers:{Authorization:"Bearer "+localStorage.getItem("fc_token")}})
      .then(r=>r.json())
      .then(d=>setAccounts(d.data||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>load(),[]);

  async function update() {
    await fetch(
      `https://myfundedtournament-production.up.railway.app/api/admin/funded-accounts/${selected.id}`,
      { method:"PATCH",
        headers:{Authorization:"Bearer "+localStorage.getItem("fc_token"),"Content-Type":"application/json"},
        body:JSON.stringify(form) }
    );
    setMsg("✅ Updated!"); setSelected(null); load();
    setTimeout(()=>setMsg(""),3000);
  }

  const statusColor:Record<string,string> = {
    pending_kyc:"#FFD700",kyc_done:"#60a5fa",funded:"#22C55E",
    active:"#22C55E",suspended:"#EF4444",closed:"rgba(255,255,255,.3)"
  };

  const counts:Record<string,number> = {};
  accounts.forEach(a=>{ counts[a.status]=(counts[a.status]||0)+1; });

  return (
    <div className="adm-content-pad" style={{ background:"#030508", minHeight:"100vh" }}>
      <style>{`
        .adm-content-pad{padding:clamp(14px,2.5vw,32px) clamp(14px,3vw,36px);}
        .adm-kpi3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
        .adm-kpi2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;}
        .adm-2col{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
        .adm-finance-main{display:grid;grid-template-columns:1fr 320px;gap:24px;margin-bottom:24px;}
        .adm-table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .adm-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
        @media(max-width:1024px){
          .adm-kpi3{grid-template-columns:1fr 1fr;}
          .adm-finance-main{grid-template-columns:1fr;}
        }
        @media(max-width:768px){
          .adm-kpi3{grid-template-columns:1fr 1fr;gap:8px;}
          .adm-kpi2{grid-template-columns:1fr;gap:10px;}
          .adm-2col{grid-template-columns:1fr;gap:16px;}
          .adm-header-row{flex-direction:column;align-items:flex-start;}
        }
        @media(max-width:480px){
          .adm-kpi3{grid-template-columns:1fr;}
        }
      `}</style>

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>Funded Accounts</h1>
      </div>

      {msg && <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.3)",
        borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#22C55E" }}>{msg}</div>}

      {/* Status summary */}
      <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
        {Object.entries(statusColor).map(([s,c])=>(
          <div key={s} style={{ background:`${c}0f`, border:`1px solid ${c}33`,
            borderRadius:10, padding:"8px 14px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:900, color:c,
              fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{counts[s]||0}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", textTransform:"capitalize",
              whiteSpace:"nowrap" }}>{s.replace("_"," ")}</div>
          </div>
        ))}
      </div>

      {loading ? <div className="spinner"/> : accounts.length===0 ? (
        <div style={{ textAlign:"center", padding:"60px 0",
          border:"1px dashed rgba(255,255,255,.08)", borderRadius:16 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🏦</div>
          <div style={{ color:"rgba(255,255,255,.4)", fontSize:15 }}>No funded accounts yet</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {accounts.map((a:any)=>(
            <div key={a.id} style={{ background:"rgba(13,18,29,.95)",
              border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"18px 22px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", flexWrap:"wrap", gap:12 }}>
                <div>
                  <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20,
                      background:`${statusColor[a.status]||"#fff"}18`,
                      border:`1px solid ${statusColor[a.status]||"#fff"}44`,
                      color:statusColor[a.status]||"#fff",
                      textTransform:"capitalize" }}>{a.status.replace("_"," ")}</span>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{a.tournament_name}</span>
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>
                    🏆 {a.username||a.email}
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>
                    +{parseFloat(a.winning_profit_pct||0).toFixed(2)}% gain
                    {a.broker_name && ` · ${a.broker_name}`}
                    {a.broker_account && ` · Acc: ${a.broker_account}`}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:24, fontWeight:900, color:"#FFD700",
                    fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                    ${parseFloat(a.account_size||0).toFixed(0)}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>account size</div>
                </div>
              </div>
              <div style={{ marginTop:12 }}>
                <button onClick={()=>{ setSelected(a); setForm({status:a.status,brokerAccount:a.broker_account||"",brokerName:a.broker_name||"",notes:a.notes||""}); }}
                  className="btn btn-ghost btn-sm">⚙️ Update Status</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setSelected(null)}>
          <div style={{ background:"#0d1219", border:"1px solid rgba(255,255,255,.1)",
            borderRadius:20, padding:32, width:460 }}
            onClick={e=>e.stopPropagation()}>
            <h3 style={{ color:"#fff", marginBottom:20, fontSize:18, fontWeight:800 }}>
              Update Funded Account
            </h3>
            {[
              {label:"Status",field:"status",type:"select",options:["pending_kyc","kyc_done","funded","active","suspended","closed"]},
              {label:"Broker Name",field:"brokerName",type:"text",placeholder:"e.g. Exness"},
              {label:"Broker Account #",field:"brokerAccount",type:"text",placeholder:"e.g. 123456789"},
              {label:"Notes",field:"notes",type:"textarea",placeholder:"Internal notes..."},
            ].map(f=>(
              <div key={f.field} style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)",
                  textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>
                  {f.label}
                </label>
                {f.type==="select" ? (
                  <select value={(form as any)[f.field]}
                    onChange={e=>setForm(p=>({...p,[f.field]:e.target.value}))}
                    className="input" style={{ width:"100%" }}>
                    {f.options!.map(o=><option key={o} value={o}>{o.replace("_"," ")}</option>)}
                  </select>
                ) : f.type==="textarea" ? (
                  <textarea value={(form as any)[f.field]}
                    onChange={e=>setForm(p=>({...p,[f.field]:e.target.value}))}
                    className="input" rows={3} style={{ width:"100%", resize:"vertical" }}
                    placeholder={f.placeholder}/>
                ) : (
                  <input value={(form as any)[f.field]}
                    onChange={e=>setForm(p=>({...p,[f.field]:e.target.value}))}
                    className="input" style={{ width:"100%" }} placeholder={f.placeholder}/>
                )}
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button onClick={update} className="btn btn-primary" style={{ flex:1, justifyContent:"center" }}>
                💾 Save
              </button>
              <button onClick={()=>setSelected(null)} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
