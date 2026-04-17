"use client";

function cleanName(name: string): string {
  return name?.replace(/ #\d{10,}$/, '') || name;
}

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { tournamentApi, entryApi, leaderboardApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePaymentSocket } from "@/hooks/useSockets";
import { Tournament, Entry } from "@/types";

const BROKERS = ["Exness", "ICMarkets", "Tickmill", "Other"];

// ── ForumPay Payment Card ─────────────────────────────────────────────────────
const FORUMPAY_CURRENCIES = [
  { id:"USDT_TRC20",   name:"USDT",    network:"TRC-20",   icon:"₮", color:"#27A17C" },
  { id:"USDT",         name:"USDT",    network:"ERC-20",   icon:"₮", color:"#27A17C" },
  { id:"USDT_POLYGON", name:"USDT",    network:"Polygon",  icon:"₮", color:"#7F3CDE" },
  { id:"USDT_SOLANA",  name:"USDT",    network:"Solana",   icon:"₮", color:"#9945FF" },
  { id:"USDC",         name:"USDC",    network:"ERC-20",   icon:"$", color:"#2775CA" },
  { id:"BTC",          name:"Bitcoin", network:"BTC",      icon:"₿", color:"#F89D2F" },
  { id:"ETH",          name:"Ethereum",network:"ETH",      icon:"Ξ", color:"#828384" },
  { id:"LTC",          name:"Litecoin",network:"LTC",      icon:"Ł", color:"#385D9A" },
];

function PaymentCard({ payment, onCurrencyChange, selectedCurrency }: { payment: any; onCurrencyChange: (c:string)=>void; selectedCurrency: string }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!payment?.address) return;
    let mounted = true;
    function renderQR() {
      const el = qrRef.current;
      if (!el || !mounted) return;
      el.innerHTML = "";
      try {
        new (window as any).QRCode(el, { text: payment.address, width:160, height:160, colorDark:"#000", colorLight:"#fff", correctLevel:(window as any).QRCode?.CorrectLevel?.H||1 });
      } catch {}
    }
    if ((window as any).QRCode) { renderQR(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.setAttribute("data-qr","1");
    s.onload = renderQR;
    document.head.appendChild(s);
    return () => { mounted = false; };
  }, [payment?.address]);

  function copy() {
    navigator.clipboard.writeText(payment.address).catch(() => {
      const el = document.createElement("textarea");
      el.value = payment.address;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const currMeta = FORUMPAY_CURRENCIES.find(c => c.id === selectedCurrency) || FORUMPAY_CURRENCIES[0];
  const isConfirmed = payment?.confirmed;
  const isConfirming = payment?.status === "confirming";

  return (
    <div style={{ background:"rgba(13,18,29,.98)", border:"1px solid rgba(255,215,0,.3)", borderRadius:16, padding:"20px 22px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:800, color: isConfirmed?"#22C55E": isConfirming?"#fbbf24":"#FFD700" }}>
          {isConfirmed ? "✅ Payment Confirmed!" : isConfirming ? "⏳ Confirming..." : "💳 Pay with Crypto"}
        </div>
        {!isConfirmed && (
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"rgba(255,255,255,.35)" }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#FFD700",display:"inline-block",animation:"pulse 1.5s infinite" }}/>
            Waiting for payment
          </div>
        )}
      </div>

      {isConfirmed ? (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#22C55E" }}>Entry Activated!</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:6 }}>Your battle has started. Good luck!</div>
        </div>
      ) : (
        <>
          {/* Currency selector */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:8 }}>Select Currency</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {FORUMPAY_CURRENCIES.map(c => (
                <button key={c.id} onClick={() => onCurrencyChange(c.id)}
                  style={{ padding:"5px 10px", borderRadius:8, cursor:"pointer", border:"none", fontFamily:"inherit", fontSize:11, fontWeight:600, transition:"all .15s",
                    background: selectedCurrency===c.id ? `${c.color}22` : "rgba(255,255,255,.05)",
                    color:      selectedCurrency===c.id ? c.color : "rgba(255,255,255,.45)",
                    outline:    selectedCurrency===c.id ? `1px solid ${c.color}55` : "1px solid transparent",
                  }}>
                  {c.icon} {c.name} <span style={{ fontSize:9, opacity:.7 }}>{c.network}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div style={{ background:"rgba(255,215,0,.06)", border:"1px solid rgba(255,215,0,.2)", borderRadius:10, padding:"12px 16px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:4 }}>Amount to Send</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#FFD700", fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-1px" }}>
                {payment.amount} <span style={{ fontSize:13, color:"rgba(255,215,0,.6)", fontWeight:600 }}>{currMeta.name}</span>
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:2 }}>≈ ${payment.amount_usd} USD · {currMeta.network} network</div>
            </div>
            {/* QR */}
            <div style={{ background:"#fff", borderRadius:8, padding:4 }}>
              <div ref={qrRef} style={{ width:80, height:80 }} />
            </div>
          </div>

          {/* Notice from ForumPay (e.g. ETH requires extra notice) */}
          {payment.notice && (
            <div style={{ fontSize:11, color:"#fbbf24", background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.2)", borderRadius:8, padding:"8px 12px", marginBottom:12 }}>
              ℹ️ {payment.notice}
            </div>
          )}

          {/* Address */}
          <div style={{ background:"rgba(255,255,255,.04)", borderRadius:10, padding:"10px 12px", marginBottom:12 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:6 }}>
              {currMeta.name} ({currMeta.network}) Address
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:10, wordBreak:"break-all", color:"rgba(255,255,255,.75)", fontFamily:"'JetBrains Mono','Fira Code',monospace", flex:1, lineHeight:1.7 }}>
                {payment.address}
              </div>
              <button onClick={copy}
                style={{ flexShrink:0, borderRadius:8, padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                  background: copied?"rgba(34,197,94,.15)":"rgba(255,215,0,.1)",
                  border:`1px solid ${copied?"rgba(34,197,94,.4)":"rgba(255,215,0,.3)"}`,
                  color: copied?"#22C55E":"#FFD700" }}>
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
          </div>

          {/* Confirmations progress */}
          {isConfirming && payment.confirmations !== undefined && (
            <div style={{ background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.2)", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:11, color:"#fbbf24" }}>
              ⛓ {payment.confirmations || 0} / {payment.waiting_confirmations || "?"} confirmations received
            </div>
          )}

          {/* Warning */}
          <div style={{ fontSize:11, color:"rgba(239,68,68,.8)", background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.18)", borderRadius:8, padding:"9px 12px", marginBottom:4, lineHeight:1.65, display:"flex", gap:8 }}>
            <span style={{ flexShrink:0 }}>⚠️</span>
            <span>Send <strong>exactly</strong> the amount shown on the <strong>{currMeta.network} network</strong>. Wrong network = permanent loss.</span>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.22)", textAlign:"center", marginTop:8 }}>
            Powered by ForumPay · Auto-confirms · No need to refresh
          </div>
        </>
      )}
    </div>
  );
}
function TimeDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, color:"rgba(255,255,255,.8)", fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>{value}</div>
    </div>
  );
}

// Live countdown for active tournaments
function LiveCountdown({ endTime }: { endTime: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const update = () => setSecs(Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [endTime]);
  const m = Math.floor(secs / 60), s = secs % 60;
  const warn = secs <= 3 * 60 && secs > 0;
  return (
    <div style={{ textAlign:"center", padding:"20px", background: warn ? "rgba(239,68,68,.08)" : "rgba(34,197,94,.06)", border:`1px solid ${warn?"rgba(239,68,68,.3)":"rgba(34,197,94,.2)"}`, borderRadius:14, marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", color: warn?"#EF4444":"#22C55E", marginBottom:8, textTransform:"uppercase" }}>
        {warn ? "⚠️ CLOSE ALL TRADES NOW" : "⏱ Time Remaining"}
      </div>
      <div style={{ fontSize:48, fontWeight:900, color: warn?"#EF4444":"#22C55E", fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", letterSpacing:"-3px", lineHeight:1 }}>
        {String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
      </div>
      {warn && <div style={{ fontSize:12, color:"rgba(239,68,68,.7)", marginTop:8 }}>Trades open after this will NOT count!</div>}
    </div>
  );
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [myEntries, setMyEntries] = useState<Entry[]>([]);
  const [topTraders, setTopTraders] = useState<any[]>([]);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USDT_TRC20");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ mt5Login:"", mt5Password:"", mt5Server:"", mt5ServerIp:"", broker:"Exness" });
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Poll ForumPay payment status every 8s
  useEffect(() => {
    if (!payment?.paymentId || payment?.confirmed) return;
    const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
    const poll = async () => {
      try {
        const token = localStorage.getItem("fc_token") || "";
        const r = await fetch(`${API}/api/payments/${payment.paymentId}/status`, {
          headers: { Authorization: "Bearer " + token }
        });
        const d = await r.json();
        setPayment((p: any) => ({
          ...p,
          status: d.status,
          confirmed: d.confirmed || d.status === "confirmed",
          confirmations: d.confirmations,
          waiting_confirmations: d.waiting_confirmations,
        }));
        if (d.confirmed || d.status === "confirmed") {
          if (user) entryApi.getMy(id).then(setMyEntries).catch(() => {});
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 8000);
    return () => clearInterval(iv);
  }, [payment?.paymentId, payment?.confirmed]);

  // When user changes currency, fetch new rate + start new payment
  const handleCurrencyChange = async (currency: string) => {
    setSelectedCurrency(currency);
    if (!payment?.entryId) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
      const token = localStorage.getItem("fc_token") || "";
      const r = await fetch(`${API}/api/payments/create`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: payment.entryId, currency }),
      });
      const d = await r.json();
      if (d.success) {
        setPayment((p: any) => ({
          ...p, paymentId: d.payment_id, address: d.address,
          amount: d.amount, currency: d.currency, notice: d.notice, status: "waiting",
        }));
      }
    } catch {}
  };

  usePaymentSocket(payment?.paymentId || null, () => {
    setPayment((p: any) => p ? {...p, confirmed:true} : p);
    loadMyEntries();
  });

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    tournamentApi.getById(id).then(setTournament).catch(console.error);
    if (user) loadMyEntries();
    leaderboardApi.get(id, 5).then(setTopTraders).catch(() => {});
  }
  async function loadMyEntries() {
    entryApi.getMy(id).then(setMyEntries).catch(() => {});
  }
  async function verifyMT5() {
    if (!form.mt5Login || !form.mt5Password || !form.mt5Server) {
      setError("Fill in Account Number, Password and Server Name first.");
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    setVerified(false);
    setError("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const r = await fetch(`${API}/api/entries/verify-mt5`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mt5Login:    form.mt5Login.trim(),
          mt5Password: form.mt5Password.trim(),
          mt5Server:   form.mt5Server.trim(),
          broker:      form.broker,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await r.json();
      const isValid = data.valid === true || data.ok === true;
      const friendlyError = data.error || "Verification failed";
      setVerifyResult({ ...data, ok: isValid, friendlyError });
      setVerified(isValid);
      if (!isValid) setError(friendlyError);
    } catch(e: any) {
      const msg = e.name === "AbortError"
        ? "Verification timed out (30s). MT5 server is slow — wait 30 seconds and try again."
        : "Verification failed — " + e.message;
      setError(msg);
      setVerifyResult({ ok: false, friendlyError: msg });
    } finally {
      setVerifying(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      // 1. Create entry (status = pending_payment)
      const result = await entryApi.create({
        tournamentId: id, mt5Login: form.mt5Login,
        mt5Password: form.mt5Password, mt5Server: form.mt5Server,
        broker: form.broker.toLowerCase()
      });
      const entryId = result.entry?.id || result.id;

      // 2. Create ForumPay payment
      const API   = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
      const token = localStorage.getItem("fc_token") || "";
      const pr = await fetch(`${API}/api/payments/create`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: entryId, currency: selectedCurrency }),
      });
      const pd = await pr.json();

      if (!pd.success) throw new Error(pd.error || "Payment creation failed");

      setPayment({
        entryId,
        paymentId:   pd.payment_id,
        address:     pd.address,
        amount:      pd.amount,
        amount_usd:  pd.amount_usd,
        currency:    pd.currency,
        notice:      pd.notice,
        status:      "waiting",
        confirmed:   false,
      });
      setShowJoinForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to create entry");
    } finally { setSubmitting(false); }
  }

  // Only count confirmed (non-pending) entries toward limits
  const confirmedEntries = myEntries.filter(e => e.status !== "pending_payment");
  const activeEntries    = myEntries.filter(e => e.status === "active");
  // 1 original + 1 re-entry max (pending_payment don't count)
  const canEnter = user && tournament && ["registration","active"].includes(tournament.status) && confirmedEntries.length < 2 && activeEntries.length < 1;

  // Calculate duration in minutes from actual start/end times
  const durationMins = tournament ? Math.round((new Date(tournament.end_time).getTime() - new Date(tournament.start_time).getTime()) / 60000) : 90;
  const durationLabel = durationMins >= 60 ? `${Math.round(durationMins)} min (${(durationMins/60).toFixed(1)}h)` : `${durationMins} min`;

  const isGuild   = (tournament as any)?.tier_type === "guild";
  const tierColor = isGuild ? "#FF6400" : tournament?.tier === "pro" ? "#22C55E" : "#FFD700";
  const tierName  = isGuild ? ((tournament as any)?.name || "Guild Battle") : tournament?.tier === "pro" ? "Pro Bullet" : "Starter Bullet";

  if (!tournament) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:400, background:"#050810" }}>
      <div className="spinner"/>
    </div>
  );

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"clamp(20px,3vw,36px) clamp(16px,4vw,40px)" }}>
              <style>{`
        .detail-wrap{padding:clamp(20px,3vw,36px) clamp(16px,4vw,40px);}
        .detail-leaderboard{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .detail-leaderboard>div{min-width:420px;}
        @media(max-width:768px){
          .detail-layout{ flex-direction:column !important; }
          .detail-sidebar{ width:100% !important; flex:none !important; }
          .detail-stats{ grid-template-columns:1fr 1fr !important; }
          .detail-timing{ grid-template-columns:1fr 1fr !important; }
          .detail-header-flex{ flex-direction:column !important; gap:12px !important; }
        }
        @media(max-width:480px){
          .detail-stats{ grid-template-columns:1fr 1fr !important; }
          .detail-timing{ grid-template-columns:1fr !important; }
        }
      `}</style>
        <div className="detail-layout" style={{ display:"flex", gap:32, flexWrap:"wrap" }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ flex:"1 1 min(100%, 520px)" }}>

            {/* Header */}
            <div style={{ marginBottom:28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:20, background:`${tierColor}18`, border:`1px solid ${tierColor}44`, color:tierColor }}>{tierName}</span>
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:20,
                  background: tournament.status==="active" ? "rgba(34,197,94,.12)" : tournament.status==="registration" ? "rgba(255,215,0,.1)" : "rgba(255,255,255,.06)",
                  border: tournament.status==="active" ? "1px solid rgba(34,197,94,.3)" : "1px solid rgba(255,255,255,.1)",
                  color: tournament.status==="active" ? "#22C55E" : tournament.status==="registration" ? "#FFD700" : "rgba(255,255,255,.5)",
                  textTransform:"capitalize" }}>
                  {tournament.status==="registration" ? "Open for Registration" : tournament.status}
                </span>
              </div>
              <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:34, fontWeight:900, color:"#fff", letterSpacing:"-1px", marginBottom:10 }}>
                {cleanName(tournament.name)}
              </h1>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", fontStyle:"italic" }}>
                Are you good enough to beat only {tournament.max_entries} traders?
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:12 }}>
                <span style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:38, fontWeight:900, color:tierColor }}>
                  ${Number(tournament.prize_pool).toLocaleString()}
                </span>
                <span style={{ color:"rgba(255,255,255,.4)", fontSize:14 }}>total prize pool</span>
              </div>
            </div>

            {/* Live countdown if active */}
            {tournament.status === "active" && <LiveCountdown endTime={tournament.end_time}/>}

            {/* Winner Banner — shown when tournament ended */}
            {tournament.status === "ended" && (
              <div style={{ background:"linear-gradient(135deg, rgba(255,215,0,.12), rgba(255,165,0,.06))", border:"1px solid rgba(255,215,0,.35)", borderRadius:16, padding:"20px 24px", marginBottom:20, textAlign:"center", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg, #FFD700, #FF8C00, #FFD700)" }} />
                <div style={{ fontSize:32, marginBottom:8 }}>🏆</div>
                <div style={{ fontSize:13, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,215,0,.6)", marginBottom:6 }}>Battle Ended · Champion</div>
                {(tournament as any).winner_username ? (
                  <>
                    <div style={{ fontSize:28, fontWeight:900, color:"#FFD700", fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-1px", marginBottom:4 }}>
                      {(tournament as any).winner_username}
                    </div>
                    <div style={{ fontSize:16, color:(tournament as any).winner_profit_pct >= 0 ? "#22C55E" : "#EF4444", fontWeight:700 }}>
                      {parseFloat((tournament as any).winner_profit_pct || 0) >= 0 ? "+" : ""}{parseFloat((tournament as any).winner_profit_pct || 0).toFixed(2)}% gain
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize:16, color:"rgba(255,255,255,.4)" }}>No participants</div>
                )}
              </div>
            )}

            {/* Stats grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }} className="detail-stats">
              {[
                ["Entry Fee",      `$${tournament.entry_fee} USDT`, tierColor],
                ["Demo Balance",   "$1,000",                        "#fff"],
                ["Profit Share",   "90%",                           "#22C55E"],
                ["Max Traders",    tournament.max_entries,          "#fff"],
                ["Traders Joined", tournament.active_entries || 0,  tierColor],
                ["Unique Traders", tournament.unique_traders || 0,  "#fff"],
              ].map(([l,v,c]) => (
                <div key={String(l)} style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"rgba(255,255,255,.35)", marginBottom:6 }}>{l}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:String(c), fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Battle timing — clean, minimal */}
            <div style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"20px 24px", marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:16 }}>Battle Timing</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }} className="detail-timing">
                <TimeDisplay label="Registration Opens" value={new Date(tournament.registration_open).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}/>
                <TimeDisplay label="Battle Duration" value="90 Minutes"/>
                <TimeDisplay label="Starts When" value={`${tournament.max_entries} spots filled`}/>
                <TimeDisplay label="3-Minute Rule" value="Close all trades 3 min before end"/>
              </div>
            </div>

            {/* Re-entry rules — updated */}
            <div style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"20px 24px", marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:14 }}>Re-entry Rules</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  ["✅", "1 re-entry allowed per tournament",                          "#22C55E"],
                  ["⚡", "Re-entry unlocks only after your first entry is breached",   "#FFD700"],
                  ["💰", "Each re-entry pays the full entry fee",                       "rgba(255,255,255,.6)"],
                  ["🚫", "Maximum 2 entries total per trader per battle",              "rgba(255,255,255,.6)"],
                ].map(([icon, rule, color]) => (
                  <div key={String(rule)} style={{ display:"flex", alignItems:"flex-start", gap:10, fontSize:13, color:String(color) }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
                    {rule}
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 leaderboard */}
            {topTraders.length > 0 && (
              <div style={{ background:"rgba(13,18,29,.9)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"20px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)" }}>Current Leaders</span>
                  <Link href={`/leaderboard?t=${id}`} style={{ fontSize:12, color:"#FFD700", textDecoration:"none", fontWeight:600 }}>Full leaderboard →</Link>
                </div>
                {topTraders.map((e, i) => (
                  <div key={e.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom: i < topTraders.length-1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:16 }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"#"+(i+1)}</span>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.65)", fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>{e.display_name}</span>
                    </div>
                    <span style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:15, fontWeight:800, color: Number(e.profit_pct)>=0?"#22C55E":"#EF4444" }}>
                      {Number(e.profit_pct)>=0?"+":""}{Number(e.profit_pct).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN — Join Panel ── */}
          <div className="detail-sidebar" style={{ width:300, flexShrink:0 }}>

            {/* My entries */}
            {confirmedEntries.length > 0 && (
              <div style={{ background:"rgba(13,18,29,.95)", border:`1px solid ${tierColor}33`, borderRadius:16, padding:"18px 20px", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", marginBottom:14 }}>My Entries ({confirmedEntries.length}/2)</div>
                {myEntries.filter(e => e.status !== "pending_payment").map(e => (
                  <div key={e.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                    <div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginBottom:4 }}>Entry #{e.entry_number} · {e.broker}</div>
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20,
                        background: e.status==="active"?"rgba(34,197,94,.12)":"rgba(255,255,255,.06)",
                        color: e.status==="active"?"#22C55E":"rgba(255,255,255,.4)",
                        border: e.status==="active"?"1px solid rgba(34,197,94,.3)":"1px solid rgba(255,255,255,.1)" }}>
                        {e.status}
                      </span>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:16, fontWeight:800, color: Number(e.profit_pct)>=0?"#22C55E":"#EF4444", fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
                        {Number(e.profit_pct)>=0?"+":""}{Number(e.profit_pct).toFixed(2)}%
                      </div>
                      {e.status==="active" && (
                        <Link href={`/tournaments/${id}/trade?entry=${e.id}`} style={{ fontSize:11, color:"#FFD700", textDecoration:"none" }}>View →</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment pending */}
            {payment && !payment.confirmed && (
              <PaymentCard payment={payment} selectedCurrency={selectedCurrency} onCurrencyChange={handleCurrencyChange} />
            )}

            {payment?.confirmed && (
              <div style={{ background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.3)", borderRadius:16, padding:"18px 20px", marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#22C55E", marginBottom:8 }}>✅ Payment Confirmed!</div>
                <p style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>Your entry is active. Open MT5 and start trading when the battle begins!</p>
              </div>
            )}

            {/* Join / Re-enter card */}
            <div style={{ background:"rgba(13,18,29,.95)", border:`1px solid ${tierColor}44`, borderRadius:16, padding:"22px" }}>
              <div style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:18, fontWeight:800, color:"#fff", marginBottom:20 }}>
                {confirmedEntries.length > 0 ? "Re-enter Battle" : "Join Battle"}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                {[
                  ["Entry fee",      `$${tournament.entry_fee} USDT`],
                  ["Demo balance",   "$1,000"],
                  ["Duration",       "90 Minutes"],
                  ["If you win",     "Instant USDT cashout (80%) or funded account (90%)"],
                  ["Profit share",   "90% to you"],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ color:"rgba(255,255,255,.38)" }}>{l}</span>
                    <span style={{ color:"rgba(255,255,255,.85)", fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#EF4444" }}>
                  {error}
                </div>
              )}

              {!user ? (
                <Link href="/login" className="btn btn-primary" style={{ width:"100%", justifyContent:"center", display:"flex" }}>Login to Join</Link>
              ) : !canEnter ? (
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", textAlign:"center", padding:"14px 0", background:"rgba(255,255,255,.03)", borderRadius:10, border:"1px solid rgba(255,255,255,.06)" }}>
                  {myEntries.length >= 2 ? "Maximum entries reached (2/2)" :
                   activeEntries.length >= 1 ? "Re-entry unlocks after your entry is breached." :
                   "Tournament not open for entries"}
                </div>
              ) : !showJoinForm ? (
                <button onClick={() => setShowJoinForm(true)} className="btn" style={{ width:"100%", background:tierColor, color:"#000", fontWeight:800, fontSize:15, padding:"14px", border:"none", borderRadius:10, cursor:"pointer" }}>
                  {confirmedEntries.length > 0 ? "Use Re-entry →" : "Grab Your Spot →"}
                </button>
              ) : (
                <form onSubmit={handleJoin} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {/* Account Number */}
                  <div>
                    <label className="input-label">MT5 Account Number</label>
                    <input className="input" type="text" placeholder="e.g. 12345678"
                      value={form.mt5Login}
                      onChange={e => setForm(f => ({...f, mt5Login: e.target.value}))} required/>
                  </div>
                  {/* Master Password */}
                  <div>
                    <label className="input-label">Master Password</label>
                    <input className="input" type="password" placeholder="Master password (not investor)"
                      value={form.mt5Password}
                      onChange={e => setForm(f => ({...f, mt5Password: e.target.value}))} required/>
                  </div>
                  {/* Smart Server Picker */}
                  <div>
                    <label className="input-label">MT5 Server</label>
                    <select className="input" value={form.mt5Server}
                      onChange={e => {
                        const sv = e.target.value;
                        const broker =
                          sv.toLowerCase().includes("exness")     ? "Exness" :
                          sv.toLowerCase().includes("icmarkets")  ? "ICMarkets" :
                          sv.toLowerCase().includes("tickmill")   ? "Tickmill" :
                          form.broker;
                        setForm(f => ({...f, mt5Server: sv, broker}));
                      }}
                      style={{ color: form.mt5Server ? "#fff" : "rgba(255,255,255,.35)" }}
                      required>
                      <option value="" disabled>— Select your server —</option>
                      <optgroup label="Exness Demo (Trial)">
                        {Array.from({length:30},(_,i)=>`Exness-MT5Trial${i+1 === 1 ? "" : i+1}`).map(s=>(
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Exness Real">
                        {["Exness-MT5Real","Exness-MT5Real2","Exness-MT5Real3","Exness-MT5Real4",
                          "Exness-MT5Real5","Exness-MT5Real6","Exness-MT5Real7","Exness-MT5Real8"].map(s=>(
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                      <optgroup label="ICMarkets">
                        {["ICMarkets-MT5","ICMarkets-MT5Live","ICMarkets-MT5Demo"].map(s=>(
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Tickmill">
                        {["Tickmill-MT5Live","Tickmill-MT5Demo"].map(s=>(
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                      <option value="__custom__">✏️ Type custom server...</option>
                    </select>
                    {/* Custom server text input - shown when "Type custom" selected */}
                    {form.mt5Server === "__custom__" && (
                      <input className="input" type="text"
                        placeholder="Type exact server name e.g. Pepperstone-MT5"
                        style={{ marginTop:8 }}
                        onChange={e => {
                          const sv = e.target.value;
                          const broker =
                            sv.toLowerCase().includes("exness")    ? "Exness" :
                            sv.toLowerCase().includes("icmarkets") ? "ICMarkets" :
                            sv.toLowerCase().includes("tickmill")  ? "Tickmill" :
                            form.broker;
                          setForm(f => ({...f, mt5Server: sv || "__custom__", broker}));
                        }}
                        autoFocus/>
                    )}
                    {form.mt5Server && form.mt5Server !== "__custom__" && (
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4, paddingLeft:2 }}>
                        ✓ Server selected — IP will be resolved automatically on verify
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="input-label">Broker</label>
                    <select className="input" value={form.broker} onChange={e => setForm(f => ({...f,broker:e.target.value}))}>
                      {BROKERS.map(b => <option key={b}>{b}</option>)}
                    </select>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:4,paddingLeft:2}}>
                      Auto-detected from server name when possible
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.03)", borderRadius:8, padding:"10px 12px" }}>
                    🔒 Master password required — used to verify your account balance and trade history.
                  </div>
                  {/* Verify button — shown before payment */}
                  {!verified && (
                    <button type="button" onClick={verifyMT5}
                      disabled={verifying || !form.mt5Login || !form.mt5Password || !form.mt5Server}
                      className="btn btn-primary" style={{ width:"100%", marginBottom:10 }}>
                      {verifying ? "⏳ Connecting to MT5... (up to 20s)" : "🔍 Verify MT5 Account"}
                    </button>
                  )}

                  {/* Verification results */}
                  {verifyResult && (
                    <div style={{ background:"rgba(255,255,255,.04)",
                      border:`1px solid ${verifyResult.ok ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`,
                      borderRadius:10, padding:"14px 16px", marginBottom:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, marginBottom:8,
                        color: verifyResult.ok ? "var(--green)" : "var(--red)" }}>
                        {verifyResult.ok ? "✅ Account verified — ready to join!" : "❌ Account check failed"}
                      </div>
                      {verifyResult.ok ? (
                        <div style={{fontSize:12,color:"rgba(255,255,255,.6)",lineHeight:1.5}}>
                          <div>✅ Balance: <span style={{color:"#fff",fontWeight:600}}>${verifyResult.balance}</span> — correct</div>
                          <div>✅ No open trades — ready to battle</div>
                        </div>
                      ) : (
                        <div style={{fontSize:12,color:"var(--red)",lineHeight:1.6}}>
                          {verifyResult.friendlyError || verifyResult.error || "Verification failed"}
                        </div>
                      )}
                      {!verifyResult.ok && (
                        <button type="button" onClick={()=>{setVerifyResult(null);setVerified(false);setError("");}}
                          style={{ marginTop:8, fontSize:11, color:"rgba(255,255,255,.4)", background:"none", border:"none", cursor:"pointer", padding:0 }}>
                          ↺ Try again
                        </button>
                      )}
                    </div>
                  )}

                  {/* Pay button — only after verification passes */}
                  
                {verified && verifyResult && (
                  <div style={{background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.3)",borderRadius:12,padding:"12px 16px",marginBottom:8}}>
                    <div style={{color:"#4ade80",fontWeight:700,fontSize:13,marginBottom:6}}>✅ MT5 Account Verified</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12,color:"rgba(255,255,255,.7)"}}>
                      <div>Login: <span style={{color:"#fff",fontWeight:600}}>{verifyResult.login}</span></div>
                      <div>Balance: <span style={{color:"#4ade80",fontWeight:600}}>{verifyResult.balance}</span></div>
                      <div>Open Trades: <span style={{color:"#fff",fontWeight:600}}>{verifyResult.open_trades}</span></div>
                      <div>Status: <span style={{color:"#4ade80",fontWeight:600}}>Ready ✓</span></div>
                    </div>
                  </div>
                )}
                {verified && (
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width:"100%", marginBottom:10 }}>
                      {submitting ? "Processing..." : `🔒 Pay $${tournament.entry_fee} USDT`}
                    </button>
                  )}

                  <button type="button" onClick={() => setShowJoinForm(false)} className="btn btn-ghost" style={{ width:"100%" }}>Cancel</button>
                </form>
              )}

              <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", textAlign:"center", marginTop:14 }}>
                Crypto payment via ForumPay · Entry fee adds to prize pool
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
