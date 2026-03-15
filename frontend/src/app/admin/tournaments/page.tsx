"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

const PLANS = ["starter","pro"];
const STATUSES = ["upcoming","registration","active","ended","cancelled"];

const defaultForm = {
  name: "", plan: "starter", entryFee: "25", maxEntries: "25",
  durationMinutes: "90", autoStartMinutes: "5",
};

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string|null>(null);
  const [editStatus, setEditStatus] = useState<Record<string,string>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    adminApi.getTournaments().then(setTournaments).catch(console.error);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setCreating(true);
    try {
      // Convert timer-based inputs to actual dates
      const now = new Date();
      const regOpen = now.toISOString();
      // Start time = now + autoStartMinutes (after 25 entries in real scenario)
      const startMs = now.getTime() + parseInt(form.autoStartMinutes) * 60 * 1000;
      const startTime = new Date(startMs).toISOString();
      const endMs = startMs + parseInt(form.durationMinutes) * 60 * 1000;
      const endTime = new Date(endMs).toISOString();

      await adminApi.createTournament({
        name: form.name,
        tier: form.plan,
        entryFee: parseFloat(form.entryFee),
        maxEntries: parseInt(form.maxEntries),
        registrationOpen: regOpen,
        startTime,
        endTime,
      });
      setForm(defaultForm);
      setShowCreate(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create");
    } finally { setCreating(false); }
  }

  async function updateStatus(id: string, status: string) {
    try { await adminApi.updateTournament(id, { status }); await load(); }
    catch (err: any) { alert(err?.response?.data?.error || "Failed"); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will remove all entries. This cannot be undone.`)) return;
    setDeleting(id);
    try { await adminApi.deleteTournament(id); await load(); }
    catch (err: any) { alert(err?.response?.data?.error || "Failed to delete"); }
    finally { setDeleting(null); }
  }

  const planColor: Record<string,string> = { starter:"#FFD700", pro:"#22C55E" };
  const statusColor: Record<string,string> = { active:"#22C55E", registration:"#60a5fa", upcoming:"rgba(255,255,255,.4)", ended:"rgba(255,255,255,.3)", cancelled:"#EF4444" };

  const live = tournaments.filter(t => ["active","registration","upcoming"].includes(t.status));
  const past = tournaments.filter(t => ["ended","cancelled"].includes(t.status));

  function TournamentRow({ t }: { t: any }) {
    return (
      <div style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:160 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>{t.name}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20, background:`${planColor[t.tier]||"#FFD700"}18`, border:`1px solid ${planColor[t.tier]||"#FFD700"}44`, color:planColor[t.tier]||"#FFD700", textTransform:"capitalize" }}>{t.tier}</span>
            <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20, background:`${statusColor[t.status]||"#fff"}18`, border:`1px solid ${statusColor[t.status]||"#fff"}44`, color:statusColor[t.status]||"#fff", textTransform:"capitalize" }}>{t.status}</span>
          </div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:2 }}>Entry</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#FFD700" }}>${t.entry_fee}</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:2 }}>Pool</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#22C55E" }}>${Number(t.prize_pool).toLocaleString()}</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:2 }}>Entries</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{t.active_entries}/{t.max_entries}</div>
        </div>
        {/* Status selector */}
        <select className="input" style={{ fontSize:12, padding:"6px 10px", width:"auto", minWidth:120 }}
          value={editStatus[t.id]||t.status}
          onChange={e => { setEditStatus(s=>({...s,[t.id]:e.target.value})); updateStatus(t.id,e.target.value); }}>
          {STATUSES.map(s=><option key={s} value={s} style={{ textTransform:"capitalize" }}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        {/* Delete */}
        <button onClick={()=>handleDelete(t.id,t.name)} disabled={deleting===t.id}
          className="btn btn-danger btn-sm" style={{ background:"rgba(239,68,68,.12)", color:"#EF4444", border:"1px solid rgba(239,68,68,.25)", flexShrink:0 }}>
          {deleting===t.id ? "..." : "🗑 Delete"}
        </button>
      </div>
    );
  }

  return (
    <AdminLayout title="Tournaments">
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:24 }}>
        <button onClick={()=>setShowCreate(s=>!s)} className="btn btn-primary">
          {showCreate ? "Cancel" : "+ Create Battle"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div style={{ background:"rgba(34,197,94,.04)", border:"1px solid rgba(34,197,94,.2)", borderRadius:16, padding:28, marginBottom:28 }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#fff", marginBottom:6, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>Create New Battle</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:24 }}>
            Set the timer durations only — no confusing date pickers. Battle starts automatically when 25 entries fill up.
          </div>
          <form onSubmit={handleCreate} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {/* Name */}
            <div style={{ gridColumn:"1/-1" }}>
              <label className="input-label">Battle Name</label>
              <input className="input" placeholder="e.g. Starter Bullet #12" value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
            </div>

            {/* Plan */}
            <div>
              <label className="input-label">Plan</label>
              <select className="input" value={form.plan}
                onChange={e=>{
                  const plan = e.target.value;
                  setForm(f=>({...f, plan, entryFee: plan==="starter"?"25":"50", maxEntries:"25" }));
                }}>
                <option value="starter">Starter Bullet — $25 USDT</option>
                <option value="pro">Pro Bullet — $50 USDT</option>
              </select>
            </div>

            {/* Max entries - fixed at 25 */}
            <div>
              <label className="input-label">Max Entries (Battle starts when full)</label>
              <input className="input" type="number" min="5" max="100" value={form.maxEntries}
                onChange={e=>setForm(f=>({...f,maxEntries:e.target.value}))}/>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>
                ✅ Recommended: 25 entries for both plans
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="input-label">⏱ Battle Duration (minutes)</label>
              <input className="input" type="number" min="10" max="480" value={form.durationMinutes}
                onChange={e=>setForm(f=>({...f,durationMinutes:e.target.value}))}/>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>
                ✅ Recommended: 90 minutes
              </div>
            </div>

            {/* Auto-start delay */}
            <div>
              <label className="input-label">🚀 Start Delay After Full (minutes)</label>
              <input className="input" type="number" min="1" max="60" value={form.autoStartMinutes}
                onChange={e=>setForm(f=>({...f,autoStartMinutes:e.target.value}))}/>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>
                ✅ Recommended: 5 minutes (gives traders time to prep)
              </div>
            </div>

            {/* Summary box */}
            <div style={{ gridColumn:"1/-1", background:"rgba(255,215,0,.05)", border:"1px solid rgba(255,215,0,.15)", borderRadius:10, padding:"14px 16px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#FFD700", marginBottom:8 }}>📋 Battle Summary</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {[
                  ["Plan", form.plan==="starter"?"Starter Bullet":"Pro Bullet"],
                  ["Entry Fee", `$${form.entryFee} USDT`],
                  ["Max Traders", form.maxEntries],
                  ["Prize Pool", `$${(parseFloat(form.entryFee)*parseInt(form.maxEntries||"0")||0).toLocaleString()}`],
                  ["Duration", `${form.durationMinutes} min`],
                  ["Start Delay", `${form.autoStartMinutes} min after full`],
                  ["1st Prize (90%)", `$${Math.floor(parseFloat(form.entryFee)*parseInt(form.maxEntries||"0")*0.9)}`],
                  ["2nd Prize", `$${parseFloat(form.entryFee)*4} (4× fee)`],
                ].map(([l,v])=>(
                  <div key={l}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ gridColumn:"1/-1", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#EF4444" }}>
                {error}
              </div>
            )}
            <div style={{ gridColumn:"1/-1", display:"flex", gap:10 }}>
              <button type="submit" disabled={creating} className="btn btn-primary btn-lg">
                {creating ? "Creating..." : "🚀 Create Battle"}
              </button>
              <button type="button" onClick={()=>setShowCreate(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Live / Active Battles */}
      <div style={{ marginBottom:36 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <span className="live-dot"/>
          <span style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Live & Upcoming Battles</span>
          <span style={{ fontSize:13, color:"rgba(255,255,255,.3)" }}>({live.length})</span>
        </div>
        {live.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,.3)", fontSize:14, border:"1px dashed rgba(255,255,255,.08)", borderRadius:12 }}>
            No active battles. Create one above ↑
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {live.map(t => <TournamentRow key={t.id} t={t}/>)}
          </div>
        )}
      </div>

      {/* Past Battles */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <span style={{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,.6)" }}>Past Battles</span>
          <span style={{ fontSize:13, color:"rgba(255,255,255,.3)" }}>({past.length})</span>
        </div>
        {past.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,.3)", fontSize:14 }}>No past battles yet.</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {past.map(t => <TournamentRow key={t.id} t={t}/>)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
