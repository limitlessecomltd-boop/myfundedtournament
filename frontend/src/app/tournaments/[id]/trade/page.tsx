"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { entryApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useEntrySocket, useBattleChat } from "@/hooks/useSockets";
import MFTLogo from "@/components/ui/MFTLogo";

const API     = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
const fmt     = (v: number, d = 2) => v.toLocaleString("en", { minimumFractionDigits: d, maximumFractionDigits: d });
const col     = (v: number) => v >= 0 ? "#22C55E" : "#EF4444";
const fmtDur  = (s: number) => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}m ${s%60}s` : `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;

const isRealTrade = (t: any) => {
  const sym = String(t.symbol || "").trim();
  const typ = String(t.type || "").toLowerCase();
  return sym !== "" && !["balance","deposit","credit","withdrawal"].includes(typ);
};

function tradeDuration(t: any): number {
  if (!t.open_time) return 999;
  const open  = new Date(t.open_time).getTime();
  const close = t.close_time ? new Date(t.close_time).getTime() : Date.now();
  return Math.round((close - open) / 1000);
}

function fmtCountdown(ms: number): string {
  if (!ms || ms <= 0) return "00:00";
  const totalMin = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(totalMin).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* -- Gauge SVG -- */
function Gauge({ value, max, label, color, size = 76 }: any) {
  const r = 28, cx = size/2, cy = size/2;
  const circ = 2 * Math.PI * r;
  const pctVal = Math.min(Math.max(value / max, 0), 1);
  const dash = pctVal * circ;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition:"stroke-dasharray .6s ease" }} />
        <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="12" fontWeight="700" fontFamily="'DM Mono',monospace">
          {Math.round(pctVal * 100)}%
        </text>
      </svg>
      <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em", textAlign:"center", maxWidth:70 }}>{label}</div>
    </div>
  );
}

/* -- Equity Curve -- */
function EquityCurve({ trades, startBal, balance, equity }: any) {
  const w = 600, h = 140;
  const closed = [...(trades || [])].sort((a: any, b: any) =>
    new Date(a.close_time || a.open_time).getTime() - new Date(b.close_time || b.open_time).getTime()
  );
  const points: { x: number; y: number }[] = [{ x: 0, y: startBal }];
  let running = startBal;
  closed.forEach((t: any, i: number) => {
    running += parseFloat(t.profit || 0);
    points.push({ x: i + 1, y: running });
  });
  points.push({ x: points.length, y: equity });
  const allY = points.map(p => p.y);
  const maxY = Math.max(...allY, startBal * 1.01);
  const minY = Math.min(...allY, startBal * 0.99);
  const rangeY = maxY - minY || 1;
  const n = points.length;
  const toX = (i: number) => (i / (n - 1 || 1)) * w;
  const toY = (v: number) => h - ((v - minY) / rangeY) * (h - 20) - 8;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.y).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${w},${h} L0,${h} Z`;
  const startLineY = toY(startBal);
  const isUp = balance >= startBal;
  const lineColor = isUp ? "#22C55E" : "#EF4444";
  const gradId = `ecg_${trades?.length || 0}_${Math.round(balance)}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow:"visible", display:"block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25,0.5,0.75,1].map(f => <line key={f} x1="0" y1={f*h} x2={w} y2={f*h} stroke="rgba(255,255,255,.04)" strokeWidth="1" />)}
      <line x1="0" y1={startLineY} x2={w} y2={startLineY} stroke="rgba(255,215,0,.2)" strokeWidth="1" strokeDasharray="6,4" />
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {n > 1 && (
        <>
          <circle cx={toX(n-1)} cy={toY(points[n-1].y)} r="5" fill={lineColor} />
          <circle cx={toX(n-1)} cy={toY(points[n-1].y)} r="9" fill={lineColor} opacity="0.2">
            <animate attributeName="r" values="5;11;5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      <text x="4" y={startLineY - 4} fontSize="9" fill="rgba(255,215,0,.5)" fontFamily="'DM Mono',monospace">${fmt(startBal, 0)} start</text>
    </svg>
  );
}

