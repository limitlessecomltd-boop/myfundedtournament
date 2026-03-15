"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Violation } from "@/types";

const FILTERS = ["auto_resolved","pending_review","dismissed","disqualified"];

export default function AdminViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filter, setFilter] = useState("auto_resolved");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    adminApi.getViolations(filter).then(setViolations).catch(console.error);
  }

  async function update(id: string, status: string) {
    setProcessing(id);
    try { await adminApi.updateViolation(id, { status }); await load(); }
    catch (err: any) { alert(err?.response?.data?.error || "Failed"); }
    finally { setProcessing(null); }
  }

  const typeColor: Record<string, string> = {
    hft: "badge-amber", hedge: "badge-amber",
    deposit: "badge-red", account_change: "badge-red"
  };

  return (
    <AdminLayout title="Violations">
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
            style={{ textTransform: "capitalize", fontSize: 12 }}>
            {f.replace("_"," ")}
          </button>
        ))}
      </div>

      {violations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>No violations in this category</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {violations.map(v => (
            <div key={v.id} className="card-sm" style={{ borderLeft: `3px solid ${v.type === "deposit" ? "var(--red)" : "var(--amber)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`badge ${typeColor[v.type] || "badge-gray"}`} style={{ fontSize: 11, textTransform: "uppercase" }}>{v.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v.username || v.email}</span>
                  <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
                    {v.tournament_name} · Entry #{v.entry_number} · MT5: {v.mt5_login}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
                  {new Date(v.created_at).toLocaleString()}
                </span>
              </div>

              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>{v.description}</p>

              {v.evidence && Object.keys(v.evidence).length > 0 && (
                <div style={{ background: "var(--bg3)", borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: 12, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text3)" }}>
                  {Object.entries(v.evidence).map(([k,val]) => (
                    <div key={k}><span style={{ color: "var(--text2)" }}>{k}:</span> {String(val)}</div>
                  ))}
                </div>
              )}

              {(filter === "auto_resolved" || filter === "pending_review") && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => update(v.id, "dismissed")} disabled={processing === v.id}
                    className="btn btn-secondary btn-sm">Dismiss</button>
                  <button onClick={() => update(v.id, "disqualified")} disabled={processing === v.id}
                    className="btn btn-danger btn-sm">Disqualify Trader</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
