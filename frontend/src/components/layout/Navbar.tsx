"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bizOpen, setBizOpen] = useState(false);
  const [mobileBizOpen, setMobileBizOpen] = useState(false);
  const bizRef = useRef<HTMLDivElement>(null);
  const close = () => { setMobileOpen(false); setMobileBizOpen(false); };

  // Close biz dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bizRef.current && !bizRef.current.contains(e.target as Node)) {
        setBizOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { href: "/tournaments",  label: "Tournaments" },
    { href: "/leaderboard",  label: "Leaderboard" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/earn",         label: "🔥 Earn" },
    ...(user ? [{ href: "/profile", label: "My Account" }] : []),
    ...(user?.is_admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  const bizItems = [
    {
      href: "/mft-affiliate.html",
      icon: "🔗",
      label: "MFT Affiliates",
      desc: "Earn 10% on every battle entry",
      color: "#FFD700",
    },
    {
      href: "/mft-broker-saas.html",
      icon: "🏦",
      label: "MFT SaaS",
      desc: "White-label platform for brokers",
      color: "#FFA500",
    },
    {
      href: "/mft-coffee-trade-shop.html",
      icon: "☕",
      label: "MFT Coffee & Trade Shops",
      desc: "Open a trading battle café franchise",
      color: "#22C55E",
    },
  ];

  return (
    <>
      <style>{`
        .nav-links{display:flex;gap:2px;align-items:center;}
        .nav-auth{display:flex;gap:10px;align-items:center;}
        .nav-burger{display:none;}
        .biz-dropdown{
          position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%);
          min-width:300px;background:rgba(8,13,21,.98);
          border:1px solid rgba(255,215,0,.2);border-radius:16px;
          padding:8px;z-index:300;
          box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,215,0,.08);
          backdrop-filter:blur(20px);
        }
        .biz-dropdown::before{
          content:'';position:absolute;top:-6px;left:50%;transform:translateX(-50%);
          width:12px;height:12px;background:rgba(8,13,21,.98);
          border-top:1px solid rgba(255,215,0,.2);border-left:1px solid rgba(255,215,0,.2);
          rotate:45deg;
        }
        .biz-item{
          display:flex;align-items:center;gap:14px;padding:14px 16px;
          border-radius:11px;text-decoration:none;transition:all .18s;cursor:pointer;
        }
        .biz-item:hover{background:rgba(255,215,0,.07);}
        .biz-icon{
          width:40px;height:40px;border-radius:10px;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;font-size:18px;
        }
        .biz-btn{
          display:flex;align-items:center;gap:6px;padding:6px 13px;
          border-radius:7px;font-size:13px;font-weight:600;
          background:transparent;border:none;cursor:pointer;transition:all .15s;
          color:rgba(255,215,0,.85);font-family:inherit;
          position:relative;
        }
        .biz-btn:hover,.biz-btn.active{
          background:rgba(255,215,0,.1);color:#FFD700;
        }
        .biz-btn .chevron{
          font-size:9px;transition:transform .2s;display:inline-block;
          color:rgba(255,215,0,.5);margin-top:1px;
        }
        .biz-btn .chevron.up{transform:rotate(180deg);}
        .biz-divider{height:1px;background:rgba(255,255,255,.06);margin:4px 8px;}
        @media(max-width:768px){
          .nav-links,.nav-auth{display:none !important;}
          .nav-burger{display:flex !important;}
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
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={{
              padding:"6px 13px", borderRadius:7, fontSize:13, fontWeight:500,
              textDecoration:"none", transition:"all .15s",
              color: pathname === l.href ? "#fff" : "rgba(255,255,255,.45)",
              background: pathname === l.href ? "rgba(255,255,255,.07)" : "transparent",
            }}>{l.label}</Link>
          ))}

          {/* ── For Business Dropdown ── */}
          <div ref={bizRef} style={{ position:"relative" }}>
            <button
              className={`biz-btn${bizOpen ? " active" : ""}`}
              onClick={() => setBizOpen(o => !o)}
            >
              <span style={{ fontSize:12 }}>💼</span>
              For Business
              <span className={`chevron${bizOpen ? " up" : ""}`}>▼</span>
            </button>

            {bizOpen && (
              <div className="biz-dropdown" onClick={() => setBizOpen(false)}>
                {/* Header */}
                <div style={{ padding:"10px 16px 6px", marginBottom:4 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:".15em",
                    textTransform:"uppercase", color:"rgba(255,215,0,.4)" }}>
                    Business Opportunities
                  </div>
                </div>
                <div className="biz-divider"/>

                {bizItems.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="biz-item"
                  >
                    <div className="biz-icon" style={{
                      background:`rgba(${item.color === "#FFD700" ? "255,215,0" : item.color === "#FFA500" ? "255,165,0" : "34,197,94"},.1)`,
                      border:`1px solid ${item.color}33`,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:2 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", lineHeight:1.4 }}>
                        {item.desc}
                      </div>
                    </div>
                    <div style={{ fontSize:14, color:"rgba(255,255,255,.2)" }}>→</div>
                  </a>
                ))}

                <div className="biz-divider" style={{ margin:"4px 8px 8px" }}/>
                <div style={{ padding:"8px 16px 4px", fontSize:11,
                  color:"rgba(255,255,255,.25)", textAlign:"center" }}>
                  📧 limitlessecomltd@gmail.com
                </div>
              </div>
            )}
          </div>
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
          onClick={() => setMobileOpen(o => !o)}
          style={{ background:"none", border:"none", padding:8, display:"none",
            flexDirection:"column", gap:5, cursor:"pointer", alignItems:"center" }}
          aria-label="Toggle menu">
          <span style={{ display:"block", width:22, height:2.5, background: mobileOpen?"#FFD700":"#fff",
            borderRadius:2, transition:"transform .25s, opacity .25s",
            transform: mobileOpen ? "rotate(45deg) translate(5px,5px)" : "none" }}/>
          <span style={{ display:"block", width:22, height:2.5, background:"#fff",
            borderRadius:2, transition:"opacity .25s", opacity: mobileOpen ? 0 : 1 }}/>
          <span style={{ display:"block", width:22, height:2.5, background: mobileOpen?"#FFD700":"#fff",
            borderRadius:2, transition:"transform .25s",
            transform: mobileOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }}/>
        </button>
      </nav>

      {/* ── Mobile slide-down menu ── */}
      {mobileOpen && (
        <div style={{
          position:"fixed", top:60, left:0, right:0, bottom:0,
          background:"rgba(5,8,16,.98)", zIndex:199,
          padding:"20px 16px 32px",
          display:"flex", flexDirection:"column", gap:6,
          overflowY:"auto",
        }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={close} style={{
              display:"block", padding:"15px 18px",
              fontSize:17, fontWeight:600,
              color: pathname === l.href ? "#FFD700" : "rgba(255,255,255,.85)",
              textDecoration:"none", borderRadius:12,
              background: pathname === l.href ? "rgba(255,215,0,.08)" : "rgba(255,255,255,.03)",
              border: pathname === l.href ? "1px solid rgba(255,215,0,.2)" : "1px solid rgba(255,255,255,.06)",
            }}>{l.label}</Link>
          ))}

          {/* Mobile For Business */}
          <div style={{ borderRadius:12, overflow:"hidden", border:"1px solid rgba(255,215,0,.2)", background:"rgba(255,215,0,.04)" }}>
            <button
              onClick={() => setMobileBizOpen(o => !o)}
              style={{ width:"100%", background:"none", border:"none", padding:"15px 18px",
                fontSize:17, fontWeight:600, color:"#FFD700", textAlign:"left",
                display:"flex", justifyContent:"space-between", alignItems:"center",
                cursor:"pointer", fontFamily:"inherit" }}>
              <span>💼 For Business</span>
              <span style={{ fontSize:12, transition:"transform .2s",
                transform: mobileBizOpen ? "rotate(180deg)" : "none" }}>▼</span>
            </button>

            {mobileBizOpen && (
              <div style={{ borderTop:"1px solid rgba(255,215,0,.1)", padding:"8px" }}>
                {bizItems.map(item => (
                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer"
                    onClick={close}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 10px",
                      borderRadius:10, textDecoration:"none", marginBottom:4,
                      background:"rgba(255,255,255,.03)" }}>
                    <span style={{ fontSize:22 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{item.label}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>{item.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

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
