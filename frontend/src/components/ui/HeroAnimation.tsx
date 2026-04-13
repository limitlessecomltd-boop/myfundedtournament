"use client";
import { useEffect, useState, useRef } from "react";

// Phases: 0=traders joining, 1=battle active/trading, 2=winner revealed
const PHASE_DURATION = 3200;

const TRADERS = [
  { id:1, name:"Khalid",  flag:"🇸🇦", color:"#22C55E", gain: 47.3 },
  { id:2, name:"Mubeen",  flag:"🇵🇰", color:"#60a5fa", gain: 31.8 },
  { id:3, name:"Aisha",   flag:"🇦🇪", color:"#a78bfa", gain: 28.5 },
  { id:4, name:"Chen",    flag:"🇸🇬", color:"#fb923c", gain: 19.2 },
  { id:5, name:"Marco",   flag:"🇮🇹", color:"#f43f5e", gain: -4.1 },
];

// Animated candlestick data
const CANDLES = [
  { x:40,  open:210, close:170, high:155, low:228, bull:true  },
  { x:72,  open:172, close:138, high:122, low:188, bull:true  },
  { x:104, open:155, close:178, high:168, low:192, bull:false },
  { x:136, open:120, close:88,  high:72,  low:136, bull:true  },
  { x:168, open:96,  close:68,  high:52,  low:112, bull:true  },
  { x:200, open:82,  close:98,  high:86,  low:114, bull:false },
  { x:232, open:52,  close:32,  high:18,  low:68,  bull:true  },
  { x:264, open:38,  close:22,  high:8,   low:52,  bull:true  },
];

