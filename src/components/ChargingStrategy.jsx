import React, { useEffect, useMemo, useState } from "react";
import { BatteryCharging, Check, Landmark, Save, Shield, TrendingUp } from "lucide-react";

const REGIONS = ["North America", "Europe", "Asia-Pacific", "India"];
const CHARGER_TYPES = {
  "Level 2 AC": { weight: 0.08, installationCost: 0.12, maintenance: 0.006, description: "Workplaces and destination charging" },
  "DC Fast Charge": { weight: 0.18, installationCost: 0.35, maintenance: 0.014, description: "Corridor and fleet-ready charging" },
  "Ultra-rapid 350kW": { weight: 0.3, installationCost: 0.7, maintenance: 0.025, description: "Premium high-throughput charging" }
};

const emptyInvestment = (region) => ({ region, charger_count: 0, charger_type: "DC Fast Charge" });
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function calculateInvestment(row) {
  const type = CHARGER_TYPES[row.charger_type] || CHARGER_TYPES["DC Fast Charge"];
  const count = Math.max(0, Math.floor(number(row.charger_count)));
  return {
    ...row,
    charger_count: count,
    installation_cost: Math.round(count * type.installationCost * 100) / 100,
    quarterly_maintenance: Math.round(count * type.maintenance * 100) / 100,
    demand_boost_pct: Math.round(count * type.weight * 100) / 100
  };
}

