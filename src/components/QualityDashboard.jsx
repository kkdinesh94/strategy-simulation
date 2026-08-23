import React, { useMemo } from "react";
import { Activity, Check, CircleDollarSign, FlaskConical, Search, ShieldCheck, Wrench } from "lucide-react";
import { reliabilityOf } from "../engine/simulationEngine";

const COMPONENTS = [
  { id: "battery-pack", category: "Battery Pack", warranty: 18, defect: 12, inspection: 8 },
  { id: "charging-system", category: "Charging System", warranty: 12, defect: 8, inspection: 6 },
  { id: "drive-motor", category: "Drive Motor", warranty: 10, defect: 7, inspection: 5 },
  { id: "software", category: "Software", warranty: 8, defect: 5, inspection: 4 }
];

const STUDY_COST = 12;
const ACTION_COST = 25;

function initialComponents() {
  return COMPONENTS.map((component) => ({
    qcId: component.id,
    componentCategory: component.category,
    inspectionActive: false,
    varianceStudyDone: false,
    sourceActionStudyDone: false,
    improvementInvested: 0,
    warrantyCostPerQuarter: component.warranty,
    defectCostPerQuarter: component.defect,
    inspectionCost: component.inspection,
    reliabilityImprovement: 0
  }));
}

function statusFor(component, quarter) {
  if (component.sourceActionStudyDone && (component.improvementQuarter || quarter) <= quarter) return "improved";
  if (component.inspectionActive) return "inspecting";
  return "inactive";
}

