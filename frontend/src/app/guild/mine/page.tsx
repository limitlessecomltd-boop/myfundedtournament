"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { guildApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const fmt  = (n: number, d=2) => parseFloat((n||0).toFixed(d)).toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmt0 = (n: number)      => fmt(n, 0);

// ── Tier helpers ──────────────────────────────────────────────────────────────
const REBATE_TIERS = [
  { min:2001, max:Infinity, pct:50, label:"$2,001–$5,000+", color:"#8B5CF6" },
  { min:1001, max:2000,     pct:40, label:"$1,001–$2,000",  color:"#3B82F6" },
  { min:501,  max:1000,     pct:30, label:"$501–$1,000",    color:"#22C55E" },
  { min:1,    max:500,      pct:15, label:"$1–$500",        color:"#FFD700" },
];
const MONTHLY_TIERS = [
  { min:500000, bonus:10000, label:"$500,000+",  color:"#8B5CF6" },
  { min:100000, bonus:1500,  label:"$100,000+",  color:"#3B82F6" },
  { min:50000,  bonus:600,   label:"$50,000+",   color:"#22C55E" },
  { min:25000,  bonus:250,   label:"$25,000+",   color:"#FFA500" },
  { min:10000,  bonus:100,   label:"$10,000+",   color:"#FFD700" },
];

function getRebateTier(pool: number) {
  return REBATE_TIERS.find(t => pool >= t.min && pool <= t.max) || null;
}
function getMonthlyTier(vol: number) {
  return MONTHLY_TIERS.find(t => vol >= t.min) || null;
}

