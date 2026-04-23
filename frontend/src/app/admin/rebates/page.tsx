"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

const fmt = (n: any) => parseFloat(parseFloat(n||0).toFixed(2)).toLocaleString("en",{minimumFractionDigits:2});

export default function AdminRebates() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState<string|null>(null);
  const [subTab,  setSubTab]  = useState<"summary"|"rebates"|"bonuses">("summary");

  const load = () => {
    setLoading(true);
    adminApi.getOrganiserRebates()
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const payAll = async (organiserId: string, type: string, name: string) => {
    if (!confirm(`Pay all pending ${type}s for ${name}?`)) return;
    setPaying(organiserId + type);
    try {
      await adminApi.payAllRebates(organiserId, type);
      load();
    } finally { setPaying(null); }
  };

  const payOne = async (id: string) => {
    setPaying(id);
    try {
      await adminApi.payRebate(id);
      load();
    } finally { setPaying(null); }
  };

  return (
    <div style={{ background: "#030508", minHeight: "100vh", padding: "clamp(14px,2.5vw,32px)" }}>
      <style>{`
        .reb-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
        .reb-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:16px 18px;}
        .reb-table{width:100%;border-collapse:collapse;font-size:13px;}
        .reb-table th{padding:9px 14px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.3);border-bottom:1px solid rgba(255,255,255,.06);}
        .reb-table td{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.03);color:rgba(255,255,255,.7);}
        .reb-table tr:last-child td{border:none;}
        .pay-btn{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);color:#22C55E;padding:5px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;}
        .pay-btn:hover{background:rgba(34,197,94,.2);}
        .pay-btn:disabled{opacity:.4;cursor:not-allowed;}
        .subtab-btn{padding:8px 16px;border-radius:8px;border:1px solid;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;}
        @media(max-width:900px){.reb-kpi{grid-template-columns:1fr 1fr;}}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,215,0,.5)", marginBottom: 6 }}>Admin</div>
        <h1 style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 3 }}>
          💰 Organiser Rebates & Bonuses
        </h1>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)" }}>Entry rebates · Monthly volume bonuses · Payout management</div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><div className="spinner"/></div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="reb-kpi">
            {[
              { label: "Pending Rebates", value: `$${fmt(data?.summary?.reduce((s:number,o:any)=>s+parseFloat(o.pending_rebates||0),0)||0)}`, color: "#FFD700" },
              { label: "Pending Bonuses", value: `$${fmt(data?.summary?.reduce((s:number,o:any)=>s+parseFloat(o.pending_bonuses||0),0)||0)}`, color: "#22C55E" },
              { label: "Organisers Pending", value: data?.summary?.length || 0, color: "#3B82F6" },
              { label: "Total Rebate Events", value: data?.rebates?.length || 0, color: "#FFA500" },
            ].map(k => (
              <div key={k.label} className="reb-card">
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: `${k.color}99`, marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Sub-tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {([
              { id: "summary",  label: "👥 By Organiser" },
              { id: "rebates",  label: "💰 Entry Rebates" },
              { id: "bonuses",  label: "🚀 Monthly Bonuses" },
            ] as const).map(st => (
              <button key={st.id} className="subtab-btn" onClick={() => setSubTab(st.id)} style={{
                borderColor: subTab === st.id ? "rgba(255,215,0,.35)" : "rgba(255,255,255,.08)",
                background:  subTab === st.id ? "rgba(255,215,0,.08)" : "transparent",
                color:       subTab === st.id ? "#FFD700" : "rgba(255,255,255,.4)",
              }}>{st.label}</button>
            ))}
          </div>

          {/* ── BY ORGANISER SUMMARY ── */}
          {subTab === "summary" && (
            <div style={{ background: "rgba(13,18,29,.95)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
              {(!data?.summary || data.summary.length === 0) ? (
                <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,.35)" }}>No pending rebates or bonuses</div>
              ) : (
                <table className="reb-table">
                  <thead><tr>
                    <th>Organiser</th>
                    <th>Wallet</th>
                    <th>Pending Rebates</th>
                    <th>Pending Bonuses</th>
                    <th>Total Pending</th>
                    <th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {data.summary.map((o: any) => {
                      const total = parseFloat(o.pending_rebates||0) + parseFloat(o.pending_bonuses||0);
                      return (
                        <tr key={o.organiser_id}>
                          <td>
                            <div style={{ fontWeight: 700, color: "#fff" }}>{o.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{o.email}</div>
                          </td>
                          <td>
                            {o.payout_wallet
                              ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,215,0,.7)" }}>{o.payout_wallet.slice(0,12)}…</span>
                              : <span style={{ color: "#EF4444", fontSize: 11 }}>No wallet set</span>}
                          </td>
                          <td style={{ color: "#FFD700", fontFamily: "'DM Mono',monospace" }}>${fmt(o.pending_rebates)}</td>
                          <td style={{ color: "#22C55E", fontFamily: "'DM Mono',monospace" }}>${fmt(o.pending_bonuses)}</td>
                          <td style={{ color: "#fff", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>${fmt(total)}</td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {parseFloat(o.pending_rebates) > 0 && (
                                <button className="pay-btn" disabled={paying === o.organiser_id+"rebate"}
                                  onClick={() => payAll(o.organiser_id, "rebate", o.name)}>
                                  {paying === o.organiser_id+"rebate" ? "…" : "Pay Rebates"}
                                </button>
                              )}
                              {parseFloat(o.pending_bonuses) > 0 && (
                                <button className="pay-btn" disabled={paying === o.organiser_id+"bonus"}
                                  onClick={() => payAll(o.organiser_id, "bonus", o.name)}
                                  style={{ background: "rgba(34,197,94,.1)", borderColor: "rgba(34,197,94,.25)", color: "#22C55E" }}>
                                  {paying === o.organiser_id+"bonus" ? "…" : "Pay Bonuses"}
                                </button>
                              )}
                              {total > 0 && (
                                <button className="pay-btn" disabled={paying === o.organiser_id+"all"}
                                  onClick={() => payAll(o.organiser_id, "all", o.name)}
                                  style={{ background: "rgba(139,92,246,.1)", borderColor: "rgba(139,92,246,.25)", color: "#8B5CF6" }}>
                                  {paying === o.organiser_id+"all" ? "…" : "Pay All"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── ENTRY REBATES ── */}
          {subTab === "rebates" && (
            <div style={{ background: "rgba(13,18,29,.95)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
              {(!data?.rebates || data.rebates.length === 0) ? (
                <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,.35)" }}>No rebate records yet</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="reb-table">
                    <thead><tr>
                      <th>Organiser</th>
                      <th>Battle</th>
                      <th>Prize Pool</th>
                      <th>Entry Fee</th>
                      <th>Tier</th>
                      <th>Rebate</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr></thead>
                    <tbody>
                      {data.rebates.map((r: any) => (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#fff" }}>{r.organiser_name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>
                              {r.payout_wallet ? r.payout_wallet.slice(0,12)+"…" : <span style={{ color: "#EF4444" }}>No wallet</span>}
                            </div>
                          </td>
                          <td style={{ maxWidth: 160 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.battle_name}</div>
                          </td>
                          <td style={{ fontFamily: "'DM Mono',monospace", color: "#FFD700" }}>${fmt(r.prize_pool)}</td>
                          <td style={{ fontFamily: "'DM Mono',monospace" }}>${fmt(r.entry_fee)}</td>
                          <td>
                            <span style={{ background: "rgba(255,215,0,.1)", border: "1px solid rgba(255,215,0,.2)", color: "#FFD700", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {r.tier_label} · {r.rebate_pct}%
                            </span>
                          </td>
                          <td style={{ fontFamily: "'DM Mono',monospace", color: "#FFD700", fontWeight: 700 }}>${fmt(r.rebate_amount)}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, color: r.status === "paid" ? "#22C55E" : "#FFD700" }}>
                              {r.status === "paid" ? "✅ Paid" : "⏳ Pending"}
                            </span>
                          </td>
                          <td>
                            {r.status === "pending" && (
                              <button className="pay-btn" disabled={paying === r.id} onClick={() => payOne(r.id)}>
                                {paying === r.id ? "…" : "Mark Paid"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── MONTHLY BONUSES ── */}
          {subTab === "bonuses" && (
            <div style={{ background: "rgba(13,18,29,.95)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
              {(!data?.bonuses || data.bonuses.length === 0) ? (
                <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,.35)" }}>No bonus records yet</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="reb-table">
                    <thead><tr>
                      <th>Organiser</th>
                      <th>Period</th>
                      <th>Volume</th>
                      <th>Tier</th>
                      <th>Bonus</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr></thead>
                    <tbody>
                      {data.bonuses.map((b: any) => (
                        <tr key={b.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#fff" }}>{b.organiser_name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{b.organiser_email}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>{new Date(b.period_start).toLocaleDateString()} – {new Date(b.period_end).toLocaleDateString()}</td>
                          <td style={{ fontFamily: "'DM Mono',monospace", color: "#22C55E" }}>${parseFloat(b.prize_volume).toLocaleString()}</td>
                          <td>
                            <span style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)", color: "#22C55E", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{b.tier_label}</span>
                          </td>
                          <td style={{ fontFamily: "'DM Mono',monospace", color: "#22C55E", fontWeight: 700 }}>${fmt(b.bonus_amount)}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, color: b.status === "paid" ? "#22C55E" : "#3B82F6" }}>
                              {b.status === "paid" ? "✅ Paid" : "⏳ Pending"}
                            </span>
                          </td>
                          <td>
                            {b.status === "pending" && (
                              <button className="pay-btn" disabled={paying === b.id} onClick={() => payOne(b.id)}
                                style={{ background: "rgba(34,197,94,.1)", borderColor: "rgba(34,197,94,.25)", color: "#22C55E" }}>
                                {paying === b.id ? "…" : "Mark Paid"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