export default function HeroAnimation() {
  const [phase, setPhase] = useState(0);
  const [tick,  setTick]  = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [candleProgress, setCandleProgress] = useState(0);
  const [timerMs, setTimerMs] = useState(5400000); // 90 min in ms
  const phaseRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Phase cycling
    const phaseTimer = setInterval(() => {
      phaseRef.current = (phaseRef.current + 1) % 3;
      setPhase(phaseRef.current);
      if (phaseRef.current === 0) {
        setJoinedCount(0);
        setCandleProgress(0);
        setTimerMs(5400000);
      }
    }, PHASE_DURATION);
    return () => clearInterval(phaseTimer);
  }, []);

  // Animate joined count in phase 0
  useEffect(() => {
    if (phase !== 0) return;
    const t = setInterval(() => {
      setJoinedCount(n => n < 25 ? n + 1 : n);
    }, 120);
    return () => clearInterval(t);
  }, [phase]);

  // Animate candle progress in phase 1
  useEffect(() => {
    if (phase !== 1) return;
    const t = setInterval(() => {
      setCandleProgress(n => Math.min(n + 0.04, 1));
    }, 40);
    return () => clearInterval(t);
  }, [phase]);

  // Count down timer in phase 1
  useEffect(() => {
    if (phase !== 1) return;
    const t = setInterval(() => {
      setTimerMs(n => Math.max(n - 40000, 0));
    }, 40);
    return () => clearInterval(t);
  }, [phase]);

  const mins = Math.floor(timerMs / 60000);
  const secs = Math.floor((timerMs % 60000) / 1000);
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

  // Pulse animation
  const pulse = Math.sin(tick * 0.15) * 0.5 + 0.5;
  const pulse2 = Math.sin(tick * 0.1 + 1) * 0.5 + 0.5;

  return (
    <div style={{ position:"relative", width:"100%", aspectRatio:"1/1", maxWidth:480 }}>
      {/* Outer glow rings */}
      <div style={{ position:"absolute", inset:0, borderRadius:"50%",
        background:"radial-gradient(circle at 50% 55%, rgba(255,215,0,.12) 0%, rgba(34,197,94,.07) 45%, transparent 70%)",
        transform:"scale(1.05)" }}/>
      <div style={{ position:"absolute", inset:"-4%", borderRadius:"50%",
        border:"1px solid rgba(255,215,0,.14)" }}/>
      <div style={{ position:"absolute", inset:"-10%", borderRadius:"50%",
        border:"1px solid rgba(255,215,0,.07)" }}/>

      {/* Main circle */}
      <div style={{ position:"relative", width:"100%", paddingBottom:"100%", borderRadius:"50%", overflow:"hidden",
        background:"rgba(8,12,24,.95)", border:"1px solid rgba(255,215,0,.12)" }}>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", padding:24 }}>

          {/* ── PHASE 0: Traders Joining ── */}
          {phase === 0 && (
            <div style={{ width:"100%", textAlign:"center", animation:"fadeIn .4s ease" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase",
                color:"rgba(255,215,0,.7)", marginBottom:10 }}>⚡ Battle Filling Up</div>
              {/* Battle name */}
              <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:16, letterSpacing:"-.3px" }}>
                Starter Bullet · $25 entry
              </div>
              {/* Trader avatars */}
              <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap", marginBottom:14, minHeight:52 }}>
                {TRADERS.slice(0, joinedCount > 5 ? 5 : joinedCount).map((t,i) => (
                  <div key={t.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <div style={{ width:38, height:38, borderRadius:"50%",
                      background:`${t.color}22`, border:`2px solid ${t.color}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:16, animation:`popIn .3s ease ${i*0.08}s both` }}>
                      {t.flag}
                    </div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.4)" }}>{t.name}</div>
                  </div>
                ))}
                {joinedCount > 5 && (
                  <div style={{ width:38, height:38, borderRadius:"50%",
                    background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.15)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:700, color:"rgba(255,255,255,.5)" }}>
                    +{joinedCount - 5}
                  </div>
                )}
              </div>
              {/* Progress bar */}
              <div style={{ background:"rgba(255,255,255,.07)", borderRadius:6, height:8, margin:"0 16px 8px", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:6, background:"linear-gradient(90deg,#FFD700,#22C55E)",
                  width:`${(joinedCount/25)*100}%`, transition:"width .1s ease" }}/>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.45)" }}>
                <span style={{ color:"#FFD700", fontWeight:700 }}>{joinedCount}</span>
                <span style={{ color:"rgba(255,255,255,.3)" }}> / 25 traders joined</span>
              </div>
              <div style={{ marginTop:10, fontSize:11, color:"rgba(34,197,94,.8)", fontWeight:600 }}>
                Prize pool building: <span style={{ color:"#22C55E", fontWeight:800 }}>${joinedCount * 25}</span>
              </div>
            </div>
          )}

          {/* ── PHASE 1: Battle Active / Trading ── */}
          {phase === 1 && (
            <div style={{ width:"100%", animation:"fadeIn .4s ease" }}>
              {/* Timer */}
              <div style={{ textAlign:"center", marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase",
                  color:`rgba(34,197,94,${0.6 + pulse2 * 0.4})`, marginBottom:4 }}>
                  🟢 BATTLE LIVE
                </div>
                <div style={{ fontSize:28, fontWeight:900, color:"#fff", fontFamily:"'Space Grotesk',monospace",
                  letterSpacing:"-1px", textShadow:`0 0 ${12 + pulse * 8}px rgba(34,197,94,.5)` }}>
                  {timeStr}
                </div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>remaining</div>
              </div>
              {/* Mini live chart */}
              <svg width="100%" viewBox="0 0 340 110" style={{ display:"block", margin:"0 auto 10px" }}>
                {/* Grid lines */}
                {[20,50,80].map(y => (
                  <line key={y} x1="30" y1={y} x2="310" y2={y} stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
                ))}
                {/* Candles (animated by progress) */}
                {CANDLES.map((c, i) => {
                  const visible = (i / CANDLES.length) <= candleProgress;
                  if (!visible) return null;
                  const isLast = i === Math.floor(candleProgress * CANDLES.length);
                  const col = c.bull ? "#22C55E" : "#EF4444";
                  return (
                    <g key={i}>
                      <line x1={c.x+10} y1={c.high} x2={c.x+10} y2={c.bull ? c.close : c.open}
                        stroke={col} strokeWidth="1.5"/>
                      <line x1={c.x+10} y1={c.bull ? c.open : c.close} x2={c.x+10} y2={c.low}
                        stroke={col} strokeWidth="1.5"/>
                      <rect x={c.x} y={Math.min(c.open, c.close)} width={20}
                        height={Math.abs(c.open - c.close) || 2} rx="2"
                        fill={`${col}33`} stroke={col} strokeWidth={isLast ? 2 : 1.5}
                        opacity={isLast ? 1 : 0.8}/>
                    </g>
                  );
                })}
                {/* Trend line */}
                <polyline points="50,210 82,180 114,155 146,138 178,100 210,88 242,65 274,48"
                  fill="none" stroke="rgba(255,215,0,.5)" strokeWidth="1.5"
                  strokeDasharray="4 2" opacity={candleProgress}/>
                {/* Live gain badge */}
                <rect x="210" y="2" width="90" height="26" rx="6"
                  fill="rgba(34,197,94,.15)" stroke="rgba(34,197,94,.5)" strokeWidth="1.2"/>
                <text x="255" y="13" textAnchor="middle" fill="#22C55E"
                  fontSize="9" fontWeight="800" fontFamily="system-ui">+47.3% GAIN</text>
                <text x="255" y="23" textAnchor="middle" fill="rgba(255,255,255,.4)"
                  fontSize="7.5" fontFamily="system-ui">XAUUSD · live</text>
              </svg>
              {/* Live leaderboard mini */}
              <div style={{ display:"flex", flexDirection:"column", gap:4, padding:"0 8px" }}>
                {TRADERS.slice(0,3).map((t,i) => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8,
                    background:"rgba(255,255,255,.04)", borderRadius:7, padding:"4px 10px" }}>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,.3)", width:12 }}>#{i+1}</span>
                    <span style={{ fontSize:11 }}>{t.flag}</span>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,.6)", flex:1 }}>{t.name}</span>
                    <span style={{ fontSize:11, fontWeight:800, color: t.gain > 0 ? "#22C55E" : "#EF4444" }}>
                      {t.gain > 0 ? "+" : ""}{t.gain}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PHASE 2: Winner Revealed ── */}
          {phase === 2 && (
            <div style={{ width:"100%", textAlign:"center", animation:"fadeIn .4s ease" }}>
              {/* Trophy burst */}
              <div style={{ fontSize:44, marginBottom:6,
                filter:`drop-shadow(0 0 ${12 + pulse * 12}px rgba(255,215,0,.8))`,
                transform:`scale(${1 + pulse * 0.05})`, transition:"transform .05s" }}>
                🏆
              </div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase",
                color:"rgba(255,215,0,.8)", marginBottom:6 }}>Battle Ended · Winner!</div>
              {/* Winner card */}
              <div style={{ background:"linear-gradient(135deg, rgba(255,215,0,.1), rgba(34,197,94,.06))",
                border:"1.5px solid rgba(255,215,0,.4)", borderRadius:14, padding:"12px 18px", marginBottom:12,
                boxShadow:`0 0 ${20 + pulse * 20}px rgba(255,215,0,.15)` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:22 }}>🇸🇦</span>
                  <span style={{ fontSize:16, fontWeight:800, color:"#fff" }}>Khalid</span>
                </div>
                <div style={{ fontSize:26, fontWeight:900, color:"#22C55E", letterSpacing:"-1px",
                  fontFamily:"'Space Grotesk',sans-serif", marginBottom:2 }}>+47.3%</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Highest gain · XAUUSD</div>
              </div>
              {/* Prize options */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"0 4px" }}>
                <div style={{ background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.3)",
                  borderRadius:10, padding:"10px 8px",
                  boxShadow: phase === 2 ? `0 0 ${8 + pulse2 * 8}px rgba(34,197,94,.2)` : "none" }}>
                  <div style={{ fontSize:14, fontWeight:900, color:"#22C55E" }}>$500</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:2 }}>Instant USDT<br/>cashout (80%)</div>
                </div>
                <div style={{ background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.3)",
                  borderRadius:10, padding:"10px 8px",
                  boxShadow: phase === 2 ? `0 0 ${8 + pulse * 8}px rgba(255,215,0,.2)` : "none" }}>
                  <div style={{ fontSize:14, fontWeight:900, color:"#FFD700" }}>$562</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:2 }}>Funded account<br/>(90% of pool)</div>
                </div>
              </div>
              <div style={{ marginTop:10, fontSize:10, color:"rgba(255,255,255,.25)" }}>
                25 traders × $25 = $625 prize pool
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating badges */}
      {phase !== 0 && (
        <div style={{ position:"absolute", top:"8%", left:"-8%",
          background:"rgba(10,14,24,.95)", border:"1px solid rgba(34,197,94,.4)",
          borderRadius:14, padding:"10px 14px", animation:"fadeIn .4s ease" }}>
          <div style={{ fontSize:20, fontWeight:900, color:"#22C55E", lineHeight:1 }}>
            {phase === 1 ? "25/25" : "🏆"}
          </div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.45)", marginTop:2 }}>
            {phase === 1 ? "Full Battle" : "Champion"}
          </div>
        </div>
      )}
      <div style={{ position:"absolute", top:"12%", right:"-8%",
        background:"rgba(10,14,24,.95)", border:"1px solid rgba(255,215,0,.4)",
        borderRadius:14, padding:"10px 14px" }}>
        <div style={{ fontSize:20, fontWeight:900, color:"#FFD700", lineHeight:1 }}>$25</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.45)", marginTop:2 }}>Start from</div>
      </div>
      <div style={{ position:"absolute", bottom:"10%", left:"-8%",
        background:"rgba(10,14,24,.95)", border:"1px solid rgba(255,215,0,.4)",
        borderRadius:14, padding:"10px 14px" }}>
        <div style={{ fontSize:20, fontWeight:900, color:"#FFD700", lineHeight:1 }}>90m</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.45)", marginTop:2 }}>Battle Time</div>
      </div>

      {/* Phase indicator dots */}
      <div style={{ position:"absolute", bottom:"-24px", left:"50%", transform:"translateX(-50%)",
        display:"flex", gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: i === phase ? 16 : 6, height:6, borderRadius:3,
            background: i === phase ? "#FFD700" : "rgba(255,255,255,.2)",
            transition:"all .3s ease" }}/>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn  { from { opacity:0; transform:scale(.4); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
}
