"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { entryApi } from "@/lib/api";
import { useEntrySocket } from "@/hooks/useSockets";
import MFTLogo from "@/components/ui/MFTLogo";

function SidebarIcon({ d }: { d: React.ReactNode }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">{d}</svg>;
}

function Sidebar({ tournamentId }: { tournamentId: string }) {
  const pathname = usePathname();
  const nav = [
    { href:`/tournaments/${tournamentId}/trade`, label:"Dashboard", icon:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></> },
    { href:`/tournaments/${tournamentId}`,       label:"My Entries",  icon:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/> },
    { href:"/leaderboard",                        label:"Leaderboard", icon:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> },
    { href:"/certificates",                       label:"Certificates", icon:<><rect x="3" y="4" width="18" height="18" rx="2"/><circle cx="12" cy="13" r="3"/><path d="M12 10V6"/></> },
    { href:"/tournaments",                        label:"Tournaments",  icon:<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
  ];
  return (
    <div style={{ width:220, background:"#07090f", borderRight:"1px solid rgba(255,255,255,.055)", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
          <MFTLogo size={28}/>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:900, fontSize:13, letterSpacing:"-.3px" }}>
            <span style={{ color:"#fff" }}>MyFunded</span>
            <span style={{ color:"var(--gold)" }}>Tournament</span>
          </div>
        </div>
        {/* ⭐ FIXED SHINY TAGLINE */}
        <div className="tagline-shine-wrap">
          <span className="tagline-shine" style={{ fontSize:9, letterSpacing:".04em" }}>Compete Demo. Win Real Funding.</span>
        </div>
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
        <Link href="/profile" className="sb-nav-item">
          <SidebarIcon d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>}/>Withdrawals
        </Link>
      </div>

      <div style={{ marginTop:"auto", borderTop:"1px solid rgba(255,255,255,.05)", padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,215,0,.1)", border:"1.5px solid rgba(255,215,0,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"var(--gold)", flexShrink:0 }}>JD</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--text)" }}>John Doe</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.28)" }}>0x4f8a...3e9c</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradePage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const entryId = params.get("entry") || "";
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"open"|"closed"|"violations">("open");
  const liveEntry = useEntrySocket(entryId);

  useEffect(() => {
    if (!entryId) return;
    entryApi.getById(entryId).then(setData).catch(console.error);
    const iv = setInterval(() => entryApi.getById(entryId).then(setData).catch(()=>{}), 60000);
    return () => clearInterval(iv);
  }, [entryId]);

  const entry = liveEntry || data?.entry;
  const trades = data?.trades || [];
  const violations = data?.violations || [];

  // Demo data for visual
  const demoEntry = {
    entry_number:2, broker:"ICMarkets", mt5_login:"8847291",
    profit_pct:18.43, profit_abs:1843, current_balance:11843, current_equity:11920,
    total_trades:25, winning_trades:17, max_drawdown_pct:4.2, excluded_trades:1,
    status:"active"
  };
  const e = entry || demoEntry;
  const winRate = e.total_trades > 0 ? Math.round((e.winning_trades / e.total_trades) * 100) : 68;

  // Re-entry slots
  const slots = [{s:"done",n:1},{s:"active",n:2},{s:"empty",n:3},{s:"empty",n:4},{s:"empty",n:5},{s:"divider",n:0},{s:"locked",n:6},{s:"locked",n:7},{s:"locked",n:8},{s:"locked",n:9},{s:"locked",n:10}];

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 64px)" }}>
      <Sidebar tournamentId={id}/>

      <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>
        {/* Top bar */}
        <div style={{ background:"rgba(7,9,15,.96)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,.055)", padding:"0 28px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-.3px", color:"#fff" }}>December Pro Challenge — Entry #{e.entry_number}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.32)", marginTop:2 }}>{e.broker} · MT5 Account {e.mt5_login} · Synced via MetaApi · Last update 45s ago</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span className="pill pill-green"><span className="live-dot" style={{ marginRight:5, width:5, height:5 }}/>Live</span>
            <div style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, color:"#fff" }}>3d 14h 22m left</div>
            <button className="btn btn-primary btn-sm">+ Re-enter</button>
          </div>
        </div>

        <div style={{ padding:"22px 28px 40px" }}>

          {/* Re-entry strip */}
          <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,.05) 0%,rgba(255,215,0,.02) 100%)", border:"1px solid rgba(255,215,0,.14)", borderRadius:12, padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--gold)", marginBottom:3 }}>Re-entry Slots — 2 used of 10 total · 2 active now</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>Max 5 active at once · Slots 6–10 unlock after first 5 are breached</div>
            </div>
            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
              {slots.map((s,i) => s.s === "divider" ? (
                <div key={i} style={{ width:1, height:22, background:"rgba(255,255,255,.1)", margin:"0 4px" }}/>
              ) : (
                <div key={i} className={`slot slot-${s.s}`}>{s.n}</div>
              ))}
            </div>
          </div>

          {/* 5 stat cards */}
          <div className="grid-5" style={{ marginBottom:20 }}>
            {[
              { label:"% Gain · Rank Metric", value:`+${Number(e.profit_pct).toFixed(2)}%`, sub:"#2 of 27 traders · 3.75% behind 1st", color:"var(--green)", cls:"green" },
              { label:"Net Profit ($)",        value:`+$${Number(e.profit_abs).toLocaleString()}`,    sub:"From $10,000 starting balance",          color:"var(--gold)",  cls:"gold" },
              { label:"Balance · Equity",      value:`$${Number(e.current_balance).toLocaleString()}`,sub:`Equity $${Number(e.current_equity).toLocaleString()} · Unrealized +$77`,color:"var(--text)", cls:"plain" },
              { label:"Win Rate",              value:`${winRate}%`,                                    sub:`${e.winning_trades}W · ${e.total_trades - e.winning_trades}L · ${e.total_trades} trades`, color:"var(--blue)", cls:"blue" },
              { label:"Max Drawdown",          value:`-${Number(e.max_drawdown_pct).toFixed(1)}%`,    sub:"Limit: 100% · Currently safe",           color:"var(--red)",   cls:"red" },
            ].map(s => (
              <div key={s.label} className={`stat-card stat-card-${s.cls}`}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart + Objectives */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16, marginBottom:16 }}>
            {/* Equity chart */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Equity Curve</span>
                <div style={{ display:"flex", gap:8 }}>
                  <span className="pill pill-gray" style={{ fontSize:10, cursor:"pointer" }}>Balance</span>
                  <span className="pill pill-green" style={{ fontSize:10, cursor:"pointer" }}>Equity</span>
                </div>
              </div>
              <div style={{ padding:"14px 20px" }}>
                <svg width="100%" viewBox="0 0 560 155" style={{ overflow:"visible" }}>
                  <defs>
                    <linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.18"/>
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0.01"/>
                    </linearGradient>
                  </defs>
                  {[25,55,85,115].map(y=><line key={y} x1="0" y1={y} x2="560" y2={y} stroke="rgba(255,255,255,.04)" strokeWidth="1"/>)}
                  <line x1="0" y1="100" x2="560" y2="100" stroke="rgba(255,255,255,.1)" strokeWidth="1" strokeDasharray="5,4"/>
                  <text x="4" y="96" fontSize="8.5" fill="rgba(255,255,255,.3)" fontFamily="DM Sans,sans-serif">$10,000 start</text>
                  <path d="M0,98 C30,96 60,100 100,93 C140,86 175,78 215,67 C250,57 285,49 325,40 C360,32 400,33 435,27 C465,21 500,18 530,15 C542,14 554,13 560,12 L560,140 L0,140 Z" fill="url(#gfill)"/>
                  <path d="M0,98 C30,96 60,100 100,93 C140,86 175,78 215,67 C250,57 285,49 325,40 C360,32 400,33 435,27 C465,21 500,18 530,15 C542,14 554,13 560,12" stroke="#22C55E" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                  <circle cx="560" cy="12" r="4.5" fill="#22C55E"/>
                  <circle cx="560" cy="12" r="8" fill="rgba(34,197,94,.18)"/>
                  <text x="4" y="23" fontSize="8" fill="rgba(255,255,255,.25)" fontFamily="DM Sans,sans-serif">$11,843</text>
                  {[["0","Dec 1"],["130","Dec 3"],["268","Dec 5"],["404","Dec 6"],["510","Now"]].map(([x,l])=>(
                    <text key={l} x={x} y="152" fontSize="8" fill="rgba(255,255,255,.22)" fontFamily="DM Sans,sans-serif">{l}</text>
                  ))}
                </svg>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                  <div style={{ display:"flex", gap:14 }}>
                    {[["#22C55E","Equity"],["rgba(255,255,255,.3)","Start $10k"]].map(([c,l])=>(
                      <span key={l} style={{ fontSize:10, color:"rgba(255,255,255,.3)", display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ display:"inline-block", width:14, height:2, background:c, borderRadius:2 }}/>{l}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:"var(--green)" }}>+18.43% · $11,843</span>
                </div>
              </div>
            </div>

            {/* Objectives */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Tournament Objectives</span>
                <span className="pill pill-green" style={{ fontSize:10 }}>3 of 4 pass</span>
              </div>
              {[
                { name:"Min 31s trade duration", desc:"Trades under 31s excluded from % gain", result:"24/25", status:"warn" },
                { name:"No hedging",             desc:"No buy + sell same pair simultaneously", result:"Clean", status:"pass" },
                { name:"No external deposit",    desc:"Balance must not exceed starting value",  result:"Clean", status:"pass" },
                { name:"Account locked at start",desc:"MT5 credentials frozen at start",         result:"Locked",status:"pass" },
              ].map(o => (
                <div key={o.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.75)" }}>{o.name}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.28)", marginTop:2 }}>{o.desc}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:o.status==="warn"?"var(--gold)":"var(--green)" }}>{o.result}</span>
                    <div className={`obj-tick tick-${o.status}`}>
                      {o.status==="warn"
                        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="var(--gold)" stroke="none"/></svg>
                        : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ margin:"10px 16px 14px", background:"rgba(255,215,0,.06)", border:"1px solid rgba(255,215,0,.14)", borderRadius:8, padding:"10px 14px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--gold)", marginBottom:3 }}>1 HFT trade excluded</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.38)", lineHeight:1.5 }}>EUR/GBP sell (18s) excluded from % gain. No disqualification.</div>
              </div>
            </div>
          </div>

          {/* Bottom row: Stats + Leaderboard + Daily */}
          <div className="grid-3" style={{ marginBottom:16 }}>
            {/* Stats 3x3 */}
            <div className="panel">
              <div className="panel-head"><span className="panel-title">Trading Statistics</span></div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1px", background:"rgba(255,255,255,.05)" }}>
                {[["Profit factor","2.14","var(--green)"],["Sharpe ratio","1.82","var(--blue)"],["Win rate","68%","var(--green)"],
                  ["Avg profit","+$148","var(--green)"],["Avg loss","-$69","var(--red)"],["Best trade","+$370","var(--green)"],
                  ["Worst trade","-$118","var(--red)"],["Avg duration","2h 14m","var(--text)"],["Excluded","1","var(--red)"]].map(([l,v,c])=>(
                  <div key={l} style={{ background:"#0d1118", padding:"14px 16px" }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"rgba(255,255,255,.28)", fontFamily:"var(--font-mono)", marginBottom:5 }}>{l}</div>
                    <div style={{ fontFamily:"var(--font-head)", fontSize:18, fontWeight:800, letterSpacing:"-.5px", color:c as string }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Live Leaderboard</span>
                <Link href="/leaderboard" style={{ fontSize:11, color:"var(--blue)", fontWeight:600 }}>Full →</Link>
              </div>
              {[["🥇","0x9a2f...b3c1","Exness · #1","+22.18%","var(--green)",false],
                ["YOU","0x4f8a...3e9c","ICMarkets · #2","+18.43%","var(--gold)",true],
                ["🥈","0x7c1d...a4e2","Tickmill · #1","+15.92%","var(--green)",false],
                ["#4","0xf3b8...c7d5","Exness · #3","+12.07%","var(--green)",false],
                ["#5","0x2e6c...89fa","ICMarkets · #2","+9.44%","var(--green)",false]].map(([r,n,b,p,c,you],i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.04)", background:(you as boolean)?"rgba(255,215,0,.04)":"transparent" }}>
                  <div style={{ fontFamily:"var(--font-head)", fontSize:(you as boolean)?10:13, fontWeight:800, width:26, textAlign:"center", color:(you as boolean)?"var(--gold)":"inherit" }}>{r as string}</div>
                  <div style={{ flex:1, margin:"0 12px" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:(you as boolean)?"var(--gold)":"var(--text)", fontFamily:"var(--font-mono)" }}>{n as string}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.28)", marginTop:1 }}>{b as string}</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:c as string, fontVariantNumeric:"tabular-nums" }}>{p as string}</div>
                </div>
              ))}
              <div style={{ padding:"10px 20px", borderTop:"1px solid rgba(255,255,255,.05)", fontSize:10, fontWeight:700, color:"var(--gold)" }}>
                Gap to 1st: 3.75% · You need +$375 more profit
              </div>
            </div>

            {/* Daily summary */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Daily Summary</span>
                <span className="pill pill-gray" style={{ fontSize:10 }}>This week</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 50px 50px 70px", gap:8, padding:"9px 20px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                {["Date","Trades","Lots","Result"].map(h=><span key={h} style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"rgba(255,255,255,.28)", fontFamily:"var(--font-mono)" }}>{h}</span>)}
              </div>
              {[["Dec 7 · Today","8","14.2","+$847","var(--green)"],["Dec 6","6","9.0","+$610","var(--green)"],["Dec 5","11","8.2","+$386","var(--green)"],["Dec 4","4","5.0","-$118","var(--red)"],["Dec 3","7","7.5","+$228","var(--green)"]].map(([d,t,l,r,c])=>(
                <div key={d} style={{ display:"grid", gridTemplateColumns:"1fr 50px 50px 70px", gap:8, padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.04)", alignItems:"center" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"var(--blue)" }}>{d}</span>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.55)" }}>{t}</span>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.55)" }}>{l}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:c as string, textAlign:"right", fontFamily:"var(--font-mono)" }}>{r}</span>
                </div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 50px 50px 70px", gap:8, padding:"10px 20px", background:"rgba(34,197,94,.03)", alignItems:"center" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.5)" }}>Week total</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>36</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>43.9</span>
                <span style={{ fontSize:12, fontWeight:800, color:"var(--green)", textAlign:"right", fontFamily:"var(--font-mono)" }}>+$1,953</span>
              </div>
            </div>
          </div>

          {/* Trade journal */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Trading Journal</span>
              <div style={{ display:"flex", gap:6 }}>
                {(["open","closed","violations"] as const).map(t=>(
                  <button key={t} onClick={()=>setTab(t)} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"var(--font-body)", background:tab===t?"rgba(255,215,0,.09)":"rgba(255,255,255,.05)", color:tab===t?"var(--gold)":"rgba(255,255,255,.45)" }}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Pair</th><th>Side</th><th>Lots</th><th>Open</th><th>Close</th><th>Duration</th><th>P&L</th><th>Status</th></tr></thead>
                <tbody>
                  {[
                    ["EUR/USD","BUY","0.50","1.08420","—","2h 12m","+$48","open","pass"],
                    ["GBP/USD","BUY","0.30","1.26180","—","52m","+$21","open","pass"],
                    ["EUR/USD","BUY","1.00","1.08210","1.08580","4h 12m","+$370","closed","pass"],
                    ["GBP/JPY","SELL","0.50","188.420","187.910","2h 38m","+$190","closed","pass"],
                    ["USD/CAD","BUY","0.30","1.35820","1.35640","45m","-$40","closed","pass"],
                    ["EUR/GBP","SELL","0.20","0.85920","0.85890","18s","—","excluded","hft"],
                  ].map(([pair,side,lots,open,close,dur,pnl,status,rule],i)=>(
                    <tr key={i} style={{ opacity:status==="excluded"?.38:1 }}>
                      <td style={{ color:"var(--text)", fontWeight:700, fontFamily:"var(--font-mono)" }}>{pair}</td>
                      <td><span className={`pill pill-${side==="BUY"?"green":"red"}`} style={{ fontSize:9 }}>{side}</span></td>
                      <td className="mono">{lots}</td>
                      <td className="mono" style={{ color:"rgba(255,255,255,.6)" }}>{open}</td>
                      <td className="mono" style={{ color:"rgba(255,255,255,.6)" }}>{close}</td>
                      <td style={{ color:rule==="hft"?"var(--red)":"rgba(255,255,255,.4)" }}>{dur}{rule==="hft"?" ⚡":""}</td>
                      <td className={`mono ${Number(pnl.replace(/[^0-9.-]/g,""))>=0?"pos":"neg"}`}>{pnl}</td>
                      <td><span className={`pill pill-${rule==="hft"?"gold":status==="open"?"blue":"green"}`} style={{ fontSize:9 }}>{rule==="hft"?"HFT Excluded":status==="open"?"Open ✓":"Valid ✓"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,.05)", fontSize:10, color:"rgba(255,255,255,.28)", display:"flex", justifyContent:"space-between" }}>
              <span>Synced via MetaApi · Updates every 60s · Last sync 45s ago</span>
              <span style={{ color:"var(--blue)", cursor:"pointer", fontWeight:600 }}>View all {e.total_trades} trades →</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
