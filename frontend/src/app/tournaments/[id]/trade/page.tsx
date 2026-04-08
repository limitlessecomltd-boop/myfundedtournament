"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { entryApi } from "@/lib/api";
import { useEntrySocket } from "@/hooks/useSockets";
import MFTLogo from "@/components/ui/MFTLogo";

const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
const fmt  = (v: number, d = 2) => v.toLocaleString("en", { minimumFractionDigits: d, maximumFractionDigits: d });
const col  = (v: number) => v >= 0 ? "var(--green)" : "var(--red)";

/* ── Real trade filter ── */
const isRealTrade = (t: any) => {
  const sym = String(t.symbol || "").trim();
  const typ = String(t.type   || "").toLowerCase();
  return sym !== "" && !["balance","deposit","credit","withdrawal"].includes(typ);
};

/* ── Compute trade duration in seconds ── */
function tradeDuration(t: any): number {
  if (!t.open_time) return 999;
  const open  = new Date(t.open_time).getTime();
  const close = t.close_time ? new Date(t.close_time).getTime() : Date.now();
  return Math.round((close - open) / 1000);
}

/* ── Countdown formatter ── */
function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalMin = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(totalMin).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* ── Gauge ── */
function Gauge({ value, max, label, color, size = 76 }: any) {
  const r = 28, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pctVal = Math.min(Math.max(value / max, 0), 1);
  const dash = pctVal * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dasharray .6s ease" }} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="12" fontWeight="700" fontFamily="'Space Grotesk',sans-serif">
          {Math.round(pctVal * 100)}%
        </text>
      </svg>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".08em", textAlign: "center", maxWidth: 70 }}>{label}</div>
    </div>
  );
}

