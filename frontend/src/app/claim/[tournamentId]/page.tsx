"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const API = "https://myfundedtournament-production.up.railway.app";

export default function ClaimPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { user } = useAuth();

  const [loading,  setLoading]  = useState(true);
  const [data,     setData]     = useState<any>(null);
  const [choice,   setChoice]   = useState<"funded"|"cashout"|null>(null);
  const [wallet,   setWallet]   = useState("");
  const [submitting, setSub]    = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (!user) return;
    const T = localStorage.getItem("fc_token") || "";
    Promise.all([
      fetch(`${API}/api/admin/funded-accounts`, { headers:{ Authorization:"Bearer "+T } }).then(r=>r.json()),
      fetch(`${API}/api/tournaments/${tournamentId}`).then(r=>r.json()),
    ]).then(([faData, tData]) => {
      const fa = faData.data?.find((f: any) => f.tournament_id === tournamentId && f.user_id === user.id);
      if (!fa) { setError("No prize found for this tournament. Make sure you're logged in as the winner."); setLoading(false); return; }
      setData({ funded: fa, tournament: tData.data || tData });
      setLoading(false);
    }).catch(() => { setError("Failed to load claim. Please try again."); setLoading(false); });
  }, [user, tournamentId]);

  async function submitClaim() {
    if (!choice) return;
    if (choice === "cashout" && !wallet.trim()) { setError("Please enter your USDT TRC-20 wallet address."); return; }
    if (choice === "cashout" && !wallet.trim().startsWith("T")) { setError("TRC-20 addresses start with T. Please check your address."); return; }
    setSub(true); setError("");
    const T = localStorage.getItem("fc_token") || "";
    try {
      const endpoint = choice === "cashout" ? `${API}/api/users/payout-request` : `${API}/api/admin/funded-accounts/${data.funded.id}`;
      const body = choice === "cashout"
        ? { fundedAccountId: data.funded.id, walletAddress: wallet.trim(), currency: "usdttrc20", type: "cashout" }
        : { status: "kyc_done", notes: "Winner chose funded account" };
      const method = choice === "cashout" ? "POST" : "PATCH";
      const r = await fetch(endpoint, { method, headers:{ Authorization:"Bearer "+T, "Content-Type":"application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Submission failed");
      setDone(true);
    } catch(e: any) {
      setError(e.message);
    } finally { setSub(false); }
  }

  if (!user) return (
    <div style={{ background:"#050810", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
        <Link href="/login" className="btn btn-primary">Login to Claim</Link>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ background:"#050810", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="spinner"/>
    </div>
  );

  if (error && !data) return (
    <div style={{ background:"#050810", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ fontSize:40, marginBottom:16 }}>😕</div>
      <div style={{ color:"rgba(255,255,255,.6)", marginBottom:24, textAlign:"center", maxWidth:400 }}>{error}</div>
      <Link href="/profile" className="btn btn-ghost">Go to Profile</Link>
    </div>
  );

  const fa         = data?.funded;
  const tournament = data?.tournament;
  const wPct       = parseFloat(tournament?.winner_pct || 90);
  const pool       = fa?.account_size ? parseFloat(fa.account_size) / (wPct / 100) : 0;
  const cashoutAmt = pool * 0.80;
  const fundedAmt  = parseFloat(fa?.account_size || 0);

  if (done) return (
    <div style={{ background:"#050810", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.3)", borderRadius:20, padding:48, maxWidth:520, textAlign:"center", width:"100%" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
        <h2 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:28, fontWeight:900, color:"#22C55E", marginBottom:12 }}>
          Claim Submitted!
        </h2>
        <p style={{ fontSize:15, color:"rgba(255,255,255,.5)", lineHeight:1.75, marginBottom:28 }}>
          {choice === "cashout"
            ? `Your cashout of $${cashoutAmt.toFixed(2)} USDT will be processed within 24 hours.`
            : `Your funded account of $${fundedAmt.toFixed(0)} is being prepared. Check your email for KYC instructions.`}
        </p>
        <Link href="/profile" className="btn btn-primary" style={{ display:"inline-flex" }}>View My Profile →</Link>
      </div>
    </div>
  );

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"48px 24px" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:64, marginBottom:12 }}>🏆</div>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,215,0,.7)", marginBottom:10 }}>
            Congratulations — You Won!
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:32, fontWeight:900, color:"#fff", letterSpacing:"-1px", marginBottom:8 }}>
            Choose Your Prize
          </h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>{tournament?.name}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
          {[
            { key:"funded" as const, icon:"📈", title:"Funded Account", amount:`$${fundedAmt.toLocaleString(undefined,{maximumFractionDigits:0})}`, sub:"90% of prize pool", desc:"Real live trading account", points:["Real capital to trade","Daily profit withdrawals","Keep 90% of all profits"], color:"#FFD700", btnColor:"#FFD700", btnText:"#000" },
            { key:"cashout" as const, icon:"💵", title:"Instant USDT", amount:`$${cashoutAmt.toFixed(2)}`, sub:"80% of prize pool", desc:"Instant USDT TRC-20", points:["Paid within 24 hours","No KYC required","Any TRC-20 wallet"], color:"#22C55E", btnColor:"#22C55E", btnText:"#fff" },
          ].map(opt => (
            <button key={opt.key} onClick={() => setChoice(opt.key)}
              style={{ background: choice===opt.key ? `${opt.color}10` : "rgba(13,18,29,.95)",
                border: `2px solid ${choice===opt.key ? opt.color : "rgba(255,255,255,.07)"}`,
                borderRadius:18, padding:"24px 20px", cursor:"pointer", textAlign:"center", transition:"all .2s" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>{opt.icon}</div>
              <div style={{ fontSize:15, fontWeight:800, color: choice===opt.key ? opt.color : "#fff", marginBottom:6 }}>{opt.title}</div>
              <div style={{ fontSize:26, fontWeight:900, color:opt.color, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", marginBottom:4 }}>{opt.amount}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:12 }}>{opt.sub}</div>
              <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", paddingTop:10 }}>
                {opt.points.map(p => (
                  <div key={p} style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:4 }}>✓ {p}</div>
                ))}
              </div>
            </button>
          ))}
        </div>

        {choice === "cashout" && (
          <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:"18px 22px", marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:8 }}>
              USDT TRC-20 Wallet Address
            </label>
            <input value={wallet} onChange={e => setWallet(e.target.value)}
              className="input" placeholder="TRC-20 address starting with T..."
              style={{ width:"100%", fontFamily:"monospace" }}/>
            <div style={{ fontSize:11, color:"rgba(239,68,68,.7)", marginTop:7 }}>
              ⚠️ TRC-20 only. Wrong network = permanent loss of funds. Double-check your address.
            </div>
          </div>
        )}

        {choice === "funded" && (
          <div style={{ background:"rgba(255,215,0,.05)", border:"1px solid rgba(255,215,0,.15)", borderRadius:14, padding:"14px 20px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#FFD700", marginBottom:5 }}>📋 What happens next</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", lineHeight:1.7 }}>
              We'll email <strong style={{ color:"rgba(255,255,255,.8)" }}>{user?.email}</strong> within 24 hours with KYC instructions. Once verified, your <strong style={{ color:"#FFD700" }}>${fundedAmt.toFixed(0)}</strong> live funded trading account will be set up with a broker.
            </div>
          </div>
        )}

        {error && (
          <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13, color:"#EF4444" }}>
            {error}
          </div>
        )}

        <button onClick={submitClaim} disabled={!choice || submitting}
          style={{ width:"100%", padding:"16px", borderRadius:12, cursor: choice ? "pointer" : "not-allowed",
            background: !choice ? "rgba(255,255,255,.06)" : choice==="funded" ? "#FFD700" : "#22C55E",
            color: !choice ? "rgba(255,255,255,.3)" : choice==="funded" ? "#000" : "#fff",
            fontWeight:900, fontSize:16, border:"none", transition:"all .2s" }}>
          {submitting ? "Submitting..." :
           !choice ? "Select an option above" :
           choice === "funded" ? `🏦 Claim $${fundedAmt.toFixed(0)} Funded Account →` :
           `💵 Claim $${cashoutAmt.toFixed(2)} USDT →`}
        </button>
      </div>
    </div>
  );
}
