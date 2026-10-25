import React, { useMemo } from "react";
import { Activity, Check, CircleDollarSign, FlaskConical, Search, ShieldCheck, Wrench } from "lucide-react";
import { reliabilityOf } from "../engine/simulationEngine";
import { QUALITY_ACTION_COST as ACTION_COST, QUALITY_STUDY_COST as STUDY_COST, applyQualityAction, initialQualityComponents as initialComponents, qualityActionBlocker, qualityActionCost } from "../lib/qualityProgramme";

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

    const blocker = qualityActionBlocker(component, action);
    if (blocker) {
      onNotify?.(blocker);
      return;
    }
    const cost = qualityActionCost(component, action);
    const next = applyQualityAction(component, action, currentQuarter);

    const updatedComponents = [...components];
    updatedComponents[index] = next;
    // The cost is charged as quality spending when the quarter runs (and checked by the
    // auditor's cash projection), not deducted from cash in the browser. The server replays
    // the same step from qualityProgramme.ts and sets the cost itself.
    onChange({
      ...team,
      qualityComponents: updatedComponents,
      dec: { ...team.dec, qualityActionCost: (team.dec.qualityActionCost || 0) + cost }
    });
    onNotify?.(`Rs. ${cost} L added to this quarter's quality budget.`);
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
