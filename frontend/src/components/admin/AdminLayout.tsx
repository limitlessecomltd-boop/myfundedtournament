"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ─── Admin Layout Wrapper (used by all admin pages) ───────────────────────────
export function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user?.is_admin) return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)" }}>Access denied</div>
  );

  const links = [
    { href: "/admin",                  label: "Dashboard" },
    { href: "/admin/tournaments",      label: "Tournaments" },
    { href: "/admin/payouts",          label: "Payouts" },
    { href: "/admin/funded-accounts",  label: "Funded Accounts" },
    { href: "/admin/violations",       label: "Violations" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
      {/* Sidebar */}
      <div style={{ width: 220, borderRight: "1px solid var(--border)", background: "var(--bg2)", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 20px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
          Admin Panel
        </div>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            display: "block", padding: "11px 20px", textDecoration: "none", fontSize: 14,
            color: pathname === l.href ? "var(--green)" : "var(--text2)",
            background: pathname === l.href ? "var(--green-dim)" : "transparent",
            borderLeft: pathname === l.href ? "3px solid var(--green)" : "3px solid transparent",
            transition: "all 0.15s",
          }}>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 32, overflow: "auto" }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 26, fontWeight: 800, marginBottom: 28 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
