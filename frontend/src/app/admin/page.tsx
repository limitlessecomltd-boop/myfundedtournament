"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";

function StatCard({ label, value, sub, color="#FFD700", icon }: any) {
  return (
    <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
      borderRadius:14, padding:"18px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase",
            color:"rgba(255,255,255,.35)", marginBottom:8 }}>{label}</div>
          <div style={{ fontSize:26, fontWeight:900, color,
            fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", letterSpacing:"-1px" }}>
            {value}
          </div>
          {sub && <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:4 }}>{sub}</div>}
        </div>
        <span style={{ fontSize:24, opacity:.6 }}>{icon}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [dash,     setDash]     = useState<any>(null);
  const [finance,  setFinance]  = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.dashboard(),
      adminApi.finance(),
      adminApi.activity(),
    ]).then(([d, f, a]) => {
      setDash(d); setFinance(f); setActivity(a || []);
    }).finally(() => setLoading(false));
  }, []);

  const toursByStatus = (status: string) =>
    dash?.tournaments?.find((t: any) => t.status === status)?.count || 0;

  const pendingPayouts   = dash?.payouts?.find((p: any) => p.status === "pending")?.count || 0;
  const pendingViolations= dash?.violations?.find((v: any) => v.status === "pending_review")?.count || 0;
  const pendingKyc       = dash?.fundedAccounts?.find((f: any) => f.status === "pending_kyc")?.count || 0;

  const revenue     = parseFloat(finance?.revenue?.confirmed_revenue || 0);
  const pending_rev = parseFloat(finance?.revenue?.pending_revenue || 0);

  const activityIcon: Record<string,string> = {
    entry:"🎯", payment:"💳", winner:"🏆", violation:"⚠️"
  };

  const QUICK = [
    { href:"/admin/tournaments", icon:"⚔️", label:"Manage Battles",     color:"#FFD700" },
    { href:"/admin/users",       icon:"👥", label:"User Management",     color:"#60a5fa" },
    { href:"/admin/payments",    icon:"💳", label:"Review Payments",     color:"#22C55E" },
    { href:"/admin/payouts",     icon:"💰", label:"Process Payouts",     color:"#a78bfa" },
    { href:"/admin/violations",  icon:"⚠️", label:"Review Violations",   color:"#EF4444" },
    { href:"/admin/finance",     icon:"📈", label:"Finance Report",      color:"#FF6400" },
    { href:"/admin/guild",       icon:"🔥", label:"Guild Battles",       color:"#FF6400" },
    { href:"/admin/settings",    icon:"⚙️", label:"Platform Settings",   color:"rgba(255,255,255,.5)" },
  ];

  if (loading) return (
    <div style={{ padding:40, display:"flex", justifyContent:"center" }}>
      <div className="spinner"/>
    </div>
  );

  return (
    <div style={{ padding:"32px 36px", background:"#030508", minHeight:"100vh" }}>
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
          color:"rgba(255,255,255,.3)", marginBottom:8 }}>Overview</div>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
          fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
          Dashboard
        </h1>
      </div>

      {/* Alert row */}
      {(Number(pendingPayouts) > 0 || Number(pendingViolations) > 0 || Number(pendingKyc) > 0) && (
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
          {Number(pendingPayouts) > 0 && (
            <Link href="/admin/payouts" style={{ display:"flex", alignItems:"center", gap:8,
              background:"rgba(167,139,250,.08)", border:"1px solid rgba(167,139,250,.3)",
              borderRadius:10, padding:"8px 14px", textDecoration:"none", fontSize:13,
              color:"#a78bfa", fontWeight:700 }}>
              ⚡ {pendingPayouts} payout{pendingPayouts>1?"s":""} pending
            </Link>
          )}
          {Number(pendingViolations) > 0 && (
            <Link href="/admin/violations" style={{ display:"flex", alignItems:"center", gap:8,
              background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.3)",
              borderRadius:10, padding:"8px 14px", textDecoration:"none", fontSize:13,
              color:"#EF4444", fontWeight:700 }}>
              ⚠️ {pendingViolations} violation{pendingViolations>1?"s":""} to review
            </Link>
          )}
          {Number(pendingKyc) > 0 && (
            <Link href="/admin/funded-accounts" style={{ display:"flex", alignItems:"center", gap:8,
              background:"rgba(96,165,250,.08)", border:"1px solid rgba(96,165,250,.3)",
              borderRadius:10, padding:"8px 14px", textDecoration:"none", fontSize:13,
              color:"#60a5fa", fontWeight:700 }}>
              🏦 {pendingKyc} KYC pending
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:32 }}>
        <StatCard label="Total Revenue" value={`$${revenue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} sub={pending_rev > 0 ? `$${pending_rev.toFixed(2)} pending` : "Confirmed USDT"} icon="💰" color="#22C55E"/>
        <StatCard label="Active Battles" value={toursByStatus("active")} sub={`${toursByStatus("registration")} open registration`} icon="⚔️"/>
        <StatCard label="Total Entries" value={finance?.revenue?.confirmed_count || 0} sub="Confirmed entries" icon="🎯" color="#60a5fa"/>
        <StatCard label="Pending Payouts" value={pendingPayouts} sub="Awaiting processing" icon="⏳" color={Number(pendingPayouts)>0?"#EF4444":"rgba(255,255,255,.5)"}/>
        <StatCard label="KYC Pending" value={pendingKyc} sub="Funded accounts" icon="🏦" color={Number(pendingKyc)>0?"#a78bfa":"rgba(255,255,255,.5)"}/>
        <StatCard label="Violations" value={pendingViolations} sub="Awaiting review" icon="⚠️" color={Number(pendingViolations)>0?"#EF4444":"rgba(255,255,255,.5)"}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:24 }}>
        {/* Quick actions */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)",
            marginBottom:14, textTransform:"uppercase", letterSpacing:".08em" }}>Quick Actions</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
            {QUICK.map(q => (
              <Link key={q.href} href={q.href} style={{ display:"flex", alignItems:"center", gap:12,
                background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
                borderRadius:12, padding:"14px 16px", textDecoration:"none",
                transition:"border-color .15s", color:"#fff" }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor=q.color+"66")}
                onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,.07)")}>
                <span style={{ fontSize:22 }}>{q.icon}</span>
                <span style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.8)" }}>{q.label}</span>
              </Link>
            ))}
          </div>

          {/* Tournament status */}
          <div style={{ marginTop:24, background:"rgba(13,18,29,.95)",
            border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"18px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)",
              marginBottom:14, textTransform:"uppercase", letterSpacing:".08em" }}>Battle Status</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {[
                { label:"Registration", status:"registration", color:"#FFD700" },
                { label:"Active", status:"active", color:"#22C55E" },
                { label:"Ended", status:"ended", color:"rgba(255,255,255,.4)" },
                { label:"Cancelled", status:"cancelled", color:"#EF4444" },
              ].map(s => (
                <div key={s.status} style={{ textAlign:"center", padding:"12px 8px",
                  background:"rgba(255,255,255,.03)", borderRadius:10 }}>
                  <div style={{ fontSize:24, fontWeight:900, color:s.color,
                    fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                    {toursByStatus(s.status)}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:14, padding:"18px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)",
            marginBottom:14, textTransform:"uppercase", letterSpacing:".08em" }}>Live Activity</div>
          {activity.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,.3)", fontSize:13 }}>
              No activity yet
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:420, overflowY:"auto" }}>
              {activity.map((a: any, i: number) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start",
                  padding:"9px 10px", background:"rgba(255,255,255,.03)",
                  borderRadius:9, border:"1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{activityIcon[a.type] || "•"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.75)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {a.actor || "Unknown"} — {a.type}
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {a.context}
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.25)", flexShrink:0 }}>
                    {new Date(a.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
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