export default function ChargingStrategy({ teamId, quarter, onNotify }) {
  const [investments, setInvestments] = useState(REGIONS.map(emptyInvestment));
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/charging-network?teamId=${encodeURIComponent(teamId)}&quarter=${quarter}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.investments) ? data.investments : [];
        const current = rows.filter((row) => number(row.quarter) === quarter);
        setInvestments(REGIONS.map((region) => calculateInvestment(current.find((row) => row.region === region) || emptyInvestment(region))));
        setHistory(rows);
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("ready"); })
      .finally(() => { if (!cancelled) setStatus((current) => current === "saving" ? current : "ready"); });
    return () => { cancelled = true; };
  }, [teamId, quarter]);

  const totals = useMemo(() => investments.reduce((total, row) => {
    const calculated = calculateInvestment(row);
    return {
      chargers: total.chargers + calculated.charger_count,
      capex: total.capex + calculated.installation_cost,
      maintenance: total.maintenance + calculated.quarterly_maintenance,
      demand: total.demand + calculated.demand_boost_pct
    };
  }, { chargers: 0, capex: 0, maintenance: 0, demand: 0 }), [investments]);

  const depreciation = useMemo(() => history.reduce((total, row) => {
    const age = quarter - number(row.quarter);
    return age > 0 && age < 4 ? total + number(row.installation_cost) / 4 : total;
  }, totals.capex / 4), [history, quarter, totals.capex]);

  const updateInvestment = (region, changes) => {
    setInvestments((current) => current.map((row) => row.region === region ? calculateInvestment({ ...row, ...changes }) : row));
  };

  const save = async () => {
    setStatus("saving");
    try {
      const response = await fetch("/api/charging-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, quarter, investments: investments.map(calculateInvestment) })
      });
      if (!response.ok) throw new Error("Charging strategy could not be saved.");
      setStatus("saved");
      onNotify?.(`Charging network investment saved for Quarter ${quarter}.`);
    } catch (error) {
      setStatus("ready");
      onNotify?.(error.message || "Charging strategy could not be saved.");
    }
  };

  return <section className="space-y-6 font-sans">
    <div className="bg-[#202a2e] text-white p-6 rounded-lg flex flex-wrap justify-between gap-5 items-end">
      <div><div className="text-[#e77d8d] font-mono text-[10px] font-bold tracking-widest flex items-center gap-2"><BatteryCharging size={14} /> REGIONAL INFRASTRUCTURE</div><h1 className="text-3xl font-bold mt-3">Build the network that sells the vehicle.</h1><p className="text-[#c7d0ce] text-sm mt-2 max-w-2xl">Charging access reduces range anxiety for Fleet Manager and Urban Commuter demand, while building a local barrier to entry.</p></div>
      <div className="text-xs text-[#d6dfdc]">Quarter {quarter} · {status === "loading" ? "Loading" : "Draft ready"}</div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric label="Chargers deployed" value={totals.chargers.toLocaleString()} icon={<BatteryCharging size={16} />} />
      <Metric label="Current capex" value={`${totals.capex.toFixed(2)} L`} icon={<Landmark size={16} />} />
      <Metric label="Quarterly opex" value={`${totals.maintenance.toFixed(2)} L`} icon={<TrendingUp size={16} />} />
      <Metric label="Demand boost" value={`+${totals.demand.toFixed(2)}%`} icon={<Shield size={16} />} />
    </div>

    <div className="bg-white border border-[#E5E1D8] rounded-lg overflow-hidden">
      <div className="p-5 border-b border-[#E5E1D8] flex justify-between gap-3 items-center"><div><h2 className="font-bold text-[#1F2022]">Regional deployment plan</h2><p className="text-xs text-[#686b70] mt-1">Costs are shown in L and demand boost is charger count multiplied by charger-type weight.</p></div><span className="text-xs font-mono text-[#686b70]">{investments.length} regions</span></div>
      <div className="divide-y divide-[#E5E1D8]">{investments.map((row) => { const calculated = calculateInvestment(row); return <div key={row.region} className="p-5 grid gap-4 lg:grid-cols-[1fr_1.3fr_1fr_1fr_1fr] items-end">
        <div><div className="font-bold text-sm">{row.region}</div><div className="text-xs text-[#686b70] mt-1">+{calculated.demand_boost_pct.toFixed(2)}% demand</div></div>
        <label className="text-xs font-semibold">Charger type<select value={row.charger_type} onChange={(event) => updateInvestment(row.region, { charger_type: event.target.value })} className="mt-1 w-full border border-[#D8D3C9] rounded-md p-2 text-sm font-normal bg-[#FAF8F5]">{Object.entries(CHARGER_TYPES).map(([type, config]) => <option key={type} value={type}>{type} ({config.weight}% / charger)</option>)}</select></label>
        <label className="text-xs font-semibold">Charger count<input type="number" min="0" step="1" value={row.charger_count} onChange={(event) => updateInvestment(row.region, { charger_count: event.target.value })} className="mt-1 w-full border border-[#D8D3C9] rounded-md p-2 text-sm font-normal bg-[#FAF8F5]" /></label>
        <div className="text-xs"><span className="text-[#686b70] block">Installation capex</span><strong>{calculated.installation_cost.toFixed(2)} L</strong></div>
        <div className="text-xs"><span className="text-[#686b70] block">Quarterly maintenance</span><strong>{calculated.quarterly_maintenance.toFixed(2)} L</strong></div>
      </div>; })}</div>
      <div className="p-5 bg-[#FAF8F5] flex flex-wrap justify-between gap-3 items-center text-xs"><div><strong>Financial treatment:</strong> {depreciation.toFixed(2)} L depreciation this quarter; maintenance is operating expense.</div><button type="button" onClick={save} disabled={status === "saving" || status === "loading"} className="bg-[#1F2022] text-white rounded-md px-4 py-2 font-semibold flex items-center gap-2 disabled:opacity-50">{status === "saved" ? <Check size={15} /> : <Save size={15} />}{status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save deployment"}</button></div>
    </div>
  </section>;
}

function Metric({ label, value, icon }) { return <div className="bg-white border border-[#E5E1D8] rounded-lg p-4"><div className="text-[#9e263d] mb-2">{icon}</div><div className="text-xs text-[#686b70]">{label}</div><strong className="text-lg text-[#1F2022]">{value}</strong></div>; }
