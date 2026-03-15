"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import MFTLogo from "@/components/ui/MFTLogo";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const links = [
    { href: "/tournaments",   label: "Tournaments" },
    { href: "/leaderboard",   label: "Leaderboard" },
    { href: "/certificates",  label: "Certificates" },
    ...(user ? [{ href: "/profile", label: "My Account" }] : []),
    ...(user?.is_admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav style={{
      background: "rgba(7,9,15,0.96)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.055)",
      height: 64, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 40px",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <MFTLogo size={34} />
        <span style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 16, letterSpacing: "-.4px" }}>
          <span style={{ color: "#fff" }}>MyFunded</span>
          <span style={{ color: "var(--gold)" }}>Tournament</span>
        </span>
      </Link>

      <div style={{ display: "flex", gap: 2 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            padding: "7px 13px", borderRadius: 7, fontSize: 13, fontWeight: 500,
            textDecoration: "none", transition: "all .15s",
            color: pathname === l.href ? "#fff" : "rgba(255,255,255,.5)",
            background: pathname === l.href ? "rgba(255,255,255,.07)" : "transparent",
          }}>
            {l.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)", fontFamily: "var(--font-mono)" }}>
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
