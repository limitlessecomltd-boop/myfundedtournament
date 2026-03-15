"use client";
import { useEffect, useRef } from "react";

interface BulletTrainProps {
  joined: number;
  max: number;
  fee: number;
  tier: "starter" | "pro";
  isActive?: boolean;
}

export function BulletTrain({ joined: joinedRaw, max: maxRaw, fee, tier, isActive = false }: BulletTrainProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const joined = parseInt(String(joinedRaw)) || 0;
  const max = parseInt(String(maxRaw)) || 25;
  const color = tier === "pro" ? "#22C55E" : "#FFD700";
  const pct = Math.min(1, joined / max);
  const isFull = joined >= max;
  const spotsLeft = max - joined;
  const pool = joined * fee;
  const prize = Math.floor(pool * 0.9);

  // How many carriages to show (max 6 visible)
  const visibleCars = Math.min(max, 6);
  const filledCars = Math.round(pct * visibleCars);

  const W = 560;   // viewBox width
  const H = 160;   // viewBox height
  const railY = 128;
  const carW = 52, carH = 38, carGap = 6;
  const locoW = 90, locoX = 12;
  const carStartX = locoX + locoW + carGap;

  return (
    <div style={{ width: "100%" }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Track sleepers */}
        {Array.from({ length: 22 }, (_, i) => (
          <rect
            key={i}
            x={10 + i * 24} y={railY + 8}
            width={14} height={6} rx={1}
            fill="rgba(255,255,255,.12)"
          />
        ))}
        {/* Rails */}
        <line x1={10} y1={railY + 5} x2={W - 10} y2={railY + 5}
          stroke="rgba(255,255,255,.25)" strokeWidth={2.5} strokeLinecap="round"/>
        <line x1={10} y1={railY + 11} x2={W - 10} y2={railY + 11}
          stroke="rgba(255,255,255,.25)" strokeWidth={2.5} strokeLinecap="round"/>

        {/* Station buffer at end */}
        <line x1={W - 16} y1={railY - 10} x2={W - 16} y2={railY + 20}
          stroke="rgba(255,255,255,.4)" strokeWidth={3} strokeLinecap="round"/>
        <rect x={W - 22} y={railY - 10} width={14} height={4} rx={2}
          fill="rgba(255,255,255,.3)"/>

        {/* Smoke puffs (animated) */}
        {[0, 1, 2].map(i => (
          <circle key={i} cx={locoX + 16} cy={60} r={5 + i * 2}
            fill="rgba(255,255,255,.15)"
            style={{
              animation: `smoke${i} ${1.2 + i * 0.4}s ease-out infinite`,
              animationDelay: `${i * 0.4}s`
            }}
          />
        ))}

        {/* ── LOCOMOTIVE ── */}
        {/* Main body */}
        <rect x={locoX} y={76} width={locoW} height={44} rx={8}
          fill="#0f1628" stroke={color} strokeWidth={1.5} strokeOpacity={0.8}/>
        {/* Nose */}
        <path d={`M${locoX + locoW},82 L${locoX + locoW + 22},92 L${locoX + locoW + 22},108 L${locoX + locoW},120 Z`}
          fill="#0a0f1e" stroke={color} strokeWidth={1} strokeOpacity={0.6}/>
        {/* Gold top stripe */}
        <rect x={locoX} y={76} width={locoW + 22} height={4} rx={2} fill={color} opacity={0.9}/>
        {/* Cab window */}
        <rect x={locoX + 6} y={82} width={28} height={20} rx={4}
          fill="#1a3a6a" stroke="#4a7acc" strokeWidth={0.5}/>
        <rect x={locoX + 10} y={85} width={10} height={8} rx={2}
          fill="#5a9aee" opacity={0.5}/>
        {/* MFT logo plate */}
        <rect x={locoX + 40} y={85} width={36} height={20} rx={3} fill={color}/>
        <text x={locoX + 58} y={99} textAnchor="middle"
          style={{ fontSize: 9, fontWeight: 900, fill: "#000", fontFamily: "system-ui" }}>
          MFT
        </text>
        {/* Headlight */}
        <circle cx={locoX + locoW + 22} cy={100} r={5} fill="#FFF9C4" opacity={0.9}/>
        <circle cx={locoX + locoW + 22} cy={100} r={3} fill="#fff"/>
        {/* Chimney */}
        <rect x={locoX + 20} y={64} width={11} height={14} rx={3}
          fill="#0f1628" stroke={color} strokeWidth={0.5} strokeOpacity={0.5}/>
        {/* Loco wheels */}
        {[locoX + 18, locoX + 50, locoX + 78].map((wx, i) => (
          <g key={i} style={{ transformOrigin: `${wx}px ${railY + 2}px`,
            animation: "wheelSpin 0.6s linear infinite" }}>
            <circle cx={wx} cy={railY + 2} r={9} fill="#1a1a2e" stroke="#555" strokeWidth={1}/>
            <line x1={wx} y1={railY - 7} x2={wx} y2={railY + 11}
              stroke="#777" strokeWidth={1.5}/>
            <line x1={wx - 8} y1={railY + 2} x2={wx + 8} y2={railY + 2}
              stroke="#777" strokeWidth={1.5}/>
            <circle cx={wx} cy={railY + 2} r={2} fill="#aaa"/>
          </g>
        ))}

        {/* ── CARRIAGES ── */}
        {Array.from({ length: visibleCars }, (_, i) => {
          const cx = carStartX + i * (carW + carGap);
          const filled = i < filledCars;
          const traderNum = Math.round((i / visibleCars) * joined) + 1;
          return (
            <g key={i}>
              {/* Car body */}
              <rect x={cx} y={82} width={carW} height={carH} rx={5}
                fill={filled ? "#0d1a2e" : "rgba(255,255,255,.04)"}
                stroke={filled ? color : "rgba(255,255,255,.12)"}
                strokeWidth={filled ? 1.5 : 0.5}/>
              {/* Gold stripe if filled */}
              {filled && (
                <rect x={cx} y={82} width={carW} height={3.5} rx={1.5} fill={color} opacity={0.8}/>
              )}
              {/* Windows */}
              {[0, 1, 2].map(w => {
                const wx = cx + 5 + w * 14;
                return (
                  <rect key={w} x={wx} y={88} width={10} height={8} rx={2}
                    fill={filled ? "#1e4080" : "rgba(255,255,255,.05)"}
                    stroke={filled ? "#3a70cc" : "rgba(255,255,255,.1)"}
                    strokeWidth={0.5}
                    opacity={filled ? 0.75 : 0.5}/>
                );
              })}
              {/* Trader number OR empty seat */}
              {filled ? (
                <text x={cx + carW / 2} y={112} textAnchor="middle"
                  style={{ fontSize: 8, fontWeight: 700, fill: color, fontFamily: "system-ui" }}>
                  #{Math.ceil(((i + 1) / visibleCars) * joined)}
                </text>
              ) : (
                <text x={cx + carW / 2} y={112} textAnchor="middle"
                  style={{ fontSize: 10, fill: "rgba(255,255,255,.2)", fontFamily: "system-ui" }}>
                  ?
                </text>
              )}
              {/* Wheels */}
              {[cx + 10, cx + carW - 12].map((wx, wi) => (
                <g key={wi} style={{ transformOrigin: `${wx}px ${railY + 2}px`,
                  animation: filled ? "wheelSpin 0.6s linear infinite" : "none" }}>
                  <circle cx={wx} cy={railY + 2} r={7}
                    fill={filled ? "#1a1a2e" : "rgba(255,255,255,.06)"}
                    stroke={filled ? "#555" : "rgba(255,255,255,.1)"}
                    strokeWidth={1}/>
                  <line x1={wx} y1={railY - 5} x2={wx} y2={railY + 9}
                    stroke={filled ? "#777" : "rgba(255,255,255,.1)"} strokeWidth={1.5}/>
                  <line x1={wx - 6} y1={railY + 2} x2={wx + 6} y2={railY + 2}
                    stroke={filled ? "#777" : "rgba(255,255,255,.1)"} strokeWidth={1.5}/>
                </g>
              ))}
              {/* Coupler */}
              {i < visibleCars - 1 && (
                <rect x={cx + carW} y={97} width={carGap} height={5} rx={1}
                  fill="rgba(255,255,255,.2)"/>
              )}
            </g>
          );
        })}

        {/* More carriages indicator */}
        {max > visibleCars && (
          <text
            x={carStartX + visibleCars * (carW + carGap) + 8}
            y={102}
            style={{ fontSize: 10, fill: "rgba(255,255,255,.3)", fontFamily: "system-ui" }}>
            +{max - visibleCars} more
          </text>
        )}

        {/* Progress rail fill */}
        <line
          x1={10} y1={railY + 8} x2={10 + (W - 30) * pct} y2={railY + 8}
          stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeLinecap="round"
        />
      </svg>

      {/* CSS animations */}
      <style>{`
        @keyframes wheelSpin { to { transform: rotate(360deg); } }
        @keyframes smoke0 { 0%{transform:translate(0,0) scale(1);opacity:.5} 100%{transform:translate(-20px,-28px) scale(2);opacity:0} }
        @keyframes smoke1 { 0%{transform:translate(0,0) scale(1);opacity:.4} 100%{transform:translate(-28px,-36px) scale(2.5);opacity:0} }
        @keyframes smoke2 { 0%{transform:translate(0,0) scale(1);opacity:.3} 100%{transform:translate(-14px,-24px) scale(1.8);opacity:0} }
      `}</style>

      {/* Stats row below train */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 8, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
          <span style={{ color, fontWeight: 700 }}>{joined}</span>
          <span style={{ color: "rgba(255,255,255,.3)" }}> / {max} traders boarded</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
          {isFull
            ? <span style={{ color: "#22C55E", fontWeight: 700 }}>🚀 Departing in 5 min!</span>
            : <span style={{ color }}>⚡ {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
          }
        </div>
      </div>
      {pool > 0 && (
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
            Prize pool: <span style={{ color, fontWeight: 700 }}>${pool.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
            1st prize: <span style={{ color: "#FFD700", fontWeight: 700 }}>${prize.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