export default function QualityDashboard({ team, gameState, onChange, onNotify }) {
  const components = team.qualityComponents?.length ? team.qualityComponents : initialComponents();
  const currentQuarter = gameState.quarter;
  const latestWarranty = team.hist?.length ? team.hist[team.hist.length - 1].warranty : 0;
  const salesWarranty = latestWarranty > 0 ? latestWarranty : Math.max(0, Math.round((team.cumRevenue || 0) * 0.012));
  const reliability = Math.round(reliabilityOf({ ...team, qualityComponents: components }) * 1000) / 10;
  const timeline = useMemo(() => [currentQuarter, currentQuarter + 1, currentQuarter + 2, currentQuarter + 3], [currentQuarter]);

  const updateComponent = (componentId, action) => {
    if (team.dec.locked) {
      onNotify?.("Quality decisions are locked for this quarter.");
      return;
    }
    const index = components.findIndex((component) => component.qcId === componentId);
    const component = components[index];
    if (!component) return;

    const cost = action === "inspect" ? component.inspectionCost : action === "study" ? STUDY_COST : ACTION_COST;
    if ((team.cash || 0) < cost) {
      onNotify?.(`Insufficient cash for this quality action (Rs. ${cost} L required).`);
      return;
    }
    if (action === "study" && !component.inspectionActive) {
      onNotify?.("Start inspection before studying variance.");
      return;
    }
    if (action === "improve" && !component.varianceStudyDone) {
      onNotify?.("Complete the variance study before funding an action.");
      return;
    }

    const next = { ...component };
    if (action === "inspect") {
      next.inspectionActive = true;
      next.warrantyCostPerQuarter = Math.round(next.warrantyCostPerQuarter * 0.85 * 10) / 10;
    }
    if (action === "study") next.varianceStudyDone = true;
    if (action === "improve") {
      next.sourceActionStudyDone = true;
      next.improvementInvested += cost;
      next.reliabilityImprovement += 12;
      next.improvementQuarter = currentQuarter + 2;
      next.warrantyCostPerQuarter = Math.round(next.warrantyCostPerQuarter * 0.65 * 10) / 10;
      next.defectCostPerQuarter = Math.round(next.defectCostPerQuarter * 0.55 * 10) / 10;
    }

    const updatedComponents = [...components];
    updatedComponents[index] = next;
    onChange({
      ...team,
      cash: (team.cash || 0) - cost,
      qualityCum: (team.qualityCum || 0) + cost,
      qualityComponents: updatedComponents
    });
  };

  return (
    <section className="bg-white border border-[#E5E1D8] rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#E5E1D8] flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /><h2 className="text-xl font-bold text-[#1F2022]">Component Quality Dashboard</h2></div>
          <p className="text-xs text-[#5A5C60] mt-1">ASCM quality decision matrix: monitor, inspect, study variation, then remove the source of defects.</p>
        </div>
        <div className="flex gap-2 text-xs font-mono">
          <div className="px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg"><span className="text-[#5A5C60]">Sales warranty / Qtr</span><strong className="block text-[#1F2022]">Rs. {salesWarranty.toFixed(1)} L</strong></div>
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg"><span className="text-emerald-700">Reliability rating</span><strong className="block text-emerald-800">{reliability} / 100</strong></div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-mono">
          {["1. Monitor warranty", "2. Inspect", "3. Study variance", "4. Improve process"].map((step, index) => (
            <div key={step} className="flex items-center gap-2 p-2 border border-[#E0DCD3] rounded-lg bg-[#FAF8F5]"><span className="w-6 h-6 rounded-full bg-[#1F2022] text-white flex items-center justify-center font-bold">{index + 1}</span>{step}</div>
          ))}
        </div>

        <div className="overflow-x-auto border border-[#E0DCD3] rounded-lg">
          <table className="w-full min-w-[860px] text-xs">
            <thead className="bg-[#FAF8F5] text-[#5A5C60] font-mono uppercase"><tr><th className="text-left p-3">Component / cost signal</th>{timeline.map((quarter) => <th key={quarter} className="p-3 text-center">Q{quarter}</th>)}<th className="p-3 text-right">Decision</th></tr></thead>
            <tbody>{components.map((component) => {
              const status = statusFor(component, currentQuarter);
              return <tr key={component.qcId} className="border-t border-[#E0DCD3]">
                <td className="p-3"><div className="font-bold text-[#1F2022]">{component.componentCategory}</div><div className="text-[10px] text-[#5A5C60]">Warranty Rs. {component.warrantyCostPerQuarter} L/Qtr · Defect Rs. {component.defectCostPerQuarter} L/Qtr</div></td>
                {timeline.map((quarter, offset) => { const quarterStatus = statusFor(component, quarter); return <td key={quarter} className="p-2"><div className={`h-10 rounded-md border flex flex-col items-center justify-center ${quarterStatus === "improved" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : quarterStatus === "inspecting" ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-red-100 border-red-300 text-red-800"}`}><span className="font-bold">{quarterStatus === "improved" ? "GREEN" : quarterStatus === "inspecting" ? "YELLOW" : "RED"}</span><span className="text-[9px]">{offset === 0 ? "current" : `n+${offset}`}</span></div></td>; })}
                <td className="p-3"><div className="flex justify-end gap-1.5"><button title="Inspect component" disabled={component.inspectionActive} onClick={() => updateComponent(component.qcId, "inspect")} className="p-2 rounded-md border border-amber-300 text-amber-800 disabled:opacity-40"><Search className="w-4 h-4" /></button><button title={`Variance study (Rs. ${STUDY_COST} L)`} disabled={component.varianceStudyDone || !component.inspectionActive} onClick={() => updateComponent(component.qcId, "study")} className="p-2 rounded-md border border-blue-300 text-blue-800 disabled:opacity-40"><FlaskConical className="w-4 h-4" /></button><button title={`Process improvement (Rs. ${ACTION_COST} L)`} disabled={component.sourceActionStudyDone || !component.varianceStudyDone} onClick={() => updateComponent(component.qcId, "improve")} className="p-2 rounded-md border border-emerald-300 text-emerald-800 disabled:opacity-40"><Wrench className="w-4 h-4" /></button></div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800"><Activity className="w-4 h-4 mb-1" />No action: warranty and defect costs continue.</div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800"><CircleDollarSign className="w-4 h-4 mb-1" />Inspection costs are paid now and partially reduce warranty exposure.</div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800"><Check className="w-4 h-4 mb-1" />Improvement becomes permanent after two quarters and lifts reliability.</div>
        </div>
      </div>
    </section>
  );
}
