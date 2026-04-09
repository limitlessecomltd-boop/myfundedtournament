"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

const TABS = ["all","waiting","confirmed","expired","failed"];

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = (t=tab) => {
    setLoading(true);
    adminApi.getPayments(t==="all"?undefined:t)
      .then(setPayments).finally(()=>setLoading(false));
  };

  useEffect(()=>{ load(); },[]);

  const flash = (m:string)=>{ setMsg(m); setTimeout(()=>setMsg(""),3000); };

  async function confirmPayment(id: string) {
    await adminApi.confirmPayment(id);
    flash("✅ Payment confirmed & entry activated!");
    load();
  }

  const statusColor: Record<string,string> = {
    confirmed:"#22C55E", waiting:"#FFD700", expired:"#EF4444",
    failed:"#EF4444", pending:"#FFD700"
  };

  const total    = payments.filter(p=>p.status==="confirmed").reduce((s:number,p:any)=>s+parseFloat(p.amount_usd||0),0);
  const pending  = payments.filter(p=>p.status==="waiting").length;
  const expired  = payments.filter(p=>["expired","failed"].includes(p.status)).length;

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

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
            fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>Payments</h1>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>
            ForumPay transaction monitor
          </div>
        </div>
        <button onClick={()=>load()} style={{ background:"rgba(255,255,255,.06)",
          border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"8px 14px",
          cursor:"pointer", fontSize:13, color:"rgba(255,255,255,.6)" }}>
          🔄 Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="adm-kpi3">
        {[
          { label:"Confirmed Revenue", value:`$${total.toFixed(2)}`, color:"#22C55E", icon:"✅" },
          { label:"Pending Payments", value:pending, color:"#FFD700", icon:"⏳" },
          { label:"Expired / Failed", value:expired, color:"#EF4444", icon:"❌" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(13,18,29,.95)",
            border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"16px 20px",
            display:"flex", alignItems:"center", gap:14 }}>
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

      {msg && (
        <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.3)",
          borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#22C55E" }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>{ setTab(t); load(t); }}
            style={{ padding:"7px 16px", borderRadius:8, cursor:"pointer", fontSize:13,
              fontWeight: tab===t?700:500, textTransform:"capitalize",
              background: tab===t?"rgba(255,215,0,.12)":"rgba(255,255,255,.04)",
              border: tab===t?"1px solid rgba(255,215,0,.3)":"1px solid rgba(255,255,255,.08)",
              color: tab===t?"#FFD700":"rgba(255,255,255,.5)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
        borderRadius:14, overflow:"hidden" }}>
        <div style={{ display:"grid",
          gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 120px",
          padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.06)",
          fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em",
          color:"rgba(255,255,255,.3)" }}>
          {["User","Tournament","Amount","Status","Date","Action"].map(h=><div key={h}>{h}</div>)}
        </div>

        {loading ? (
          <div style={{ padding:40, display:"flex", justifyContent:"center" }}><div className="spinner"/></div>
        ) : payments.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:14 }}>
            No payments found
          </div>
        ) : payments.map((p:any) => (
          <div key={p.id} style={{ display:"grid",
            gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 120px",
            padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,.04)",
            alignItems:"center" }}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.02)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{p.username||"—"}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{p.email}</div>
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.5)",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {p.tournament_name||"—"}
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:"#22C55E" }}>
              ${parseFloat(p.amount_usd||0).toFixed(2)}
            </div>
            <div>
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20,
                background:`${statusColor[p.status]||"#fff"}18`,
                border:`1px solid ${statusColor[p.status]||"#fff"}44`,
                color:statusColor[p.status]||"#fff" }}>
                {p.status}
              </span>
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>
              {new Date(p.created_at).toLocaleDateString()}
            </div>
            <div>
              {p.status === "waiting" && (
                <button onClick={()=>confirmPayment(p.id)}
                  style={{ background:"rgba(34,197,94,.12)", border:"1px solid rgba(34,197,94,.3)",
                    borderRadius:7, padding:"5px 10px", cursor:"pointer",
                    fontSize:11, fontWeight:700, color:"#22C55E", whiteSpace:"nowrap" }}>
                  ✓ Confirm
                </button>
              )}
              {p.nowpayments_id && (
                <a href={`https://sandbox.dashboard.forumpay.com/pay/userPaymentGateway.transactions`}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize:11, color:"rgba(255,255,255,.35)", textDecoration:"none",
                    marginLeft:8 }}>
                  {p.nowpayments_id.slice(0,12)}… ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
