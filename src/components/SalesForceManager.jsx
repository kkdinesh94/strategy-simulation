import React, { useState } from "react";
import { BarChart3, Calculator, Info, MapPin, Users } from "lucide-react";
import { MARKETS } from "../engine/catalog";

const BENCHMARK = { salary: 3.5, benefits: 0.7, bonus: 0.5 };
const DEFAULT_PACKAGE = { salary: 3.5, benefits: 0.7, bonus: 0.5 };

const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function packageScore(pkg) {
  const compensation = pkg.salary + pkg.benefits + pkg.bonus;
  const benchmark = BENCHMARK.salary + BENCHMARK.benefits + BENCHMARK.bonus;
  return Math.max(0.7, Math.min(1.4, compensation / benchmark));
}

export default function SalesForceManager({ team, gameState, onChange }) {
  const saved = team?.draft?.salesForce || {};
  const [pkg, setPkg] = useState({ ...DEFAULT_PACKAGE, ...saved.package });
  const totalStaff = Math.max(0, numberOr(team?.staff, 0) + numberOr(team?.dec?.hire, 0));
  const isLocked = Boolean(team?.dec?.locked);
  const score = packageScore(pkg);
  const demandPerPerson = 100 * score;

  const ownedCities = team?.storeCities || [];
  const pendingCities = team?.dec?.newCentreCities || [];
  const offices = MARKETS.filter((m) => ownedCities.includes(m.id) || pendingCities.includes(m.id)).map((m) => ({
    ...m,
    status: ownedCities.includes(m.id) ? "Operating" : "Opening this quarter"
  }));
  const staffPerOffice = offices.length > 0 ? Math.round(totalStaff / offices.length) : totalStaff;

  const updatePackage = (field, value) => {
    if (isLocked) return;
    const next = { ...pkg, [field]: Math.max(0, numberOr(value, 0)) };
    setPkg(next);
    const nextScore = packageScore(next);
    onChange({ ...team, hr: { ...team.hr, sales: Math.round(nextScore * 100) }, draft: { ...team.draft, salesForce: { package: next } } });
  };

  const averages = (gameState?.teams || []).reduce((sum, rival) => ({
    salary: sum.salary + numberOr(rival.draft?.salesForce?.package?.salary, BENCHMARK.salary),
    benefits: sum.benefits + numberOr(rival.draft?.salesForce?.package?.benefits, BENCHMARK.benefits),
    bonus: sum.bonus + numberOr(rival.draft?.salesForce?.package?.bonus, BENCHMARK.bonus)
  }), { salary: 0, benefits: 0, bonus: 0 });
  const teamCount = Math.max(1, gameState?.teams?.length || 0);

  return <section className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-5">
    <div className="flex items-start justify-between gap-4 border-b border-[#E5E1D8] pb-4">
      <div>
        <div className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-700" /><h3 className="text-base font-bold">Sales Force Manager</h3></div>
        <p className="text-xs text-[#5A5C60] mt-1">Tune compensation to drive sales productivity across your real store network.</p>
      </div>
      <div className="text-right font-mono"><div className="text-[10px] uppercase text-[#5A5C60]">Productivity score</div><div className="text-xl font-bold text-emerald-700">{score.toFixed(2)}x</div></div>
    </div>

    <div>
      <div className="text-[10px] font-bold uppercase text-[#7B8585] mb-2">Your stores ({offices.length}) · {totalStaff} sales staff, ~{staffPerOffice}/store</div>
      {offices.length === 0 ? (
        <p className="text-xs text-[#5A5C60]">No stores opened yet — pick markets in the Distribution & Retail panel above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {offices.map((office) => (
            <div key={office.id} className={`p-3 rounded-xl border text-xs ${office.status === "Operating" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-300"}`}>
              <div className="font-bold text-[#1F2022] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-700" />{office.city}</div>
              <div className="text-[10px] text-[#5A5C60]">{office.region}</div>
              <div className="text-[10px] font-semibold mt-1" style={{ color: office.status === "Operating" ? "#047857" : "#B45309" }}>{office.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-3"><div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-amber-600" /><h4 className="text-sm font-bold">Compensation package builder</h4></div>{[["salary", "Base salary (Rs. L / qtr)"], ["benefits", "Health benefits (Rs. L / qtr)"], ["bonus", "Performance bonus (Rs. L / qtr)"]].map(([field, label]) => <label className="flex items-center justify-between gap-3 text-xs" key={field}>{label}<input type="number" min="0" step="0.1" disabled={isLocked} value={pkg[field]} onChange={(event) => updatePackage(field, event.target.value)} className="w-24 p-1.5 text-right border border-[#E0DCD3] rounded bg-[#FAF8F5]" /></label>)}<div className="text-xs font-mono text-[#5A5C60]">Total package: <strong className="text-[#1F2022]">Rs. {(pkg.salary + pkg.benefits + pkg.bonus).toFixed(1)} L</strong> per salesperson</div></div>
      <div><div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-indigo-600" /><h4 className="text-sm font-bold">Industry benchmark across all teams</h4></div><table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase text-[#5A5C60] border-b border-[#E5E1D8]"><th className="p-2">Metric</th><th className="p-2">Industry avg</th><th className="p-2">Your package</th></tr></thead><tbody>{[["Average salary", averages.salary / teamCount, pkg.salary], ["Average benefits", averages.benefits / teamCount, pkg.benefits], ["Average bonus", averages.bonus / teamCount, pkg.bonus]].map(([label, average, current]) => <tr className="border-b border-[#F0EDE7]" key={label}><td className="p-2">{label}</td><td className="p-2 font-mono">Rs. {Number(average).toFixed(1)} L</td><td className="p-2 font-mono font-bold">Rs. {Number(current).toFixed(1)} L</td></tr>)}</tbody></table></div>
    </div>
    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex gap-2"><Info className="w-4 h-4 shrink-0" /><span title="Productivity score = (salary + benefits + bonus) / industry benchmark total. Demand per salesperson = 100 base demand units x productivity score."><strong>Productivity forecast:</strong> {demandPerPerson.toFixed(0)} demand units per salesperson <span className="underline cursor-help">(formula)</span>. Higher relative compensation increases productivity and demand capacity.</span></div>
  </section>;
}
