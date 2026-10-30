import React from "react";
import { Eye, Lock, Unlock, AlertTriangle } from "lucide-react";
import type { GameState, TeamState } from "../types/simulation";
import { SEGMENTS } from "../engine/catalog";
import { auditTeam, claimAudit, cumBSC, scoreModel, unitCost } from "../engine/simulationEngine";

const ATTRS = ["perf", "range", "charge", "tech", "build", "comfort", "safety", "econ"];

function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span className="text-[10px] text-[#A8AAAD]">—</span>;
  const w = 64;
  const h = 18;
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

/** Things worth raising in a debrief, found from each team's state and last result. */
function signalsOf(t: TeamState): string[] {
  const out: string[] = [];
  const r = t.hist[t.hist.length - 1];
  if (t.bankrupt) out.push("bankrupt");
  else if (t.cash < 200) out.push(`cash down to Rs. ${Math.round(t.cash)} L`);
  if (r?.stockout) out.push(`stocked out, ${r.lost.toLocaleString("en-IN")} orders lost`);
  if (r && r.endInv > r.units * 0.5 && r.units > 0) out.push(`unsold stock ${r.endInv.toLocaleString("en-IN")} units`);
  if (Object.values(claimAudit(t, t.dec.claims || [])).some(Boolean)) out.push("ad claim the product cannot back");
  if (t.models.some((m) => m.price < unitCost(m) * 1.12)) out.push("margin under the 12% floor");
  const sched = t.models.reduce((x, m) => x + (t.dec.prod[m.id] || 0), 0);
  if (t.capacity && sched / t.capacity < 0.5 && t.hist.length > 0) out.push(`plant ${Math.round((sched / t.capacity) * 100)}% loaded`);
  return out;
}

