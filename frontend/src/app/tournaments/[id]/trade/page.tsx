"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { entryApi } from "@/lib/api";
import { useEntrySocket } from "@/hooks/useSockets";
import MFTLogo from "@/components/ui/MFTLogo";

const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";

function SidebarIcon({ d }: { d: React.ReactNode }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">{d}</svg>;
}

function Sidebar({ tournamentId }: { tournamentId: string }) {
  const pathname = usePathname();
  const nav = [
    { href:`/tournaments/${tournamentId}/trade`, label:"Dashboard", icon:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></> },
    { href:`/tournaments/${tournamentId}`,       label:"My Entries",  icon:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/> },
    { href:"/leaderboard",                       label:"Leaderboard", icon:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> },
    { href:"/tournaments",                       label:"Tournaments",  icon:<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
  ];
  return (
    <div style={{ width:220, background:"#07090f", borderRight:"1px solid rgba(255,255,255,.055)", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
          <MFTLogo size={28}/>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:900, fontSize:13, letterSpacing:"-.3px" }}>
            <span style={{ color:"#fff" }}>MyFunded</span><span style={{ color:"var(--gold)" }}>Tournament</span>
          </div>
        </div>
        <div className="tagline-shine-wrap"><span className="tagline-shine" style={{ fontSize:9, letterSpacing:".04em" }}>Compete Demo. Win Real Funding.</span></div>
      </div>
      <div style={{ paddingTop:8 }}>
        <div style={{ padding:"14px 16px 5px", fontSize:9, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.22)" }}>Trading</div>
        {nav.map(n => (
          <Link key={n.href} href={n.href} className={`sb-nav-item${pathname === n.href ? " active" : ""}`}>
            <SidebarIcon d={n.icon}/>{n.label}
          </Link>
        ))}
        <div style={{ padding:"14px 16px 5px", fontSize:9, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.22)", marginTop:10 }}>Account</div>
        <Link href="/profile" className={`sb-nav-item${pathname==="/profile"?" active":""}`}>
          <SidebarIcon d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}/>Profile
        </Link>
      </div>
    </div>
  );
}

function MiniEquityChart({ history }: { history: any[] }) {
  if (!history || history.length < 2) return (
    <div style={{ height:60, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.15)", fontSize:11 }}>No trade history yet</div>
  );
  const startBal = 1000;
  let running = startBal;
  const pts: {x:number,y:number,profit:number}[] = [{x:0,y:startBal,profit:0}];
  const sorted = [...history].sort((a,b)=>new Date(a.close_time||a.open_time).getTime()-new Date(b.close_time||b.open_time).getTime());
  sorted.forEach((t,i) => { running += parseFloat(t.profit||0); pts.push({x:i+1,y:running,profit:parseFloat(t.profit||0)}); });
  const maxY = Math.max(...pts.map(p=>p.y)); const minY = Math.min(...pts.map(p=>p.y));
  const rangeY = maxY - minY || 1; const w=560, h=80;
  const toSvg = (p:{x:number,y:number}) => `${(p.x/(pts.length-1||1))*w},${h-((p.y-minY)/rangeY)*(h-6)-3}`;
  const path = pts.map(toSvg).join(" ");
  const isUp = pts[pts.length-1].y >= startBal;
  const col = isUp ? "#22C55E" : "#EF4444";
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id="ecg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={col} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      {[20,40,60].map(y=><line key={y} x1="0" y1={y} x2={w} y2={y} stroke="rgba(255,255,255,.04)" strokeWidth="1"/>)}
      <line x1="0" y1={h-((startBal-minY)/rangeY)*(h-6)-3} x2={w} y2={h-((startBal-minY)/rangeY)*(h-6)-3} stroke="rgba(255,255,255,.1)" strokeWidth="1" strokeDasharray="4,4"/>
      <polyline points={`0,${h} ${path} ${w},${h}`} fill="url(#ecg)" stroke="none"/>
      <polyline points={path} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={(pts.length-1)/(pts.length-1||1)*w} cy={parseFloat(toSvg(pts[pts.length-1]).split(",")[1])} r="4" fill={col}/>
    </svg>
  );
}

function ProfitDistribution({ trades }: { trades: any[] }) {
  const closed = trades.filter(t=>t.close_time&&t.close_time!=="0001-01-01 00:00:00");
  if (!closed.length) return null;
  const wins = closed.filter(t=>parseFloat(t.profit||0)>0);
  const losses = closed.filter(t=>parseFloat(t.profit||0)<0);
  const maxProfit = Math.max(...closed.map(t=>Math.abs(parseFloat(t.profit||0))),1);
  return (
    <div style={{ display:"flex", gap:2, alignItems:"flex-end", height:40 }}>
      {closed.slice(-30).map((t,i)=>{
        const p = parseFloat(t.profit||0);
        const h = Math.max((Math.abs(p)/maxProfit)*40,2);
        return <div key={i} style={{ flex:1, height:h, background:p>=0?"#22C55E":"#EF4444", borderRadius:"1px 1px 0 0", opacity:.7, minWidth:2 }} title={`${p>=0?"+":""}$${p.toFixed(2)}`}/>;
      })}
    </div>
  );
}

export default function TradePage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const entryId = params.get("entry") || "";
  const [data, setData]       = useState<any>(null);
  const [mt5, setMt5]         = useState<any>(null);
  const [tab, setTab]         = useState<"open"|"closed"|"violations">("open");
  const [lastSync, setLastSync] = useState<Date|null>(null);
  const [syncAge, setSyncAge]  = useState(0);
  const liveEntry = useEntrySocket(entryId);

  // Base entry data
  useEffect(() => {
    if (!entryId) return;
    entryApi.getById(entryId).then(setData).catch(console.error);
  }, [entryId]);

  // Live MT5 data every 10s
  useEffect(() => {
    if (!entryId) return;
    const fetchMt5 = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
      fetch(`${API}/api/entries/${entryId}/mt5`, {
        headers: token ? { Authorization:`Bearer ${token}` } : {}
      }).then(r=>r.ok?r.json():null).then(d=>{
        if (d && !d.error) { setMt5(d); setLastSync(new Date()); }
      }).catch(()=>{});
    };
    fetchMt5();
    const iv = setInterval(fetchMt5, 10000);
    return () => clearInterval(iv);
  }, [entryId]);

  // Update sync age display every second
  useEffect(() => {
    const iv = setInterval(() => {
      if (lastSync) setSyncAge(Math.round((Date.now()-lastSync.getTime())/1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [lastSync]);

  const entry = liveEntry || data?.entry;
  const violations = data?.violations || [];
  const live = mt5 || null;
  const openTrades: any[]   = live?.open_trades   || [];
  const closedTrades: any[] = live?.trade_history  || [];
  const allTrades           = [...openTrades, ...closedTrades];

  const startBal    = parseFloat(entry?.starting_balance || 1000);
  const balance     = live?.balance     ?? entry?.current_balance  ?? 1000;
  const equity      = live?.equity      ?? entry?.current_equity   ?? balance;
  const profitAbs   = Math.round((balance - startBal) * 100) / 100;
  const profitPct   = Math.round((profitAbs / startBal) * 10000) / 100;
  const unrealized  = Math.round((equity - balance) * 100) / 100;
  const winRate     = live?.win_rate    ?? (closedTrades.length > 0 ? Math.round(closedTrades.filter((t:any)=>parseFloat(t.profit||0)>0).length/closedTrades.length*100) : 0);
  const maxDD       = live?.max_drawdown ?? entry?.max_drawdown_pct ?? 0;
  const wins        = closedTrades.filter((t:any)=>parseFloat(t.profit||0)>0).length;
  const losses      = closedTrades.filter((t:any)=>parseFloat(t.profit||0)<0).length;
  const avgWin      = wins>0 ? closedTrades.filter((t:any)=>parseFloat(t.profit||0)>0).reduce((s:number,t:any)=>s+parseFloat(t.profit||0),0)/wins : 0;
  const avgLoss     = losses>0 ? Math.abs(closedTrades.filter((t:any)=>parseFloat(t.profit||0)<0).reduce((s:number,t:any)=>s+parseFloat(t.profit||0),0)/losses) : 0;
  const profitFactor = avgLoss > 0 ? Math.round(avgWin / avgLoss * 100) / 100 : wins > 0 ? 999 : 0;
  const totalPnl    = closedTrades.reduce((s:number,t:any)=>s+parseFloat(t.profit||0),0);
  const bestTrade   = closedTrades.length > 0 ? Math.max(...closedTrades.map((t:any)=>parseFloat(t.profit||0))) : 0;
  const worstTrade  = closedTrades.length > 0 ? Math.min(...closedTrades.map((t:any)=>parseFloat(t.profit||0))) : 0;

  const displayTrades = tab==="open" ? openTrades : tab==="closed" ? closedTrades : [];

  const slots = [{s:"done",n:1},{s:"active",n:2},{s:"empty",n:3},{s:"empty",n:4},{s:"empty",n:5},{s:"divider",n:0},{s:"locked",n:6},{s:"locked",n:7},{s:"locked",n:8},{s:"locked",n:9},{s:"locked",n:10}];

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 64px)" }}>
      <Sidebar tournamentId={id}/>
      <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>

        {/* Top bar */}
        <div style={{ background:"rgba(7,9,15,.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,.055)", padding:"0 28px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-.3px", color:"#fff" }}>
              {entry?.tournament_name || "Tournament"} — Entry #{entry?.entry_number ?? 1}
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.32)", marginTop:2 }}>
              {entry?.broker || "Exness"} · MT5 {entry?.mt5_login || "—"} · C# Bridge · {lastSync ? `${syncAge}s ago` : "Connecting..."}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {live ? <span className="pill pill-green"><span className="live-dot" style={{ marginRight:5, width:5, height:5 }}/>Live</span> : <span className="pill pill-gray">Connecting</span>}
            <button className="btn btn-primary btn-sm">+ Re-enter</button>
          </div>
        </div>

        <div style={{ padding:"20px 28px 40px" }}>

          {/* Re-entry strip */}
          <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,.05),rgba(255,215,0,.02))", border:"1px solid rgba(255,215,0,.14)", borderRadius:12, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--gold)", marginBottom:3 }}>Re-entry — 1 original + 1 re-entry allowed</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>Re-entry unlocks only after your first entry is breached</div>
            </div>
            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
              {slots.map((s,i)=>s.s==="divider"?<div key={i} style={{ width:1, height:22, background:"rgba(255,255,255,.1)", margin:"0 4px" }}/>:<div key={i} className={`slot slot-${s.s}`}>{s.n}</div>)}
            </div>
          </div>

          {/* 6 main stat cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:18 }}>
            {[
              { label:"% Gain", value:`${profitPct>=0?"+":""}${profitPct.toFixed(2)}%`, sub:"Rank metric", color:"var(--green)", cls:"green" },
              { label:"Net Profit", value:`${profitAbs>=0?"+":""}$${Math.abs(profitAbs).toFixed(2)}`, sub:`From $${startBal.toLocaleString()} balance`, color:"var(--gold)", cls:"gold" },
              { label:"Balance", value:`$${parseFloat(balance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub:`Equity $${parseFloat(equity).toFixed(2)}`, color:"var(--text)", cls:"plain" },
              { label:"Unrealized P&L", value:`${unrealized>=0?"+":""}$${unrealized.toFixed(2)}`, sub:`${openTrades.length} open position${openTrades.length!==1?"s":""}`, color:unrealized>=0?"var(--green)":"var(--red)", cls:unrealized>=0?"green":"red" },
              { label:"Win Rate", value:`${winRate}%`, sub:`${wins}W · ${losses}L · ${closedTrades.length} trades`, color:"var(--blue)", cls:"blue" },
              { label:"Max Drawdown", value:`-${Math.abs(maxDD).toFixed(1)}%`, sub:"Limit: 100% · Safe", color:"var(--red)", cls:"red" },
            ].map(s=>(
              <div key={s.label} className={`stat-card stat-card-${s.cls}`}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color:s.color, fontSize:s.value.length>8?"16px":"20px" }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Equity curve + Objectives */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, marginBottom:16 }}>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Equity Curve</span>
                <div style={{ display:"flex", gap:8 }}>
                  <span className="pill pill-gray" style={{ fontSize:10 }}>${startBal.toLocaleString()} start</span>
                  <span className={`pill pill-${profitPct>=0?"green":"red"}`} style={{ fontSize:10 }}>{profitPct>=0?"+":""}{profitPct.toFixed(2)}%</span>
                </div>
              </div>
              <div style={{ padding:"14px 20px 10px" }}>
                <MiniEquityChart history={closedTrades}/>
                <div style={{ marginTop:10 }}>
                  <ProfitDistribution trades={allTrades}/>
                  {closedTrades.length>0&&<div style={{ fontSize:9, color:"rgba(255,255,255,.2)", marginTop:4 }}>Last {Math.min(closedTrades.length,30)} closed trades</div>}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><span className="panel-title">Objectives</span><span className={`pill pill-${violations.length>0?"red":"green"}`} style={{ fontSize:10 }}>{violations.length>0?`${violations.length} issues`:"All clear"}</span></div>
              {[
                { name:"Min 31s trade duration", result:closedTrades.length>0?`${closedTrades.length} valid`:"No trades", status:"pass" },
                { name:"No hedging", result:"Clean", status:"pass" },
                { name:"No external deposit", result:"Clean", status:"pass" },
                { name:"Close all 3min early", result:"Required", status:"warn" },
              ].map(o=>(
                <div key={o.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{o.name}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:o.status==="warn"?"var(--gold)":"var(--green)" }}>{o.result}</span>
                    <div className={`obj-tick tick-${o.status}`}>
                      {o.status==="warn"
                        ?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="var(--gold)" stroke="none"/></svg>
                        :<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats 3-col + Comparison chart */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            {/* Advanced stats */}
            <div className="panel">
              <div className="panel-head"><span className="panel-title">Trading Statistics</span></div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1px", background:"rgba(255,255,255,.05)" }}>
                {[
                  ["Profit Factor", profitFactor>0?profitFactor.toFixed(2):"—", profitFactor>=1.5?"var(--green)":"var(--text)"],
                  ["Win Rate", `${winRate}%`, winRate>=50?"var(--green)":"var(--red)"],
                  ["Avg Win", avgWin>0?`+$${avgWin.toFixed(2)}`:"—", "var(--green)"],
                  ["Avg Loss", avgLoss>0?`-$${avgLoss.toFixed(2)}`:"—", "var(--red)"],
                  ["Best Trade", bestTrade>0?`+$${bestTrade.toFixed(2)}`:"—", "var(--green)"],
                  ["Worst Trade", worstTrade<0?`-$${Math.abs(worstTrade).toFixed(2)}`:"—", "var(--red)"],
                  ["Total Closed", closedTrades.length.toString(), "var(--text)"],
                  ["Open Now", openTrades.length.toString(), openTrades.length>0?"var(--blue)":"var(--text)"],
                  ["Max Drawdown", `-${Math.abs(maxDD).toFixed(1)}%`, maxDD>15?"var(--red)":maxDD>5?"var(--gold)":"var(--green)"],
                ].map(([l,v,c])=>(
                  <div key={l} style={{ background:"#0d1118", padding:"12px 14px" }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"rgba(255,255,255,.28)", fontFamily:"var(--font-mono)", marginBottom:4 }}>{l}</div>
                    <div style={{ fontFamily:"var(--font-head)", fontSize:16, fontWeight:800, letterSpacing:"-.5px", color:c as string }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* P&L by symbol */}
            <div className="panel">
              <div className="panel-head"><span className="panel-title">P&L by Symbol</span><span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{closedTrades.length} trades</span></div>
              <div style={{ padding:"14px 20px" }}>
                {(() => {
                  const bySymbol: Record<string,{profit:number,count:number}> = {};
                  closedTrades.forEach((t:any)=>{
                    const sym = t.symbol||"Unknown";
                    if(!bySymbol[sym]) bySymbol[sym]={profit:0,count:0};
                    bySymbol[sym].profit += parseFloat(t.profit||0);
                    bySymbol[sym].count++;
                  });
                  const sorted = Object.entries(bySymbol).sort((a,b)=>Math.abs(b[1].profit)-Math.abs(a[1].profit)).slice(0,6);
                  if(!sorted.length) return <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12, padding:"20px 0" }}>No closed trades yet</div>;
                  const maxAbs = Math.max(...sorted.map(([,v])=>Math.abs(v.profit)),1);
                  return sorted.map(([sym,{profit,count}])=>(
                    <div key={sym} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:700, fontFamily:"var(--font-mono)", color:"var(--text)" }}>{sym}</span>
                        <div style={{ textAlign:"right" }}>
                          <span style={{ fontSize:12, fontWeight:700, color:profit>=0?"var(--green)":"var(--red)" }}>{profit>=0?"+":""}${profit.toFixed(2)}</span>
                          <span style={{ fontSize:10, color:"rgba(255,255,255,.28)", marginLeft:6 }}>{count} trade{count!==1?"s":""}</span>
                        </div>
                      </div>
                      <div style={{ height:4, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(Math.abs(profit)/maxAbs)*100}%`, background:profit>=0?"#22C55E":"#EF4444", borderRadius:2 }}/>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Trade journal */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Trade Journal</span>
              <div style={{ display:"flex", gap:6 }}>
                {(["open","closed","violations"] as const).map(t=>{
                  const count = t==="open"?openTrades.length:t==="closed"?closedTrades.length:violations.length;
                  return (
                    <button key={t} onClick={()=>setTab(t)} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"var(--font-body)", background:tab===t?"rgba(255,215,0,.09)":"rgba(255,255,255,.05)", color:tab===t?"var(--gold)":"rgba(255,255,255,.45)" }}>
                      {t.charAt(0).toUpperCase()+t.slice(1)}{count>0?` (${count})`:""}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Pair</th><th>Side</th><th>Lots</th><th>Open</th><th>Close</th><th>Open Time</th><th>P&L</th><th>Status</th></tr></thead>
                <tbody>
                  {tab==="violations" ? (
                    violations.length===0
                      ?<tr><td colSpan={8} style={{ textAlign:"center", color:"rgba(255,255,255,.28)", padding:"28px 0" }}>No violations recorded ✓</td></tr>
                      :violations.map((v:any,i:number)=>(
                        <tr key={i}>
                          <td colSpan={6} style={{ color:"var(--red)", fontWeight:600 }}>{v.rule_name||v.type}</td>
                          <td className="mono neg">{v.description||"—"}</td>
                          <td><span className="pill pill-red" style={{ fontSize:9 }}>Violation</span></td>
                        </tr>
                      ))
                  ) : displayTrades.length===0 ? (
                    <tr><td colSpan={8} style={{ textAlign:"center", color:"rgba(255,255,255,.28)", padding:"28px 0" }}>
                      {!live?"Connecting to MT5 bridge...":tab==="open"?"No open positions":"No closed trades yet"}
                    </td></tr>
                  ) : displayTrades.map((t:any,i:number)=>{
                    const isOpen = tab==="open";
                    const side = (t.type||t.side||"buy").toString().toLowerCase();
                    const isBuy = side.includes("buy")||side==="0";
                    const pnl = parseFloat(t.profit??0);
                    return (
                      <tr key={i}>
                        <td style={{ color:"var(--text)", fontWeight:700, fontFamily:"var(--font-mono)" }}>{t.symbol||"—"}</td>
                        <td><span className={`pill pill-${isBuy?"green":"red"}`} style={{ fontSize:9 }}>{isBuy?"BUY":"SELL"}</span></td>
                        <td className="mono">{parseFloat(t.lots??t.volume??0).toFixed(2)}</td>
                        <td className="mono" style={{ color:"rgba(255,255,255,.6)" }}>{t.open_price||"—"}</td>
                        <td className="mono" style={{ color:"rgba(255,255,255,.6)" }}>{isOpen?"—":(t.close_price||"—")}</td>
                        <td style={{ color:"rgba(255,255,255,.4)", fontSize:11 }}>{t.open_time?String(t.open_time).slice(5,16):"—"}</td>
                        <td className={`mono ${pnl>=0?"pos":"neg"}`}>{pnl>=0?"+":""}${pnl.toFixed(2)}</td>
                        <td><span className={`pill pill-${isOpen?"blue":"green"}`} style={{ fontSize:9 }}>{isOpen?"Open ✓":"Closed ✓"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,.05)", fontSize:10, color:"rgba(255,255,255,.28)", display:"flex", justifyContent:"space-between" }}>
              <span>{live?"Live via C# Bridge · updates every 10s":"Waiting for bridge..."} {lastSync?`· synced ${syncAge}s ago`:""}</span>
              <span style={{ color:"var(--blue)", fontWeight:600 }}>{closedTrades.length} closed · {openTrades.length} open · {violations.length} violations</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
