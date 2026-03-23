"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tournamentApi, guildApi } from "@/lib/api";
import { Tournament } from "@/types";
import { BulletTrain } from "@/components/ui/BulletTrain";

function PlanBadge({ tier, tierType }: { tier: string; tierType?: string }) {
  if (tierType === "guild") return (
    <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20,
      background:"rgba(255,100,0,.15)", border:"1px solid rgba(255,100,0,.4)", color:"#FF6400" }}>
      🔥 Guild Battle
    </span>
  );
  const color = tier === "pro" ? "#22C55E" : "#FFD700";
  const name  = tier === "pro" ? "Pro Bullet" : "Starter Bullet";
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20,
      background:`${color}18`, border:`1px solid ${color}44`, color }}>
      {name}
    </span>
  );
}

function cleanName(name: string): string {
  // Fix ugly timestamp names like "Starter Bullet #1773578962970"
  return name.replace(/#\d{10,}$/, (match) => {
    // If it's clearly a timestamp (13 digits), replace with nothing and let backend fix
    return match;
  });
}

// ── Registration card ─────────────────────────────────────────────────────────
function RegistrationCard({ t }: { t: Tournament & { tier_type?: string; organiser_username?: string; winner_pct?: number; slug?: string } }) {
  const filled  = parseInt(String(t.active_entries)) || 0;
  const max     = t.max_entries;
  const isGuild = t.tier_type === "guild";
  const color   = isGuild ? "#FF6400" : t.tier === "pro" ? "#22C55E" : "#FFD700";
  const link    = t.slug ? `/battle/${t.slug}` : `/tournaments/${t.id}`;

  return (
    <div style={{ background:"rgba(13,18,29,.95)", border:`1px solid ${color}44`,
      borderRadius:18, padding:24, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
        background:`linear-gradient(90deg,${color}88,transparent)` }}/>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <PlanBadge tier={t.tier} tierType={t.tier_type}/>
        <div style={{ fontSize:11, fontWeight:700, color, background:`${color}12`,
          border:`1px solid ${color}33`, borderRadius:20, padding:"2px 10px" }}>
          OPEN FOR ENTRY
        </div>
      </div>

      <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:4,
        fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
        {isGuild ? t.name : t.tier === "pro" ? "Pro Bullet" : "Starter Bullet"}
      </div>

      {isGuild && t.organiser_username && (
        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:4 }}>
          by <strong style={{ color:"#FF6400" }}>{t.organiser_username}</strong>
          {" · "}{t.winner_pct}% to winner
        </div>
      )}

      <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:16, fontStyle:"italic" }}>
        Are you good enough to beat only {max} traders?
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        {[
          ["Entry Fee", `$${t.entry_fee} USDT`],
          ["Max Traders", String(max)],
          ["Demo Balance", "$1,000"],
        ].map(([l,v]) => (
          <div key={l} style={{ background:"rgba(255,255,255,.03)", borderRadius:10,
            padding:"9px 12px", border:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:3,
              textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{v}</div>
          </div>
        ))}
      </div>

      <BulletTrain joined={filled} max={max} fee={Number(t.entry_fee)} tier={isGuild ? "starter" : t.tier as "starter"|"pro"}/>

      <div style={{ marginTop:14 }}>
        <Link href={link} className="btn" style={{ width:"100%", justifyContent:"center",
          display:"flex", background:color, color: isGuild ? "#fff" : "#000",
          fontWeight:800, fontSize:15, padding:"13px" }}>
          Grab Your Spot →
        </Link>
        {t.slug && (
          <div style={{ textAlign:"center", marginTop:8, fontSize:11, color:"rgba(255,255,255,.3)" }}>
            🔗 myfundedtournament.vercel.app/battle/{t.slug}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Live card ─────────────────────────────────────────────────────────────────
function LiveCard({ t }: { t: Tournament & { tier_type?: string; organiser_username?: string; winner_pct?: number; slug?: string } }) {
  const [secs, setSecs] = useState(0);
  const isGuild = t.tier_type === "guild";
  const color   = isGuild ? "#FF6400" : t.tier === "pro" ? "#22C55E" : "#FFD700";
  const link    = t.slug ? `/battle/${t.slug}` : `/tournaments/${t.id}`;

  useEffect(() => {
    const end = new Date(t.end_time).getTime();
    const update = () => setSecs(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    update(); const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [t.end_time]);

  const m = Math.floor(secs / 60), s = secs % 60;
  const warn = secs <= 3 * 60 && secs > 0;

  return (
    <div style={{ background:"rgba(13,18,29,.95)", border:`2px solid ${color}66`,
      borderRadius:18, padding:24, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:4,
        background:`linear-gradient(90deg,${color},${color}88)` }}/>

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <PlanBadge tier={t.tier} tierType={t.tier_type}/>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:800, color:"#22C55E" }}>
          <span className="live-dot"/>LIVE
        </div>
      </div>

      <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:14,
        fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
        {isGuild ? t.name : t.tier === "pro" ? "Pro Bullet" : "Starter Bullet"}
      </div>

      <div style={{ textAlign:"center", padding:"14px", marginBottom:14,
        background: warn ? "rgba(239,68,68,.08)" : "rgba(255,255,255,.03)",
        borderRadius:12, border:`1px solid ${warn?"rgba(239,68,68,.3)":"rgba(255,255,255,.06)"}` }}>
        <div style={{ fontSize:36, fontWeight:900, color: warn?"#EF4444":color,
          fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", letterSpacing:"-2px" }}>
          {String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:4 }}>
          {warn ? "⚠️ CLOSE ALL TRADES NOW" : "minutes remaining"}
        </div>
      </div>

      <Link href={link} className="btn" style={{ width:"100%", justifyContent:"center",
        display:"flex", background:`${color}22`, color, border:`1px solid ${color}44`,
        fontWeight:700, fontSize:14, padding:"12px" }}>
        ⚔️ Watch Live →
      </Link>
    </div>
  );
}

// ── Past modal ────────────────────────────────────────────────────────────────
function PastModal({ t, onClose }: { t: any; onClose: ()=>void }) {
  const pool = Number(t.prize_pool || 0);
  const wPct = t.winner_pct || 90;
  const oPct = t.organiser_pct || 0;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:"#0d1219", border:"1px solid rgba(255,255,255,.1)",
        borderRadius:20, padding:32, maxWidth:580, width:"100%", maxHeight:"80vh", overflowY:"auto" }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <PlanBadge tier={t.tier} tierType={t.tier_type}/>
            <div style={{ fontSize:22, fontWeight:800, color:"#fff", marginTop:8 }}>{t.name}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.38)", marginTop:4 }}>
              {t.active_entries} traders · ${t.entry_fee} entry · ${pool.toLocaleString()} pool
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:"rgba(255,255,255,.4)", fontSize:24, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase",
            color:"rgba(255,255,255,.3)", marginBottom:12, letterSpacing:".08em" }}>Winners</div>
          {[
            { medal:"🥇", label:"1st Place — Funded Account", val:`$${Math.floor(pool*wPct/100)}`, color:"#FFD700" },
            ...(oPct > 0 ? [{ medal:"🏆", label:`Organiser (${oPct}%)`, val:`$${Math.floor(pool*oPct/100)}`, color:"#FF6400" }] : []),
            { medal:"🏛️", label:"Platform (10%)", val:`$${Math.floor(pool*0.1)}`, color:"rgba(255,255,255,.3)" },
          ].map(w => (
            <div key={w.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
              background:"rgba(255,255,255,.03)", borderRadius:10, marginBottom:8 }}>
              <span style={{ fontSize:20 }}>{w.medal}</span>
              <span style={{ fontSize:13, color:"rgba(255,255,255,.55)", flex:1 }}>{w.label}</span>
              <span style={{ fontSize:15, fontWeight:800, color:w.color }}>{w.val}</span>
            </div>
          ))}
        </div>
        <Link href={`/tournaments/${t.id}`} className="btn btn-ghost"
          style={{ width:"100%", justifyContent:"center", display:"flex" }}>
          View Full Results →
        </Link>
      </div>
    </div>
  );
}

