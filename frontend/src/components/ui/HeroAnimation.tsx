"use client";
import { useEffect, useState, useRef } from "react";

const PHASE_DURATION = 4000;

const TRADERS = [
  { id:1, name:"Khalid",  flag:"🇸🇦", color:"#22C55E",  gain: 47.3 },
  { id:2, name:"Mubeen",  flag:"🇵🇰", color:"#60a5fa",  gain: 31.8 },
  { id:3, name:"Aisha",   flag:"🇦🇪", color:"#a78bfa",  gain: 28.5 },
  { id:4, name:"Chen",    flag:"🇸🇬", color:"#fb923c",  gain: 19.2 },
  { id:5, name:"Marco",   flag:"🇮🇹", color:"#f43f5e",  gain: -4.1 },
  { id:6, name:"Priya",   flag:"🇮🇳", color:"#fbbf24",  gain: 12.7 },
  { id:7, name:"Lena",    flag:"🇩🇪", color:"#34d399",  gain: 8.4  },
];

const CANDLE_DATA = [
  { bull:true,  body:[72,52],  wick:[45,78]  },
  { bull:true,  body:[48,30],  wick:[22,54]  },
  { bull:false, body:[38,55],  wick:[32,62]  },
  { bull:true,  body:[42,18],  wick:[12,50]  },
  { bull:true,  body:[22,8],   wick:[2,28]   },
  { bull:false, body:[14,28],  wick:[8,38]   },
  { bull:true,  body:[18,4],   wick:[0,22]   },
];

