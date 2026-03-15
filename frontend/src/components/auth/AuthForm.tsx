"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.username || undefined);
      }
      router.push("/tournaments");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: "var(--green)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-head)", fontWeight: 800, color: "#000", fontSize: 13, margin: "0 auto 16px" }}>MFT</div>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 26, fontWeight: 800 }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text3)", marginTop: 6 }}>
            {mode === "login" ? "Sign in to MyFundedTournament" : "Start competing in funded tournaments"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Username (optional)</label>
              <input className="input" placeholder="Your trader name" value={form.username}
                onChange={e => setForm(f => ({...f, username: e.target.value}))} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Password</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
          </div>

          {error && (
            <div style={{ background: "var(--red-dim)", border: "1px solid rgba(255,78,106,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13, color: "var(--red)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 8 }}>
            {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text3)" }}>
          {mode === "login" ? (
            <>Don't have an account? <Link href="/register" style={{ color: "var(--green)", textDecoration: "none", fontWeight: 500 }}>Sign up</Link></>
          ) : (
            <>Already have an account? <Link href="/login" style={{ color: "var(--green)", textDecoration: "none", fontWeight: 500 }}>Sign in</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
