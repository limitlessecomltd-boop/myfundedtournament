"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { guildApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function MyGuildBattlesPage() {
  const { user } = useAuth();
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    guildApi.getMine().then(setBattles).finally(() => setLoading(false));
  }, [user]);

  const statusColor: Record<string,string> = {
    registration:"#FFD700", active:"#22C55E", ended:"rgba(255,255,255,.3)", cancelled:"#EF4444"
  };

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:900, margin:"0 auto", padding:"40px 24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32, flexWrap:"wrap", gap:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
              color:"rgba(255,100,0,.7)", marginBottom:8 }}>🔥 Guild Master</div>
            <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
              fontSize:30, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
              My Guild Battles
            </h1>
          </div>
          <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff", fontWeight:800 }}>
            + Create New Battle
          </Link>
        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}>
            <div className="spinner"/>
          </div>
        ) : battles.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", border:"1px dashed rgba(255,100,0,.2)",
            borderRadius:16 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔥</div>
            <div style={{ fontSize:16, color:"rgba(255,255,255,.5)", marginBottom:20 }}>
              You haven't created any Guild Battles yet
            </div>
            <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff", fontWeight:700 }}>
              Create Your First Battle →
            </Link>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {battles.map(b => {
              const pool    = parseFloat(b.prize_pool || 0);
              const orgPct  = parseFloat(b.organiser_pct || 0);
              const orgAmt  = b.organiser_payout_amount ? parseFloat(b.organiser_payout_amount) : Math.floor(pool * orgPct / 100);
              const entries = parseInt(b.active_entries || 0);
              return (
                <div key={b.id} style={{ background:"rgba(13,18,29,.95)",
                  border:"1px solid rgba(255,100,0,.2)", borderRadius:16, padding:"20px 24px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                    flexWrap:"wrap", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20,
                          background:`${statusColor[b.status]||"#fff"}18`,
                          border:`1px solid ${statusColor[b.status]||"#fff"}44`,
                          color:statusColor[b.status]||"#fff", textTransform:"capitalize" }}>
                          {b.status}
                        </span>
                        <span style={{ fontSize:11, color:"rgba(255,100,0,.7)", fontWeight:700 }}>🔥 Guild Battle</span>
                      </div>
                      <div style={{ fontSize:18, fontWeight:800, color:"#fff", marginBottom:4 }}>{b.name}</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>
                        {entries} / {b.max_entries} traders · ${b.entry_fee} entry · ${pool.toLocaleString()} pool
                      </div>
                    </div>

                    {/* Earnings */}
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, color:"rgba(255,100,0,.6)", marginBottom:3 }}>Your share ({b.organiser_pct}%)</div>
                      <div style={{ fontSize:22, fontWeight:900, color:"#FF6400",
                        fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                        ${orgAmt.toLocaleString()}
                      </div>
                      <div style={{ fontSize:11, color: b.status==="ended" ? "#22C55E" : "rgba(255,255,255,.3)", marginTop:3 }}>
                        {b.status === "ended" ? (b.organiser_paid ? "✅ Paid" : "⏳ Pending payout") : "Projected"}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {b.status === "registration" && (
                    <div style={{ marginTop:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:5 }}>
                        <span>{entries} / {b.max_entries} spots filled</span>
                        <span style={{ color:"#FF6400" }}>{b.max_entries - entries} left</span>
                      </div>
                      <div style={{ height:5, background:"rgba(255,255,255,.07)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:3, background:"#FF6400",
                          width:`${Math.min(100,(entries/b.max_entries)*100)}%` }}/>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop:14, display:"flex", gap:10 }}>
                    <Link href={`/tournaments/${b.id}`} className="btn btn-ghost btn-sm">
                      View Battle →
                    </Link>
                    <button onClick={() => {
                      const url = `${window.location.origin}/tournaments/${b.id}`;
                      navigator.clipboard.writeText(url);
                    }} className="btn btn-ghost btn-sm" style={{ color:"#FF6400", borderColor:"rgba(255,100,0,.3)" }}>
                      📋 Copy Link
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
