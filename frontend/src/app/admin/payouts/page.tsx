"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PayoutRequest } from "@/types";

const STATUSES = ["pending","approved","paid","rejected"];

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [filter, setFilter] = useState("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Record<string, string>>({});
  const [notes, setNotes]   = useState<Record<string, string>>({});

  useEffect(() => { load(); }, [filter]);

  async function load() {
    adminApi.getPayouts(filter).then(setPayouts).catch(console.error);
  }

  async function update(id: string, status: string) {
    setProcessing(id);
    try {
      await adminApi.updatePayout(id, { status, txHash: txHash[id], notes: notes[id] });
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed");
    } finally { setProcessing(null); }
  }

  return (
    <AdminLayout title="Payout Requests">
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-secondary"}`}
            style={{ textTransform: "capitalize" }}>{s}</button>
        ))}
      </div>

      {payouts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>No {filter} payouts</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {payouts.map(p => (
            <div key={p.id} className="card" style={{ borderLeft: filter === "pending" ? "3px solid var(--amber)" : "3px solid var(--border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Trader</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.username || p.email}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{p.tournament_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Amounts</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>Trader: ${Number(p.trader_amount).toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>Platform: ${Number(p.platform_amount).toFixed(2)} · Gross: ${Number(p.gross_profit).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Wallet</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", wordBreak: "break-all", color: "var(--text2)" }}>{p.wallet_address}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{p.currency}</div>
                </div>
              </div>

              {p.status === "pending" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      className="input" placeholder="TX Hash (after sending)"
                      value={txHash[p.id] || ""} onChange={e => setTxHash(h => ({ ...h, [p.id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <input
                      className="input" placeholder="Notes (optional)"
                      value={notes[p.id] || ""} onChange={e => setNotes(n => ({ ...n, [p.id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => update(p.id, "paid")} disabled={processing === p.id || !txHash[p.id]}
                      className="btn btn-primary btn-sm">
                      {processing === p.id ? "Processing..." : "Mark as Paid"}
                    </button>
                    <button onClick={() => update(p.id, "approved")} disabled={processing === p.id}
                      className="btn btn-secondary btn-sm">Approve (pending send)</button>
                    <button onClick={() => update(p.id, "rejected")} disabled={processing === p.id}
                      className="btn btn-danger btn-sm">Reject</button>
                  </div>
                </div>
              )}

              {p.status === "paid" && p.tx_hash && (
                <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
                  TX: {p.tx_hash}
                </div>
              )}

              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
