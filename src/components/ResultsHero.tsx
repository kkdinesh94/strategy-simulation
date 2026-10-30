import React from "react";
import type { GameState, TeamState } from "../types/simulation";

/** Trailing four-quarter scorecard average up to quarter q (the same rule as cumBSC). */
function bscUpTo(t: TeamState, q: number) {
  const hist = t.hist.filter((h) => h.q <= q).slice(-4);
  return hist.length ? hist.reduce((x, r) => x + (r.bsc ? r.bsc.total : 0), 0) / hist.length : 0;
}

/**
 * The last quarter at a glance: where demand went (sold, lost to stock-outs, left in stock),
 * how revenue turned into profit, and how the scorecard ranking moved for every team.
 */
export function ResultsHero({ team, gameState }: { team: TeamState; gameState: GameState }) {
  const r = team.hist[team.hist.length - 1];
  if (!r) return null;

  const demand = Math.max(1, r.units + r.lost);
  const funnel = [
    { label: "Demand for your models", v: r.units + r.lost, color: "#1F2022" },
    { label: "Sold", v: r.units, color: "#15803D" },
    { label: "Lost to stock-outs", v: r.lost, color: "#DC2626" },
    { label: "Left in stock", v: r.endInv, color: "#C77D0A" }
  ];
  const opex = r.revenue - r.cogs - r.profit;
  const bridge = [
    { label: "Revenue", v: r.revenue },
    { label: "Cost of goods", v: -r.cogs },
    { label: "Operating & other", v: -opex },
    { label: "Profit", v: r.profit, total: true }
  ];
  const maxB = Math.max(1, r.revenue);

  // Bump chart of scorecard rank
  const quarters = [...new Set(gameState.teams.flatMap((t) => t.hist.map((h) => h.q)))].sort((a, b) => a - b);
  const ranks = quarters.map((q) => {
    const order = [...gameState.teams].sort((a, b) => bscUpTo(b, q) - bscUpTo(a, q));
    return new Map(order.map((t, i) => [t.i, i + 1]));
  });
  const n = gameState.teams.length;
  const W = 380;
  const H = 210;
  const L = 22;
  const R = 70;
  const x = (i: number) => L + (quarters.length > 1 ? (i / (quarters.length - 1)) * (W - L - R) : (W - L - R) / 2);
  const y = (rank: number) => 12 + ((rank - 1) / Math.max(1, n - 1)) * (H - 34);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-[#1F2022]">Q{r.q} verdict</h2>
          <span className={`text-sm font-bold font-mono ${r.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {r.profit >= 0 ? "+" : "−"}Rs. {Math.abs(Math.round(r.profit)).toLocaleString("en-IN")} L
          </span>
        </div>
        <div className="space-y-1.5">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-[11px]">
              <span className="w-36 text-[#5A5C60] shrink-0">{f.label}</span>
              <div className="flex-1 h-3.5 rounded bg-[#F3F0EA] overflow-hidden">
                <div className="h-full rounded" style={{ width: `${Math.min(100, (f.v / demand) * 100)}%`, background: f.color, opacity: 0.85 }} />
              </div>
              <span className="w-14 text-right font-mono">{Math.round(f.v).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#6C6D70]">
          {r.lost > 0
            ? `You turned away ${r.lost.toLocaleString("en-IN")} buyers: more production or capacity would have sold them.`
            : r.endInv > r.units * 0.4
            ? "Plenty of stock is left over: production ran ahead of demand, and holding it costs money."
            : "Production and demand were well matched."}
        </p>
        <div className="border-t border-[#EFEBE3] pt-3 space-y-1">
          {bridge.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-[11px]">
              <span className={`w-36 shrink-0 ${b.total ? "font-semibold text-[#1F2022]" : "text-[#5A5C60]"}`}>{b.label}</span>
              <div className="flex-1 h-3 relative">
                <div
                  className="absolute inset-y-0 rounded"
                  style={{ left: b.v < 0 ? `${Math.max(0, 100 - (Math.abs(b.v) / maxB) * 100)}%` : 0, width: `${Math.min(100, (Math.abs(b.v) / maxB) * 100)}%`, background: b.total ? (b.v >= 0 ? "#15803D" : "#DC2626") : b.v >= 0 ? "#A8A29E" : "#C2410C", opacity: 0.85 }}
                />
              </div>
              <span className="w-14 text-right font-mono">{Math.round(b.v).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4">
        <h2 className="text-sm font-bold text-[#1F2022]">The race</h2>
        <p className="text-[11px] text-[#6C6D70] mb-1">Scorecard rank after each quarter (trailing four-quarter average).</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Scorecard rank by quarter for every team">
          {quarters.map((q, i) => (
            <text key={q} x={x(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#8A8C90">
              Q{q}
            </text>
          ))}
          {gameState.teams.map((t) => {
            const me = t.i === team.i;
            const pts = ranks.map((m, i) => `${x(i)},${y(m.get(t.i) || n)}`).join(" ");
            const lastRank = ranks[ranks.length - 1]?.get(t.i) || n;
            return (
              <g key={t.i} opacity={me ? 1 : 0.35}>
                <polyline points={pts} fill="none" stroke={t.color} strokeWidth={me ? 3 : 1.5} strokeLinejoin="round" />
                {ranks.map((m, i) => (
                  <circle key={i} cx={x(i)} cy={y(m.get(t.i) || n)} r={me ? 4 : 2.5} fill={t.color} />
                ))}
                <text x={x(quarters.length - 1) + 8} y={y(lastRank) + 3} fontSize="10" fontWeight={me ? 700 : 400} fill={me ? "#1F2022" : "#6C6D70"}>
                  {lastRank}. {t.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default ResultsHero;
