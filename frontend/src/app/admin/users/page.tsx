"use client";
import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";

export default function AdminUsers() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [selected,setSelected]= useState<any>(null);
  const [msg,     setMsg]     = useState("");
  const [page,    setPage]    = useState(0);
  const PER = 50;

  const load = useCallback((s=search, p=page) => {
    setLoading(true);
    adminApi.getUsers(s||undefined, PER, p*PER)
      .then((d:any) => { setUsers(d.data||[]); setTotal(d.total||0); })
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(()=>setMsg(""),3000); };

  async function updateUser(id: string, data: any) {
    await adminApi.updateUser(id, data);
    flash("✅ User updated");
    setSelected(null);
    load();
  }

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
            fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
            Users
          </h1>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>
            {total} total users
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&load(search,0)}
            placeholder="Search email or username..."
            className="input" style={{ width:260, fontSize:13 }}/>
          <button onClick={()=>load(search,0)} className="btn btn-primary btn-sm">Search</button>
        </div>
      </div>

      {msg && (
        <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.3)",
          borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#22C55E" }}>
          {msg}
        </div>
      )}

      {/* Table */}
      <div className="adm-table-scroll">
      <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
        borderRadius:14, overflow:"hidden", minWidth:580 }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 100px",
          padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.06)",
          fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em",
          color:"rgba(255,255,255,.3)" }}>
          {["User","Joined","Entries","Spent","Funded","Actions"].map(h=>(
            <div key={h}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:40, display:"flex", justifyContent:"center" }}>
            <div className="spinner"/>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:14 }}>
            No users found
          </div>
        ) : users.map(u => (
          <div key={u.id} style={{ display:"grid",
            gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 100px",
            padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,.04)",
            alignItems:"center", transition:"background .1s" }}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.02)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:"50%",
                  background:`hsl(${u.email.charCodeAt(0)*7%360},50%,30%)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:800, color:"#fff", flexShrink:0 }}>
                  {(u.username||u.email)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>
                    {u.username || "—"}
                    {u.is_admin && <span style={{ marginLeft:6, fontSize:10, color:"#FFD700",
                      background:"rgba(255,215,0,.1)", border:"1px solid rgba(255,215,0,.2)",
                      borderRadius:20, padding:"1px 6px" }}>ADMIN</span>}
                    {u.is_banned && <span style={{ marginLeft:6, fontSize:10, color:"#EF4444",
                      background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)",
                      borderRadius:20, padding:"1px 6px" }}>BANNED</span>}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{u.email}</div>
                </div>
              </div>
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>
              {new Date(u.created_at).toLocaleDateString()}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:"#60a5fa" }}>
              {u.total_entries||0}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:"#22C55E" }}>
              ${parseFloat(u.total_spent||0).toFixed(2)}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:"#a78bfa" }}>
              {u.funded_accounts||0}
            </div>
            <div>
              <button onClick={()=>setSelected(u)}
                style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)",
                  borderRadius:7, padding:"5px 12px", cursor:"pointer",
                  fontSize:12, color:"rgba(255,255,255,.6)" }}>
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>
      </div>{/* end adm-table-scroll */}

      {/* Pagination */}
      {total > PER && (
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:20 }}>
          <button onClick={()=>{ setPage(p=>Math.max(0,p-1)); load(search,Math.max(0,page-1)); }}
            disabled={page===0} className="btn btn-ghost btn-sm">← Prev</button>
          <span style={{ fontSize:13, color:"rgba(255,255,255,.4)", padding:"6px 12px" }}>
            Page {page+1} of {Math.ceil(total/PER)}
          </span>
          <button onClick={()=>{ setPage(p=>p+1); load(search,page+1); }}
            disabled={(page+1)*PER>=total} className="btn btn-ghost btn-sm">Next →</button>
        </div>
      )}

      {/* User detail modal */}
      {selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setSelected(null)}>
          <div style={{ background:"#0d1219", border:"1px solid rgba(255,255,255,.1)",
            borderRadius:20, padding:32, width:460, maxHeight:"80vh", overflowY:"auto" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ color:"#fff", fontSize:18, fontWeight:800 }}>
                {selected.username || selected.email}
              </h3>
              <button onClick={()=>setSelected(null)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,.4)",
                  fontSize:22, cursor:"pointer" }}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {[
                ["Email", selected.email],
                ["Username", selected.username||"—"],
                ["Total Entries", selected.total_entries||0],
                ["Total Spent", `$${parseFloat(selected.total_spent||0).toFixed(2)}`],
                ["Funded Accounts", selected.funded_accounts||0],
                ["Last Entry", selected.last_entry_at ? new Date(selected.last_entry_at).toLocaleDateString() : "Never"],
                ["Joined", new Date(selected.created_at).toLocaleDateString()],
                ["Admin", selected.is_admin ? "Yes" : "No"],
              ].map(([l,v]) => (
                <div key={l as string} style={{ background:"rgba(255,255,255,.03)",
                  borderRadius:8, padding:"8px 12px" }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,.8)" }}>{String(v)}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)",
              textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Actions</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={()=>updateUser(selected.id,{is_admin:!selected.is_admin})}
                style={{ padding:"10px 16px", borderRadius:9, cursor:"pointer",
                  background: selected.is_admin ? "rgba(239,68,68,.1)" : "rgba(255,215,0,.1)",
                  border: selected.is_admin ? "1px solid rgba(239,68,68,.3)" : "1px solid rgba(255,215,0,.3)",
                  color: selected.is_admin ? "#EF4444" : "#FFD700",
                  fontSize:13, fontWeight:700 }}>
                {selected.is_admin ? "⬇️ Remove Admin" : "⬆️ Promote to Admin"}
              </button>
              <button onClick={()=>updateUser(selected.id,{is_banned:!selected.is_banned})}
                style={{ padding:"10px 16px", borderRadius:9, cursor:"pointer",
                  background: selected.is_banned ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
                  border: selected.is_banned ? "1px solid rgba(34,197,94,.3)" : "1px solid rgba(239,68,68,.3)",
                  color: selected.is_banned ? "#22C55E" : "#EF4444",
                  fontSize:13, fontWeight:700 }}>
                {selected.is_banned ? "✅ Unban User" : "🚫 Ban User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
