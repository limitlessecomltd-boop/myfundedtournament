"use client";
import { useEffect, useState } from "react";

const API = "https://myfundedtournament-production.up.railway.app";
const getToken = () => localStorage.getItem("fc_token") || "";
const authHeaders = () => ({ Authorization: "Bearer " + getToken(), "Content-Type": "application/json" });

// ── Create Battle Modal ───────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: ()=>void; onCreated: ()=>void }) {
  const [tier, setTier]         = useState("starter");
  const [duration, setDuration] = useState(90);
  const [delay, setDelay]       = useState(5);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const fee     = tier === "pro" ? 50 : 25;
  const pool    = fee * 25;
  const prize   = Math.floor(pool * 0.9);

  async function create() {
    setSaving(true); setErr("");
    try {
      const now      = new Date();
      const startTime = new Date(now.getTime() + delay * 60 * 1000);
      const endTime   = new Date(startTime.getTime() + duration * 60 * 1000);
      const name      = tier === "pro" ? "Pro Bullet" : "Starter Bullet";

      const r = await fetch(`${API}/api/admin/tournaments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          tier,
          entryFee: fee,
          maxEntries: 25,
          registrationOpen: now.toISOString(),
          startTime: startTime.toISOString(),
          endTime:   endTime.toISOString(),
          status: "registration",
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Failed");
      onCreated();
      onClose();
    } catch(e: any) {
      setErr(e.message);
      setSaving(false);
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:"#0d1219", border:"1px solid rgba(255,215,0,.2)",
        borderRadius:20, padding:32, width:480 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
          <h3 style={{ color:"#fff", fontSize:20, fontWeight:800, margin:0 }}>
            + Create New Battle
          </h3>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:"rgba(255,255,255,.4)", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        {/* Plan selector */}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)",
            textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:8 }}>
            Battle Type
          </label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { val:"starter", label:"Starter Bullet", fee:"$25", color:"#FFD700" },
              { val:"pro",     label:"Pro Bullet",     fee:"$50", color:"#22C55E" },
            ].map(p => (
              <button key={p.val} onClick={() => setTier(p.val)}
                style={{ padding:"14px", borderRadius:12, cursor:"pointer",
                  background: tier===p.val ? `${p.color}12` : "rgba(255,255,255,.03)",
                  border: tier===p.val ? `2px solid ${p.color}66` : "2px solid rgba(255,255,255,.07)",
                  textAlign:"center", transition:"all .15s" }}>
                <div style={{ fontSize:14, fontWeight:800, color: tier===p.val ? p.color : "rgba(255,255,255,.6)" }}>
                  {p.label}
                </div>
                <div style={{ fontSize:18, fontWeight:900, color: p.color, marginTop:4 }}>{p.fee} USDT</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>25 traders max</div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)",
              textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>
              Duration (min) — {duration} min
            </label>
            <input type="range" min={30} max={240} step={15} value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width:"100%", accentColor:"#FFD700" }}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10,
              color:"rgba(255,255,255,.3)", marginTop:3 }}>
              <span>30m</span><span>4h</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)",
              textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>
              Start Delay (min) — {delay} min
            </label>
            <input type="range" min={1} max={60} step={1} value={delay}
              onChange={e => setDelay(Number(e.target.value))}
              style={{ width:"100%", accentColor:"#FFD700" }}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10,
              color:"rgba(255,255,255,.3)", marginTop:3 }}>
              <span>1m</span><span>60m</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ background:"rgba(255,215,0,.05)", border:"1px solid rgba(255,215,0,.15)",
          borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              { l:"Prize Pool", v:`$${pool}` },
              { l:"1st Prize", v:`$${prize}` },
              { l:"Duration", v:`${duration}m` },
            ].map(r => (
              <div key={r.l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:3 }}>{r.l}</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#FFD700" }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>

        {err && (
          <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
            borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:13, color:"#EF4444" }}>
            {err}
          </div>
        )}

        <button onClick={create} disabled={saving}
          style={{ width:"100%", padding:"14px", borderRadius:11, cursor:"pointer",
            background: saving ? "rgba(255,255,255,.1)" : "#FFD700",
            color: saving ? "rgba(255,255,255,.4)" : "#000",
            fontWeight:900, fontSize:16, border:"none" }}>
          {saving ? "Creating..." : `⚡ Create ${tier === "pro" ? "Pro" : "Starter"} Battle`}
        </button>
      </div>
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────
function TourRow({ t, onRefresh }: { t: any; onRefresh: ()=>void }) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName]   = useState(t.name);
  const [confirm, setConfirm]   = useState("");
  const [msg, setMsg]           = useState("");

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const statusColor: Record<string,string> = {
    registration:"#FFD700", active:"#22C55E", ended:"rgba(255,255,255,.35)", cancelled:"#EF4444"
  };
  const isGuild = t.tier === "guild" || t.tier_type === "guild";

  async function doAction(action: string) {
    const h = authHeaders();
    if (action === "force-start") {
      await fetch(`${API}/api/admin/tournaments/${t.id}/force-start`, { method:"POST", headers:h });
      flash("✅ Force-started!");
    } else if (action === "force-end") {
      await fetch(`${API}/api/admin/tournaments/${t.id}/force-end`, { method:"POST", headers:h });
      flash("✅ Force-ended!");
    } else if (action === "delete") {
      await fetch(`${API}/api/admin/tournaments/${t.id}`, { method:"DELETE", headers:h });
      flash("✅ Deleted.");
    }
    setConfirm(""); onRefresh();
  }

  async function doRename() {
    await fetch(`${API}/api/admin/tournaments/${t.id}/rename`, {
      method:"PATCH", headers:authHeaders(), body:JSON.stringify({ name: newName })
    });
    setRenaming(false); flash("✅ Renamed!"); onRefresh();
  }

  return (
    <div style={{ background:"rgba(13,18,29,.95)",
      border:`1px solid ${isGuild ? "rgba(255,100,0,.25)" : "rgba(255,255,255,.07)"}`,
      borderRadius:12, padding:"16px 20px", marginBottom:8 }}>
      {msg && (
        <div style={{ fontSize:12, color:"#22C55E", marginBottom:8 }}>{msg}</div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        {/* Name + badges */}
        <div style={{ flex:1, minWidth:200 }}>
          {renaming ? (
            <div style={{ display:"flex", gap:8 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="input" style={{ flex:1, fontSize:13, padding:"6px 10px" }}
                autoFocus onKeyDown={e => e.key === "Enter" && doRename()}/>
              <button onClick={doRename} className="btn btn-primary btn-sm">Save</button>
              <button onClick={() => setRenaming(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{t.name}</span>
              <button onClick={() => { setRenaming(true); setNewName(t.name); }}
                style={{ background:"none", border:"1px solid rgba(255,255,255,.12)",
                  borderRadius:5, padding:"2px 7px", cursor:"pointer",
                  fontSize:11, color:"rgba(255,255,255,.4)" }}>✏️</button>
            </div>
          )}
          <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20,
              background:`${statusColor[t.status]||"#fff"}18`,
              border:`1px solid ${statusColor[t.status]||"#fff"}44`,
              color:statusColor[t.status]||"#fff", textTransform:"capitalize" }}>
              {t.status}
            </span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.35)",
              background:"rgba(255,255,255,.05)", borderRadius:20, padding:"2px 8px" }}>
              {isGuild ? "🔥 GUILD" : t.tier?.toUpperCase()}
            </span>
            {isGuild && t.organiser_username && (
              <span style={{ fontSize:11, color:"#FF6400" }}>by {t.organiser_username}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        {[
          ["Entry",   `$${t.entry_fee}`],
          ["Pool",    `$${parseFloat(t.prize_pool||0).toFixed(0)}`],
          ["Entries", `${t.active_entries||0}/${t.max_entries}`],
        ].map(([l,v]) => (
          <div key={l} style={{ textAlign:"center", minWidth:60 }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>{v}</div>
          </div>
        ))}

        {/* Actions */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {t.status === "registration" && (
            <button onClick={() => setConfirm("force-start")}
              style={{ background:"rgba(34,197,94,.12)", border:"1px solid rgba(34,197,94,.3)",
                borderRadius:8, padding:"6px 12px", cursor:"pointer",
                fontSize:12, fontWeight:700, color:"#22C55E" }}>
              ▶ Force Start
            </button>
          )}
          {t.status === "active" && (
            <button onClick={() => setConfirm("force-end")}
              style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
                borderRadius:8, padding:"6px 12px", cursor:"pointer",
                fontSize:12, fontWeight:700, color:"#EF4444" }}>
              ⏹ Force End
            </button>
          )}
          <button onClick={() => setConfirm("delete")}
            style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)",
              borderRadius:8, padding:"6px 12px", cursor:"pointer",
              fontSize:12, fontWeight:700, color:"#EF4444" }}>
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Entry timing */}
      {(t.active_entries||0) > 0 && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.05)",
          fontSize:12, color:"rgba(255,255,255,.35)" }}>
          {t.active_entries} active entr{t.active_entries===1?"y":"ies"} ·
          Started: {t.start_time ? new Date(t.start_time).toLocaleString() : "TBD"}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div style={{ marginTop:12, background:"rgba(239,68,68,.06)",
          border:"1px solid rgba(239,68,68,.2)", borderRadius:10, padding:"12px 16px",
          display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <span style={{ fontSize:13, color:"rgba(255,255,255,.7)" }}>
            Confirm: <strong style={{ color:"#EF4444" }}>{confirm.replace("-"," ")}</strong> this battle?
          </span>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => doAction(confirm)}
              style={{ background:"#EF4444", border:"none", borderRadius:7,
                padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight:700, color:"#fff" }}>
              Yes
            </button>
            <button onClick={() => setConfirm("")}
              style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)",
                borderRadius:7, padding:"6px 14px", cursor:"pointer",
                fontSize:13, color:"rgba(255,255,255,.6)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminTournaments() {
  const [tours,   setTours]   = useState<any[]>([]);
  const [guilds,  setGuilds]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab]   = useState<"standard"|"guild">("standard");

  const load = () => {
    setLoading(true);
    // Load standard tournaments
    fetch(`${API}/api/admin/tournaments`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const all = d.data || [];
        setTours(all.filter((t: any) => t.tier !== "guild" && t.tier_type !== "guild"));
        setGuilds(all.filter((t: any) => t.tier === "guild" || t.tier_type === "guild"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const standard = tours;
  const live  = standard.filter(t => ["registration","active"].includes(t.status));
  const past  = standard.filter(t => ["ended","cancelled"].includes(t.status));
  const guildLive = guilds.filter(t => ["registration","active"].includes(t.status));
  const guildPast = guilds.filter(t => ["ended","cancelled"].includes(t.status));

  return (
    <div className="adm-content-pad" style={{ background:"#030508", minHeight:"100vh" }}>
      <style>{`
        .adm-content-pad{padding:clamp(14px,2.5vw,32px) clamp(14px,3vw,36px);}
        .adm-kpi3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
        .adm-2col{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
        .adm-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
        .adm-table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .adm-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
        @media(max-width:768px){
          .adm-kpi3{grid-template-columns:1fr 1fr;gap:10px;}
          .adm-2col{grid-template-columns:1fr;}
          .adm-settings-grid{grid-template-columns:1fr;}
          .adm-header-row{flex-direction:column;align-items:flex-start;}
        }
        @media(max-width:480px){.adm-kpi3{grid-template-columns:1fr;}}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px", margin:0 }}>
          Battles
        </h1>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={load} style={{ background:"rgba(255,255,255,.06)",
            border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"9px 16px",
            cursor:"pointer", fontSize:13, color:"rgba(255,255,255,.6)" }}>
            🔄 Refresh
          </button>
          <button onClick={() => setShowCreate(true)}
            style={{ background:"#FFD700", border:"none", borderRadius:9,
              padding:"9px 20px", cursor:"pointer", fontSize:14,
              fontWeight:800, color:"#000" }}>
            + Create Battle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {[
          { key:"standard", label:`⚔️ Standard (${tours.length})` },
          { key:"guild",    label:`🔥 Guild (${guilds.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{ padding:"8px 20px", borderRadius:9, cursor:"pointer",
              fontSize:13, fontWeight: activeTab===tab.key ? 700 : 500,
              background: activeTab===tab.key
                ? tab.key==="guild" ? "rgba(255,100,0,.15)" : "rgba(255,215,0,.12)"
                : "rgba(255,255,255,.04)",
              border: activeTab===tab.key
                ? tab.key==="guild" ? "1px solid rgba(255,100,0,.4)" : "1px solid rgba(255,215,0,.3)"
                : "1px solid rgba(255,255,255,.08)",
              color: activeTab===tab.key
                ? tab.key==="guild" ? "#FF6400" : "#FFD700"
                : "rgba(255,255,255,.5)" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}>
          <div className="spinner"/>
        </div>
      ) : (
        <>
          {/* ── STANDARD TAB ── */}
          {activeTab === "standard" && (
            <>
              <SectionLabel label="Live & Upcoming" count={live.length}/>
              {live.length === 0 ? (
                <div style={{ color:"rgba(255,255,255,.3)", fontSize:14, marginBottom:28,
                  padding:"16px 20px", background:"rgba(255,255,255,.02)",
                  borderRadius:10, border:"1px dashed rgba(255,255,255,.07)" }}>
                  No active battles — click "+ Create Battle" to add one
                </div>
              ) : live.map(t => <TourRow key={t.id} t={t} onRefresh={load}/>)}

              <SectionLabel label="Past Battles" count={past.length} dim/>
              {past.length === 0 ? (
                <div style={{ color:"rgba(255,255,255,.25)", fontSize:13 }}>No past battles yet</div>
              ) : past.map(t => <TourRow key={t.id} t={t} onRefresh={load}/>)}
            </>
          )}

          {/* ── GUILD TAB ── */}
          {activeTab === "guild" && (
            <>
              {guilds.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 20px",
                  border:"1px dashed rgba(255,100,0,.2)", borderRadius:16 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🔥</div>
                  <div style={{ fontSize:15, color:"rgba(255,255,255,.4)", marginBottom:8 }}>
                    No Guild Battles yet
                  </div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.25)", marginBottom:20 }}>
                    Run Supabase migration first, then organisers can create battles
                  </div>
                  <a href="/admin/settings" style={{ fontSize:13, color:"#FF6400",
                    textDecoration:"none", border:"1px solid rgba(255,100,0,.3)",
                    borderRadius:8, padding:"7px 16px" }}>
                    View Migration SQL →
                  </a>
                </div>
              ) : (
                <>
                  <SectionLabel icon="🔥" label="Active Guild Battles" count={guildLive.length}/>
                  {guildLive.length === 0 ? (
                    <div style={{ color:"rgba(255,255,255,.3)", fontSize:13, marginBottom:24 }}>
                      No active guild battles
                    </div>
                  ) : guildLive.map(t => <TourRow key={t.id} t={t} onRefresh={load}/>)}

                  <SectionLabel label="Past Guild Battles" count={guildPast.length} dim/>
                  {guildPast.map(t => <TourRow key={t.id} t={t} onRefresh={load}/>)}
                </>
              )}
            </>
          )}
        </>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={load}/>
      )}
    </div>
  );
}

function SectionLabel({ icon, label, count, dim }: any) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, marginTop: dim ? 28 : 0 }}>
      {icon && <span style={{ fontSize:16 }}>{icon}</span>}
      <span style={{ fontSize:13, fontWeight:700,
        color: dim ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.6)",
        textTransform:"uppercase", letterSpacing:".08em" }}>
        {label}
      </span>
      <span style={{ fontSize:12, color:"rgba(255,255,255,.3)",
        background:"rgba(255,255,255,.06)", borderRadius:20, padding:"1px 8px" }}>
        {count}
      </span>
    </div>
  );
}
