import React from "react";
import { GameState, TeamState } from "../types/simulation";
import { CAP_BLOCK } from "../engine/catalog";
import { hrMults, reliabilityOf } from "../engine/simulationEngine";

const MODEL_TINTS = ["#C77D0A", "#2563EB", "#7C3AED"];

/**
 * The plant as a line drawing driven by this quarter's operations decisions: the schedule
 * flows through five stations, the conveyor runs at the planned utilisation, and capacity is
 * drawn as 500-unit line blocks (filled by the schedule, expansions shown as under construction).
 */
export function AssemblyLine({ team, gameState }: { team: TeamState; gameState: GameState }) {
  const scheduled = team.models.map((m, i) => ({ m, units: team.dec.prod[m.id] || 0, tint: i === 0 ? team.color : MODEL_TINTS[(i - 1) % MODEL_TINTS.length] }));
  const total = scheduled.reduce((x, s) => x + s.units, 0);
  const util = team.capacity > 0 ? total / team.capacity : 0;
  const reliab = reliabilityOf(team);
  const hrM = hrMults(gameState, team);
  const blocks = Math.round(team.capacity / CAP_BLOCK.units);
  const newBlocks = team.dec.expBlocks || 0;
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const lfpUnits = scheduled.filter((s) => ["BC4", "BC5"].includes(s.m.cfg.battery)).reduce((x, s) => x + s.units, 0);
  const chem = total === 0 ? "No pack build scheduled" : lfpUnits === total ? "LFP packs" : lfpUnits === 0 ? "NMC packs" : `${Math.round((lfpUnits / total) * 100)}% LFP / NMC`;
  const motors = [...new Set(scheduled.filter((s) => s.units > 0).map((s) => s.m.cfg.powertrain))].join(" · ") || "Idle";

  // Glyphs on the conveyor in proportion to each model's share of the schedule
  const glyphCount = total > 0 ? Math.max(2, Math.min(7, Math.round(util * 7))) : 0;
  const glyphs: string[] = [];
  scheduled.forEach((s) => {
    const n = total > 0 ? Math.round((s.units / total) * glyphCount) : 0;
    for (let k = 0; k < n; k += 1) glyphs.push(s.tint);
  });
  const cycle = Math.max(4, 14 - util * 8); // seconds per trip: faster when the plant is busier

  const stations = [
    { x: 40, title: "Cell & pack", sub: chem, icon: "battery" },
    { x: 182, title: "Frame & paint", sub: "Body shop", icon: "paint" },
    { x: 324, title: "Powertrain", sub: motors, icon: "motor" },
    { x: 466, title: "Final assembly", sub: `Pay ${team.hr.plant}% · x${hrM.plant.toFixed(2)}`, icon: "wrench" },
    { x: 608, title: "End-of-line test", sub: `Reliability ${(reliab * 100).toFixed(0)}`, icon: "gate" }
  ];

  const LINE_Y = 168;
  const icon = (kind: string, cx: number, cy: number) => {
    switch (kind) {
      case "battery":
        return (
          <g>
            <rect x={cx - 18} y={cy - 10} width={34} height={20} rx={3} fill="#2F3237" />
            <rect x={cx + 16} y={cy - 4} width={4} height={8} rx={1} fill="#2F3237" />
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={cx - 15 + i * 8} y={cy - 7} width={6} height={14} rx={1} fill={lfpUnits && total ? "#7FB2D4" : "#C9A227"} />
            ))}
          </g>
        );
      case "paint":
        return (
          <g>
            <path d={`M${cx - 20} ${cy + 10} L${cx - 20} ${cy - 6} L${cx} ${cy - 14} L${cx + 20} ${cy - 6} L${cx + 20} ${cy + 10} Z`} fill="#E7E2D8" stroke="#8A8C90" />
            <circle cx={cx} cy={cy + 1} r={7} fill={team.color} />
          </g>
        );
      case "motor":
        return (
          <g>
            <circle cx={cx} cy={cy} r={13} fill="#3A3D42" />
            <circle cx={cx} cy={cy} r={5} fill="#C83E2B" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line key={a} x1={cx + 8 * Math.cos((a * Math.PI) / 180)} y1={cy + 8 * Math.sin((a * Math.PI) / 180)} x2={cx + 12 * Math.cos((a * Math.PI) / 180)} y2={cy + 12 * Math.sin((a * Math.PI) / 180)} stroke="#9A9EA5" strokeWidth={2} />
            ))}
          </g>
        );
      case "wrench":
        return (
          <g>
            <rect x={cx - 3} y={cy - 22} width={6} height={18} fill="#8A8C90" />
            <rect x={cx - 16} y={cy - 26} width={32} height={6} rx={2} fill="#5A5C60" />
            <path d={`M${cx - 14} ${cy + 2} h28 l-4 10 h-20 z`} fill="#1F2022" />
          </g>
        );
      default:
        return (
          <g>
            <rect x={cx - 3} y={cy - 22} width={6} height={34} fill="#5A5C60" />
            <rect x={cx + 3} y={cy - 18} width={20} height={4} fill={reliab >= 0.85 ? "#16A34A" : reliab >= 0.7 ? "#D97706" : "#DC2626"} />
            <circle cx={cx} cy={cy - 26} r={4} fill={reliab >= 0.85 ? "#16A34A" : reliab >= 0.7 ? "#D97706" : "#DC2626"} />
          </g>
        );
    }
  };

  const scooter = (fill: string) => (
    <g transform="scale(1.35)">
      <circle cx={-8} cy={4} r={4} fill="#1F2022" />
      <circle cx={9} cy={4} r={4} fill="#1F2022" />
      <path d="M-11 0 L4 0 L8 -10 L11 -10 L10 -6 L12 3 L-11 3 Z" fill={fill} />
      <rect x={-9} y={-5} width={8} height={3} rx={1} fill="#3A3B3E" />
    </g>
  );

  return (
    <div className="space-y-3">
      <svg viewBox="0 50 760 270" className="w-full h-auto" role="img" aria-label={`Assembly line running at ${Math.round(util * 100)}% of capacity`}>
        <defs>
          <pattern id="al-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#C9C3B9" strokeWidth="2" />
          </pattern>
        </defs>
        {/* Sawtooth factory hall */}
        <path
          d={`M20 92 ${Array.from({ length: 12 }, (_, i) => `L${20 + i * 60} 62 L${20 + i * 60 + 44} 62 L${20 + (i + 1) * 60} 92`).join(" ")} L740 236 L20 236 Z`}
          fill="#FBF9F5"
          stroke="#D8D2C6"
        />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={20 + i * 60 + 44} y1={64} x2={20 + i * 60 + 44} y2={90} stroke="#BFD6E6" strokeWidth={3} />
        ))}

        {/* Conveyor */}
        <rect x={30} y={LINE_Y - 4} width={700} height={14} rx={7} fill="#2B2C2F" />
        <line
          x1={36}
          x2={724}
          y1={LINE_Y + 3}
          y2={LINE_Y + 3}
          stroke="#6B6E74"
          strokeWidth={2}
          strokeDasharray="6 8"
          style={!reduceMotion && total > 0 ? { animation: `al-belt ${cycle / 10}s linear infinite` } : undefined}
        />
        <style>{`@keyframes al-belt { to { stroke-dashoffset: -28; } }`}</style>

        {stations.map((s) => (
          <g key={s.title}>
            <rect x={s.x} y={98} width={112} height={56} rx={8} fill="white" stroke="#D8D2C6" />
            {icon(s.icon, s.x + 56, 124)}
            <line x1={s.x + 56} x2={s.x + 56} y1={154} y2={LINE_Y - 4} stroke="#D8D2C6" />
            <text x={s.x + 56} y={194} textAnchor="middle" fontSize="11" fontWeight={700} fill="#1F2022">
              {s.title}
            </text>
            <text x={s.x + 56} y={208} textAnchor="middle" fontSize="9.5" fill="#6C6D70">
              {s.sub}
            </text>
          </g>
        ))}

        {/* Units in flow */}
        {glyphs.map((fill, i) => (
          <g key={i} transform={reduceMotion ? `translate(${60 + (i / Math.max(1, glyphs.length)) * 640} ${LINE_Y - 8})` : undefined}>
            {!reduceMotion && <animateMotion dur={`${cycle}s`} begin={`${-(i / glyphs.length) * cycle}s`} repeatCount="indefinite" path={`M40 ${LINE_Y - 8} L720 ${LINE_Y - 8}`} />}
            {scooter(fill)}
          </g>
        ))}
        {total === 0 && (
          <text x={380} y={LINE_Y - 12} textAnchor="middle" fontSize="11" fill="#8A8C90">
            Line idle: no production scheduled
          </text>
        )}

        {/* Capacity blocks */}
        <text x={30} y={258} fontSize="10" fill="#5A5C60">
          Line capacity · each block = {CAP_BLOCK.units} units a quarter
        </text>
        {(() => {
          const all = blocks + newBlocks;
          const bw = Math.min(56, (700 - (all - 1) * 4) / Math.max(1, all));
          let remaining = total;
          return Array.from({ length: all }, (_, i) => {
            const x = 30 + i * (bw + 4);
            if (i >= blocks) {
              return (
                <g key={i}>
                  <rect x={x} y={266} width={bw} height={22} rx={3} fill="url(#al-hatch)" stroke="#A8A29E" strokeDasharray="3 2" />
                  <title>Expansion block under construction, ready next quarter</title>
                </g>
              );
            }
            const fill = Math.max(0, Math.min(1, remaining / CAP_BLOCK.units));
            remaining -= CAP_BLOCK.units;
            return (
              <g key={i}>
                <rect x={x} y={266} width={bw} height={22} rx={3} fill="#EFEBE3" stroke="#D8D2C6" />
                <rect x={x} y={266} width={bw * fill} height={22} rx={3} fill="#1F2022" opacity={0.85} />
              </g>
            );
          });
        })()}
        {total > team.capacity && (
          <text x={730} y={258} textAnchor="end" fontSize="10" fontWeight={700} fill="#DC2626">
            Over capacity by {(total - team.capacity).toLocaleString("en-IN")} units
          </text>
        )}
        <g fontSize="10" fill="#5A5C60">
          {scheduled.map((s, i) => (
            <g key={s.m.id} transform={`translate(${30 + i * 180} 306)`}>
              <g transform="translate(10 -3)">{scooter(s.tint)}</g>
              <text x={36} y={0}>
                {s.m.name}: {s.units.toLocaleString("en-IN")}
              </text>
            </g>
          ))}
          {newBlocks > 0 && (
            <g transform="translate(560 306)">
              <rect x={0} y={-9} width={14} height={10} fill="url(#al-hatch)" stroke="#A8A29E" />
              <text x={20} y={0}>+{newBlocks} block{newBlocks > 1 ? "s" : ""} next quarter</text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

export default AssemblyLine;
