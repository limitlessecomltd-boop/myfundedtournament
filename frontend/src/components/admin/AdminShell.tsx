"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const NAV = [
  { href:"/admin",                  icon:"📊", label:"Dashboard",   exact:true },
  { href:"/admin/tournaments",      icon:"⚔️", label:"Battles" },
  { href:"/admin/users",            icon:"👥", label:"Users" },
  { href:"/admin/payments",         icon:"💳", label:"Payments" },
  { href:"/admin/guild",            icon:"🔥", label:"Guild" },
  { href:"/admin/payouts",          icon:"💰", label:"Payouts" },
  { href:"/admin/funded-accounts",  icon:"🏆", label:"Funded" },
  { href:"/admin/violations",       icon:"⚠️", label:"Violations" },
  { href:"/admin/rebates",           icon:"💰", label:"Rebates" },
  { href:"/admin/finance",          icon:"📈", label:"Finance" },
  { href:"/admin/settings",         icon:"⚙️", label:"Settings" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const { user }  = useAuth();
  const [col, setCol]       = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#03050a" }}>
      <style>{`
        .admin-shell { display:flex; height:100vh; overflow:hidden; }
        .admin-aside { width:${col?62:220}px; flex-shrink:0; background:#060810; border-right:1px solid rgba(255,255,255,.06); display:flex; flex-direction:column; transition:width .2s; overflow:hidden; }
        .admin-main  { flex:1; min-width:0; overflow:auto; }
        .admin-mobile-bar { display:none; }
        .admin-mobile-drawer { display:none; }
        @media(max-width:768px){
          .admin-shell { flex-direction:column; height:auto; overflow:visible; }
          .admin-aside  { display:none !important; }
          .admin-main   { overflow:visible; }
          .admin-mobile-bar {
            display:flex; align-items:center; justify-content:space-between;
            padding:10px 16px; background:#060810;
            border-bottom:1px solid rgba(255,255,255,.06);
            position:sticky; top:60px; z-index:100;
          }
          .admin-mobile-drawer {
            display:flex; flex-direction:column;
            background:#060810; border-bottom:1px solid rgba(255,255,255,.08);
            padding:8px 12px 12px;
          }
          .admin-mobile-nav {
            display:grid; grid-template-columns:repeat(5,1fr); gap:6px;
          }
        }
        @media(max-width:480px){
          .admin-mobile-nav { grid-template-columns:repeat(4,1fr); }
        }
      `}</style>

      {/* Mobile top bar */}
      <div className="admin-mobile-bar">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.25)" }}>Admin</div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:900, fontSize:13, color:"#FFD700" }}>MFT Control</div>
        </div>
        <button onClick={()=>setMobileOpen(o=>!o)} style={{ background:"none", border:"1px solid rgba(255,255,255,.15)", borderRadius:7, padding:"6px 12px", cursor:"pointer", color:"rgba(255,255,255,.6)", fontSize:12, fontWeight:600 }}>
          {mobileOpen ? "✕ Close" : "☰ Menu"}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="admin-mobile-drawer" onClick={()=>setMobileOpen(false)}>
          <div className="admin-mobile-nav">
            {NAV.map(n=>{
              const on = active(n.href, n.exact);
              return (
                <Link key={n.href} href={n.href} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 6px", borderRadius:10, textDecoration:"none", background:on?"rgba(255,215,0,.1)":"rgba(255,255,255,.03)", border:`1px solid ${on?"rgba(255,215,0,.25)":"rgba(255,255,255,.06)"}`, color:on?"#FFD700":"rgba(255,255,255,.5)", fontSize:10, fontWeight:on?700:500, textAlign:"center" }}>
                  <span style={{ fontSize:18 }}>{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </div>
          <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.05)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{user?.username||user?.email?.split("@")[0]||"admin"}</span>
            <Link href="/" style={{ fontSize:11, color:"rgba(255,215,0,.5)", textDecoration:"none" }}>← Back to site</Link>
          </div>
        </div>
      )}

      {/* Desktop+Mobile shell */}
      <div className="admin-shell" style={{ flex:1 }}>
        {/* Desktop sidebar */}
        <aside className="admin-aside">
          <div style={{ padding:col?"16px 0":"20px 16px", borderBottom:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:col?"center":"space-between" }}>
            {!col && (
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.25)", marginBottom:4 }}>Admin Panel</div>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:900, fontSize:15, color:"#FFD700" }}>MFT Control</div>
              </div>
            )}
            <button onClick={()=>setCol(c=>!c)} style={{ background:"none", border:"1px solid rgba(255,255,255,.1)", borderRadius:6, padding:"4px 8px", cursor:"pointer", color:"rgba(255,255,255,.4)", fontSize:11 }}>
              {col?"→":"←"}
            </button>
          </div>
          <nav style={{ flex:1, padding:"8px", overflowY:"auto" }}>
            {NAV.map(n=>{
              const on = active(n.href, n.exact);
              return (
                <Link key={n.href} href={n.href} title={n.label} style={{ display:"flex", alignItems:"center", gap:col?0:10, padding:col?"11px 0":"9px 10px", justifyContent:col?"center":"flex-start", borderRadius:8, marginBottom:2, textDecoration:"none", background:on?"rgba(255,215,0,.08)":"transparent", border:`1px solid ${on?"rgba(255,215,0,.2)":"transparent"}`, color:on?"#FFD700":"rgba(255,255,255,.45)", fontSize:13, fontWeight:on?700:500, transition:"all .12s" }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{n.icon}</span>
                  {!col && <span>{n.label}</span>}
                </Link>
              );
            })}
          </nav>
          {!col && (
            <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>Logged in as</div>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.6)", marginTop:2 }}>{user?.username||user?.email?.split("@")[0]||"admin"}</div>
              <Link href="/" style={{ fontSize:10, color:"rgba(255,215,0,.5)", textDecoration:"none", display:"block", marginTop:6 }}>← Back to site</Link>
            </div>
          )}
        </aside>
        {/* Content */}
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
