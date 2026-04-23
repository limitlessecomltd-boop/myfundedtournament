"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { leaderboardApi, tournamentApi } from "@/lib/api";
import { useLeaderboardSocket } from "@/hooks/useSockets";

const fmt = (v: number, d = 2) => parseFloat((v||0).toFixed(d)).toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d});
const col = (v: number) => v >= 0 ? "#22C55E" : "#EF4444";

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width:56, height:3, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden", marginTop:4 }}>
      <div style={{ height:"100%", width:`${Math.min(Math.abs(pct)*2,100)}%`, background:color, borderRadius:2, transition:"width .6s" }}/>
    </div>
  );
}

function RankBadge({ pos }: { pos: number }) {
  const medals: Record<number,string> = { 1:"🥇", 2:"🥈", 3:"🥉" };
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

/* ── Battle picker card ── */
function BattleCard({ t, selected, onClick }: { t: any; selected: boolean; onClick: () => void }) {
  const pool    = parseFloat(t.prize_pool || 0);
  const entries = parseInt(t.active_entries || 0);
  const max     = parseInt(t.max_entries || 25);
  const fill    = max > 0 ? Math.round((entries / max) * 100) : 0;
  const isLive  = t.status === "active";
  const isReg   = t.status === "registration";

  return (
    <button onClick={onClick} style={{
      background: selected
        ? "linear-gradient(135deg,rgba(255,215,0,.12),rgba(255,165,0,.06))"
        : "rgba(13,18,29,.95)",
      border: `1.5px solid ${selected ? "rgba(255,215,0,.45)" : "rgba(255,255,255,.07)"}`,
      borderRadius:14, padding:"16px 18px", cursor:"pointer", textAlign:"left",
      transition:"all .2s", width:"100%", fontFamily:"inherit",
      boxShadow: selected ? "0 0 0 1px rgba(255,215,0,.15),0 4px 24px rgba(255,215,0,.1)" : "none",
    }}>
      {/* Status pill + name */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
        {isLive && (
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:700, color:"#22C55E", letterSpacing:".08em" }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"#22C55E", animation:"lb-pulse 1.5s infinite", display:"inline-block" }}/>
            LIVE
          </span>
        )}
        {isReg && (
          <span style={{ background:"rgba(255,215,0,.1)", border:"1px solid rgba(255,215,0,.2)", borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:700, color:"#FFD700", letterSpacing:".08em" }}>
            OPEN
          </span>
        )}
        {!isLive && !isReg && (
          <span style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:600, color:"rgba(255,255,255,.4)", letterSpacing:".06em" }}>
            ENDED
          </span>
        )}
      </div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color: selected ? "#FFD700" : "#fff", marginBottom:10, lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {t.name}
      </div>
      {/* Stats row */}
      <div style={{ display:"flex", gap:16, marginBottom:10, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", color:"rgba(255,255,255,.25)", textTransform:"uppercase", marginBottom:2 }}>Pool</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color:"#FFD700", lineHeight:1 }}>${fmt(pool,0)}</div>
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", color:"rgba(255,255,255,.25)", textTransform:"uppercase", marginBottom:2 }}>Entry</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color:"rgba(255,255,255,.6)", lineHeight:1 }}>${fmt(parseFloat(t.entry_fee||0),0)}</div>
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", color:"rgba(255,255,255,.25)", textTransform:"uppercase", marginBottom:2 }}>Traders</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color: isLive?"#22C55E":"rgba(255,255,255,.6)", lineHeight:1 }}>{entries}/{max}</div>
        </div>
      </div>
      {/* Fill bar */}
      <div style={{ height:3, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:2, width:`${fill}%`,
          background: isLive ? "#22C55E" : isReg ? "#FFD700" : "rgba(255,255,255,.2)",
          transition:"width .6s" }}/>
      </div>
    </button>
  );
}

