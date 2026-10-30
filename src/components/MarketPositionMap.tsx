import React from "react";
import { GameState, TeamState } from "../types/simulation";
import { SEGMENTS } from "../engine/catalog";
import { scoreModel } from "../engine/simulationEngine";

const SEG_COLORS: Record<string, string> = { S1: "#3B82F6", S2: "#10B981", S3: "#22C55E", S4: "#F59E0B", S5: "#8B5CF6" };
const ATTRS = ["perf", "range", "charge", "tech", "build", "comfort", "safety", "econ"];

const P_MIN = 50000;
const P_MAX = 200000;
const W = 640;
const PLOT_TOP = 26;
const PLOT_BOTTOM = 200;
const LANE_TOP = 218;
const LANE_H = 13;
const L = 72;
const R = 16;

const xOf = (p: number) => L + ((Math.max(P_MIN, Math.min(P_MAX, p)) - P_MIN) / (P_MAX - P_MIN)) * (W - L - R);
const yOf = (spec: number) => PLOT_BOTTOM - ((Math.max(2, Math.min(9, spec)) - 2) / 7) * (PLOT_BOTTOM - PLOT_TOP);

/**
 * Price against specification level. Segments are drawn as their willingness-to-pay bands,
 * your models at their price and mean attribute score, and rivals' published prices from
 * the last market report along the top.
 */
export function MarketPositionMap({ team, gameState }: { team: TeamState; gameState: GameState }) {
  const report = gameState.reports?.[gameState.reports.length - 1];
  const rivals = (report?.priceTable || []).filter((r) => r.team !== team.name && r.units > 0);
  const height = LANE_TOP + SEGMENTS.length * LANE_H + 26;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto" role="img" aria-label="Price and specification positioning map">
        {/* grid */}
        {[60000, 80000, 100000, 120000, 140000, 160000, 180000, 200000].map((p) => (
          <g key={p}>
            <line x1={xOf(p)} x2={xOf(p)} y1={PLOT_TOP} y2={LANE_TOP + SEGMENTS.length * LANE_H} stroke="#EFEBE3" />
            <text x={xOf(p)} y={height - 8} textAnchor="middle" fontSize="10" fill="#8A8C90">
              {p / 1000}k
            </text>
          </g>
        ))}
        {[3, 5, 7, 9].map((s) => (
          <g key={s}>
            <line x1={L} x2={W - R} y1={yOf(s)} y2={yOf(s)} stroke="#F3F0EA" />
            <text x={L - 6} y={yOf(s) + 3} textAnchor="end" fontSize="10" fill="#8A8C90">
              {s}
            </text>
          </g>
        ))}
        <text x={12} y={(PLOT_TOP + PLOT_BOTTOM) / 2} fontSize="10" fill="#5A5C60" transform={`rotate(-90 12 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`} textAnchor="middle">
          Spec level (mean attribute, 0–10)
        </text>

        {/* rivals' published prices */}
        <text x={L} y={14} fontSize="10" fill="#8A8C90">
          {rivals.length ? `Rival prices, Q${report?.q} report` : "Rival prices appear after the first selling quarter"}
        </text>
        {rivals.map((r, i) => (
          <g key={`${r.team}-${r.model}-${i}`}>
            <line x1={xOf(r.price)} x2={xOf(r.price)} y1={PLOT_TOP - 6} y2={PLOT_TOP + 4} stroke={r.color} strokeWidth={3} strokeLinecap="round">
              <title>
                {r.team} · {r.model}: Rs. {r.price.toLocaleString("en-IN")}, {r.units.toLocaleString("en-IN")} units
              </title>
            </line>
          </g>
        ))}

        {/* willingness-to-pay lanes */}
        {SEGMENTS.map((s, i) => {
          const y = LANE_TOP + i * LANE_H;
          return (
            <g key={s.id}>
              <text x={L - 6} y={y + 9} textAnchor="end" fontSize="10" fill="#5A5C60">
                {s.name}
              </text>
              <rect x={xOf(s.wtp[0])} y={y + 2} width={xOf(s.wtp[1]) - xOf(s.wtp[0])} height={LANE_H - 4} rx={3} fill={SEG_COLORS[s.id]} opacity={team.models.some((m) => m.targetSegment === s.id) ? 0.85 : 0.35} />
            </g>
          );
        })}

        {/* your models */}
        {team.models.map((m) => {
          const sc = scoreModel(m, team);
          const spec = ATTRS.reduce((x, k) => x + (sc[k] || 0), 0) / ATTRS.length;
          const x = xOf(m.price);
          const y = yOf(spec);
          const seg = m.targetSegment ?? "S2";
          return (
            <g key={m.id}>
              <line x1={x} x2={x} y1={y} y2={LANE_TOP + SEGMENTS.length * LANE_H} stroke="#1F2022" strokeDasharray="2 3" opacity={0.35} />
              <circle cx={x} cy={y} r={8} fill={team.color} stroke="white" strokeWidth={2.5} />
              <circle cx={x} cy={y} r={11} fill="none" stroke={SEG_COLORS[seg]} strokeWidth={2} />
              <text x={x + 14} y={y + 4} fontSize="11" fontWeight={700} fill="#1F2022">
                {m.name}
              </text>
              <title>
                {m.name}: Rs. {m.price.toLocaleString("en-IN")}, spec {spec.toFixed(1)}
              </title>
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] text-[#6C6D70]">
        A model sells best where its dashed line lands inside its target segment's band; priced above a band, price fit falls away fast. The ring colour shows the target segment.
      </p>
    </div>
  );
}

export default MarketPositionMap;
