import React from "react";
import { GameState, TeamState } from "../types/simulation";
import { fmtL } from "../engine/catalog";
import { cumBSC, equityOf } from "../engine/simulationEngine";
import { Award, TrendingUp, ShieldAlert, Users, PieChart, CheckCircle2, AlertTriangle, FileText, Download } from "lucide-react";

interface ExecutiveDebriefProps {
  gameState: GameState;
  currentTeam: TeamState;
}

export const ExecutiveDebrief: React.FC<ExecutiveDebriefProps> = ({ gameState, currentTeam }) => {
  const sortedTeams = [...gameState.teams].sort((a, b) => cumBSC(b) - cumBSC(a));
  const rank = sortedTeams.findIndex((t) => t.i === currentTeam.i) + 1;
  const topTeam = sortedTeams[0];

  // Calculate industry totals
  const totalCumRevenue = gameState.teams.reduce((acc, t) => acc + t.cumRevenue, 0);
  const totalCumProfit = gameState.teams.reduce((acc, t) => acc + t.cumProfit, 0);

  return (
    <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-6 space-y-6 text-[#1F2022]">
      {/* Debrief Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E0DCD3] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-lg text-purple-700 border border-purple-200">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1F2022] flex items-center gap-2">
              Automated Executive Debrief Pack
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono bg-purple-100 text-purple-800 rounded font-bold">
                Q{gameState.quarter} Industry Report
              </span>
            </h3>
            <p className="text-xs text-[#5A5C60]">
              Macro market analysis, competitive positioning, antagonist balance metrics, and strategic recommendations.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 bg-[#FAF8F5] hover:bg-slate-100 text-[#1F2022] border border-[#E0DCD3] rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export PDF Debrief
        </button>
      </div>

      {/* Cohort Market Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0DCD3]">
          <div className="text-[10px] font-mono uppercase text-[#5A5C60]">Your Cohort Rank</div>
          <div className="text-xl font-bold font-mono text-purple-700 mt-1">
            #{rank} <span className="text-xs text-[#5A5C60] font-normal">of {gameState.teams.length} firms</span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0DCD3]">
          <div className="text-[10px] font-mono uppercase text-[#5A5C60]">Market Leader</div>
          <div className="text-base font-bold text-[#1F2022] truncate mt-1">
            {topTeam.name}
          </div>
          <div className="text-xs font-mono text-[#5A5C60]">BSC Score: {cumBSC(topTeam).toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0DCD3]">
          <div className="text-[10px] font-mono uppercase text-[#5A5C60]">Industry Cumulative Rev</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {fmtL(totalCumRevenue)} L
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0DCD3]">
          <div className="text-[10px] font-mono uppercase text-[#5A5C60]">Industry Total Net Profit</div>
          <div className={`text-xl font-bold font-mono mt-1 ${totalCumProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {fmtL(totalCumProfit)} L
          </div>
        </div>
      </div>

      {/* Strategic Positioning & Antagonist Pair Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Antagonist Pair Breakdown */}
        <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E0DCD3] space-y-3">
          <h4 className="font-bold text-sm text-[#1F2022] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Strategic Antagonist Pair Analysis
          </h4>
          <p className="text-xs text-[#5A5C60] leading-relaxed">
            Simulation logic evaluates competing goals. Sustainable winning teams balance short-term profit against future capability investment.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            {/* Pair 1: Profit vs Investment */}
            <div className="p-3 bg-white rounded-lg border border-[#E0DCD3] space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Current Operating Profit vs. Future Investment</span>
                <span className="text-purple-700 font-mono font-bold">
                  {(currentTeam.cumFuture / Math.max(1, currentTeam.cumRevenue) * 100).toFixed(1)}% Reinvested
                </span>
              </div>
              <p className="text-[11px] text-[#5A5C60]">
                Reinvesting in R&D, quality, and channel expansion boosts long-term competitiveness while maintaining current margin health.
              </p>
            </div>

            {/* Pair 2: Demand Creation vs Service Network */}
            <div className="p-3 bg-white rounded-lg border border-[#E0DCD3] space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Sales Capacity vs. Service Network Ratio</span>
                <span className="text-blue-700 font-mono font-bold">
                  {currentTeam.centres > 0 ? `${currentTeam.centres} Hubs / ${currentTeam.staff} Staff` : "No Hubs"}
                </span>
              </div>
              <p className="text-[11px] text-[#5A5C60]">
                Scaling demand without proportional service technician capacity triggers customer dissatisfaction and warranty penalties.
              </p>
            </div>
          </div>
        </div>

        {/* Executive Actionable Lessons */}
        <div className="p-5 rounded-xl bg-purple-50/80 border border-purple-200 space-y-3">
          <h4 className="font-bold text-sm text-purple-950 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-700" />
            Key Executive Lessons & Debrief Insights
          </h4>
          <ul className="space-y-2.5 text-xs text-[#3A3C40]">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Product-Segment Match:</strong> Ensure BOM components align tightly with primary target preferences (e.g., LFP range for Commuters, peak kW for Performance).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Wright's Law Cell Dynamics:</strong> Industry volume drops battery pack costs across quarters. Early movers unlock scale economies.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Proprietary R&D Moats:</strong> Developing technologies like HyperCharge or ADAS creates defensible differentiation against price-cutting rivals.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
