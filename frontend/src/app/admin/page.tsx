"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";

const API    = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
const fmt    = (v: number, d = 2) => parseFloat((v || 0).toFixed(d)).toLocaleString("en", { minimumFractionDigits: d, maximumFractionDigits: d });
const num    = (v: any)           => parseFloat(v || 0);

/* ── Sparkline ── */
function Spark({ data, color = "#FFD700", h = 36 }: any) {
  if (!data?.length || data.length < 2) return <div style={{ height: h }} />;
  const vals = data.map((d: any) => num(d.revenue || d.value || 0));
  const max  = Math.max(...vals, 1);
  const min  = Math.min(...vals);
  const rng  = max - min || 1;
  const W = 100, H = h;
  const pts  = vals.map((v: number, i: number) =>
    `${(i / (vals.length - 1)) * W},${H - ((v - min) / rng) * (H - 4) - 2}`
  ).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill={`${color}18`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Revenue bars ── */
function RevBars({ daily }: { daily: any[] }) {
  if (!daily?.length) return <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.15)", fontSize: 12 }}>No revenue data yet</div>;
  const max = Math.max(...daily.map((d: any) => num(d.revenue)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
      {daily.slice(-14).map((d: any, i: number) => {
        const h = Math.max((num(d.revenue) / max) * 76, 2);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
            title={`${new Date(d.day).toLocaleDateString("en", { month: "short", day: "numeric" })}: $${fmt(num(d.revenue))}`}>
            <div style={{ width: "100%", background: `linear-gradient(180deg,#FFD700 0%,#FF6400 100%)`, borderRadius: "2px 2px 0 0", height: h, minHeight: 2, opacity: 0.7 + (i / daily.length) * 0.3 }} />
          </div>
        );
      })}
    </div>
  );
}

/* ── Mini fill bar ── */
function FillBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width .5s ease" }} />
    </div>
  );
}

