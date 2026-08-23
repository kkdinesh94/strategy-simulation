import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Factory, Save } from "lucide-react";
import { unitCost } from "../engine/simulationEngine";

const DAYS = 65;
const COLORS = ["#0f766e", "#d97706", "#2563eb", "#be123c", "#7c3aed"];

function buildSchedule(team, settings) {
  const brands = team.models.map((model) => {
    const input = settings[model.id] || {};
    const target = Math.max(0, Math.round(Number(input.target) || 0));
    const replenish = Math.max(0, Math.min(target, Math.round(Number(input.replenish) || 0)));
    const historicalUnits = (team.hist || [])
      .flatMap((record) => record.models || record.modelRows || [])
      .filter((row) => row.name === model.name)
      .reduce((sum, row) => sum + Number(row.units || 0), 0);
    const demand = Math.max(1, Math.round(historicalUnits / Math.max(1, (team.hist || []).length * DAYS)) || Math.round(Math.max(target, model.inv || 0) / 20));
    return { id: model.id, name: model.name, inventory: Math.max(0, Number(model.inv) || 0), target, replenish, demand, cost: unitCost(model), daysAtZero: 0 };
  });
  const dailyCapacityCeiling = Math.max(0, Math.floor((Number(team.capacity) || 0) / DAYS));
  const operatingCapacity = Math.max(0, Math.min(Number(settings.operatingCapacity) || 0, dailyCapacityCeiling));
  const days = [];
  const inventory = brands.map((brand) => ({ id: brand.id, name: brand.name, values: [brand.inventory] }));
  let produced = 0;

  for (let day = 1; day <= DAYS; day += 1) {
    brands.forEach((brand) => {
      brand.inventory = Math.max(0, brand.inventory - brand.demand);
      if (brand.inventory === 0) brand.daysAtZero += 1;
    });
    const eligible = brands.filter((brand) => brand.inventory <= brand.replenish && brand.inventory < brand.target);
    const selected = eligible.sort((first, second) => first.inventory - second.inventory || first.id.localeCompare(second.id))[0];
    const amount = selected ? Math.min(operatingCapacity, selected.target - selected.inventory) : 0;
    if (selected && amount > 0) {
      selected.inventory += amount;
      produced += amount;
    }
    days.push({ day, brandId: selected && amount > 0 ? selected.id : null, units: amount });
    inventory.forEach((series) => {
      const brand = brands.find((item) => item.id === series.id);
      series.values.push(brand.inventory);
    });
  }

  const totalCapacity = operatingCapacity * DAYS;
  const producedByBrand = brands.map((brand) => ({ id: brand.id, units: days.filter((day) => day.brandId === brand.id).reduce((sum, day) => sum + day.units, 0) }));
  return {
    days,
    inventory,
    brands,
    produced,
    endingInventory: brands.reduce((sum, brand) => sum + brand.inventory, 0),
    cogs: producedByBrand.reduce((sum, item) => sum + item.units * (brands.find((brand) => brand.id === item.id)?.cost || 0), 0),
    utilisation: totalCapacity > 0 ? (produced / totalCapacity) * 100 : 0,
    stockouts: brands.filter((brand) => brand.daysAtZero > 0)
  };
}

function Chart({ result }) {
  const width = 760;
  const height = 190;
  const maxInventory = Math.max(1, ...result.inventory.flatMap((series) => series.values));
  const x = (day) => 28 + (day / DAYS) * (width - 42);
  const y = (value) => height - 22 - (value / maxInventory) * (height - 42);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="65 day production schedule and inventory levels">
      <line x1="28" y1={height - 22} x2={width - 14} y2={height - 22} stroke="#d6d3d1" />
      {result.days.map((day) => day.brandId ? <rect key={day.day} x={x(day.day - 1)} y="12" width={Math.max(2, (width - 42) / DAYS)} height="16" fill={COLORS[result.inventory.findIndex((series) => series.id === day.brandId) % COLORS.length]} opacity="0.85" /> : null)}
      {result.inventory.map((series, index) => (
        <polyline key={series.id} fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="2" points={series.values.map((value, day) => `${x(day)},${y(value)}`).join(" ")} />
      ))}
      <text x="28" y="10" fontSize="9" fill="#57534e">production by day</text>
      <text x="28" y={height - 5} fontSize="9" fill="#57534e">day 0</text>
      <text x={width - 42} y={height - 5} fontSize="9" fill="#57534e">day 65</text>
    </svg>
  );
}