export default function MyGuildBattlesPage() {
  const { user } = useAuth();
  const [tab,        setTab]       = useState<"battles"|"rebates">("battles");
  const [battles,    setBattles]   = useState<any[]>([]);
  const [summary,    setSummary]   = useState<any>(null);
  const [rebateData, setRebateData]= useState<any>(null);
  const [loading,    setLoading]   = useState(true);
  const [copied,     setCopied]    = useState<string|null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      guildApi.getMine(),
      guildApi.getRebates().catch(() => null),
    ]).then(([mine, rebates]) => {
      setBattles(Array.isArray(mine) ? mine : mine.data || []);
      if (mine.summary) setSummary(mine.summary);
      if (rebates) setRebateData(rebates);
    }).finally(() => setLoading(false));
  }, [user]);

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/tournaments/${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusColor: Record<string,string> = {
    registration:"#FFD700", active:"#22C55E", ended:"rgba(255,255,255,.3)", cancelled:"#EF4444"
  };

  // ── Monthly progress calc ──
  const monthlyVol  = parseFloat(rebateData?.currentMonth?.volume || 0);
  const nextTier    = MONTHLY_TIERS.slice().reverse().find(t => monthlyVol < t.min);
  const currentTier = getMonthlyTier(monthlyVol);
  const progressPct = nextTier
    ? Math.min(100, (monthlyVol / nextTier.min) * 100)
    : 100;

  return (
    <div style={{ background:"#050810", minHeight:"100vh" }}>
      <style>{`
        .mine-wrap{max-width:980px;margin:0 auto;padding:40px 24px;}
        .comm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
        .comm-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:20px;}
        .battle-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,100,0,.18);border-radius:16px;padding:22px 24px;margin-bottom:12px;transition:border-color .2s;}
        .battle-card:hover{border-color:rgba(255,100,0,.4);}
        .tab-btn{padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;border:1px solid transparent;cursor:pointer;transition:all .2s;letter-spacing:.04em;background:transparent;}
        .tab-btn.active{background:rgba(255,215,0,.1);border-color:rgba(255,215,0,.3);color:#FFD700;}
        .tab-btn:not(.active){color:rgba(255,255,255,.4);border-color:rgba(255,255,255,.08);}
        .tab-btn:not(.active):hover{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.2);}
        .rebate-card{background:rgba(13,18,29,.95);border:1px solid rgba(255,215,0,.12);border-radius:14px;padding:18px 20px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
        .tier-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.06em;}
        .progress-bar{height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;margin-top:8px;}
        .progress-fill{height:100%;border-radius:4px;transition:width .6s ease;}
        @media(max-width:900px){.comm-grid{grid-template-columns:1fr 1fr;}}
        @media(max-width:560px){.mine-wrap{padding:16px 12px;}.comm-grid{grid-template-columns:1fr 1fr;gap:10px;}}
      `}</style>

      <div className="mine-wrap">
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,100,0,.7)", marginBottom:6 }}>🔥 Guild Master</div>
            <h1 style={{ fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", fontSize:26, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
              My Guild Battles
            </h1>
          </div>
          <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff", fontWeight:800 }}>
            + Create New Battle
          </Link>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="comm-grid">
            <div className="comm-card" style={{ borderColor:"rgba(255,100,0,.25)", background:"rgba(255,100,0,.04)" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,100,0,.6)", marginBottom:6 }}>Total Earned</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:900, color:"#FF6400", lineHeight:1 }}>${fmt(parseFloat(summary.total_earned||0))}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>Commissions · USDT</div>
            </div>
            <div className="comm-card">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,215,0,.5)", marginBottom:6 }}>Rebates Earned</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:900, color:"#FFD700", lineHeight:1 }}>
                ${fmt(parseFloat(rebateData?.summary?.total_rebates||0))}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>
                {rebateData?.summary?.pending_count||0} pending rebates
              </div>
            </div>
            <div className="comm-card">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(96,165,250,.5)", marginBottom:6 }}>Total Battles</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:900, color:"#60a5fa", lineHeight:1 }}>{summary.total_battles||0}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>{summary.completed_battles||0} completed</div>
            </div>
            <div className="comm-card">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(34,197,94,.5)", marginBottom:6 }}>30d Volume</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:900, color:"#22C55E", lineHeight:1 }}>${fmt0(monthlyVol)}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4 }}>prize pool generated</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          <button className={`tab-btn${tab==="battles"?" active":""}`} onClick={() => setTab("battles")}>
            ⚔️ Battles & Commissions
          </button>
          <button className={`tab-btn${tab==="rebates"?" active":""}`} onClick={() => setTab("rebates")}>
            💰 Organiser Rebates
            {(rebateData?.summary?.pending_count||0) > 0 && (
              <span style={{ marginLeft:6, background:"#FFD700", color:"#000", fontSize:10, fontWeight:800, padding:"1px 7px", borderRadius:20 }}>
                {rebateData.summary.pending_count}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}><div className="spinner"/></div>
        ) : tab === "battles" ? (

          /* ═══ BATTLES TAB ═══════════════════════════════════════════════════ */
          battles.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px", border:"1px dashed rgba(255,100,0,.2)", borderRadius:16 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔥</div>
              <div style={{ fontSize:16, color:"rgba(255,255,255,.5)", marginBottom:20 }}>No Guild Battles yet</div>
              <Link href="/guild" className="btn" style={{ background:"#FF6400", color:"#fff", fontWeight:700 }}>
                Create Your First Battle →
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.25)", marginBottom:14 }}>
                Battle History & Commissions
              </div>
              {battles.map(b => {
                const pool       = parseFloat(b.prize_pool || 0);
                const orgPct     = parseFloat(b.organiser_pct || 0);
                const commission = parseFloat(b.commission_earned || (pool * orgPct / 100) || 0);
                const entries    = parseInt(b.active_entries || 0);
                const isPaid     = b.status === "ended";
                const rebateTier = getRebateTier(pool);
                const entryFee   = parseFloat(b.entry_fee || 0);
                const rebateAmt  = rebateTier ? (entryFee * rebateTier.pct / 100) : 0;

                return (
                  <div key={b.id} className="battle-card">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20,
                            background:`${statusColor[b.status]||"#fff"}18`, border:`1px solid ${statusColor[b.status]||"#fff"}40`,
                            color:statusColor[b.status]||"#fff", textTransform:"capitalize" }}>{b.status}</span>
                          <span style={{ fontSize:10, color:"rgba(255,100,0,.6)", fontWeight:700 }}>🔥 Guild</span>
                          {rebateTier && pool > 0 && (
                            <span className="tier-badge" style={{ background:`${rebateTier.color}18`, border:`1px solid ${rebateTier.color}40`, color:rebateTier.color }}>
                              {rebateTier.pct}% rebate tier
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.name}</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
                          {entries}/{b.max_entries} traders · ${b.entry_fee} entry · ${fmt0(pool)} prize pool
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        {/* Commission box */}
                        <div style={{ background:isPaid?"rgba(34,197,94,.06)":"rgba(255,100,0,.06)",
                          border:`1px solid ${isPaid?"rgba(34,197,94,.2)":"rgba(255,100,0,.2)"}`,
                          borderRadius:10, padding:"12px 16px", textAlign:"right", minWidth:120 }}>
                          <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
                            color:isPaid?"rgba(34,197,94,.6)":"rgba(255,100,0,.6)", marginBottom:4 }}>
                            {isPaid?"✅ Commission":"⏳ Commission"}
                          </div>
                          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:900,
                            color:isPaid?"#22C55E":"#FF6400", lineHeight:1 }}>${fmt(commission)}</div>
                          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:3 }}>{orgPct}% organiser cut</div>
                        </div>
                        {/* Rebate box */}
                        {rebateTier && pool > 0 && (
                          <div style={{ background:"rgba(255,215,0,.05)", border:"1px solid rgba(255,215,0,.2)",
                            borderRadius:10, padding:"12px 16px", textAlign:"right", minWidth:120 }}>
                            <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
                              color:"rgba(255,215,0,.6)", marginBottom:4 }}>💰 Entry Rebate</div>
                            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:900,
                              color:"#FFD700", lineHeight:1 }}>${fmt(rebateAmt)}</div>
                            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:3 }}>{rebateTier.pct}% of ${b.entry_fee}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {b.status === "registration" && (
                      <div style={{ marginTop:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.3)", marginBottom:4 }}>
                          <span>{entries}/{b.max_entries} spots filled</span>
                          <span style={{ color:"#FF6400" }}>{b.max_entries - entries} left</span>
                        </div>
                        <div style={{ height:4, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:2, background:"#FF6400",
                            width:`${Math.min(100,(entries/b.max_entries)*100)}%` }}/>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop:14, display:"flex", gap:8, flexWrap:"wrap" }}>
                      <Link href={`/tournaments/${b.id}`} className="btn btn-ghost btn-sm">View Battle →</Link>
                      <button onClick={() => copyLink(b.id)} className="btn btn-ghost btn-sm"
                        style={{ color:"#FF6400", borderColor:"rgba(255,100,0,.3)" }}>
                        {copied === b.id ? "✓ Copied!" : "📋 Copy Link"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )

        ) : (

          /* ═══ REBATES TAB ════════════════════════════════════════════════════ */
          <div>

            {/* Monthly Volume Progress */}
            <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,215,0,.2)", borderRadius:16, padding:24, marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,215,0,.5)", marginBottom:6 }}>
                    📊 30-Day Volume Progress
                  </div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:30, fontWeight:900, color:"#FFD700", lineHeight:1, letterSpacing:"-1px" }}>
                    ${fmt0(monthlyVol)}
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:4 }}>prize pool generated in last 30 days</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  {currentTier ? (
                    <div style={{ background:`${currentTier.color}18`, border:`1px solid ${currentTier.color}40`,
                      borderRadius:10, padding:"10px 16px" }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:`${currentTier.color}`, marginBottom:4 }}>
                        Current Tier
                      </div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:900, color:currentTier.color, lineHeight:1 }}>
                        +${fmt0(currentTier.bonus)}
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:3 }}>monthly bonus</div>
                    </div>
                  ) : (
                    <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"10px 16px", textAlign:"center" }}>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>No tier yet</div>
                      <div style={{ fontSize:11, color:"rgba(255,215,0,.5)", marginTop:4 }}>Need ${fmt0(10000 - monthlyVol)} more</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar to next tier */}
              {nextTier && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:6 }}>
                    <span>Progress to {nextTier.label} tier (+${fmt0(nextTier.bonus)} bonus)</span>
                    <span style={{ color:"#FFD700" }}>${fmt0(nextTier.min - monthlyVol)} remaining</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${progressPct}%`, background:"linear-gradient(90deg,#FFD700,#FFA500)" }}/>
                  </div>
                </div>
              )}
              {!nextTier && currentTier && (
                <div style={{ textAlign:"center", padding:"8px", background:"rgba(139,92,246,.08)", border:"1px solid rgba(139,92,246,.2)", borderRadius:8 }}>
                  <span style={{ fontSize:13, color:"#8B5CF6", fontWeight:700 }}>🏆 Maximum tier reached! Earning +${fmt0(currentTier.bonus)}/month</span>
                </div>
              )}
            </div>

            {/* Tier tables side by side */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
              {/* Entry Rebate Tiers */}
              <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:20 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,215,0,.6)", marginBottom:14 }}>
                  💰 Entry Rebate Tiers
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:12 }}>
                  Based on prize pool per battle
                </div>
                {REBATE_TIERS.map(t => (
                  <div key={t.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"10px 12px", borderRadius:8, marginBottom:6,
                    background: getRebateTier(monthlyVol)?.label === t.label ? `${t.color}12` : "rgba(255,255,255,.02)",
                    border:`1px solid ${t.color}22` }}>
                    <span style={{ fontSize:13, color:"rgba(255,255,255,.6)" }}>{t.label}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:t.color }}>{t.pct}% back</span>
                  </div>
                ))}
                <div style={{ marginTop:10, padding:"10px 12px", background:"rgba(255,215,0,.04)", border:"1px solid rgba(255,215,0,.1)", borderRadius:8, fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>
                  Rebate applies to your <strong style={{ color:"#fff" }}>own entry fee</strong> as the organiser when you join your own battle.
                </div>
              </div>

              {/* Monthly Volume Tiers */}
              <div style={{ background:"rgba(13,18,29,.95)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:20 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(34,197,94,.6)", marginBottom:14 }}>
                  🚀 Monthly Volume Bonuses
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:12 }}>
                  30-day rolling prize pool total
                </div>
                {MONTHLY_TIERS.slice().reverse().map(t => {
                  const isActive = monthlyVol >= t.min;
                  return (
                    <div key={t.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"10px 12px", borderRadius:8, marginBottom:6,
                      background: isActive ? `${t.color}12` : "rgba(255,255,255,.02)",
                      border:`1px solid ${t.color}${isActive?"44":"18"}` }}>
                      <div>
                        <span style={{ fontSize:13, color: isActive ? "#fff" : "rgba(255,255,255,.5)" }}>{t.label}</span>
                        {isActive && <span style={{ marginLeft:6, fontSize:10, color:t.color, fontWeight:700 }}>✓ ACTIVE</span>}
                      </div>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:t.color }}>+${fmt0(t.bonus)}</span>
                    </div>
                  );
                })}
                <div style={{ marginTop:10, padding:"10px 12px", background:"rgba(34,197,94,.04)", border:"1px solid rgba(34,197,94,.1)", borderRadius:8, fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>
                  Bonuses are <strong style={{ color:"#fff" }}>net of previous tier</strong>. Paid monthly in addition to all commissions.
                </div>
              </div>
            </div>

            {/* Rebate History */}
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.25)", marginBottom:14 }}>
                Rebate History
              </div>
              {(!rebateData?.rebates || rebateData.rebates.length === 0) ? (
                <div style={{ textAlign:"center", padding:"40px 20px", border:"1px dashed rgba(255,215,0,.12)", borderRadius:12 }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>💰</div>
                  <div style={{ fontSize:15, color:"rgba(255,255,255,.4)", marginBottom:8 }}>No rebates yet</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.25)", lineHeight:1.7 }}>
                    Host battles that generate $500+ prize pools<br/>to start earning entry rebates automatically.
                  </div>
                </div>
              ) : (
                rebateData.rebates.map((r: any) => {
                  const tier = REBATE_TIERS.find(t => t.pct === parseFloat(r.rebate_pct));
                  return (
                    <div key={r.id} className="rebate-card">
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                          <span style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{r.battle_name}</span>
                          {tier && (
                            <span className="tier-badge" style={{ background:`${tier.color}18`, border:`1px solid ${tier.color}40`, color:tier.color }}>
                              {tier.label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
                          Prize pool: ${fmt(parseFloat(r.prize_pool))} · Entry fee: ${fmt(parseFloat(r.entry_fee))} · {r.rebate_pct}% rebate
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:900,
                          color: r.status==="paid" ? "#22C55E" : "#FFD700", lineHeight:1 }}>
                          +${fmt(parseFloat(r.rebate_amount))}
                        </div>
                        <div style={{ fontSize:10, marginTop:3,
                          color: r.status==="paid" ? "rgba(34,197,94,.6)" : "rgba(255,215,0,.6)",
                          fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" }}>
                          {r.status === "paid" ? "✅ Paid" : "⏳ Pending"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Monthly Bonus History */}
            {rebateData?.bonuses?.length > 0 && (
              <div style={{ marginTop:24 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.25)", marginBottom:14 }}>
                  Monthly Bonus History
                </div>
                {rebateData.bonuses.map((b: any) => (
                  <div key={b.id} className="rebate-card" style={{ borderColor:"rgba(34,197,94,.15)" }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:4 }}>
                        Volume Bonus — {b.tier_label}
                      </div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
                        ${fmt0(parseFloat(b.prize_volume))} volume · {new Date(b.period_start).toLocaleDateString()} – {new Date(b.period_end).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:900, color:"#22C55E", lineHeight:1 }}>
                        +${fmt0(parseFloat(b.bonus_amount))}
                      </div>
                      <div style={{ fontSize:10, marginTop:3, color:"rgba(34,197,94,.6)", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" }}>
                        {b.status === "paid" ? "✅ Paid" : "⏳ Pending"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