/* ── KPI card ── */
function KpiCard({ label, value, sub, color = "#FFD700", icon, spark, delta, href }: any) {
  const inner = (
    <div style={{ background: "rgba(13,17,26,.95)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "16px 18px", position: "relative", overflow: "hidden", cursor: href ? "pointer" : "default", transition: "border-color .15s" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: .55 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.3)" }}>{label}</div>
        <span style={{ fontSize: 18, lineHeight: 1, opacity: .7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: "-1px", fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spark ? 8 : 0 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{sub}</div>
        {delta !== undefined && <span style={{ fontSize: 10, fontWeight: 700, color: delta >= 0 ? "#22C55E" : "#EF4444" }}>{delta >= 0 ? "▲" : "▼"}{Math.abs(delta)}%</span>}
      </div>
      {spark && <Spark data={spark} color={color} />}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

/* ── Bridge account tile ── */
function BridgeTile({ acc }: { acc: any }) {
  const bal  = num(acc.balance);
  const eq   = num(acc.equity || acc.balance);
  const prof = num(acc.profit || 0);
  const pctChg = Math.round((bal - 1000) / 10 * 100) / 100;
  const isUp = pctChg >= 0;
  return (
    <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,.7)", fontWeight: 600 }}>{acc.login}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block", boxShadow: "0 0 6px #22C55E" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "#22C55E" }}>LIVE</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[["Balance", `$${fmt(bal)}`, "#fff"], ["Equity", `$${fmt(eq)}`, eq >= bal ? "#22C55E" : "#EF4444"], ["Float", `${prof >= 0 ? "+" : ""}$${fmt(Math.abs(prof))}`, prof >= 0 ? "#22C55E" : "#EF4444"]].map(([l, v, c]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.25)", marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: c as string, fontFamily: "'Space Grotesk',sans-serif" }}>{v}</div>
          </div>
        ))}
      </div>
      <FillBar pct={Math.min((bal / 1000) * 100, 100)} color={bal >= 1000 ? "#22C55E" : bal >= 900 ? "#FFD700" : "#EF4444"} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,.2)" }}>$1,000 base</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: isUp ? "#22C55E" : "#EF4444" }}>{isUp ? "+" : ""}{pctChg.toFixed(2)}%</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [dash, setDash]       = useState<any>(null);
  const [fin, setFin]         = useState<any>(null);
  const [activity, setAct]    = useState<any[]>([]);
  const [bridge, setBridge]   = useState<any[]>([]);
  const [tours, setTours]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ts, setTs]           = useState(new Date());

  const load = useCallback(async () => {
    try {
      const [d, f, a, t] = await Promise.all([
        adminApi.dashboard().catch(() => null),
        adminApi.finance().catch(() => null),
        adminApi.activity().catch(() => []),
        fetch(`${API}/api/tournaments`).then(r => r.json()).then(r => r.data || []).catch(() => []),
      ]);
      setDash(d); setFin(f?.data || f); setAct(Array.isArray(a) ? a : []); setTours(t); setTs(new Date());
      fetch("http://38.60.196.145:5099/health").then(r => r.json()).then(h => setBridge(h.accounts || [])).catch(() => {});
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  const byStatus  = (s: string) => tours.filter((t: any) => t.status === s);
  const active    = byStatus("active");
  const reg       = byStatus("registration");
  const ended     = byStatus("ended");
  const ppay      = num(dash?.payouts?.find((p: any) => p.status === "pending")?.count);
  const pviol     = num(dash?.violations?.find((v: any) => v.status === "pending_review")?.count);
  const pkyc      = num(dash?.fundedAccounts?.find((f: any) => f.status === "pending_kyc")?.count);
  const totalRev  = num(fin?.revenue?.confirmed_revenue || 0);
  const pendRev   = num(fin?.revenue?.pending_revenue || 0);
  const totalLive = active.reduce((s: number, t: any) => s + num(t.active_entries), 0);

  const NAV = [
    { href: "/admin",             label: "Dashboard",     icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", active: true },
    { href: "/admin/tournaments", label: "Battles",       icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z", alert: active.length },
    { href: "/admin/users",       label: "Users",         icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { href: "/admin/payments",    label: "Payments",      icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { href: "/admin/payouts",     label: "Payouts",       icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", alert: ppay },
    { href: "/admin/violations",  label: "Violations",    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", alert: pviol },
    { href: "/admin/funded-accounts", label: "Funded",   icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", alert: pkyc },
    { href: "/admin/finance",     label: "Finance",       icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { href: "/admin/guild",       label: "Guild",         icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { href: "/admin/settings",    label: "Settings",      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 14 }}>
      <div className="spinner" />
      <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>Loading MFT Control...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#03050a" }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: 220, background: "#060810", borderRight: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "auto" }}>
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.25)", marginBottom: 4 }}>Admin Panel</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 900, fontSize: 16, color: "#FFD700" }}>MFT Control</div>
        </div>
        <div style={{ padding: "8px" }}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 2, background: n.active ? "rgba(255,215,0,.08)" : "transparent", textDecoration: "none", position: "relative" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={n.active ? "#FFD700" : "rgba(255,255,255,.35)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
              <span style={{ fontSize: 13, fontWeight: n.active ? 700 : 500, color: n.active ? "#FFD700" : "rgba(255,255,255,.5)", flex: 1 }}>{n.label}</span>
              {(n as any).alert > 0 && <span style={{ background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>{(n as any).alert}</span>}
            </Link>
          ))}
        </div>
        <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 10, color: "rgba(255,255,255,.2)" }}>
          Logged in as admin
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: "auto" }}>

        {/* Header */}
        <div style={{ background: "rgba(3,5,10,.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "0 28px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.3)" }}>Overview</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>Dashboard</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(ppay + pviol + pkyc) > 0 && (
              <div style={{ display: "flex", gap: 6 }}>
                {ppay > 0 && <Link href="/admin/payouts" style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.25)", borderRadius: 8, padding: "4px 10px", textDecoration: "none" }}>⚡ {ppay} payout{ppay > 1 ? "s" : ""}</Link>}
                {pviol > 0 && <Link href="/admin/violations" style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "4px 10px", textDecoration: "none" }}>⚠️ {pviol} violation{pviol > 1 ? "s" : ""}</Link>}
                {pkyc > 0 && <Link href="/admin/funded-accounts" style={{ fontSize: 11, fontWeight: 700, color: "#FFD700", background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.25)", borderRadius: 8, padding: "4px 10px", textDecoration: "none" }}>🏆 {pkyc} KYC</Link>}
              </div>
            )}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>Updated {ts.toLocaleTimeString()}</div>
            <button onClick={load} style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer" }}>↻</button>
          </div>
        </div>

        <div style={{ padding: "20px 28px 40px" }}>

          {/* ── KPI row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
            <KpiCard label="Total Revenue" value={`$${fmt(totalRev)}`} sub={`$${fmt(pendRev)} pending`} color="#FFD700" icon="💰" spark={fin?.daily} href="/admin/finance" />
            <KpiCard label="Active Battles" value={active.length} sub={`${reg.length} in registration`} color="#22C55E" icon="⚔️" href="/admin/tournaments" />
            <KpiCard label="Live Traders" value={totalLive} sub="In active battles" color="#60a5fa" icon="👤" />
            <KpiCard label="Battles Ended" value={ended.length} sub="All time" color="rgba(255,255,255,.5)" icon="🏁" />
            <KpiCard label="Actions Needed" value={ppay + pviol + pkyc} sub={`${ppay} payouts · ${pviol} violations · ${pkyc} KYC`} color={(ppay + pviol + pkyc) > 0 ? "#EF4444" : "#22C55E"} icon="🔔" />
          </div>

          {/* ── Main 3-column grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 14, marginBottom: 14 }}>

            {/* Revenue chart */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Revenue — Last 14 Days</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#FFD700", fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-1px", marginTop: 2 }}>${fmt(totalRev)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#22C55E" }}>✓ {fin?.revenue?.confirmed_count || 0} confirmed</div>
                  <div style={{ fontSize: 11, color: "#fbbf24" }}>⏳ {fin?.revenue?.pending_count || 0} pending</div>
                </div>
              </div>
              <div style={{ padding: "14px 20px 10px" }}>
                <RevBars daily={fin?.daily || []} />
                {fin?.daily?.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    {fin.daily.slice(-7).map((d: any, i: number) => (
                      <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,.2)", textAlign: "center" }}>
                        {new Date(d.day).toLocaleDateString("en", { weekday: "narrow" })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Revenue by tier */}
              {fin?.byTier?.length > 0 && (
                <div style={{ padding: "10px 20px 14px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.25)", marginBottom: 10 }}>By Tier</div>
                  {fin.byTier.map((t: any) => {
                    const total = fin.byTier.reduce((s: number, x: any) => s + num(x.revenue), 0);
                    const pct   = total > 0 ? Math.round((num(t.revenue) / total) * 100) : 0;
                    const clr   = t.tier === "starter" ? "#60a5fa" : t.tier === "pro" ? "#FFD700" : "#a78bfa";
                    return (
                      <div key={t.tier} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                        <span style={{ fontSize: 10, textTransform: "capitalize", color: "rgba(255,255,255,.45)", width: 50, flexShrink: 0 }}>{t.tier}</span>
                        <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,.05)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: clr, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, color: clr, fontWeight: 700, width: 36, textAlign: "right" }}>{pct}%</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", width: 50, textAlign: "right" }}>${fmt(num(t.revenue), 0)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active battles + Top traders */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Active battles */}
              <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden", flex: 1 }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Live Battles</div>
                  <Link href="/admin/tournaments" style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none" }}>All →</Link>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {[...active, ...reg].length === 0 ? (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "20px 0" }}>No active battles</div>
                  ) : [...active, ...reg].slice(0, 4).map((t: any) => {
                    const filled = num(t.active_entries);
                    const max    = num(t.max_entries || 25);
                    const pctF   = Math.round((filled / max) * 100);
                    return (
                      <div key={t.id} style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{t.name}</span>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#FFD700" }}>${fmt(num(t.prize_pool), 0)}</span>
                            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, fontWeight: 700, background: t.status === "active" ? "rgba(34,197,94,.1)" : "rgba(255,215,0,.1)", color: t.status === "active" ? "#22C55E" : "#FFD700" }}>{t.status}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pctF}%`, background: t.status === "active" ? "#22C55E" : "#FFD700", borderRadius: 2, transition: "width .5s" }} />
                          </div>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)", whiteSpace: "nowrap" }}>{filled}/{max} · ${t.entry_fee}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top traders */}
              <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Top Spenders</div>
                </div>
                <div style={{ padding: "6px 0" }}>
                  {(fin?.topTraders || []).length === 0 ? (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "16px 0" }}>No data yet</div>
                  ) : (fin.topTraders || []).slice(0, 4).map((t: any, i: number) => {
                    const medals = ["🥇", "🥈", "🥉", ""];
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                        <span style={{ fontSize: 14, flexShrink: 0, width: 20 }}>{medals[i] || `#${i + 1}`}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.username || t.email?.split("@")[0]}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)" }}>{t.entry_count} entries</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#FFD700" }}>${fmt(num(t.total_spent))}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bridge monitor */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>MT5 Bridge</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: bridge.length > 0 ? "#22C55E" : "#EF4444", display: "inline-block" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>{bridge.length} connected</span>
                </div>
              </div>
              <div style={{ padding: "12px" }}>
                {bridge.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "20px 0" }}>Bridge offline</div>
                ) : bridge.map((acc: any) => <BridgeTile key={acc.login} acc={acc} />)}
              </div>
              <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 9, color: "rgba(255,255,255,.2)", textAlign: "center" }}>
                port 5099 · synced every 5s
              </div>
            </div>
          </div>

          {/* ── Bottom row: Battle status + Activity + Winners ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

            {/* Battle status */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Battle Status</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(255,255,255,.04)" }}>
                {[
                  ["Registration", reg.length, "#FFD700"],
                  ["Active", active.length, "#22C55E"],
                  ["Ended", ended.length, "rgba(255,255,255,.4)"],
                  ["Prize Pool", `$${fmt(active.reduce((s: number, t: any) => s + num(t.prize_pool), 0), 0)}`, "#a78bfa"],
                ].map(([l, v, c]) => (
                  <div key={l as string} style={{ background: "rgba(13,17,26,.9)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,.28)", marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: c as string, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-1px" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Recent Activity</div>
              </div>
              <div style={{ padding: "4px 0" }}>
                {activity.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "24px 0" }}>No activity yet</div>
                ) : activity.slice(0, 7).map((a: any, i: number) => {
                  const icons: any = { entry: "🎯", payment: "💳", winner: "🏆", violation: "⚠️", register: "👤" };
                  const colors: any = { entry: "#60a5fa", payment: "#22C55E", winner: "#FFD700", violation: "#EF4444", register: "#a78bfa" };
                  const type = a.type || "entry";
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,.04)", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{icons[type] || "📌"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: colors[type] || "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description || a.message || type}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)", marginTop: 1 }}>{a.username || a.email?.split("@")[0] || "—"} · {a.created_at ? new Date(a.created_at).toLocaleTimeString() : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent winners */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Recent Winners</div>
              </div>
              <div style={{ padding: "4px 0" }}>
                {(fin?.recentWinners || []).length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "24px 0" }}>No winners yet</div>
                ) : (fin.recentWinners || []).slice(0, 5).map((w: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🏆</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.username || w.email?.split("@")[0]}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>{w.tournament_name} · +{fmt(num(w.profit_pct))}%</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#22C55E" }}>${fmt(num(w.account_size), 0)}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)", textTransform: "capitalize" }}>{w.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
