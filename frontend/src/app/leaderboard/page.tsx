"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { leaderboardApi, tournamentApi } from "@/lib/api";
import { useLeaderboardSocket } from "@/hooks/useSockets";
import { Tournament, Entry } from "@/types";

const MEDALS = ["🥇","🥈","🥉"];

export default function LeaderboardPage() {
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
      leaderboardApi.get(selected, 100),
      tournamentApi.getById(selected),
    ]).then(([lb, t]) => {
      setLeaders(lb);
      setTournament(t);
    }).finally(() => setLoading(false));
  }, [selected]);

  useLeaderboardSocket(selected, setLeaders);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 32, fontWeight: 800 }}>Leaderboard</h1>
          {tournament?.status === "active" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
              <span className="live-dot" /> LIVE
            </div>
          )}
        </div>
        <select className="input" style={{ width: "auto", minWidth: 280 }} value={selected} onChange={e => setSelected(e.target.value)}>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} — ${t.entry_fee} ({t.status})
            </option>
          ))}
        </select>
      </div>

      {/* Tournament summary */}
      {tournament && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { l: "Prize Pool",     v: `$${Number(tournament.prize_pool).toLocaleString()} USDT` },
            { l: "Active Entries", v: tournament.active_entries },
            { l: "Unique Traders", v: tournament.unique_traders },
            { l: "Ranking Metric", v: "% Gain" },
          ].map(s => (
            <div key={s.l} className="stat-block">
              <div className="stat-label">{s.l}</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({length: 10}).map((_,i) => (
            <div key={i} style={{ height: 52, background: "var(--bg2)", borderRadius: "var(--radius)", opacity: 0.3 }} />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)" }}>No participants yet</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Trader</th>
                  <th>Broker</th>
                  <th style={{ textAlign: "right" }}>% Gain</th>
                  <th style={{ textAlign: "right" }}>Profit ($)</th>
                  <th style={{ textAlign: "right" }}>Trades</th>
                  <th style={{ textAlign: "right" }}>Win Rate</th>
                  <th style={{ textAlign: "right" }}>Max DD</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((e, i) => (
                  <tr key={e.id} style={{ background: i === 0 ? "rgba(245,166,35,0.04)" : "transparent" }}>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: i < 3 ? "var(--amber)" : "var(--text3)" }}>
                        {i < 3 ? MEDALS[i] : `#${i+1}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)" }}>
                        {e.display_name || e.username || `Trader`}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>Entry #{e.entry_number}</div>
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: 11, textTransform: "capitalize" }}>{e.broker}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: Number(e.profit_pct) >= 0 ? "var(--green)" : "var(--red)" }}>
                        {Number(e.profit_pct) >= 0 ? "+" : ""}{Number(e.profit_pct).toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: Number(e.profit_abs) >= 0 ? "var(--green)" : "var(--red)" }}>
                        {Number(e.profit_abs) >= 0 ? "+" : ""}${Number(e.profit_abs).toFixed(2)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{e.total_trades}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${Number(e.win_rate) >= 60 ? "badge-green" : Number(e.win_rate) >= 40 ? "badge-amber" : "badge-red"}`} style={{ fontSize: 11 }}>
                        {e.win_rate}%
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)" }}>
                      -{Number(e.max_drawdown_pct).toFixed(1)}%
                    </td>
                    <td>
                      {e.status === "active" && (
                        <Link href={`/tournaments/${selected}/trade?entry=${e.id}`} style={{ fontSize: 12, color: "var(--green)", textDecoration: "none" }}>View →</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
        Ranked by % gain · Updated every 30 seconds · All entries shown as separate competitors
      </div>
    </div>
  );
}
