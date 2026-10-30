import React from "react";
import { TeamState, GameState } from "../../types/simulation";
import { CAP_BLOCK, fmtRs } from "../../engine/catalog";
import { reliabilityOf } from "../../engine/simulationEngine";
import { Factory, ShieldCheck, AlertTriangle, ArrowUpRight } from "lucide-react";
import { AssemblyLine } from "../AssemblyLine";
import { SectionTabs } from "../SectionTabs";
import { DecisionComparison } from "../DecisionComparison";
import FacilityLocationWizard from "../FacilityLocationWizard";
import ProductionScheduler from "../ProductionScheduler";
import QualityDashboard from "../QualityDashboard";

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

  const [drawer, setDrawer] = React.useState<"schedule" | "capacity" | "site" | "cost">("schedule");
  const util = team.capacity > 0 ? scheduledTotal / team.capacity : 0;

  const kpis = [
    { label: "Scheduled", value: scheduledTotal.toLocaleString("en-IN"), note: `of ${team.capacity.toLocaleString("en-IN")} capacity`, tone: isOverCapacity ? "text-red-600" : "text-[#1F2022]" },
    { label: "Utilisation", value: `${Math.round(util * 100)}%`, note: util > 1 ? "over capacity" : util >= 0.97 ? "running at capacity" : util < 0.6 ? "idle lines still carry fixed cost" : "healthy load", tone: util > 1 ? "text-red-600" : util < 0.6 ? "text-amber-700" : "text-emerald-700" },
    { label: "Expansion", value: `+${((team.dec.expBlocks || 0) * CAP_BLOCK.units).toLocaleString("en-IN")}`, note: `Rs. ${(team.dec.expBlocks || 0) * CAP_BLOCK.cost} L capex, ready next quarter`, tone: "text-[#1F2022]" },
    { label: "Reliability", value: `${(reliab * 100).toFixed(0)} / 100`, note: reliab >= 0.85 ? "low recall risk" : reliab >= 0.7 ? "moderate recall risk" : "high recall risk", tone: reliab >= 0.85 ? "text-emerald-700" : reliab >= 0.7 ? "text-amber-700" : "text-red-600" }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="px-3 py-2.5 bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
            <div className="text-[11px] text-[#6C6D70]">{k.label}</div>
            <div className={`text-base font-bold font-mono ${k.tone}`}>{k.value}</div>
            <div className="text-[10px] text-[#8A8C90] truncate">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-3">
        <div className="flex items-center gap-2 px-1 mb-1">
          <Factory className="w-4 h-4 text-[#5A5C60]" />
          <h3 className="text-sm font-bold text-[#1F2022]">Plant floor, Q{gameState.quarter} plan</h3>
          {isOverCapacity && (
            <span className="ml-auto text-[11px] font-semibold text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Schedule exceeds capacity
            </span>
          )}
        </div>
        <AssemblyLine team={team} gameState={gameState} />
      </div>

      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="px-4 pt-3">
          <SectionTabs
            ariaLabel="Operations decisions"
            active={drawer}
            onChange={setDrawer}
            groups={[
              { label: "This quarter", tabs: [{ key: "schedule", label: "Production schedule" }, { key: "capacity", label: "Capacity & quality" }] },
              { label: "Plant", tabs: [{ key: "site", label: "Site" }, { key: "cost", label: "Cost & learning" }] }
            ]}
          />
        </div>
        <div className="p-4 space-y-4 drawer-flat">
          {drawer === "schedule" && <ProductionScheduler team={team} gameState={gameState} universeId={universeId} onChange={onChange} onNotify={onNotify} />}
          {drawer === "site" && (
            <FacilityLocationWizard currentQuarter={gameState.quarter} selectedLocation={team.dec.facilityLocation} isLocked={isLocked || Boolean(team.dec.facilityLocked)} onSelect={handleFacilitySelect} />
          )}
          {drawer === "cost" && (
            <>
              <DecisionComparison team={team} gameState={gameState} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cell Learning Curve & Localisation */}
        <div className="p-4 rounded-xl border border-[#E5E1D8] space-y-3">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-[#1F2022]">
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
        <div className="p-4 rounded-xl border border-[#E5E1D8] space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-[#1F2022]">
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
            </>
          )}
          {drawer === "capacity" && (
            <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Capacity Expansion */}
        <div className="p-4 rounded-xl border border-[#E5E1D8] space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-[#1F2022]">
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
        <div className="p-4 rounded-xl border border-[#E5E1D8] space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-[#1F2022]">
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
              <QualityDashboard team={team} gameState={gameState} onChange={onChange} onNotify={onNotify} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