export function CohortOverview({
  gameState,
  onToggleLock,
  onObserve
}: {
  gameState: GameState;
  onToggleLock: (idx: number) => void;
  onObserve?: (idx: number) => void;
}) {
  const teams = gameState.teams;
  const ranked = [...teams].sort((a, b) => cumBSC(b) - cumBSC(a));
  const rankOf = (t: TeamState) => (t.hist.length ? ranked.indexOf(t) + 1 : 0);

  // Class market map: every model, price against mean attribute score
  const W = 620;
  const H = 260;
  const L = 40;
  const B = 26;
  const x = (p: number) => L + ((Math.max(50000, Math.min(200000, p)) - 50000) / 150000) * (W - L - 10);
  const y = (s: number) => H - B - ((Math.max(2, Math.min(9, s)) - 2) / 7) * (H - B - 10);
  const models = teams.flatMap((t) =>
    t.models.map((m) => {
      const sc = scoreModel(m, t);
      return { t, m, spec: ATTRS.reduce((a, k) => a + (sc[k] || 0), 0) / ATTRS.length };
    })
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-[#E5E1D8] shadow-sm overflow-x-auto">
        <h3 className="text-base font-bold text-[#1F2022] mb-2">Cohort board</h3>
        <table className="w-full text-xs min-w-[760px]">
          <thead>
            <tr className="text-[10px] text-[#8A8C90] text-left border-b border-[#EFEBE3]">
              <th className="font-medium py-1.5 px-2">Team</th>
              <th className="font-medium py-1.5 px-2">Decisions</th>
              <th className="font-medium py-1.5 px-2">Auditor</th>
              <th className="font-medium py-1.5 px-2">Cash trend</th>
              <th className="font-medium py-1.5 px-2 text-right">Cash</th>
              <th className="font-medium py-1.5 px-2 text-right">Rank</th>
              <th className="font-medium py-1.5 px-2 text-right">Share</th>
              <th className="font-medium py-1.5 px-2">Debrief signals</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {teams.map((t, idx) => {
              const issues = t.isBot ? [] : auditTeam(gameState, t);
              const r = t.hist[t.hist.length - 1];
              const sig = signalsOf(t);
              return (
                <tr key={t.i} className="border-b border-[#F5F2EC] align-top">
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-1.5 font-semibold text-[#1F2022]">
                      <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                      {t.name}
                      {t.isBot && <span className="text-[10px] font-normal text-[#8A8C90]">bot</span>}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    {t.isBot ? (
                      <span className="text-[#8A8C90]">automatic</span>
                    ) : t.dec.locked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                        <Unlock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {t.isBot ? null : issues.length ? (
                      <span className="inline-flex items-center gap-1 text-red-700 font-semibold" title={issues.join("\n")}>
                        <AlertTriangle className="w-3.5 h-3.5" /> {issues.length} issue{issues.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-emerald-700">clear</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <Spark values={t.hist.map((h) => h.cash)} color={t.color} />
                  </td>
                  <td className={`py-2 pr-2 text-right font-mono ${t.cash < 200 ? "text-red-700" : ""}`}>{Math.round(t.cash).toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-2 text-right font-mono">{rankOf(t) || "—"}</td>
                  <td className="py-2 pr-2 text-right font-mono">{r ? `${(r.share * 100).toFixed(1)}%` : "—"}</td>
                  <td className="py-2 pr-2 max-w-[220px]">
                    {sig.length ? <span className="text-[11px] text-amber-800">{sig.join(" · ")}</span> : <span className="text-[11px] text-[#A8AAAD]">none</span>}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {!t.isBot && (
                      <button onClick={() => onToggleLock(idx)} className="px-2 py-1 bg-white border border-[#E0DCD3] text-[11px] font-semibold rounded-md hover:bg-slate-100">
                        {t.dec.locked ? "Unlock" : "Lock"}
                      </button>
                    )}
                    {onObserve && (
                      <button onClick={() => onObserve(idx)} title={`Observe ${t.name} (read-only)`} className="ml-1 px-2 py-1 bg-white border border-[#E0DCD3] text-[11px] font-semibold rounded-md hover:bg-slate-100 inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Observe
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[10px] text-[#8A8C90] mt-2">Hover an auditor count to see the issues. Signals are prompts for the debrief, not penalties.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-[#E5E1D8] shadow-sm">
        <h3 className="text-base font-bold text-[#1F2022]">Class market map</h3>
        <p className="text-[11px] text-[#6C6D70] mb-2">Every model in the market: retail price against mean attribute score, with each segment's willingness-to-pay band along the bottom.</p>
        <svg viewBox={`0 0 ${W} ${H + 64}`} className="w-full h-auto" role="img" aria-label="All teams' models by price and specification">
          {[60000, 100000, 140000, 180000].map((p) => (
            <g key={p}>
              <line x1={x(p)} x2={x(p)} y1={10} y2={H - B} stroke="#F0ECE5" />
              <text x={x(p)} y={H - B + 14} textAnchor="middle" fontSize="10" fill="#8A8C90">
                {p / 1000}k
              </text>
            </g>
          ))}
          {[3, 5, 7, 9].map((s) => (
            <text key={s} x={L - 6} y={y(s) + 3} textAnchor="end" fontSize="10" fill="#8A8C90">
              {s}
            </text>
          ))}
          {models.map(({ t, m, spec }) => (
            <g key={`${t.i}-${m.id}`}>
              <circle cx={x(m.price)} cy={y(spec)} r={6} fill={t.color} stroke="white" strokeWidth={1.5} opacity={0.9}>
                <title>
                  {t.name} · {m.name}: Rs. {m.price.toLocaleString("en-IN")}, spec {spec.toFixed(1)}
                </title>
              </circle>
            </g>
          ))}
          {SEGMENTS.map((s, i) => (
            <g key={s.id}>
              <text x={L - 6} y={H + 8 + i * 11} textAnchor="end" fontSize="9" fill="#5A5C60">
                {s.name}
              </text>
              <rect x={x(s.wtp[0])} y={H + 1 + i * 11} width={x(s.wtp[1]) - x(s.wtp[0])} height={8} rx={3} fill="#A8A29E" opacity={0.45} />
            </g>
          ))}
        </svg>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#5A5C60]">
          {teams.map((t) => (
            <span key={t.i} className="flex items-center gap-1">
              <i className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              {t.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CohortOverview;