/* -- Sidebar -- */
function Sidebar({ tournamentId, entry, profitPct }: any) {
  const pathname = usePathname();
  const nav = [
    { href:`/tournaments/${tournamentId}/trade`, label:"Overview",    icon:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
    { href:`/tournaments/${tournamentId}`,       label:"My Entries",  icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { href:"/leaderboard",                       label:"Leaderboard", icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { href:"/tournaments",                       label:"Battles",     icon:"M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  ];
  const isActive = entry?.status === "active";
  return (
    <div className="td-sidebar">
      {/* Logo */}
      <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid rgba(255,255,255,.05)", flexShrink:0 }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
          <div style={{ width:30, height:30, background:"#FFD700", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:10, color:"#000", flexShrink:0 }}>MFT</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:13, lineHeight:1.2 }}>
            <span style={{ color:"#fff" }}>MyFunded</span>
            <span style={{ color:"#FFD700" }}>Tournament</span>
          </div>
        </Link>
      </div>

      {/* Account card */}
      <div style={{ margin:"12px 10px", background:"rgba(255,215,0,.05)", border:"1px solid rgba(255,215,0,.15)", borderRadius:12, padding:"12px 14px", flexShrink:0 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,215,0,.5)", marginBottom:8 }}>Battle Account</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"rgba(255,255,255,.55)", marginBottom:10, textTransform:"capitalize" }}>
          {entry?.broker || "Exness"}{entry?.mt5_login ? ` · ***${String(entry.mt5_login).slice(-3)}` : ""}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.25)", marginBottom:4 }}>Entry #{entry?.entry_number ?? 1}</div>
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 10px", borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase",
              background: isActive ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.05)",
              border: `1px solid ${isActive ? "rgba(34,197,94,.25)" : "rgba(255,255,255,.1)"}`,
              color: isActive ? "#22C55E" : "rgba(255,255,255,.4)" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background: isActive ? "#22C55E" : "rgba(255,255,255,.3)", display:"inline-block", flexShrink:0 }}/>
              {entry?.status || "active"}
            </span>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.25)", marginBottom:2 }}>Gain</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"1px", lineHeight:1, color: profitPct >= 0 ? "#22C55E" : "#EF4444" }}>
              {profitPct >= 0 ? "+" : ""}{fmt(profitPct)}%
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding:"4px 8px", flex:1 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.18)", padding:"8px 10px 6px" }}>Navigation</div>
        {nav.map(n => {
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:9, marginBottom:2, textDecoration:"none", transition:"all .15s",
              background: active ? "rgba(255,215,0,.08)" : "transparent",
              border: `1px solid ${active ? "rgba(255,215,0,.15)" : "transparent"}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active?"#FFD700":"rgba(255,255,255,.35)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon}/></svg>
              <span style={{ fontSize:13, fontWeight:active?700:500, color:active?"#FFD700":"rgba(255,255,255,.45)" }}>{n.label}</span>
              {active && <div style={{ marginLeft:"auto", width:5, height:5, borderRadius:"50%", background:"#FFD700", boxShadow:"0 0 6px rgba(255,215,0,.6)" }}/>}
            </Link>
          );
        })}
      </div>

      {/* Profile footer */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", padding:"12px 14px", flexShrink:0 }}>
        <Link href="/profile" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,215,0,.1)", border:"1.5px solid rgba(255,215,0,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#FFD700", flexShrink:0 }}>
            {(entry?.username || "T")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{entry?.username || "My Profile"}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.28)" }}>View account</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

/* -- Objective Row -- */
function ObjRow({ label, desc, value, status }: { label: string; desc: string; value: string; status: "pass"|"warn"|"fail" }) {
  const colors: any = { pass:"#22C55E", warn:"#FFD700", fail:"#EF4444" };
  const c = colors[status];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:`${c}15`, border:`1px solid ${c}40`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {status === "pass" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
        {status === "warn" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill={c} stroke="none"/></svg>}
        {status === "fail" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.8)", marginBottom:1 }}>{label}</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{desc}</div>
      </div>
      <div style={{ fontSize:11, fontWeight:700, color:c, textAlign:"right", flexShrink:0 }}>{value}</div>
    </div>
  );
}

/* ============================================================ */
export default function TradePage() {
  const { id }   = useParams<{ id: string }>();
  const params   = useSearchParams();
  const entryId  = params.get("entry") || "";

  const [data, setData]           = useState<any>(null);
  const [mt5, setMt5]             = useState<any>(null);
  const [tab, setTab]             = useState<"open"|"closed"|"violations">("open");
  const [lastSync, setLastSync]   = useState<Date | null>(null);
  const [syncAge, setSyncAge]     = useState(0);
  const [countdown, setCountdown] = useState("");
  const [msLeft, setMsLeft]       = useState<number>(Infinity);
  const [closing, setClosing]     = useState(false);
  const [closeMsg, setCloseMsg]   = useState("");
  const [rank, setRank]           = useState<number | null>(null);
  const [totalTraders, setTotalTraders] = useState<number>(0);
  const autoClosedRef   = useRef(false);
  const fetchingRef     = useRef(false);
  const mt5Ref          = useRef<any>(null);
  const closeAllTradesRef = useRef<any>(null);
  const liveEntry       = useEntrySocket(entryId);
  const { user }        = useAuth();
  const { messages: chatMsgs, setMessages: setChatMsgs } = useBattleChat(id || "");
  const [chatInput,   setChatInput]   = useState("");
  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatUnread,  setChatUnread]  = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";

  const fetchMt5 = useCallback(() => {
    if (!entryId || fetchingRef.current) return;
    fetchingRef.current = true;
    const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
    fetch(`${API}/api/entries/${entryId}/mt5`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => r.ok ? r.json() : null)
      .then(d => {
        fetchingRef.current = false;
        if (!d || d.error) return;
        const prev = mt5Ref.current;
        const changed = !prev
          || prev.balance !== d.balance
          || prev.equity  !== d.equity
          || (d.open_trades?.length  ?? 0) !== (prev.open_trades?.length  ?? 0)
          || (d.trade_history?.length ?? 0) !== (prev.trade_history?.length ?? 0);
        mt5Ref.current = d;
        if (changed) setMt5(d);
        setLastSync(new Date());
      })
      .catch(() => { fetchingRef.current = false; });
  }, [entryId]);

  const closeAllTrades = useCallback(async (reason = "manual") => {
    if (closing) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
    setClosing(true);
    setCloseMsg(reason === "auto" ? "Closing trades (tournament ending)..." : "Closing all trades...");
    try {
      const r = await fetch(`${API}/api/entries/${entryId}/close-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const d = await r.json();
      setCloseMsg(`Closed ${d.closed ?? 0} trade${(d.closed ?? 0) !== 1 ? "s" : ""}`);
      setTimeout(() => { setCloseMsg(""); fetchMt5(); }, 4000);
    } catch (e: any) {
      setCloseMsg(`Error: ${e.message}`);
      setTimeout(() => setCloseMsg(""), 4000);
    } finally { setClosing(false); }
  }, [closing, entryId, fetchMt5]);

  useEffect(() => { closeAllTradesRef.current = closeAllTrades; }, [closeAllTrades]);

  useEffect(() => { if (entryId) { entryApi.getById(entryId).then(setData).catch(console.error); } }, [entryId]);

  useEffect(() => {
    fetchMt5();
    const iv = setInterval(fetchMt5, 10000);
    return () => clearInterval(iv);
  }, [fetchMt5]);

  useEffect(() => {
    const iv = setInterval(() => {
      setLastSync(prev => { if (prev) setSyncAge(Math.round((Date.now() - prev.getTime()) / 1000)); return prev; });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/tournaments/${id}/chat`)
      .then(r => r.json()).then(d => { if (d.data) setChatMsgs(d.data); }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior:"smooth" });
    } else if (!chatOpen && chatMsgs.length > 0) {
      setChatUnread(n => n + 1);
    }
  }, [chatMsgs]);

  useEffect(() => { if (chatOpen) setChatUnread(0); }, [chatOpen]);

  const sendChatMessage = async (text: string, type = "message") => {
    if (!text.trim() || chatSending) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("mft_token") || localStorage.getItem("fc_token") || "" : "";
    setChatSending(true);
    try {
      await fetch(`${API_URL}/api/tournaments/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: text.trim(), msg_type: type }),
      });
      setChatInput("");
    } catch {} finally { setChatSending(false); }
  };

  useEffect(() => {
    if (!id || !entryId) return;
    const fetchRank = () => {
      fetch(`${API}/api/leaderboard/${id}`)
        .then(r => r.json()).then(d => {
          const lb: any[] = d?.data || [];
          setTotalTraders(lb.length);
          const me = lb.find((e: any) => e.id === entryId);
          if (me) setRank(parseInt(me.position || me.rank || "1"));
        }).catch(() => {});
    };
    fetchRank();
    const iv = setInterval(fetchRank, 30000);
    return () => clearInterval(iv);
  }, [id, entryId]);

  useEffect(() => {
    const entry = liveEntry || data?.entry;
    const endRaw = entry?.tournament_end;
    if (!endRaw) return;
    const endMs = new Date(endRaw).getTime();
    const tick = () => {
      const diff = endMs - Date.now();
      setMsLeft(diff);
      setCountdown(diff > 0 ? fmtCountdown(diff) : "Ended");
      if (diff > 0 && diff <= 3 * 60 * 1000 && !autoClosedRef.current) {
        const openCount = mt5Ref.current?.open_trades?.length ?? 0;
        if (openCount > 0) {
          autoClosedRef.current = true;
          closeAllTradesRef.current("auto");
        }
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [data?.entry?.tournament_end, liveEntry?.tournament_end]);

  const entry        = liveEntry || data?.entry;
  const violations   = data?.violations || [];
  const live         = mt5 || null;
  const openTrades: any[]   = live?.open_trades   || [];
  const closedTrades: any[] = (live?.trade_history || []).filter(isRealTrade);

  const startBal   = parseFloat(entry?.starting_balance || 1000);
  const tournStart = entry?.tournament_start ? new Date(entry.tournament_start) : null;
  const balance    = parseFloat(live?.balance ?? entry?.current_balance ?? startBal);
  const equity     = parseFloat(live?.equity  ?? entry?.current_equity  ?? balance);
  const profitAbs  = Math.round((balance - startBal) * 100) / 100;
  const profitPct  = Math.round((profitAbs / startBal) * 10000) / 100;
  const unrealized = Math.round((equity - balance) * 100) / 100;
  const wins       = closedTrades.filter((t: any) => parseFloat(t.profit || 0) > 0).length;
  const losses     = closedTrades.filter((t: any) => parseFloat(t.profit || 0) < 0).length;
  const winRate    = closedTrades.length ? Math.round(wins / closedTrades.length * 100) : 0;
  const maxDD      = parseFloat(live?.max_drawdown ?? entry?.max_drawdown_pct ?? 0);
  const avgWin     = wins ? closedTrades.filter((t: any) => parseFloat(t.profit || 0) > 0).reduce((s: number, t: any) => s + parseFloat(t.profit || 0), 0) / wins : 0;
  const avgLoss    = losses ? Math.abs(closedTrades.filter((t: any) => parseFloat(t.profit || 0) < 0).reduce((s: number, t: any) => s + parseFloat(t.profit || 0), 0) / losses) : 0;
  const pf         = avgLoss > 0 ? Math.round(avgWin / avgLoss * 100) / 100 : wins > 0 ? 99 : 0;
  const bestTrade  = closedTrades.length ? Math.max(...closedTrades.map((t: any) => parseFloat(t.profit || 0))) : 0;
  const worstTrade = closedTrades.length ? Math.min(...closedTrades.map((t: any) => parseFloat(t.profit || 0))) : 0;

  // Objectives
  const hftTrades   = closedTrades.filter((t: any) => tradeDuration(t) < 31);
  const validTrades = closedTrades.filter((t: any) => tradeDuration(t) >= 31);
  const hftStatus: "pass"|"warn"|"fail" = hftTrades.length > 0 ? "fail" : "pass";
  const hftValue = hftTrades.length > 0 ? `${hftTrades.length} excluded (<31s)` : closedTrades.length > 0 ? `${validTrades.length} valid` : "No trades";

  const bySymbol: Record<string, Set<string>> = {};
  openTrades.filter(isRealTrade).forEach((t: any) => {
    const sym = t.symbol || "";
    const side = String(t.type || t.side || "").toLowerCase();
    const isBuy = side.includes("buy") || side === "0";
    if (!bySymbol[sym]) bySymbol[sym] = new Set();
    bySymbol[sym].add(isBuy ? "buy" : "sell");
  });
  const hedgedPairs = Object.entries(bySymbol).filter(([, sides]) => sides.has("buy") && sides.has("sell")).map(([s]) => s);
  const hedgeStatus: "pass"|"warn"|"fail" = hedgedPairs.length > 0 ? "fail" : "pass";
  const hedgeValue = hedgedPairs.length > 0 ? `${hedgedPairs.join(", ")}` : "Clean";

  let depositBreach = false, depositBreachAmt = 0;
  if (tournStart) {
    const deposits = (live?.trade_history || []).filter((t: any) => {
      const typ = String(t.type || "").toLowerCase();
      const isDeposit = ["balance","deposit","credit"].includes(typ) && parseFloat(t.profit || 0) > 0;
      if (!isDeposit) return false;
      const tradeTime = t.open_time ? new Date(t.open_time) : null;
      return tradeTime && tradeTime > tournStart;
    });
    if (deposits.length > 0) {
      depositBreach = true;
      depositBreachAmt = deposits.reduce((s: number, t: any) => s + parseFloat(t.profit || 0), 0);
    }
  }
  const depositStatus: "pass"|"warn"|"fail" = depositBreach ? "fail" : "pass";
  const depositValue = depositBreach ? `+$${fmt(depositBreachAmt)} detected` : "Clean";

  const inFinal3Min  = msLeft > 0 && msLeft <= 3 * 60 * 1000;
  const alreadyEnded = msLeft <= 0;
  const realOpen     = openTrades.filter(isRealTrade).length;
  const close3Status: "pass"|"warn"|"fail" =
    alreadyEnded ? (realOpen > 0 ? "fail" : "pass")
    : inFinal3Min ? (realOpen > 0 ? "fail" : "pass")
    : realOpen > 0 ? "warn" : "pass";
  const close3Value = alreadyEnded
    ? (realOpen > 0 ? "Open trades at end!" : "Clean")
    : inFinal3Min
    ? (realOpen > 0 ? `${realOpen} open — closing...` : "All closed")
    : realOpen > 0 ? `${realOpen} open (close before 3min)` : "Clean";

  const objFails = [hftStatus, hedgeStatus, depositStatus, close3Status].filter(s => s === "fail").length;
  const objWarns = [hftStatus, hedgeStatus, depositStatus, close3Status].filter(s => s === "warn").length;

  // Symbol P&L
  const symMap: Record<string, { profit: number; count: number }> = {};
  closedTrades.forEach((t: any) => {
    const s = t.symbol || "Other";
    if (!symMap[s]) symMap[s] = { profit:0, count:0 };
    symMap[s].profit += parseFloat(t.profit || 0);
    symMap[s].count++;
  });
  const symbolRows = Object.entries(symMap).sort((a,b) => Math.abs(b[1].profit) - Math.abs(a[1].profit)).slice(0,5);
  const maxSymAbs  = Math.max(...symbolRows.map(([,v]) => Math.abs(v.profit)), 1);
  const displayTrades = tab === "open" ? openTrades : tab === "closed" ? closedTrades : [];

  const timerColor = msLeft <= 3*60*1000 ? "#EF4444" : msLeft <= 15*60*1000 ? "#FFD700" : "#22C55E";
  const isActive   = entry?.tournament_status === "active" || entry?.status === "active";

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"#030508" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        /* Layout */
        .td-sidebar{width:220px;background:#050a14;border-right:1px solid rgba(255,255,255,.06);
          display:flex;flex-direction:column;flex-shrink:0;}
        .td-topbar{background:rgba(3,5,8,.98);border-bottom:1px solid rgba(255,255,255,.07);
          padding:0 24px;height:62px;display:flex;align-items:center;justify-content:space-between;
          position:sticky;top:0;z-index:50;flex-shrink:0;}
        .td-topbar-right{display:flex;align-items:center;gap:8px;}

        /* Metric strip */
        .td-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:0;
          border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;}
        .td-metric{padding:16px 20px;border-right:1px solid rgba(255,255,255,.05);transition:background .2s;cursor:default;}
        .td-metric:last-child{border-right:none;}
        .td-metric:hover{background:rgba(255,255,255,.025);}
        .td-metric-label{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
          color:rgba(255,255,255,.28);margin-bottom:8px;}
        .td-metric-value{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;
          line-height:1;margin-bottom:3px;}
        .td-metric-sub{font-size:11px;color:rgba(255,255,255,.3);}

        /* Section cards */
        .td-card{background:rgba(8,13,22,.95);border:1px solid rgba(255,255,255,.07);
          border-radius:16px;overflow:hidden;margin-bottom:14px;}
        .td-card-head{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.06);
          display:flex;align-items:center;justify-content:space-between;}
        .td-card-title{display:flex;align-items:center;gap:8px;font-size:13px;
          font-weight:700;color:rgba(255,255,255,.75);}
        .td-card-title span{font-size:15px;}

        /* Tab buttons */
        .td-tab{padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.08);
          background:transparent;color:rgba(255,255,255,.35);font-size:12px;font-weight:700;
          cursor:pointer;transition:all .15s;font-family:inherit;}
        .td-tab.on{background:rgba(255,215,0,.09);border-color:rgba(255,215,0,.28);color:#FFD700;}

        /* Trade table */
        .td-table{width:100%;border-collapse:collapse;font-size:12px;}
        .td-table th{padding:8px 14px;font-size:9px;font-weight:700;letter-spacing:.12em;
          text-transform:uppercase;color:rgba(255,255,255,.22);text-align:left;
          border-bottom:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);}
        .td-table td{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04);
          color:rgba(255,255,255,.7);transition:background .12s;}
        .td-table tr:last-child td{border-bottom:none;}
        .td-table tr:hover td{background:rgba(255,255,255,.02);}

        /* Stats grid */
        .td-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:16px;}
        .td-stat{background:rgba(255,255,255,.03);border-radius:10px;padding:12px 14px;
          border:1px solid rgba(255,255,255,.05);}
        .td-stat-label{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
          color:rgba(255,255,255,.25);margin-bottom:5px;}
        .td-stat-val{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:.5px;line-height:1;}

        /* Chat */
        .td-chat-fab{position:fixed;bottom:28px;right:28px;z-index:999;
          width:52px;height:52px;border-radius:50%;
          background:linear-gradient(135deg,#FFD700,#FFA500);
          border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
          font-size:22px;box-shadow:0 4px 20px rgba(255,215,0,.4);transition:transform .2s;}
        .td-chat-fab:hover{transform:scale(1.08);}
        .td-chat-panel{position:fixed;bottom:90px;right:28px;z-index:998;
          width:320px;height:420px;background:#0a0f1c;
          border:1px solid rgba(255,215,0,.2);border-radius:18px;
          display:flex;flex-direction:column;overflow:hidden;
          box-shadow:0 12px 48px rgba(0,0,0,.7);}
        .td-chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;
          scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.1) transparent;}
        .td-chat-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
          border-radius:20px;padding:8px 14px;font-size:13px;color:#fff;outline:none;
          font-family:inherit;transition:border-color .2s;}
        .td-chat-input:focus{border-color:rgba(255,215,0,.35);}
        .td-chat-input::placeholder{color:rgba(255,255,255,.25);}
        .td-taunt-btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
          color:rgba(255,255,255,.65);font-size:11px;padding:4px 10px;border-radius:20px;
          cursor:pointer;transition:.15s;white-space:nowrap;font-family:inherit;}
        .td-taunt-btn:hover{background:rgba(255,100,0,.12);border-color:rgba(255,100,0,.3);color:#FF8C42;}

        @keyframes live-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.5);}}

        @media(max-width:900px){
          .td-sidebar{display:none;}
          .td-topbar{padding:0 16px;}
          .td-metrics{grid-template-columns:repeat(3,1fr);}
        }
        @media(max-width:600px){
          .td-topbar{height:52px;}
          .td-metrics{grid-template-columns:1fr 1fr;}
          .td-hide-sm{display:none;}
          .td-stats{grid-template-columns:1fr 1fr;}
          .td-chat-panel{width:calc(100vw - 32px);right:16px;}
          .td-chat-fab{bottom:20px;right:20px;}
        }
      `}</style>

      {/* Sidebar */}
      <Sidebar tournamentId={id} entry={entry} profitPct={profitPct} />

      <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>

        {/* Top bar */}
        <div className="td-topbar">
          <div style={{ display:"flex", alignItems:"center", gap:14, minWidth:0 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff", letterSpacing:"-.3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {entry?.tournament_name || "Battle"} &mdash; Entry #{entry?.entry_number ?? 1}
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:1, fontFamily:"'DM Mono',monospace" }}>
                {entry?.broker || "Exness"} &middot; {entry?.mt5_login ? `***${String(entry.mt5_login).slice(-3)}` : "—"} &middot; synced {syncAge}s ago
              </div>
            </div>
            {live && (
              <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)", borderRadius:20, padding:"3px 10px", flexShrink:0 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#22C55E", display:"inline-block", animation:"live-pulse 1.5s infinite" }}/>
                <span style={{ fontSize:10, fontWeight:700, color:"#22C55E", letterSpacing:".08em" }}>LIVE</span>
              </div>
            )}
          </div>

          <div className="td-topbar-right">
            {/* Rank */}
            <div style={{ textAlign:"center", background:"rgba(255,215,0,.07)", border:"1px solid rgba(255,215,0,.18)", borderRadius:10, padding:"6px 14px" }} className="td-hide-sm">
              <div style={{ fontSize:8, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,215,0,.5)" }}>Rank</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color:"#FFD700", lineHeight:1 }}>
                #{rank ?? "—"}{totalTraders > 0 && <span style={{ fontSize:10, color:"rgba(255,215,0,.4)" }}>/{totalTraders}</span>}
              </div>
            </div>
            {/* Gain */}
            <div style={{ textAlign:"center", background: profitPct >= 0 ? "rgba(34,197,94,.07)" : "rgba(239,68,68,.07)", border:`1px solid ${profitPct >= 0 ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)"}`, borderRadius:10, padding:"6px 14px" }} className="td-hide-sm">
              <div style={{ fontSize:8, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.35)" }}>Your Gain</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color: col(profitPct), lineHeight:1 }}>
                {profitPct >= 0 ? "+" : ""}{fmt(profitPct)}%
              </div>
            </div>
            {/* Open */}
            <div style={{ textAlign:"center", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:"6px 14px" }} className="td-hide-sm">
              <div style={{ fontSize:8, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.3)" }}>Open</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color: openTrades.filter(isRealTrade).length > 0 ? "#FFD700" : "rgba(255,255,255,.4)", lineHeight:1 }}>
                {openTrades.filter(isRealTrade).length}
              </div>
            </div>
            {/* Timer */}
            {countdown && (
              <div style={{ textAlign:"center", background:`${timerColor}12`, border:`1px solid ${timerColor}40`, borderRadius:10, padding:"6px 14px" }}>
                <div style={{ fontSize:8, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:`${timerColor}90` }}>Time Left</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color:timerColor, lineHeight:1 }}>{countdown}</div>
              </div>
            )}
            {/* Close all */}
            {isActive && openTrades.filter(isRealTrade).length > 0 && (
              <button onClick={() => closeAllTrades("manual")} disabled={closing}
                style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", color:"#EF4444", padding:"6px 14px", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                {closing ? "Closing..." : "Close All"}
              </button>
            )}
            {closeMsg && (
              <div style={{ fontSize:12, color:"#22C55E", fontWeight:600, maxWidth:160 }}>{closeMsg}</div>
            )}
            {entry?.can_reenter && (
              <button style={{ background:"linear-gradient(135deg,#FFD700,#FFA500)", color:"#000", padding:"7px 16px", borderRadius:9, fontSize:12, fontWeight:800, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                + Re-enter
              </button>
            )}
          </div>
        </div>

        {/* 5 Metric cards */}
        <div className="td-metrics">
          {[
            { label:"% Gain",         value:`${profitPct >= 0?"+":""}${fmt(profitPct)}%`,                         sub:"Ranking metric",                            color: col(profitPct) },
            { label:"Net Profit",     value:`${profitAbs >= 0?"+":""}$${fmt(Math.abs(profitAbs))}`,               sub:`From $${fmt(startBal,0)} start`,            color: col(profitAbs) },
            { label:"Balance",        value:`$${fmt(balance,0)}`,                                                  sub:`Equity $${fmt(equity,0)}`,                  color:"#fff" },
            { label:"Unrealized P&L", value:`${unrealized >= 0?"+":""}$${fmt(unrealized)}`,                        sub:`${openTrades.filter(isRealTrade).length} open positions`, color: col(unrealized) },
            { label:"Max Drawdown",   value:`-${fmt(maxDD)}%`,                                                     sub:"100% limit",                                color: maxDD > 90?"#EF4444": maxDD > 70?"#FFD700":"#22C55E" },
          ].map(m => (
            <div key={m.label} className="td-metric">
              <div className="td-metric-label">{m.label}</div>
              <div className="td-metric-value" style={{ color:m.color }}>{m.value}</div>
              <div className="td-metric-sub">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex:1, padding:"16px 20px", overflow:"auto", display:"grid", gridTemplateColumns:"1fr 320px", gap:14, alignItems:"start" }}>

          <div>
            {/* Equity Curve */}
            <div className="td-card">
              <div className="td-card-head">
                <div className="td-card-title"><span>📈</span> Equity Curve</div>
                <div style={{ display:"flex", gap:16, fontSize:11, color:"rgba(255,255,255,.3)" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:20, height:2, background:"rgba(255,215,0,.4)", display:"inline-block", borderTop:"1px dashed rgba(255,215,0,.4)" }}/>Start
                  </span>
                  <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:20, height:2, background:col(profitAbs), display:"inline-block" }}/>Equity
                  </span>
                </div>
              </div>
              <div style={{ padding:"16px 20px" }}>
                <EquityCurve trades={closedTrades} startBal={startBal} balance={balance} equity={equity} />
                <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", marginTop:8 }}>
                  {closedTrades.length} closed trades &middot; live equity point
                </div>
              </div>
            </div>

            {/* Trading Statistics */}
            <div className="td-card">
              <div className="td-card-head">
                <div className="td-card-title"><span>📊</span> Trading Statistics</div>
              </div>
              <div className="td-stats">
                {[
                  { label:"Profit Factor", value: pf > 0 ? fmt(pf) : "—",             color: pf >= 1.5?"#22C55E": pf > 0?"#FFD700":"rgba(255,255,255,.4)" },
                  { label:"Win Rate",      value: winRate > 0 ? `${winRate}%` : "—",  color: winRate >= 50?"#22C55E": winRate > 0?"#FFD700":"rgba(255,255,255,.4)" },
                  { label:"Valid Trades",  value: String(validTrades.length),          color:"rgba(255,255,255,.7)" },
                  { label:"Avg Win",       value: avgWin > 0 ? `+$${fmt(avgWin)}` : "—",    color:"#22C55E" },
                  { label:"Avg Loss",      value: avgLoss > 0 ? `-$${fmt(avgLoss)}` : "—",  color:"#EF4444" },
                  { label:"HFT Excluded",  value: String(hftTrades.length),            color: hftTrades.length > 0 ? "#EF4444" : "rgba(255,255,255,.4)" },
                  { label:"Best Trade",    value: bestTrade !== 0 ? `${bestTrade > 0?"+":""}$${fmt(Math.abs(bestTrade))}` : "—",  color:"#22C55E" },
                  { label:"Worst Trade",   value: worstTrade !== 0 ? `${worstTrade > 0?"+":""}$${fmt(Math.abs(worstTrade))}` : "—", color:"#EF4444" },
                  { label:"Max Drawdown",  value: `-${fmt(maxDD)}%`,                   color: maxDD > 50?"#EF4444": maxDD > 20?"#FFD700":"#22C55E" },
                ].map(s => (
                  <div key={s.label} className="td-stat">
                    <div className="td-stat-label">{s.label}</div>
                    <div className="td-stat-val" style={{ color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* P&L by Symbol */}
            {symbolRows.length > 0 && (
              <div className="td-card">
                <div className="td-card-head">
                  <div className="td-card-title"><span>💹</span> P&amp;L by Symbol</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{symbolRows.length} pairs traded</div>
                </div>
                <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:8 }}>
                  {symbolRows.map(([sym, v]) => {
                    const barW = Math.abs(v.profit) / maxSymAbs * 100;
                    return (
                      <div key={sym} style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"rgba(255,255,255,.6)", width:80, flexShrink:0 }}>{sym}</div>
                        <div style={{ flex:1, height:6, background:"rgba(255,255,255,.05)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${barW}%`, background: v.profit >= 0 ? "#22C55E" : "#EF4444", borderRadius:3, transition:"width .6s" }}/>
                        </div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600, color: col(v.profit), width:70, textAlign:"right", flexShrink:0 }}>
                          {v.profit >= 0 ? "+" : ""}${fmt(Math.abs(v.profit))}
                        </div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", width:40, flexShrink:0 }}>{v.count} tr.</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trade Journal */}
            <div className="td-card">
              <div className="td-card-head">
                <div className="td-card-title"><span>📋</span> Trade Journal</div>
                <div style={{ display:"flex", gap:6 }}>
                  {(["open","closed","violations"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`td-tab${tab===t?" on":""}`}>
                      {t === "open" ? `Open (${openTrades.filter(isRealTrade).length})` : t === "closed" ? `Closed (${closedTrades.length})` : "Violations"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table className="td-table" style={{ minWidth:560 }}>
                  <thead>
                    <tr>
                      {tab === "violations"
                        ? ["Symbol","Type","Detail","Time"].map(h => <th key={h}>{h}</th>)
                        : ["Symbol","Side","Lots","Open Price","Close Price","Duration","P&L"].map(h => <th key={h}>{h}</th>)
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {tab === "violations" ? (
                      violations.length > 0
                        ? violations.map((v: any, i: number) => (
                            <tr key={i}>
                              <td style={{ fontFamily:"'DM Mono',monospace" }}>{v.symbol || "—"}</td>
                              <td style={{ color:"#EF4444", fontWeight:700 }}>{v.type || v.violation_type || "Violation"}</td>
                              <td style={{ color:"rgba(255,255,255,.5)" }}>{v.detail || v.notes || "—"}</td>
                              <td style={{ color:"rgba(255,255,255,.4)", fontFamily:"'DM Mono',monospace", fontSize:11 }}>{v.created_at ? new Date(v.created_at).toLocaleTimeString() : "—"}</td>
                            </tr>
                          ))
                        : <tr><td colSpan={4} style={{ textAlign:"center", padding:"32px", color:"rgba(255,255,255,.25)" }}>No violations</td></tr>
                    ) : displayTrades.filter(isRealTrade).length > 0
                      ? displayTrades.filter(isRealTrade).map((t: any, i: number) => {
                          const profit = parseFloat(t.profit || 0);
                          const dur = tradeDuration(t);
                          const side = String(t.type || t.side || "").toLowerCase();
                          const isBuy = side.includes("buy") || side === "0";
                          return (
                            <tr key={i}>
                              <td style={{ fontFamily:"'DM Mono',monospace", fontWeight:600, color:"#fff" }}>{t.symbol || "—"}</td>
                              <td>
                                <span style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:700, background: isBuy?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)", color: isBuy?"#22C55E":"#EF4444" }}>
                                  {isBuy ? "BUY" : "SELL"}
                                </span>
                              </td>
                              <td style={{ fontFamily:"'DM Mono',monospace", color:"rgba(255,255,255,.6)" }}>{parseFloat(t.volume || t.lots || 0).toFixed(2)}</td>
                              <td style={{ fontFamily:"'DM Mono',monospace", color:"rgba(255,255,255,.6)" }}>{parseFloat(t.open_price || 0).toFixed(5)}</td>
                              <td style={{ fontFamily:"'DM Mono',monospace", color:"rgba(255,255,255,.4)" }}>{t.close_price ? parseFloat(t.close_price).toFixed(5) : <span style={{ color:"#FFD700" }}>Open</span>}</td>
                              <td style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color: dur < 31 ? "#EF4444" : "rgba(255,255,255,.5)" }}>{fmtDur(dur)}</td>
                              <td style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, color: col(profit) }}>
                                {profit >= 0 ? "+" : ""}${fmt(Math.abs(profit))}
                              </td>
                            </tr>
                          );
                        })
                      : <tr><td colSpan={7} style={{ textAlign:"center", padding:"32px", color:"rgba(255,255,255,.25)" }}>
                          {tab === "open" ? "No open positions" : "No closed trades yet"}
                        </td></tr>
                    }
                  </tbody>
                </table>
              </div>
              <div style={{ padding:"10px 18px", borderTop:"1px solid rgba(255,255,255,.05)", fontSize:11, color:"rgba(255,255,255,.22)", display:"flex", justifyContent:"space-between" }}>
                <span>Live &middot; C# Bridge &middot; synced {syncAge}s ago</span>
                <span>{closedTrades.length} closed &middot; {openTrades.filter(isRealTrade).length} open &middot; {hftTrades.length} excluded &middot; {violations.length} violations</span>
              </div>
            </div>
          </div>

          {/* Right column — Objectives + Gauges */}
          <div>
            {/* Objectives */}
            <div className="td-card">
              <div className="td-card-head">
                <div className="td-card-title"><span>🎯</span> Objectives</div>
                <span style={{ fontSize:11, fontWeight:700, color: objFails > 0 ? "#EF4444" : objWarns > 0 ? "#FFD700" : "#22C55E",
                  background: objFails > 0 ? "rgba(239,68,68,.1)" : objWarns > 0 ? "rgba(255,215,0,.1)" : "rgba(34,197,94,.1)",
                  border: `1px solid ${objFails > 0 ? "rgba(239,68,68,.25)" : objWarns > 0 ? "rgba(255,215,0,.25)" : "rgba(34,197,94,.25)"}`,
                  borderRadius:20, padding:"3px 10px" }}>
                  {objFails > 0 ? `${objFails} fail` : objWarns > 0 ? `${objWarns} warn` : `4/4 pass`}
                </span>
              </div>
              <ObjRow label="Min 31s Duration"   desc="Trades < 31s excluded from % gain"    value={hftValue}     status={hftStatus} />
              <ObjRow label="No Hedging"          desc="No simultaneous BUY+SELL same pair"   value={hedgeValue}   status={hedgeStatus} />
              <ObjRow label="No External Deposit" desc="No balance added after battle start"  value={depositValue} status={depositStatus} />
              <ObjRow label="Close 3min Early"    desc="All trades closed before final 3min"  value={close3Value}  status={close3Status} />
            </div>

            {/* Performance gauges */}
            <div className="td-card">
              <div className="td-card-head">
                <div className="td-card-title"><span>⚡</span> Performance</div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-around", padding:"20px 16px" }}>
                <Gauge value={winRate}          max={100} label="Win Rate"  color={winRate >= 50 ? "#22C55E" : "#EF4444"} />
                <Gauge value={Math.abs(profitPct)} max={20} label="% Gain"  color={profitPct >= 0 ? "#22C55E" : "#EF4444"} />
                <Gauge value={100 - maxDD}      max={100} label="DD Safety" color={maxDD > 70 ? "#EF4444" : maxDD > 40 ? "#FFD700" : "#22C55E"} />
              </div>
            </div>

            {/* Quick stats */}
            <div className="td-card">
              <div className="td-card-head">
                <div className="td-card-title"><span>🔢</span> Quick Stats</div>
              </div>
              <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { l:"Total Trades",  v: closedTrades.length + openTrades.filter(isRealTrade).length },
                  { l:"Wins / Losses", v: `${wins} / ${losses}` },
                  { l:"Starting Bal.", v: `$${fmt(startBal,0)}` },
                  { l:"Current Bal.",  v: `$${fmt(balance,0)}` },
                  { l:"Live Equity",   v: `$${fmt(equity,0)}` },
                ].map(r => (
                  <div key={r.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{r.l}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:600, color:"rgba(255,255,255,.75)" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Chat FAB */}
      <button className="td-chat-fab" onClick={() => setChatOpen(o => !o)} title="Battle Chat">
        {chatOpen ? "✕" : "💬"}
        {!chatOpen && chatUnread > 0 && (
          <span style={{ position:"absolute", top:-4, right:-4, background:"#EF4444", color:"#fff", fontSize:10, fontWeight:800, minWidth:18, height:18, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px", border:"2px solid #030508" }}>
            {chatUnread > 9 ? "9+" : chatUnread}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="td-chat-panel">
          <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,215,0,.05)", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14 }}>💬</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Battle Chat</div>
                <div style={{ fontSize:10, color:"rgba(255,215,0,.6)", letterSpacing:".05em" }}>Live &middot; All traders in this battle</div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.4)", cursor:"pointer", fontSize:16, padding:"4px" }}>✕</button>
          </div>
          <div className="td-chat-msgs">
            {chatMsgs.length === 0 ? (
              <div style={{ textAlign:"center", color:"rgba(255,255,255,.25)", fontSize:13, padding:"24px 12px", lineHeight:1.6 }}>
                <div style={{ fontSize:28, marginBottom:10 }}>⚔️</div>
                Be the first to talk.<br/>
                <span style={{ color:"rgba(255,215,0,.4)" }}>May the best trader win.</span>
              </div>
            ) : chatMsgs.map((msg: any, i: number) => {
              const isMe = msg.username === (user?.username || user?.email?.split("@")[0]);
              const isTaunt = msg.msg_type === "taunt";
              return (
                <div key={msg.id || i} style={{ display:"flex", flexDirection:"column", gap:2, maxWidth:"88%", alignSelf: isMe?"flex-end":"flex-start", alignItems: isMe?"flex-end":"flex-start" }}>
                  {!isMe && <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", padding:"0 6px" }}>{msg.username}</div>}
                  <div style={{ padding:"8px 12px", borderRadius:12, fontSize:13, lineHeight:1.45, wordBreak:"break-word",
                    background: isMe ? "rgba(255,215,0,.15)" : isTaunt ? "rgba(255,100,0,.12)" : "rgba(255,255,255,.07)",
                    border: `1px solid ${isMe ? "rgba(255,215,0,.25)" : isTaunt ? "rgba(255,100,0,.3)" : "rgba(255,255,255,.09)"}`,
                    color: isMe ? "#fff" : isTaunt ? "#FF8C42" : "rgba(255,255,255,.85)",
                    borderBottomRightRadius: isMe ? 4 : 12, borderBottomLeftRadius: isMe ? 12 : 4 }}>
                    {isTaunt && <span style={{ marginRight:4 }}>🔥</span>}
                    {msg.message}
                  </div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.2)", padding:"0 6px" }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef}/>
          </div>
          <div style={{ display:"flex", gap:6, padding:"8px 12px", borderTop:"1px solid rgba(255,255,255,.05)", flexWrap:"wrap", flexShrink:0, background:"rgba(255,255,255,.02)" }}>
            {["🔥 I'm up!", "💀 GG already", "😤 Try harder", "👀 Watch this", "📈 Moon time"].map(t => (
              <button key={t} className="td-taunt-btn" onClick={() => sendChatMessage(t.replace(/^[^ ]+ /, ""), "taunt")}>{t}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
            <input className="td-chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(chatInput); } }}
              placeholder="Say something..." maxLength={200} disabled={chatSending} />
            <button disabled={!chatInput.trim() || chatSending} onClick={() => sendChatMessage(chatInput)}
              style={{ background:"linear-gradient(135deg,#FFD700,#FFA500)", border:"none", width:34, height:34, borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity: !chatInput.trim() || chatSending ? 0.4 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
