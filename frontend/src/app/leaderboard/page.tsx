"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { leaderboardApi, tournamentApi } from "@/lib/api";
import { useLeaderboardSocket } from "@/hooks/useSockets";

const fmt  = (v: number, d = 2) => parseFloat((v||0).toFixed(d)).toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d});
const col  = (v: number) => v >= 0 ? "#22C55E" : "#EF4444";

function MiniBar({ pct, color }: { pct: number; color: string }) {
  const w = Math.min(Math.abs(pct) * 2, 100);
  return (
    <div style={{ width:56, height:3, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden", marginTop:4 }}>
      <div style={{ height:"100%", width:`${w}%`, background:color, borderRadius:2, transition:"width .6s ease" }}/>
    </div>
  );
}

function RankBadge({ pos }: { pos: number }) {
  const medals: Record<number, string> = { 1:"🥇", 2:"🥈", 3:"🥉" };
  if (medals[pos]) return (
    <div style={{ width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0,
      background: pos===1?"rgba(255,215,0,.12)":pos===2?"rgba(192,192,192,.1)":"rgba(205,127,50,.1)",
      border: pos===1?"1.5px solid rgba(255,215,0,.35)":pos===2?"1.5px solid rgba(192,192,192,.25)":"1.5px solid rgba(205,127,50,.25)" }}>
      {medals[pos]}
    </div>
  );
  return (
    <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"rgba(255,255,255,.3)", flexShrink:0 }}>
      #{pos}
    </div>
  );
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
  const isActive       = tournament?.status === "active";
  const fillPct        = max_entries > 0 ? Math.round((active_entries / max_entries) * 100) : 0;

  return (
    <div style={{ background:"#030508", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @keyframes lb-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.5);}}
        @keyframes lb-shimmer{0%{background-position:0% center;}100%{background-position:200% center;}}
        @keyframes lb-fadein{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        .lb-container{max-width:1120px;margin:0 auto;padding:0 32px;}
        .lb-row-wrap{animation:lb-fadein .4s ease both;}
        .lb-row-wrap:nth-child(2){animation-delay:.04s;}
        .lb-row-wrap:nth-child(3){animation-delay:.08s;}
        .lb-row-wrap:nth-child(4){animation-delay:.12s;}
        .lb-row-wrap:nth-child(n+5){animation-delay:.16s;}
        .lb-row{display:grid;grid-template-columns:52px 1fr 120px 110px 90px 80px 72px 80px;gap:0;
          padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.04);
          transition:background .15s;align-items:center;cursor:default;}
        .lb-row:hover{background:rgba(255,255,255,.025);}
        .lb-row.rank-1{background:rgba(255,215,0,.03);}
        .lb-row.rank-1:hover{background:rgba(255,215,0,.055);}
        .lb-th{display:grid;grid-template-columns:52px 1fr 120px 110px 90px 80px 72px 80px;gap:0;
          padding:10px 20px;background:rgba(255,255,255,.025);border-bottom:1px solid rgba(255,255,255,.06);}
        .lb-select{background:#0d1525;border:1px solid rgba(255,215,0,.2);border-radius:10px;
          color:#fff;font-size:13px;padding:10px 14px;outline:none;cursor:pointer;
          min-width:260px;font-family:inherit;transition:border-color .2s;}
        .lb-select:focus{border-color:rgba(255,215,0,.45);}
        .live-badge{display:inline-flex;align-items:center;gap:6px;
          background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);
          border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;
          letter-spacing:.08em;text-transform:uppercase;color:#22C55E;}
        .live-dot-sm{width:6px;height:6px;border-radius:50%;background:#22C55E;
          animation:lb-pulse 1.5s infinite;}
        .stat-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,255,255,.07);
          border-radius:14px;padding:18px 20px;transition:.25s;}
        .stat-card:hover{border-color:rgba(255,215,0,.2);}
        .fill-bar{height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:8px;}
        .fill-bar-inner{height:100%;border-radius:2px;background:linear-gradient(90deg,#FFD700,#FFA500);transition:width .6s;}
        .leader-card{background:linear-gradient(135deg,rgba(255,215,0,.07) 0%,rgba(255,100,0,.04) 50%,rgba(34,197,94,.03) 100%);
          border:1px solid rgba(255,215,0,.25);border-radius:18px;padding:28px 32px;
          position:relative;overflow:hidden;}
        .leader-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
          background:linear-gradient(90deg,#FFD700,#FFA500,#22C55E);}
        .leader-glow{position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;
          background:radial-gradient(circle,rgba(255,215,0,.08) 0%,transparent 70%);pointer-events:none;}
        .trophy-icon{font-size:52px;filter:drop-shadow(0 0 16px rgba(255,215,0,.4));}
        @media(max-width:900px){
          .lb-container{padding:0 16px;}
          .lb-row{grid-template-columns:44px 1fr 90px 80px;gap:0;padding:12px 14px;}
          .lb-th{grid-template-columns:44px 1fr 90px 80px;}
          .lb-col-hide{display:none;}
          .lb-select{min-width:200px;}
        }
        @media(max-width:560px){
          .lb-row{grid-template-columns:40px 1fr 80px;padding:10px 12px;}
          .lb-th{grid-template-columns:40px 1fr 80px;}
          .lb-col-hide2{display:none;}
        }
      `}</style>

      {/* ── HERO HEADER ── */}
      <div style={{ position:"relative", overflow:"hidden",
        background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,215,0,.07) 0%,transparent 55%)",
        borderBottom:"1px solid rgba(255,255,255,.06)", paddingTop:48, paddingBottom:0 }}>

        {/* Grid overlay */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage:"linear-gradient(rgba(255,215,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,.025) 1px,transparent 1px)",
          backgroundSize:"60px 60px",
          maskImage:"radial-gradient(ellipse 80% 100% at 50% 0%,black 20%,transparent 70%)" as any }}/>

        <div className="lb-container" style={{ position:"relative", zIndex:1 }}>

          {/* Title row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:20, marginBottom:32 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".2em", textTransform:"uppercase",
                color:"rgba(255,215,0,.6)", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ display:"block", width:28, height:1, background:"rgba(255,215,0,.6)" }}/>
                Live Rankings
              </div>
              <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(48px,6vw,88px)",
                letterSpacing:"3px", lineHeight:.9, margin:0,
                background:"linear-gradient(135deg,#fff 30%,rgba(255,255,255,.65) 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                LEADERBOARD
              </h1>
              {tournament && (
                <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  {isActive && (
                    <div className="live-badge">
                      <span className="live-dot-sm"/>
                      LIVE
                    </div>
                  )}
                  <span style={{ fontSize:14, color:"rgba(255,255,255,.45)", fontWeight:500 }}>
                    {tournament.name}
                  </span>
                  {isActive && countdown && (
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, color:"#FFD700", fontWeight:500 }}>
                      ⏱ {countdown}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Battle selector */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", color:"rgba(255,255,255,.3)" }}>
                Select Battle
              </div>
              <select className="lb-select" value={selected} onChange={e => setSelected(e.target.value)}>
                <option value="" style={{ background:"#0d1525", color:"rgba(255,255,255,.4)" }}>Choose a battle...</option>
                {allTours.map(t => (
                  <option key={t.id} value={t.id} style={{ background:"#0d1525", color:"#fff" }}>
                    {t.name} — {t.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats cards */}
          {tournament && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, paddingBottom:32 }}>
              {[
                { label:"Prize Pool",  value:`$${fmt(totalPrize,0)}`,  color:"#FFD700",  sub:"Total pool" },
                { label:"1st Prize",   value:`$${fmt(winner90,0)}`,    color:"#22C55E",  sub:"90% to winner" },
                { label:"Entry Fee",   value:`$${fmt(parseFloat(tournament.entry_fee||0),0)}`, color:"rgba(255,255,255,.75)", sub:"USDT per trader" },
                { label:"Traders",     value:`${active_entries}/${max_entries}`, color:isActive?"#22C55E":"rgba(255,255,255,.6)", sub:`${fillPct}% filled` },
                { label:"Status",      value:tournament.status?.toUpperCase(), color:isActive?"#22C55E":tournament.status==="registration"?"#FFD700":"rgba(255,255,255,.45)", sub:isActive?`${countdown} left`:"" },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
                    color:"rgba(255,255,255,.3)", marginBottom:8 }}>{s.label}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:"1px",
                    lineHeight:1, color:s.color, marginBottom:4 }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize:11, color:"rgba(255,255,255,.25)" }}>{s.sub}</div>}
                  {s.label === "Traders" && (
                    <div className="fill-bar"><div className="fill-bar-inner" style={{ width:`${fillPct}%` }}/></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="lb-container" style={{ paddingTop:32, paddingBottom:64 }}>

        {/* Leader spotlight */}
        {!loading && leader && (
          <div className="leader-card" style={{ marginBottom:24, animation:"lb-fadein .5s ease both" }}>
            <div className="leader-glow"/>
            <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap", position:"relative", zIndex:1 }}>
              <div className="trophy-icon">🏆</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase",
                  color:"rgba(255,215,0,.7)", marginBottom:6 }}>Current Leader</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(28px,4vw,44px)",
                  letterSpacing:"2px", lineHeight:1, color:"#fff", marginBottom:6 }}>
                  {(leader.display_name || leader.username || `Trader #${leader.entry_number}`).toUpperCase()}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12,
                    background:"rgba(255,215,0,.1)", border:"1px solid rgba(255,215,0,.2)",
                    borderRadius:20, padding:"3px 10px", color:"rgba(255,215,0,.8)", textTransform:"capitalize" }}>
                    {leader.broker||"Exness"}
                  </span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"rgba(255,255,255,.35)" }}>
                    {leader.mt5_login ? `MT5 ***${String(leader.mt5_login).slice(-3)}` : `Entry #${leader.entry_number}`}
                  </span>
                </div>
              </div>
              <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
                {[
                  { label:"% GAIN",     value:`${leaderPct>=0?"+":""}${fmt(leaderPct)}%`,  color:"#22C55E",  big:true },
                  { label:"NET PROFIT", value:`$${fmt(Math.abs(parseFloat(leader.profit_abs||0)))}`, color:"#FFD700", big:false },
                  { label:"WIN RATE",   value:`${leader.win_rate||0}%`,                   color:"rgba(255,255,255,.7)", big:false },
                  { label:"TRADES",     value:String(leader.total_trades||0),             color:"rgba(255,255,255,.5)", big:false },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:".15em", color:"rgba(255,255,255,.3)", marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:s.big?38:24, letterSpacing:"1px", lineHeight:1, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ background:"rgba(8,13,21,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, overflow:"hidden" }}>

          {/* Table header */}
          <div className="lb-th">
            {["#", "TRADER", "% GAIN", "NET PROFIT", "BALANCE", "WIN RATE", "TRADES", "STATUS"].map((h, i) => (
              <div key={h} className={i >= 4 ? "lb-col-hide" : i === 6 ? "lb-col-hide lb-col-hide2" : ""}
                style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", color:"rgba(255,255,255,.22)" }}>
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding:"60px 0", textAlign:"center" }}>
              <div className="spinner" style={{ margin:"0 auto" }}/>
            </div>
          ) : leaders.length === 0 ? (
            <div style={{ padding:"72px 24px", textAlign:"center", animation:"lb-fadein .5s ease both" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>⚔️</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:"2px", color:"rgba(255,255,255,.4)", marginBottom:8 }}>
                NO TRADERS YET
              </div>
              <div style={{ fontSize:14, color:"rgba(255,255,255,.22)", marginBottom:24 }}>
                Be the first to join this battle
              </div>
              <Link href="/tournaments" className="btn btn-primary">
                Join a Battle →
              </Link>
            </div>
          ) : (
            leaders.map((entry: any, i: number) => {
              const pos  = parseInt(entry.position || i + 1);
              const pct  = parseFloat(entry.profit_pct || 0);
              const bal  = parseFloat(entry.current_balance || 1000);
              const wr   = parseInt(entry.win_rate || 0);
              const profAbs = parseFloat(entry.profit_abs || 0);
              const initial = (entry.display_name || entry.username || "T")[0].toUpperCase();
              const tierColor = pos===1?"#FFD700":pos===2?"rgba(192,192,192,.8)":pos===3?"rgba(205,127,50,.8)":"rgba(255,255,255,.4)";

              return (
                <div key={entry.id} className={`lb-row-wrap`}>
                  <div className={`lb-row ${pos===1?"rank-1":""}`}>

                    {/* Rank */}
                    <div style={{ display:"flex", alignItems:"center" }}>
                      <RankBadge pos={pos}/>
                    </div>

                    {/* Trader */}
                    <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
                        background:`${tierColor}18`, border:`1.5px solid ${tierColor}40`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:tierColor }}>
                        {initial}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#fff",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {entry.display_name || entry.username || `Trader #${entry.entry_number}`}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
                            background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)",
                            borderRadius:20, padding:"1px 8px", color:"rgba(255,255,255,.45)",
                            textTransform:"capitalize" }}>
                            {entry.broker||"Exness"}
                          </span>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"rgba(255,255,255,.28)", letterSpacing:".04em" }}>
                            {entry.mt5_login ? `***${String(entry.mt5_login).slice(-3)}` : `#${entry.entry_number}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* % Gain */}
                    <div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:"1px",
                        color:col(pct), lineHeight:1 }}>
                        {pct>=0?"+":""}{fmt(pct)}%
                      </div>
                      <MiniBar pct={pct} color={col(pct)}/>
                    </div>

                    {/* Net Profit */}
                    <div className="lb-col-hide2" style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, color:col(profAbs) }}>
                      {profAbs>=0?"+":""}{fmt(Math.abs(profAbs))}
                    </div>

                    {/* Balance */}
                    <div className="lb-col-hide" style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"rgba(255,255,255,.55)" }}>
                      ${fmt(bal,0)}
                    </div>

                    {/* Win Rate */}
                    <div className="lb-col-hide" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:".5px",
                      color:wr>=50?"#22C55E":wr>0?"#fbbf24":"rgba(255,255,255,.25)" }}>
                      {wr>0?`${wr}%`:"—"}
                    </div>

                    {/* Trades */}
                    <div className="lb-col-hide" style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>
                      {entry.total_trades||0}
                    </div>

                    {/* Status */}
                    <div className="lb-col-hide">
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, padding:"3px 10px",
                        borderRadius:20, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase",
                        background:entry.status==="active"?"rgba(34,197,94,.1)":"rgba(255,255,255,.04)",
                        color:entry.status==="active"?"#22C55E":"rgba(255,255,255,.35)",
                        border:`1px solid ${entry.status==="active"?"rgba(34,197,94,.2)":"rgba(255,255,255,.07)"}` }}>
                        {entry.status}
                      </span>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {leaders.length > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            marginTop:14, fontSize:11, color:"rgba(255,255,255,.2)", flexWrap:"wrap", gap:8 }}>
            <span>{leaders.length} traders · ranked by % gain on starting $1,000</span>
            {lastUpd && (
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#22C55E",
                  display:"inline-block", animation:"lb-pulse 2s infinite" }}/>
                Updated {lastUpd.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", background:"#030508" }}>
        <div className="spinner"/>
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}