function PastCard({ t, onClick }: { t: Tournament & { tier_type?: string }; onClick: ()=>void }) {
  return (
    <div onClick={onClick} style={{ background:"rgba(13,18,29,.7)",
      border:"1px solid rgba(255,255,255,.07)", borderRadius:14,
      padding:"16px 20px", cursor:"pointer", display:"flex",
      alignItems:"center", gap:16, flexWrap:"wrap", transition:"all .15s" }}
      onMouseEnter={e=>{(e.currentTarget as any).style.borderColor="rgba(255,255,255,.18)";}}
      onMouseLeave={e=>{(e.currentTarget as any).style.borderColor="rgba(255,255,255,.07)";}}>
      <div style={{ fontSize:28 }}>📊</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.8)", marginBottom:5 }}>{t.name}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <PlanBadge tier={t.tier} tierType={t.tier_type}/>
          <span style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
            {t.active_entries} traders · ${t.entry_fee} entry
          </span>
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#FFD700" }}>
          ${Number(t.prize_pool||0).toLocaleString()}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>prize pool</div>
      </div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>View →</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TournamentsPage() {
  const [all,      setAll]      = useState<Tournament[]>([]);
  const [guilds,   setGuilds]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const load = () => {
    tournamentApi.getAll("all")
      .then(data => { setAll(data); setLoading(false); })
      .catch(() => setLoading(false));
    guildApi.getAll().then(setGuilds).catch(() => {});
  };

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, []);

  const registration = all.filter(t => t.status === "registration" && (t as any).tier_type !== "guild");
  const active       = all.filter(t => t.status === "active");
  const past         = all.filter(t => ["ended","cancelled"].includes(t.status));

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end",
          marginBottom:40, flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em",
              textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:10 }}>
              90-Minute Trading Battles
            </div>
            <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
              fontSize:34, fontWeight:900, color:"#fff", letterSpacing:"-1.5px" }}>
              Live Battles & Results
            </h1>
          </div>
          <Link href="/earn" className="btn" style={{ background:"rgba(255,100,0,.12)",
            border:"1px solid rgba(255,100,0,.35)", color:"#FF6400", fontWeight:700 }}>
            🔥 Run Your Own Battle →
          </Link>
        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}>
            <div className="spinner"/>
          </div>
        ) : (
          <>
            {/* ── OPEN FOR REGISTRATION ── */}
            {registration.length > 0 && (
              <div style={{ marginBottom:48 }}>
                <SectionHeader icon="🟡" label="Open for Registration" badge="Grab your spot!" badgeColor="#FFD700"/>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,320px),1fr))", gap:20 }}>
                  {registration.map(t => <RegistrationCard key={t.id} t={t as any}/>)}
                </div>
              </div>
            )}

            {/* ── LIVE BATTLES ── */}
            {active.length > 0 && (
              <div style={{ marginBottom:48 }}>
                <SectionHeader dot label="Live Battles" badge={`${active.length} in progress`} badgeColor="#22C55E"/>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,320px),1fr))", gap:20 }}>
                  {active.map(t => <LiveCard key={t.id} t={t as any}/>)}
                </div>
              </div>
            )}

            {/* Empty state */}
            {registration.length === 0 && active.length === 0 && guilds.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 0",
                border:"1px dashed rgba(255,255,255,.08)", borderRadius:16, marginBottom:48 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
                <div style={{ fontSize:16, fontWeight:600, color:"rgba(255,255,255,.5)", marginBottom:6 }}>
                  No battles right now
                </div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.3)" }}>
                  New registration opens automatically. Check back soon!
                </div>
              </div>
            )}

            {/* ── GUILD BATTLES ── */}
            {guilds.length > 0 && (
              <div style={{ marginBottom:48 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  marginBottom:20, flexWrap:"wrap", gap:12 }}>
                  <SectionHeader icon="🔥" label="Guild Battles" badge="Community organised" badgeColor="#FF6400"/>
                  <Link href="/earn" style={{ fontSize:13, color:"#FF6400", textDecoration:"none",
                    fontWeight:700, padding:"5px 14px", border:"1px solid rgba(255,100,0,.3)",
                    borderRadius:8, background:"rgba(255,100,0,.06)" }}>
                    + Create Guild Battle
                  </Link>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,320px),1fr))", gap:16 }}>
                  {guilds.map(g => <RegistrationCard key={g.id} t={g}/>)}
                </div>
              </div>
            )}

            {/* ── PAST BATTLES ── */}
            {past.length > 0 && (
              <div>
                <SectionHeader icon="📊" label="Past Battles" count={past.length} dimmed/>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {past.map(t => <PastCard key={t.id} t={t as any} onClick={()=>setSelected(t)}/>)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {selected && <PastModal t={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}

function SectionHeader({ icon, dot, label, badge, badgeColor, count, dimmed }: any) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
      {dot ? <span className="live-dot"/> : icon ? <span style={{ fontSize:18 }}>{icon}</span> : null}
      <span style={{ fontSize:18, fontWeight:800,
        color: dimmed ? "rgba(255,255,255,.5)" : "#fff",
        fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
        {label}
      </span>
      {badge && (
        <span style={{ fontSize:13, background:`${badgeColor}12`,
          border:`1px solid ${badgeColor}33`, borderRadius:20,
          padding:"2px 10px", color:badgeColor }}>
          {badge}
        </span>
      )}
      {count !== undefined && (
        <span style={{ fontSize:13, color:"rgba(255,255,255,.3)",
          background:"rgba(255,255,255,.05)", borderRadius:20, padding:"2px 10px" }}>
          {count}
        </span>
      )}
    </div>
  );
}