function LeaderboardContent() {
  const params   = useSearchParams();
  const tParam   = params.get("t");
  const [liveTours,   setLive]  = useState<any[]>([]);
  const [regTours,    setReg]   = useState<any[]>([]);
  const [endedTours,  setEnded] = useState<any[]>([]);
  const [sectionTab,  setSectionTab] = useState<"live"|"registration"|"ended">("live");
  const [selected,  setSelected] = useState<string>(tParam || "");
  const [leaders,   setLeaders]  = useState<any[]>([]);
  const [tournament,setTournament] = useState<any>(null);
  const [loading,   setLoading]  = useState(false);
  const [lastUpd,   setLastUpd]  = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    Promise.all([
      tournamentApi.getAll("active"),
      tournamentApi.getAll("registration"),
      tournamentApi.getAll("ended"),
    ]).then(([active, reg, ended]) => {
      setLive(active   || []);
      setReg(reg       || []);
      setEnded(ended   || []);

      // Auto-select: prefer the tParam, else first live, else first reg, else first ended
      if (!selected) {
        const first = tParam
          ? [...active,...reg,...ended].find((t: any) => t.id === tParam)
          : (active[0] || reg[0] || ended[0]);
        if (first) {
          setSelected(first.id);
          // Set the right tab
          if (active.find((t: any) => t.id === first.id)) setSectionTab("live");
          else if (reg.find((t: any) => t.id === first.id)) setSectionTab("registration");
          else setSectionTab("ended");
        }
      }
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

  const currentList = sectionTab === "live" ? liveTours : sectionTab === "registration" ? regTours : endedTours;

  const TABS = [
    { id: "live" as const,         label: "🔴 Live",         count: liveTours.length,  color: "#22C55E" },
    { id: "registration" as const, label: "🟡 Registration", count: regTours.length,   color: "#FFD700" },
    { id: "ended" as const,        label: "⚪ Ended",        count: endedTours.length, color: "rgba(255,255,255,.45)" },
  ];

  return (
    <div style={{ background:"#030508", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @keyframes lb-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.5);}}
        @keyframes lb-fadein{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        .lb-container{max-width:1200px;margin:0 auto;padding:0 32px;}
        .lb-main{display:grid;grid-template-columns:320px 1fr;gap:28px;align-items:start;}
        .lb-row{display:grid;grid-template-columns:52px 1fr 120px 110px 90px 80px 72px 80px;gap:0;
          padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.04);
          transition:background .15s;align-items:center;}
        .lb-row:hover{background:rgba(255,255,255,.025);}
        .lb-row.rank-1{background:rgba(255,215,0,.03);}
        .lb-row.rank-1:hover{background:rgba(255,215,0,.055);}
        .lb-th{display:grid;grid-template-columns:52px 1fr 120px 110px 90px 80px 72px 80px;gap:0;
          padding:10px 20px;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.05);}
        .lb-battle-grid{display:flex;flex-direction:column;gap:10px;}
        .section-tab{padding:9px 18px;border-radius:9px;border:1px solid;font-size:13px;font-weight:700;
          cursor:pointer;transition:all .18s;font-family:inherit;display:flex;align-items:center;gap:7px;}
        .section-tab-count{font-size:11px;padding:1px 7px;border-radius:20px;font-weight:800;}
        .leader-card{background:linear-gradient(135deg,rgba(255,215,0,.07),rgba(255,100,0,.04),rgba(34,197,94,.03));
          border:1px solid rgba(255,215,0,.25);border-radius:18px;padding:24px 28px;
          position:relative;overflow:hidden;margin-bottom:20px;}
        .leader-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
          background:linear-gradient(90deg,#FFD700,#FFA500,#22C55E);}
        .leader-glow{position:absolute;right:-30px;top:-30px;width:140px;height:140px;border-radius:50%;
          background:radial-gradient(circle,rgba(255,215,0,.08),transparent 70%);pointer-events:none;}
        .stat-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px;}
        .stat-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px;}
        @media(max-width:1000px){
          .lb-container{padding:0 16px;}
          .lb-main{grid-template-columns:1fr;}
          .lb-row{grid-template-columns:44px 1fr 90px 80px;}
          .lb-th{grid-template-columns:44px 1fr 90px 80px;}
          .lb-col-hide{display:none;}
          .stat-strip{grid-template-columns:1fr 1fr 1fr;}
        }
        @media(max-width:560px){
          .lb-row{grid-template-columns:40px 1fr 80px;padding:10px 12px;}
          .lb-th{grid-template-columns:40px 1fr 80px;}
          .lb-col-hide2{display:none;}
          .stat-strip{grid-template-columns:1fr 1fr;}
        }
      `}</style>

      {/* ── HERO ── */}
      <div style={{ position:"relative", overflow:"hidden",
        background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,215,0,.07) 0%,transparent 55%)",
        borderBottom:"1px solid rgba(255,255,255,.06)", paddingTop:48, paddingBottom:36 }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage:"linear-gradient(rgba(255,215,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,.025) 1px,transparent 1px)",
          backgroundSize:"60px 60px",
          maskImage:"radial-gradient(ellipse 80% 100% at 50% 0%,black 20%,transparent 70%)" as any }}/>
        <div className="lb-container" style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".2em", textTransform:"uppercase",
            color:"rgba(255,215,0,.6)", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ display:"block", width:28, height:1, background:"rgba(255,215,0,.6)" }}/>
            Live Rankings
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(52px,7vw,96px)",
            letterSpacing:"3px", lineHeight:.9, margin:0,
            background:"linear-gradient(135deg,#fff 30%,rgba(255,255,255,.6) 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            LEADERBOARD
          </h1>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.35)", marginTop:12, fontWeight:300 }}>
            Select a battle to view live rankings
          </p>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN LAYOUT ── */}
      <div className="lb-container" style={{ paddingTop:28, paddingBottom:64 }}>
        <div className="lb-main">

          {/* LEFT — Battle picker */}
          <div style={{ position:"sticky", top:80 }}>

            {/* Section tabs */}
            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
              {TABS.map(tab => {
                const active = sectionTab === tab.id;
                return (
                  <button key={tab.id} className="section-tab"
                    onClick={() => setSectionTab(tab.id)}
                    style={{
                      background: active ? `${tab.color}12` : "transparent",
                      borderColor: active ? `${tab.color}45` : "rgba(255,255,255,.08)",
                      color: active ? tab.color : "rgba(255,255,255,.38)",
                      flex:1,
                    }}>
                    {tab.label}
                    <span className="section-tab-count"
                      style={{ background: active ? `${tab.color}20` : "rgba(255,255,255,.06)", color: active ? tab.color : "rgba(255,255,255,.3)" }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Battle cards list */}
            <div className="lb-battle-grid">
              {currentList.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 20px", border:"1px dashed rgba(255,255,255,.08)", borderRadius:14 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>
                    {sectionTab === "live" ? "⚔️" : sectionTab === "registration" ? "🟡" : "📋"}
                  </div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color:"rgba(255,255,255,.3)", marginBottom:6 }}>
                    {sectionTab === "live" ? "NO LIVE BATTLES" : sectionTab === "registration" ? "NO OPEN BATTLES" : "NO ENDED BATTLES"}
                  </div>
                  {sectionTab !== "ended" && (
                    <Link href="/tournaments" className="btn btn-primary btn-sm" style={{ marginTop:8, display:"inline-block" }}>
                      Browse Battles →
                    </Link>
                  )}
                </div>
              ) : (
                currentList.map((t: any) => (
                  <div key={t.id} style={{ animation:"lb-fadein .35s ease both" }}>
                    <BattleCard t={t} selected={selected === t.id} onClick={() => setSelected(t.id)} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT — Leaderboard */}
          <div>
            {!selected ? (
              <div style={{ textAlign:"center", padding:"80px 32px", border:"1px dashed rgba(255,255,255,.07)", borderRadius:18 }}>
                <div style={{ fontSize:48, marginBottom:16 }}>👈</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:"2px", color:"rgba(255,255,255,.3)" }}>
                  SELECT A BATTLE
                </div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.2)", marginTop:8 }}>
                  Pick any battle from the left to view its leaderboard
                </div>
              </div>
            ) : loading ? (
              <div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}>
                <div className="spinner"/>
              </div>
            ) : (
              <div style={{ animation:"lb-fadein .4s ease both" }}>

                {/* Stat strip */}
                {tournament && (
                  <div className="stat-strip">
                    {[
                      { label:"Prize Pool",  value:`$${fmt(totalPrize,0)}`,  color:"#FFD700" },
                      { label:"1st Prize",   value:`$${fmt(winner90,0)}`,    color:"#22C55E" },
                      { label:"Entry Fee",   value:`$${fmt(parseFloat(tournament.entry_fee||0),0)}`, color:"rgba(255,255,255,.7)" },
                      { label:"Traders",     value:`${active_entries}/${max_entries}`, color:isActive?"#22C55E":"rgba(255,255,255,.55)" },
                      { label:"Status",      value:isActive ? (countdown||"LIVE") : tournament.status?.toUpperCase(), color:isActive?"#22C55E":tournament.status==="registration"?"#FFD700":"rgba(255,255,255,.4)" },
                    ].map(s => (
                      <div key={s.label} className="stat-card">
                        <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.28)", marginBottom:8 }}>{s.label}</div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:"1px", lineHeight:1, color:s.color }}>{s.value}</div>
                        {s.label === "Traders" && (
                          <div style={{ height:3, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden", marginTop:8 }}>
                            <div style={{ height:"100%", borderRadius:2, background:"linear-gradient(90deg,#FFD700,#FFA500)", width:`${fillPct}%` }}/>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Leader spotlight */}
                {leader && (
                  <div className="leader-card">
                    <div className="leader-glow"/>
                    <div style={{ display:"flex", gap:20, alignItems:"center", flexWrap:"wrap", position:"relative", zIndex:1 }}>
                      <div style={{ fontSize:44, filter:"drop-shadow(0 0 14px rgba(255,215,0,.4))" }}>🏆</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", color:"rgba(255,215,0,.65)", marginBottom:5 }}>Current Leader</div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(24px,3.5vw,38px)", letterSpacing:"2px", lineHeight:1, color:"#fff", marginBottom:6 }}>
                          {(leader.display_name || leader.username || `Trader #${leader.entry_number}`).toUpperCase()}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, background:"rgba(255,215,0,.1)", border:"1px solid rgba(255,215,0,.2)", borderRadius:20, padding:"2px 10px", color:"rgba(255,215,0,.8)", textTransform:"capitalize" }}>
                            {leader.broker||"Exness"}
                          </span>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"rgba(255,255,255,.3)" }}>
                            {leader.mt5_login ? `MT5 ***${String(leader.mt5_login).slice(-3)}` : `Entry #${leader.entry_number}`}
                          </span>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
                        {[
                          { l:"% GAIN",    v:`${leaderPct>=0?"+":""}${fmt(leaderPct)}%`,        c:"#22C55E", big:true },
                          { l:"PROFIT",    v:`$${fmt(Math.abs(parseFloat(leader.profit_abs||0)))}`, c:"#FFD700", big:false },
                          { l:"WIN RATE",  v:`${leader.win_rate||0}%`,                          c:"rgba(255,255,255,.65)", big:false },
                          { l:"TRADES",    v:String(leader.total_trades||0),                    c:"rgba(255,255,255,.4)", big:false },
                        ].map(s => (
                          <div key={s.l} style={{ textAlign:"center" }}>
                            <div style={{ fontSize:9, fontWeight:700, letterSpacing:".15em", color:"rgba(255,255,255,.28)", marginBottom:5 }}>{s.l}</div>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:s.big?34:22, letterSpacing:"1px", lineHeight:1, color:s.c }}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div style={{ background:"rgba(8,13,21,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, overflow:"hidden" }}>
                  <div className="lb-th">
                    {["#","TRADER","% GAIN","NET PROFIT","BALANCE","WIN RATE","TRADES","STATUS"].map((h, i) => (
                      <div key={h} className={i>=4?"lb-col-hide":i===6?"lb-col-hide lb-col-hide2":""}
                        style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", color:"rgba(255,255,255,.22)" }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  {leaders.length === 0 ? (
                    <div style={{ padding:"64px 24px", textAlign:"center" }}>
                      <div style={{ fontSize:40, marginBottom:14 }}>⚔️</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:"2px", color:"rgba(255,255,255,.35)", marginBottom:8 }}>NO TRADERS YET</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,.2)", marginBottom:20 }}>Be the first to join this battle</div>
                      <Link href="/tournaments" className="btn btn-primary">Join a Battle →</Link>
                    </div>
                  ) : leaders.map((entry: any, i: number) => {
                    const pos  = parseInt(entry.position || i+1);
                    const pct  = parseFloat(entry.profit_pct || 0);
                    const bal  = parseFloat(entry.current_balance || 1000);
                    const wr   = parseInt(entry.win_rate || 0);
                    const profAbs = parseFloat(entry.profit_abs || 0);
                    const initial = (entry.display_name||entry.username||"T")[0].toUpperCase();
                    const tierColor = pos===1?"#FFD700":pos===2?"rgba(192,192,192,.8)":pos===3?"rgba(205,127,50,.8)":"rgba(255,255,255,.38)";
                    return (
                      <div key={entry.id} style={{ animation:`lb-fadein .35s ${i*0.04}s ease both` }}>
                        <div className={`lb-row${pos===1?" rank-1":""}`}>
                          <div style={{ display:"flex", alignItems:"center" }}><RankBadge pos={pos}/></div>
                          <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
                            <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background:`${tierColor}18`, border:`1.5px solid ${tierColor}40`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:tierColor }}>
                              {initial}
                            </div>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontSize:14, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                {entry.display_name || entry.username || `Trader #${entry.entry_number}`}
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)", borderRadius:20, padding:"1px 8px", color:"rgba(255,255,255,.4)", textTransform:"capitalize" }}>
                                  {entry.broker||"Exness"}
                                </span>
                                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"rgba(255,255,255,.28)", letterSpacing:".04em" }}>
                                  {entry.mt5_login ? `***${String(entry.mt5_login).slice(-3)}` : `#${entry.entry_number}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:"1px", color:col(pct), lineHeight:1 }}>
                              {pct>=0?"+":""}{fmt(pct)}%
                            </div>
                            <MiniBar pct={pct} color={col(pct)}/>
                          </div>
                          <div className="lb-col-hide2" style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, color:col(profAbs) }}>
                            {profAbs>=0?"+":""}{fmt(Math.abs(profAbs))}
                          </div>
                          <div className="lb-col-hide" style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"rgba(255,255,255,.5)" }}>
                            ${fmt(bal,0)}
                          </div>
                          <div className="lb-col-hide" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:".5px", color:wr>=50?"#22C55E":wr>0?"#fbbf24":"rgba(255,255,255,.25)" }}>
                            {wr>0?`${wr}%`:"—"}
                          </div>
                          <div className="lb-col-hide" style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>
                            {entry.total_trades||0}
                          </div>
                          <div className="lb-col-hide">
                            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, padding:"3px 10px", borderRadius:20, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase",
                              background:entry.status==="active"?"rgba(34,197,94,.1)":"rgba(255,255,255,.04)",
                              color:entry.status==="active"?"#22C55E":"rgba(255,255,255,.35)",
                              border:`1px solid ${entry.status==="active"?"rgba(34,197,94,.2)":"rgba(255,255,255,.07)"}` }}>
                              {entry.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                {leaders.length > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, fontSize:11, color:"rgba(255,255,255,.2)", flexWrap:"wrap", gap:8 }}>
                    <span>{leaders.length} traders · ranked by % gain on $1,000</span>
                    {lastUpd && (
                      <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"#22C55E", display:"inline-block", animation:"lb-pulse 2s infinite" }}/>
                        Updated {lastUpd.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", background:"#030508" }}><div className="spinner"/></div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
