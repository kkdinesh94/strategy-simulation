import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Factory, Save, ShieldCheck, Users } from "lucide-react";

const DEFAULTS = {
  sales: { salary: 3.5, benefits: 8, vacation: 15, bonus: 10 },
  production: { salary: 2.5, benefits: 8, vacation: 18, bonus: 8, safetyBonus: 5 }
};

const LIMITS = {
  salary: [0, 10, 0.1],
  benefits: [0, 25, 1],
  vacation: [0, 35, 1],
  bonus: [0, 30, 1],
  safetyBonus: [0, 20, 1]
};

const labels = {
  salary: ["Base salary", "Rs. L / quarter"],
  benefits: ["Health benefits", "% of salary"],
  vacation: ["Vacation days", "days / year"],
  bonus: ["Performance bonus", "% of salary"],
  safetyBonus: ["Safety record bonus", "% of salary"]
};

function numberOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function packageValue(pkg, kind) {
  const safety = kind === "production" ? numberOr(pkg.safetyBonus, 0) : 0;
  return numberOr(pkg.salary, 0) * (1 + numberOr(pkg.benefits, 0) / 100 + numberOr(pkg.bonus, 0) / 100 + safety / 100) + numberOr(pkg.vacation, 0) * 0.03;
}

function packageFor(team, kind) {
  return { ...DEFAULTS[kind], ...(team?.hrCompensation?.[kind] || {}) };
}

function scoreFor(pkg, teams, kind) {
  const packages = (teams || []).map((team) => packageFor(team, kind));
  const values = packages.map((teamPackage) => packageValue(teamPackage, kind));
  const benchmark = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const benchmarkPackage = Object.keys(DEFAULTS[kind]).reduce((average, field) => {
    average[field] = packages.reduce((sum, teamPackage) => sum + numberOr(teamPackage[field], DEFAULTS[kind][field]), 0) / Math.max(1, packages.length);
    return average;
  }, {});
  const score = benchmark > 0 ? packageValue(pkg, kind) / benchmark : 1;
  return { benchmark, benchmarkPackage, score: Math.max(0.75, Math.min(1.25, score)) };
}

function Slider({ field, value, benchmark, onChange, disabled }) {
  const [min, max, step] = LIMITS[field];
  const [title, unit] = labels[field];
  const benchmarkPosition = `${Math.max(0, Math.min(100, ((benchmark - min) / (max - min)) * 100))}%`;
  return <label className="block space-y-1.5">
    <span className="flex items-center justify-between text-xs font-semibold text-[#303236]"><span>{title}</span><span className="font-mono text-emerald-700">{Number(value).toFixed(field === "salary" ? 1 : 0)} <span className="font-sans text-[10px] text-[#77797D]">{unit}</span></span></span>
    <span className="relative block"><input aria-label={title} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(field, Number(event.target.value))} className="relative z-10 w-full accent-emerald-600" /><span aria-hidden="true" className="absolute top-1/2 z-0 h-4 -translate-y-1/2 border-l-2 border-indigo-600" style={{ left: benchmarkPosition }} title={`Industry average: ${benchmark.toFixed(field === "salary" ? 1 : 0)}`} /></span>
    <span className="block text-[10px] text-indigo-700">Industry average marker: {benchmark.toFixed(field === "salary" ? 1 : 0)} {unit}</span>
  </label>;
}

function CompensationSection({ kind, title, icon, pkg, benchmark, benchmarkPackage, score, disabled, onChange }) {
  const fields = kind === "sales" ? ["salary", "benefits", "vacation", "bonus"] : ["salary", "benefits", "vacation", "bonus", "safetyBonus"];
  const productivity = Math.max(0.75, Math.min(1.25, score));
  return <section className="bg-white border border-[#E5E1D8] rounded-xl p-5 space-y-4">
    <div className="flex items-start justify-between gap-4 border-b border-[#EDE9E2] pb-3">
      <div className="flex items-center gap-2"><span className="text-emerald-700">{icon}</span><div><h2 className="font-bold text-[#1F2022]">{title}</h2><p className="text-[11px] text-[#77797D]">Quarterly offer compared with every team in this universe.</p></div></div>
      <div className={`text-right font-mono ${score >= 1 ? "text-emerald-700" : "text-amber-700"}`}><div className="text-[10px] uppercase text-[#77797D]">Relative score</div><div className="text-xl font-bold">{score.toFixed(2)}x</div></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
      {fields.map((field) => <Slider key={field} field={field} value={pkg[field]} benchmark={benchmarkPackage[field]} disabled={disabled} onChange={onChange} />)}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
      <div className="p-3 bg-[#FAF8F5] border border-[#EDE9E2] rounded-lg"><div className="text-[10px] uppercase text-[#77797D]">Your package score</div><strong className="font-mono">{packageValue(pkg, kind).toFixed(2)}</strong></div>
      <div className="p-3 bg-[#FAF8F5] border border-[#EDE9E2] rounded-lg"><div className="text-[10px] uppercase text-[#77797D]">Industry average</div><strong className="font-mono">{benchmark.toFixed(2)}</strong></div>
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg"><div className="text-[10px] uppercase text-emerald-800">{kind === "sales" ? "Demand / salesperson" : "Units / worker / day"}</div><strong className="font-mono text-emerald-800">{kind === "sales" ? `${(100 * productivity).toFixed(0)} units` : `${(8 * productivity).toFixed(2)} units`}</strong></div>
    </div>
  </section>;
}

