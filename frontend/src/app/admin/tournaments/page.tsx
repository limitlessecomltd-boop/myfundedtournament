"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function AdminTournaments() {
  const [tours, setTours]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<string|null>(null);
  const [newName, setNewName] = useState("");
  const [confirm, setConfirm] = useState<{id:string,action:string}|null>(null);
  const [msg, setMsg] = useState("");

  const load = () => adminApi.getAll?.().catch(()=>[])
    .then(()=>fetch("https://myfundedtournament-production.up.railway.app/api/admin/tournaments",{
      headers:{Authorization:"Bearer "+localStorage.getItem("fc_token")}
    }).then(r=>r.json()).then(d=>{ setTours(d.data||[]); setLoading(false); }));

  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(()=>setMsg(""),3000); };

  async function doAction(id: string, action: string) {
    const T = localStorage.getItem("fc_token");
    const API = "https://myfundedtournament-production.up.railway.app";
    const h = {Authorization:"Bearer "+T,"Content-Type":"application/json"};
    if (action === "force-start") {
      await fetch(`${API}/api/admin/tournaments/${id}/force-start`,{method:"POST",headers:h});
      flash("✅ Battle force-started!");
    } else if (action === "force-end") {
      await fetch(`${API}/api/admin/tournaments/${id}/force-end`,{method:"POST",headers:h});
      flash("✅ Battle force-ended!");
    } else if (action === "delete") {
      await fetch(`${API}/api/admin/tournaments/${id}`,{method:"DELETE",headers:h});
      flash("✅ Battle deleted.");
    }
    setConfirm(null);
    load();
  }

  async function doRename(id: string) {
    const T = localStorage.getItem("fc_token");
    await fetch(`https://myfundedtournament-production.up.railway.app/api/admin/tournaments/${id}/rename`,{
      method:"PATCH", headers:{Authorization:"Bearer "+T,"Content-Type":"application/json"},
      body: JSON.stringify({name:newName})
    });
    setRenaming(null); setNewName(""); flash("✅ Renamed!"); load();
  }

  const live  = tours.filter(t => ["registration","active"].includes(t.status));
  const past  = tours.filter(t => ["ended","cancelled"].includes(t.status));

  const statusColor: Record<string,string> = {
    registration:"#FFD700", active:"#22C55E", ended:"rgba(255,255,255,.35)", cancelled:"#EF4444"
  };

  const TourRow = ({ t }: { t: any }) => (
    <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
      borderRadius:12, padding:"16px 20px", marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200 }}>
          {renaming === t.id ? (
            <div style={{ display:"flex", gap:8 }}>
              <input value={newName} onChange={e=>setNewName(e.target.value)}
                className="input" style={{ flex:1, fontSize:13, padding:"6px 10px" }}
                autoFocus onKeyDown={e=>e.key==="Enter"&&doRename(t.id)}/>
              <button onClick={()=>doRename(t.id)} className="btn btn-primary btn-sm">Save</button>
              <button onClick={()=>setRenaming(null)} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{t.name}</span>
              <button onClick={()=>{ setRenaming(t.id); setNewName(t.name); }}
                style={{ background:"none", border:"1px solid rgba(255,255,255,.12)",
                  borderRadius:5, padding:"2px 8px", cursor:"pointer",
                  fontSize:11, color:"rgba(255,255,255,.4)" }}>✏️</button>
            </div>
          )}
          <div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20,
              background:`${statusColor[t.status]||"#fff"}18`,
              border:`1px solid ${statusColor[t.status]||"#fff"}44`,
              color:statusColor[t.status]||"#fff", textTransform:"capitalize" }}>
              {t.status}
            </span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>{t.tier?.toUpperCase()}</span>
          </div>
        </div>

        {/* Stats */}
        {[
          ["Entry", `$${t.entry_fee}`],
          ["Pool", `$${parseFloat(t.prize_pool||0).toFixed(0)}`],
          ["Entries", `${t.active_entries||0}/${t.max_entries}`],
        ].map(([l,v]) => (
          <div key={l} style={{ textAlign:"center", minWidth:60 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>{v}</div>
          </div>
        ))}

        {/* Actions */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {t.status === "registration" && (
            <button onClick={()=>setConfirm({id:t.id,action:"force-start"})}
              style={{ background:"rgba(34,197,94,.12)", border:"1px solid rgba(34,197,94,.3)",
                borderRadius:8, padding:"6px 12px", cursor:"pointer",
                fontSize:12, fontWeight:700, color:"#22C55E" }}>
              ▶ Force Start
            </button>
          )}
          {t.status === "active" && (
            <button onClick={()=>setConfirm({id:t.id,action:"force-end"})}
              style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
                borderRadius:8, padding:"6px 12px", cursor:"pointer",
                fontSize:12, fontWeight:700, color:"#EF4444" }}>
              ⏹ Force End
            </button>
          )}
          <button onClick={()=>setConfirm({id:t.id,action:"delete"})}
            style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)",
              borderRadius:8, padding:"6px 12px", cursor:"pointer",
              fontSize:12, fontWeight:700, color:"#EF4444" }}>
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Entries preview */}
      {t.active_entries > 0 && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,.06)",
          fontSize:12, color:"rgba(255,255,255,.4)" }}>
          {t.active_entries} active entr{t.active_entries===1?"y":"ies"} ·{" "}
          Started: {t.start_time ? new Date(t.start_time).toLocaleString() : "TBD"}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding:"32px 36px", background:"#030508", minHeight:"100vh" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
          Battles
        </h1>
        <button onClick={load} style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)",
          borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13, color:"rgba(255,255,255,.6)" }}>
          🔄 Refresh
        </button>
      </div>

      {msg && (
        <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.3)",
          borderRadius:10, padding:"10px 16px", marginBottom:20, fontSize:14, color:"#22C55E" }}>
          {msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:999,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#0d1219", border:"1px solid rgba(255,255,255,.12)",
            borderRadius:16, padding:32, maxWidth:400, width:"100%" }}>
            <h3 style={{ color:"#fff", marginBottom:12 }}>
              Confirm {confirm.action.replace("-"," ")}?
            </h3>
            <p style={{ color:"rgba(255,255,255,.5)", fontSize:14, marginBottom:24 }}>
              This action cannot be undone.
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>doAction(confirm.id, confirm.action)}
                className="btn" style={{ background:"#EF4444", color:"#fff", flex:1, justifyContent:"center" }}>
                Confirm
              </button>
              <button onClick={()=>setConfirm(null)} className="btn btn-ghost" style={{ flex:1, justifyContent:"center" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="spinner"/> : (
        <>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:12 }}>
            Live & Upcoming ({live.length})
          </div>
          {live.length === 0 ? (
            <div style={{ color:"rgba(255,255,255,.3)", fontSize:14, marginBottom:32 }}>
              No active battles
            </div>
          ) : live.map(t => <TourRow key={t.id} t={t}/>)}

          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)",
            textTransform:"uppercase", letterSpacing:".08em", margin:"28px 0 12px" }}>
            Past Battles ({past.length})
          </div>
          {past.length === 0 ? (
            <div style={{ color:"rgba(255,255,255,.3)", fontSize:14 }}>No past battles yet</div>
          ) : past.map(t => <TourRow key={t.id} t={t}/>)}
        </>
      )}
    </div>
  );
}
