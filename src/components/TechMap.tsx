import React from "react";
import { ScooterModel, TeamState } from "../types/simulation";
import { TECHS } from "../engine/catalog";
import { scoreModel } from "../engine/simulationEngine";

const ATTRS: [string, string][] = [
  ["perf", "Performance"],
  ["range", "Range"],
  ["charge", "Charging"],
  ["tech", "Tech"],
  ["build", "Build"],
  ["comfort", "Comfort"],
  ["safety", "Safety"],
  ["econ", "Economy"]
];

export const STATUS_COLORS = { owned: "#15803D", lab: "#C77D0A", queued: "#7C3AED", open: "#8A8C90" };
export type TechStatus = keyof typeof STATUS_COLORS;

const W = 640;
const ROW = 52;
const NODE_W = 228;
const ATTR_X = 420;

/**
 * Technologies on the left, the eight vehicle attributes on the right. Links show which
 * attributes each technology lifts (width = size of the effect). The attribute bars are the
 * flagship's current scores; the selected technology's gain is drawn as a ghost extension.
 */
export function TechMap({
  team,
  flagship,
  statusOf,
  selectedId,
  onSelect
}: {
  team: TeamState;
  flagship?: ScooterModel;
  statusOf: (id: string) => TechStatus;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const height = TECHS.length * ROW + 8;
  const attrRow = (height - 8) / ATTRS.length;
  const attrY = (i: number) => 4 + attrRow * i + attrRow / 2;
  const techY = (i: number) => 4 + ROW * i + ROW / 2;

  const scores = flagship ? scoreModel(flagship, team) : {};
  const selected = TECHS.find((t) => t.id === selectedId);
  const gain: Record<string, number> = {};
  if (flagship && selected && !team.techs.includes(selected.id)) {
    const hyp = scoreModel({ ...flagship, equippedTechs: flagship.equippedTechs ? [...flagship.equippedTechs, selected.id] : undefined }, { ...team, techs: [...team.techs, selected.id] });
    for (const [k] of ATTRS) gain[k] = Math.max(0, (hyp[k] || 0) - (scores[k] || 0));
  }

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto select-none" role="img" aria-label="Technology to attribute map">
      {/* links */}
      {TECHS.map((tc, i) =>
        Object.entries(tc.fx).map(([k, v]) => {
          const j = ATTRS.findIndex(([a]) => a === k);
          if (j < 0) return null;
          const isSel = tc.id === selectedId;
          const x1 = NODE_W;
          const y1 = techY(i);
          const x2 = ATTR_X - 8;
          const y2 = attrY(j);
          return (
            <path
              key={`${tc.id}-${k}`}
              d={`M${x1} ${y1} C ${x1 + 90} ${y1}, ${x2 - 90} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={isSel ? "#C83E2B" : STATUS_COLORS[statusOf(tc.id)]}
              strokeOpacity={isSel ? 0.9 : 0.22}
              strokeWidth={1 + Number(v) * 2.2}
              strokeLinecap="round"
            />
          );
        })
      )}

      {/* technology nodes */}
      {TECHS.map((tc, i) => {
        const st = statusOf(tc.id);
        const isSel = tc.id === selectedId;
        const y = techY(i);
        return (
          <g key={tc.id} onClick={() => onSelect(tc.id)} style={{ cursor: "pointer" }} role="button" aria-label={tc.name} aria-pressed={isSel}>
            <rect x={1} y={y - ROW / 2 + 5} width={NODE_W - 2} height={ROW - 10} rx={9} fill={isSel ? "#1F2022" : "white"} stroke={isSel ? "#1F2022" : "#E0DCD3"} />
            <circle cx={18} cy={y} r={6} fill={STATUS_COLORS[st]} />
            {st === "lab" && <circle cx={18} cy={y} r={9} fill="none" stroke={STATUS_COLORS.lab} strokeDasharray="3 2" />}
            <text x={32} y={y - 3} fontSize="11.5" fontWeight={700} fill={isSel ? "white" : "#1F2022"}>
              {tc.name.split(" (")[0]}
            </text>
            <text x={32} y={y + 12} fontSize="9.5" fill={isSel ? "#D6D3CE" : "#6C6D70"}>
              {tc.name.match(/\(([^)]+)\)/)?.[1] || Object.entries(tc.fx).map(([k, val]) => `+${val} ${k}`).join(" · ")}
            </text>
          </g>
        );
      })}

      {/* attribute bars */}
      {ATTRS.map(([k, label], j) => {
        const y = attrY(j);
        const v = scores[k] || 0;
        const g = gain[k] || 0;
        const barX = ATTR_X + 82;
        const barW = W - barX - 26;
        return (
          <g key={k}>
            <circle cx={ATTR_X - 6} cy={y} r={3} fill={g > 0 ? "#C83E2B" : "#C9C3B9"} />
            <text x={ATTR_X + 2} y={y + 4} fontSize="11" fill={g > 0 ? "#1F2022" : "#5A5C60"} fontWeight={g > 0 ? 700 : 400}>
              {label}
            </text>
            <rect x={barX} y={y - 4} width={barW} height={8} rx={4} fill="#EFEBE3" />
            <rect x={barX} y={y - 4} width={(barW * v) / 10} height={8} rx={4} fill="#1F2022" opacity={0.8} />
            {g > 0 && <rect x={barX + (barW * v) / 10} y={y - 4} width={(barW * g) / 10} height={8} rx={4} fill="#C83E2B" opacity={0.75} />}
            <text x={W - 2} y={y + 4} fontSize="10" textAnchor="end" fill={g > 0 ? "#C83E2B" : "#8A8C90"} fontFamily="ui-monospace, monospace">
              {(v + g).toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default TechMap;
