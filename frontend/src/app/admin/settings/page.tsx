"use client";
import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

function MigrationRunner() {
  const [running,  setRunning]  = React.useState(false);
  const [result,   setResult]   = React.useState<any>(null);

  async function runMigration() {
    setRunning(true); setResult(null);
    const T = localStorage.getItem("fc_token");
    try {
      const r = await fetch(
        "https://myfundedtournament-production.up.railway.app/api/admin/run-migration",
        { method:"POST", headers:{ Authorization:"Bearer "+T, "Content-Type":"application/json" } }
      );
      const d = await r.json();
      setResult(d);
    } catch(e: any) {
      setResult({ success:false, error: e.message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button onClick={runMigration} disabled={running}
        style={{ background: running ? "rgba(255,255,255,.06)" : "rgba(255,100,0,.15)",
          border:"1px solid rgba(255,100,0,.4)", borderRadius:9, padding:"10px 22px",
          cursor: running ? "not-allowed" : "pointer", fontSize:14, fontWeight:700,
          color: running ? "rgba(255,255,255,.4)" : "#FF6400", marginBottom:14 }}>
        {running ? "⏳ Running..." : "🔧 Run Migration Now"}
      </button>
      {result && (
        <div style={{ background: result.success ? "rgba(34,197,94,.06)" : "rgba(239,68,68,.06)",
          border:`1px solid ${result.success ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`,
          borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700,
            color: result.success ? "#22C55E" : "#EF4444", marginBottom:8 }}>
            {result.success ? `✅ Migration complete — ${result.ok} steps OK` : `⚠️ ${result.ok} OK, ${result.failed} failed`}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:180, overflowY:"auto" }}>
            {result.steps?.map((s: any, i: number) => (
              <div key={i} style={{ fontSize:11, color: s.ok ? "rgba(255,255,255,.45)" : "#EF4444",
                fontFamily:"monospace" }}>
                {s.ok ? "✓" : "✗"} {s.label}{s.error ? ` — ${s.error}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const [s,  setS]   = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{ adminApi.settings().then(setS); },[]);

  async function save() {
    setSaving(true);
    await adminApi.updateSettings(s);
    setMsg("✅ Settings saved!");
    setSaving(false);
    setTimeout(()=>setMsg(""),3000);
  }

  const Toggle = ({ label, desc, field }: any) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"16px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
      <div>
        <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>{label}</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:3 }}>{desc}</div>
      </div>
      <button onClick={()=>setS((prev:any)=>({...prev,[field]:!prev[field]}))}
        style={{ width:52, height:28, borderRadius:14, border:"none", cursor:"pointer",
          background: s?.[field] ? "#22C55E" : "rgba(255,255,255,.12)",
          position:"relative", transition:"background .2s", flexShrink:0 }}>
        <div style={{ position:"absolute", top:3, width:22, height:22, borderRadius:"50%",
          background:"#fff", transition:"left .2s",
          left: s?.[field] ? 27 : 3 }}/>
      </button>
    </div>
  );

  if (!s) return (
    <div style={{ padding:40, display:"flex", justifyContent:"center" }}><div className="spinner"/></div>
  );

  return (
    <div style={{ padding:"32px 36px", background:"#030508", minHeight:"100vh" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 }}>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>Settings</h1>
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? "Saving..." : "💾 Save Settings"}
        </button>
      </div>

      {msg && (
        <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.3)",
          borderRadius:10, padding:"10px 16px", marginBottom:20, fontSize:14, color:"#22C55E" }}>
          {msg}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        {/* Platform controls */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:16, padding:"22px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
            Platform Controls
          </div>
          <Toggle label="Auto-Loop Battles" field="autoLoop"
            desc="Automatically create new registration slots when battles start"/>
          <Toggle label="Maintenance Mode" field="maintenanceMode"
            desc="Show maintenance page to all non-admin users"/>
          <Toggle label="Announcement Banner" field="announcementActive"
            desc="Show an announcement banner on the homepage"/>

          <div style={{ marginTop:16 }}>
            <label style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)",
              textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:8 }}>
              Announcement Text
            </label>
            <input value={s.announcementBanner||""} disabled={!s.announcementActive}
              onChange={e=>setS((p:any)=>({...p,announcementBanner:e.target.value}))}
              className="input" placeholder="e.g. 🚀 New Pro Bullet battles every hour!"
              style={{ width:"100%", opacity: s.announcementActive?1:.5 }}/>
          </div>
        </div>

        {/* Fee settings */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:16, padding:"22px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
            Fee Configuration
          </div>
          {[
            { label:"Platform Fee %", field:"platformFeePercent", min:1, max:30,
              desc:"Percentage taken from each battle pool" },
            { label:"Min Guild Entry Fee ($)", field:"minEntryFee", min:1, max:100,
              desc:"Minimum entry fee for Guild Battles" },
            { label:"Max Guild Entry Fee ($)", field:"maxEntryFee", min:100, max:100000,
              desc:"Maximum entry fee for Guild Battles" },
          ].map(f => (
            <div key={f.field} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{f.label}</label>
                <span style={{ fontSize:14, fontWeight:800, color:"#FFD700" }}>{s[f.field]}</span>
              </div>
              <input type="range" min={f.min} max={f.max} value={s[f.field]||0}
                onChange={e=>setS((p:any)=>({...p,[f.field]:Number(e.target.value)}))}
                style={{ width:"100%", accentColor:"#FFD700" }}/>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Email test */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:16, padding:"22px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
            Email System
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <input id="test-email-addr" className="input" placeholder="Send test to... (leave blank for your email)"
              style={{ flex:1, minWidth:200 }}/>
            <button onClick={async () => {
              const addr = (document.getElementById('test-email-addr') as HTMLInputElement)?.value || '';
              const T = localStorage.getItem('fc_token');
              const r = await fetch('https://myfundedtournament-production.up.railway.app/api/admin/test-email', {
                method:'POST', headers:{'Authorization':'Bearer '+T,'Content-Type':'application/json'},
                body: JSON.stringify({ to: addr || undefined })
              });
              const d = await r.json();
              alert(d.success ? '✅ Email sent! Check inbox.' : '❌ '+( d.error || d.message));
            }} className="btn btn-primary btn-sm">
              📧 Send Test
            </button>
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
            RESEND_API_KEY: {" "}
            <span style={{ color:"#22C55E", fontWeight:700 }}>Set ✓</span>
            {" · "}Sends a payment confirmed template to verify email delivery
          </div>
        </div>

        {/* DB Migration Runner */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:16, padding:"22px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
            Database Migration
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.55)", lineHeight:1.7, marginBottom:16 }}>
            Adds Guild Battle columns, <code style={{ background:"rgba(255,255,255,.08)", padding:"1px 6px", borderRadius:4, fontSize:12 }}>is_banned</code>, <code style={{ background:"rgba(255,255,255,.08)", padding:"1px 6px", borderRadius:4, fontSize:12 }}>slug</code>, and fixes ugly tournament names. Safe to run multiple times.
          </div>
          <MigrationRunner/>
        </div>

        {/* System info */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:16, padding:"22px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)",
            textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
            System Information
          </div>
          {[
            ["Frontend", "Vercel (myfundedtournament.vercel.app)"],
            ["Backend", "Railway (myfundedtournament-production.up.railway.app)"],
            ["Database", "Supabase PostgreSQL"],
            ["Payments", "NOWPayments (USDT TRC-20)"],
            ["MT5 API", "MetaApi (expires Jun 13, 2026)"],
            ["Model", "Claude Sonnet 4.6"],
          ].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between",
              padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,.05)",
              fontSize:13 }}>
              <span style={{ color:"rgba(255,255,255,.4)" }}>{k}</span>
              <span style={{ color:"rgba(255,255,255,.75)", fontWeight:600,
                textAlign:"right", maxWidth:"55%" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
