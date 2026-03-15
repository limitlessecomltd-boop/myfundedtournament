"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { tournamentApi, entryApi, leaderboardApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePaymentSocket } from "@/hooks/useSockets";
import { Tournament, Entry } from "@/types";
import { format } from "date-fns";

const BROKERS = ["Exness", "ICMarkets", "Tickmill", "Other"];

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [myEntries, setMyEntries] = useState<Entry[]>([]);
  const [topTraders, setTopTraders] = useState<any[]>([]);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ mt5Login: "", mt5Password: "", mt5Server: "", broker: "Exness" });

  usePaymentSocket(payment?.paymentId || null, () => {
    setPayment((p: any) => p ? { ...p, confirmed: true } : p);
    loadMyEntries();
  });

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    tournamentApi.getById(id).then(setTournament).catch(console.error);
    if (user) loadMyEntries();
    leaderboardApi.get(id, 5).then(setTopTraders).catch(() => {});
  }

  async function loadMyEntries() {
    entryApi.getMy(id).then(setMyEntries).catch(() => {});
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const result = await entryApi.create({
        tournamentId: id,
        mt5Login: form.mt5Login,
        mt5Password: form.mt5Password,
        mt5Server: form.mt5Server,
        broker: form.broker.toLowerCase(),
      });
      setPayment(result.payment);
      setShowJoinForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  }

  const activeEntries = myEntries.filter(e => e.status === "active");
  const canEnter = user && tournament && ["registration","active"].includes(tournament.status) && activeEntries.length < 5 && myEntries.length < 10;

  if (!tournament) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--green)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div className="page">
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>

        {/* Left col */}
        <div style={{ flex: "1 1 520px" }}>
          <div style={{ marginBottom: 24 }}>
            <span className="badge" style={{ background: "var(--green-dim)", color: "var(--green)", textTransform: "capitalize", marginBottom: 12, display: "inline-block" }}>
              {tournament.status}
            </span>
            <h1 style={{ fontFamily: "var(--font-head)", fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{tournament.name}</h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 40, fontWeight: 600, color: "var(--green)" }}>
                ${Number(tournament.prize_pool).toLocaleString()}
              </span>
              <span style={{ color: "var(--text3)" }}>total prize pool</span>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              ["Entry Fee",    `$${tournament.entry_fee} USDT`],
              ["Sim Balance",  "$10,000"],
              ["Profit Share", "90%"],
              ["Max Entries",  tournament.max_entries],
              ["Active Now",   tournament.active_entries],
              ["Unique Traders", tournament.unique_traders],
            ].map(([l,v]) => (
              <div key={l} className="stat-block">
                <div className="stat-label">{l}</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="card-sm" style={{ marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Registration Opens", format(new Date(tournament.registration_open), "MMM d yyyy, HH:mm")],
                ["Tournament Starts",  format(new Date(tournament.start_time), "MMM d yyyy, HH:mm")],
                ["Tournament Ends",    format(new Date(tournament.end_time), "MMM d yyyy, HH:mm")],
                ["Duration",          "7 days"],
              ].map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 14, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Re-entry rules */}
          <div className="card-sm" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text2)" }}>Re-entry Rules</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {["Up to 10 total entries per trader", "Maximum 5 active entries at once", "Entries 6-10 unlock only after first 5 are breached", "Each re-entry pays full fee — same as original"].map(r => (
                <li key={r} style={{ fontSize: 13, color: "var(--text2)", display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--amber)" }}>→</span> {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Top 5 leaderboard preview */}
          {topTraders.length > 0 && (
            <div className="card-sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Current Leaders</span>
                <Link href={`/leaderboard?t=${id}`} style={{ fontSize: 12, color: "var(--green)", textDecoration: "none" }}>Full leaderboard →</Link>
              </div>
              {topTraders.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < topTraders.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: i === 0 ? "var(--amber)" : "var(--text3)", fontWeight: 600 }}>#{i+1}</span>
                    <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text2)" }}>{e.display_name}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: Number(e.profit_pct) >= 0 ? "var(--green)" : "var(--red)" }}>
                    {Number(e.profit_pct) >= 0 ? "+" : ""}{Number(e.profit_pct).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right col — join panel */}
        <div style={{ width: 320, flexShrink: 0 }}>

          {/* My entries */}
          {myEntries.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>My Entries</div>
              {myEntries.map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text2)" }}>Entry #{e.entry_number} — {e.broker}</div>
                    <span className={`badge badge-sm ${e.status === "active" ? "badge-green" : e.status === "disqualified" ? "badge-red" : "badge-gray"}`} style={{ marginTop: 4, fontSize: 11 }}>{e.status}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: Number(e.profit_pct) >= 0 ? "var(--green)" : "var(--red)" }}>
                      {Number(e.profit_pct) >= 0 ? "+" : ""}{Number(e.profit_pct).toFixed(2)}%
                    </div>
                    {e.status === "active" && (
                      <Link href={`/tournaments/${id}/trade?entry=${e.id}`} style={{ fontSize: 12, color: "var(--green)", textDecoration: "none" }}>View →</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment pending */}
          {payment && !payment.confirmed && (
            <div className="card" style={{ marginBottom: 20, borderColor: "var(--amber)" }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: "var(--amber)" }}>Payment Pending</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>Send exactly this amount to the address below:</div>
              <div style={{ background: "var(--bg3)", borderRadius: "var(--radius)", padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, fontFamily: "var(--font-mono)" }}>Amount</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--amber)" }}>{payment.amount} {payment.currency}</div>
              </div>
              <div style={{ background: "var(--bg3)", borderRadius: "var(--radius)", padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, fontFamily: "var(--font-mono)" }}>USDT TRC-20 Address</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, wordBreak: "break-all", color: "var(--text)" }}>{payment.address}</div>
              </div>
              <a href={payment.paymentUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ width: "100%", textAlign: "center", marginBottom: 8 }}>
                Pay via NOWPayments Link
              </a>
              <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center" }}>Waiting for confirmation...</div>
            </div>
          )}

          {payment?.confirmed && (
            <div className="card" style={{ marginBottom: 20, borderColor: "var(--green)" }}>
              <div style={{ color: "var(--green)", fontWeight: 600, marginBottom: 8 }}>Payment Confirmed!</div>
              <p style={{ fontSize: 13, color: "var(--text2)" }}>Your entry is active. Connect to MetaApi and start trading.</p>
            </div>
          )}

          {/* Join card */}
          <div className="card">
            <div style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {myEntries.length > 0 ? "Re-enter Tournament" : "Join Tournament"}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {[
                ["Entry fee", `$${tournament.entry_fee} USDT`],
                ["Your sim balance", "$10,000"],
                ["If you win", "Funded account (90% of prize pool)"],
                ["Profit share", "90% to you / 10% platform"],
              ].map(([l,v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text3)" }}>{l}</span>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,78,106,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--red)" }}>
                {error}
              </div>
            )}

            {!user ? (
              <Link href="/login" className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>Login to Join</Link>
            ) : !canEnter ? (
              <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "12px 0" }}>
                {myEntries.length >= 10 ? "Maximum entries reached (10/10)" :
                 activeEntries.length >= 5 ? "You have 5 active entries. Wait for one to breach." :
                 "Tournament not open for entries"}
              </div>
            ) : !showJoinForm ? (
              <button onClick={() => setShowJoinForm(true)} className="btn btn-primary" style={{ width: "100%" }}>
                {myEntries.length > 0 ? `Re-enter (${myEntries.length}/10 used)` : "Enter Tournament"}
              </button>
            ) : (
              <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>MT5 Account Number</label>
                  <input className="input" placeholder="e.g. 123456789" value={form.mt5Login} onChange={e => setForm(f => ({...f, mt5Login: e.target.value}))} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Investor Password (read-only)</label>
                  <input className="input" type="password" placeholder="Investor password only" value={form.mt5Password} onChange={e => setForm(f => ({...f, mt5Password: e.target.value}))} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>MT5 Server</label>
                  <input className="input" placeholder="e.g. Exness-MT5Trial8" value={form.mt5Server} onChange={e => setForm(f => ({...f, mt5Server: e.target.value}))} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Broker</label>
                  <select className="input" value={form.broker} onChange={e => setForm(f => ({...f, broker: e.target.value}))}>
                    {BROKERS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", background: "var(--bg3)", borderRadius: "var(--radius)", padding: "10px 12px" }}>
                  Submit the investor password only — never your main account password. We have read-only access.
                </div>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? "Processing..." : `Pay $${tournament.entry_fee} USDT`}
                </button>
                <button type="button" onClick={() => setShowJoinForm(false)} className="btn btn-secondary">Cancel</button>
              </form>
            )}

            <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 16 }}>
              Payment processed via NOWPayments. Entry fee adds to prize pool.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
