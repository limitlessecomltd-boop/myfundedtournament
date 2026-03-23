"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

const TABS = ["pending","approved","paid","rejected"];

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [tab,     setTab]     = useState("pending");
  const [loading, setLoading] = useState(true);
  const [selected,setSelected]= useState<any>(null);
  const [txHash,  setTxHash]  = useState("");
  const [notes,   setNotes]   = useState("");
  const [msg,     setMsg]     = useState("");

  const load = (t=tab) => {
    setLoading(true);
    adminApi.getPayouts(t).then(setPayouts).finally(()=>setLoading(false));
  };
  useEffect(()=>load(),[]);

  const flash = (m:string)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};

  async function updatePayout(id:string,status:string) {
    await fetch(
      `https://myfundedtournament-production.up.railway.app/api/admin/payouts/${id}`,
      { method:"PATCH", headers:{Authorization:"Bearer "+localStorage.getItem("fc_token"),
        "Content-Type":"application/json"},
        body:JSON.stringify({status,txHash,notes}) }
    );
    flash(`✅ Payout marked as ${status}`);
    setSelected(null); setTxHash(""); setNotes("");
    load();
  }

  const statusColor:Record<string,string> = {
    pending:"#FFD700",approved:"#60a5fa",paid:"#22C55E",rejected:"#EF4444"
  };

  return (
    <div style={{ padding:"32px 36px", background:"#030508", minHeight:"100vh" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>Payouts</h1>
        <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>
          Winner payout & funded account requests
        </div>
      </div>

      {msg && <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.3)",
        borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#22C55E" }}>{msg}</div>}

      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>{ setTab(t); load(t); }}
            style={{ padding:"7px 18px", borderRadius:8, cursor:"pointer",
              fontSize:13, fontWeight:tab===t?700:500, textTransform:"capitalize",
              background:tab===t?`${statusColor[t]}18`:"rgba(255,255,255,.04)",
              border:tab===t?`1px solid ${statusColor[t]}44`:"1px solid rgba(255,255,255,.08)",
              color:tab===t?statusColor[t]:"rgba(255,255,255,.5)" }}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner"/> : payouts.length===0 ? (
        <div style={{ textAlign:"center", padding:"60px 0",
          border:"1px dashed rgba(255,255,255,.08)", borderRadius:16 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
          <div style={{ color:"rgba(255,255,255,.4)", fontSize:15 }}>
            No {tab} payouts
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {payouts.map((p:any) => (
            <div key={p.id} style={{ background:"rgba(13,18,29,.95)",
              border:"1px solid rgba(255,255,255,.07)", borderRadius:14,
              padding:"18px 22px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", flexWrap:"wrap", gap:12 }}>
                <div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20,
                      background:`${statusColor[p.status]}18`,
                      border:`1px solid ${statusColor[p.status]}44`,
                      color:statusColor[p.status] }}>{p.status}</span>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{p.tournament_name}</span>
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>
                    {p.username||p.email}
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>
                    Wallet: <span style={{ fontFamily:"monospace", color:"rgba(255,255,255,.6)" }}>
                      {p.wallet_address}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:24, fontWeight:900, color:"#22C55E",
                    fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                    ${parseFloat(p.trader_amount||0).toFixed(2)}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>
                    in {p.currency||"USDT"}
                  </div>
                </div>
              </div>
              {p.status === "pending" && (
                <div style={{ marginTop:14, display:"flex", gap:10 }}>
                  <button onClick={()=>setSelected(p)} className="btn btn-primary btn-sm">
                    ✅ Process Payout
                  </button>
                  <button onClick={()=>updatePayout(p.id,"rejected")}
                    style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
                      borderRadius:8, padding:"6px 14px", cursor:"pointer",
                      fontSize:12, fontWeight:700, color:"#EF4444" }}>
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setSelected(null)}>
          <div style={{ background:"#0d1219", border:"1px solid rgba(255,255,255,.1)",
            borderRadius:20, padding:32, width:480 }}
            onClick={e=>e.stopPropagation()}>
            <h3 style={{ color:"#fff", marginBottom:20, fontSize:18, fontWeight:800 }}>
              Process Payout — {selected.username||selected.email}
            </h3>
            <div style={{ fontSize:22, fontWeight:900, color:"#22C55E", marginBottom:20,
              fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
              ${parseFloat(selected.trader_amount||0).toFixed(2)} {selected.currency||"USDT"}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)",
                textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>
                TX Hash (optional)
              </label>
              <input value={txHash} onChange={e=>setTxHash(e.target.value)}
                className="input" placeholder="Transaction hash after sending..."
                style={{ width:"100%" }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)",
                textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>
                Notes
              </label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                className="input" rows={3} style={{ width:"100%", resize:"vertical" }}
                placeholder="Internal notes..."/>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>updatePayout(selected.id,"paid")}
                className="btn btn-primary" style={{ flex:1, justifyContent:"center" }}>
                ✅ Mark as Paid
              </button>
              <button onClick={()=>updatePayout(selected.id,"approved")}
                style={{ flex:1, justifyContent:"center", background:"rgba(96,165,250,.12)",
                  border:"1px solid rgba(96,165,250,.3)", borderRadius:9, padding:"10px",
                  cursor:"pointer", fontSize:13, fontWeight:700, color:"#60a5fa" }}>
                ✓ Approve
              </button>
              <button onClick={()=>setSelected(null)} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
