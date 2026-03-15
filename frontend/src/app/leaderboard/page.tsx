"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { leaderboardApi, tournamentApi } from "@/lib/api";
import { useLeaderboardSocket } from "@/hooks/useSockets";
import { Tournament, Entry } from "@/types";

const MEDALS = ["🥇","🥈","🥉"];

function LeaderboardContent() {
  const params = useSearchParams();
  const tParam = params.get("t");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<string>(tParam || "");
  const [leaders, setLeaders] = useState<Entry[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      tournamentApi.getAll("active"),
      tournamentApi.getAll("ended"),
    ]).then(([active, ended]) => {
      const all = [...active, ...ended];
      setTournaments(all);
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
      setLeaders(lb);
      setTournament(t);
    }).finally(() => setLoading(false));
  }, [selected]);

  useLeaderboardSocket(selected, (data) => setLeaders(data));

  return (
    <div className="page">
      <div style={{ marginBottom: 32 }}>
        <div className="section-eyebrow">Live Rankings</div>
        <h1 className="section-title" style={{ fontSize: 34 }}>
          Leaderboard <span className="live-dot" style={{ marginLeft: 8 }} />
        </h1>
        <p style={{ color: "var(--text3)", marginTop: 8, fontSize: 14 }}>
          Real-time rankings updated every 60 seconds
        </p>
      </div>

      {/* Tournament Selector */}
      <div style={{ marginBottom: 28 }}>
        <select
          className="input"
          style={{ maxWidth: 380 }}
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">Select tournament...</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Stats Bar */}
      {tournament && (
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { label: "Prize Pool", value: `$${Number(tournament.prize_pool).toLocaleString()}`, color: "gold" },
            { label: "Participants", value: tournament.active_entries || "—", color: "blue" },
            { label: "Entry Fee", value: `$${tournament.entry_fee}`, color: "green" },
            { label: "Status", value: tournament.status?.toUpperCase(), color: tournament.status === "active" ? "green" : "gray" },
          ].map(s => (
            <div key={s.label} className={`stat-card stat-card-${s.color}`}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Rankings</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
            Updates every 60s
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : leaders.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text3)" }}>
            {selected ? "No entries yet" : "Select a tournament to view rankings"}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Trader</th>
                  <th>Broker</th>
                  <th>Gain %</th>
                  <th>Profit</th>
                  <th>Trades</th>
                  <th>Win Rate</th>
                  <th>Max DD</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((e, i) => (
                  <tr key={e.id}>
                    <td>
                      <span style={{ fontSize: i < 3 ? 18 : 13, fontWeight: 700 }}>
                        {i < 3 ? MEDALS[i] : `#${i + 1}`}
                      </span>
                    </td>
                    <td>
                      <Link href={`/tournaments/${e.tournament_id}`} style={{ color: "var(--text)", textDecoration: "none", fontWeight: 600 }}>
                        {e.username || e.display_name || `Trader #${i + 1}`}
                      </Link>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{e.broker}</td>
                    <td>
                      <span className={e.profit_pct >= 0 ? "pos" : "neg"}>
                        {e.profit_pct >= 0 ? "+" : ""}{Number(e.profit_pct).toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      <span className={e.profit_abs >= 0 ? "pos" : "neg"}>
                        {e.profit_abs >= 0 ? "+" : ""}${Number(e.profit_abs).toFixed(0)}
                      </span>
                    </td>
                    <td>{e.total_trades}</td>
                    <td>{e.win_rate ? `${e.win_rate.toFixed(1)}%` : "—"}</td>
                    <td style={{ color: "var(--text3)" }}>{Number(e.max_drawdown_pct).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="spinner" />
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}
