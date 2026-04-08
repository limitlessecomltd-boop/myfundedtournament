"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
const BRIDGE = "http://38.60.196.145:5099";

function num(v: any, decimals = 0) {
  const n = parseFloat(v || 0);
  return isNaN(n) ? 0 : parseFloat(n.toFixed(decimals));
}

function SparkLine({ data, color = "#FFD700", height = 40 }: any) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const vals = data.map((d: any) => parseFloat(d.revenue || d.value || 0));
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals);
  const range = max - min || 1;
  const w = 120, h = height;
  const pts = vals.map((v: number, i: number) =>
    `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
  ).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`}
        fill={`${color}18`} stroke="none" />
    </svg>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width .6s ease" }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color = "#FFD700", sparkData, icon, delta }: any) {
  return (
    <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: .6 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>{label}</div>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: "-1px", fontFamily: "'DM Sans','Space Grotesk',sans-serif", lineHeight: 1 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)" }}>{sub}</div>
        {delta !== undefined && <span style={{ fontSize: 11, fontWeight: 700, color: delta >= 0 ? "#22C55E" : "#EF4444" }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%</span>}
      </div>
      {sparkData && <div style={{ marginTop: 8 }}><SparkLine data={sparkData} color={color} /></div>}
    </div>
  );
}

function BridgeStatus({ accounts }: { accounts: any[] }) {
  return (
    <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.32)", marginBottom: 14 }}>Live MT5 Bridge</div>
      {accounts.map((a: any) => {
        const pct = parseFloat(a.profit || 0);
        const eq = parseFloat(a.equity || a.balance || 0);
        const bal = parseFloat(a.balance || 0);
        const unrealized = Math.round((eq - bal) * 100) / 100;
        return (
          <div key={a.login} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: "#fff" }}>{a.login}</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(34,197,94,.1)", color: "#22C55E", fontWeight: 700 }}>● Live</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 4 }}>
              <div><div style={{ fontSize: 9, color: "rgba(255,255,255,.28)" }}>Balance</div><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>${bal.toFixed(2)}</div></div>
              <div><div style={{ fontSize: 9, color: "rgba(255,255,255,.28)" }}>Equity</div><div style={{ fontSize: 13, fontWeight: 700, color: eq >= bal ? "#22C55E" : "#EF4444" }}>${eq.toFixed(2)}</div></div>
              <div><div style={{ fontSize: 9, color: "rgba(255,255,255,.28)" }}>Float P&L</div><div style={{ fontSize: 13, fontWeight: 700, color: unrealized >= 0 ? "#22C55E" : "#EF4444" }}>{unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}</div></div>
            </div>
            <MiniBar pct={Math.min((bal / 1000) * 100, 100)} color={bal >= 1000 ? "#22C55E" : bal >= 900 ? "#FFD700" : "#EF4444"} />
          </div>
        );
      })}
    </div>
  );
}

function RevenueChart({ daily }: { daily: any[] }) {
  if (!daily?.length) return <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.2)", fontSize: 12 }}>No revenue data yet</div>;
  const max = Math.max(...daily.map((d: any) => parseFloat(d.revenue || 0)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, padding: "0 4px" }}>
      {daily.slice(-14).map((d: any, i: number) => {
        const h = Math.max((parseFloat(d.revenue) / max) * 80, 2);
        const date = new Date(d.day).toLocaleDateString("en", { month: "short", day: "numeric" });
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} title={`${date}: $${parseFloat(d.revenue).toFixed(2)}`}>
            <div style={{ width: "100%", height: h, background: "linear-gradient(180deg,#FFD700,#FF6400)", borderRadius: "2px 2px 0 0", minHeight: 2, opacity: .85 + (i / daily.length) * .15 }} />
          </div>
        );
      })}
    </div>
  );
}

