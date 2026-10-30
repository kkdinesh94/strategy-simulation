import React, { useState } from "react";
import { TeamState, GameState } from "../../types/simulation";
import { SEGMENTS, CLAIMS } from "../../engine/catalog";
import { claimAudit, mediaEffectOf, AD_K, AW_DECAY } from "../../engine/simulationEngine";
import { AlertTriangle, CheckCircle2, XCircle, Scale } from "lucide-react";
import { AdCreative, AdFormat } from "../AdCreative";
import { MarketPositionMap } from "../MarketPositionMap";
import { SectionTabs } from "../SectionTabs";
import MediaPlanner from "../MediaPlanner";
import FastTestReport from "../FastTestReport";
import MarketSurveyReport from "../MarketSurveyReport";

interface MarketingTabProps {
  team: TeamState;
  gameState: GameState;
  onChange: (updatedTeam: TeamState) => void;
  onNotify: (msg: string) => void;
  universeId: string;
}

const SEG_COLORS: Record<string, string> = { S1: "#3B82F6", S2: "#10B981", S3: "#22C55E", S4: "#F59E0B", S5: "#8B5CF6" };

type Drawer = "media" | "position" | "survey" | "research";

export const MarketingTab: React.FC<MarketingTabProps> = ({ team, gameState, onChange, onNotify, universeId }) => {
  const isLocked = team.dec.locked;
  const isEarlyGame = gameState.quarter <= 3;
  const adCap = isEarlyGame ? 300 : 800;
  const [format, setFormat] = useState<AdFormat>("billboard");
  const [drawer, setDrawer] = useState<Drawer>(gameState.quarter === 1 ? "survey" : "media");
  const flagship = team.models.slice().sort((a, b) => b.price - a.price)[0];
  const [featuredId, setFeaturedId] = useState<string | undefined>(flagship?.id);
  const featured = team.models.find((m) => m.id === featuredId) || flagship;

  const handleAdBudgetChange = (val: number) => {
    if (isLocked) return;
    onChange({ ...team, dec: { ...team.dec, ad: Math.max(0, Math.min(adCap, val)) } });
  };

  const handleClaimToggle = (claimKey: string) => {
    if (isLocked) return;
    const currentClaims = team.dec.claims || [];
    if (currentClaims.includes(claimKey)) {
      onChange({ ...team, dec: { ...team.dec, claims: currentClaims.filter((k) => k !== claimKey) } });
    } else if (currentClaims.length >= 2) {
      onNotify("Maximum 2 claims allowed per advertising campaign.");
    } else {
      onChange({ ...team, dec: { ...team.dec, claims: [...currentClaims, claimKey] } });
    }
  };

  const handleAllocChange = (segId: string, pct: number) => {
    if (isLocked) return;
    onChange({ ...team, dec: { ...team.dec, alloc: { ...team.dec.alloc, [segId]: Math.max(0, Math.min(100, Math.round(pct))) } } });
  };

  // Scale the mix proportionally so it sums to exactly 100%
  const normaliseAlloc = () => {
    if (isLocked) return;
    const sum = SEGMENTS.reduce((x, s) => x + (team.dec.alloc[s.id] || 0), 0);
    if (sum <= 0) return;
    const next: Record<string, number> = {};
    let used = 0;
    SEGMENTS.forEach((s, i) => {
      next[s.id] = i === SEGMENTS.length - 1 ? 100 - used : Math.round(((team.dec.alloc[s.id] || 0) / sum) * 100);
      used += next[s.id];
    });
    onChange({ ...team, dec: { ...team.dec, alloc: next } });
  };

  const handleResearchToggle = (field: "buyIntel" | "buyClinic") => {
    if (isLocked) return;
    onChange({ ...team, dec: { ...team.dec, [field]: !team.dec[field] } });
  };

  const handleBenchmarkWalletChange = (value: number) => {
    if (isLocked) return;
    onChange({ ...team, dec: { ...team.dec, market_research_budget: Math.max(0, value) } });
  };

  const claims = team.dec.claims || [];
  const auditAll = claimAudit(team, Object.keys(CLAIMS));
  const refused = claims.filter((c) => auditAll[c]);
  const totalAlloc = SEGMENTS.reduce((x, s) => x + (team.dec.alloc[s.id] || 0), 0);

  const segRows = SEGMENTS.map((s) => {
    const fx = mediaEffectOf(team, s);
    const now = team.aw[s.id] || 0;
    // Projection before word of mouth, using the engine's own media response
    const next = Math.max(0.02, Math.min(0.97, now + (1 - now) * fx.me - AW_DECAY * now));
    return { s, ...fx, now, next };
  });
  const avgNow = segRows.reduce((x, r) => x + r.now * r.s.pct, 0);
  const avgNext = segRows.reduce((x, r) => x + r.next * r.s.pct, 0);

  // Diminishing-returns curve for one segment's spend, 0..cap
  const curveW = 300;
  const curveH = 84;
  const curveMax = 300;
  const cx = (spend: number) => 8 + (Math.min(curveMax, spend) / curveMax) * (curveW - 16);
  const cy = (spend: number) => curveH - 14 - (1 - Math.exp(-spend / AD_K)) * (curveH - 24);
  const curvePath = Array.from({ length: 61 }, (_, i) => {
    const sp = (i / 60) * curveMax;
    return `${i ? "L" : "M"}${cx(sp).toFixed(1)},${cy(sp).toFixed(1)}`;
  }).join(" ");

  const kpis = [
    { label: "Media budget", value: `Rs. ${team.dec.ad} L`, note: `cap Rs. ${adCap} L`, tone: "text-[#1F2022]" },
    {
      label: "Claim audit",
      value: claims.length === 0 ? "No claims" : refused.length ? `${refused.length} refused` : "Cleared",
      note: claims.length ? claims.map((c) => CLAIMS[c].split(" ")[0]).join(" + ") : "generic copy, x0.9",
      tone: refused.length ? "text-red-600" : claims.length ? "text-emerald-700" : "text-[#5A5C60]"
    },
    { label: "Audience mix", value: `${totalAlloc}%`, note: totalAlloc === 100 ? "balanced" : "must total 100%", tone: totalAlloc === 100 ? "text-emerald-700" : "text-red-600" },
    { label: "Market awareness", value: `${(avgNow * 100).toFixed(0)}% → ${(avgNext * 100).toFixed(0)}%`, note: "buyer-weighted, next quarter", tone: avgNext >= avgNow ? "text-emerald-700" : "text-amber-700" }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="px-3 py-2.5 bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
            <div className="text-[11px] text-[#6C6D70]">{k.label}</div>
            <div className={`text-base font-bold font-mono ${k.tone}`}>{k.value}</div>
            <div className="text-[10px] text-[#8A8C90] truncate">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-3">
        {/* LEFT: the campaign as the customer sees it, and who it reaches */}
        <div className="space-y-3 min-w-0">
          <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[#1F2022] mr-auto">Campaign preview</h3>
              {team.models.length > 1 && (
                <select
                  value={featured?.id}
                  onChange={(e) => setFeaturedId(e.target.value)}
                  aria-label="Featured model"
                  className="px-2 py-1 text-xs bg-white border border-[#E0DCD3] rounded-lg font-semibold"
                >
                  {team.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.id === flagship?.id ? " (flagship)" : ""}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-1 p-1 bg-[#F3F0EA] rounded-lg">
                {(["billboard", "social", "print"] as AdFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`px-2.5 py-1 rounded-md text-xs capitalize transition ${format === f ? "bg-white font-semibold shadow-sm text-[#1F2022]" : "text-[#5A5C60]"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className={`rounded-lg p-3 ${format === "billboard" ? "bg-[#D9D4CA]" : "bg-[#EEEAE2]"}`}>
              {featured ? (
                <AdCreative team={team} model={featured} claims={claims} audit={auditAll} format={format} quarter={gameState.quarter} />
              ) : (
                <p className="text-xs text-[#5A5C60] p-6 text-center">Design a model first.</p>
              )}
            </div>
            {refused.length > 0 && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <div>
                  The auditor checks claims against your flagship, <strong>{flagship?.name}</strong>. Refused: {refused.map((c) => auditAll[c]).join("; ")}.
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-[#1F2022]">Audience and awareness</h3>
                <p className="text-[11px] text-[#6C6D70]">Projection uses the engine's media response, before word of mouth.</p>
              </div>
              <button
                type="button"
                onClick={normaliseAlloc}
                disabled={isLocked || totalAlloc === 100 || totalAlloc === 0}
                className="px-2.5 py-1 text-[11px] font-semibold border border-[#E0DCD3] rounded-lg flex items-center gap-1 hover:bg-[#FAF8F5] disabled:opacity-40"
              >
                <Scale className="w-3.5 h-3.5" /> Scale to 100%
              </button>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-[#EDE9E1] mb-3" role="img" aria-label="Media mix">
              {SEGMENTS.map((s) => (
                <div key={s.id} style={{ width: `${Math.min(100, team.dec.alloc[s.id] || 0)}%`, background: SEG_COLORS[s.id] }} title={`${s.name}: ${team.dec.alloc[s.id] || 0}%`} />
              ))}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-[#8A8C90] text-left">
                  <th className="font-medium pb-1">Segment</th>
                  <th className="font-medium pb-1 w-[34%]">Share of media</th>
                  <th className="font-medium pb-1 text-right px-2">Rs. L</th>
                  <th className="font-medium pb-1 text-right px-2" title="Ad multiplier from claim fit: 0.8 + 0.8 x fit">Copy fit</th>
                  <th className="font-medium pb-1 w-[26%] pl-3">Awareness now → next</th>
                </tr>
              </thead>
              <tbody>
                {segRows.map((r) => {
                  const isPrim = team.prim === r.s.id;
                  return (
                    <tr key={r.s.id} className="border-t border-[#F3F0EA]">
                      <td className="py-1.5 pr-2">
                        <span className="flex items-center gap-1.5 font-medium text-[#1F2022]">
                          <i className="w-2 h-2 rounded-full" style={{ background: SEG_COLORS[r.s.id] }} />
                          {r.s.name}
                          {isPrim && <span className="text-[9px] text-[#C83E2B] font-semibold">primary</span>}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={team.dec.alloc[r.s.id] || 0}
                            disabled={isLocked}
                            onChange={(e) => handleAllocChange(r.s.id, +e.target.value)}
                            aria-label={`${r.s.name} media share`}
                            className="flex-1 min-w-0"
                            style={{ accentColor: SEG_COLORS[r.s.id] }}
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={team.dec.alloc[r.s.id] || 0}
                            disabled={isLocked}
                            onChange={(e) => handleAllocChange(r.s.id, +e.target.value)}
                            aria-label={`${r.s.name} media share percent`}
                            className="w-12 px-1 py-0.5 text-right font-mono border border-[#E0DCD3] rounded"
                          />
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-[#5A5C60]">{r.spend.toFixed(0)}</td>
                      <td className={`py-1.5 px-2 text-right font-mono font-semibold ${r.adMult >= 1 ? "text-emerald-700" : "text-[#5A5C60]"}`}>x{r.adMult.toFixed(2)}</td>
                      <td className="py-1.5 pl-3">
                        <div className="relative h-2.5 bg-[#EDE9E1] rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${r.next * 100}%`, background: SEG_COLORS[r.s.id] }} />
                          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${r.now * 100}%`, background: SEG_COLORS[r.s.id] }} />
                        </div>
                        <div className="text-[10px] font-mono text-[#5A5C60] mt-0.5">
                          {(r.now * 100).toFixed(0)}% → <span className={r.next >= r.now ? "text-emerald-700" : "text-amber-700"}>{(r.next * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: the brief — budget, then the two claims */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-[#1F2022]">Media budget</h3>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={adCap}
                  step={10}
                  value={team.dec.ad}
                  disabled={isLocked}
                  onChange={(e) => handleAdBudgetChange(+e.target.value)}
                  aria-label="Quarterly media budget in Rs. lakh"
                  className="w-20 px-2 py-1 text-right font-mono font-bold border border-[#E0DCD3] rounded-lg"
                />
                <span className="text-[11px] text-[#5A5C60]">Rs. L</span>
              </div>
            </div>
            <input type="range" min={0} max={adCap} step={10} value={team.dec.ad} disabled={isLocked} onChange={(e) => handleAdBudgetChange(+e.target.value)} aria-label="Media budget slider" className="w-full accent-[#1F2022]" />
            {isEarlyGame && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Test-market cap: Rs. 300 L in Q1–Q3.
              </p>
            )}
            <svg viewBox={`0 0 ${curveW} ${curveH}`} className="w-full h-auto" role="img" aria-label="Diminishing returns of media spend per segment">
              <path d={curvePath} fill="none" stroke="#1F2022" strokeWidth={1.5} />
              <line x1={8} x2={curveW - 8} y1={curveH - 14} y2={curveH - 14} stroke="#E5E1D8" />
              {segRows.map((r) => (
                <circle key={r.s.id} cx={cx(r.spend)} cy={cy(r.spend)} r={4.5} fill={SEG_COLORS[r.s.id]} stroke="white" strokeWidth={1.5}>
                  <title>
                    {r.s.name}: Rs. {r.spend.toFixed(0)} L
                  </title>
                </circle>
              ))}
              <text x={8} y={curveH - 2} fontSize="9" fill="#8A8C90">
                0
              </text>
              <text x={curveW - 8} y={curveH - 2} fontSize="9" fill="#8A8C90" textAnchor="end">
                Rs. {curveMax} L per segment
              </text>
              <text x={10} y={10} fontSize="9" fill="#8A8C90">
                Reach of the unaware
              </text>
            </svg>
            <p className="text-[11px] text-[#6C6D70] leading-snug">
              Each segment's spend lands on the same saturation curve: the first Rs. {AD_K} L does most of the work. Unfed awareness decays {Math.round(AW_DECAY * 100)}% a quarter.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-sm font-bold text-[#1F2022]">Ad claims</h3>
              <span className="text-[11px] text-[#6C6D70]">{claims.length}/2 chosen</span>
            </div>
            <p className="text-[11px] text-[#6C6D70] mb-2">Backed means your flagship's specification supports it. Dots show the segments that weigh it most.</p>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.keys(CLAIMS).map((k) => {
                const isSelected = claims.includes(k);
                const backed = !auditAll[k];
                const resonates = SEGMENTS.filter((s) => (s.w[k] || 0) >= 15);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleClaimToggle(k)}
                    disabled={isLocked}
                    title={auditAll[k] || "Backed by the flagship's specification"}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition ${
                      isSelected ? (backed ? "border-[#1F2022] bg-[#FAF8F5] font-semibold" : "border-red-400 bg-red-50 font-semibold") : "border-[#E0DCD3] hover:bg-[#FAF8F5]"
                    }`}
                  >
                    {backed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <span className="flex-1 min-w-0 truncate">{CLAIMS[k]}</span>
                    <span className="flex gap-0.5 shrink-0">
                      {resonates.map((s) => (
                        <i key={s.id} className="w-2 h-2 rounded-full" style={{ background: SEG_COLORS[s.id] }} title={`${s.name} weight ${s.w[k]}`} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="px-4 pt-3">
          <SectionTabs
            ariaLabel="Marketing plans and research"
            active={drawer}
            onChange={setDrawer}
            groups={[
              { label: "Plan", tabs: [{ key: "media", label: "Media placements" }, { key: "position", label: "Positioning map" }] },
              { label: "Research", tabs: [{ key: "survey", label: "Market opportunity" }, { key: "research", label: "Reports & intelligence" }] }
            ]}
          />
        </div>
        <div className="p-4 drawer-flat">
          {drawer === "media" && <MediaPlanner team={team} onChange={onChange} competitiveBenchmarkData={team.hist[team.hist.length - 1]?.intel || []} />}
          {drawer === "position" && <MarketPositionMap team={team} gameState={gameState} />}
          {drawer === "survey" && (
            <MarketSurveyReport universeId={universeId} teamId={team.i} quarter={gameState.quarter} onNotify={onNotify} onPurchased={() => onChange({ ...team })} />
          )}
          {drawer === "research" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#1F2022]">Fast Test Report</h3>
                <p className="text-[11px] text-[#5A5C60] mb-2">This quarter's brand, price and advertising judgments — flat fee, same every quarter.</p>
                <FastTestReport universeId={universeId} teamId={team.i} quarter={gameState.quarter} region="Global" disabled={isLocked} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { field: "buyIntel" as const, title: "Competitor intelligence", cost: 15, body: "Rival ad budgets, experience centres, sales headcount, completed technologies and estimated unit costs." },
                  { field: "buyClinic" as const, title: "Customer clinic", cost: 10, body: "Consumer-panel scores (0–100) for every rival model on quality fit, price fit and campaign appeal in all five segments." }
                ].map((r) => (
                  <label
                    key={r.field}
                    className={`p-3 rounded-lg border flex items-start gap-2 cursor-pointer transition ${team.dec[r.field] ? "border-[#1F2022] bg-[#FAF8F5]" : "border-[#E0DCD3] hover:bg-[#FAF8F5]"}`}
                  >
                    <input type="checkbox" checked={team.dec[r.field]} disabled={isLocked} onChange={() => handleResearchToggle(r.field)} className="accent-[#1F2022] mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-[#1F2022]">
                        {r.title} · Rs. {r.cost} L
                      </div>
                      <div className="text-[11px] text-[#5A5C60] mt-0.5">{r.body}</div>
                    </div>
                  </label>
                ))}
                <div className="p-3 rounded-lg border border-[#E0DCD3]">
                  <div className="text-xs font-bold text-[#1F2022]">Benchmark research wallet</div>
                  <div className="text-[11px] text-[#5A5C60] mt-0.5 mb-2">Funds Competitive Benchmark reports on the Results screen (Rs. 15 L a region, Rs. 45 L global).</div>
                  <label className="flex items-center gap-2 text-[11px] text-[#5A5C60]">
                    Rs. L
                    <input type="number" min={0} step={1} value={team.dec.market_research_budget || 0} disabled={isLocked} onChange={(e) => handleBenchmarkWalletChange(+e.target.value)} className="w-20 px-2 py-1 font-mono border border-[#E0DCD3] rounded-lg" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
