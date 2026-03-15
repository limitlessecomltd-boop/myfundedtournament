"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const links = [
    { href: "/tournaments",  label: "Tournaments" },
    { href: "/leaderboard",  label: "Leaderboard" },
    { href: "/certificates", label: "Certificates" },
    ...(user ? [{ href: "/profile", label: "My Account" }] : []),
    ...(user?.is_admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav style={{
      background: "rgba(5,8,16,0.97)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      height: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 40px",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, background: "#FFD700", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: "#000", letterSpacing: "-0.5px" }}>
          MFT
        </div>
        <span style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>
          <span style={{ color: "#fff" }}>MyFunded</span>
          <span style={{ color: "#FFD700" }}>Tournament</span>
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            padding: "6px 13px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            transition: "all .15s",
            color: pathname === l.href ? "#fff" : "rgba(255,255,255,.45)",
            background: pathname === l.href ? "rgba(255,255,255,.07)" : "transparent",
          }}>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Auth */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
              {user.username || user.email?.split("@")[0]}
            </span>
            <button onClick={() => { logout(); router.push("/"); }} className="btn btn-ghost btn-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Join a Tournament</Link>
          </>
        )}
      </div>
    </nav>
  );
}