function TierPie({ byTier }: { byTier: any[] }) {
  if (!byTier?.length) return null;
  const total = byTier.reduce((s: number, t: any) => s + parseFloat(t.revenue || 0), 0);
  const colors: Record<string, string> = { starter: "#60a5fa", pro: "#FFD700", guild: "#a78bfa" };
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {byTier.map((t: any) => {
        const pct = total > 0 ? Math.round((parseFloat(t.revenue) / total) * 100) : 0;
        const c = colors[t.tier] || "#fff";
        return (
          <div key={t.tier} style={{ flex: 1, minWidth: 80 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 4, textTransform: "capitalize" }}>{t.tier}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "'DM Sans',sans-serif" }}>{pct}%</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>${parseFloat(t.revenue || 0).toFixed(0)}</div>
            <MiniBar pct={pct} color={c} />
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const [dash, setDash]         = useState<any>(null);
  const [finance, setFinance]   = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [bridge, setBridge]     = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [users, setUsers]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const [d, f, a, t, u] = await Promise.all([
        adminApi.dashboard().catch(() => null),
        adminApi.finance().catch(() => null),
        adminApi.activity().catch(() => []),
        fetch(`${API}/api/tournaments`).then(r => r.json()).then(r => r.data || []).catch(() => []),
        adminApi.users({ limit: 5 }).catch(() => null),
      ]);
      setDash(d); setFinance(f?.data || f); setActivity(Array.isArray(a) ? a : []);
      setTournaments(t); setUsers(u);
      setLastRefresh(new Date());

      // Bridge health — direct call
      fetch("http://38.60.196.145:5099/health").then(r => r.json())
        .then(h => setBridge(h.accounts || [])).catch(() => {});
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000); // refresh every 10s
    return () => clearInterval(iv);
  }, [load]);

  const toursByStatus = (s: string) => dash?.tournaments?.find((t: any) => t.status === s)?.count || 0;
  const pendingPayouts    = num(dash?.payouts?.find((p: any) => p.status === "pending")?.count);
  const pendingViolations = num(dash?.violations?.find((v: any) => v.status === "pending_review")?.count);
  const pendingKyc        = num(dash?.fundedAccounts?.find((f: any) => f.status === "pending_kyc")?.count);
  const totalRevenue      = num(finance?.revenue?.confirmed_revenue || dash?.total_revenue?.total, 2);
  const pendingRevenue    = num(finance?.revenue?.pending_revenue, 2);
  const totalUsers        = num(users?.total || 0);
  const activeTours       = tournaments.filter((t: any) => t.status === "active");
  const regTours          = tournaments.filter((t: any) => t.status === "registration");
  const totalEntries      = activeTours.reduce((s: number, t: any) => s + num(t.active_entries), 0);

  const QUICK = [
    { href: "/admin/tournaments", icon: "⚔️", label: "Battles",      color: "#FFD700", alert: activeTours.length },
    { href: "/admin/users",       icon: "👥", label: "Users",         color: "#60a5fa", alert: 0 },
    { href: "/admin/payments",    icon: "💳", label: "Payments",      color: "#22C55E", alert: 0 },
    { href: "/admin/payouts",     icon: "💰", label: "Payouts",       color: "#a78bfa", alert: pendingPayouts },
    { href: "/admin/violations",  icon: "⚠️", label: "Violations",    color: "#EF4444", alert: pendingViolations },
    { href: "/admin/finance",     icon: "📈", label: "Finance",       color: "#FF6400", alert: 0 },
    { href: "/admin/guild",       icon: "🔥", label: "Guild",         color: "#f472b6", alert: 0 },
    { href: "/admin/settings",    icon: "⚙️", label: "Settings",      color: "rgba(255,255,255,.4)", alert: 0 },
  ];

  if (loading) return (
    <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
      <div className="spinner" />
      <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>Loading dashboard...</div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", background: "#03050a", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 6 }}>MFT Admin</div>
          <h1 style={{ fontFamily: "'DM Sans','Space Grotesk',sans-serif", fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-1px", margin: 0 }}>Dashboard</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)" }}>Last refresh: {lastRefresh.toLocaleTimeString()}</div>
          <button onClick={load} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", fontSize: 12, cursor: "pointer" }}>↻ Refresh</button>
        </div>
      </div>

      {/* Alert bar */}
      {(pendingPayouts > 0 || pendingViolations > 0 || pendingKyc > 0) && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {pendingPayouts > 0 && <Link href="/admin/payouts" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.3)", borderRadius: 8, padding: "6px 12px", textDecoration: "none", fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>⚡ {pendingPayouts} payout{pendingPayouts > 1 ? "s" : ""} pending</Link>}
          {pendingViolations > 0 && <Link href="/admin/violations" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, padding: "6px 12px", textDecoration: "none", fontSize: 12, color: "#EF4444", fontWeight: 700 }}>⚠️ {pendingViolations} violation{pendingViolations > 1 ? "s" : ""}</Link>}
          {pendingKyc > 0 && <Link href="/admin/funded-accounts" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.3)", borderRadius: 8, padding: "6px 12px", textDecoration: "none", fontSize: 12, color: "#FFD700", fontWeight: 700 }}>🏆 {pendingKyc} KYC pending</Link>}
        </div>
      )}

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 8, marginBottom: 24 }}>
        {QUICK.map(q => (
          <Link key={q.href} href={q.href} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, textDecoration: "none", transition: "all .15s" }}>
            <span style={{ fontSize: 20 }}>{q.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.5)" }}>{q.label}</span>
            {q.alert > 0 && <span style={{ position: "absolute", top: 6, right: 6, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 10, padding: "1px 5px", minWidth: 14, textAlign: "center" }}>{q.alert}</span>}
          </Link>
        ))}
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} sub={`$${pendingRevenue.toFixed(2)} pending`} color="#FFD700" icon="💰" sparkData={finance?.daily} />
        <KpiCard label="Active Battles" value={activeTours.length} sub={`${regTours.length} in registration`} color="#22C55E" icon="⚔️" />
        <KpiCard label="Live Traders" value={totalEntries} sub="In active tournaments" color="#60a5fa" icon="👤" />
        <KpiCard label="Total Users" value={totalUsers || "—"} sub="Registered traders" color="#a78bfa" icon="👥" />
        <KpiCard label="Pending Actions" value={pendingPayouts + pendingViolations + pendingKyc} sub={`${pendingPayouts}P · ${pendingViolations}V · ${pendingKyc}K`} color={pendingPayouts + pendingViolations + pendingKyc > 0 ? "#EF4444" : "#22C55E"} icon="🔔" />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: 16, marginBottom: 16 }}>

        {/* Revenue chart */}
        <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>Revenue — Last 14 Days</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#FFD700", fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>${totalRevenue.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", textAlign: "right" }}>
              <div>{finance?.revenue?.confirmed_count || 0} confirmed</div>
              <div style={{ color: "#fbbf24" }}>{finance?.revenue?.pending_count || 0} pending</div>
            </div>
          </div>
          <RevenueChart daily={finance?.daily || []} />
          {finance?.daily?.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {finance.daily.slice(-7).map((d: any, i: number) => (
                <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,.2)", textAlign: "center" }}>
                  {new Date(d.day).toLocaleDateString("en", { weekday: "short" })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue by tier + top traders */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px", flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.32)", marginBottom: 14 }}>Revenue by Tier</div>
            <TierPie byTier={finance?.byTier || []} />
          </div>
          <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px", flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.32)", marginBottom: 12 }}>Top Spenders</div>
            {(finance?.topTraders || []).slice(0, 4).map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: ["#FFD700","#aaa","#cd7f32","rgba(255,255,255,.3)"][i] || "rgba(255,255,255,.3)" }}>#{i + 1}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>{t.username || t.email?.split("@")[0]}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD700" }}>${parseFloat(t.total_spent).toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{t.entry_count} entries</div>
                </div>
              </div>
            ))}
            {!finance?.topTraders?.length && <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)", textAlign: "center", padding: "16px 0" }}>No data yet</div>}
          </div>
        </div>

        {/* Bridge status */}
        <BridgeStatus accounts={bridge} />
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

        {/* Active battles */}
        <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.32)", marginBottom: 14 }}>Live Battles</div>
          {activeTours.length === 0 && regTours.length === 0 && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)", textAlign: "center", padding: "20px 0" }}>No active battles</div>
          )}
          {[...activeTours, ...regTours].slice(0, 5).map((t: any) => {
            const pct = Math.round((num(t.active_entries) / num(t.max_entries || 25)) * 100);
            return (
              <div key={t.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{t.name}</span>
                  <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 20, background: t.status === "active" ? "rgba(34,197,94,.1)" : "rgba(255,215,0,.1)", color: t.status === "active" ? "#22C55E" : "#FFD700", fontWeight: 700 }}>{t.status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{t.active_entries}/{t.max_entries || 25} traders · ${t.entry_fee}</span>
                  <span style={{ fontSize: 11, color: "#FFD700" }}>${num(t.prize_pool, 2).toFixed(0)} pool</span>
                </div>
                <MiniBar pct={pct} color={t.status === "active" ? "#22C55E" : "#FFD700"} />
              </div>
            );
          })}
        </div>

        {/* Recent activity */}
        <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.32)", marginBottom: 14 }}>Recent Activity</div>
          {activity.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)", textAlign: "center", padding: "20px 0" }}>No recent activity</div>}
          {activity.slice(0, 8).map((a: any, i: number) => {
            const icons: Record<string, string> = { entry: "🎯", payment: "💳", winner: "🏆", violation: "⚠️", register: "👤" };
            const colors: Record<string, string> = { entry: "#60a5fa", payment: "#22C55E", winner: "#FFD700", violation: "#EF4444", register: "#a78bfa" };
            const type = a.type || "entry";
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{icons[type] || "📌"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: colors[type] || "#fff", fontWeight: 600 }}>{a.description || a.message || type}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)", marginTop: 1 }}>
                    {a.username || a.email?.split("@")[0] || "—"} · {a.created_at ? new Date(a.created_at).toLocaleTimeString() : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent winners */}
        <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.32)", marginBottom: 14 }}>Recent Winners</div>
          {(finance?.recentWinners || []).length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)", textAlign: "center", padding: "20px 0" }}>No winners yet</div>}
          {(finance?.recentWinners || []).slice(0, 6).map((w: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,215,0,.1)", border: "1px solid rgba(255,215,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🏆</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD700" }}>{w.username || w.email?.split("@")[0]}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>{w.tournament_name} · +{parseFloat(w.profit_pct || 0).toFixed(2)}%</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#22C55E" }}>${parseFloat(w.account_size || 0).toFixed(0)}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)", textTransform: "capitalize" }}>{w.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
