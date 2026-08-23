import React from "react";
import { CheckCircle2, Factory, Lock } from "lucide-react";

const OPTIONS = [
  { location: "North America", laborCost: "$42 / unit", distributionCost: "$50 NA | $120 EU | $150 APAC", marketAccess: "Strong domestic access", politicalRisk: "Low", taxIncentive: "Eligible" },
  { location: "Europe", laborCost: "$48 / unit", distributionCost: "$120 NA | $45 EU | $135 APAC", marketAccess: "Strong regional access", politicalRisk: "Low", taxIncentive: "Eligible with conditions" },
  { location: "Asia-Pacific", laborCost: "$28 / unit", distributionCost: "$150 NA | $135 EU | $40 APAC", marketAccess: "Strong regional access", politicalRisk: "Moderate", taxIncentive: "Eligible" }
];

const DIMENSIONS = [
  ["Labor cost", "laborCost"],
  ["Distribution cost per region", "distributionCost"],
  ["Local market access", "marketAccess"],
  ["Political risk", "politicalRisk"],
  ["Tax incentive eligibility", "taxIncentive"]
];

export default function FacilityLocationWizard({ currentQuarter = 1, selectedLocation, isLocked = false, onSelect }) {
  const isQ1 = currentQuarter === 1;
  const hasSelection = Boolean(selectedLocation);
  const disabled = isLocked || !isQ1 || hasSelection;

  return (
    <section className="rounded-xl border border-[#E5E1D8] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Factory className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-[#1F2022]">Production Facility Location</h3>
          </div>
          <p className="text-xs text-[#5A5C60]">Choose your manufacturing region once during Q1.</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${disabled ? "border-slate-200 bg-slate-50 text-slate-500" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {disabled ? <Lock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {hasSelection ? "Location locked" : isQ1 ? "Q1 selection open" : "Selection closed"}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#E0DCD3] text-[10px] uppercase tracking-wider text-[#5A5C60]">
              <th className="p-3">Dimension</th>
              {OPTIONS.map((option) => <th key={option.location} className="p-3">{option.location}</th>)}
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map(([label, key]) => (
              <tr key={key} className="border-b border-[#F0EDE7] last:border-0">
                <th className="p-3 font-semibold text-[#1F2022]">{label}</th>
                {OPTIONS.map((option) => <td key={option.location} className="p-3 text-[#5A5C60]">{option[key]}</td>)}
              </tr>
            ))}
            <tr>
              <th className="p-3 font-semibold text-[#1F2022]">Decision</th>
              {OPTIONS.map((option) => (
                <td key={option.location} className="p-3">
                  <button type="button" disabled={disabled} onClick={() => onSelect?.(option.location)} className={`w-full rounded-lg border px-3 py-2 text-xs font-bold transition ${selectedLocation === option.location ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-[#D8D4CC] bg-white text-[#1F2022] hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"}`}>
                    {selectedLocation === option.location ? "Selected" : "Choose location"}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {!isQ1 && !hasSelection && <p className="mt-3 text-xs font-semibold text-amber-700">Facility location decisions are available only in Q1.</p>}
      {hasSelection && <p className="mt-3 text-xs font-semibold text-emerald-700">{selectedLocation} is locked for this team and cannot be changed.</p>}
    </section>
  );
}