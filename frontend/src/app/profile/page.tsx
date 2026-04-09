"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { userApi } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
const fmt = (v: number, d = 2) => parseFloat((v||0).toFixed(d)).toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d});
const col = (v: number) => v >= 0 ? "#22C55E" : "#EF4444";

/* ── Mini sparkline for a tournament ── */
function TourSpark({ pct, color }: { pct: number; color: string }) {
  const w = 60, h = 24;
  const pts = [0, pct * 0.3, pct * 0.55, pct * 0.8, pct].map((v, i) => {
    const x = (i / 4) * w;
    const y = h - Math.max((v / Math.max(Math.abs(pct), 1)) * (h - 4) + (h / 2), 2);
    return `${x},${Math.min(Math.max(y, 2), h - 2)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Stat pill ── */
function Pill({ label, value, color = "rgba(255,255,255,.7)" }: any) {
  return (
    <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-.5px" }}>{value}</div>
    </div>
  );
}

/* ── Tournament row card ── */
function TourCard({ t, onView }: { t: any; onView: () => void }) {
  const pct = parseFloat(t.best_profit_pct || 0);
  const isWinner = t.is_winner;
  const statusColors: any = { active: "#22C55E", registration: "#FFD700", ended: "rgba(255,255,255,.35)", cancelled: "#EF4444" };
  const tierColors: any = { starter: "#60a5fa", pro: "#FFD700", guild: "#a78bfa" };
  return (
    <div style={{ background: "rgba(13,17,26,.9)", border: `1px solid ${isWinner ? "rgba(255,215,0,.25)" : "rgba(255,255,255,.06)"}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "border-color .15s" }} onClick={onView}>
      {/* Tier badge */}
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tierColors[t.tier] || "#fff"}15`, border: `1px solid ${tierColors[t.tier] || "#fff"}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>{isWinner ? "🏆" : t.tier === "pro" ? "⚔️" : t.tier === "guild" ? "🔥" : "🎯"}</span>
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
          {isWinner && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 20, background: "rgba(255,215,0,.12)", color: "#FFD700", fontWeight: 700, flexShrink: 0 }}>WINNER</span>}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textTransform: "capitalize" }}>{t.tier} · ${t.entry_fee}</span>
          <span style={{ fontSize: 11, color: statusColors[t.status] || "#fff", fontWeight: 600 }}>● {t.status}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.28)" }}>{t.entry_count} entr{parseInt(t.entry_count) !== 1 ? "ies" : "y"}</span>
          {t.start_time && <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>{new Date(t.start_time).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span>}
        </div>
      </div>
      {/* Sparkline + pct */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <TourSpark pct={pct} color={col(pct)} />
        <div style={{ textAlign: "right", minWidth: 60 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: col(pct), fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-.5px" }}>{pct >= 0 ? "+" : ""}{fmt(pct)}%</div>
          {t.best_profit_abs && <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)" }}>{parseFloat(t.best_profit_abs) >= 0 ? "+" : ""}${fmt(Math.abs(parseFloat(t.best_profit_abs)))}</div>}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [tab, setTab]             = useState("overview");
  const [tournaments, setTours]   = useState<any[]>([]);
  const [tLoading, setTLoad]      = useState(true);
  const [username, setUsername]   = useState("");
  const [wallet, setWallet]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveErr, setSaveErr]     = useState("");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || "");
    setWallet(user.wallet_address || "");
    setTLoad(true);
    userApi.getMyTournaments().then(setTours).catch(() => {}).finally(() => setTLoad(false));
  }, [user]);

  const saveSettings = async () => {
    setSaving(true); setSaveErr("");
    try {
      await userApi.update({ username, wallet_address: wallet });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setSaveErr(e?.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading || !user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="spinner" />
    </div>
  );

  const active    = tournaments.filter(t => t.status === "active");
  const ended     = tournaments.filter(t => t.status === "ended" || t.status === "completed");
  const won       = tournaments.filter(t => t.is_winner);
  const allPct    = tournaments.map(t => parseFloat(t.best_profit_pct || 0));
  const bestPct   = allPct.length ? Math.max(...allPct) : 0;
  const avgPct    = allPct.length ? allPct.reduce((a, b) => a + b, 0) / allPct.length : 0;
  const totalSpent = tournaments.reduce((s, t) => s + parseFloat(t.entry_fee || 0) * parseInt(t.entry_count || 1), 0);
  const initials  = (user.username || user.email || "?")[0].toUpperCase();
  const memberDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);
  const winRate   = tournaments.length > 0 ? Math.round((won.length / tournaments.length) * 100) : 0;

  const NAV = [
    { id: "overview",    label: "Overview",          icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
    { id: "battles",     label: "My Battles",        icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z", badge: active.length > 0 ? active.length : 0 },
    { id: "payouts",     label: "Payouts",           icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", badge: won.length > 0 ? won.length : 0 },
    { id: "certificates",label: "Certificates",      icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
    { id: "settings",    label: "Settings",          icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <div style={{ background: "#04060d", minHeight: "100vh" }}>

      {/* ── Hero banner ── */}
      <div style={{ background: "linear-gradient(135deg,rgba(255,215,0,.04) 0%,rgba(34,197,94,.03) 50%,rgba(96,165,250,.03) 100%)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "32px 0 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 24 }}>
            {/* Avatar */}
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "linear-gradient(135deg,rgba(255,215,0,.2),rgba(34,197,94,.15))", border: "2px solid rgba(255,215,0,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#FFD700", fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>
              {initials}
            </div>
            {/* Name + badges */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-1px", margin: 0 }}>
                  {user.username || "Unnamed Trader"}
                </h1>
                {user.is_admin && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,215,0,.1)", color: "#FFD700", fontWeight: 700, border: "1px solid rgba(255,215,0,.25)" }}>ADMIN</span>}
                {won.length > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,215,0,.1)", color: "#FFD700", fontWeight: 700, border: "1px solid rgba(255,215,0,.25)" }}>🏆 {won.length} WIN{won.length > 1 ? "S" : ""}</span>}
                {active.length > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(34,197,94,.1)", color: "#22C55E", fontWeight: 700, border: "1px solid rgba(34,197,94,.25)", display: "flex", alignItems: "center", gap: 4 }}><span className="live-dot" style={{ width: 5, height: 5 }} />{active.length} LIVE</span>}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                {user.email} · Member for {memberDays} days · {tournaments.length} tournament{tournaments.length !== 1 ? "s" : ""} entered
              </div>
            </div>
            {/* CTA buttons */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Link href="/tournaments" className="btn btn-primary btn-sm">+ Join Battle</Link>
              <button onClick={() => setTab("settings")} className="btn btn-ghost btn-sm">Edit Profile</button>
            </div>
          </div>

          {/* Performance strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, background: "rgba(255,255,255,.04)", borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
            {[
              { label: "Tournaments", value: tournaments.length, color: "#fff" },
              { label: "Active Now", value: active.length, color: active.length > 0 ? "#22C55E" : "rgba(255,255,255,.4)" },
              { label: "Total Wins", value: won.length, color: won.length > 0 ? "#FFD700" : "rgba(255,255,255,.4)" },
              { label: "Best Gain", value: `${bestPct >= 0 ? "+" : ""}${fmt(bestPct)}%`, color: col(bestPct) },
              { label: "Avg Gain", value: `${avgPct >= 0 ? "+" : ""}${fmt(avgPct)}%`, color: col(avgPct) },
              { label: "Win Rate", value: `${winRate}%`, color: winRate >= 50 ? "#22C55E" : "rgba(255,255,255,.5)" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(13,17,26,.9)", padding: "14px 18px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-.5px" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Nav tabs ── */}
      <div style={{ background: "rgba(4,6,13,.97)", borderBottom: "1px solid rgba(255,255,255,.06)", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", gap: 0 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "14px 18px", background: "none", border: "none", borderBottom: `2px solid ${tab === n.id ? "#FFD700" : "transparent"}`, cursor: "pointer", color: tab === n.id ? "#FFD700" : "rgba(255,255,255,.4)", fontSize: 13, fontWeight: tab === n.id ? 700 : 500, transition: "all .15s", position: "relative", fontFamily: "var(--font-body)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
              {n.label}
              {(n as any).badge > 0 && <span style={{ background: "#22C55E", color: "#000", fontSize: 9, fontWeight: 800, borderRadius: 10, padding: "1px 5px", minWidth: 14, textAlign: "center" }}>{(n as any).badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 60px" }}>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
            <div>
              {/* Performance summary */}
              <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Performance Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  <Pill label="Total Spent" value={`$${fmt(totalSpent)}`} color="#FFD700" />
                  <Pill label="Best Gain" value={`${bestPct >= 0 ? "+" : ""}${fmt(bestPct)}%`} color={col(bestPct)} />
                  <Pill label="Battles Won" value={won.length} color={won.length > 0 ? "#FFD700" : "rgba(255,255,255,.4)"} />
                  <Pill label="Win Rate" value={`${winRate}%`} color={winRate >= 50 ? "#22C55E" : "rgba(255,255,255,.5)"} />
                </div>
              </div>

              {/* Active battles */}
              {active.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span className="live-dot" style={{ width: 7, height: 7 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#22C55E" }}>Active Battles</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {active.map((t: any) => (
                      <TourCard key={t.id} t={t} onView={() => router.push(`/tournaments/${t.id}`)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent battles */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Battle History</div>
                {tLoading ? (
                  <div style={{ textAlign: "center", padding: "32px 0" }}><div className="spinner" /></div>
                ) : tournaments.length === 0 ? (
                  <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚔️</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>No battles yet</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", marginBottom: 20 }}>Enter your first tournament to start your trading journey.</div>
                    <Link href="/tournaments" className="btn btn-primary">Browse Battles</Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tournaments.map((t: any) => (
                      <TourCard key={t.id} t={t} onView={() => router.push(`/tournaments/${t.id}`)} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Account card */}
              <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 14 }}>Account</div>
                {[
                  { l: "Member since", v: new Date(user.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) },
                  { l: "Account type", v: user.is_admin ? "Admin" : "Trader", c: user.is_admin ? "#FFD700" : "#22C55E" },
                  { l: "Status", v: "Active", c: "#22C55E" },
                  { l: "Payout wallet", v: user.wallet_address ? `${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-4)}` : "Not set", c: user.wallet_address ? "#22C55E" : "#fbbf24" },
                  { l: "Total entries", v: user.total_entries || tournaments.reduce((s, t) => s + parseInt(t.entry_count || 1), 0) },
                ].map(r => (
                  <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.38)" }}>{r.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: (r as any).c || "rgba(255,255,255,.7)" }}>{r.v}</span>
                  </div>
                ))}
                {!user.wallet_address && (
                  <button onClick={() => setTab("settings")} style={{ width: "100%", marginTop: 12, padding: "8px", background: "rgba(255,215,0,.06)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 8, color: "#FFD700", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    + Add Payout Wallet
                  </button>
                )}
              </div>

              {/* Won battles */}
              {won.length > 0 && (
                <div style={{ background: "rgba(255,215,0,.04)", border: "1px solid rgba(255,215,0,.15)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#FFD700", marginBottom: 14 }}>🏆 Tournament Wins</div>
                  {won.map((t: any) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,215,0,.08)" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD700" }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>+{fmt(parseFloat(t.best_profit_pct || 0))}% gain</div>
                      </div>
                      <Link href={`/claim/${t.id}`} style={{ fontSize: 11, color: "#FFD700", textDecoration: "none", fontWeight: 600 }}>Claim →</Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick links */}
              <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", padding: "14px 18px 10px" }}>Quick Links</div>
                {[
                  { href: "/tournaments", label: "Browse Battles", icon: "⚔️" },
                  { href: "/leaderboard", label: "Leaderboard", icon: "📊" },
                  { href: "/guild", label: "Create Guild Battle", icon: "🔥" },
                  { href: "/certificates", label: "My Certificates", icon: "🏆" },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,.04)", textDecoration: "none", color: "rgba(255,255,255,.55)", fontSize: 13, transition: "color .1s" }}>
                    <span style={{ fontSize: 15 }}>{l.icon}</span>{l.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: "auto" }}><polyline points="9 18 15 12 9 6" /></svg>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ BATTLES ══ */}
        {tab === "battles" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-.5px" }}>My Battles</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginTop: 3 }}>{tournaments.length} total · {active.length} active · {ended.length} completed</div>
              </div>
              <Link href="/tournaments" className="btn btn-primary btn-sm">+ Join New Battle</Link>
            </div>

            {/* Stats row */}
            {tournaments.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
                <Pill label="Total Entered" value={tournaments.length} />
                <Pill label="Active" value={active.length} color={active.length > 0 ? "#22C55E" : "rgba(255,255,255,.4)"} />
                <Pill label="Won" value={won.length} color={won.length > 0 ? "#FFD700" : "rgba(255,255,255,.4)"} />
                <Pill label="Best Gain" value={`${bestPct >= 0 ? "+" : ""}${fmt(bestPct)}%`} color={col(bestPct)} />
                <Pill label="Total Spent" value={`$${fmt(totalSpent)}`} color="#FFD700" />
              </div>
            )}

            {tLoading ? <div style={{ textAlign: "center", padding: "60px 0" }}><div className="spinner" /></div>
              : tournaments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>⚔️</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>No battles yet</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", marginBottom: 24 }}>Enter your first tournament to start competing.</div>
                  <Link href="/tournaments" className="btn btn-primary">Browse Battles</Link>
                </div>
              ) : (
                <div>
                  {active.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#22C55E", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><span className="live-dot" style={{ width: 6, height: 6 }} />Active</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {active.map((t: any) => <TourCard key={t.id} t={t} onView={() => router.push(`/tournaments/${t.id}`)} />)}
                      </div>
                    </div>
                  )}
                  {ended.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.28)", marginBottom: 10 }}>Completed</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {ended.map((t: any) => <TourCard key={t.id} t={t} onView={() => router.push(`/tournaments/${t.id}`)} />)}
                      </div>
                    </div>
                  )}
                  {tournaments.filter(t => t.status === "registration").length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#FFD700", marginBottom: 10 }}>Registration Open</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {tournaments.filter(t => t.status === "registration").map((t: any) => <TourCard key={t.id} t={t} onView={() => router.push(`/tournaments/${t.id}`)} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

        {/* ══ PAYOUTS ══ */}
        {tab === "payouts" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-.5px", marginBottom: 4 }}>Payouts</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginBottom: 24 }}>Claim your funded accounts and USDT cashouts from tournament wins.</div>

            {!user.wallet_address && (
              <div style={{ background: "rgba(255,215,0,.05)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 3 }}>Wallet address not set</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Add your USDT TRC-20 wallet in Settings to receive payouts.</div>
                </div>
                <button onClick={() => setTab("settings")} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Add Wallet</button>
              </div>
            )}

            {won.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>💰</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>No winnings yet</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", marginBottom: 24 }}>Win a tournament to claim your funded account or USDT payout.</div>
                <Link href="/tournaments" className="btn btn-primary">Join a Battle</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {won.map((t: any) => {
                  const pool = parseFloat(t.prize_pool || 0);
                  const funded = pool * 0.9;
                  const cashout = pool * 0.80;
                  return (
                    <div key={t.id} style={{ background: "rgba(255,215,0,.04)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 12, padding: "20px 24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>🏆</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFD700" }}>{t.name}</span>
                            <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(255,215,0,.1)", borderRadius: 20, color: "#FFD700", fontWeight: 700 }}>WINNER</span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 14 }}>
                            Best gain: +{fmt(parseFloat(t.best_profit_pct || 0))}% · {t.entry_count} entr{parseInt(t.entry_count) !== 1 ? "ies" : "y"} · ended {new Date(t.end_time).toLocaleDateString()}
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
                              <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Funded Account (90%)</div>
                              <div style={{ fontSize: 22, fontWeight: 900, color: "#22C55E", fontFamily: "'Space Grotesk',sans-serif" }}>${funded > 0 ? fmt(funded, 0) : "—"}</div>
                            </div>
                            <div style={{ background: "rgba(255,215,0,.06)", border: "1px solid rgba(255,215,0,.15)", borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
                              <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>USDT Cashout (80%)</div>
                              <div style={{ fontSize: 22, fontWeight: 900, color: "#FFD700", fontFamily: "'Space Grotesk',sans-serif" }}>${cashout > 0 ? fmt(cashout, 0) : "—"}</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                          <Link href={`/claim/${t.id}`} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>🏆 Claim Prize</Link>
                          <Link href={`/certificates?t=${t.id}`} className="btn btn-ghost btn-sm" style={{ justifyContent: "center" }}>View Certificate</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ CERTIFICATES ══ */}
        {tab === "certificates" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-.5px", marginBottom: 4 }}>Certificates</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginBottom: 24 }}>Your on-chain trading achievements. Earned for tournament victories.</div>
            {won.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 14 }}>🏆</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>No certificates yet</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>Win a tournament to earn your Gold Certificate. Only the 1st place winner gets one.</div>
                <Link href="/tournaments" className="btn btn-primary">Join a Battle</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
                {won.map((t: any, i: number) => {
                  const certColor = i === 0 ? "#FFD700" : i === 1 ? "#b4c0d8" : "#CD7F32";
                  return (
                    <div key={t.id} style={{ background: "rgba(13,17,26,.95)", border: `1px solid ${certColor}33`, borderRadius: 16, padding: 28, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: -40, right: -40, width: 130, height: 130, borderRadius: "50%", background: `radial-gradient(circle,${certColor}18 0%,transparent 70%)`, pointerEvents: "none" }} />
                      <div style={{ fontSize: 48, marginBottom: 12 }}>🥇</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 6 }}>Tournament Champion</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,.38)", marginBottom: 6 }}>
                        Best gain: <span style={{ color: "#22C55E", fontWeight: 700 }}>+{fmt(parseFloat(t.best_profit_pct || 0))}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginBottom: 18 }}>{new Date(t.end_time).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${certColor}15`, border: `1px solid ${certColor}44`, borderRadius: 20, padding: "4px 14px", marginBottom: 20 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: certColor }}>Gold Certificate</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link href={`/certificates?t=${t.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>View</Link>
                        <Link href={`/certificates?t=${t.id}&download=1`} style={{ flex: 1, justifyContent: "center", display: "flex", alignItems: "center", background: certColor, color: "#000", fontWeight: 700, fontSize: 12, borderRadius: 8, padding: "6px 12px", textDecoration: "none" }}>Download</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab === "settings" && (
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-.5px", marginBottom: 24 }}>Account Settings</div>

            {/* Profile */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 18 }}>Profile</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
                <div>
                  <label className="input-label">Username</label>
                  <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" maxLength={30} />
                </div>
                <div>
                  <label className="input-label">Email address</label>
                  <input className="input" value={user.email || ""} disabled style={{ opacity: .5, cursor: "not-allowed" }} />
                </div>
              </div>
            </div>

            {/* Payout wallet */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 6 }}>Payout Wallet</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)", marginBottom: 16 }}>Your USDT TRC-20 address for receiving prize payouts. Double-check before saving.</div>
              <label className="input-label">USDT TRC-20 Address</label>
              <input className="input" value={wallet} onChange={e => setWallet(e.target.value)} placeholder="T... (starts with T)" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: "rgba(255,215,0,.6)", display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span>⚠️</span><span>Only TRC-20 network supported. Wrong network = permanent loss of funds.</span>
              </div>
            </div>

            {/* Account info */}
            <div style={{ background: "rgba(13,17,26,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 16 }}>Account Info</div>
              {[
                { l: "Member since", v: new Date(user.created_at).toLocaleDateString("en", { month: "long", year: "numeric" }) },
                { l: "Account type", v: user.is_admin ? "Admin" : "Trader", c: user.is_admin ? "#FFD700" : "#22C55E" },
                { l: "Status", v: "Active", c: "#22C55E" },
                { l: "Days active", v: `${memberDays} days` },
                { l: "Total entries", v: user.total_entries },
                { l: "Tournament wins", v: won.length, c: won.length > 0 ? "#FFD700" : "rgba(255,255,255,.5)" },
              ].map(r => (
                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.38)" }}>{r.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: (r as any).c || "rgba(255,255,255,.7)" }}>{r.v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={saveSettings} disabled={saving} className="btn btn-primary" style={{ minWidth: 140 }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {saved && <span style={{ fontSize: 13, color: "#22C55E", fontWeight: 600 }}>✓ Saved!</span>}
              {saveErr && <span style={{ fontSize: 13, color: "#EF4444" }}>✗ {saveErr}</span>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
