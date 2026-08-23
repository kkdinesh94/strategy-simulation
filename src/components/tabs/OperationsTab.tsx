import React from "react";
import { TeamState, GameState } from "../../types/simulation";
import { CAP_BLOCK, fmtRs } from "../../engine/catalog";
import { reliabilityOf } from "../../engine/simulationEngine";
import { Factory, ShieldCheck, Wrench, AlertTriangle, ArrowUpRight } from "lucide-react";
import { OperationsVisualizer } from "../OperationsVisualizer";
import FacilityLocationWizard from "../FacilityLocationWizard";
import ProductionScheduler from "../ProductionScheduler";

interface OperationsTabProps {
  team: TeamState;
  gameState: GameState;
  onChange: (updatedTeam: TeamState) => void;
  universeId?: string;
  onNotify?: (message: string) => void;
}

export const OperationsTab: React.FC<OperationsTabProps> = ({
  team,
  gameState,
  onChange,
  universeId,
  onNotify
}) => {
  const isLocked = team.dec.locked;
  const isQ1 = gameState.quarter === 1;

  const handleFacilitySelect = (location: string) => {
    if (isLocked || !isQ1 || team.dec.facilityLocked) return;
    onChange({
      ...team,
      dec: {
        ...team.dec,
        facilityLocation: location,
        facilityLocked: true
      }
    });
  };

  const handleProdChange = (modelId: string, units: number) => {
    if (isLocked) return;
    const updatedProd = {
      ...team.dec.prod,
      [modelId]: Math.max(0, Math.min(team.capacity, Math.round(units)))
    };
    onChange({
      ...team,
      dec: {
        ...team.dec,
        prod: updatedProd
      }
    });
  };

  const handleExpBlocksChange = (blocks: number) => {
    if (isLocked) return;
    onChange({
      ...team,
      dec: {
        ...team.dec,
        expBlocks: Math.max(0, Math.min(4, Math.round(blocks)))
      }
    });
  };

  const handleQualityChange = (val: number) => {
    if (isLocked) return;
    onChange({
      ...team,
      dec: {
        ...team.dec,
        quality: Math.max(0, Math.min(120, Math.round(val)))
      }
    });
  };

  const scheduledTotal = team.models.reduce((x, m) => x + (team.dec.prod[m.id] || 0), 0);
  const reliab = reliabilityOf(team);
  const isOverCapacity = scheduledTotal > team.capacity;

  return (
    <div className="space-y-6">
      {/* Facility Header */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Factory className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-[#1F2022]">
              Manufacturing & Operations Management
            </h2>
          </div>
          <p className="text-xs text-[#5A5C60]">
            Set quarterly production schedules by model, manage plant capacity expansion, and invest in Statistical Process Quality Control.
          </p>
        </div>

        <div className="p-3 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-center font-mono">
          <div className="text-[10px] uppercase text-[#5A5C60]">Current Fixed Plant Capacity</div>
          <div className="text-2xl font-bold text-[#1F2022]">
            {team.capacity.toLocaleString("en-IN")} <span className="text-xs font-normal">units/qtr</span>
          </div>
        </div>
      </div>

      {/* Operations & Assembly Line Visualizer */}
      <OperationsVisualizer team={team} gameState={gameState} />

      <FacilityLocationWizard
        currentQuarter={gameState.quarter}
        selectedLocation={team.dec.facilityLocation}
        isLocked={isLocked || Boolean(team.dec.facilityLocked)}
        onSelect={handleFacilitySelect}
      />

      <ProductionScheduler team={team} gameState={gameState} universeId={universeId} onChange={onChange} onNotify={onNotify} />
      <div className="hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1F2022]">
            Model Production Schedule (Units / Quarter)
          </h3>
          <span
            className={`font-mono text-xs font-bold px-3 py-1 rounded-full ${
              isOverCapacity ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            Scheduled: {scheduledTotal.toLocaleString("en-IN")} / {team.capacity.toLocaleString("en-IN")} units
          </span>
        </div>

        {isOverCapacity && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Scheduled production exceeds available fixed plant capacity. Reduce model runs or order capacity expansion blocks.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {team.models.map((m) => {
            const currentRun = team.dec.prod[m.id] || 0;
            return (
              <div
                key={m.id}
                className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0DCD3] space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-[#1F2022]">
                    {m.name}
                  </span>
                  {m.inv > 0 && (
                    <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {m.inv} in stock
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-[#5A5C60]">
                    Units to Produce
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={team.capacity}
                    step={50}
                    value={currentRun}
                    disabled={isLocked}
                    onChange={(e) => handleProdChange(m.id, +e.target.value)}
                    className="w-full p-2 font-mono font-bold text-sm bg-white border border-[#E0DCD3] rounded-lg text-[#1F2022]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EV-Native Operations Metrics: Cell Learning Curve & Quality Recall Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cell Learning Curve & Localisation */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-[#1F2022]">
              Cell Sourcing & Wright's Law Scale
            </h3>
          </div>
          <p className="text-xs text-[#5A5C60]">
            Battery cell costs drop by ~12% with every doubling of cumulative industry scale.
          </p>

          <div className="space-y-2 text-xs font-mono pt-1">
            <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
              <span className="text-[#5A5C60]">Wright's Law Cell Cost Index:</span>
              <span className="font-bold text-blue-700">
                {(Math.pow(1 + (gameState.quarter - 1) * 0.15, -0.18) * 100).toFixed(1)}% of Baseline
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
              <span className="text-[#5A5C60]">Domestic Value Addition (DVA):</span>
              <span className="font-bold text-emerald-700">
                62% (Qualifies for PM E-Drive Subsidy)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5A5C60]">Firm Scale Discount Earned:</span>
              <span className="font-bold text-[#1F2022]">
                {Math.min(12, Math.round(team.cumRevenue / 200))}% BOM Discount
              </span>
            </div>
          </div>
        </div>

        {/* Quality Safety & Incident Risk Gauge */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-[#1F2022]">
              Thermal Safety & Field Incident Risk
            </h3>
          </div>
          <p className="text-xs text-[#5A5C60]">
            Cumulative statistical quality spend protects against thermal safety field incidents as units on road grow.
          </p>

          <div className="space-y-2 text-xs font-mono pt-1">
            <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
              <span className="text-[#5A5C60]">Reliability Rating:</span>
              <span className="font-bold text-emerald-700">
                {(reliab * 100).toFixed(1)} / 100
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
              <span className="text-[#5A5C60]">Field Safety Risk Level:</span>
              <span className={`font-bold ${reliab >= 0.85 ? "text-emerald-700" : reliab >= 0.7 ? "text-amber-700" : "text-red-600"}`}>
                {reliab >= 0.85 ? "LOW (Safe)" : reliab >= 0.7 ? "MODERATE" : "HIGH (Recall Risk)"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5A5C60]">Warranty Claim Provision Rate:</span>
              <span className="font-bold text-[#1F2022]">
                {((1 - reliab) * 5 + 1.5).toFixed(2)}% of Revenue
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Expansion & Quality Program */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Capacity Expansion */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-[#1F2022]">
              Fixed Plant Expansion
            </h3>
          </div>

          <p className="text-xs text-[#5A5C60]">
            Capacity additions require 1 quarter lead time to build and debug assembly lines.
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-[#E0DCD3]">
              <span className="text-[#5A5C60]">Expansion Blocks (500 units / block):</span>
              <input
                type="number"
                min={0}
                max={4}
                step={1}
                value={team.dec.expBlocks || 0}
                disabled={isLocked}
                onChange={(e) => handleExpBlocksChange(+e.target.value)}
                className="w-20 p-1 text-right border border-[#E0DCD3] rounded font-bold bg-[#FAF8F5] text-[#1F2022]"
              />
            </div>
            <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
              <span className="text-[#5A5C60]">Capex Outlay (Rs. 120 L / block):</span>
              <span className="font-bold text-emerald-700">
                Rs. {(team.dec.expBlocks || 0) * CAP_BLOCK.cost} L
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5A5C60]">New Capacity Next Qtr:</span>
              <span className="font-bold text-[#1F2022]">
                {(team.capacity + (team.dec.expBlocks || 0) * CAP_BLOCK.units).toLocaleString("en-IN")} units
              </span>
            </div>
          </div>
        </div>

        {/* Statistical Quality Control */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-[#1F2022]">
              Quality Improvement Program
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
              <span className="text-[#5A5C60]">Current Vehicle Reliability Rating:</span>
              <span className="font-bold text-emerald-700">{reliab.toFixed(2)} (0.50 - 1.00)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#E0DCD3]">
              <span className="text-[#5A5C60]">Quality Improvement Spend (Rs. L):</span>
              <input
                type="number"
                min={0}
                max={120}
                step={5}
                value={team.dec.quality || 0}
                disabled={isLocked}
                onChange={(e) => handleQualityChange(+e.target.value)}
                className="w-24 p-1 text-right border border-[#E0DCD3] rounded font-bold bg-[#FAF8F5] text-[#1F2022]"
              />
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5A5C60]">Cumulative Quality Investment:</span>
              <span className="font-bold text-[#1F2022]">
                Rs. {team.qualityCum + (team.dec.quality || 0)} L
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#5A5C60]">
            Higher quality reduces warranty repair expenses and protects brand reputation.
          </p>
        </div>
      </div>
    </div>
  );
};