/* ── Equity Curve ── */
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
  const gradId = `ecg${Math.random().toString(36).slice(2,6)}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(f => <line key={f} x1="0" y1={f * h} x2={w} y2={f * h} stroke="rgba(255,255,255,.04)" strokeWidth="1" />)}
      <line x1="0" y1={startLineY} x2={w} y2={startLineY} stroke="rgba(255,215,0,.25)" strokeWidth="1" strokeDasharray="6,4" />
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {n > 1 && <>
        <circle cx={toX(n - 1)} cy={toY(points[n - 1].y)} r="5" fill={lineColor} />
        <circle cx={toX(n - 1)} cy={toY(points[n - 1].y)} r="9" fill={lineColor} opacity="0.25">
          <animate attributeName="r" values="5;11;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
        </circle>
      </>}
      <text x="4" y={startLineY - 4} fontSize="9" fill="rgba(255,215,0,.5)" fontFamily="monospace">${fmt(startBal, 0)} start</text>
    </svg>
  );
}

function DailyBars({ trades }: { trades: any[] }) {
  if (!trades?.length) return null;
  const byDay: Record<string, number> = {};
  trades.forEach((t: any) => {
    const d = String(t.close_time || t.open_time || "").slice(0, 10);
    if (d) byDay[d] = (byDay[d] || 0) + parseFloat(t.profit || 0);
  });
  const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  if (!days.length) return null;
  const maxAbs = Math.max(...days.map(([, v]) => Math.abs(v)), 1);
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48 }}>
      {days.map(([day, val]) => {
        const h = Math.max((Math.abs(val) / maxAbs) * 44, 2);
        return (
          <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
            title={`${day}: ${val >= 0 ? "+" : ""}$${val.toFixed(2)}`}>
            <div style={{ width: "100%", height: h, background: val >= 0 ? "#22C55E" : "#EF4444", borderRadius: "2px 2px 0 0", opacity: 0.8 }} />
          </div>
        );
      })}
    </div>
  );
}

/* ── Sidebar ── */
function Sidebar({ tournamentId, entry, profitPct }: any) {
  const pathname = usePathname();
  const nav = [
    { href: `/tournaments/${tournamentId}/trade`, label: "Overview",   icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
    { href: `/tournaments/${tournamentId}`,       label: "My Entries", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { href: "/leaderboard",                       label: "Leaderboard", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { href: "/tournaments",                       label: "Battles",     icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  ];
  return (
    <div style={{ width: 230, background: "#060810", borderRight: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <MFTLogo size={30} />
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 13, letterSpacing: "-.3px", lineHeight: 1.2 }}>
            <div style={{ color: "#fff" }}>MyFunded</div>
            <div style={{ color: "var(--gold)" }}>Tournament</div>
          </div>
        </div>
      </div>
      <div style={{ margin: "14px 12px", background: "rgba(255,215,0,.04)", border: "1px solid rgba(255,215,0,.12)", borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 6 }}>Active Account</div>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,.6)", marginBottom: 8 }}>
          {entry?.broker || "Exness"} · {entry?.mt5_login || "—"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.28)" }}>Entry #{entry?.entry_number ?? 1}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: entry?.status === "active" ? "var(--green)" : "rgba(255,255,255,.4)", textTransform: "capitalize" }}>
              ● {entry?.status || "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.28)" }}>Gain</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: profitPct >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-head)" }}>
              {profitPct >= 0 ? "+" : ""}{fmt(profitPct)}%
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: "4px 8px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.2)", padding: "8px 10px 4px" }}>Menu</div>
        {nav.map(n => {
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 2, background: active ? "rgba(255,215,0,.08)" : "transparent", textDecoration: "none" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "#FFD700" : "rgba(255,255,255,.35)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#FFD700" : "rgba(255,255,255,.5)" }}>{n.label}</span>
              {active && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#FFD700" }} />}
            </Link>
          );
        })}
      </div>
      <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,.05)", padding: "14px 18px" }}>
        <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,215,0,.1)", border: "1.5px solid rgba(255,215,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "var(--gold)", flexShrink: 0 }}>T</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>My Profile</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)" }}>View account</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

/* ── Objective Row — computed live ── */
function ObjRow({ label, desc, value, status }: { label: string; desc: string; value: string; status: "pass" | "warn" | "fail" }) {
  const colors: any = { pass: "#22C55E", warn: "#FFD700", fail: "#EF4444" };
  const c = colors[status];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${c}15`, border: `1px solid ${c}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {status === "pass" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
        {status === "warn" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"><line x1="12" y1="8" x2="12" y2="13" /><circle cx="12" cy="17" r="1" fill={c} stroke="none" /></svg>}
        {status === "fail" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.8)", marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{desc}</div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: c, textAlign: "right", flexShrink: 0 }}>{value}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function TradePage() {
  const { id }   = useParams<{ id: string }>();
  const params   = useSearchParams();
  const entryId  = params.get("entry") || "";

  const [data, setData]           = useState<any>(null);
  const [mt5, setMt5]             = useState<any>(null);
  const [tab, setTab]             = useState<"open" | "closed" | "violations">("open");
  const [lastSync, setLastSync]   = useState<Date | null>(null);
  const [syncAge, setSyncAge]     = useState(0);
  const [countdown, setCountdown] = useState("");
  const [msLeft, setMsLeft]       = useState<number>(Infinity);
  const [closing, setClosing]     = useState(false);
  const [closeMsg, setCloseMsg]   = useState("");
  const [rank, setRank]           = useState<number | null>(null);
  const [totalTraders, setTotalTraders] = useState<number>(0);
  const autoClosedRef             = useRef(false);
  const liveEntry                 = useEntrySocket(entryId);

  const fetchMt5 = useCallback(() => {
    if (!entryId) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
    fetch(`${API}/api/entries/${entryId}/mt5`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) { setMt5(d); setLastSync(new Date()); } })
      .catch(() => {});
  }, [entryId]);

  const closeAllTrades = useCallback(async (reason = "manual") => {
    if (closing) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
    setClosing(true);
    setCloseMsg(reason === "auto" ? "⏱ Auto-closing trades (tournament ending)..." : "Closing all trades...");
    try {
      const r = await fetch(`${API}/api/entries/${entryId}/close-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const d = await r.json();
      setCloseMsg(`✓ Closed ${d.closed ?? 0} trade${(d.closed ?? 0) !== 1 ? "s" : ""}`);
      setTimeout(() => { setCloseMsg(""); fetchMt5(); }, 4000);
    } catch (e: any) {
      setCloseMsg(`✗ ${e.message}`);
      setTimeout(() => setCloseMsg(""), 4000);
    }
    setClosing(false);
  }, [entryId, closing, fetchMt5]);

  useEffect(() => { if (entryId) { entryApi.getById(entryId).then(setData).catch(console.error); } }, [entryId]);
  useEffect(() => { fetchMt5(); const iv = setInterval(fetchMt5, 10000); return () => clearInterval(iv); }, [fetchMt5]);
  useEffect(() => { const iv = setInterval(() => { if (lastSync) setSyncAge(Math.round((Date.now() - lastSync.getTime()) / 1000)); }, 1000); return () => clearInterval(iv); }, [lastSync]);

  // Fetch rank from leaderboard every 30s
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

  /* ── Tournament countdown + auto-close ── */
  useEffect(() => {
    const entry = liveEntry || data?.entry;
    const endRaw = entry?.tournament_end;
    if (!endRaw) return;
    const endMs = new Date(endRaw).getTime();
    const tick = () => {
      const diff = endMs - Date.now();
      setMsLeft(diff);
      setCountdown(diff > 0 ? fmtCountdown(diff) : "Ended");
      // Auto-close at exactly 3 min before end
      if (diff > 0 && diff <= 3 * 60 * 1000 && !autoClosedRef.current) {
        const openCount = mt5?.open_trades?.length ?? 0;
        if (openCount > 0) {
          autoClosedRef.current = true;
          closeAllTrades("auto");
        }
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [data?.entry, liveEntry, mt5?.open_trades?.length, closeAllTrades]);

  const entry       = liveEntry || data?.entry;
  const violations  = data?.violations || [];
  const live        = mt5 || null;
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

  /* ── REAL Objectives checks ── */
  // 1. Min 31s: any closed trade < 31s is a violation (excluded from score)
  const hftTrades = closedTrades.filter((t: any) => tradeDuration(t) < 31);
  const validTrades = closedTrades.filter((t: any) => tradeDuration(t) >= 31);
  const hftStatus: "pass"|"warn"|"fail" = hftTrades.length > 0 ? "fail" : closedTrades.length > 0 ? "pass" : "pass";
  const hftValue = hftTrades.length > 0
    ? `${hftTrades.length} excluded (<31s)`
    : closedTrades.length > 0 ? `${validTrades.length} valid` : "No trades";

  // 2. No Hedging: simultaneous BUY+SELL on same symbol in open trades
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
  const hedgeValue = hedgedPairs.length > 0 ? `⚠ ${hedgedPairs.join(", ")}` : "Clean";

  // 3. External Deposit: balance at any close_time > starting balance POST tournament start
  //    Only a breach if it happened AFTER tournament started
  let depositBreach = false;
  let depositBreachAmt = 0;
  if (tournStart) {
    const allHistory = (live?.trade_history || []);
    // Check if any deposit/credit row exists AFTER tournament start
    const deposits = allHistory.filter((t: any) => {
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
  const depositValue = depositBreach ? `⚠ +$${fmt(depositBreachAmt)} added` : "Clean";

  // 4. Close 3min Early:
  const inFinal3Min = msLeft > 0 && msLeft <= 3 * 60 * 1000;
  const alreadyEnded = msLeft <= 0;
  const close3Status: "pass"|"warn"|"fail" =
    alreadyEnded ? (openTrades.filter(isRealTrade).length > 0 ? "fail" : "pass")
    : inFinal3Min ? (openTrades.filter(isRealTrade).length > 0 ? "fail" : "pass")
    : openTrades.filter(isRealTrade).length > 0 ? "warn" : "pass";
  const close3Value = alreadyEnded
    ? (openTrades.filter(isRealTrade).length > 0 ? "Open trades at end!" : "Clean")
    : inFinal3Min
    ? (openTrades.filter(isRealTrade).length > 0 ? `${openTrades.filter(isRealTrade).length} open — AUTO CLOSING` : "✓ All closed")
    : openTrades.filter(isRealTrade).length > 0 ? `${openTrades.filter(isRealTrade).length} open (close before 3min)` : "Clean";

  // Summary badge
  const objFails = [hftStatus, hedgeStatus, depositStatus, close3Status].filter(s => s === "fail").length;
  const objWarns = [hftStatus, hedgeStatus, depositStatus, close3Status].filter(s => s === "warn").length;

  // Symbol breakdown for P&L chart
  const symMap: Record<string, { profit: number; count: number }> = {};
  closedTrades.forEach((t: any) => {
    const s = t.symbol || "Other";
    if (!symMap[s]) symMap[s] = { profit: 0, count: 0 };
    symMap[s].profit += parseFloat(t.profit || 0);
    symMap[s].count++;
  });
  const symbolRows = Object.entries(symMap).sort((a, b) => Math.abs(b[1].profit) - Math.abs(a[1].profit)).slice(0, 5);
  const maxSymAbs  = Math.max(...symbolRows.map(([, v]) => Math.abs(v.profit)), 1);
  const displayTrades = tab === "open" ? openTrades : tab === "closed" ? closedTrades : [];

  /* ── Timer color ── */
  const timerColor = msLeft <= 3 * 60 * 1000 ? "#EF4444" : msLeft <= 15 * 60 * 1000 ? "#FFD700" : "#22C55E";
  const isActive = entry?.tournament_status === "active" || entry?.status === "active";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#04060d" }}>
      <Sidebar tournamentId={id} entry={entry} profitPct={profitPct} />

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        {/* ── Top bar ── */}
        <div style={{ background: "rgba(4,6,13,.97)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "0 28px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>
                {entry?.tournament_name || "Tournament"} — Entry #{entry?.entry_number ?? 1}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 1 }}>
                {entry?.broker || "Exness"} · {entry?.mt5_login || "—"} · synced {syncAge}s ago
              </div>
            </div>
            {live && <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", borderRadius: 20, padding: "3px 10px" }}>
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#22C55E" }}>Live</span>
            </div>}
          </div>

          {/* ── Right side: info strip + timer + actions — all gold ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Info pills — rank, traders, prize */}
            {isActive && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {rank !== null && (
                  <div style={{ background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 8, padding: "4px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,215,0,.5)" }}>Rank</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#FFD700", fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>
                      #{rank}<span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,215,0,.5)" }}>/{totalTraders}</span>
                    </div>
                  </div>
                )}
                <div style={{ background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 8, padding: "4px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,215,0,.5)" }}>Your Gain</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: profitPct >= 0 ? "#22C55E" : "#EF4444", fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>
                    {profitPct >= 0 ? "+" : ""}{fmt(profitPct)}%
                  </div>
                </div>
                <div style={{ background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 8, padding: "4px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,215,0,.5)" }}>Open</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: openTrades.filter(isRealTrade).length > 0 ? "#60a5fa" : "rgba(255,215,0,.4)", fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>
                    {openTrades.filter(isRealTrade).length}
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            {isActive && countdown && <div style={{ width: 1, height: 36, background: "rgba(255,215,0,.15)" }} />}

            {/* ── BIG TIMER — always gold ── */}
            {isActive && countdown && (() => {
              const [mm, ss] = countdown.split(":");
              const urgent  = msLeft > 0 && msLeft <= 3 * 60 * 1000;
              const warning = msLeft > 0 && msLeft <= 15 * 60 * 1000 && !urgent;
              const glow    = urgent ? "0 0 16px #FFD700cc" : warning ? "0 0 10px #FFD70066" : "0 0 6px #FFD70033";
              const label   = urgent ? "⚡ CLOSING SOON" : warning ? "⚠ HURRY UP" : "TIME LEFT";
              const DigitBlock = ({ v }: { v: string }) => (
                <div style={{
                  background: urgent ? "rgba(255,215,0,.18)" : "rgba(255,215,0,.10)",
                  border: "1.5px solid rgba(255,215,0,.35)",
                  borderRadius: 7,
                  minWidth: 36, height: 46,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Grotesk',monospace",
                  fontSize: 26, fontWeight: 900,
                  color: "#FFD700",
                  letterSpacing: "-1px",
                  boxShadow: glow,
                  transition: "box-shadow .4s, background .4s",
                }}>{v}</div>
              );
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: urgent ? "#FFD700" : "rgba(255,215,0,.55)", animation: urgent ? "pulse-colon .8s step-start infinite" : "none" }}>
                    {label}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <DigitBlock v={mm[0]} />
                    <DigitBlock v={mm[1]} />
                    <span style={{
                      fontSize: 24, fontWeight: 900, color: "#FFD700",
                      lineHeight: 1, paddingBottom: 2,
                      opacity: urgent ? 1 : 0.7,
                      animation: urgent ? "pulse-colon 1s step-start infinite" : "none",
                    }}>:</span>
                    <DigitBlock v={ss[0]} />
                    <DigitBlock v={ss[1]} />
                  </div>
                </div>
              );
            })()}

            {/* Divider */}
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,.08)" }} />

            {/* Close all button */}
            {openTrades.filter(isRealTrade).length > 0 && (
              <button onClick={() => closeAllTrades("manual")} disabled={closing}
                style={{ padding: "7px 14px", background: "#EF4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: closing ? "not-allowed" : "pointer", opacity: closing ? .6 : 1 }}>
                {closing ? "Closing..." : `Close All (${openTrades.filter(isRealTrade).length})`}
              </button>
            )}
            {closeMsg && <div style={{ fontSize: 12, fontWeight: 600, color: closeMsg.startsWith("✓") ? "#22C55E" : "#fbbf24", padding: "4px 10px", background: "rgba(255,255,255,.05)", borderRadius: 8 }}>{closeMsg}</div>}
            <button className="btn btn-primary btn-sm">+ Re-enter</button>
          </div>
        </div>

        {/* ── 3min warning banner ── */}
        {inFinal3Min && openTrades.filter(isRealTrade).length > 0 && (
          <div style={{ background: "rgba(239,68,68,.12)", borderBottom: "1px solid rgba(239,68,68,.3)", padding: "10px 28px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#EF4444" }}>Tournament ending in {countdown} min — </span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>Auto-closing all open trades now to protect your score.</span>
            </div>
          </div>
        )}

        <div style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Hero metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
            {[
              { label: "% Gain", value: `${profitPct >= 0 ? "+" : ""}${fmt(profitPct)}%`, sub: "Ranking metric", accent: col(profitPct), big: true },
              { label: "Net Profit", value: `${profitAbs >= 0 ? "+" : "-"}$${fmt(Math.abs(profitAbs))}`, sub: `From $${fmt(startBal, 0)} start`, accent: col(profitAbs) },
              { label: "Balance", value: `$${fmt(balance)}`, sub: `Equity $${fmt(equity)}`, accent: "#fff" },
              { label: "Unrealized P&L", value: `${unrealized >= 0 ? "+" : ""}$${fmt(Math.abs(unrealized))}`, sub: `${openTrades.filter(isRealTrade).length} open position${openTrades.filter(isRealTrade).length !== 1 ? "s" : ""}`, accent: col(unrealized) },
              { label: "Max Drawdown", value: `-${fmt(Math.abs(maxDD))}%`, sub: "100% limit · Safe", accent: Math.abs(maxDD) > 20 ? "var(--red)" : Math.abs(maxDD) > 10 ? "#FFD700" : "#22C55E" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(13,17,26,.9)", border: `1px solid ${i === 0 ? `${col(profitPct)}30` : "rgba(255,255,255,.07)"}`, borderRadius: 12, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                {i === 0 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: col(profitPct) }} />}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: s.big ? 28 : 22, fontWeight: 900, color: s.accent, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-1px", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Equity curve + Objectives */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Equity Curve</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{closedTrades.length} closed trades · live equity point</div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,.35)", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 2, background: "#FFD700", opacity: .5, display: "inline-block", borderRadius: 1 }} />Start</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 2, background: col(profitPct), display: "inline-block", borderRadius: 1 }} />Equity</span>
                </div>
              </div>
              <div style={{ padding: "16px 20px 14px" }}>
                <EquityCurve trades={closedTrades} startBal={startBal} balance={balance} equity={equity} />
              </div>
              {closedTrades.length > 0 && (
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Daily P&L</div>
                  <DailyBars trades={closedTrades} />
                </div>
              )}
            </div>

            {/* Objectives — REAL computed checks */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Objectives</div>
                <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 20, fontWeight: 700,
                  background: objFails > 0 ? "rgba(239,68,68,.1)" : objWarns > 0 ? "rgba(255,215,0,.1)" : "rgba(34,197,94,.1)",
                  color: objFails > 0 ? "#EF4444" : objWarns > 0 ? "#FFD700" : "#22C55E" }}>
                  {objFails > 0 ? `${objFails} breach${objFails > 1 ? "es" : ""}` : objWarns > 0 ? `${objWarns} warning${objWarns > 1 ? "s" : ""}` : "4 / 4 pass"}
                </span>
              </div>

              <ObjRow
                label="Min 31s Duration"
                desc="Trades < 31s excluded from % gain"
                value={hftValue}
                status={hftStatus}
              />
              <ObjRow
                label="No Hedging"
                desc="No simultaneous BUY+SELL same pair"
                value={hedgeValue}
                status={hedgeStatus}
              />
              <ObjRow
                label="No External Deposit"
                desc="No balance added after battle start"
                value={depositValue}
                status={depositStatus}
              />
              <ObjRow
                label="Close 3min Early"
                desc="All trades closed before final 3 min"
                value={close3Value}
                status={close3Status}
              />

              {/* Active violations from DB */}
              {violations.length > 0 && (
                <div style={{ padding: "10px 14px" }}>
                  {violations.map((v: any, i: number) => (
                    <div key={i} style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444" }}>{v.type || v.rule_name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{v.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Gauges */}
              <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-around" }}>
                <Gauge value={winRate} max={100} label="Win Rate" color={winRate >= 50 ? "#22C55E" : "#EF4444"} />
                <Gauge value={Math.max(profitPct, 0)} max={30} label="% Gain" color="#FFD700" />
                <Gauge value={100 - Math.abs(maxDD)} max={100} label="DD Safety" color={Math.abs(maxDD) < 20 ? "#22C55E" : "#FFD700"} />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Trading Statistics</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                  ["Profit Factor", pf > 0 ? pf.toFixed(2) : "—", pf >= 1.5 ? "#22C55E" : pf >= 1 ? "#FFD700" : "rgba(255,255,255,.5)"],
                  ["Win Rate", `${winRate}%`, winRate >= 50 ? "#22C55E" : "#EF4444"],
                  ["Valid Trades", validTrades.length, "#fff"],
                  ["Avg Win", avgWin > 0 ? `+$${fmt(avgWin)}` : "—", "#22C55E"],
                  ["Avg Loss", avgLoss > 0 ? `-$${fmt(avgLoss)}` : "—", "#EF4444"],
                  ["HFT Excluded", hftTrades.length, hftTrades.length > 0 ? "#EF4444" : "rgba(255,255,255,.4)"],
                  ["Best Trade", bestTrade > 0 ? `+$${fmt(bestTrade)}` : "—", "#22C55E"],
                  ["Worst Trade", worstTrade < 0 ? `-$${fmt(Math.abs(worstTrade))}` : "—", "#EF4444"],
                  ["Max Drawdown", `-${fmt(Math.abs(maxDD))}%`, Math.abs(maxDD) > 20 ? "#EF4444" : "#22C55E"],
                ].map(([l, v, c], i) => (
                  <div key={i} style={{ padding: "13px 16px", borderRight: (i % 3 !== 2) ? "1px solid rgba(255,255,255,.04)" : "none", borderBottom: i < 6 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.28)", marginBottom: 5 }}>{l}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: c as string, fontFamily: "var(--font-head)", letterSpacing: "-.5px" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>P&L by Symbol</div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{Object.keys(symMap).length} pair{Object.keys(symMap).length !== 1 ? "s" : ""} traded</span>
              </div>
              <div style={{ padding: "14px 20px" }}>
                {symbolRows.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "24px 0" }}>No closed trades yet</div>
                ) : symbolRows.map(([sym, { profit, count }]) => (
                  <div key={sym} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#fff" }}>{sym}</span>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: col(profit) }}>{profit >= 0 ? "+" : ""}${fmt(Math.abs(profit))}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginLeft: 6 }}>{count} trade{count !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(Math.abs(profit) / maxSymAbs) * 100}%`, background: profit >= 0 ? "#22C55E" : "#EF4444", borderRadius: 3, transition: "width .6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trade Journal */}
          <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Trade Journal</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["open", "closed", "violations"] as const).map(t => {
                  const count = t === "open" ? openTrades.filter(isRealTrade).length : t === "closed" ? closedTrades.length : violations.length;
                  return (
                    <button key={t} onClick={() => setTab(t)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", fontFamily: "var(--font-body)", background: tab === t ? "rgba(255,215,0,.1)" : "rgba(255,255,255,.05)", color: tab === t ? "#FFD700" : "rgba(255,255,255,.4)" }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}{count > 0 ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th><th>Side</th><th>Lots</th>
                    <th>Open Price</th><th>Close Price</th>
                    <th>Duration</th><th>P&L</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tab === "violations" ? (
                    violations.length === 0
                      ? <tr><td colSpan={8} style={{ textAlign: "center", color: "rgba(255,255,255,.25)", padding: "32px 0" }}>No violations recorded ✓</td></tr>
                      : violations.map((v: any, i: number) => (
                        <tr key={i}>
                          <td colSpan={6} style={{ color: "#EF4444", fontWeight: 600 }}>{v.rule_name || v.type}</td>
                          <td className="mono" style={{ color: "#EF4444" }}>{v.description || "—"}</td>
                          <td><span style={{ padding: "2px 8px", borderRadius: 20, background: "rgba(239,68,68,.1)", color: "#EF4444", fontSize: 10, fontWeight: 700 }}>Violation</span></td>
                        </tr>
                      ))
                  ) : displayTrades.filter(isRealTrade).length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", color: "rgba(255,255,255,.25)", padding: "32px 0" }}>
                      {!live ? "Connecting to bridge..." : tab === "open" ? "No open positions" : "No closed trades yet"}
                    </td></tr>
                  ) : displayTrades.filter(isRealTrade).map((t: any, i: number) => {
                    const isOpen = tab === "open";
                    const side = (t.type || t.side || "buy").toString().toLowerCase();
                    const isBuy = side.includes("buy") || side === "0";
                    const pnl = parseFloat(t.profit ?? 0);
                    const dur = isOpen ? tradeDuration(t) : tradeDuration(t);
                    const isHFT = !isOpen && dur < 31;
                    return (
                      <tr key={i} style={{ opacity: isHFT ? 0.5 : 1 }}>
                        <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "#fff" }}>
                          {t.symbol || "—"}{isHFT && <span style={{ fontSize: 9, color: "#EF4444", marginLeft: 4 }}>HFT</span>}
                        </td>
                        <td><span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: isBuy ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)", color: isBuy ? "#22C55E" : "#EF4444" }}>{isBuy ? "BUY" : "SELL"}</span></td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{parseFloat(t.lots ?? t.volume ?? 0).toFixed(2)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "rgba(255,255,255,.6)" }}>{t.open_price || "—"}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "rgba(255,255,255,.6)" }}>{isOpen ? "—" : (t.close_price || "—")}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: isHFT ? "#EF4444" : dur < 60 ? "#fbbf24" : "rgba(255,255,255,.5)", fontSize: 11 }}>
                          {isOpen ? `${fmtCountdown(dur * 1000)} live` : dur < 60 ? `${dur}s` : `${Math.floor(dur / 60)}m ${dur % 60}s`}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: col(pnl) }}>{pnl >= 0 ? "+" : ""}${fmt(Math.abs(pnl))}</td>
                        <td><span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: isHFT ? "rgba(239,68,68,.1)" : isOpen ? "rgba(96,165,250,.1)" : "rgba(34,197,94,.1)", color: isHFT ? "#EF4444" : isOpen ? "#60a5fa" : "#22C55E" }}>{isHFT ? "Excluded" : isOpen ? "Open" : "Closed"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.28)" }}>
              <span>{live ? `Live · C# Bridge · synced ${syncAge}s ago` : "Connecting..."}</span>
              <span>{closedTrades.length} closed · {openTrades.filter(isRealTrade).length} open · {hftTrades.length} excluded · {violations.length} violations</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
