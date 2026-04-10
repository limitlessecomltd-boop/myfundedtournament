"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { guildApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const fmt = (n: number, d=2) => parseFloat((n||0).toFixed(d)).toLocaleString("en", {minimumFractionDigits:d,maximumFractionDigits:d});

export default function MyGuildBattlesPage() {
  const { user } = useAuth();
  const [battles, setBattles]   = useState<any[]>([]);
  const [summary, setSummary]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [copied,  setCopied]    = useState<string|null>(null);

  useEffect(() => {
    if (!user) return;
    guildApi.getMine()
      .then((res: any) => {
        setBattles(Array.isArray(res) ? res : res.data || []);
        if (res.summary) setSummary(res.summary);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/tournaments/${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusColor: Record<string,string> = {
    registration:"#FFD700", active:"#22C55E", ended:"rgba(255,255,255,.3)", cancelled:"#EF4444"
  };

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <style>{`
        .mine-wrap{max-width:940px;margin:0 auto;padding:40px 24px;}
        .comm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:32px;}
        .comm-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:20px;}
        .comm-card.accent{border-color:rgba(255,100,0,.3);background:rgba(255,100,0,.04);}
        .battle-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,100,0,.18);border-radius:16px;padding:22px 24px;margin-bottom:12px;transition:border-color .2s;}
        .battle-card:hover{border-color:rgba(255,100,0,.4);}
        @media(max-width:900px){.comm-grid{grid-template-columns:1fr 1fr;}}
        @media(max-width:768px){.mine-wrap{padding:20px 16px;}.comm-grid{grid-template-columns:1fr 1fr;gap:10px;}}
        @media(max-width:480px){.mine-wrap{padding:16px 12px;}.comm-grid{grid-template-columns:1fr 1fr;}}
      `}</style>

      <div className="mine-wrap">
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,100,0,.7)", marginBottom:8 }}>🔥 Guild Master</div>
            <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
              My Guild Battles
            </h1>
          </div>
          <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff", fontWeight:800 }}>
            + Create New Battle
          </Link>
        </div>

        {/* Commission Summary Cards */}
        {summary && (
          <div className="comm-grid">
            <div className="comm-card accent">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,100,0,.6)", marginBottom:8 }}>Total Earned</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:900, color:"#FF6400", lineHeight:1, letterSpacing:"-1px" }}>
                ${fmt(parseFloat(summary.total_earned || 0))}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>USDT · from completed battles</div>
            </div>
            <div className="comm-card">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,215,0,.5)", marginBottom:8 }}>Pending Earnings</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:900, color:"#FFD700", lineHeight:1, letterSpacing:"-1px" }}>
                ${fmt(parseFloat(summary.pending_earnings || 0))}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>from active/filling battles</div>
            </div>
            <div className="comm-card">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(96,165,250,.5)", marginBottom:8 }}>Total Battles</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:900, color:"#60a5fa", lineHeight:1 }}>
                {summary.total_battles || 0}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>{summary.completed_battles || 0} completed · {summary.active_battles || 0} active</div>
            </div>
            <div className="comm-card">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(34,197,94,.5)", marginBottom:8 }}>Prize Volume</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:900, color:"#22C55E", lineHeight:1, letterSpacing:"-1px" }}>
                ${fmt(parseFloat(summary.total_prize_volume || 0), 0)}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>total prize pool generated</div>
            </div>
          </div>
        )}

        {/* Battle List */}
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}><div className="spinner"/></div>
        ) : battles.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", border:"1px dashed rgba(255,100,0,.2)", borderRadius:16 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔥</div>
            <div style={{ fontSize:16, color:"rgba(255,255,255,.5)", marginBottom:20 }}>No Guild Battles yet</div>
            <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff", fontWeight:700 }}>
              Create Your First Battle →
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.25)", marginBottom:16 }}>
              Battle History & Commissions
            </div>
            {battles.map(b => {
              const pool       = parseFloat(b.prize_pool || 0);
              const orgPct     = parseFloat(b.organiser_pct || 0);
              const commission = parseFloat(b.commission_earned || (pool * orgPct / 100) || 0);
              const entries    = parseInt(b.active_entries || 0);
              const isPaid     = b.status === "ended";
              const isPending  = b.status !== "ended" && commission > 0;

              return (
                <div key={b.id} className="battle-card">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20,
                          background:`${statusColor[b.status]||"#fff"}18`, border:`1px solid ${statusColor[b.status]||"#fff"}40`,
                          color:statusColor[b.status]||"#fff", textTransform:"capitalize" }}>{b.status}</span>
                        <span style={{ fontSize:10, color:"rgba(255,100,0,.6)", fontWeight:700 }}>🔥 Guild</span>
                      </div>
                      <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.name}</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
                        {entries}/{b.max_entries} traders · ${b.entry_fee} entry · ${fmt(pool,0)} prize pool
                      </div>
                    </div>

                    {/* Commission box */}
                    <div style={{ background: isPaid ? "rgba(34,197,94,.06)" : "rgba(255,100,0,.06)",
                      border: `1px solid ${isPaid?"rgba(34,197,94,.2)":"rgba(255,100,0,.2)"}`,
                      borderRadius:10, padding:"12px 16px", textAlign:"right", minWidth:130 }}>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
                        color: isPaid?"rgba(34,197,94,.6)":"rgba(255,100,0,.6)", marginBottom:4 }}>
                        {isPaid ? "✅ Commission Paid" : isPending ? "⏳ Pending" : "Projected"}
                      </div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:900,
                        color: isPaid ? "#22C55E" : "#FF6400", lineHeight:1, letterSpacing:"-.5px" }}>
                        ${fmt(commission)}
                      </div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:3 }}>
                        {orgPct}% of ${fmt(pool,0)} pool
                      </div>
                    </div>
                  </div>

                  {/* Fill progress for open battles */}
                  {b.status === "registration" && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.3)", marginBottom:4 }}>
                        <span>{entries}/{b.max_entries} spots filled</span>
                        <span style={{ color:"#FF6400" }}>{b.max_entries - entries} left</span>
                      </div>
                      <div style={{ height:4, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:2, background:"#FF6400", transition:"width .3s",
                          width:`${Math.min(100,(entries/b.max_entries)*100)}%` }}/>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ marginTop:14, display:"flex", gap:8, flexWrap:"wrap" }}>
                    <Link href={`/tournaments/${b.id}`} className="btn btn-ghost btn-sm">View Battle →</Link>
                    <button onClick={() => copyLink(b.id)} className="btn btn-ghost btn-sm"
                      style={{ color:"#FF6400", borderColor:"rgba(255,100,0,.3)" }}>
                      {copied === b.id ? "✓ Copied!" : "📋 Copy Link"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
