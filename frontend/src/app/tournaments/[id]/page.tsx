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

// ── QR Code Payment Card ───────────────────────────────────────────────────────
function PaymentCard({ payment }: { payment: any }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!payment?.address) return;
    let mounted = true;

    function renderQR() {
      const container = qrRef.current;
      if (!container || !mounted) return;
      container.innerHTML = "";
      try {
        new (window as any).QRCode(container, {
          text: payment.address,
          width: 180,
          height: 180,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: (window as any).QRCode?.CorrectLevel?.H || 1,
        });
        setQrReady(true);
      } catch(e) { console.error("QR error:", e); }
    }

    // If already loaded, render immediately
    if ((window as any).QRCode) {
      renderQR();
      return;
    }

    // Load script if not already present
    const existing = document.querySelector('script[data-qr]');
    if (existing) {
      existing.addEventListener("load", renderQR);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.setAttribute("data-qr", "1");
    script.onload = renderQR;
    document.head.appendChild(script);

    return () => { mounted = false; };
  }, [payment?.address]);

  function copyAddress() {
    navigator.clipboard.writeText(payment.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback for browsers that block clipboard
      const el = document.createElement("textarea");
      el.value = payment.address;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,215,0,.3)", borderRadius:16, padding:"18px 20px", marginBottom:16 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#FFD700" }}>⏳ Payment Pending</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#FFD700", display:"inline-block", animation:"pulse 1.5s infinite" }}/>
          Waiting...
        </div>
      </div>

      <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", marginBottom:16 }}>
        Scan QR or copy the address. Send <strong style={{ color:"#FFD700" }}>exactly</strong> this amount.
      </div>

      {/* Amount */}
      <div style={{ background:"rgba(255,215,0,.06)", border:"1px solid rgba(255,215,0,.2)", borderRadius:10, padding:"12px 14px", marginBottom:14, textAlign:"center" }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", color:"rgba(255,255,255,.35)", marginBottom:5, textTransform:"uppercase" }}>Amount to Send</div>
        <div style={{ fontSize:22, fontWeight:900, color:"#FFD700", fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", letterSpacing:"-0.5px" }}>
          {payment.amount} <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,215,0,.7)" }}>USDT TRC-20</span>
        </div>
      </div>

      {/* QR Code — ref-based, no getElementById */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
        <div style={{ background:"#fff", borderRadius:12, padding:10, display:"inline-flex", alignItems:"center", justifyContent:"center", minWidth:200, minHeight:200, position:"relative" }}>
          <div ref={qrRef}/>
          {!qrReady && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:32, height:32, border:"3px solid #eee", borderTopColor:"#000", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
            </div>
          )}
        </div>
      </div>

      {/* Network badge */}
      <div style={{ textAlign:"center", marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, background:"rgba(96,165,250,.12)", border:"1px solid rgba(96,165,250,.3)", color:"#60a5fa", borderRadius:20, padding:"3px 12px" }}>
          TRC-20 Network Only
        </span>
      </div>

      {/* Address with copy */}
      <div style={{ background:"rgba(255,255,255,.04)", borderRadius:10, padding:"10px 12px", marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", color:"rgba(255,255,255,.3)", marginBottom:6, textTransform:"uppercase" }}>Wallet Address</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:10, wordBreak:"break-all", color:"rgba(255,255,255,.75)", fontFamily:"'JetBrains Mono','Fira Code',monospace", flex:1, lineHeight:1.7 }}>
            {payment.address}
          </div>
          <button onClick={copyAddress} style={{
            flexShrink:0, borderRadius:8, padding:"8px 12px", cursor:"pointer",
            fontSize:12, fontWeight:700, whiteSpace:"nowrap", transition:"all .2s",
            background: copied ? "rgba(34,197,94,.15)" : "rgba(255,215,0,.1)",
            border: `1px solid ${copied ? "rgba(34,197,94,.4)" : "rgba(255,215,0,.3)"}`,
            color: copied ? "#22C55E" : "#FFD700",
          }}>
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
        </div>
      </div>

      {/* Warning */}
      <div style={{ fontSize:11, color:"rgba(239,68,68,.8)", background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.18)", borderRadius:8, padding:"9px 12px", marginBottom:14, lineHeight:1.65, display:"flex", gap:8 }}>
        <span style={{ flexShrink:0 }}>⚠️</span>
        <span>Send <strong>USDT on TRC-20 only</strong>. Sending on wrong network will result in permanent loss of funds.</span>
      </div>

      <a href={payment.paymentUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ width:"100%", justifyContent:"center", display:"flex", marginBottom:8 }}>
        Open NOWPayments Invoice →
      </a>
      <div style={{ fontSize:11, color:"rgba(255,255,255,.22)", textAlign:"center" }}>
        Confirms automatically on payment · No need to refresh
      </div>
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ mt5Login:"", mt5Password:"", mt5Server:"", broker:"Exness" });
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Poll payment status every 8s as fallback (WebSocket may not work in production)
  useEffect(() => {
    if (!payment?.paymentId || payment?.confirmed) return;
    const poll = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
        const token = localStorage.getItem("fc_token") || "";
        const r = await fetch(`${API}/api/payments/${payment.paymentId}/status`, {
          headers: { Authorization: "Bearer " + token }
        });
        const d = await r.json();
        if (d.confirmed || d.status === "confirmed") {
          setPayment((p: any) => ({ ...p, confirmed: true }));
          // Refresh entries
          if (user) entryApi.getMy(id).then(setMyEntries).catch(() => {});
        }
      } catch {}
    };
    poll(); // immediate check
    const iv = setInterval(poll, 8000);
    return () => clearInterval(iv);
  }, [payment?.paymentId, payment?.confirmed]);

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
    setVerifying(true);
    setVerifyResult(null);
    setVerified(false);
    setError("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
      const token = localStorage.getItem("fc_token") || "";
      const r = await fetch(`${API}/api/entries/verify-mt5`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ mt5Login: form.mt5Login, mt5Password: form.mt5Password, mt5Server: form.mt5Server })
      });
      const data = await r.json();
      setVerifyResult(data);
      setVerified(data.valid === true || data.ok === true);
      if (!data.valid && !data.ok && data.error) setError(data.error);
    } catch(e: any) {
      setError("Verification failed — " + e.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const result = await entryApi.create({ tournamentId:id, mt5Login:form.mt5Login, mt5Password:form.mt5Password, mt5Server:form.mt5Server, broker:form.broker.toLowerCase() });
      // entry.payment comes from entryService → createEntryPayment
      // but also trigger /api/payments/create as backup to ensure it's in payments table
      let paymentData = result.payment;
      if (!paymentData?.address && result.entry?.id) {
        try {
          const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";
          const token = localStorage.getItem("fc_token") || "";
          const pr = await fetch(`${API}/api/payments/create`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ entry_id: result.entry.id, tournament_id: id }),
          });
          const pd = await pr.json();
          if (pd.success) {
            paymentData = {
              paymentId: pd.payment_id,
              address: pd.pay_address,
              amount: pd.pay_amount,
              currency: "USDTTRC20",
              paymentUrl: pd.paymentUrl || `https://nowpayments.io/payment?iid=${pd.payment_id}`,
            };
          }
        } catch {}
      }
      setPayment(paymentData);
      setShowJoinForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create entry");
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

  const tierColor = tournament?.tier === "pro" ? "#22C55E" : "#FFD700";
  const tierName  = tournament?.tier === "pro" ? "Pro Bullet" : "Starter Bullet";

  if (!tournament) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:400, background:"#050810" }}>
      <div className="spinner"/>
    </div>
  );

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"36px 40px" }}>
              <style>{`
        @media(max-width:768px){
          .detail-layout{ flex-direction:column !important; }
          .detail-sidebar{ width:100% !important; flex:none !important; }
          .detail-stats{ grid-template-columns:1fr 1fr !important; }
          .detail-timing{ grid-template-columns:1fr 1fr !important; }
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
              <PaymentCard payment={payment}/>
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
                  ["If you win",     "Funded account (90%) or 75% USDT cashout"],
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
                  {[
                    ["MT5 Account Number",         "e.g. 123456789",         "mt5Login",    "text"],
                    ["Master Password","Your master password","mt5Password", "password"],
                    ["MT5 Server",                 "e.g. Exness-MT5Trial15", "mt5Server",   "text"],
                  ].map(([label,ph,field,type]) => (
                    <div key={field}>
                      <label className="input-label">{label}</label>
                      <input className="input" type={type} placeholder={ph}
                        value={(form as any)[field]}
                        onChange={e => setForm(f => ({...f,[field]:e.target.value}))} required/>
                    </div>
                  ))}
                  <div>
                    <label className="input-label">Server IP <span style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>(auto-resolved)</span></label>
                    <div style={{display:"flex",gap:8}}>
                      <input className="input" type="text" placeholder="Click Resolve to auto-fill"
                        value={form.mt5Server||""}
                        onChange={e => setForm(f => ({...f,mt5ServerIp:e.target.value}))}
                        style={{flex:1,color:form.mt5Server&&!form.mt5Server.includes("...")?"#4ade80":"inherit"}}
                        readOnly={false}/>
                      <button type="button"
                        style={{padding:"0 14px",background:"#1a1a2e",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}
                        onClick={async()=>{
                          if(!form.mt5Server){alert("Enter server name first");return;}
                          setForm(f=>({...f,mt5ServerIp:"resolving..."}));
                          try{
                            const API=process.env.NEXT_PUBLIC_API_URL||"https://myfundedtournament-production.up.railway.app";
                            const r=await fetch(API+"/api/entries/resolve-server",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({server:form.mt5Server})});
                            const d=await r.json();
                            setForm(f=>({...f,mt5ServerIp:d.ip||"unknown"}));
                          }catch(e){setForm(f=>({...f,mt5ServerIp:"resolve failed"}));}
                        }}>🔍 Resolve</button>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Broker</label>
                    <select className="input" value={form.broker} onChange={e => setForm(f => ({...f,broker:e.target.value}))}>
                      {BROKERS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.03)", borderRadius:8, padding:"10px 12px" }}>
                    🔒 Master password required — used to verify your account balance and trade history.
                  </div>
                  {/* Verify button — shown before payment */}
                  {!verified && (
                    <button type="button" onClick={verifyMT5}
                      disabled={verifying || !form.mt5Login || !form.mt5Password || !form.mt5Server}
                      className="btn btn-primary" style={{ width:"100%", marginBottom:10 }}>
                      {verifying ? "⏳ Verifying account..." : "🔍 Verify MT5 Account"}
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
                      {Object.entries(verifyResult.checks || {}).map(([key, check]: [string, any]) => (
                        <div key={key} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:5 }}>
                          <span style={{ fontSize:13 }}>{check.pass ? "✅" : "❌"}</span>
                          <span style={{ fontSize:12, color: check.pass ? "rgba(255,255,255,.7)" : "var(--red)", lineHeight:1.4 }}>
                            {check.message}
                          </span>
                        </div>
                      ))}
                      {!verifyResult.ok && (
                        <button type="button" onClick={()=>{setVerifyResult(null);setVerified(false);}}
                          style={{ marginTop:6, fontSize:11, color:"rgba(255,255,255,.4)", background:"none", border:"none", cursor:"pointer", padding:0 }}>
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
                Payment via NOWPayments · Entry fee adds to prize pool
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
