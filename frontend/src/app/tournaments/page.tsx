"use client";

// Strip ugly timestamp suffix from auto-generated tournament names
// e.g. "Pro Bullet #1773578962970" -> "Pro Bullet"
function cleanTournamentName(name: string): string {
  return name?.replace(/ #\d{10,}$/, '') || name;
}

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

      <div className="t-card-stats">
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
            <div style={{ fontSize:22, fontWeight:800, color:"#fff", marginTop:8 }}>{cleanTournamentName(t.name)}</div>
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
        <div style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.8)", marginBottom:5 }}>{cleanTournamentName(t.name)}</div>
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
      <style>{`
        .t-wrap{max-width:1100px;margin:0 auto;padding:40px 24px;}
        .t-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:40px;flex-wrap:wrap;gap:16px;}
        .t-card-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
        .t-guild-promo{display:flex;gap:32px;align-items:center;flex-wrap:wrap;padding:32px 36px;justify-content:center;}
        .t-guild-features{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:24px;}
        @media(max-width:768px){
          .t-wrap{padding:20px 16px;}
          .t-header{margin-bottom:24px;}
          .t-card-stats{grid-template-columns:1fr 1fr;}
          .t-guild-promo{flex-direction:column;gap:20px;padding:20px 16px;}
          .t-guild-features{gap:12px;}
        }
        @media(max-width:480px){
          .t-wrap{padding:16px 12px;}
          .t-card-stats{grid-template-columns:1fr 1fr;}
        }
      `}</style>
      <div className="t-wrap">

        {/* Header */}
        <div className="t-header">
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

        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}>
            <div className="spinner"/>
          </div>
        ) : (
          <>
            {/* Empty state — no battles at all */}
            {registration.length === 0 && active.length === 0 && past.length === 0 && (
              <div style={{ textAlign:"center", padding:"80px 20px",
                border:"1px dashed rgba(255,255,255,.08)", borderRadius:20, marginBottom:48 }}>
                <div style={{ fontSize:56, marginBottom:16 }}>⚔️</div>
                <h3 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
                  fontSize:24, fontWeight:900, color:"#fff", marginBottom:10 }}>
                  No Active Battles
                </h3>
                <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:420, margin:"0 auto 24px" }}>
                  New battles start every hour. Register now and you'll be first in line when the next one opens.
                </p>
                <a href="mailto:limitlessecomltd@gmail.com?subject=Notify me when battles open"
                  style={{ display:"inline-flex", alignItems:"center", gap:8,
                    background:"rgba(255,215,0,.12)", border:"1px solid rgba(255,215,0,.3)",
                    borderRadius:10, padding:"10px 22px", textDecoration:"none",
                    fontSize:14, fontWeight:700, color:"#FFD700" }}>
                  🔔 Notify Me When Battles Open
                </a>
              </div>
            )}

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

            {/* ── RUN YOUR OWN BATTLE — Promo Section ── */}
            <div className="t-guild-promo" style={{ marginBottom:48, background:"linear-gradient(135deg,rgba(255,100,0,.07) 0%,rgba(255,215,0,.04) 100%)",
              border:"1px solid rgba(255,100,0,.25)", borderRadius:20,
              position:"relative", overflow:"hidden" }}>
              {/* Background glow */}
              <div style={{ position:"absolute", right:-40, top:-40, width:220, height:220,
                background:"radial-gradient(circle,rgba(255,100,0,.15) 0%,transparent 70%)", pointerEvents:"none" }}/>

              {/* Left — text */}
              <div style={{ flex:1, minWidth:240, maxWidth:520, position:"relative", zIndex:1 }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:"rgba(255,100,0,.12)", border:"1px solid rgba(255,100,0,.3)",
                  borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700,
                  color:"#FF6400", marginBottom:12 }}>
                  🔥 Guild Battle Program
                </div>
                <h3 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
                  fontSize:22, fontWeight:900, color:"#fff", marginBottom:8, letterSpacing:"-0.5px" }}>
                  Run Your Own Battle — Earn as Organiser
                </h3>
                <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7, marginBottom:18, maxWidth:440 }}>
                  Have a trading community? Set your own entry fee, player count and winner %.
                  You collect your organiser share automatically when the battle ends.
                  <strong style={{ color:"rgba(255,255,255,.75)" }}> No upfront cost.</strong>
                </p>
                <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
                  {[
                    { icon:"⚙️", text:"Custom rules" },
                    { icon:"🔗", text:"Your own link" },
                    { icon:"💰", text:"Earn automatically" },
                    { icon:"🏛", text:"Flat 10% platform fee" },
                  ].map(f => (
                    <div key={f.text} style={{ display:"flex", alignItems:"center", gap:6,
                      fontSize:13, color:"rgba(255,255,255,.5)" }}>
                      <span>{f.icon}</span>{f.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — example + CTA */}
              <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center",
                flexShrink:0, position:"relative", zIndex:1 }}>
                {/* Quick example */}
                <div style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,100,0,.2)",
                  borderRadius:14, padding:"14px 18px", minWidth:200 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,100,0,.6)",
                    letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Example</div>
                  {[
                    { l:"50 traders × $20", v:"$1,000 pool", c:"rgba(255,255,255,.6)" },
                    { l:"🥇 Winner (80%)", v:"$800", c:"#FFD700" },
                    { l:"🏆 You (10%)", v:"$100", c:"#FF6400" },
                    { l:"🏛 Platform", v:"$100", c:"rgba(255,255,255,.3)" },
                  ].map(r => (
                    <div key={r.l} style={{ display:"flex", justifyContent:"space-between",
                      gap:16, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,.05)",
                      fontSize:12 }}>
                      <span style={{ color:"rgba(255,255,255,.45)" }}>{r.l}</span>
                      <span style={{ fontWeight:800, color:r.c }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff",
                    fontWeight:800, fontSize:14, padding:"11px 22px", border:"none" }}>
                    🔥 Create Guild Battle
                  </Link>
                  <Link href="/earn" className="btn btn-ghost" style={{ fontSize:13, padding:"11px 18px",
                    borderColor:"rgba(255,100,0,.3)", color:"rgba(255,100,0,.8)" }}>
                    Learn More →
                  </Link>
                </div>
              </div>
            </div>

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
