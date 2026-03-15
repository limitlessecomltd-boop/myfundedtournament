"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { userApi } from "@/lib/api";

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [editUsername, setEditUsername] = useState(false);
  const [username, setUsername] = useState("");
  const [payoutForm, setPayoutForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      userApi.getMyTournaments().then(setTournaments).catch(() => {});
    }
  }, [user]);

  async function saveUsername() {
    setSaving(true);
    try { await userApi.update({ username }); await refresh(); setEditUsername(false); }
    catch (err: any) { alert(err?.response?.data?.error || "Failed"); }
    finally { setSaving(false); }
  }

  if (loading || !user) return null;

  return (
    <div className="page">
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>

        {/* Profile card */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{
              width: 64, height: 64, background: "var(--green-dim)",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-head)", fontSize: 24, fontWeight: 800, color: "var(--green)",
              marginBottom: 16
            }}>
              {(user.username || user.email || "?")[0].toUpperCase()}
            </div>

            {editUsername ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input className="input" value={username} onChange={e => setUsername(e.target.value)} maxLength={30} placeholder="Username" />
                <button onClick={saveUsername} disabled={saving} className="btn btn-primary btn-sm">{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setEditUsername(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  {user.username || "Unnamed Trader"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12, fontFamily: "var(--font-mono)" }}>{user.email}</div>
                <button onClick={() => setEditUsername(true)} className="btn btn-secondary btn-sm">Edit Username</button>
              </div>
            )}
          </div>

          <div className="card-sm" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { l: "Tournaments",     v: user.total_tournaments || 0 },
                { l: "Total Entries",   v: user.total_entries || 0 },
                { l: "Wins",            v: user.wins || 0, color: "var(--amber)" },
              ].map(s => (
                <div key={s.l} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text3)" }}>{s.l}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: s.color || "var(--text)" }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tournament history */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Tournament History</h2>

          {tournaments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>
              No tournaments yet. <Link href="/tournaments" style={{ color: "var(--green)" }}>Browse tournaments →</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {tournaments.map((t: any) => (
                <div key={t.id} className="card" style={{ borderColor: t.is_winner ? "var(--amber)" : "var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <Link href={`/tournaments/${t.id}`} style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>
                          {t.name}
                        </Link>
                        {t.is_winner && <span className="badge badge-amber" style={{ fontSize: 11 }}>Winner</span>}
                        <span className={`badge ${t.status === "active" ? "badge-green" : "badge-gray"}`} style={{ fontSize: 11, textTransform: "capitalize" }}>{t.status}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text3)" }}>
                        {t.entry_count} {t.entry_count === 1 ? "entry" : "entries"} · ${t.entry_fee} fee · ${Number(t.prize_pool).toLocaleString()} pool
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: Number(t.best_profit_pct) >= 0 ? "var(--green)" : "var(--red)" }}>
                        {Number(t.best_profit_pct) >= 0 ? "+" : ""}{Number(t.best_profit_pct || 0).toFixed(2)}%
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>best entry</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link href={`/leaderboard?t=${t.id}`} className="btn btn-secondary btn-sm">Leaderboard</Link>
                    {t.status === "active" && (
                      <Link href={`/tournaments/${t.id}`} className="btn btn-primary btn-sm">Trade / Re-enter</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
