"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    adminApi.getDashboard().then(setData).catch(console.error);
  }, []);

  if (!data) return <AdminLayout title="Dashboard"><div style={{ color: "var(--text3)" }}>Loading...</div></AdminLayout>;

  const tMap: any = Object.fromEntries((data.tournaments || []).map((r: any) => [r.status, r.count]));
  const pMap: any = Object.fromEntries((data.payouts || []).map((r: any) => [r.status, r.count]));
  const fMap: any = Object.fromEntries((data.fundedAccounts || []).map((r: any) => [r.status, r.count]));
  const vMap: any = Object.fromEntries((data.violations || []).map((r: any) => [r.status, r.count]));

  return (
    <AdminLayout title="Dashboard">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { l: "Total Revenue",     v: `$${Number(data.totalRevenue || 0).toLocaleString()} USDT`, color: "var(--green)" },
          { l: "Active Tournaments", v: tMap["active"] || 0 },
          { l: "Pending Payouts",    v: pMap["pending"] || 0, color: Number(pMap["pending"]) > 0 ? "var(--amber)" : undefined },
          { l: "Pending KYC",        v: fMap["pending_kyc"] || 0, color: Number(fMap["pending_kyc"]) > 0 ? "var(--amber)" : undefined },
          { l: "Pending Violations", v: vMap["pending_review"] || 0, color: Number(vMap["pending_review"]) > 0 ? "var(--red)" : undefined },
          { l: "Active Funded Accts", v: fMap["active"] || 0 },
        ].map(s => (
          <div key={s.l} className="stat-block">
            <div className="stat-label">{s.l}</div>
            <div className="stat-value" style={{ fontSize: 28, color: s.color || "var(--text)" }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Quick Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["/admin/tournaments", "Create Tournament", "btn-primary"],
              ["/admin/payouts", "Review Payouts", "btn-secondary"],
              ["/admin/funded-accounts", "Manage Funded Accounts", "btn-secondary"],
              ["/admin/violations", "Review Violations", "btn-secondary"],
            ].map(([href, label, cls]) => (
              <a key={href as string} href={href as string} className={`btn ${cls}`} style={{ textAlign: "left", justifyContent: "flex-start" }}>
                {label as string}
              </a>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Tournament Status</div>
          {["upcoming","registration","active","ended"].map(s => (
            <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
              <span style={{ color: "var(--text2)", textTransform: "capitalize" }}>{s}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{tMap[s] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
