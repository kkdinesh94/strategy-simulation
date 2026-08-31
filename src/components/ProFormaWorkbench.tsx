import React, { useState } from "react";
import { TeamState, GameState } from "../types/simulation";
import { fmtL } from "../engine/catalog";
import { proFormaCalc } from "../engine/simulationEngine";
import { TrendingUp, DollarSign, Layers, CheckCircle2, BarChart3, Calculator, Sparkles } from "lucide-react";

interface ProFormaWorkbenchProps {
  team: TeamState;
  gameState: GameState;
}

interface ScenarioConfig {
  name: string;
  volumeMultiplier: number; // e.g. 0.8 for conservative, 1.0 for base, 1.25 for aggressive
  priceAdjustmentPct: number; // e.g. 0, +5%, -5%
}

export const ProFormaWorkbench: React.FC<ProFormaWorkbenchProps> = ({ team, gameState }) => {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(1);

  const scenarios: ScenarioConfig[] = [
    { name: "Conservative (80% Demand)", volumeMultiplier: 0.8, priceAdjustmentPct: 0 },
    { name: "Base Case Pro Forma (100% Demand)", volumeMultiplier: 1.0, priceAdjustmentPct: 0 },
    { name: "Aggressive Expansion (125% Demand)", volumeMultiplier: 1.25, priceAdjustmentPct: 0 }
  ];

  const basePf = proFormaCalc(gameState, team);

  // Compute projections for each scenario
  const scenarioResults = scenarios.map((sc) => {
    const totalBaseProd = (Object.values(team.dec.prod) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
    const estUnitsSold = Math.round(totalBaseProd * sc.volumeMultiplier);

    // Estimate Revenue based on weighted model prices
    let totalEstRevL = 0;
    if (totalBaseProd > 0) {
      for (const m of team.models) {
        const prod = Number(team.dec.prod[m.id]) || 0;
        if (prod > 0) {
          const adjPrice = m.price * (1 + sc.priceAdjustmentPct / 100);
          const modelUnits = Math.round(prod * sc.volumeMultiplier);
          totalEstRevL += (modelUnits * adjPrice) / 1e5;
        }
      }
    } else {
      totalEstRevL = 0;
    }

    const estCogs = basePf.out * sc.volumeMultiplier;
    const estGrossProfit = totalEstRevL - estCogs;
    const estNetProfit = estGrossProfit - basePf.running - basePf.people;
    // basePf.out already contains growth spend (dev/rnd/centreOpen/capex), so it
    // must not be subtracted a second time here or cash looks worse than it is.
    const estEndingCash = team.cash + totalEstRevL - basePf.out;

    return {
      sc,
      estUnitsSold,
      totalEstRevL,
      estGrossProfit,
      estNetProfit,
      estEndingCash
    };
  });

  const activeRes = scenarioResults[selectedScenarioIdx];

  return (
    <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-6 space-y-6">
      {/* Workbench Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E1D8] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 border border-blue-200">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1F2022] flex items-center gap-2">
              Pro Forma Scenario Workbench
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono bg-blue-100 text-blue-800 rounded font-bold">
                Interactive What-If
              </span>
            </h3>
            <p className="text-xs text-[#5A5C60]">
              Simulate cash flow, profitability, and unit economics under 3 market demand scenarios before locking decisions.
            </p>
          </div>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#E0DCD3]">
          {scenarios.map((sc, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedScenarioIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedScenarioIdx === idx
                  ? "bg-[#1F2022] text-white shadow-sm font-medium"
                  : "text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA]"
              }`}
            >
              {sc.name.split(" ")[0]} ({sc.volumeMultiplier * 100}%)
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarioResults.map((sr, idx) => {
          const isSelected = selectedScenarioIdx === idx;
          return (
            <div
              key={idx}
              onClick={() => setSelectedScenarioIdx(idx)}
              className={`p-4 rounded-xl border cursor-pointer transition space-y-3 ${
                isSelected
                  ? "border-[#1F2022] bg-white ring-2 ring-[#1F2022]/10 shadow-sm"
                  : "border-[#E5E1D8] bg-[#FAF8F5] hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-2">
                <div className="font-bold text-xs text-[#1F2022]">
                  {sr.sc.name}
                </div>
                {isSelected && (
                  <span className="text-[#C83E2B]">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#6C6D70]">
                  <span>Est. Volume Sold:</span>
                  <strong className="text-[#1F2022] font-mono">
                    {sr.estUnitsSold.toLocaleString()} units
                  </strong>
                </div>
                <div className="flex justify-between text-[#6C6D70]">
                  <span>Gross Revenue:</span>
                  <strong className="text-emerald-700 font-mono">
                    Rs. {sr.totalEstRevL.toFixed(1)} L
                  </strong>
                </div>
                <div className="flex justify-between text-[#6C6D70]">
                  <span>Net Profit / (Loss):</span>
                  <strong className={`font-mono ${sr.estNetProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    Rs. {sr.estNetProfit.toFixed(1)} L
                  </strong>
                </div>
                <div className="flex justify-between text-[#6C6D70] pt-1 border-t border-[#E5E1D8]">
                  <span>Projected Ending Cash:</span>
                  <strong className={`font-mono font-bold ${sr.estEndingCash >= 0 ? "text-blue-800" : "text-red-700"}`}>
                    Rs. {sr.estEndingCash.toFixed(1)} L
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Scenario Financial Pro Forma Sheet */}
      <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#E5E1D8] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1F2022]" />
            <h4 className="font-bold text-sm text-[#1F2022]">
              {activeRes.sc.name} — Full Statement Breakdown
            </h4>
          </div>
          <span className="text-xs font-mono text-[#7A7C80]">
            Period Q{gameState.quarter} Simulation
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-[#E0DCD3] shadow-sm">
            <div className="text-[10px] text-[#7A7C80] uppercase font-mono">Cost of Production (COGS)</div>
            <div className="font-mono font-bold text-[#1F2022] text-sm mt-0.5">
              Rs. {basePf.materials.toFixed(1)} L
            </div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-[#E0DCD3] shadow-sm">
            <div className="text-[10px] text-[#7A7C80] uppercase font-mono">Payroll & Sales Staff</div>
            <div className="font-mono font-bold text-[#1F2022] text-sm mt-0.5">
              Rs. {basePf.people.toFixed(1)} L
            </div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-[#E0DCD3] shadow-sm">
            <div className="text-[10px] text-[#7A7C80] uppercase font-mono">Growth & R&D Outlays</div>
            <div className="font-mono font-bold text-[#1F2022] text-sm mt-0.5">
              Rs. {basePf.growth.toFixed(1)} L
            </div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-[#E0DCD3] shadow-sm">
            <div className="text-[10px] text-[#7A7C80] uppercase font-mono">Running Opex & Interest</div>
            <div className="font-mono font-bold text-[#1F2022] text-sm mt-0.5">
              Rs. {basePf.running.toFixed(1)} L
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

