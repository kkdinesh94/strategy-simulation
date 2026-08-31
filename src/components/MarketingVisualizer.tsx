import React from "react";
import { TeamState, GameState } from "../types/simulation";
import { SEGMENTS, CLAIMS } from "../engine/catalog";
import { unitCost } from "../engine/simulationEngine";
import { Megaphone, Sparkles, AlertTriangle, CheckCircle2, Eye, Compass, PieChart } from "lucide-react";

interface MarketingVisualizerProps {
  team: TeamState;
  gameState: GameState;
}

export const MarketingVisualizer: React.FC<MarketingVisualizerProps> = ({ team, gameState }) => {
  const currentClaims = team.dec.claims || [];
  const primaryModel = team.models[0];

  // Media allocation percentages
  const alloc = team.dec.alloc || {};

  return (
    <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl p-5 shadow-2xs space-y-5 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E1D8] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200">
            <Megaphone className="w-5 h-5 text-emerald-800" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#1F2022]">Brand Positioning & Campaign Billboard Visualizer</h3>
            <p className="text-xs text-[#5A5C60]">Perceptual market map & ad copy compliance monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl font-bold text-emerald-700 shadow-2xs">
            Quarterly Ad Spend: Rs. {team.dec.ad} Lakhs
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Perceptual Market Positioning Map (Price vs Performance Matrix) */}
        <div className="bg-white p-4 rounded-xl border border-[#E0DCD3] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#1F2022] flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-600" /> 2D Perceptual Segment Positioning Map
            </div>
            <span className="text-[10px] font-mono text-[#8A8C90]">Price vs Tech Specs</span>
          </div>

          <div className="relative w-full h-56 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg p-3 flex flex-col justify-between overflow-hidden">
            {/* Axis Labels */}
            <div className="absolute top-2 left-2 text-[10px] font-mono font-bold text-[#5A5C60] uppercase">
              ↑ High Tech & Performance
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] font-mono font-bold text-[#5A5C60] uppercase">
              High Retail Price →
            </div>

            {/* Grid Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1F2022" strokeDasharray="3 3" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1F2022" strokeDasharray="3 3" />
            </svg>

            {/* Segment Target Circles */}
            {SEGMENTS.map((s, idx) => {
              // Position segments on 2D map:
              // S1 Budget: Low Price, Mid Tech
              // S2 Tech: High Price, High Tech
              // S3 Fleet: Low Price, Basic Tech
              // S4 Youth: Mid Price, High Style/Tech
              // S5 Executive: High Price, Mid-High Tech
              const coords: Record<string, { x: string; y: string; color: string }> = {
                S1: { x: "25%", y: "65%", color: "bg-emerald-100 border-emerald-500 text-emerald-900" },
                S2: { x: "75%", y: "20%", color: "bg-purple-100 border-purple-500 text-purple-900" },
                S3: { x: "20%", y: "80%", color: "bg-amber-100 border-amber-500 text-amber-900" },
                S4: { x: "50%", y: "35%", color: "bg-blue-100 border-blue-500 text-blue-900" },
                S5: { x: "80%", y: "30%", color: "bg-indigo-100 border-indigo-500 text-indigo-900" }
              };

              const pos = coords[s.id] || { x: "50%", y: "50%", color: "bg-gray-100 border-gray-400 text-gray-800" };
              const isPrim = team.prim === s.id;
              const isSec = team.sec === s.id;

              return (
                <div
                  key={s.id}
                  style={{ left: pos.x, top: pos.y }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold shadow-xs flex items-center gap-1 ${pos.color} ${
                    isPrim ? "ring-2 ring-emerald-600 scale-110" : isSec ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <span>{s.name}</span>
                  {isPrim && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />}
                </div>
              );
            })}

            {/* Your Models Plotted on Map */}
            {team.models.map((m) => {
              // Map model price (60k-160k) to X% and specs to Y%
              const normX = Math.min(85, Math.max(15, ((m.price - 60000) / 100000) * 70 + 15));
              const normY = Math.min(85, Math.max(15, 85 - (unitCost(m) / 90000) * 60));

              return (
                <div
                  key={m.id}
                  style={{ left: `${normX}%`, top: `${normY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#1F2022] text-white rounded-full text-[10px] font-bold shadow-md border border-amber-400 flex items-center gap-1.5 animate-bounce"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{m.name}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#5A5C60] font-mono pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Primary Target: {SEGMENTS.find((s) => s.id === team.prim)?.name}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Secondary: {SEGMENTS.find((s) => s.id === team.sec)?.name}
            </span>
          </div>
        </div>

        {/* 2. Interactive Ad Billboard & Claims Compliance Card */}
        <div className="bg-white p-4 rounded-xl border border-[#E0DCD3] space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#1F2022] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Live Campaign Billboard Mockup
            </div>
            <span className="text-[10px] font-mono text-[#8A8C90]">Ad Copy Verification</span>
          </div>

          {/* Visual Ad Billboard Box */}
          <div className="relative bg-gradient-to-br from-[#1F2022] via-[#2C2D30] to-[#121315] text-white p-4 rounded-xl border border-gray-800 shadow-md flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase font-mono">
                {team.name} EV Mobility
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                Q{gameState.quarter} Campaign
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-base font-extrabold text-white">
                {primaryModel ? primaryModel.name : "Aurora EV Series"}
              </div>
              <div className="text-xs text-emerald-300 font-semibold italic">
                {currentClaims.length > 0
                  ? currentClaims.map((c) => CLAIMS[c]).join(" • ")
                  : "Experience Pure Electric Mobility Today."}
              </div>
            </div>

            {/* Claim Compliance Status Badge */}
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-gray-400">Auditor Deceptive Claim Audit:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Compliant (No Penalty)
              </span>
            </div>
          </div>

          {/* Segment Media Allocation Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[#1F2022]">
              <span className="flex items-center gap-1"><PieChart className="w-3.5 h-3.5 text-emerald-600" /> Media Mix Breakdown</span>
              <span>100% Allocated</span>
            </div>
            <div className="w-full h-3 bg-[#FAF8F5] border border-[#E0DCD3] rounded-full overflow-hidden flex">
              {SEGMENTS.map((s, idx) => {
                const pct = alloc[s.id] || 0;
                const colors = ["bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-blue-500", "bg-indigo-500"];
                if (pct <= 0) return null;
                return (
                  <div
                    key={s.id}
                    style={{ width: `${pct}%` }}
                    className={`${colors[idx % colors.length]} h-full transition-all`}
                    title={`${s.name}: ${pct}%`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
