"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const links = [
    { href: "/tournaments",  label: "Tournaments" },
    { href: "/leaderboard",  label: "Leaderboard" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/earn", label: "🔥 Earn" },
    ...(user ? [{ href: "/profile", label: "My Account" }] : []),
    ...(user?.is_admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <>
      <style>{`
        .nav-links { display: flex; gap: 2px; align-items: center; }
        .nav-auth  { display: flex; gap: 10px; align-items: center; }
        .nav-burger{ display: none; }
        @media(max-width:768px){
          .nav-links,.nav-auth{ display:none !important; }
          .nav-burger{ display:flex !important; }
        }
      `}</style>

      <nav style={{
        background:"rgba(5,8,16,0.97)",
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        height:60, display:"flex", alignItems:"center",
        justifyContent:"space-between",
        padding:"0 20px",
        position:"sticky", top:0, zIndex:200,
      }}>
        {/* ── Logo ── */}
        <Link href="/" onClick={close} style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          {/* MFT Logo box */}
          <div style={{
            width:32, height:32, background:"#FFD700", borderRadius:8,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:900, fontSize:11, color:"#000",
            fontFamily:"'Space Grotesk',system-ui,sans-serif",
            letterSpacing:"-0.5px", flexShrink:0,
          }}>MFT</div>
          <span className="nav-logo-text" style={{ fontFamily:"'Space Grotesk',system-ui,sans-serif", fontWeight:800, fontSize:15, letterSpacing:"-0.3px" }}>
            <span style={{ color:"#fff" }}>MyFunded</span>
            <span style={{ color:"#FFD700" }}>Tournament</span>
          </span>
        </Link>

        {/* ── Desktop links ── */}
        <div className="nav-links">
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{
              padding:"6px 13px", borderRadius:7, fontSize:13, fontWeight:500,
              textDecoration:"none", transition:"all .15s",
              color: pathname === l.href ? "#fff" : "rgba(255,255,255,.45)",
              background: pathname === l.href ? "rgba(255,255,255,.07)" : "transparent",
            }}>{l.label}</Link>
          ))}
        </div>

        {/* ── Desktop auth ── */}
        <div className="nav-auth">
          {user ? (
            <>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>
                {user.username || user.email?.split("@")[0]}
              </span>
              <button onClick={() => { logout(); router.push("/"); }}
                className="btn btn-ghost btn-sm">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Join a Battle</Link>
            </>
          )}
        </div>

        {/* ── Hamburger ── */}
        <button
          className="nav-burger"
          onClick={() => setOpen(o => !o)}
          style={{ background:"none", border:"none", padding:8, display:"none",
            flexDirection:"column", gap:5, cursor:"pointer", alignItems:"center" }}
          aria-label="Toggle menu">
          <span style={{ display:"block", width:22, height:2.5, background: open?"#FFD700":"#fff",
            borderRadius:2, transition:"transform .25s, opacity .25s",
            transform: open ? "rotate(45deg) translate(5px,5px)" : "none" }}/>
          <span style={{ display:"block", width:22, height:2.5, background:"#fff",
            borderRadius:2, transition:"opacity .25s", opacity: open ? 0 : 1 }}/>
          <span style={{ display:"block", width:22, height:2.5, background: open?"#FFD700":"#fff",
            borderRadius:2, transition:"transform .25s",
            transform: open ? "rotate(-45deg) translate(5px,-5px)" : "none" }}/>
        </button>
      </nav>

      {/* ── Mobile slide-down menu ── */}
      {open && (
        <div style={{
          position:"fixed", top:60, left:0, right:0, bottom:0,
          background:"rgba(5,8,16,.98)", zIndex:199,
          padding:"20px 16px 32px",
          display:"flex", flexDirection:"column", gap:6,
          overflowY:"auto",
        }} onClick={close}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={close} style={{
              display:"block", padding:"15px 18px",
              fontSize:17, fontWeight:600,
              color: pathname === l.href ? "#FFD700" : "rgba(255,255,255,.85)",
              textDecoration:"none", borderRadius:12,
              background: pathname === l.href ? "rgba(255,215,0,.08)" : "rgba(255,255,255,.03)",
              border: pathname === l.href ? "1px solid rgba(255,215,0,.2)" : "1px solid rgba(255,255,255,.06)",
            }}>{l.label}</Link>
          ))}

          <div style={{ marginTop:16, borderTop:"1px solid rgba(255,255,255,.08)", paddingTop:16,
            display:"flex", flexDirection:"column", gap:10 }}>
            {user ? (
              <>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", padding:"0 4px" }}>
                  Logged in as <strong style={{ color:"rgba(255,255,255,.7)" }}>{user.username || user.email?.split("@")[0]}</strong>
                </div>
                <button onClick={() => { logout(); router.push("/"); close(); }}
                  className="btn btn-ghost" style={{ width:"100%", justifyContent:"center" }}>Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={close} className="btn btn-ghost"
                  style={{ width:"100%", justifyContent:"center", display:"flex" }}>Sign In</Link>
                <Link href="/register" onClick={close} className="btn btn-primary"
                  style={{ width:"100%", justifyContent:"center", display:"flex" }}>Join a Battle →</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
