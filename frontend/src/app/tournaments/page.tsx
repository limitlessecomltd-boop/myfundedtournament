"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tournamentApi } from "@/lib/api";
import { Tournament } from "@/types";
import { formatDistanceToNow, format } from "date-fns";

const FILTERS = ["all","registration","active","upcoming","ended"];

function TierBadge({ tier }: { tier: string }) {
  const map: any = { starter: ["var(--blue-dim)","var(--blue)"], pro: ["var(--amber-dim)","var(--amber)"], elite: ["var(--green-dim)","var(--green)"] };
  const [bg, color] = map[tier] || map.starter;
  return <span className="badge" style={{ background: bg, color, textTransform: "capitalize" }}>{tier}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    active: "badge-green", registration: "badge-blue",
    upcoming: "badge-gray", ended: "badge-gray", cancelled: "badge-red"
  };
  return <span className={`badge ${map[status] || "badge-gray"}`} style={{ textTransform: "capitalize" }}>{status}</span>;
}

function TournamentCard({ t }: { t: Tournament }) {
  const fillPct = Math.round((t.active_entries / t.max_entries) * 100);
  const isActive = t.status === "active";
  const canJoin  = ["registration","active"].includes(t.status);

  return (
    <div className="card fade-in" style={{ cursor: "pointer", transition: "border-color 0.15s", position: "relative", overflow: "hidden" }}>
      {isActive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--green)" }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <TierBadge tier={t.tier} />
        <StatusBadge status={t.status} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{t.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 600, color: "var(--green)" }}>
            ${Number(t.prize_pool).toLocaleString()}
          </span>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>prize pool</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          ["Entry", `$${t.entry_fee} USDT`],
          ["Traders", `${t.unique_traders}`],
          ["Sim balance", "$10,000"],
          ["Profit share", "90%"],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Fill bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${fillPct}%`, background: "var(--green)", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
          {t.active_entries} / {t.max_entries} entries
        </div>
      </div>

      {/* Time */}
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
        {t.status === "active" && `Ends ${formatDistanceToNow(new Date(t.end_time), { addSuffix: true })}`}
        {t.status === "registration" && `Starts ${formatDistanceToNow(new Date(t.start_time), { addSuffix: true })}`}
        {t.status === "upcoming" && `Registration opens ${format(new Date(t.registration_open), "MMM d, HH:mm")}`}
        {t.status === "ended" && `Ended ${formatDistanceToNow(new Date(t.end_time), { addSuffix: true })}`}
      </div>

      <Link href={`/tournaments/${t.id}`} className={`btn ${canJoin ? "btn-primary" : "btn-secondary"}`} style={{ width: "100%", textAlign: "center" }}>
        {t.status === "active" ? "View & Trade" : t.status === "registration" ? "Join Tournament" : "View Details"}
      </Link>
    </div>
  );
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tournamentApi.getAll(filter)
      .then(setTournaments)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 32, fontWeight: 800 }}>Tournaments</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
              style={{ textTransform: "capitalize" }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {Array.from({length: 6}).map((_,i) => (
            <div key={i} style={{ height: 380, background: "var(--bg2)", borderRadius: "var(--radius-lg)", opacity: 0.4 }} />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)" }}>No tournaments found</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {tournaments.map(t => <TournamentCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}
