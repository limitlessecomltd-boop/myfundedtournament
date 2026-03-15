"use client";
import Link from "next/link";

const TIERS = [
  { name:"Hours Bullet", fee:"$20 USDT", color:"#60a5fa", bg:"rgba(96,165,250,.06)", border:"rgba(96,165,250,.2)", duration:"Fast 4 Hours duration", balance:"$1,000 demo balance",
    features:["Up to 10 re-entries per tournament","Track total collection live in dashboard","Winner gets 90% of fee collections","2nd place: 3× fee returned","3rd place: 2× fee returned","Tournament starts with minimum 20 entries"] },
  { name:"Daily Pill", fee:"$50 USDT", color:"#FFD700", bg:"rgba(255,215,0,.07)", border:"rgba(255,215,0,.25)", duration:"24 Hours duration", balance:"$1,000 demo balance", featured:true,
    features:["Up to 10 re-entries per tournament","Track total collection live in dashboard","Winner gets 90% of fee collections","2nd place: 3× fee returned","3rd place: 2× fee returned","Tournament starts with minimum 20 entries"] },
  { name:"Weekly Marathon", fee:"$100 USDT", color:"#22C55E", bg:"rgba(34,197,94,.06)", border:"rgba(34,197,94,.2)", duration:"5 trading days (Mon–Fri)", balance:"$1,000 demo balance",
    features:["Up to 10 re-entries per tournament","Track total collection live in dashboard","Winner gets 90% of fee collections","2nd place: 3× fee returned","3rd place: 2× fee returned","Tournament starts with minimum 20 entries"] },
];
const PRIZES = [
  { place:"1st", medal:"🥇", color:"#FFD700", bg:"rgba(255,215,0,.06)", border:"rgba(255,215,0,.2)", label:"Tournament Champion", reward:"Funded Account", detail:"90% of total prize pool", cert:"Gold Certificate issued on-chain", featured:true },
  { place:"2nd", medal:"🥈", color:"#b4c0d8", bg:"rgba(180,192,216,.04)", border:"rgba(180,192,216,.15)", label:"Runner Up", reward:"3× Entry Fee", detail:"Cash returned in USDT", cert:"Silver Certificate issued on-chain" },
  { place:"3rd", medal:"🥉", color:"#CD7F32", bg:"rgba(205,127,50,.04)", border:"rgba(205,127,50,.15)", label:"Top Finisher", reward:"2× Entry Fee", detail:"Cash returned in USDT", cert:"Bronze Certificate issued on-chain" },
];
const STEPS = [
  { n:"01", title:"Register & pay entry", desc:"Pay USDT via crypto link or wallet. Works from Binance or any exchange — no personal wallet needed.", icon:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" },
  { n:"02", title:"Open your MT5 demo", desc:"Create a free demo at Exness, ICMarkets or Tickmill. Submit your investor (read-only) password.", icon:"M22 12h-4l-3 9L9 3l-3 9H2" },
  { n:"03", title:"Trade Actively till End", desc:"We track your % gain live via MetaApi every 60 seconds. Your leaderboard rank updates in real time.", icon:"M18 20V10M12 20V4M6 20v-6" },
  { n:"04", title:"Win your funded account", desc:"Highest % gain wins 90% of the prize pool as a real funded account. 2nd gets 3× fee, 3rd gets 2× fee.", icon:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
];
const RULES = [
  { title:"Min 31s per trade", desc:"Trades closed in under 31 seconds are excluded from your score — not a disqualification.", color:"#FFD700" },
  { title:"No hedging", desc:"Simultaneous buy and sell on the same pair are excluded from score.", color:"#60a5fa" },
  { title:"No external deposit", desc:"Adding funds to your demo after tournament start = instant disqualification.", color:"#EF4444" },
  { title:"Account locked at start", desc:"Your MT5 credentials are locked at tournament start. No changes possible.", color:"#22C55E" },
];
const COMPARISON = [
  { feature:"Min. Cost",           mft:"$20",            ftmo:"$155+",        broker:"$10+",      mftGood:true },
  { feature:"Evaluation Required", mft:"❌ None",         ftmo:"✅ Mandatory", broker:"N/A",       mftGood:true },
  { feature:"Payout Denial",       mft:"❌ Never",        ftmo:"⚠️ Possible",  broker:"⚠️ Possible", mftGood:true },
  { feature:"Demo Account Risk",   mft:"✅ Zero",         ftmo:"❌ Real eval",  broker:"❌ Real money", mftGood:true },
  { feature:"Re-entries",          mft:"✅ Up to 10",     ftmo:"❌ No re-entry in same eval", broker:"N/A", mftGood:true },
  { feature:"Prize Transparency",  mft:"✅ 100% live",    ftmo:"❌ Fixed",      broker:"❌ Spread-based", mftGood:true },
  { feature:"Time to First Payout",mft:"Hours / Days",   ftmo:"14 / 30 days", broker:"Varies",    mftGood:true },
  { feature:"Profit Share",        mft:"90%",            ftmo:"80–90%",       broker:"100% (high risk)", mftGood:true },
  { feature:"Beginner-Friendly",   mft:"✅ Yes",          ftmo:"❌ Hard",       broker:"⚠️ Risky",  mftGood:true },
];
const FAQS = [
  { q:"What is MyFundedTournament?", a:"MyFundedTournament is a forex trading competition platform where traders pay a small USDT entry fee to compete on MT5 demo accounts. The trader with the highest % gain wins a real funded trading account — no evaluation, no minimum balance required." },
  { q:"Do I need a real trading account?", a:"No. You open a free MT5 demo account at Exness, ICMarkets, or Tickmill. You only submit your investor (read-only) password — we never touch your funds." },
  { q:"How is the winner decided?", a:"The trader with the highest percentage gain on their starting demo balance wins. It is purely performance-based — the best trader wins, period." },
  { q:"How do I pay the entry fee?", a:"Entry fees are paid in USDT (TRC-20) via NOWPayments. You can pay directly from Binance, any crypto exchange, or your wallet — no personal wallet setup required." },
  { q:"What happens to the entry fees?", a:"All entry fees go into the prize pool. 90% goes to 1st place (funded account), 3x fee to 2nd place, 2x fee to 3rd place. The platform takes 10% to cover operations." },
  { q:"Can I enter multiple times?", a:"Yes! You can re-enter up to 10 times per tournament, each with a fresh MT5 demo account. Each re-entry is a new chance to win." },
  { q:"When does a tournament start?", a:"Tournaments start automatically once a minimum of 20 entries are collected. This ensures a fair competitive prize pool for all participants." },
  { q:"How do I receive my winnings?", a:"Winners receive a real funded trading account (1st place) or USDT sent directly to their wallet (2nd and 3rd place). Payouts are processed within 24-48 hours of tournament end." },
  { q:"Is my MT5 password safe?", a:"We only require your investor (read-only) password, which grants zero ability to place trades or withdraw funds. Your account is completely safe." },
  { q:"What brokers are supported?", a:"Currently Exness, ICMarkets, and Tickmill. All three offer free MT5 demo accounts you can open in minutes with no deposit required." },
];

// ── Mascot SVG (approved v2) ──────────────────────────────────────────────
function MFTMascot() {
  return (
    <svg viewBox="0 0 780 900" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", maxWidth:680, display:"block" }}>
      <defs>
        <radialGradient id="mbgG" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#0d1a0a"/>
          <stop offset="100%" stopColor="#050810"/>
        </radialGradient>
        <radialGradient id="mglowG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.14"/>
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="mtrophyShine" cx="35%" cy="25%" r="55%">
          <stop offset="0%" stopColor="#fff9c4"/>
          <stop offset="60%" stopColor="#FFD700"/>
          <stop offset="100%" stopColor="#b8860b"/>
        </radialGradient>
      </defs>
      <rect width="780" height="900" fill="url(#mbgG)"/>
      {/* Glow */}
      <ellipse cx="390" cy="430" rx="185" ry="185" fill="url(#mglowG)"/>
      <circle cx="390" cy="430" r="170" fill="none" stroke="#FFD700" strokeWidth="0.8" strokeOpacity="0.18"/>
      <circle cx="390" cy="430" r="195" fill="none" stroke="#22C55E" strokeWidth="0.5" strokeOpacity="0.1"/>
      <circle cx="390" cy="430" r="220" fill="none" stroke="#FFD700" strokeWidth="0.3" strokeOpacity="0.06"/>
      {/* LEFT MONITOR */}
      <rect x="18" y="220" width="220" height="268" rx="10" fill="#0f1520" stroke="#FFD700" strokeWidth="1.5" strokeOpacity="0.5"/>
      <rect x="26" y="228" width="204" height="252" rx="6" fill="#070d18"/>
      <text x="38" y="248" fontFamily="Arial,sans-serif" fontSize="8" fill="#FFD700" fontWeight="700" letterSpacing="1">LIVE LEADERBOARD</text>
      <line x1="38" y1="252" x2="222" y2="252" stroke="#FFD700" strokeWidth="0.5" strokeOpacity="0.4"/>
      <rect x="38" y="256" width="192" height="18" rx="3" fill="#FFD700" fillOpacity="0.08"/>
      <text x="44" y="268" fontFamily="Arial,sans-serif" fontSize="8" fill="#FFD700">🥇 #1  TraderX_99</text>
      <text x="222" y="268" fontFamily="Arial,sans-serif" fontSize="8" fill="#22C55E" textAnchor="end">+24.8%</text>
      <text x="44" y="290" fontFamily="Arial,sans-serif" fontSize="8" fill="#b4c0d8">🥈 #2  FXMaster</text>
      <text x="222" y="290" fontFamily="Arial,sans-serif" fontSize="8" fill="#22C55E" textAnchor="end">+18.3%</text>
      <text x="44" y="308" fontFamily="Arial,sans-serif" fontSize="8" fill="#b4c0d8">🥉 #3  PipHunter</text>
      <text x="222" y="308" fontFamily="Arial,sans-serif" fontSize="8" fill="#22C55E" textAnchor="end">+14.1%</text>
      <text x="44" y="326" fontFamily="Arial,sans-serif" fontSize="8" fill="#64748b">    #4  AlgoKing</text>
      <text x="222" y="326" fontFamily="Arial,sans-serif" fontSize="8" fill="#64748b" textAnchor="end">+11.6%</text>
      <text x="222" y="368" fontFamily="Arial,sans-serif" fontSize="9" fill="#FFD700" fontWeight="700" textAnchor="end">$14,850</text>
      <text x="38" y="368" fontFamily="Arial,sans-serif" fontSize="7" fill="#64748b">PRIZE POOL</text>
      <polyline points="38,440 58,425 75,432 95,408 115,418 138,395 158,405 178,385 200,392 222,375" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="222" cy="375" r="3.5" fill="#22C55E"/>
      {/* RIGHT MONITOR */}
      <rect x="542" y="220" width="220" height="268" rx="10" fill="#0f1520" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.5"/>
      <rect x="550" y="228" width="204" height="252" rx="6" fill="#070d18"/>
      <text x="562" y="248" fontFamily="Arial,sans-serif" fontSize="8" fill="#22C55E" fontWeight="700" letterSpacing="1">TOURNAMENT STATS</text>
      <line x1="562" y1="252" x2="746" y2="252" stroke="#22C55E" strokeWidth="0.5" strokeOpacity="0.4"/>
      <text x="562" y="268" fontFamily="Arial,sans-serif" fontSize="7.5" fill="#64748b">TOTAL ENTRIES</text>
      <text x="744" y="268" fontFamily="Arial,sans-serif" fontSize="9" fill="#fff" fontWeight="700" textAnchor="end">247</text>
      <text x="562" y="285" fontFamily="Arial,sans-serif" fontSize="7.5" fill="#64748b">PRIZE POOL</text>
      <text x="744" y="285" fontFamily="Arial,sans-serif" fontSize="9" fill="#FFD700" fontWeight="700" textAnchor="end">$12,350</text>
      <text x="562" y="302" fontFamily="Arial,sans-serif" fontSize="7.5" fill="#64748b">TIME REMAINING</text>
      <text x="744" y="302" fontFamily="Arial,sans-serif" fontSize="9" fill="#22C55E" fontWeight="700" textAnchor="end">02:14:38</text>
      <text x="562" y="319" fontFamily="Arial,sans-serif" fontSize="7.5" fill="#64748b">YOUR RANK</text>
      <text x="744" y="319" fontFamily="Arial,sans-serif" fontSize="9" fill="#FFD700" fontWeight="700" textAnchor="end">#1</text>
      <text x="562" y="336" fontFamily="Arial,sans-serif" fontSize="7.5" fill="#64748b">YOUR GAIN</text>
      <text x="744" y="336" fontFamily="Arial,sans-serif" fontSize="9" fill="#22C55E" fontWeight="700" textAnchor="end">+24.8%</text>
      <rect x="568" y="375" width="6" height="30" rx="1" fill="#22C55E" fillOpacity="0.9"/>
      <rect x="582" y="368" width="6" height="22" rx="1" fill="#22C55E" fillOpacity="0.9"/>
      <rect x="596" y="380" width="6" height="18" rx="1" fill="#EF4444" fillOpacity="0.9"/>
      <rect x="610" y="360" width="6" height="28" rx="1" fill="#22C55E" fillOpacity="0.9"/>
      <rect x="624" y="352" width="6" height="24" rx="1" fill="#22C55E" fillOpacity="0.9"/>
      <rect x="638" y="365" width="6" height="16" rx="1" fill="#EF4444" fillOpacity="0.9"/>
      <rect x="652" y="345" width="6" height="26" rx="1" fill="#22C55E" fillOpacity="0.9"/>
      <rect x="666" y="335" width="6" height="22" rx="1" fill="#22C55E" fillOpacity="0.9"/>
      <rect x="694" y="325" width="6" height="24" rx="1" fill="#22C55E" fillOpacity="0.9"/>
      <rect x="708" y="318" width="6" height="20" rx="1" fill="#22C55E" fillOpacity="0.9"/>
      {/* TROPHY */}
      <rect x="334" y="800" width="112" height="12" rx="4" fill="#b8860b"/>
      <rect x="346" y="788" width="88" height="14" rx="3" fill="#DAA520"/>
      <rect x="375" y="748" width="30" height="44" rx="3" fill="url(#mtrophyShine)"/>
      <rect x="360" y="744" width="60" height="10" rx="4" fill="#DAA520"/>
      <path d="M316 660 Q314 700 335 730 Q355 748 390 750 Q425 748 445 730 Q466 700 464 660 Z" fill="url(#mtrophyShine)"/>
      <ellipse cx="390" cy="660" rx="74" ry="18" fill="#fff9c4"/>
      <ellipse cx="390" cy="660" rx="68" ry="14" fill="#FFD700"/>
      <path d="M316 660 Q292 665 288 690 Q286 710 308 718 Q322 722 335 718" fill="none" stroke="#DAA520" strokeWidth="8" strokeLinecap="round"/>
      <path d="M464 660 Q488 665 492 690 Q494 710 472 718 Q458 722 445 718" fill="none" stroke="#DAA520" strokeWidth="8" strokeLinecap="round"/>
      <text x="390" y="710" fontFamily="Arial Black,sans-serif" fontSize="26" fontWeight="900" fill="#b8860b" textAnchor="middle" fillOpacity="0.6">#1</text>
      <line x1="350" y1="675" x2="345" y2="720" stroke="white" strokeWidth="2" strokeOpacity="0.25" strokeLinecap="round"/>
      {/* BODY */}
      <path d="M285 460 Q248 478 238 548 L225 730 Q228 748 248 748 L532 748 Q552 748 555 730 L542 548 Q532 478 495 460 L450 445 Q418 500 390 500 Q362 500 330 445 Z" fill="#0d1219" stroke="#FFD700" strokeWidth="1.2" strokeOpacity="0.55"/>
      <path d="M348 445 Q390 512 432 445" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeOpacity="0.8"/>
      <path d="M285 460 Q242 474 222 522 Q210 552 226 572 Q242 587 264 576 Q280 566 295 540 L306 500 Z" fill="#111827" stroke="#FFD700" strokeWidth="0.8" strokeOpacity="0.35"/>
      <path d="M245 478 Q232 506 230 534" fill="none" stroke="#22C55E" strokeWidth="5" strokeOpacity="0.65" strokeLinecap="round"/>
      <path d="M495 460 Q538 474 558 522 Q570 552 554 572 Q538 587 516 576 Q500 566 485 540 L474 500 Z" fill="#111827" stroke="#FFD700" strokeWidth="0.8" strokeOpacity="0.35"/>
      <path d="M535 478 Q548 506 550 534" fill="none" stroke="#22C55E" strokeWidth="5" strokeOpacity="0.65" strokeLinecap="round"/>
      {/* MFT SHIRT LOGO */}
      <rect x="312" y="530" width="156" height="60" rx="7" fill="#FFD700" fillOpacity="0.09" stroke="#FFD700" strokeWidth="1.2" strokeOpacity="0.5"/>
      <text x="335" y="554" fontFamily="Arial Black,sans-serif" fontSize="15" fontWeight="900" fill="#FFD700" letterSpacing="2.5">MFT</text>
      <text x="335" y="569" fontFamily="Arial,sans-serif" fontSize="8.5" fill="#FFD700" fillOpacity="0.82" letterSpacing="0.6">MyFundedTournament</text>
      <text x="335" y="580" fontFamily="Arial,sans-serif" fontSize="7" fill="#22C55E" fillOpacity="0.75">Compete Demo. Win Real Funding.</text>
      <polyline points="436,549 445,538 454,545 463,530 472,537" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeOpacity="0.7" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="472" cy="537" r="2.5" fill="#22C55E" fillOpacity="0.85"/>
      {/* PANTS */}
      <path d="M225 730 L262 820 L332 820 L362 730 Z" fill="#0a0d14" stroke="#1f2937" strokeWidth="0.8"/>
      <path d="M555 730 L518 820 L448 820 L418 730 Z" fill="#0a0d14" stroke="#1f2937" strokeWidth="0.8"/>
      {/* NECK */}
      <rect x="364" y="408" width="52" height="55" rx="10" fill="#c8a882"/>
      {/* HEAD */}
      <ellipse cx="390" cy="335" rx="84" ry="92" fill="#c8a882"/>
      <path d="M310 312 Q313 250 356 228 Q390 215 424 228 Q467 250 470 312 Q452 278 420 270 Q390 264 360 270 Q328 278 310 312 Z" fill="#1a0e05"/>
      <ellipse cx="308" cy="340" rx="15" ry="19" fill="#b8956e"/>
      <ellipse cx="472" cy="340" rx="15" ry="19" fill="#b8956e"/>
      {/* HEADSET */}
      <path d="M296 295 Q310 240 390 232 Q470 240 484 295" fill="none" stroke="#1a1f2e" strokeWidth="10" strokeLinecap="round"/>
      <path d="M296 295 Q310 240 390 232 Q470 240 484 295" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6"/>
      <ellipse cx="293" cy="305" rx="22" ry="26" fill="#111827" stroke="#FFD700" strokeWidth="1.5" strokeOpacity="0.7"/>
      <ellipse cx="293" cy="305" rx="14" ry="17" fill="#0d1219"/>
      <circle cx="293" cy="305" r="3" fill="#22C55E" fillOpacity="0.6"/>
      <ellipse cx="487" cy="305" rx="22" ry="26" fill="#111827" stroke="#FFD700" strokeWidth="1.5" strokeOpacity="0.7"/>
      <ellipse cx="487" cy="305" rx="14" ry="17" fill="#0d1219"/>
      <circle cx="487" cy="305" r="3" fill="#22C55E" fillOpacity="0.6"/>
      <path d="M508 320 Q530 330 540 350 Q548 368 538 378" fill="none" stroke="#1a1f2e" strokeWidth="5" strokeLinecap="round"/>
      <path d="M508 320 Q530 330 540 350 Q548 368 538 378" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
      <ellipse cx="536" cy="382" rx="10" ry="7" fill="#111827" stroke="#FFD700" strokeWidth="1.2" strokeOpacity="0.6"/>
      {/* EYES */}
      <ellipse cx="358" cy="334" rx="13" ry="12" fill="white"/>
      <ellipse cx="422" cy="334" rx="13" ry="12" fill="white"/>
      <ellipse cx="360" cy="336" rx="8" ry="9" fill="#1a0900"/>
      <ellipse cx="424" cy="336" rx="8" ry="9" fill="#1a0900"/>
      <circle cx="363" cy="332" r="2.8" fill="white"/>
      <circle cx="427" cy="332" r="2.8" fill="white"/>
      <path d="M345 318 Q358 311 372 316" fill="none" stroke="#1a0e05" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M408 316 Q422 311 435 318" fill="none" stroke="#1a0e05" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M386 348 Q390 358 394 348" fill="none" stroke="#a07050" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M368 368 Q390 385 412 368" fill="none" stroke="#7B3F00" strokeWidth="2.2" strokeLinecap="round"/>
      <ellipse cx="338" cy="356" rx="13" ry="9" fill="#e07050" fillOpacity="0.18"/>
      <ellipse cx="442" cy="356" rx="13" ry="9" fill="#e07050" fillOpacity="0.18"/>
      {/* RIGHT ARM + TABLET */}
      <path d="M554 572 Q580 585 592 618 Q598 642 586 658 Q572 670 555 662 L536 626 Z" fill="#111827"/>
      <path d="M586 658 Q595 680 594 708 Q593 728 578 738 L560 722 Q562 700 555 662 Z" fill="#c8a882"/>
      <ellipse cx="580" cy="742" rx="20" ry="14" fill="#c8a882"/>
      <rect x="591" y="634" width="78" height="116" rx="7" fill="#0d1219" stroke="#FFD700" strokeWidth="1.8" strokeOpacity="0.7"/>
      <rect x="597" y="641" width="66" height="102" rx="4" fill="#070d18"/>
      <text x="604" y="655" fontFamily="Arial,sans-serif" fontSize="6.5" fill="#FFD700" letterSpacing="0.5">LIVE RANK</text>
      <text x="630" y="673" fontFamily="Arial Black,sans-serif" fontSize="18" fontWeight="900" fill="#22C55E" textAnchor="middle">+24.8%</text>
      <text x="630" y="685" fontFamily="Arial,sans-serif" fontSize="7" fill="#FFD700" textAnchor="middle">RANK #1</text>
      <polyline points="602,730 611,718 620,724 630,710 640,716 650,703 659,708" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="659" cy="708" r="3" fill="#22C55E"/>
      {/* LEFT ARM */}
      <path d="M222 572 Q198 585 186 614 Q180 636 192 650 Q207 662 224 654 L242 620 Z" fill="#111827"/>
      <path d="M186 650 Q178 670 180 694 Q182 714 196 722 L212 706 Q210 686 224 654 Z" fill="#c8a882"/>
      <ellipse cx="188" cy="726" rx="18" ry="14" fill="#c8a882"/>
      <path d="M178 718 Q172 708 176 700 Q182 694 188 698 Q192 702 190 710 L182 718 Z" fill="#c8a882"/>
      {/* BADGES */}
      <rect x="55" y="530" width="96" height="56" rx="10" fill="#050810" stroke="#22C55E" strokeWidth="1.5"/>
      <text x="103" y="553" fontFamily="Arial Black,sans-serif" fontSize="20" fontWeight="900" fill="#22C55E" textAnchor="middle">90%</text>
      <text x="103" y="568" fontFamily="Arial,sans-serif" fontSize="8" fill="#22C55E" fillOpacity="0.7" textAnchor="middle">Winner Prize</text>
      <rect x="630" y="500" width="96" height="56" rx="10" fill="#050810" stroke="#FFD700" strokeWidth="1.5"/>
      <text x="678" y="523" fontFamily="Arial Black,sans-serif" fontSize="20" fontWeight="900" fill="#FFD700" textAnchor="middle">$20</text>
      <text x="678" y="538" fontFamily="Arial,sans-serif" fontSize="8" fill="#FFD700" fillOpacity="0.7" textAnchor="middle">Start from</text>
      <rect x="60" y="618" width="100" height="56" rx="10" fill="#050810" stroke="#60a5fa" strokeWidth="1.5"/>
      <text x="110" y="641" fontFamily="Arial Black,sans-serif" fontSize="17" fontWeight="900" fill="#60a5fa" textAnchor="middle">0 Denial</text>
      <text x="110" y="656" fontFamily="Arial,sans-serif" fontSize="7.5" fill="#60a5fa" fillOpacity="0.7" textAnchor="middle">Payout Policy</text>
      <rect x="620" y="588" width="100" height="56" rx="10" fill="#050810" stroke="#FFD700" strokeWidth="1.5"/>
      <circle cx="640" cy="612" r="4.5" fill="#22C55E" fillOpacity="0.9"/>
      <text x="670" y="608" fontFamily="Arial Black,sans-serif" fontSize="13" fontWeight="900" fill="#FFD700" textAnchor="middle">LIVE</text>
      <text x="670" y="622" fontFamily="Arial,sans-serif" fontSize="7.5" fill="#FFD700" fillOpacity="0.7" textAnchor="middle">Tracking</text>
      {/* NAME PLATE */}
      <rect x="290" y="850" width="200" height="38" rx="10" fill="#FFD700" fillOpacity="0.08" stroke="#FFD700" strokeWidth="1.2" strokeOpacity="0.5"/>
      <text x="390" y="867" fontFamily="Arial Black,sans-serif" fontSize="12" fontWeight="900" fill="#FFD700" textAnchor="middle" letterSpacing="1.5">MFT CHAMPION</text>
      <text x="390" y="881" fontFamily="Arial,sans-serif" fontSize="8" fill="#22C55E" textAnchor="middle">Compete Demo. Win Real Funding.</text>
    </svg>
  );
}

export default function HomePage() {
  return (
    <div style={{ background:"#050810" }}>
      <style>{`
        @media(max-width:768px){
          .hero-grid{grid-template-columns:1fr !important; text-align:center;}
          .hero-text{align-items:center !important;}
          .hero-pills{justify-content:center !important;}
          .hero-btns{justify-content:center !important;}
          .hero-checks{justify-content:center !important;}
          .mascot-wrap{display:flex; justify-content:center; padding:0;}
          .stats-bar{grid-template-columns:1fr 1fr !important;}
          .stats-bar>div{border-right:none !important; border-bottom:1px solid rgba(255,255,255,.06);}
          .grid-3-resp{grid-template-columns:1fr !important;}
          .grid-4-resp{grid-template-columns:1fr 1fr !important;}
          .rules-grid{grid-template-columns:1fr !important;}
          .comparison-table{font-size:11px !important;}
          .comparison-table td, .comparison-table th{padding:10px 8px !important; font-size:11px !important;}
          .page-pad{padding:40px 16px !important;}
          .hero-pad{padding:40px 16px 24px !important;}
          .faq-max{padding:40px 16px !important;}
          .section-title-resp{font-size:24px !important;}
          .cta-title{font-size:26px !important;}
          .tier-card{margin-bottom:8px;}
        }
        @media(max-width:480px){
          .grid-4-resp{grid-template-columns:1fr !important;}
          .stats-bar{grid-template-columns:1fr !important;}
          .comparison-scroll{overflow-x:auto; -webkit-overflow-scrolling:touch;}
        }
        details summary::-webkit-details-marker{display:none;}
        details[open] summary span:last-child{transform:rotate(45deg); display:inline-block;}
      `}</style>

      {/* HERO */}
      <section className="hero-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"20px 0px 16px 40px", display:"grid", gridTemplateColumns:"5fr 7fr", gap:16, alignItems:"center", minHeight:"auto", position:"relative" }} >
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background:"radial-gradient(ellipse 700px 600px at 65% 35%, rgba(34,197,94,.06) 0%, transparent 70%), radial-gradient(ellipse 500px 400px at 15% 70%, rgba(255,215,0,.04) 0%, transparent 60%)" }}/>
        <div className="hero-text" style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.2)", borderRadius:100, padding:"5px 14px 5px 8px", fontSize:13, fontWeight:600, color:"#FFD700", marginBottom:24 }}>
            <span className="live-dot"/>4 Live Tournaments &middot; 347 Active Traders
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:"clamp(42px,5vw,66px)", fontWeight:800, lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:18, color:"#fff" }}>
            Compete Demo.<br/><span style={{ color:"#FFD700" }}>Win Real</span>{" "}<span style={{ color:"rgba(255,255,255,.45)" }}>Funding.</span>
          </h1>
          <p style={{ fontSize:17, color:"rgba(255,255,255,.6)", lineHeight:1.75, maxWidth:520, marginBottom:24 }}>
            Enter MT5 demo tournaments at <strong style={{ color:"rgba(255,255,255,.8)" }}>Exness, ICMarkets or Tickmill.</strong> Your entry fee joins the prize pool. Top trader wins a <strong style={{ color:"rgba(255,255,255,.8)" }}>real funded account</strong> — no evaluation needed.
          </p>
          <div className="hero-pills" style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:24 }}>
            <span className="pill pill-green">Winner takes 90% Funds</span>
            <span className="pill pill-gold">Zero Evaluation</span>
            <span className="pill pill-blue">Daily Withdrawals</span>
          </div>
          <div className="hero-btns" style={{ display:"flex", gap:12, marginBottom:28, flexWrap:"wrap" }}>
            <Link href="/tournaments" className="btn btn-primary btn-lg">Browse Tournaments</Link>
            <Link href="/how-it-works" className="btn btn-ghost btn-lg">How It Works</Link>
          </div>
          <div className="hero-checks" style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
            {["MT5 demo — zero risk","Transparent prize pool","No payout denial ever"].map(t=>(
              <div key={t} style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:"rgba(255,255,255,.45)", fontWeight:500 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>{t}
              </div>
            ))}
          </div>
        </div>
        {/* MASCOT */}
        <div className="mascot-wrap" style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
          <MFTMascot/>
        </div>
      </section>

      {/* STATS BAR */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.8)" }}>
        <div className="stats-bar" style={{ maxWidth:1280, margin:"0 auto", padding:"0 40px", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            { val:"Transparent", label:"Prize Money", color:"#FFD700" },
            { val:"0%", label:"No Payout Denial Ever", color:"#22C55E" },
            { val:"90%", label:"Winner's Prize Share", color:"#fff" },
            { val:"100%", label:"Drawdown Limit on Funded Account", color:"#60a5fa" },
          ].map(({ val, label, color })=>(
            <div key={label} style={{ padding:"24px 16px", borderRight:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
              <div style={{ fontSize:"clamp(22px,3vw,30px)", fontWeight:900, color, letterSpacing:"-1px", marginBottom:6, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{val}</div>
              <div style={{ fontSize:"clamp(10px,1.5vw,12px)", color:"rgba(255,255,255,.4)", fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRIZE STRUCTURE */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"72px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div className="section-eyebrow">Prize Structure</div>
          <h2 className="section-title section-title-resp" style={{ fontSize:32, marginBottom:12 }}>What winners receive</h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:480, margin:"0 auto" }}>Every tournament rewards the top 3 traders. First place wins a fully funded trading account.</p>
        </div>
        <div className="grid-3-resp" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
          {PRIZES.map(p=>(
            <div key={p.place} style={{ background:p.bg, border:`1px solid ${p.border}`, borderRadius:16, padding:28, position:"relative" }}>
              {p.featured&&<div style={{ position:"absolute", top:16, right:16, background:"#FFD700", color:"#000", fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, textTransform:"uppercase" }}>Top Prize</div>}
              <div style={{ fontSize:36, marginBottom:12 }}>{p.medal}</div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:8 }}>{p.label}</div>
              <div style={{ fontSize:28, fontWeight:900, color:p.color, letterSpacing:"-1px", marginBottom:6, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{p.reward}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", marginBottom:16 }}>{p.detail}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontWeight:600, padding:"8px 12px", background:"rgba(255,255,255,.04)", borderRadius:8, border:"1px solid rgba(255,255,255,.06)" }}>{p.cert}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.6)" }}>
        <div className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"72px 40px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48, flexWrap:"wrap", gap:12 }}>
            <div>
              <div className="section-eyebrow">Simple as 4 steps</div>
              <h2 className="section-title section-title-resp" style={{ fontSize:32 }}>How it works</h2>
            </div>
            <Link href="/how-it-works" style={{ fontSize:13, color:"#FFD700", textDecoration:"none", fontWeight:600 }}>Full Visual Guide &rarr;</Link>
          </div>
          <div className="grid-4-resp" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24 }}>
            {STEPS.map((s,i)=>(
              <div key={s.n} style={{ position:"relative" }}>
                {i<3&&<div style={{ position:"absolute", top:20, left:"calc(100% - 12px)", width:24, height:1, background:"rgba(255,215,0,.15)", zIndex:0 }}/>}
                <div style={{ width:40, height:40, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.2)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,215,0,.5)", letterSpacing:".12em", marginBottom:8 }}>STEP {s.n}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:8, lineHeight:1.3 }}>{s.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"72px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div className="section-eyebrow">Choose your battle</div>
          <h2 className="section-title section-title-resp" style={{ fontSize:32, marginBottom:12 }}>Three tiers. One winner takes it all.</h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>Pick an entry level. Open your MT5 demo. Trade till the end. Highest % gain wins.</p>
        </div>
        <div className="grid-3-resp" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
          {TIERS.map(t=>(
            <div key={t.name} className="tier-card" style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:16, padding:28, position:"relative" }}>
              {t.featured&&<div style={{ position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)", background:"#FFD700", color:"#000", fontSize:10, fontWeight:800, padding:"4px 16px", borderRadius:"0 0 10px 10px", whiteSpace:"nowrap" }}>Most Popular</div>}
              <div style={{ marginTop:t.featured?14:0 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.35)", marginBottom:8 }}>{t.name}</div>
                <div style={{ fontSize:32, fontWeight:900, color:t.color, letterSpacing:"-1px", marginBottom:4, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>{t.fee}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginBottom:16 }}>entry fee</div>
              </div>
              <div style={{ background:"rgba(255,255,255,.04)", borderRadius:10, padding:"12px 14px", marginBottom:18, border:"1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.7)", fontWeight:600, marginBottom:4 }}>&#9201; {t.duration}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>&#128176; Starts with {t.balance}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
                {t.features.map((f,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:13, color:"rgba(255,255,255,.5)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0, marginTop:2 }}><polyline points="20 6 9 17 4 12"/></svg>{f}
                  </div>
                ))}
              </div>
              <Link href="/tournaments" className="btn" style={{ width:"100%", justifyContent:"center", background:t.featured?"#FFD700":"rgba(255,255,255,.06)", color:t.featured?"#000":"rgba(255,255,255,.8)", border:t.featured?"none":`1px solid ${t.border}`, fontWeight:700, display:"flex" }}>
                Join {t.name} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* RULES */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div className="page-pad rules-grid" style={{ maxWidth:1280, margin:"0 auto", padding:"72px 40px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"start" }}>
          <div>
            <div className="section-eyebrow">Fair play</div>
            <h2 className="section-title section-title-resp" style={{ fontSize:32, marginBottom:16 }}>Simple rules, auto-enforced</h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7, marginBottom:8, fontWeight:600 }}>Rules auto-enforced via our cutting edge technology.</p>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.35)", lineHeight:1.7, marginBottom:28 }}>All checks happen automatically in real time — no manual review, no grey areas, no disputes.</p>
            <Link href="/tournaments" className="btn btn-primary">See Open Tournaments</Link>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {RULES.map(r=>(
              <div key={r.title} style={{ background:"rgba(13,18,29,.8)", border:"1px solid rgba(255,255,255,.06)", borderRadius:12, padding:18, display:"flex", gap:14 }}>
                <div style={{ width:6, borderRadius:3, flexShrink:0, background:r.color, opacity:.7 }}/>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.85)", marginBottom:4 }}>{r.title}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.5 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"72px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div className="section-eyebrow">Why MFT wins</div>
          <h2 className="section-title section-title-resp" style={{ fontSize:32, marginBottom:12 }}>MFT vs FTMO vs Traditional Brokers</h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:500, margin:"0 auto" }}>See exactly why thousands of traders choose MFT over expensive prop firms and risky brokers.</p>
        </div>
        <div className="comparison-scroll">
          <table className="comparison-table" style={{ width:"100%", borderRadius:16, border:"1px solid rgba(255,255,255,.08)", overflow:"hidden", borderCollapse:"separate", borderSpacing:0, minWidth:560 }}>
            <thead>
              <tr style={{ background:"rgba(13,18,29,.95)" }}>
                <th style={{ padding:"18px 20px", fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".08em", textAlign:"left", borderBottom:"1px solid rgba(255,255,255,.08)" }}>Feature</th>
                <th style={{ padding:"18px 20px", textAlign:"center", background:"rgba(255,215,0,.07)", borderLeft:"1px solid rgba(255,215,0,.15)", borderBottom:"1px solid rgba(255,215,0,.1)" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#FFD700", letterSpacing:".1em", textTransform:"uppercase", marginBottom:4 }}>&#11088; Best Choice</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#FFD700" }}>MyFundedTournament</div>
                </th>
                <th style={{ padding:"18px 20px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.5)" }}>FTMO</div>
                </th>
                <th style={{ padding:"18px 20px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.5)" }}>Broker (Exness)</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row,i)=>(
                <tr key={row.feature} style={{ background:i%2===0?"rgba(7,9,15,.4)":"transparent" }}>
                  <td style={{ padding:"14px 20px", fontSize:13, color:"rgba(255,255,255,.6)", fontWeight:500, borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.feature}</td>
                  <td style={{ padding:"14px 20px", textAlign:"center", fontSize:13, fontWeight:700, color:"#22C55E", background:"rgba(255,215,0,.03)", borderLeft:"1px solid rgba(255,215,0,.08)", borderBottom:"1px solid rgba(255,215,0,.05)" }}>{row.mft}</td>
                  <td style={{ padding:"14px 20px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,.45)", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.ftmo}</td>
                  <td style={{ padding:"14px 20px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,.45)", borderLeft:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.04)" }}>{row.broker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* DISCLAIMER */}
        <div style={{ marginTop:24, background:"rgba(255,215,0,.04)", border:"1px solid rgba(255,215,0,.12)", borderRadius:12, padding:"16px 20px" }}>
          <p style={{ fontSize:11, color:"rgba(255,255,255,.3)", lineHeight:1.7, margin:0 }}>
            <strong style={{ color:"rgba(255,215,0,.5)", fontWeight:700 }}>Disclaimer: </strong>
            MyFundedTournament is a skills-based demo trading competition platform. All trading activity takes place on MT5 demo accounts using virtual funds — no real money is traded or at risk during tournaments. Entry fees are used to fund the prize pool. Past performance of demo trading does not guarantee future results on live accounts. Funded account prizes are subject to KYC verification and our standard terms of service. FTMO and broker comparison data is based on publicly available information and may change over time. MFT is not a broker, investment advisor, or financial institution. Trading forex involves substantial risk of loss and is not suitable for all investors.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(7,9,15,.5)" }}>
        <div className="faq-max" style={{ maxWidth:860, margin:"0 auto", padding:"72px 40px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div className="section-eyebrow">Got questions?</div>
            <h2 className="section-title section-title-resp" style={{ fontSize:32, marginBottom:12 }}>Frequently Asked Questions</h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>Everything you need to know before your first tournament.</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {FAQS.map((faq,i)=>(
              <details key={i} style={{ background:"rgba(13,18,29,.8)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, overflow:"hidden" }}>
                <summary style={{ padding:"16px 20px", fontSize:14, fontWeight:600, color:"rgba(255,255,255,.85)", cursor:"pointer", listStyle:"none", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                  <span>{faq.q}</span>
                  <span style={{ fontSize:20, color:"#FFD700", flexShrink:0, transition:"transform .2s" }}>+</span>
                </summary>
                <div style={{ padding:"12px 20px 16px", fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7, borderTop:"1px solid rgba(255,255,255,.05)" }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop:"1px solid rgba(255,255,255,.06)" }}>
        <div className="page-pad" style={{ maxWidth:1280, margin:"0 auto", padding:"72px 40px", textAlign:"center" }}>
          <div style={{ maxWidth:560, margin:"0 auto" }}>
            <div className="section-eyebrow" style={{ marginBottom:16 }}>Ready to compete?</div>
            <h2 className="cta-title" style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:36, fontWeight:800, letterSpacing:"-1px", color:"#fff", marginBottom:14, lineHeight:1.1 }}>
              Start trading your way to a <span style={{ color:"#FFD700" }}>funded account</span>
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", marginBottom:32, lineHeight:1.6 }}>No evaluation. No minimum target. Just trade your MT5 demo, beat the competition, and win real capital.</p>
            <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
              <Link href="/tournaments" className="btn btn-ghost btn-lg">View All Tournaments</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
