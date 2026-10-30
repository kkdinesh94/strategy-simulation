import React, { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import worldTopoJson from "world-atlas/countries-110m.json";
import { MARKETS, DEFAULT_MARKET_IDS, BALANCE, CHARGER_TYPES } from "../engine/catalog";
import { unitCost } from "../engine/simulationEngine";
import { BatteryCharging, Check, Save } from "lucide-react";

// The four home metro clusters every team sells in (see DEFAULT_MARKET_IDS in the catalog).
const CITIES = MARKETS.filter((m) => DEFAULT_MARKET_IDS.includes(m.id));
const REGIONS = CITIES.map((m) => m.city);
const CAP = BALANCE.maxChargingBoost * 100;

const emptyInvestment = (region) => ({ region, charger_count: 0, charger_type: "DC Fast Charge" });
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

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

/**
 * Charging network: chargers stay in service once built, so the network and its demand boost
 * accumulate quarter by quarter, capped in total; maintenance recurs, installation is paid once.
 */
export default function ChargingStrategy({ teamId, quarter, onNotify, team }) {
  const [investments, setInvestments] = useState(REGIONS.map(emptyInvestment));
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/charging-network?teamId=${encodeURIComponent(teamId)}&quarter=${quarter}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.investments) ? data.investments : [];
        const current = rows.filter((row) => number(row.quarter) === quarter);
        setInvestments(REGIONS.map((region) => calculateInvestment(current.find((row) => row.region === region) || emptyInvestment(region))));
        setHistory(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, quarter]);

  const built = useMemo(() => history.filter((row) => number(row.quarter) < quarter), [history, quarter]);
  const plan = investments.map(calculateInvestment);
  const sum = (rows, key) => rows.reduce((t, r) => t + number(r[key]), 0);
  const builtBoost = sum(built, "demand_boost_pct");
  const planBoost = sum(plan, "demand_boost_pct");
  const effectiveBefore = Math.min(CAP, builtBoost);
  const effectiveAfter = Math.min(CAP, builtBoost + planBoost);
  const wasted = Math.max(0, builtBoost + planBoost - CAP);
  const capex = sum(plan, "installation_cost");
  const maintenanceAfter = sum(built, "quarterly_maintenance") + sum(plan, "quarterly_maintenance");
  const addedMaintenance = sum(plan, "quarterly_maintenance");

  // Payback, if the extra demand can be supplied: last quarter's demand x added boost x unit margin
  const last = team?.hist?.[team.hist.length - 1];
  const demand = last ? last.units + last.lost : 0;
  const unitMargin = team?.models?.length ? team.models.reduce((x, m) => x + (m.price - unitCost(m)), 0) / team.models.length / 1e5 : 0;
  const addedUnits = demand * ((effectiveAfter - effectiveBefore) / 100) / (1 + effectiveBefore / 100);
  const addedMargin = addedUnits * unitMargin;
  const netPerQuarter = addedMargin - addedMaintenance;
  const payback = capex > 0 && netPerQuarter > 0 ? capex / netPerQuarter : null;

  const perCity = REGIONS.map((region) => {
    const b = built.filter((r) => r.region === region);
    const p = plan.find((r) => r.region === region);
    return { region, built: sum(b, "charger_count"), planned: p?.charger_count || 0 };
  });
  const maxCity = Math.max(1, ...perCity.map((c) => c.built + c.planned));

  const updateInvestment = (region, changes) => {
    setStatus((s) => (s === "saved" ? "ready" : s));
    setInvestments((current) => current.map((row) => (row.region === region ? calculateInvestment({ ...row, ...changes }) : row)));
  };

  const save = async () => {
    setStatus("saving");
    try {
      const response = await fetch("/api/charging-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, quarter, investments: plan })
      });
      if (!response.ok) throw new Error("Charging strategy could not be saved.");
      setStatus("saved");
      onNotify?.(`Charging network investment saved for Quarter ${quarter}.`);
    } catch (error) {
      setStatus("ready");
      onNotify?.(error.message || "Charging strategy could not be saved.");
    }
  };

  const fmt = (v, d = 1) => Number(v).toFixed(d);

  return (
    <section className="space-y-4 font-sans">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "Chargers in service", value: `${sum(built, "charger_count")}${plan.some((p) => p.charger_count) ? ` + ${sum(plan, "charger_count")}` : ""}`, note: "built + planned this quarter" },
          { label: "Demand boost", value: `+${fmt(effectiveAfter)}%`, note: `cap +${CAP}% · was +${fmt(effectiveBefore)}%`, tone: wasted > 0 ? "text-amber-700" : "text-emerald-700" },
          { label: "Installation this quarter", value: `Rs. ${fmt(capex, 2)} L`, note: "capital spending, depreciated" },
          { label: "Maintenance", value: `Rs. ${fmt(maintenanceAfter, 2)} L`, note: "every quarter, whole network" }
        ].map((k) => (
          <div key={k.label} className="px-3 py-2.5 bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
            <div className="text-[11px] text-[#6C6D70]">{k.label}</div>
            <div className={`text-base font-bold font-mono ${k.tone || "text-[#1F2022]"}`}>{k.value}</div>
            <div className="text-[10px] text-[#8A8C90] truncate">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-3 min-w-0">
          <div className="flex items-center gap-2 px-1">
            <BatteryCharging className="w-4 h-4 text-[#5A5C60]" />
            <h2 className="text-sm font-bold text-[#1F2022]">Network across your home metros</h2>
          </div>
          <div className="rounded-lg bg-[#F4F7F8] mt-2 overflow-hidden">
            <ComposableMap projection="geoMercator" width={800} height={460} projectionConfig={{ center: [80, 21], scale: 1050 }} style={{ width: "100%", height: "auto" }} aria-label="Map of charger deployment">
              <Geographies geography={worldTopoJson}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography key={geo.rsmKey} geography={geo} fill="#E4E0D6" stroke="#F4F7F8" strokeWidth={0.6} style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }} />
                  ))
                }
              </Geographies>
              {CITIES.map((m) => {
                const c = perCity.find((x) => x.region === m.city);
                const total = c.built + c.planned;
                const r = 8 + 26 * Math.sqrt(total / maxCity);
                const builtR = total ? r * Math.sqrt(c.built / total) : 0;
                return (
                  <Marker key={m.id} coordinates={[m.lon, m.lat]}>
                    <circle r={r} fill="#C77D0A" fillOpacity={total ? 0.25 : 0.08} stroke="#C77D0A" strokeDasharray={c.planned ? "3 2" : undefined} />
                    {builtR > 0 && <circle r={builtR} fill="#15803D" fillOpacity={0.75} />}
                    <text y={-r - 6} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: "#1F2022" }}>
                      {m.city}
                    </text>
                    <text y={5} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: total ? "white" : "#8A8C90" }}>
                      {total || "0"}
                    </text>
                  </Marker>
                );
              })}
            </ComposableMap>
          </div>
          <div className="flex flex-wrap gap-4 px-1 pt-2 text-[11px] text-[#5A5C60]">
            <span className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-full bg-[#15803D]" /> Built in earlier quarters
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-full border border-dashed border-[#C77D0A] bg-[#C77D0A]/25" /> Planned this quarter
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#1F2022]">Boost against the cap</h3>
            <div className="relative mt-3 h-4 rounded-full bg-[#EDE9E1] overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-[#15803D]" style={{ width: `${(Math.min(builtBoost, CAP * 1.25) / (CAP * 1.25)) * 100}%` }} />
              <div className="absolute inset-y-0 bg-[#C77D0A]/70" style={{ left: `${(Math.min(builtBoost, CAP * 1.25) / (CAP * 1.25)) * 100}%`, width: `${(Math.min(planBoost, CAP * 1.25 - Math.min(builtBoost, CAP * 1.25)) / (CAP * 1.25)) * 100}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-[#1F2022]" style={{ left: `${(CAP / (CAP * 1.25)) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-[#8A8C90] mt-1">
              <span>0</span>
              <span>cap +{CAP}%</span>
            </div>
            {wasted > 0 && <p className="text-[11px] text-amber-700 mt-2">+{fmt(wasted)} points of boost exceed the cap and add nothing; their maintenance still costs money.</p>}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4 text-xs space-y-1.5">
            <h3 className="text-sm font-bold text-[#1F2022] mb-1">Does this quarter's plan pay back?</h3>
            {capex === 0 ? (
              <p className="text-[#6C6D70]">Plan chargers below to see the estimate.</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-[#6C6D70]">Extra demand a quarter</span>
                  <span className="font-mono">~{Math.round(addedUnits).toLocaleString("en-IN")} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C6D70]">Gross margin on it</span>
                  <span className="font-mono">Rs. {fmt(addedMargin)} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C6D70]">Added maintenance</span>
                  <span className="font-mono">− Rs. {fmt(addedMaintenance, 2)} L</span>
                </div>
                <div className="flex justify-between border-t border-[#EFEBE3] pt-1.5 font-semibold">
                  <span>Payback on Rs. {fmt(capex, 2)} L</span>
                  <span className={`font-mono ${payback && payback <= 4 ? "text-emerald-700" : "text-amber-700"}`}>{payback ? `${fmt(payback)} quarters` : "does not pay back"}</span>
                </div>
                <p className="text-[10px] text-[#8A8C90] pt-1">Estimate from last quarter's demand ({demand.toLocaleString("en-IN")} units) and your average unit margin. Extra demand only turns into sales if the plant can build it.</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E1D8] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E1D8] flex justify-between gap-3 items-center">
          <div>
            <h2 className="text-sm font-bold text-[#1F2022]">Q{quarter} deployment plan</h2>
            <p className="text-[11px] text-[#686b70]">Costs in Rs. lakh. Boost = chargers × the type's weight; the whole network's boost is capped at +{CAP}%.</p>
          </div>
        </div>
        <div className="divide-y divide-[#F0ECE5]">
          {plan.map((row) => {
            const c = perCity.find((x) => x.region === row.region);
            return (
              <div key={row.region} className="px-4 py-3 grid gap-3 sm:grid-cols-[1fr_1.4fr_0.8fr_1fr] items-end">
                <div>
                  <div className="font-bold text-sm">{row.region}</div>
                  <div className="text-[11px] text-[#686b70]">
                    {c.built} built · +{fmt(row.demand_boost_pct, 2)}% planned
                  </div>
                </div>
                <label className="text-[11px] text-[#5A5C60]">
                  Charger type
                  <select value={row.charger_type} onChange={(event) => updateInvestment(row.region, { charger_type: event.target.value })} className="mt-1 w-full border border-[#D8D3C9] rounded-md p-2 text-xs bg-[#FAF8F5]">
                    {Object.entries(CHARGER_TYPES).map(([type, config]) => (
                      <option key={type} value={type}>
                        {type} · {config.weight}% each · Rs. {config.installationCost} L
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-[#5A5C60]">
                  New chargers
                  <input type="number" min="0" step="1" value={row.charger_count} onChange={(event) => updateInvestment(row.region, { charger_count: event.target.value })} className="mt-1 w-full border border-[#D8D3C9] rounded-md p-2 text-xs bg-[#FAF8F5] font-mono" />
                </label>
                <div className="text-[11px] text-[#5A5C60]">
                  Install <strong className="font-mono text-[#1F2022]">Rs. {fmt(row.installation_cost, 2)} L</strong>
                  <br />
                  Upkeep <strong className="font-mono text-[#1F2022]">Rs. {fmt(row.quarterly_maintenance, 2)} L</strong> / qtr
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 bg-[#FAF8F5] flex flex-wrap justify-between gap-3 items-center text-xs">
          <span className="text-[#5A5C60]">Installation is capital spending; maintenance is an operating expense charged every quarter the chargers stay in service.</span>
          <button type="button" onClick={save} disabled={status === "saving" || status === "loading"} className="bg-[#1F2022] text-white rounded-md px-4 py-2 font-semibold flex items-center gap-2 disabled:opacity-50">
            {status === "saved" ? <Check size={15} /> : <Save size={15} />}
            {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save deployment"}
          </button>
        </div>
      </div>
    </section>
  );
}
