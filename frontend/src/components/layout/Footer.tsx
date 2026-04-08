import Link from "next/link";
import MFTLogo from "@/components/ui/MFTLogo";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "36px 40px", marginTop: 60, background: "var(--bg2)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MFTLogo size={28} />
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 14 }}>
              <span style={{ color: "#fff" }}>MyFunded</span>
              <span style={{ color: "var(--gold)" }}>Tournament</span>
            </div>
            <div className="tagline-shine-wrap">
              <span className="tagline-shine" style={{ fontSize: 9, letterSpacing: ".04em" }}>Compete Demo. Win Real Funding.</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {[["Tournaments","/tournaments"],["Leaderboard","/leaderboard"],["Certificates","/certificates"],["How It Works","/#how-it-works"],["Rules","/#rules"]].map(([l,h])=>(
            <Link key={l} href={h} style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none", transition: ".15s" }}>{l}</Link>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.22)" }}>
          Powered by MetaApi · ForumPay · MT5
        </div>
      </div>
    </footer>
  );
}
