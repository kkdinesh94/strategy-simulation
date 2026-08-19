import React from "react";
import { TeamState, GameState } from "../types/simulation";
import { reliabilityOf } from "../engine/simulationEngine";
import { CAP_BLOCK, fmtRs } from "../engine/catalog";
import { Factory, ShieldCheck, Activity, AlertTriangle, ArrowUpRight, Cpu, Wrench } from "lucide-react";

interface OperationsVisualizerProps {
  team: TeamState;
  gameState: GameState;
}

export const OperationsVisualizer: React.FC<OperationsVisualizerProps> = ({ team, gameState }) => {
  const scheduledTotal = team.models.reduce((x, m) => x + (team.dec.prod[m.id] || 0), 0);
  const isOverCapacity = scheduledTotal > team.capacity;
  const reliab = reliabilityOf(team);
  const utilPct = Math.round((scheduledTotal / team.capacity) * 100);

  return (
    <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl p-5 shadow-2xs space-y-5 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E1D8] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-900 border border-blue-200">
            <Factory className="w-5 h-5 text-blue-800" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#1F2022]">Assembly Line & Quality SPC Visualizer</h3>
            <p className="text-xs text-[#5A5C60]">EV factory floor layout, capacity utilization & field safety monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl font-bold text-[#1F2022] shadow-2xs">
            Fixed Capacity: {team.capacity.toLocaleString("en-IN")} Units
          </div>
          <div
            className={`px-3 py-1.5 border rounded-xl font-bold shadow-2xs ${
              isOverCapacity
                ? "bg-red-100 border-red-300 text-red-800"
                : "bg-emerald-100 border-emerald-300 text-emerald-800"
            }`}
          >
            Utilization: {utilPct}% ({scheduledTotal.toLocaleString("en-IN")} Units)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Factory Assembly Line SVG Architectural Blueprint */}
        <div className="bg-white p-4 rounded-xl border border-[#E0DCD3] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#1F2022] flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-blue-600" /> 2D EV Assembly Line Flow
            </div>
            <span className="text-[10px] font-mono text-[#8A8C90]">Plant Layout Blueprint</span>
          </div>

          <div className="relative w-full bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg p-3 overflow-hidden">
            <svg viewBox="0 0 340 160" className="w-full h-auto drop-shadow-xs">
              {/* Outer Factory Building Boundary */}
              <rect x="10" y="10" width="320" height="140" rx="10" fill="#FFFFFF" stroke="#1F2022" strokeWidth="2" />

              {/* Station 1: Battery Decking */}
              <rect x="25" y="25" width="85" height="50" rx="6" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" />
              <text x="67" y="47" textAnchor="middle" fill="#1E40AF" fontSize="8" fontFamily="monospace" fontWeight="bold">
                1. CELL DECKING
              </text>
              <text x="67" y="60" textAnchor="middle" fill="#3B82F6" fontSize="7">
                LFP Battery Pack
              </text>

              {/* Station 2: Chassis Welding */}
              <rect x="127" y="25" width="85" height="50" rx="6" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
              <text x="169" y="47" textAnchor="middle" fill="#334155" fontSize="8" fontFamily="monospace" fontWeight="bold">
                2. CHASSIS MOUNT
              </text>
              <text x="169" y="60" textAnchor="middle" fill="#64748B" fontSize="7">
                Frame & Fork
              </text>

              {/* Station 3: Final Quality Testing & SPC Audit */}
              <rect x="230" y="25" width="85" height="50" rx="6" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5" />
              <text x="272" y="47" textAnchor="middle" fill="#047857" fontSize="8" fontFamily="monospace" fontWeight="bold">
                3. QUALITY SPC
              </text>
              <text x="272" y="60" textAnchor="middle" fill="#059669" fontSize="7">
                Thermal & Road Test
              </text>

              {/* Assembly Conveyor Belt Conveyor Line */}
              <line x1="25" y1="95" x2="315" y2="95" stroke="#1F2022" strokeWidth="3" strokeDasharray="6 4" />

              {/* Factory Storage Yard & Shipping Bay */}
              <rect x="25" y="110" width="290" height="30" rx="6" fill="#FAF8F5" stroke="#E0DCD3" strokeWidth="1" />
              <text x="170" y="129" textAnchor="middle" fill="#1F2022" fontSize="8" fontFamily="monospace" fontWeight="bold">
                FINISHED VEHICLE STORAGE & DISTRIBUTION BAY ({scheduledTotal.toLocaleString("en-IN")} Units / Qtr)
              </text>
            </svg>
          </div>
        </div>

        {/* 2. Quality SPC & Field Safety Index Gauge */}
        <div className="bg-white p-4 rounded-xl border border-[#E0DCD3] space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#1F2022] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Statistical Quality & Field Recall Safety Dial
            </div>
            <span className="text-[10px] font-mono text-[#8A8C90]">Reliability Rating</span>
          </div>

          <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E0DCD3] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#5A5C60] uppercase">Vehicle Reliability Index</span>
              <span className="text-xl font-bold font-mono text-emerald-700">{(reliab * 100).toFixed(1)} / 100</span>
            </div>

            {/* Quality Progress Bar */}
            <div className="w-full h-3 bg-white border border-[#E0DCD3] rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, reliab * 100)}%` }}
                className={`h-full transition-all ${
                  reliab >= 0.85 ? "bg-emerald-500" : reliab >= 0.7 ? "bg-amber-500" : "bg-red-500"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E0DCD3] text-xs font-mono">
              <div className="p-2 bg-white rounded-lg border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60]">Thermal Field Safety</div>
                <div className={`font-bold ${reliab >= 0.85 ? "text-emerald-700" : "text-amber-700"}`}>
                  {reliab >= 0.85 ? "Low Recall Risk" : "Moderate Hazard"}
                </div>
              </div>

              <div className="p-2 bg-white rounded-lg border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60]">Warranty Provision</div>
                <div className="font-bold text-[#1F2022]">
                  {((1 - reliab) * 5 + 1.5).toFixed(2)}% Rev
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              Wright's Law Cell Learning Curve: Accumulating manufacturing volume reduces unit BOM costs over time.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