export default function HRDashboard({ team, gameState, universeId, onChange, onNotify }) {
  const saved = team?.hrCompensation || {};
  const [sales, setSales] = useState(packageFor(team, "sales"));
  const [production, setProduction] = useState(packageFor(team, "production"));
  const [saving, setSaving] = useState(false);
  const teams = gameState?.teams || [];
  const salesStats = useMemo(() => scoreFor(sales, teams, "sales"), [sales, teams]);
  const productionStats = useMemo(() => scoreFor(production, teams, "production"), [production, teams]);
  const isLocked = Boolean(team?.dec?.locked);

  useEffect(() => {
    setSales(packageFor({ hrCompensation: saved }, "sales"));
    setProduction(packageFor({ hrCompensation: saved }, "production"));
  }, [team?.i]);

  const update = (kind, field, value) => {
    if (isLocked) return;
    const next = kind === "sales" ? { ...sales, [field]: value } : { ...production, [field]: value };
    if (kind === "sales") setSales(next); else setProduction(next);
    onChange({ ...team, hrCompensation: { ...(team.hrCompensation || {}), [kind]: next } });
  };

  const saveDecision = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/d1/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        sql: "INSERT INTO hr_decisions (id, universe_id, team_i, quarter, sales_json, production_json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET sales_json = excluded.sales_json, production_json = excluded.production_json, updated_at = datetime('now')",
        params: [`${universeId}:${team.i}:${gameState.quarter}`, universeId, team.i, gameState.quarter, JSON.stringify(sales), JSON.stringify(production)]
      }) });
      if (!response.ok) throw new Error("D1 rejected the compensation decision");
      onNotify?.("Compensation decisions saved to D1.");
    } catch (error) {
      onNotify?.(error.message || "Compensation decision could not be saved.");
    } finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Users className="w-6 h-6 text-emerald-700" /><h1 className="text-xl font-bold">Human Resources & Productivity</h1></div><p className="text-xs text-[#77797D] mt-1">Set offers for the teams that create demand and build every unit.</p></div><button type="button" onClick={saveDecision} disabled={saving || isLocked} className="inline-flex items-center gap-2 rounded-lg bg-[#1F2022] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="w-4 h-4" />{saving ? "Saving..." : "Save decision"}</button></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <CompensationSection kind="sales" title="Sales Force Compensation" icon={<Users className="w-5 h-5" />} pkg={sales} benchmark={salesStats.benchmark} benchmarkPackage={salesStats.benchmarkPackage} score={salesStats.score} disabled={isLocked} onChange={(field, value) => update("sales", field, value)} />
      <CompensationSection kind="production" title="Production Worker Compensation" icon={<ShieldCheck className="w-5 h-5" />} pkg={production} benchmark={productionStats.benchmark} benchmarkPackage={productionStats.benchmarkPackage} score={productionStats.score} disabled={isLocked} onChange={(field, value) => update("production", field, value)} />
    </div>
    <section className="bg-white border border-[#E5E1D8] rounded-xl p-5 space-y-3"><div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-700" /><h2 className="font-bold">Quarterly industry compensation comparison</h2></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase text-[#77797D] border-b border-[#E5E1D8]"><th className="p-2">Team</th><th className="p-2">Sales score</th><th className="p-2">Production score</th><th className="p-2">Sales productivity</th><th className="p-2">Plant productivity</th></tr></thead><tbody>{teams.map((rival) => { const s = scoreFor(packageFor(rival, "sales"), teams, "sales").score; const p = scoreFor(packageFor(rival, "production"), teams, "production").score; return <tr key={rival.i} className={`border-b border-[#F0EDE7] ${rival.i === team.i ? "bg-emerald-50" : ""}`}><td className="p-2 font-semibold">{rival.name}{rival.i === team.i ? " (you)" : ""}</td><td className="p-2 font-mono">{s.toFixed(2)}x</td><td className="p-2 font-mono">{p.toFixed(2)}x</td><td className="p-2 font-mono">{(100 * s).toFixed(0)}</td><td className="p-2 font-mono">{(8 * p).toFixed(2)}</td></tr>; })}</tbody></table></div></section>
    <div className="flex items-center gap-2 text-[11px] text-[#77797D]"><Factory className="w-4 h-4" /> Scores are benchmark-relative and bounded from 0.75x to 1.25x; they feed demand per salesperson and units produced per worker per day.</div>
  </div>;
}