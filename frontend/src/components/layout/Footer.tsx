import Link from "next/link";
import MFTLogo from "@/components/ui/MFTLogo";

const NAV = [
  ["Tournaments",   "/tournaments"],
  ["Leaderboard",   "/leaderboard"],
  ["Certificates",  "/certificates"],
  ["How It Works",  "/#how-it-works"],
  ["Earn",          "/earn"],
  ["Rules",         "/#rules"],
];

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "var(--bg2)", marginTop: 60 }}>
      <style>{`
        .ft-wrap {
          max-width: 1280px;
          margin: 0 auto;
          padding: 36px 40px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 24px;
        }
        .ft-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 28px;
          justify-content: center;
        }
        .ft-copy {
          font-size: 12px;
          color: rgba(255,255,255,.22);
          text-align: right;
          white-space: nowrap;
        }
        @media (max-width: 768px) {
          .ft-wrap {
            grid-template-columns: 1fr;
            padding: 28px 20px;
            gap: 20px;
            text-align: center;
          }
          .ft-brand { justify-content: center; }
          .ft-nav { justify-content: center; gap: 8px 20px; }
          .ft-copy { text-align: center; white-space: normal; }
        }
        @media (max-width: 480px) {
          .ft-wrap { padding: 24px 16px; gap: 16px; }
          .ft-nav { gap: 8px 16px; }
        }
      `}</style>
      <div className="ft-wrap">
        {/* Brand */}
        <div className="ft-brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MFTLogo size={28} />
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 14 }}>
              <span style={{ color: "#fff" }}>MyFunded</span>
              <span style={{ color: "var(--gold)" }}>Tournament</span>
            </div>
            <div className="tagline-shine-wrap">
              <span className="tagline-shine" style={{ fontSize: 9, letterSpacing: ".04em" }}>
                Compete Demo. Win Real Funding.
              </span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="ft-nav">
          {NAV.map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Powered by */}
        <div className="ft-copy">
          Powered by MetaApi · ForumPay · MT5
        </div>
      </div>
    </footer>
  );
}
