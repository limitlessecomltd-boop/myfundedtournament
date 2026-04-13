"use client";
import { useEffect, useState, useRef } from "react";

const PHASE_DURATION = 5000;

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
  { bull:true,  body:[72,52], wick:[45,78] },
  { bull:true,  body:[48,30], wick:[22,54] },
  { bull:false, body:[38,55], wick:[32,62] },
  { bull:true,  body:[42,18], wick:[12,50] },
  { bull:true,  body:[22,8],  wick:[2,28]  },
  { bull:false, body:[14,28], wick:[8,38]  },
  { bull:true,  body:[18,4],  wick:[0,22]  },
];

export default function HeroAnimation() {
  const [phase, setPhase]             = useState(0);
  const [tick,  setTick]              = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [candleIdx, setCandleIdx]     = useState(0);
  const [timerMs, setTimerMs]         = useState(5400000);
  const [showWinner, setShowWinner]   = useState(false);
  const [showReward, setShowReward]   = useState(false);
  const [lbTick, setLbTick]           = useState(0);
  const phaseRef = useRef(0);

  // Master tick ~60fps feel
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(iv);
  }, []);

  // Phase cycling
  useEffect(() => {
    const iv = setInterval(() => {
      phaseRef.current = (phaseRef.current + 1) % 3;
      setPhase(phaseRef.current);
      setJoinedCount(0); setCandleIdx(0);
      setTimerMs(5400000); setShowWinner(false); setShowReward(false); setLbTick(0);
    }, PHASE_DURATION);
    return () => clearInterval(iv);
  }, []);

  // Phase 0: fill traders with entry fee accumulation
  useEffect(() => {
    if (phase !== 0) return;
    const iv = setInterval(() => setJoinedCount(n => n < 25 ? n + 1 : n), 160);
    return () => clearInterval(iv);
  }, [phase]);

  // Phase 1: grow candles + countdown + leaderboard shuffle
  useEffect(() => {
    if (phase !== 1) return;
    const iv = setInterval(() => {
      setCandleIdx(n => n < CANDLE_DATA.length ? n + 1 : n);
      setTimerMs(n => Math.max(n - 70000, 0));
      setLbTick(n => n + 1);
    }, 450);
    return () => clearInterval(iv);
  }, [phase]);

  // Phase 2: winner reveal with staged animation
  useEffect(() => {
    if (phase !== 2) return;
    const t1 = setTimeout(() => setShowWinner(true), 500);
    const t2 = setTimeout(() => setShowReward(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  const pulse  = Math.sin(tick * 0.12) * 0.5 + 0.5;
  const pulse2 = Math.sin(tick * 0.09 + 2) * 0.5 + 0.5;
  const pulse3 = Math.sin(tick * 0.07 + 4) * 0.5 + 0.5;
  const mins = String(Math.floor(timerMs / 60000)).padStart(2,'0');
  const secs = String(Math.floor((timerMs % 60000) / 1000)).padStart(2,'0');
  const pool = joinedCount * 25;

  // Leaderboard shuffles slightly each lbTick
  const lbOrder = lbTick % 3 === 2
    ? [0, 2, 1, 3, 4]
    : lbTick % 3 === 1
    ? [0, 1, 3, 2, 4]
    : [0, 1, 2, 3, 4];

  return (
    <div style={{ position:"relative", width:"100%", maxWidth:460, aspectRatio:"1/1" }}>
      {/* Ambient glow rings */}
      <div style={{ position:"absolute", inset:"-10%", borderRadius:"50%",
        background:`radial-gradient(circle, rgba(255,215,0,${0.07+pulse*0.05}) 0%, rgba(34,197,94,0.04) 45%, transparent 70%)`,
        pointerEvents:"none" }}/>
      <div style={{ position:"absolute", inset:"-2%", borderRadius:"50%",
        border:`1.5px solid rgba(255,215,0,${0.12+pulse*0.08})`, pointerEvents:"none",
        transition:"border-color .1s" }}/>
      <div style={{ position:"absolute", inset:"-7%", borderRadius:"50%",
        border:"1px solid rgba(255,215,0,.05)", pointerEvents:"none" }}/>

      {/* Main circle card */}
      <div style={{ position:"relative", width:"100%", paddingBottom:"100%", borderRadius:"50%",
        background:"rgba(6,9,18,.97)", border:"1.5px solid rgba(255,215,0,.14)",
        boxShadow:`0 0 ${50+pulse*25}px rgba(255,215,0,.07), inset 0 0 60px rgba(0,0,0,.4)`,
        overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", padding:"6% 8%", gap:0 }}>

          {/* ══ PHASE 0: TRADERS JOINING ══ */}
          {phase === 0 && (
            <div style={{ width:"100%", textAlign:"center", animation:"fadeUp .5s ease both" }}>
              {/* Step label */}
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:".16em", textTransform:"uppercase",
                color:"rgba(255,215,0,.5)", marginBottom:6 }}>STEP 01 — GET READY</div>
              {/* Battle badge */}
              <div style={{ display:"inline-flex", alignItems:"center", gap:5,
                background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.3)",
                borderRadius:20, padding:"3px 14px", fontSize:11, fontWeight:800,
                color:"#FFD700", letterSpacing:".06em", marginBottom:10 }}>
                ⚡ Starter Bullet · $25 entry
              </div>
              {/* Trader flags row — animated in */}
              <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap",
                gap:6, marginBottom:12, minHeight:44 }}>
                {TRADERS.slice(0, Math.min(joinedCount, 7)).map((t, i) => (
                  <div key={t.id} style={{ width:34, height:34, borderRadius:"50%",
                    background:`${t.color}18`, border:`2px solid ${t.color}55`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:15, animation:"popIn .35s ease both",
                    animationDelay:`${i*0.04}s`, position:"relative" }}>
                    {t.flag}
                    {i === 0 && joinedCount <= 7 && (
                      <div style={{ position:"absolute", bottom:-4, right:-4, width:14, height:14,
                        background:"#22C55E", borderRadius:"50%", border:"2px solid #060912",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:7, fontWeight:900 }}>✓</div>
                    )}
                  </div>
                ))}
                {joinedCount > 7 && (
                  <div style={{ width:34, height:34, borderRadius:"50%",
                    background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.18)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:700, color:"rgba(255,255,255,.55)" }}>
                    +{joinedCount-7}
                  </div>
                )}
              </div>
              {/* Fill bar */}
              <div style={{ height:6, background:"rgba(255,255,255,.06)", borderRadius:3,
                overflow:"hidden", margin:"0 16px 6px" }}>
                <div style={{ height:"100%", borderRadius:3,
                  background:"linear-gradient(90deg,#FFD700,#22C55E)",
                  width:`${(joinedCount/25)*100}%`, transition:"width .14s ease",
                  boxShadow:"0 0 8px rgba(34,197,94,.5)" }}/>
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:10 }}>
                <span style={{ color:"#FFD700", fontWeight:800 }}>{joinedCount}</span>
                <span style={{ color:"rgba(255,255,255,.25)" }}> / 25 traders joined</span>
              </div>
              {/* Prize pool counter — the big number */}
              <div style={{ background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.2)",
                borderRadius:12, padding:"10px 16px", margin:"0 8px" }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", letterSpacing:".1em",
                  textTransform:"uppercase", marginBottom:3 }}>Prize Pool Building</div>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:32, fontWeight:900,
                  color:"#22C55E", letterSpacing:"-1.5px",
                  textShadow:`0 0 ${12+pulse*12}px rgba(34,197,94,.6)` }}>
                  ${pool.toLocaleString()}
                </div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:2 }}>
                  {joinedCount} × $25 entry fee
                </div>
              </div>
            </div>
          )}

          {/* ══ PHASE 1: LIVE BATTLE ══ */}
          {phase === 1 && (
            <div style={{ width:"100%", animation:"fadeUp .5s ease both" }}>
              {/* Step label */}
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:".16em", textTransform:"uppercase",
                color:"rgba(34,197,94,.5)", marginBottom:4, textAlign:"center" }}>STEP 02 — BEAT THE TRADERS</div>
              {/* Live badge + timer row */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                marginBottom:7, padding:"0 2px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"#22C55E",
                    boxShadow:`0 0 ${5+pulse2*7}px #22C55E`, animation:"livePulse 1s infinite" }}/>
                  <span style={{ fontSize:10, fontWeight:800, color:"#22C55E",
                    letterSpacing:".1em", textTransform:"uppercase" }}>Battle Live</span>
                </div>
                <div style={{ background:"rgba(0,0,0,.4)", border:"1px solid rgba(255,255,255,.1)",
                  borderRadius:8, padding:"3px 10px",
                  fontFamily:"'Space Grotesk',monospace", fontSize:17, fontWeight:900,
                  color:"#fff", letterSpacing:"-0.5px",
                  textShadow:`0 0 ${8+pulse*8}px rgba(34,197,94,.5)` }}>
                  {mins}:{secs}
                </div>
              </div>
              {/* Candlestick chart */}
              <svg viewBox="0 0 260 80" style={{ width:"100%", marginBottom:6, display:"block" }}>
                {[20,40,60].map(y => (
                  <line key={y} x1="0" y1={y} x2="260" y2={y}
                    stroke="rgba(255,255,255,.04)" strokeWidth="1"/>
                ))}
                {CANDLE_DATA.slice(0, candleIdx).map((c, i) => {
                  const x  = 8 + i * 34;
                  const col = c.bull ? "#22C55E" : "#EF4444";
                  const bodyH = Math.abs(c.body[1]-c.body[0]) || 2;
                  return (
                    <g key={i} style={{ animation:"fadeIn .25s ease both" }}>
                      <line x1={x+9} y1={c.wick[0]} x2={x+9} y2={c.wick[1]}
                        stroke={col} strokeWidth="1.5" opacity="0.7"/>
                      <rect x={x} y={Math.min(c.body[0],c.body[1])} width={18} height={bodyH}
                        rx="2" fill={`${col}22`} stroke={col} strokeWidth="1.5"/>
                    </g>
                  );
                })}
                {candleIdx >= 3 && (
                  <polyline
                    points={CANDLE_DATA.slice(0,candleIdx).map((c,i)=>`${17+i*34},${c.body[1]}`).join(' ')}
                    fill="none" stroke="rgba(255,215,0,.45)" strokeWidth="1.5"
                    strokeDasharray="4 2" style={{ animation:"fadeIn .3s ease" }}/>
                )}
                {/* Live gain badge */}
                <rect x="168" y="1" width="86" height="24" rx="5"
                  fill="rgba(34,197,94,.12)" stroke="rgba(34,197,94,.4)" strokeWidth="1"/>
                <text x="211" y="11" textAnchor="middle" fill="#22C55E"
                  fontSize="8.5" fontWeight="800" fontFamily="system-ui">+47.3% GAIN</text>
                <text x="211" y="20" textAnchor="middle" fill="rgba(255,255,255,.35)"
                  fontSize="7" fontFamily="system-ui">XAUUSD · live</text>
              </svg>
              {/* Live leaderboard — shuffles */}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                {lbOrder.slice(0,4).map((idx, rank) => {
                  const t = TRADERS[idx];
                  return (
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:7,
                      background: rank===0 ? "rgba(255,215,0,.07)" : "rgba(255,255,255,.03)",
                      border: rank===0 ? "1px solid rgba(255,215,0,.22)" : "1px solid rgba(255,255,255,.05)",
                      borderRadius:7, padding:"4px 9px",
                      transition:"all .4s ease",
                      animation: rank===0 ? `glowGold .8s ease both` : "none" }}>
                      <span style={{ fontSize:9, width:12, color:"rgba(255,255,255,.25)", textAlign:"center" }}>
                        {rank===0?"🥇":rank===1?"🥈":rank===2?"🥉":"4️⃣"}
                      </span>
                      <span style={{ fontSize:12 }}>{t.flag}</span>
                      <span style={{ fontSize:10, color:"rgba(255,255,255,.6)", flex:1,
                        fontWeight: rank===0 ? 700 : 400 }}>{t.name}</span>
                      <span style={{ fontSize:11, fontWeight:800,
                        color: t.gain>0 ? (rank===0?"#FFD700":"#22C55E") : "#EF4444" }}>
                        {t.gain>0?"+":""}{t.gain}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ PHASE 2: WIN THE FORTUNE ══ */}
          {phase === 2 && (
            <div style={{ width:"100%", textAlign:"center", animation:"fadeUp .5s ease both" }}>
              {/* Step label */}
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:".16em", textTransform:"uppercase",
                color:"rgba(255,215,0,.5)", marginBottom:4 }}>STEP 03 — WIN THE FORTUNE</div>
              {/* Trophy */}
              <div style={{ fontSize:40, marginBottom:4,
                filter:`drop-shadow(0 0 ${16+pulse*18}px rgba(255,215,0,.95))`,
                transform:`scale(${1+pulse*0.05})`, transition:"transform .05s",
                animation: showWinner ? "bounceIn .6s cubic-bezier(.36,.07,.19,.97) both" : "none" }}>
                🏆
              </div>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:".14em",
                textTransform:"uppercase", color:"rgba(255,215,0,.8)", marginBottom:6 }}>
                Battle Ended · Winner!
              </div>
              {/* Winner card */}
              {showWinner && (
                <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,.08),rgba(34,197,94,.05))",
                  border:"1.5px solid rgba(255,215,0,.35)", borderRadius:12,
                  padding:"8px 14px", marginBottom:8,
                  boxShadow:`0 0 ${20+pulse*22}px rgba(255,215,0,.14)`,
                  animation:"fadeUp .4s ease both" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                    gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:20 }}>🇸🇦</span>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Khalid</span>
                  </div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:900,
                    color:"#22C55E", letterSpacing:"-1px", marginBottom:1 }}>+47.3%</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.3)" }}>Highest gain · XAUUSD</div>
                </div>
              )}
              {/* Reward choice — EQUAL emphasis */}
              {showReward && (
                <div style={{ animation:"fadeUp .4s ease both" }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase",
                    color:"rgba(255,255,255,.3)", marginBottom:5 }}>Choose your reward</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                    {/* Cashout — shown first, equal size */}
                    <div style={{ background:"rgba(34,197,94,.08)",
                      border:`1.5px solid rgba(34,197,94,${0.35+pulse2*0.25})`,
                      borderRadius:10, padding:"9px 5px",
                      boxShadow:`0 0 ${8+pulse2*14}px rgba(34,197,94,.2)`,
                      animation:"fadeUp .3s .1s ease both" }}>
                      <div style={{ fontSize:9, color:"rgba(34,197,94,.7)", fontWeight:800,
                        textTransform:"uppercase", letterSpacing:".08em", marginBottom:3 }}>INSTANT</div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22,
                        fontWeight:900, color:"#22C55E",
                        textShadow:`0 0 ${6+pulse2*8}px rgba(34,197,94,.6)` }}>$500</div>
                      <div style={{ fontSize:8, color:"rgba(255,255,255,.35)", marginTop:2, lineHeight:1.4 }}>
                        USDT cashout<br/><span style={{color:"rgba(34,197,94,.5)"}}>80% of pool</span>
                      </div>
                    </div>
                    {/* Funded account */}
                    <div style={{ background:"rgba(255,215,0,.07)",
                      border:`1.5px solid rgba(255,215,0,${0.35+pulse*0.25})`,
                      borderRadius:10, padding:"9px 5px",
                      boxShadow:`0 0 ${8+pulse*14}px rgba(255,215,0,.2)`,
                      animation:"fadeUp .3s .2s ease both" }}>
                      <div style={{ fontSize:9, color:"rgba(255,215,0,.7)", fontWeight:800,
                        textTransform:"uppercase", letterSpacing:".08em", marginBottom:3 }}>FUNDED</div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22,
                        fontWeight:900, color:"#FFD700",
                        textShadow:`0 0 ${6+pulse*8}px rgba(255,215,0,.6)` }}>$562</div>
                      <div style={{ fontSize:8, color:"rgba(255,255,255,.35)", marginTop:2, lineHeight:1.4 }}>
                        Broker account<br/><span style={{color:"rgba(255,215,0,.5)"}}>90% of pool</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop:6, fontSize:8, color:"rgba(255,255,255,.18)" }}>
                    25 traders × $25 = $625 prize pool
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating stat badges */}
      <div style={{ position:"absolute", top:"6%", left:"-10%",
        background:"rgba(6,9,18,.95)", border:"1px solid rgba(34,197,94,.35)",
        borderRadius:12, padding:"8px 13px", animation:"floatA 4s ease-in-out infinite" }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:17, fontWeight:900,
          color:"#22C55E", lineHeight:1 }}>
          {phase===0 ? `${joinedCount}/25` : phase===1 ? "25/25" : "🏆"}
        </div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", marginTop:1 }}>
          {phase===0 ? "Joining" : phase===1 ? "Full Battle" : "Champion"}
        </div>
      </div>

      <div style={{ position:"absolute", top:"10%", right:"-10%",
        background:"rgba(6,9,18,.95)", border:"1px solid rgba(255,215,0,.35)",
        borderRadius:12, padding:"8px 13px", animation:"floatB 4s ease-in-out infinite" }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:17, fontWeight:900,
          color:"#FFD700", lineHeight:1 }}>$25</div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", marginTop:1 }}>Start from</div>
      </div>

      <div style={{ position:"absolute", bottom:"8%", left:"-10%",
        background:"rgba(6,9,18,.95)", border:"1px solid rgba(255,215,0,.35)",
        borderRadius:12, padding:"8px 13px", animation:"floatC 5s ease-in-out infinite" }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:17, fontWeight:900,
          color:"#FFD700", lineHeight:1 }}>90m</div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", marginTop:1 }}>Battle Time</div>
      </div>

      {/* Phase dots */}
      <div style={{ position:"absolute", bottom:"-30px", left:"50%",
        transform:"translateX(-50%)", display:"flex", gap:6, alignItems:"center" }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ height:5, borderRadius:3, transition:"all .4s ease",
            width: i===phase ? 22 : 5,
            background: i===phase ? "#FFD700" : "rgba(255,255,255,.15)" }}/>
        ))}
      </div>

      <style>{`
        @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes popIn     { from{opacity:0;transform:scale(.2)} to{opacity:1;transform:scale(1)} }
        @keyframes bounceIn  { 0%{transform:scale(.2)} 50%{transform:scale(1.18)} 75%{transform:scale(.93)} 100%{transform:scale(1)} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes floatA    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes floatB    { 0%,100%{transform:translateY(-4px)} 50%{transform:translateY(5px)} }
        @keyframes floatC    { 0%,100%{transform:translateY(2px)} 50%{transform:translateY(-7px)} }
        @keyframes glowGold  { from{box-shadow:0 0 0 rgba(255,215,0,0)} to{box-shadow:0 0 12px rgba(255,215,0,.15)} }
      `}</style>
    </div>
  );
}
