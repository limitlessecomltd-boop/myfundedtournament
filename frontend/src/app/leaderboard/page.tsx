"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { leaderboardApi, tournamentApi } from "@/lib/api";
import { useLeaderboardSocket } from "@/hooks/useSockets";

const fmt  = (v: number, d = 2) => parseFloat((v||0).toFixed(d)).toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d});
const col  = (v: number) => v >= 0 ? "#22C55E" : "#EF4444";

const TIER_COLORS: any = { starter:"#60a5fa", pro:"#FFD700", guild:"#a78bfa" };
const STATUS_COLORS: any = { active:"#22C55E", registration:"#FFD700", ended:"rgba(255,255,255,.4)" };

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width:60, height:4, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(Math.abs(pct)*2, 100)}%`, background:color, borderRadius:2, transition:"width .6s ease" }}/>
    </div>
  );
}

function RankBadge({ pos }: { pos: number }) {
  if (pos === 1) return <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,215,0,.15)", border:"1.5px solid rgba(255,215,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🥇</div>;
  if (pos === 2) return <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(180,192,216,.1)", border:"1.5px solid rgba(180,192,216,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🥈</div>;
  if (pos === 3) return <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(205,127,50,.1)", border:"1.5px solid rgba(205,127,50,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🥉</div>;
  return <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"rgba(255,255,255,.4)", flexShrink:0, fontFamily:"'Space Grotesk',sans-serif" }}>#{pos}</div>;
}

function LeaderboardContent() {
  const params     = useSearchParams();
  const tParam     = params.get("t");
  const [allTours, setAllTours] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>(tParam || "");
  const [leaders,  setLeaders]  = useState<any[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [lastUpd,  setLastUpd]  = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    Promise.all([
      tournamentApi.getAll("active"),
      tournamentApi.getAll("registration"),
      tournamentApi.getAll("ended"),
    ]).then(([active, reg, ended]) => {
      const all = [...active, ...reg, ...ended];
      setAllTours(all);
      if (!selected && all.length) setSelected(all[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      leaderboardApi.get(selected),
      tournamentApi.getById(selected),
    ]).then(([lb, t]) => {
      setLeaders(lb || []);
      setTournament(t);
      setLastUpd(new Date());
    }).finally(() => setLoading(false));
  }, [selected]);

  // Live countdown for active tournaments
  useEffect(() => {
    if (!tournament?.end_time || tournament.status !== "active") return;
    const tick = () => {
      const diff = new Date(tournament.end_time).getTime() - Date.now();
      if (diff <= 0) { setCountdown("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [tournament]);

  useLeaderboardSocket(selected, (data) => { setLeaders(data || []); setLastUpd(new Date()); });

  const leader      = leaders[0];
  const leaderPct   = leader ? parseFloat(leader.profit_pct || 0) : 0;
  const totalPrize  = parseFloat(tournament?.prize_pool || 0);
  const winner90    = totalPrize * 0.9;
  const active_entries = parseInt(tournament?.active_entries || 0);
  const max_entries    = parseInt(tournament?.max_entries || 25);

  return (
    <div style={{ background:"#04060d", minHeight:"100vh" }}>
      <style>{`
        .lb-pad{padding:0 28px;}
        .lb-content{max-width:1100px;margin:0 auto;padding:24px 28px 60px;}
        .lb-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:20px;}
        .lb-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .lb-table-wrap>div{min-width:620px;}
        @media(max-width:768px){
          .lb-pad{padding:0 16px;}
          .lb-content{padding:16px 16px 40px;}
          .lb-filters button{font-size:12px !important;padding:6px 10px !important;}
        }
        @media(max-width:480px){.lb-pad{padding:0 12px;}.lb-content{padding:14px 12px 40px;}}
      `}</style>

      {/* ── Hero ── */}
      <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,.04),rgba(34,197,94,.02))", borderBottom:"1px solid rgba(255,255,255,.06)", padding:"28px 0 0" }}>
        <div className="lb-pad" style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:16, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.28)", marginBottom:8 }}>Live Rankings</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px", display:"flex", alignItems:"center", gap:12 }}>
                Leaderboard
                {tournament?.status === "active" && <span className="live-dot" style={{ width:8, height:8 }}/>}
              </div>
              {tournament && (
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:6 }}>
                  {tournament.name} · {tournament.status === "active" ? `⏱ ${countdown} remaining` : tournament.status} · {active_entries}/{max_entries} traders
                </div>
              )}
            </div>

            {/* Tournament selector */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.28)" }}>Select Battle</div>
              <select value={selected} onChange={e=>setSelected(e.target.value)}
                style={{ background:"rgba(13,17,26,.9)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"#fff", fontSize:13, padding:"9px 12px", outline:"none", cursor:"pointer", minWidth:240 }}>
                <option value="">Choose tournament...</option>
                {allTours.map(t=>(
                  <option key={t.id} value={t.id}>{t.name} — {t.status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats strip */}
          {tournament && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:1, background:"rgba(255,255,255,.04)", borderRadius:"10px 10px 0 0", overflow:"hidden" }}>
              {[
                { l:"Prize Pool",  v:`$${fmt(totalPrize,0)}`,                                   c:"#FFD700" },
                { l:"1st Prize",   v:`$${fmt(winner90,0)}`,                                     c:"#22C55E" },
                { l:"Entry Fee",   v:`$${fmt(parseFloat(tournament.entry_fee||0),0)}`,           c:"rgba(255,255,255,.7)" },
                { l:"Traders",     v:`${active_entries}/${max_entries}`,                        c:tournament.status==="active"?"#22C55E":"rgba(255,255,255,.5)" },
              ].map((s,i)=>(
                <div key={i} style={{ background:"rgba(13,17,26,.9)", padding:"14px 16px", minWidth:0, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.28)", marginBottom:6 }}>{s.l}</div>
                  <div style={{ fontSize:17, fontWeight:900, color:s.c, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-.5px", lineHeight:1 }}>{s.v}</div>
                </div>
              ))}
              {/* Status cell — pill badge */}
              <div style={{ background:"rgba(13,17,26,.9)", padding:"14px 16px", minWidth:0, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.28)", marginBottom:6 }}>Status</div>
                <div style={{ display:"flex", alignItems:"center" }}>
                  <span style={{
                    fontSize:11, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase",
                    color: STATUS_COLORS[tournament.status] || "#fff",
                    background: `${STATUS_COLORS[tournament.status] || "#fff"}18`,
                    border: `1px solid ${STATUS_COLORS[tournament.status] || "#fff"}40`,
                    borderRadius:6, padding:"4px 10px", whiteSpace:"nowrap"
                  }}>
                    {tournament.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lb-content">

        {/* ── Leader spotlight ── */}
        {!loading && leader && (
          <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,.06),rgba(34,197,94,.03))", border:"1px solid rgba(255,215,0,.2)", borderRadius:14, padding:"20px 24px", marginBottom:20, display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ fontSize:36 }}>🏆</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"#FFD700", marginBottom:4 }}>Current Leader</div>
              <div style={{ fontSize:20, fontWeight:900, color:"#fff", fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-.5px" }}>{leader.display_name || leader.username || `Trader #${leader.entry_number}`}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>
                {leader.broker} · MT5 {leader.mt5_login || "—"} · Entry #{leader.entry_number}
              </div>
            </div>
            <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
              {[
                { l:"Gain",        v:`${leaderPct>=0?"+":""}${fmt(leaderPct)}%`, c:"#22C55E" },
                { l:"Net Profit",  v:`$${fmt(Math.abs(parseFloat(leader.profit_abs||0)))}`, c:"#FFD700" },
                { l:"Win Rate",    v:`${leader.win_rate||0}%`, c:"rgba(255,255,255,.7)" },
                { l:"Trades",      v:leader.total_trades||0, c:"rgba(255,255,255,.7)" },
              ].map(s=>(
                <div key={s.l} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:4 }}>{s.l}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:s.c, fontFamily:"'Space Grotesk',sans-serif" }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="lb-table-wrap">
        <div style={{ background:"rgba(13,17,26,.9)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, overflow:"hidden", minWidth:620 }}>
          {/* Table header */}
          <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 110px 100px 80px 80px 80px 80px", gap:0, padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.05)", background:"rgba(255,255,255,.02)" }}>
            {["#","Trader","% Gain","Net Profit","Balance","Win Rate","Trades","Status"].map(h=>(
              <div key={h} style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.25)" }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding:"48px 0", textAlign:"center" }}><div className="spinner" style={{ margin:"0 auto" }}/></div>
          ) : leaders.length === 0 ? (
            <div style={{ padding:"60px 24px", textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📊</div>
              <div style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.4)", marginBottom:8 }}>No entries yet</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.25)", marginBottom:20 }}>Be the first to join this tournament!</div>
              <Link href="/tournaments" className="btn btn-primary btn-sm">Join a Battle</Link>
            </div>
          ) : leaders.map((entry: any, i: number) => {
            const pos  = parseInt(entry.position || i+1);
            const pct  = parseFloat(entry.profit_pct || 0);
            const bal  = parseFloat(entry.current_balance || 1000);
            const wr   = parseInt(entry.win_rate || 0);
            const isMe = false; // TODO: highlight logged-in user
            return (
              <div key={entry.id} style={{ display:"grid", gridTemplateColumns:"44px 1fr 110px 100px 80px 80px 80px 80px", gap:0, padding:"13px 20px", borderBottom:"1px solid rgba(255,255,255,.04)", background:pos===1?"rgba(255,215,0,.02)":isMe?"rgba(96,165,250,.03)":"transparent", transition:"background .1s" }}>
                {/* Rank */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  <RankBadge pos={pos}/>
                </div>

                {/* Trader info */}
                <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:`${TIER_COLORS[entry.tier||"starter"]||"#fff"}18`, border:`1px solid ${TIER_COLORS[entry.tier||"starter"]||"#fff"}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:TIER_COLORS[entry.tier||"starter"]||"#fff", flexShrink:0 }}>
                    {(entry.display_name||entry.username||"T")[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.display_name || entry.username || `Trader #${entry.entry_number}`}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.28)" }}>{entry.broker||"Exness"} · Entry #{entry.entry_number}</div>
                  </div>
                </div>

                {/* % Gain */}
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:900, color:col(pct), fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-.5px" }}>{pct>=0?"+":""}{fmt(pct)}%</div>
                    <MiniBar pct={pct} color={col(pct)}/>
                  </div>
                </div>

                {/* Net Profit */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:col(parseFloat(entry.profit_abs||0)), fontFamily:"'Space Grotesk',sans-serif" }}>
                    {parseFloat(entry.profit_abs||0)>=0?"+":""}${fmt(Math.abs(parseFloat(entry.profit_abs||0)))}
                  </div>
                </div>

                {/* Balance */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.65)", fontFamily:"'Space Grotesk',sans-serif" }}>${fmt(bal,0)}</div>
                </div>

                {/* Win Rate */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:wr>=50?"#22C55E":wr>0?"#fbbf24":"rgba(255,255,255,.35)" }}>{wr>0?`${wr}%`:"—"}</div>
                </div>

                {/* Trades */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>{entry.total_trades||0}</div>
                </div>

                {/* Status */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  <span style={{ fontSize:9, padding:"2px 8px", borderRadius:20, fontWeight:700, background:entry.status==="active"?"rgba(34,197,94,.1)":"rgba(255,255,255,.05)", color:entry.status==="active"?"#22C55E":"rgba(255,255,255,.4)", border:`1px solid ${entry.status==="active"?"rgba(34,197,94,.2)":"rgba(255,255,255,.08)"}` }}>
                    {entry.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </div>{/* end lb-table-wrap */}

        {/* Footer */}
        {leaders.length > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, fontSize:11, color:"rgba(255,255,255,.25)" }}>
            <span>{leaders.length} traders ranked · ranked by % gain on starting $1,000</span>
            <span>{lastUpd ? `Updated ${lastUpd.toLocaleTimeString()}` : ""}</span>
          </div>
        )}

      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}><div className="spinner"/></div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