export default function ProductionScheduler({ team, gameState, universeId, onChange, onNotify }) {
  const defaultSettings = useMemo(() => {
    const operatingCapacity = Math.max(1, Math.round((team.capacity || 0) / DAYS));
    return {
      operatingCapacity,
      ...Object.fromEntries(team.models.map((model) => [model.id, { target: Math.max(100, model.inv || operatingCapacity * 4), replenish: Math.max(50, Math.round(Math.max(100, model.inv || operatingCapacity * 4) * 0.4)) }]))
    };
  }, [team.capacity, team.models]);
  const [settings, setSettings] = useState(defaultSettings);
  const result = useMemo(() => buildSchedule(team, settings), [team, settings]);
  const dailyCapacityCeiling = Math.max(0, Math.floor((Number(team.capacity) || 0) / DAYS));
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => setSettings(defaultSettings), [defaultSettings]);

  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const updateBrand = (id, key, value) => setSettings((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  const applySchedule = () => {
    const production = result.brands.reduce((output, brand) => ({ ...output, [brand.id]: result.days.filter((day) => day.brandId === brand.id).reduce((sum, day) => sum + day.units, 0) }), {});
    onChange({ ...team, dec: { ...team.dec, prod: production } });
  };
  const saveSchedule = async () => {
    setSaveState("saving");
    try {
      const response = await fetch("/api/production-schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ universeId, teamId: team.i, quarter: gameState.quarter, inputs: settings, outputs: result }) });
      if (!response.ok) throw new Error("Unable to save schedule");
      setSaveState("saved");
      onNotify && onNotify("Production schedule saved.");
    } catch (error) {
      setSaveState("error");
      onNotify && onNotify(error.message);
    }
  };

  return (
    <section className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><Factory className="w-5 h-5 text-emerald-700" /><h3 className="text-lg font-bold text-[#1F2022]">Demand-pull production scheduler</h3></div><p className="text-xs text-[#5A5C60] mt-1">65 working days · pull the lowest inventory brand to its target before switching.</p></div>
        <div className="flex gap-2"><button type="button" onClick={applySchedule} disabled={team.dec.locked} className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">Apply to quarter</button><button type="button" onClick={saveSchedule} disabled={team.dec.locked || saveState === "saving"} className="px-3 py-2 rounded-lg border border-[#D6D3D1] text-xs font-bold disabled:opacity-50"><Save className="w-4 h-4 inline mr-1" />{saveState === "saved" ? "Saved" : "Save snapshot"}</button></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs font-mono text-[#57534e]">Operating capacity / day<input type="number" min="0" max={dailyCapacityCeiling} value={settings.operatingCapacity} disabled={team.dec.locked} onChange={(event) => updateSetting("operatingCapacity", Math.max(0, Math.min(dailyCapacityCeiling, Number(event.target.value))))} className="mt-1 w-full p-2 border border-[#D6D3D1] rounded-lg text-sm text-[#1F2022]" /></label>
        <div className="p-2 bg-[#FAF8F5] rounded-lg text-xs text-[#57534e]">Fixed capacity ceiling<div className="font-bold text-[#1F2022]">{dailyCapacityCeiling.toLocaleString("en-IN")} units/day</div></div>
        <div className="p-2 bg-[#FAF8F5] rounded-lg text-xs text-[#57534e]">Capacity utilisation<div className="font-bold text-[#1F2022]">{result.utilisation.toFixed(1)}%</div></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-[#57534e] border-b border-[#E7E5E4]"><th className="p-2">Brand</th><th className="p-2">Starting inventory</th><th className="p-2">Target inventory</th><th className="p-2">Replenishment point</th><th className="p-2">Demand / day</th></tr></thead><tbody>{team.models.map((model) => <tr key={model.id} className="border-b border-[#F0EEEB]"><td className="p-2 font-bold text-[#1F2022]">{model.name}</td><td className="p-2 font-mono">{model.inv || 0}</td><td className="p-2"><input type="number" min="0" value={settings[model.id]?.target || 0} disabled={team.dec.locked} onChange={(event) => updateBrand(model.id, "target", event.target.value)} className="w-28 p-1.5 border border-[#D6D3D1] rounded text-[#1F2022]" /></td><td className="p-2"><input type="number" min="0" value={settings[model.id]?.replenish || 0} disabled={team.dec.locked} onChange={(event) => updateBrand(model.id, "replenish", event.target.value)} className="w-28 p-1.5 border border-[#D6D3D1] rounded text-[#1F2022]" /></td><td className="p-2 font-mono">{result.brands.find((brand) => brand.id === model.id)?.demand}</td></tr>)}</tbody></table></div>
      <div className="border border-[#E7E5E4] rounded-lg p-3"><Chart result={result} /><div className="flex flex-wrap gap-3 text-[10px] font-mono">{result.inventory.map((series, index) => <span key={series.id} className="text-[#57534e]"><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }} />{series.name}</span>)}</div></div>
      {result.stockouts.length > 0 && <div className="p-3 rounded-lg bg-amber-50 text-amber-900 text-xs flex gap-2 border border-amber-200"><AlertTriangle className="w-4 h-4 shrink-0" /><span>Stockout warning: {result.stockouts.map((brand) => `${brand.name} (${brand.daysAtZero} days)`).join(", ")} reached zero inventory.</span></div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"><div className="p-3 bg-emerald-50 rounded-lg"><div className="text-[#57534e]">Projected ending inventory</div><strong className="text-lg text-emerald-800">{result.endingInventory.toLocaleString("en-IN")} units</strong></div><div className="p-3 bg-blue-50 rounded-lg"><div className="text-[#57534e]">Estimated COGS</div><strong className="text-lg text-blue-800">Rs. {result.cogs.toLocaleString("en-IN")}</strong></div><div className="p-3 bg-[#FAF8F5] rounded-lg"><div className="text-[#57534e]">Units produced</div><strong className="text-lg text-[#1F2022]">{result.produced.toLocaleString("en-IN")}</strong></div></div>
    </section>
  );
}