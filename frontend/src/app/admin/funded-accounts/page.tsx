"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { FundedAccount } from "@/types";

const STATUS_FLOW = ["pending_kyc","kyc_done","funded","active","suspended","closed"];

export default function AdminFundedAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, any>>({});

  useEffect(() => { adminApi.getFundedAccounts().then(setAccounts).catch(console.error); }, []);

  function setForm(id: string, key: string, val: string) {
    setForms(f => ({ ...f, [id]: { ...(f[id] || {}), [key]: val } }));
  }

  async function update(id: string, data: any) {
    setUpdating(id);
    try {
      await adminApi.updateFundedAccount(id, data);
      adminApi.getFundedAccounts().then(setAccounts);
    } catch (err: any) { alert(err?.response?.data?.error || "Failed"); }
    finally { setUpdating(null); }
  }

  const statusColor: Record<string, string> = {
    pending_kyc: "badge-amber", kyc_done: "badge-blue", funded: "badge-blue",
    active: "badge-green", suspended: "badge-red", closed: "badge-gray"
  };

  return (
    <AdminLayout title="Funded Accounts">
      <div style={{ marginBottom: 16, fontSize: 13, color: "var(--text3)" }}>
        {accounts.length} funded accounts total
      </div>

      {accounts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>No funded accounts yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {accounts.map(a => {
            const f = forms[a.id] || {};
            return (
              <div key={a.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700 }}>
                        {a.username || a.email}
                      </span>
                      <span className={`badge ${statusColor[a.status] || "badge-gray"}`} style={{ fontSize: 11, textTransform: "capitalize" }}>
                        {a.status.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text3)" }}>{a.tournament_name} · Won with +{Number(a.winning_profit_pct).toFixed(2)}%</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: "var(--green)" }}>
                      ${Number(a.account_size).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>funded account size</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    ["Max Drawdown", `${a.max_drawdown_pct}%`],
                    ["Daily Drawdown", `${a.daily_drawdown_pct}%`],
                    ["Profit Split", `${a.trader_split_pct}% / ${a.platform_split_pct}%`],
                  ].map(([l,v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 14, fontFamily: "var(--font-mono)", color: "var(--text)" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Update form */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 4, display: "block" }}>Status</label>
                      <select className="input" value={f.status || a.status}
                        onChange={e => setForm(a.id, "status", e.target.value)}>
                        {STATUS_FLOW.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 4, display: "block" }}>Broker Account #</label>
                      <input className="input" placeholder={a.broker_account || "Account number"}
                        value={f.brokerAccount || ""} onChange={e => setForm(a.id, "brokerAccount", e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 4, display: "block" }}>Broker Name</label>
                      <input className="input" placeholder={a.broker_name || "e.g. Exness"}
                        value={f.brokerName || ""} onChange={e => setForm(a.id, "brokerName", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 4, display: "block" }}>Notes</label>
                    <input className="input" placeholder="Internal notes..."
                      value={f.notes || a.notes || ""} onChange={e => setForm(a.id, "notes", e.target.value)} />
                  </div>
                  <button
                    onClick={() => update(a.id, { status: f.status || a.status, brokerAccount: f.brokerAccount, brokerName: f.brokerName, notes: f.notes })}
                    disabled={updating === a.id}
                    className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
                    {updating === a.id ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 10, fontFamily: "var(--font-mono)" }}>
                  Created {new Date(a.created_at).toLocaleString()}
                  {a.kyc_verified_at && ` · KYC verified ${new Date(a.kyc_verified_at).toLocaleDateString()}`}
                  {a.funded_at && ` · Funded ${new Date(a.funded_at).toLocaleDateString()}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