export default function HeroAnimation() {
  const [phase, setPhase]               = useState(0);
  const [tick,  setTick]                = useState(0);
  const [joinedCount, setJoinedCount]   = useState(0);
  const [candleIdx, setCandleIdx]       = useState(0);
  const [timerMs, setTimerMs]           = useState(5400000);
  const [showWinner, setShowWinner]     = useState(false);
  const phaseRef = useRef(0);

  // Master tick
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(iv);
  }, []);

  // Phase cycling
  useEffect(() => {
    const iv = setInterval(() => {
      phaseRef.current = (phaseRef.current + 1) % 3;
      setPhase(phaseRef.current);
      setJoinedCount(0);
      setCandleIdx(0);
      setTimerMs(5400000);
      setShowWinner(false);
    }, PHASE_DURATION);
    return () => clearInterval(iv);
  }, []);

  // Phase 0: fill traders
  useEffect(() => {
    if (phase !== 0) return;
    const iv = setInterval(() => setJoinedCount(n => n < 25 ? n + 1 : n), 140);
    return () => clearInterval(iv);
  }, [phase]);

  // Phase 1: grow candles + countdown
  useEffect(() => {
    if (phase !== 1) return;
    const iv = setInterval(() => {
      setCandleIdx(n => n < CANDLE_DATA.length ? n + 1 : n);
      setTimerMs(n => Math.max(n - 60000, 0));
    }, 400);
    return () => clearInterval(iv);
  }, [phase]);

  // Phase 2: winner reveal delay
  useEffect(() => {
    if (phase !== 2) return;
    const t = setTimeout(() => setShowWinner(true), 600);
    return () => clearTimeout(t);
  }, [phase]);

  const pulse  = Math.sin(tick * 0.15) * 0.5 + 0.5;
  const pulse2 = Math.sin(tick * 0.1 + 2) * 0.5 + 0.5;
  const mins = String(Math.floor(timerMs / 60000)).padStart(2, '0');
  const secs = String(Math.floor((timerMs % 60000) / 1000)).padStart(2, '0');
  const pool = joinedCount * 25;

  return (
    <div style={{ position:"relative", width:"100%", maxWidth:460, aspectRatio:"1/1" }}>
      {/* Ambient glow rings */}
      <div style={{ position:"absolute", inset:"-8%", borderRadius:"50%",
        background:`radial-gradient(circle, rgba(255,215,0,${0.06 + pulse*0.04}) 0%, rgba(34,197,94,0.04) 50%, transparent 70%)`,
        pointerEvents:"none" }}/>
      <div style={{ position:"absolute", inset:"-2%", borderRadius:"50%",
        border:`1px solid rgba(255,215,0,${0.1 + pulse*0.06})`, pointerEvents:"none",
        transition:"border-color .1s" }}/>
      <div style={{ position:"absolute", inset:"-8%", borderRadius:"50%",
        border:"1px solid rgba(255,215,0,.05)", pointerEvents:"none" }}/>

      {/* Main circle card */}
      <div style={{ position:"relative", width:"100%", paddingBottom:"100%", borderRadius:"50%",
        background:"rgba(6,9,18,.97)", border:"1.5px solid rgba(255,215,0,.13)",
        boxShadow:`0 0 ${40 + pulse*20}px rgba(255,215,0,.06), inset 0 0 60px rgba(0,0,0,.4)`,
        overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", padding:"6% 8%", gap:0 }}>

          {/* ══ PHASE 0: TRADERS JOINING ══ */}
          {phase === 0 && (
            <div style={{ width:"100%", textAlign:"center", animation:"fadeUp .5s ease both" }}>
              {/* Badge */}
              <div style={{ display:"inline-flex", alignItems:"center", gap:5,
                background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.25)",
                borderRadius:20, padding:"3px 12px", fontSize:10, fontWeight:800,
                color:"#FFD700", letterSpacing:".1em", textTransform:"uppercase", marginBottom:12 }}>
                ⚡ Public Battle · Open
              </div>
              {/* Battle info */}
              <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:4 }}>
                Starter Bullet · $25 entry
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:16 }}>
                25 spots · 90 min battle
              </div>
              {/* Trader flags row */}
              <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap",
                gap:5, marginBottom:14, minHeight:48 }}>
                {TRADERS.slice(0, Math.min(joinedCount, 7)).map((t, i) => (
                  <div key={t.id} style={{ width:36, height:36, borderRadius:"50%",
                    background:`${t.color}15`, border:`2px solid ${t.color}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:16, animation:`popIn .3s ease both`,
                    animationDelay:`${i*0.05}s` }}>
                    {t.flag}
                  </div>
                ))}
                {joinedCount > 7 && (
                  <div style={{ width:36, height:36, borderRadius:"50%",
                    background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.15)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:700, color:"rgba(255,255,255,.5)" }}>
                    +{joinedCount - 7}
                  </div>
                )}
              </div>
              {/* Fill bar */}
              <div style={{ height:7, background:"rgba(255,255,255,.06)", borderRadius:4,
                overflow:"hidden", margin:"0 20px 8px" }}>
                <div style={{ height:"100%", borderRadius:4,
                  background:"linear-gradient(90deg,#FFD700,#22C55E)",
                  width:`${(joinedCount/25)*100}%`, transition:"width .12s ease" }}/>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>
                <span style={{ color:"#FFD700", fontWeight:800 }}>{joinedCount}</span>
                <span> / 25 traders</span>
              </div>
              <div style={{ marginTop:10, fontSize:13, fontWeight:800, color:"#22C55E" }}>
                Prize pool: ${pool}
              </div>
            </div>
          )}

          {/* ══ PHASE 1: LIVE BATTLE ══ */}
          {phase === 1 && (
            <div style={{ width:"100%", animation:"fadeUp .5s ease both" }}>
              {/* Live badge + timer */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                marginBottom:8, padding:"0 4px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"#22C55E",
                    boxShadow:`0 0 ${6+pulse2*6}px #22C55E`, animation:"livePulse 1s infinite" }}/>
                  <span style={{ fontSize:10, fontWeight:800, color:"#22C55E",
                    letterSpacing:".1em", textTransform:"uppercase" }}>Battle Live</span>
                </div>
                <div style={{ fontFamily:"'Space Grotesk',monospace", fontSize:18, fontWeight:900,
                  color:"#fff", letterSpacing:"-1px",
                  textShadow:`0 0 ${10+pulse*8}px rgba(34,197,94,.6)` }}>
                  {mins}:{secs}
                </div>
              </div>
              {/* Candlestick chart */}
              <svg viewBox="0 0 260 90" style={{ width:"100%", marginBottom:8, display:"block" }}>
                {/* Grid */}
                {[20,50,80].map(y => (
                  <line key={y} x1="0" y1={y} x2="260" y2={y}
                    stroke="rgba(255,255,255,.04)" strokeWidth="1"/>
                ))}
                {/* Candles */}
                {CANDLE_DATA.slice(0, candleIdx).map((c, i) => {
                  const x = 10 + i * 34;
                  const col = c.bull ? "#22C55E" : "#EF4444";
                  const bodyH = Math.abs(c.body[1] - c.body[0]) || 2;
                  return (
                    <g key={i} style={{ animation:"fadeIn .3s ease both" }}>
                      <line x1={x+9} y1={c.wick[0]} x2={x+9} y2={c.wick[1]}
                        stroke={col} strokeWidth="1.5"/>
                      <rect x={x} y={Math.min(c.body[0],c.body[1])} width={18} height={bodyH}
                        rx="2" fill={`${col}25`} stroke={col} strokeWidth="1.5"/>
                    </g>
                  );
                })}
                {/* Trend arrow */}
                {candleIdx >= 3 && (
                  <polyline
                    points={CANDLE_DATA.slice(0,candleIdx).map((c,i) =>
                      `${19+i*34},${c.body[1]}`).join(' ')}
                    fill="none" stroke="rgba(255,215,0,.5)" strokeWidth="1.5"
                    strokeDasharray="4 2" style={{ animation:"fadeIn .3s ease" }}/>
                )}
                {/* Gain badge */}
                <rect x="168" y="2" width="84" height="22" rx="5"
                  fill="rgba(34,197,94,.12)" stroke="rgba(34,197,94,.4)" strokeWidth="1"/>
                <text x="210" y="11" textAnchor="middle" fill="#22C55E"
                  fontSize="8" fontWeight="800" fontFamily="system-ui">+47.3% GAIN</text>
                <text x="210" y="20" textAnchor="middle" fill="rgba(255,255,255,.35)"
                  fontSize="7" fontFamily="system-ui">XAUUSD · live</text>
              </svg>
              {/* Mini leaderboard */}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {TRADERS.slice(0,3).map((t, i) => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8,
                    background: i===0 ? "rgba(255,215,0,.06)" : "rgba(255,255,255,.03)",
                    border: i===0 ? "1px solid rgba(255,215,0,.2)" : "1px solid rgba(255,255,255,.05)",
                    borderRadius:8, padding:"5px 10px" }}>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,.25)", width:14 }}>
                      {i===0?"🥇":i===1?"🥈":"🥉"}
                    </span>
                    <span style={{ fontSize:13 }}>{t.flag}</span>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,.65)", flex:1 }}>{t.name}</span>
                    <span style={{ fontSize:12, fontWeight:800,
                      color: t.gain > 0 ? (i===0?"#FFD700":"#22C55E") : "#EF4444" }}>
                      {t.gain > 0 ? "+" : ""}{t.gain}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PHASE 2: WINNER ══ */}
          {phase === 2 && (
            <div style={{ width:"100%", textAlign:"center", animation:"fadeUp .5s ease both" }}>
              {/* Trophy */}
              <div style={{ fontSize:46, marginBottom:4,
                filter:`drop-shadow(0 0 ${14+pulse*14}px rgba(255,215,0,.9))`,
                transform:`scale(${1+pulse*0.04})`, transition:"transform .05s",
                animation: showWinner ? "bounceIn .6s cubic-bezier(.36,.07,.19,.97) both" : "none" }}>
                🏆
              </div>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:".14em",
                textTransform:"uppercase", color:"rgba(255,215,0,.8)", marginBottom:8 }}>
                Battle Ended · Winner!
              </div>
              {/* Winner card */}
              {showWinner && (
                <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,.08),rgba(34,197,94,.05))",
                  border:"1.5px solid rgba(255,215,0,.35)", borderRadius:14,
                  padding:"10px 16px", marginBottom:10,
                  boxShadow:`0 0 ${20+pulse*20}px rgba(255,215,0,.12)`,
                  animation:"fadeUp .4s ease both" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                    gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:22 }}>🇸🇦</span>
                    <span style={{ fontSize:15, fontWeight:800, color:"#fff" }}>Khalid</span>
                  </div>
                  <div style={{ fontSize:28, fontWeight:900, color:"#22C55E",
                    letterSpacing:"-1px", fontFamily:"'Space Grotesk',sans-serif", marginBottom:1 }}>
                    +47.3%
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.35)" }}>
                    Highest gain · XAUUSD
                  </div>
                </div>
              )}
              {/* Reward choice */}
              {showWinner && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8,
                  animation:"fadeUp .4s .2s ease both" }}>
                  <div style={{ background:"rgba(34,197,94,.07)",
                    border:`1px solid rgba(34,197,94,${0.3+pulse2*0.2})`,
                    borderRadius:10, padding:"10px 6px",
                    boxShadow:`0 0 ${6+pulse2*10}px rgba(34,197,94,.15)` }}>
                    <div style={{ fontSize:18, fontWeight:900, color:"#22C55E" }}>$500</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:2, lineHeight:1.4 }}>
                      Instant USDT<br/>cashout (80%)
                    </div>
                  </div>
                  <div style={{ background:"rgba(255,215,0,.07)",
                    border:`1px solid rgba(255,215,0,${0.3+pulse*0.2})`,
                    borderRadius:10, padding:"10px 6px",
                    boxShadow:`0 0 ${6+pulse*10}px rgba(255,215,0,.15)` }}>
                    <div style={{ fontSize:18, fontWeight:900, color:"#FFD700" }}>$562</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:2, lineHeight:1.4 }}>
                      Funded account<br/>(90% of pool)
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginTop:8, fontSize:9, color:"rgba(255,255,255,.2)" }}>
                25 traders × $25 = $625 prize pool
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating stat badges */}
      <div style={{ position:"absolute", top:"6%", left:"-10%",
        background:"rgba(6,9,18,.95)", border:"1px solid rgba(34,197,94,.35)",
        borderRadius:12, padding:"8px 13px", animation:"floatA 4s ease-in-out infinite" }}>
        <div style={{ fontSize:18, fontWeight:900, color:"#22C55E", lineHeight:1 }}>
          {phase===0 ? `${joinedCount}/25` : phase===1 ? "25/25" : "🏆"}
        </div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:1 }}>
          {phase===0 ? "Joining" : phase===1 ? "Full Battle" : "Champion"}
        </div>
      </div>

      <div style={{ position:"absolute", top:"10%", right:"-10%",
        background:"rgba(6,9,18,.95)", border:"1px solid rgba(255,215,0,.35)",
        borderRadius:12, padding:"8px 13px", animation:"floatB 4s ease-in-out infinite" }}>
        <div style={{ fontSize:18, fontWeight:900, color:"#FFD700", lineHeight:1 }}>$25</div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:1 }}>Start from</div>
      </div>

      <div style={{ position:"absolute", bottom:"8%", left:"-10%",
        background:"rgba(6,9,18,.95)", border:"1px solid rgba(255,215,0,.35)",
        borderRadius:12, padding:"8px 13px", animation:"floatC 5s ease-in-out infinite" }}>
        <div style={{ fontSize:18, fontWeight:900, color:"#FFD700", lineHeight:1 }}>90m</div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:1 }}>Battle Time</div>
      </div>

      {/* Phase dots */}
      <div style={{ position:"absolute", bottom:"-28px", left:"50%",
        transform:"translateX(-50%)", display:"flex", gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ height:6, borderRadius:3, transition:"all .4s ease",
            width: i===phase ? 20 : 6,
            background: i===phase ? "#FFD700" : "rgba(255,255,255,.15)" }}/>
        ))}
      </div>

      <style>{`
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes popIn     { from{opacity:0;transform:scale(.3)} to{opacity:1;transform:scale(1)} }
        @keyframes bounceIn  { 0%{transform:scale(.3)} 50%{transform:scale(1.15)} 75%{transform:scale(.95)} 100%{transform:scale(1)} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes floatA    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes floatB    { 0%,100%{transform:translateY(-4px)} 50%{transform:translateY(4px)} }
        @keyframes floatC    { 0%,100%{transform:translateY(2px)} 50%{transform:translateY(-6px)} }
      `}</style>
    </div>
  );
}
