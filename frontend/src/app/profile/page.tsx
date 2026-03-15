"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { userApi } from "@/lib/api";

const NAV = [
  { id:"overview",  label:"Overview",         icon:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { id:"active",    label:"Active Tournaments",icon:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { id:"history",   label:"History",           icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id:"payouts",      label:"Payouts",        icon:"M12 8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" },
  { id:"certificates", label:"Certificates",  icon:"M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  { id:"settings",     label:"Settings",      icon:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

function Icon({ d, size=18, stroke="#fff", opacity=1 }:{ d:string,size?:number,stroke?:string,opacity?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
      <path d={d}/>
    </svg>
  );
}

function StatCard({ label, value, sub, color="#fff", accent="#FFD700" }:any) {
  return (
    <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
      borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
        background:`linear-gradient(90deg,${accent},${accent}88)` }}/>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase",
        color:"rgba(255,255,255,.35)", marginBottom:10 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:900, color, letterSpacing:"-1px", lineHeight:1,
        fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>{sub}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tLoading, setTLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setWalletAddress(user.wallet_address || "");
      setTLoading(true);
      userApi.getMyTournaments().then(setTournaments).catch(()=>{}).finally(()=>setTLoading(false));
    }
  }, [user]);

  async function saveSettings() {
    setSaving(true);
    try {
      await userApi.update({ username, wallet_address: walletAddress });
      await refresh();
      setSaved(true);
      setTimeout(()=>setSaved(false), 2500);
    } catch(e:any) { alert(e?.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  }

  if (loading || !user) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
      <div className="spinner"/>
    </div>
  );

  const active   = tournaments.filter(t => t.status === "active");
  const ended    = tournaments.filter(t => t.status === "ended");
  const wins     = tournaments.filter(t => t.is_winner).length;
  const totalPnl = tournaments.reduce((s,t)=>s+Number(t.best_profit_pct||0),0);
  const initials = (user.username||user.email||"?")[0].toUpperCase();

  const statusColor = (s:string) => s==="active"?"#22C55E":s==="ended"?"rgba(255,255,255,.4)":"rgba(255,215,0,.8)";
  const pctColor    = (v:number) => v>=0?"#22C55E":"#EF4444";

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"36px 40px" }}>

        {/* ── TOP HEADER ── */}
        <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:36,
          background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:18, padding:"24px 28px" }}>
          {/* Avatar */}
          <div style={{ width:68, height:68, borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg,rgba(255,215,0,.25),rgba(34,197,94,.15))",
            border:"2px solid rgba(255,215,0,.35)", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:26, fontWeight:900,
            fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", color:"#FFD700" }}>
            {initials}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:22, fontWeight:800, color:"#fff", letterSpacing:"-0.5px",
              fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
              {user.username || "Unnamed Trader"}
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.38)", marginTop:3 }}>{user.email}</div>
            <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
              {user.is_admin && <span style={{ background:"rgba(255,215,0,.1)", border:"1px solid rgba(255,215,0,.3)", borderRadius:20, padding:"2px 12px", fontSize:11, fontWeight:700, color:"#FFD700" }}>Admin</span>}
              <span style={{ background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.25)", borderRadius:20, padding:"2px 12px", fontSize:11, fontWeight:600, color:"#22C55E" }}>
                {tournaments.length} Tournament{tournaments.length!==1?"s":""} Entered
              </span>
              {wins>0 && <span style={{ background:"rgba(255,215,0,.1)", border:"1px solid rgba(255,215,0,.3)", borderRadius:20, padding:"2px 12px", fontSize:11, fontWeight:700, color:"#FFD700" }}>
                🏆 {wins} Win{wins!==1?"s":""}
              </span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:12, flexShrink:0 }}>
            <Link href="/tournaments" className="btn btn-primary btn-sm">Join Tournament</Link>
            <button onClick={()=>setTab("settings")} className="btn btn-ghost btn-sm">Settings</button>
          </div>
        </div>

        {/* ── LAYOUT: sidebar + content ── */}
        <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:24 }}>

          {/* Sidebar */}
          <div>
            <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, overflow:"hidden", marginBottom:16 }}>
              {NAV.map(n=>(
                <button key={n.id} onClick={()=>setTab(n.id)} style={{
                  width:"100%", display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
                  background:tab===n.id ? "rgba(255,215,0,.08)" : "transparent",
                  borderLeft:`2px solid ${tab===n.id ? "#FFD700" : "transparent"}`,
                  border:"none", borderLeftWidth:2, borderLeftStyle:"solid",
                  borderLeftColor: tab===n.id ? "#FFD700" : "transparent",
                  cursor:"pointer", textAlign:"left", transition:"all .12s",
                  color: tab===n.id ? "#FFD700" : "rgba(255,255,255,.45)",
                  fontSize:13, fontWeight:tab===n.id?700:500,
                  fontFamily:"'Inter',system-ui,sans-serif"
                }}>
                  <Icon d={n.icon} size={16} stroke={tab===n.id?"#FFD700":"rgba(255,255,255,.45)"}/>
                  {n.label}
                </button>
              ))}
            </div>

            {/* Quick stats sidebar */}
            <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"16px" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.28)", marginBottom:14 }}>Quick Stats</div>
              {[
                { l:"Active Entries",  v: active.length,                color:"#22C55E" },
                { l:"Tournaments",     v: tournaments.length,            color:"#fff" },
                { l:"Total Wins",      v: wins,                          color:"#FFD700" },
                { l:"Avg Gain",        v: tournaments.length ? (totalPnl/tournaments.length).toFixed(1)+"%" : "—", color: totalPnl>=0?"#22C55E":"#EF4444" },
              ].map(s=>(
                <div key={s.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.38)" }}>{s.l}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:s.color, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div>

            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
              <div>
                {/* Stat cards */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
                  <StatCard label="Total Tournaments" value={tournaments.length} sub="All time entries" accent="#60a5fa"/>
                  <StatCard label="Active Right Now"  value={active.length} sub="In progress" color="#22C55E" accent="#22C55E"/>
                  <StatCard label="Total Wins"        value={wins} sub={wins>0?"Keep competing!":"Keep going!"} color="#FFD700" accent="#FFD700"/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
                  <StatCard label="Best Gain"
                    value={tournaments.length ? Math.max(...tournaments.map(t=>Number(t.best_profit_pct||0))).toFixed(2)+"%" : "—"}
                    sub="Single tournament" color="#22C55E" accent="#22C55E"/>
                  <StatCard label="Total Entries" value={user.total_entries||tournaments.reduce((s,t)=>s+(t.entry_count||1),0)} sub="Including re-entries" accent="#60a5fa"/>
                  <StatCard label="Prize Pool Joined" value={"$"+(tournaments.reduce((s,t)=>s+Number(t.prize_pool||0),0)).toLocaleString()} sub="Cumulative" color="#FFD700" accent="#FFD700"/>
                </div>

                {/* Active tournaments */}
                {active.length > 0 && (
                  <div style={{ marginBottom:24 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                      <span className="live-dot"/> Active Tournaments
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {active.map((t:any)=>(
                        <div key={t.id} style={{ background:"rgba(34,197,94,.04)", border:"1px solid rgba(34,197,94,.2)", borderRadius:14, padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                          <div>
                            <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:5 }}>{t.name}</div>
                            <div style={{ fontSize:13, color:"rgba(255,255,255,.42)" }}>
                              ${t.entry_fee} entry · ${Number(t.prize_pool).toLocaleString()} pool · {t.entry_count} {t.entry_count===1?"entry":"entries"}
                            </div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:24, fontWeight:900, color:pctColor(Number(t.best_profit_pct)), fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                                {Number(t.best_profit_pct)>=0?"+":""}{Number(t.best_profit_pct||0).toFixed(2)}%
                              </div>
                              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>best entry</div>
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                              <Link href={`/leaderboard?t=${t.id}`} className="btn btn-ghost btn-sm">Leaderboard</Link>
                              <Link href={`/tournaments/${t.id}`} className="btn btn-primary btn-sm">View →</Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent history */}
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Recent History</div>
                    {ended.length>3 && <button onClick={()=>setTab("history")} style={{ fontSize:12, color:"#FFD700", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>View all →</button>}
                  </div>
                  {ended.length===0 ? (
                    <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,.3)", fontSize:14 }}>
                      No completed tournaments yet.{" "}
                      <Link href="/tournaments" style={{ color:"#FFD700", textDecoration:"none", fontWeight:600 }}>Browse tournaments →</Link>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {ended.slice(0,3).map((t:any)=>(
                        <div key={t.id} style={{ background:"rgba(13,18,29,.8)", border:`1px solid ${t.is_winner?"rgba(255,215,0,.3)":"rgba(255,255,255,.06)"}`, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            <div style={{ fontSize:22 }}>{t.is_winner?"🏆":"📊"}</div>
                            <div>
                              <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.85)" }}>{t.name}</div>
                              <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>
                                {t.entry_count} {t.entry_count===1?"entry":"entries"} · ${t.entry_fee} each
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:18, fontWeight:800, color:pctColor(Number(t.best_profit_pct)), fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                              {Number(t.best_profit_pct)>=0?"+":""}{Number(t.best_profit_pct||0).toFixed(2)}%
                            </div>
                            {t.is_winner && <div style={{ fontSize:11, color:"#FFD700", fontWeight:700 }}>Winner!</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ACTIVE TOURNAMENTS ── */}
            {tab === "active" && (
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:22, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>Active Tournaments</div>
                {active.length===0 ? (
                  <div style={{ textAlign:"center", padding:"60px 0" }}>
                    <div style={{ fontSize:40, marginBottom:14 }}>📊</div>
                    <div style={{ fontSize:16, fontWeight:600, color:"rgba(255,255,255,.6)", marginBottom:8 }}>No active tournaments</div>
                    <div style={{ fontSize:14, color:"rgba(255,255,255,.3)", marginBottom:24 }}>Join a tournament to start competing!</div>
                    <Link href="/tournaments" className="btn btn-primary">Browse Tournaments</Link>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    {active.map((t:any)=>(
                      <div key={t.id} style={{ background:"rgba(34,197,94,.04)", border:"1px solid rgba(34,197,94,.2)", borderRadius:16, padding:24 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:14 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                              <div style={{ fontSize:17, fontWeight:700, color:"#fff" }}>{t.name}</div>
                              <span style={{ background:"rgba(34,197,94,.12)", border:"1px solid rgba(34,197,94,.3)", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700, color:"#22C55E", display:"flex", alignItems:"center", gap:5 }}>
                                <span className="live-dot" style={{ width:5, height:5 }}/> LIVE
                              </span>
                            </div>
                            <div style={{ fontSize:13, color:"rgba(255,255,255,.42)" }}>
                              ${t.entry_fee} entry · ${Number(t.prize_pool).toLocaleString()} prize pool · {t.entry_count} {t.entry_count===1?"entry":"entries"}
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:30, fontWeight:900, color:pctColor(Number(t.best_profit_pct)), fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", letterSpacing:"-1px" }}>
                              {Number(t.best_profit_pct)>=0?"+":""}{Number(t.best_profit_pct||0).toFixed(2)}%
                            </div>
                            <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>Your best gain</div>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:10 }}>
                          <Link href={`/leaderboard?t=${t.id}`} className="btn btn-ghost btn-sm">View Leaderboard</Link>
                          <Link href={`/tournaments/${t.id}`} className="btn btn-primary btn-sm">Manage Entry →</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {tab === "history" && (
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:22, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>Tournament History</div>
                {tLoading ? (
                  <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}><div className="spinner"/></div>
                ) : tournaments.length===0 ? (
                  <div style={{ textAlign:"center", padding:"60px 0" }}>
                    <div style={{ fontSize:40, marginBottom:14 }}>📋</div>
                    <div style={{ fontSize:16, fontWeight:600, color:"rgba(255,255,255,.6)", marginBottom:24 }}>No tournaments yet</div>
                    <Link href="/tournaments" className="btn btn-primary">Browse Tournaments</Link>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {tournaments.map((t:any)=>(
                      <div key={t.id} style={{ background:"rgba(13,18,29,.9)", border:`1px solid ${t.is_winner?"rgba(255,215,0,.3)":"rgba(255,255,255,.06)"}`, borderRadius:14, padding:"18px 22px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                            <div style={{ fontSize:28 }}>{t.is_winner?"🏆":t.status==="active"?"⚡":"📊"}</div>
                            <div>
                              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                                <Link href={`/tournaments/${t.id}`} style={{ fontSize:15, fontWeight:700, color:"#fff", textDecoration:"none" }}>{t.name}</Link>
                                <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20, background:`${statusColor(t.status)}18`, border:`1px solid ${statusColor(t.status)}44`, color:statusColor(t.status), textTransform:"capitalize" }}>{t.status}</span>
                                {t.is_winner && <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20, background:"rgba(255,215,0,.1)", border:"1px solid rgba(255,215,0,.3)", color:"#FFD700" }}>Winner 🏆</span>}
                              </div>
                              <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
                                {t.entry_count} {t.entry_count===1?"entry":"entries"} · ${t.entry_fee} each · ${Number(t.prize_pool).toLocaleString()} pool
                              </div>
                            </div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:22, fontWeight:900, color:pctColor(Number(t.best_profit_pct)), fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                                {Number(t.best_profit_pct)>=0?"+":""}{Number(t.best_profit_pct||0).toFixed(2)}%
                              </div>
                              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>best gain</div>
                            </div>
                            <Link href={`/leaderboard?t=${t.id}`} className="btn btn-ghost btn-sm">Leaderboard</Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PAYOUTS ── */}
            {tab === "payouts" && (
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:8, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>Payouts</div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.38)", marginBottom:24 }}>Track your winnings and request payouts for completed tournaments.</div>

                {/* Wallet setup notice */}
                {!user.wallet_address && (
                  <div style={{ background:"rgba(255,215,0,.06)", border:"1px solid rgba(255,215,0,.2)", borderRadius:13, padding:"16px 20px", marginBottom:22, display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ fontSize:22 }}>⚠️</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#FFD700", marginBottom:4 }}>Add your USDT wallet address</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,.45)" }}>Set your payout wallet in Settings to receive winnings.</div>
                    </div>
                    <button onClick={()=>setTab("settings")} className="btn btn-primary btn-sm" style={{ flexShrink:0, marginLeft:"auto" }}>Go to Settings</button>
                  </div>
                )}

                {/* Won tournaments */}
                {tournaments.filter(t=>t.is_winner).length===0 ? (
                  <div style={{ textAlign:"center", padding:"60px 0" }}>
                    <div style={{ fontSize:40, marginBottom:14 }}>💰</div>
                    <div style={{ fontSize:16, fontWeight:600, color:"rgba(255,255,255,.5)", marginBottom:8 }}>No payouts yet</div>
                    <div style={{ fontSize:14, color:"rgba(255,255,255,.3)", marginBottom:24 }}>Win a tournament to receive your funded account or USDT payout.</div>
                    <Link href="/tournaments" className="btn btn-primary">Join a Tournament</Link>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    {tournaments.filter(t=>t.is_winner).map((t:any)=>(
                      <div key={t.id} style={{ background:"rgba(255,215,0,.05)", border:"1px solid rgba(255,215,0,.2)", borderRadius:14, padding:"20px 24px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                              <span style={{ fontSize:20 }}>🏆</span>
                              <span style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{t.name}</span>
                            </div>
                            <div style={{ fontSize:13, color:"rgba(255,255,255,.42)" }}>
                              Won · ${Number(t.prize_pool||0).toLocaleString()} prize pool · Funded account (90%)
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:10 }}>
                            <Link href={`/certificates?t=${t.id}`} className="btn btn-ghost btn-sm">View Certificate</Link>
                            <button className="btn btn-primary btn-sm">Request Payout</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── CERTIFICATES ── */}
            {tab === "certificates" && (
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:8, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>My Certificates</div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.38)", marginBottom:28 }}>Your personal trading achievements. Each certificate is issued for tournament wins.</div>

                {tournaments.filter(t=>t.is_winner).length === 0 ? (
                  <div style={{ textAlign:"center", padding:"60px 0" }}>
                    <div style={{ fontSize:56, marginBottom:16 }}>🏆</div>
                    <div style={{ fontSize:18, fontWeight:700, color:"rgba(255,255,255,.6)", marginBottom:8 }}>No certificates yet</div>
                    <div style={{ fontSize:14, color:"rgba(255,255,255,.3)", marginBottom:28, maxWidth:360, margin:"0 auto 28px" }}>
                      Win a tournament to earn your Gold Certificate. Only the 1st place winner receives a certificate.
                    </div>
                    <Link href="/tournaments" className="btn btn-primary">Join a Battle Now</Link>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 }}>
                    {tournaments.filter(t=>t.is_winner).map((t:any, i:number)=>{
                      const medal = "🥇";
                      const certColor = i===0?"#FFD700":i===1?"#b4c0d8":"#CD7F32";
                      const certName = "Gold Certificate";
                      const borderColor = i===0?"rgba(255,215,0,.4)":i===1?"rgba(180,192,216,.3)":"rgba(205,127,50,.3)";
                      return (
                        <div key={t.id} style={{ background:"rgba(13,18,29,.95)", border:`1px solid ${borderColor}`, borderRadius:18, padding:28, position:"relative", overflow:"hidden" }}>
                          {/* Glow bg */}
                          <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:`radial-gradient(circle, ${certColor}22 0%, transparent 70%)`, pointerEvents:"none" }}/>
                          <div style={{ fontSize:48, marginBottom:14 }}>{medal}</div>
                          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:6 }}>Tournament Win</div>
                          <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:4 }}>{t.name}</div>
                          <div style={{ fontSize:13, color:"rgba(255,255,255,.38)", marginBottom:16 }}>
                            Best gain: <span style={{ color:"#22C55E", fontWeight:700 }}>+{Number(t.best_profit_pct||0).toFixed(2)}%</span>
                          </div>
                          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:`${certColor}15`, border:`1px solid ${certColor}44`, borderRadius:20, padding:"4px 12px", marginBottom:20 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:certColor }}>{certName}</span>
                          </div>
                          <div style={{ display:"flex", gap:8 }}>
                            <Link href={`/certificates?t=${t.id}`} className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:"center" }}>View</Link>
                            <Link href={`/certificates?t=${t.id}&download=1`} className="btn btn-sm" style={{ flex:1, justifyContent:"center", background:certColor, color:"#000", fontWeight:700 }}>Download</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS ── */}
            {tab === "settings" && (
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:22, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>Account Settings</div>

                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  {/* Profile section */}
                  <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"24px 28px" }}>
                    <div style={{ fontSize:13, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:20 }}>Profile</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>
                      <div>
                        <label className="input-label">Username</label>
                        <input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" maxLength={30}/>
                      </div>
                      <div>
                        <label className="input-label">Email</label>
                        <input className="input" value={user.email||""} disabled style={{ opacity:.5, cursor:"not-allowed" }}/>
                      </div>
                    </div>
                  </div>

                  {/* Payout section */}
                  <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"24px 28px" }}>
                    <div style={{ fontSize:13, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:6 }}>Payout Wallet</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.38)", marginBottom:18 }}>Add your USDT (TRC-20) wallet address to receive prize payouts automatically.</div>
                    <label className="input-label">USDT TRC-20 Address</label>
                    <input className="input" value={walletAddress} onChange={e=>setWalletAddress(e.target.value)}
                      placeholder="T... (TRC-20 address)" style={{ marginBottom:8, fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:13 }}/>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.28)" }}>⚠️ Only enter a TRC-20 address. Sending to wrong network = permanent loss.</div>
                  </div>

                  {/* Account info */}
                  <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"24px 28px" }}>
                    <div style={{ fontSize:13, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:18 }}>Account Info</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {[
                        { l:"Member since",   v: user.created_at ? new Date(user.created_at).toLocaleDateString("en-US",{month:"long",year:"numeric"}) : "—" },
                        { l:"Account status", v: "Active", color:"#22C55E" },
                        { l:"Account type",   v: user.is_admin ? "Admin" : "Trader", color: user.is_admin ? "#FFD700" : "rgba(255,255,255,.7)" },
                      ].map(r=>(
                        <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                          <span style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>{r.l}</span>
                          <span style={{ fontSize:13, fontWeight:600, color:(r as any).color||"rgba(255,255,255,.8)" }}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save */}
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <button onClick={saveSettings} disabled={saving} className="btn btn-primary btn-lg">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    {saved && <span style={{ fontSize:13, color:"#22C55E", fontWeight:600 }}>✓ Saved successfully!</span>}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
