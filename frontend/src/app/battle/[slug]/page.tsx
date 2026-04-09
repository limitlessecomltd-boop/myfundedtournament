"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { guildApi, leaderboardApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function BattleSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [battle, setBattle]       = useState<any>(null);
  const [traders, setTraders]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  useEffect(() => {
    // Fetch by slug
    fetch(`https://myfundedtournament-production.up.railway.app/api/guild/slug/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setNotFound(true); setLoading(false); return; }
        setBattle(d.data);
        setLoading(false);
        // Fetch leaderboard if active
        if (d.data.status === "active" || d.data.status === "ended") {
          leaderboardApi.get(d.data.id, 100).then(setTraders).catch(() => {});
        }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  // Auto-refresh leaderboard every 60s when active
  useEffect(() => {
    if (!battle || battle.status !== "active") return;
    const iv = setInterval(() => {
      leaderboardApi.get(battle.id, 100).then(setTraders).catch(() => {});
    }, 60000);
    return () => clearInterval(iv);
  }, [battle]);

  if (loading) return (
    <div style={{ background:"#050810", minHeight:"100vh", display:"flex",
      alignItems:"center", justifyContent:"center" }}>
      <div className="spinner"/>
    </div>
  );

  if (notFound) return (
    <div style={{ background:"#050810", minHeight:"100vh", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🔍</div>
      <h2 style={{ color:"#fff", fontSize:24, fontWeight:800, marginBottom:12 }}>Battle Not Found</h2>
      <p style={{ color:"rgba(255,255,255,.45)", marginBottom:28 }}>
        The battle "{slug}" doesn't exist or has expired.
      </p>
      <Link href="/tournaments" className="btn btn-primary">Browse All Battles →</Link>
    </div>
  );

  const pool     = Number(battle.prize_pool || 0);
  const filled   = parseInt(battle.active_entries || 0);
  const fillPct  = Math.min(100, Math.round((filled / battle.max_entries) * 100));
  const isActive = battle.status === "active";
  const isReg    = battle.status === "registration";

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <style>{`
        .battle-wrap{max-width:1100px;margin:0 auto;padding:36px 24px;}
        .battle-layout{display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start;}
        .battle-stats3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
        .battle-leaderboard{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        @media(max-width:768px){
          .battle-wrap{padding:20px 16px;}
          .battle-layout{flex-direction:column;gap:20px;}
          .battle-stats3{grid-template-columns:1fr 1fr;}
        }
        @media(max-width:480px){.battle-wrap{padding:16px 12px;}}
      `}</style>
      <div className="battle-wrap">
        <div className="battle-layout">

          {/* ── LEFT: Battle Info ── */}
          <div style={{ flex:"1 1 520px" }}>
            {/* Guild Battle badge */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:20,
                background:"rgba(255,100,0,.15)", border:"1px solid rgba(255,100,0,.4)", color:"#FF6400" }}>
                🔥 Guild Battle
              </span>
              <span style={{ fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:20,
                background: isActive ? "rgba(34,197,94,.12)" : isReg ? "rgba(255,215,0,.1)" : "rgba(255,255,255,.06)",
                border: isActive ? "1px solid rgba(34,197,94,.3)" : "1px solid rgba(255,255,255,.1)",
                color: isActive ? "#22C55E" : isReg ? "#FFD700" : "rgba(255,255,255,.5)",
                textTransform:"capitalize" }}>
                {isReg ? "Open for Registration" : battle.status}
              </span>
            </div>

            <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
              fontSize:32, fontWeight:900, color:"#fff", letterSpacing:"-1px", marginBottom:10 }}>
              {battle.name}
            </h1>

            {/* Shareable link */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20,
              background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)",
              borderRadius:10, padding:"8px 14px" }}>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>🔗</span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontFamily:"monospace", flex:1 }}>
                {typeof window!=="undefined" ? window.location.href : ""}
              </span>
              <button onClick={() => navigator.clipboard.writeText(window.location.href)}
                style={{ background:"none", border:"1px solid rgba(255,255,255,.15)", borderRadius:6,
                  padding:"3px 10px", color:"rgba(255,255,255,.5)", fontSize:11, cursor:"pointer" }}>
                Copy
              </button>
            </div>

            {/* Stats grid */}
            <div className="battle-stats3">
              {[
                ["Entry Fee", `$${battle.entry_fee} USDT`, "#FF6400"],
                ["Prize Pool", `$${pool.toLocaleString()}`, "#FFD700"],
                ["Demo Balance", "$1,000", "#fff"],
                ["Max Traders", battle.max_entries, "#fff"],
                ["Joined", filled, "#FF6400"],
                ["Winner Gets", `${battle.winner_pct || 90}%`, "#22C55E"],
              ].map(([l,v,c]) => (
                <div key={String(l)} style={{ background:"rgba(13,18,29,.9)",
                  border:"1px solid rgba(255,255,255,.07)", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:4,
                    textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:String(c) }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Fill bar */}
            {isReg && (
              <div style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,100,0,.2)",
                borderRadius:14, padding:"16px 20px", marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12,
                  color:"rgba(255,255,255,.4)", marginBottom:8 }}>
                  <span>{filled} / {battle.max_entries} spots filled</span>
                  <span style={{ color:"#FF6400", fontWeight:700 }}>{battle.max_entries - filled} left</span>
                </div>
                <div style={{ height:8, background:"rgba(255,255,255,.07)", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:4,
                    background:"linear-gradient(90deg,#FF6400,#FFD700)",
                    width:`${fillPct}%`, transition:"width .5s" }}/>
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:8 }}>
                  ⚡ Battle auto-starts when all {battle.max_entries} spots fill · 90 min
                </div>
              </div>
            )}

            {/* Payout breakdown */}
            <div style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,255,255,.07)",
              borderRadius:14, padding:"16px 20px", marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:".08em", color:"rgba(255,255,255,.3)", marginBottom:12 }}>Payout Breakdown</div>
              {[
                { label:"🥇 Winner", pct:battle.winner_pct||90, color:"#FFD700" },
                ...(battle.organiser_pct > 0 ? [{ label:"🏆 Organiser", pct:battle.organiser_pct, color:"#FF6400" }] : []),
                { label:"🏛 Platform", pct:battle.platform_pct||10, color:"rgba(255,255,255,.3)" },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between",
                  padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>{r.label}</span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:14, fontWeight:800, color:r.color }}>{r.pct}%</span>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginLeft:6 }}>
                      ${Math.floor(pool * r.pct / 100).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Organiser card */}
            <div style={{ background:"rgba(255,100,0,.04)", border:"1px solid rgba(255,100,0,.2)",
              borderRadius:14, padding:"16px 20px" }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:".08em", color:"rgba(255,100,0,.6)", marginBottom:12 }}>Organised by</div>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(255,100,0,.2)",
                  border:"2px solid rgba(255,100,0,.4)", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:18, fontWeight:900, color:"#FF6400", flexShrink:0 }}>
                  {(battle.organiser_username||"?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>
                    {battle.organiser_username || "Anonymous"}
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>
                    {battle.organiser_total_hosted || 1} battle{(battle.organiser_total_hosted||1)!==1?"s":""} hosted
                  </div>
                  {battle.organiser_bio && (
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", marginTop:6, lineHeight:1.5 }}>
                      {battle.organiser_bio}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Traders List + Join ── */}
          <div style={{ width:300, flexShrink:0 }}>

            {/* Join panel */}
            <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,100,0,.35)",
              borderRadius:16, padding:"20px", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:16 }}>
                {isActive ? "Battle is Live!" : "Join This Battle"}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
                {[["Entry fee",`$${battle.entry_fee} USDT`],["Demo balance","$1,000"],["Duration","90 Minutes"]].map(([l,v])=>(
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ color:"rgba(255,255,255,.38)" }}>{l}</span>
                    <span style={{ color:"rgba(255,255,255,.85)", fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
              {!user ? (
                <Link href="/login" className="btn" style={{ width:"100%", justifyContent:"center",
                  display:"flex", background:"#FF6400", color:"#fff", fontWeight:800 }}>
                  Login to Join →
                </Link>
              ) : isReg ? (
                <Link href={`/tournaments/${battle.id}`} className="btn"
                  style={{ width:"100%", justifyContent:"center", display:"flex",
                    background:"#FF6400", color:"#fff", fontWeight:800, fontSize:15, padding:"13px" }}>
                  Grab Your Spot →
                </Link>
              ) : isActive ? (
                <Link href={`/tournaments/${battle.id}`} className="btn"
                  style={{ width:"100%", justifyContent:"center", display:"flex",
                    background:"rgba(255,100,0,.15)", color:"#FF6400",
                    border:"1px solid rgba(255,100,0,.4)", fontWeight:700 }}>
                  ⚔️ Watch Live →
                </Link>
              ) : (
                <div style={{ textAlign:"center", fontSize:13, color:"rgba(255,255,255,.4)",
                  padding:"12px", background:"rgba(255,255,255,.03)", borderRadius:8 }}>
                  Battle has ended
                </div>
              )}
            </div>

            {/* Traders/competitors list */}
            <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
              borderRadius:16, padding:"18px" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", marginBottom:14 }}>
                {isActive ? "⚔️ Live Rankings" : "👥 Competitors"} ({filled})
              </div>

              {traders.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:400, overflowY:"auto" }}>
                  {traders.map((t: any, i: number) => (
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"8px 10px", background:"rgba(255,255,255,.03)",
                      borderRadius:9, border:"1px solid rgba(255,255,255,.05)" }}>
                      <span style={{ fontSize:14, width:24, textAlign:"center", flexShrink:0,
                        color: i===0?"#FFD700":i===1?"#b4c0d8":i===2?"#CD7F32":"rgba(255,255,255,.4)" }}>
                        {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                      </span>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.7)", flex:1,
                        fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {t.display_name || t.username || `Trader #${i+1}`}
                      </span>
                      {isActive && (
                        <span style={{ fontSize:13, fontWeight:800,
                          color: Number(t.profit_pct)>=0?"#22C55E":"#EF4444", flexShrink:0 }}>
                          {Number(t.profit_pct)>=0?"+":""}{Number(t.profit_pct).toFixed(2)}%
                        </span>
                      )}
                      {!isActive && (
                        <span style={{ fontSize:10, color:"#22C55E", background:"rgba(34,197,94,.1)",
                          border:"1px solid rgba(34,197,94,.2)", borderRadius:20,
                          padding:"1px 7px", flexShrink:0 }}>Ready</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : filled > 0 ? (
                <div style={{ textAlign:"center", padding:"20px 0", color:"rgba(255,255,255,.35)",
                  fontSize:13 }}>Loading competitors...</div>
              ) : (
                <div style={{ textAlign:"center", padding:"24px 0" }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>⏳</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>
                    No traders yet — be the first!
                  </div>
                </div>
              )}

              {isActive && (
                <div style={{ marginTop:12, fontSize:11, color:"rgba(255,255,255,.25)",
                  textAlign:"center" }}>Updates every 60 seconds</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
