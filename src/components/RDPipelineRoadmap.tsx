import React from "react";
import { TeamState, GameState } from "../types/simulation";
import { TECHS, techById } from "../engine/catalog";
import { Rocket, AlertTriangle } from "lucide-react";

interface RDPipelineRoadmapProps {
  team: TeamState;
  gameState: GameState;
}

export const RDPipelineRoadmap: React.FC<RDPipelineRoadmapProps> = ({ team, gameState }) => {
  const active = team.rnd;
  const completed = team.techs
    .map((id) => techById(id))
    .filter((t): t is NonNullable<ReturnType<typeof techById>> => !!t);
  const available = TECHS.filter(
    (tc) => !team.techs.includes(tc.id) && !active.some((p) => p.id === tc.id)
  );
  const totalQuarters = (gameState.cfg as any)?.totalQuarters || 8;
  const currentQ = gameState.quarter;

  const quarters = Array.from({ length: totalQuarters }, (_, i) => i + 1);

  const parityAlerts = team.techs
    .map((id) => {
      const adopters = gameState.teams.filter((t) => t.techs.includes(id)).length;
      const total = gameState.teams.length;
      return { id, name: techById(id)?.name || id, adopters, total };
    })
    .filter((x) => x.adopters > x.total / 2);

  return (
    <div className="bg-[#FAF8F5] p-6 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-4">
      <div className="flex items-center gap-3">
        <Rocket className="w-5 h-5 text-emerald-700" />
        <h3 className="text-lg font-bold text-[#1F2022]">R&D Innovation Pipeline Roadmap</h3>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3 font-mono text-xs">
        <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl shadow-2xs">
          <span className="text-[10px] text-[#5A5C60] block uppercase">In Progress</span>
          <span className="font-bold text-amber-700">{active.length} / 2</span>
        </div>
        <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl shadow-2xs">
          <span className="text-[10px] text-[#5A5C60] block uppercase">Completed</span>
          <span className="font-bold text-emerald-700">{completed.length}</span>
        </div>
        <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl shadow-2xs">
          <span className="text-[10px] text-[#5A5C60] block uppercase">Unlocked</span>
          <span className="font-bold text-[#1F2022]">{completed.length} components</span>
        </div>
      </div>

      {/* Parity alerts */}
      {parityAlerts.length > 0 && (
        <div className="space-y-2">
          {parityAlerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-medium"
            >
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              <span>
                ⚠ Technology parity: {a.name} adopted by {a.adopters} of {a.total} teams. Seek differentiation.
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Gantt table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 font-mono text-[10px] uppercase text-[#5A5C60] border-b border-[#E0DCD3] min-w-[180px]">
                Project
              </th>
              {quarters.map((q) => (
                <th
                  key={q}
                  className={`p-2 font-mono text-[10px] uppercase text-[#5A5C60] border-b border-[#E0DCD3] text-center min-w-[36px] ${
                    q === currentQ ? "border-l-2 border-l-emerald-600" : ""
                  }`}
                >
                  Q{q}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map((p) => {
              const tc = techById(p.id);
              return (
                <tr key={p.id}>
                  <td className="p-2 font-semibold text-[#1F2022] border-b border-[#F0EDE5]">
                    {tc?.name || p.id}
                  </td>
                  {quarters.map((q) => {
                    const isCurrent = q === currentQ;
                    const borderCls = isCurrent ? "border-l-2 border-l-emerald-600" : "";
                    if (q === p.qDone) {
                      return (
                        <td
                          key={q}
                          title={`Unlocks: ${tc?.name || p.id}`}
                          className={`p-2 text-center bg-emerald-500 text-white font-bold border-b border-[#F0EDE5] ${borderCls}`}
                        >
                          ✓
                        </td>
                      );
                    }
                    if (q >= p.qStart && q < p.qDone) {
                      return (
                        <td
                          key={q}
                          className={`p-2 text-center bg-amber-300 border-b border-[#F0EDE5] ${borderCls}`}
                        />
                      );
                    }
                    return (
                      <td key={q} className={`p-2 text-center border-b border-[#F0EDE5] ${borderCls}`} />
                    );
                  })}
                </tr>
              );
            })}

            {completed.map((tc) => (
              <tr key={tc.id}>
                <td className="p-2 font-semibold text-[#1F2022] border-b border-[#F0EDE5]">{tc.name}</td>
                {quarters.map((q) => (
                  <td
                    key={q}
                    className={`p-2 text-center bg-emerald-600 border-b border-[#F0EDE5] ${
                      q === currentQ ? "border-l-2 border-l-emerald-900" : ""
                    }`}
                  />
                ))}
              </tr>
            ))}

            {available.map((tc) => (
              <tr key={tc.id}>
                <td className="p-2 text-[#8A8C90] border-b border-[#F0EDE5]">
                  {tc.name}{" "}
                  <span className="italic text-[10px]">— Start in R&D tab →</span>
                </td>
                {quarters.map((q) => (
                  <td
                    key={q}
                    className={`p-2 text-center bg-[#F0EDE5] border-b border-[#F0EDE5] ${
                      q === currentQ ? "border-l-2 border-l-emerald-600" : ""
                    }`}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RDPipelineRoadmap;
