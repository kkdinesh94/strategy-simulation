import React from "react";
import { TeamState, GameState } from "../types/simulation";
import { TECHS, techById, fmtRs } from "../engine/catalog";
import { Cpu, CheckCircle2, Clock, Zap, Award, ArrowRight, Activity, ShieldCheck, Handshake } from "lucide-react";

interface RnDVisualizerProps {
  team: TeamState;
  gameState: GameState;
  onSelectTech?: (techId: string) => void;
  selectedTechId?: string;
}

export const RnDVisualizer: React.FC<RnDVisualizerProps> = ({
  team,
  gameState,
  onSelectTech,
  selectedTechId
}) => {
  const pendingStarts = (team.dec as any).rndStarts || [];

  // Technology categorised nodes
  const techNodes = TECHS.map((tc) => {
    const isOwned = team.techs.includes(tc.id);
    const inProgress = team.rnd.find((p) => p.id === tc.id);
    const isPending = pendingStarts.find((p: any) => p.id === tc.id);

    return {
      ...tc,
      isOwned,
      inProgress,
      isPending,
      status: isOwned ? "completed" : inProgress ? "lab" : isPending ? "pending" : "available"
    };
  });

  const totalCompleted = team.techs.length;
  const inLabCount = team.rnd.length + pendingStarts.length;

  return (
    <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl p-5 shadow-2xs space-y-4 select-none">
      {/* Header & Lab Gauges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E1D8] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-900 border border-purple-200">
            <Cpu className="w-5 h-5 text-purple-800" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#1F2022]">R&D Technology Blueprint & Tech Tree</h3>
            <p className="text-xs text-[#5A5C60]">Interactive laboratory pipeline & proprietary IP matrix</p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl text-center shadow-2xs">
            <span className="text-[10px] text-[#5A5C60] block uppercase">Proprietary IP</span>
            <span className="font-bold text-emerald-700">{totalCompleted} / {TECHS.length} Techs</span>
          </div>
          <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl text-center shadow-2xs">
            <span className="text-[10px] text-[#5A5C60] block uppercase">Lab Capacity</span>
            <span className={`font-bold ${inLabCount >= 2 ? "text-amber-700" : "text-purple-700"}`}>
              {inLabCount} / 2 Active Runs
            </span>
          </div>
        </div>
      </div>

      {/* SVG Tech Tree Interactive Blueprint Diagram */}
      <div className="relative w-full bg-white rounded-xl border border-[#E0DCD3] p-4 overflow-hidden shadow-inner">
        <div className="text-[10px] font-mono text-[#8A8C90] uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Laboratory Technology Architecture Graph</span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <Activity className="w-3 h-3 animate-pulse" /> Q{gameState.quarter} Active R&D Matrix
          </span>
        </div>

        {/* Tech Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {techNodes.map((node) => {
            const isSelected = selectedTechId === node.id;

            let badgeBg = "bg-gray-100 text-gray-700 border-gray-300";
            let nodeBorder = "border-[#E0DCD3] bg-[#FAF8F5]";
            if (node.isOwned) {
              badgeBg = "bg-emerald-100 text-emerald-900 border-emerald-300";
              nodeBorder = "border-emerald-400 bg-emerald-50/50";
            } else if (node.inProgress) {
              badgeBg = "bg-amber-100 text-amber-900 border-amber-300";
              nodeBorder = "border-amber-400 bg-amber-50/50";
            } else if (node.isPending) {
              badgeBg = "bg-purple-100 text-purple-900 border-purple-300";
              nodeBorder = "border-purple-400 bg-purple-50/50";
            }

            return (
              <div
                key={node.id}
                onClick={() => onSelectTech && onSelectTech(node.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${nodeBorder} ${
                  isSelected ? "ring-2 ring-purple-600 shadow-md scale-[1.01]" : "hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                    {node.id}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border font-semibold flex items-center gap-1 ${badgeBg}`}>
                    {node.isOwned && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                    {node.inProgress && <Clock className="w-3 h-3 text-amber-700 animate-spin" />}
                    {node.isPending && <Zap className="w-3 h-3 text-purple-700" />}
                    {!node.isOwned && !node.inProgress && !node.isPending && "Available"}
                    {node.isOwned ? "Completed" : node.inProgress ? `Ready Q${node.inProgress.qDone}` : node.isPending ? "Queued" : "Not Started"}
                  </span>
                </div>

                <div className="font-bold text-xs text-[#1F2022] mb-1">{node.name}</div>
                <div className="text-[11px] text-[#5A5C60] line-clamp-2 mb-2">{node.note}</div>

                <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#E0DCD3] pt-2 text-[#5A5C60]">
                  <span>Std: Rs. {node.std} L (2 Qtrs)</span>
                  <span className="text-purple-800 font-semibold">Crash: Rs. {node.fast} L (1 Qtr)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Performance Boost & Licensing Visual Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-white border border-[#E0DCD3] rounded-xl flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1F2022]">Product Line Engineering Upgrade</div>
            <div className="text-[11px] text-[#5A5C60]">
              Completed R&D unlocks high-tier BOM specs (Solid State Cells, ABS Brakes, AI Telematics).
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#E0DCD3] rounded-xl flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1F2022]">IP Licensing & Royalties</div>
            <div className="text-[11px] text-[#5A5C60]">
              Monetize proprietary technology by offering exclusive licenses to competitor firms.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
