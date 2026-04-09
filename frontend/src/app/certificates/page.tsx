"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import MFTLogo from "@/components/ui/MFTLogo";

interface Certificate {
  id: string;
  place: 1 | 2 | 3;
  tournamentName: string;
  winnerName: string;
  walletId: string;
  profitPct: number;
  profitAbs: number;
  winRate: number;
  totalTrades: number;
  prizeAmount: number;
  prizeDesc: string;
  issueDate: string;
  certId: string;
  broker: string;
}


const PLACE_CONFIG = {
  1: { medal:"🥇", label:"Tournament Champion", headline:"Tournament Champion", typeLabel:"Certificate of Achievement",  color:"#FFD700", border:"rgba(255,215,0,.5)",  bg:"#0c0c0c", stripe:"rgba(255,215,0,.08)",  corner:"rgba(255,215,0,.5)"  },

};

// v2 — real data from API
function CertificateCard({ cert }: { cert: Certificate }) {
  const cfg = PLACE_CONFIG[1];
  return (
    <div style={{ marginBottom: 40 }}>
      {/* Label */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:28, height:28, borderRadius:"50%", background:`${cfg.color}22`, border:`1px solid ${cfg.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{cfg.medal}</div>
        <div style={{ fontFamily:"var(--font-head)", fontSize:12, fontWeight:700, letterSpacing:".16em", textTransform:"uppercase", color:`${cfg.color}cc` }}>
          1st Place Certificate
        </div>
      </div>

      {/* Certificate */}
      <div style={{ background:cfg.bg, borderRadius:14, aspectRatio:"16/9", position:"relative", overflow:"hidden", border:`1px solid rgba(255,255,255,.05)` }}>
        {/* BG glow */}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 70% 50% at 76% 44%,${cfg.color}11 0%,transparent 60%)` }}/>
        {/* Stripe */}
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"36%", background:`linear-gradient(135deg,${cfg.stripe} 0%,transparent 100%)`, borderLeft:`1px solid ${cfg.color}12` }}/>
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"26%", borderLeft:`1px solid ${cfg.color}07` }}/>
        {/* Diagonal lines */}
        <div style={{ position:"absolute", inset:0, background:`repeating-linear-gradient(55deg,transparent,transparent 56px,${cfg.color}15 56px,${cfg.color}15 57px)` }}/>
        {/* Corner frames */}
        {[["top:16px","left:16px","borderTop","borderLeft"],["top:16px","right:16px","borderTop","borderRight"],["bottom:16px","left:16px","borderBottom","borderLeft"],["bottom:16px","right:16px","borderBottom","borderRight"]].map(([t,s,b1,b2],i)=>(
          <div key={i} style={{ position:"absolute", width:28, height:28, [t.split(":")[0]]:16, [s.split(":")[0]]:16, [b1.split("border")[1].toLowerCase()+"Border" as any]:`1.5px solid ${cfg.corner}`, [b2.split("border")[1].toLowerCase()+"Border" as any]:`1.5px solid ${cfg.corner}` } as any}/>
        ))}

        {/* Content */}
        <div style={{ position:"absolute", inset:0, padding:"20px 24px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
          {/* Top row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="10" fill={`${cfg.color}20`}/>
                <g transform="translate(8,8)">
                  <polygon points="24,3 26.8,9.2 33.5,9.2 28.3,13.2 30.5,19.5 24,15.6 17.5,19.5 19.7,13.2 14.5,9.2 21.2,9.2" fill={cfg.color}/>
                  <rect x="6" y="22" width="5.5" height="15" rx="1.2" fill={cfg.color}/>
                  <rect x="13.5" y="18" width="5.5" height="22" rx="1.2" fill="#22C55E"/>
                  <rect x="21" y="25" width="5.5" height="11" rx="1.2" fill={cfg.color}/>
                  <rect x="28.5" y="20" width="5.5" height="19" rx="1.2" fill="#22C55E"/>
                  <rect x="36" y="27" width="5.5" height="10" rx="1.2" fill={cfg.color}/>
                  <rect x="9" y="43" width="30" height="4.5" rx="2.2" fill={cfg.color} opacity="0.9"/>
                </g>
              </svg>
              <span style={{ fontFamily:"var(--font-head)", fontWeight:900, fontSize:12 }}>
                <span style={{ color:"#fff" }}>MyFunded</span>
                <span style={{ color:cfg.color }}>Tournament</span>
              </span>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:8, fontWeight:600, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.35)" }}>{cfg.label}</div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:22, fontWeight:900, color:cfg.color, lineHeight:1.1 }}>
                1
                <span style={{ fontSize:13 }}>ST</span>
              </div>
            </div>
          </div>

          {/* Middle */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flex:1, padding:"10px 0 6px" }}>
            <div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:8, fontWeight:600, letterSpacing:".2em", textTransform:"uppercase", color:`${cfg.color}99`, marginBottom:5 }}>{cfg.typeLabel}</div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:20, fontWeight:900, color:"#fff", textTransform:"uppercase", lineHeight:1.05, marginBottom:10 }}>{cfg.headline}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.38)", marginBottom:3 }}>Proudly presented to:</div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:16, fontWeight:900, color:cfg.color, letterSpacing:"-.2px", marginBottom:2 }}>{cert.winnerName}</div>
              <div style={{ fontSize:9, fontFamily:"var(--font-mono)", color:"rgba(255,255,255,.3)", marginBottom:8 }}>{cert.walletId} · {cert.tournamentName}</div>
              <div style={{ display:"flex", gap:12 }}>
                {[["% Gain", `${cert.profitPct >= 0 ? "+" : ""}${cert.profitPct}%`, "#22C55E"],[`Profit`, `$${cert.profitAbs.toLocaleString()}`, cfg.color],["Win Rate", `${cert.winRate}%`, "rgba(255,255,255,.7)"],["Total Trades", `${cert.totalTrades}`, "rgba(255,255,255,.7)"]].map(([l,v,c])=>(
                  <div key={l as string}>
                    <div style={{ fontFamily:"var(--font-head)", fontSize:11, fontWeight:700, color:c as string }}>{v}</div>
                    <div style={{ fontSize:7.5, textTransform:"uppercase", letterSpacing:".09em", color:"rgba(255,255,255,.3)" }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:8, color:"rgba(255,255,255,.32)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:2 }}>Prize Award</div>
                <div style={{ fontFamily:"var(--font-head)", fontSize:36, fontWeight:900, color:cfg.color, letterSpacing:"-1.2px", lineHeight:1 }}>
                  {cert.place === 1 ? `$${cert.prizeAmount.toLocaleString()}` : `$${cert.prizeAmount}`}
                </div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.38)", textAlign:"right", lineHeight:1.4, marginTop:3 }}>{cert.prizeDesc}</div>
              </div>
              {/* QR placeholder */}
              <div style={{ width:50, height:50, background:"#fff", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:40, height:40, background:"repeating-linear-gradient(0deg,#000 0px,#000 2px,#fff 2px,#fff 5px),repeating-linear-gradient(90deg,#000 0px,#000 2px,#fff 2px,#fff 5px)", borderRadius:2 }}/>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", paddingBottom:18 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.55)" }}>{cert.issueDate}</div>
              <div style={{ fontSize:8, textTransform:"uppercase", letterSpacing:".08em", color:"rgba(255,255,255,.28)" }}>Issue Date</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1, opacity:.5 }}>
              <div style={{ width:90, height:1, background:`${cfg.color}60`, marginBottom:3 }}/>
              <div style={{ fontFamily:"var(--font-body)", fontStyle:"italic", fontSize:11, color:"rgba(255,255,255,.8)" }}>MFT Admin</div>
              <div style={{ fontSize:7.5, textTransform:"uppercase", letterSpacing:".09em", color:"rgba(255,255,255,.3)" }}>Platform Director</div>
            </div>
            <div style={{ fontSize:8, color:"rgba(255,255,255,.22)", textAlign:"right", lineHeight:1.5, fontFamily:"var(--font-mono)" }}>
              Verified · cert.mft.io<br/>{cert.certId}
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:20, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", borderTop:"1px solid rgba(255,255,255,.05)" }}>
          <span style={{ fontSize:7.5, color:"rgba(255,255,255,.18)", letterSpacing:".07em", fontFamily:"var(--font-mono)" }}>CERTIFICATE ID: {cert.certId} · {cert.tournamentName.toUpperCase()}</span>
          <span style={{ fontSize:7.5, color:"rgba(255,255,255,.18)", letterSpacing:".07em", fontFamily:"var(--font-mono)" }}>CERT.MFT.IO</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <button className="btn btn-primary btn-sm" style={{ flex:1, justifyContent:"center" }}>Download PDF</button>
        <button className="btn btn-secondary btn-sm" style={{ flex:1, justifyContent:"center" }}>Download Image</button>
        <button className="btn btn-ghost btn-sm" style={{ flex:.5, justifyContent:"center" }}>Share</button>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const [tournamentId, setTournamentId] = useState<string|null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTournamentId(params.get("t"));
  }, []);

  const [certs, setCerts]         = useState<Certificate[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [filter, setFilter]       = useState<"all"|"1"|"2"|"3">("all");

  const API = process.env.NEXT_PUBLIC_API_URL || "https://myfundedtournament-production.up.railway.app";

  useEffect(() => {
    if (!tournamentId) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API}/api/tournaments/${tournamentId}/certificates`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCerts(d.data || []);
          setTournament(d.tournament);
        } else {
          setError(d.error || "Failed to load certificates");
        }
      })
      .catch(() => setError("Failed to load certificates"))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const filtered = filter === "all" ? certs : certs.filter(c => String(c.place) === filter);

  return (
    <div className="page" style={{ maxWidth:900 }}>
      <style>{`
        .cert-filters{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:32px;}
        .cert-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:24px;}
        @media(max-width:768px){
          .cert-filters button{font-size:12px !important;padding:6px 12px !important;}
          .cert-grid{grid-template-columns:1fr;}
        }
      `}</style>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:52 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:16 }}>
          <MFTLogo size={40}/>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontFamily:"var(--font-head)", fontSize:22, fontWeight:700, color:"#fff", letterSpacing:".04em" }}>
              MyFunded<span style={{ color:"var(--gold)" }}>Tournament</span>
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", letterSpacing:".2em", textTransform:"uppercase", marginTop:2 }}>Winner Certificates</div>
          </div>
        </div>
        <div style={{ width:80, height:1, background:"linear-gradient(90deg,transparent,rgba(255,215,0,.4),transparent)", margin:"0 auto 16px" }}/>
        {tournament && (
          <div style={{ fontSize:16, fontWeight:700, color:"#FFD700", marginBottom:6 }}>{tournament.name}</div>
        )}
        <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:500, margin:"0 auto" }}>
          Official certificate of achievement for the tournament champion.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:36, justifyContent:"center" }}>
        {([["All","all"],["1st Place","1"]] as [string,string][]).map(([l,v])=>(
          <button key={v} onClick={() => setFilter(v as any)}
            className={`btn btn-sm ${filter===v?"btn-primary":"btn-ghost"}`}>{l}</button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.3)" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          <div style={{ fontSize:14 }}>Loading certificates...</div>
        </div>
      )}

      {/* No tournament ID */}
      {!loading && !tournamentId && (
        <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.3)" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🏆</div>
          <div style={{ fontSize:18, fontWeight:700, color:"rgba(255,255,255,.6)", marginBottom:8 }}>No tournament selected</div>
          <p style={{ fontSize:14, marginBottom:24 }}>Browse ended tournaments to view their certificates.</p>
          <Link href="/tournaments" className="btn btn-primary">Browse Tournaments →</Link>
        </div>
      )}

      {/* Tournament not ended */}
      {!loading && tournament && tournament.status !== "ended" && (
        <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.3)" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⏱</div>
          <div style={{ fontSize:18, fontWeight:700, color:"rgba(255,255,255,.6)", marginBottom:8 }}>Battle still in progress</div>
          <p style={{ fontSize:14 }}>Certificates are issued when the tournament ends.</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#EF4444" }}>{error}</div>
      )}

      {/* No finishers */}
      {!loading && !error && tournament?.status === "ended" && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.3)" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🏅</div>
          <div style={{ fontSize:18, fontWeight:700, color:"rgba(255,255,255,.6)", marginBottom:8 }}>No certificates for this filter</div>
        </div>
      )}

      {/* Real certificates */}
      {!loading && filtered.map(cert => (
        <CertificateCard key={cert.id} cert={cert} />
      ))}

      {/* Info section */}
      {!loading && (
        <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid var(--border)", borderRadius:14, padding:24, marginTop:20 }}>
          <div style={{ fontFamily:"var(--font-head)", fontSize:15, fontWeight:700, marginBottom:12 }}>About MFT Certificates</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
            {[["🥇 1st Place","Real funded trading account worth 90% of the prize pool. Zero evaluation — trade live immediately.","var(--gold)"],
].map(([t,d,c])=>(
              <div key={t as string}>
                <div style={{ fontSize:13, fontWeight:700, color:c as string, marginBottom:6 }}>{t}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
