"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href:"/admin",            icon:"📊", label:"Dashboard",      exact:true },
  { href:"/admin/tournaments",icon:"⚔️", label:"Battles" },
  { href:"/admin/users",      icon:"👥", label:"Users" },
  { href:"/admin/payments",   icon:"💳", label:"Payments" },
  { href:"/admin/guild",      icon:"🔥", label:"Guild Battles" },
  { href:"/admin/payouts",    icon:"💰", label:"Payouts" },
  { href:"/admin/funded-accounts",icon:"🏦", label:"Funded Accts" },
  { href:"/admin/violations", icon:"⚠️", label:"Violations" },
  { href:"/admin/finance",    icon:"📈", label:"Finance" },
  { href:"/admin/settings",   icon:"⚙️", label:"Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (user && !user.is_admin) router.push("/");
  }, [user]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#030508" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 60 : 220, flexShrink:0,
        background:"rgba(10,14,24,.98)", borderRight:"1px solid rgba(255,255,255,.07)",
        display:"flex", flexDirection:"column", position:"sticky", top:0,
        height:"100vh", overflowY:"auto", transition:"width .2s",
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "16px 0" : "20px 18px",
          borderBottom:"1px solid rgba(255,255,255,.06)",
          display:"flex", alignItems:"center", justifyContent: collapsed ? "center" : "space-between" }}>
          {!collapsed && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em",
                textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:4 }}>
                Admin Panel
              </div>
              <div style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",
                fontWeight:900, fontSize:15, color:"#FFD700", letterSpacing:"-0.5px" }}>
                MFT Control
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(c=>!c)}
            style={{ background:"none", border:"1px solid rgba(255,255,255,.1)",
              borderRadius:6, padding:"4px 8px", cursor:"pointer",
              color:"rgba(255,255,255,.4)", fontSize:12 }}>
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ flex:1, padding:"12px 0" }}>
          {NAV.map(item => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href} title={item.label} style={{
                display:"flex", alignItems:"center",
                gap: collapsed ? 0 : 10,
                padding: collapsed ? "11px 0" : "10px 16px",
                justifyContent: collapsed ? "center" : "flex-start",
                margin:"1px 8px", borderRadius:9, textDecoration:"none",
                background: active ? "rgba(255,215,0,.1)" : "transparent",
                border: active ? "1px solid rgba(255,215,0,.2)" : "1px solid transparent",
                color: active ? "#FFD700" : "rgba(255,255,255,.5)",
                fontSize:13, fontWeight: active ? 700 : 500,
                transition:"all .15s",
              }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user info */}
        {!collapsed && (
          <div style={{ padding:"14px 16px", borderTop:"1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:2 }}>Logged in as</div>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)" }}>
              {user?.username || user?.email?.split("@")[0]}
            </div>
            <Link href="/" style={{ fontSize:11, color:"rgba(255,215,0,.6)",
              textDecoration:"none", marginTop:6, display:"block" }}>
              ← Back to site
            </Link>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex:1, minWidth:0, overflowX:"hidden" }}>
        {children}
      </main>
    </div>
  );
}
