import React from "react";
import { AlertTriangle, BadgeIndianRupee, Megaphone, ShoppingCart } from "lucide-react";
import { unitCost } from "../engine/simulationEngine";

export const SALES_REGIONS = [
  { id: "metro-north", name: "Metro North", detail: "Delhi NCR", weight: 0.24 },
  { id: "metro-south", name: "Metro South", detail: "Bengaluru / Chennai / Hyderabad", weight: 0.24 },
  { id: "metro-west", name: "Metro West", detail: "Mumbai / Pune / Ahmedabad", weight: 0.22 },
  { id: "east-tier2", name: "East & Tier-2 Hubs", detail: "Kolkata / Jaipur / Kochi", weight: 0.20 },
  { id: "global-export", name: "Global Export Gateway", detail: "Singapore / Dubai / EU", weight: 0.10 }
];

const POP_COST = 2;

const asNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function defaultBrandSettings(models) {
  return models.reduce((settings, model, index) => {
    settings[model.id] = { price: model.price, rebate: 0, priority: index + 1, pop: false };
    return settings;
  }, {});
}

export default function SalesPricingPanel({ team, region, onChange }) {
  const models = team?.models || [];
  const saved = team?.draft?.salesPricing?.[region.id] || {};
  const defaults = defaultBrandSettings(models);
  const settings = models.reduce((result, model) => {
    result[model.id] = { ...defaults[model.id], ...(saved[model.id] || {}) };
    return result;
  }, {});
  const isLocked = Boolean(team?.dec?.locked);
  const latestResult = team?.hist?.[team.hist.length - 1];
  const latestRows = latestResult?.modelRows || [];
  const totalUnits = latestResult?.units || 0;
  const adCost = asNumber(team?.dec?.ad) * region.weight;
  const salesForceCost = asNumber(team?.staff) * 3.5 * (asNumber(team?.hr?.sales, 100) / 100) * region.weight;

  const updateBrand = (model, field, value) => {
    if (isLocked) return;
    const next = {
      ...settings,
      [model.id]: {
        ...settings[model.id],
        [field]: field === "pop"
          ? value
          : field === "priority"
            ? Math.max(1, Math.min(models.length, Math.round(asNumber(value, 1))))
            : Math.max(0, asNumber(value))
      }
    };
    onChange({
      ...team,
      draft: {
        ...team.draft,
        salesPricing: { ...(team.draft?.salesPricing || {}), [region.id]: next }
      }
    });
  };

  return (
    <section className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E1D8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BadgeIndianRupee className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold">{region.name} pricing desk</h3>
          </div>
          <p className="text-xs text-[#5A5C60] mt-1">{region.detail} · {Math.round(region.weight * 100)}% of regional demand allocation</p>
        </div>
        <div className="text-right text-[11px] font-mono text-[#5A5C60]">
          ABC pool: <strong className="text-[#1F2022]">Rs. {(adCost + salesForceCost).toFixed(1)} L</strong>
        </div>
      </div>

      {models.length === 0 ? (
        <p className="text-xs text-[#5A5C60]">Create a brand in Product Design before setting regional pricing.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[860px]">
            <thead><tr className="text-left text-[10px] uppercase text-[#5A5C60] border-b border-[#E5E1D8]">
              <th className="p-2">Brand</th><th className="p-2">Price (Rs.)</th><th className="p-2">Rebate</th><th className="p-2">Priority</th><th className="p-2">POP</th><th className="p-2">ABC contribution</th>
            </tr></thead>
            <tbody>
              {models.map((model) => {
                const setting = settings[model.id];
                const cogs = unitCost(model);
                const row = latestRows.find((item) => item.name === model.name);
                const units = asNumber(row?.units) * region.weight * (setting.pop ? 1.15 : 1);
                const allocatedAd = totalUnits ? adCost * (units / (totalUnits * region.weight)) : 0;
                const allocatedSales = totalUnits ? salesForceCost * (units / (totalUnits * region.weight)) : 0;
                const realizedPrice = setting.price - setting.rebate;
                const contribution = ((realizedPrice - cogs) * units) / 100000 - allocatedAd - allocatedSales - (setting.pop ? POP_COST : 0);
                const lossPerUnit = realizedPrice < cogs;
                return (
                  <tr key={model.id} className={`border-b border-[#F0EDE7] ${contribution < 0 ? "bg-red-50" : ""}`}>
                    <td className="p-2 font-semibold">{model.name}<div className="text-[10px] font-normal text-[#5A5C60]">COGS Rs. {cogs.toLocaleString("en-IN")}</div></td>
                    <td className="p-2"><input aria-label={`${region.name} ${model.name} price`} type="number" min="0" step="500" disabled={isLocked} value={setting.price} onChange={(event) => updateBrand(model, "price", event.target.value)} className="w-28 p-1.5 border border-[#E0DCD3] rounded bg-[#FAF8F5]" />{lossPerUnit && <div className="text-[10px] text-red-700 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" />Net price below cost</div>}</td>
                    <td className="p-2"><input aria-label={`${region.name} ${model.name} rebate`} type="number" min="0" step="500" disabled={isLocked} value={setting.rebate} onChange={(event) => updateBrand(model, "rebate", event.target.value)} className="w-24 p-1.5 border border-[#E0DCD3] rounded bg-[#FAF8F5]" /><div className="text-[10px] text-[#5A5C60]">Special price deal</div></td>
                    <td className="p-2"><input aria-label={`${region.name} ${model.name} priority`} type="number" min="1" max={models.length} step="1" disabled={isLocked} value={setting.priority} onChange={(event) => updateBrand(model, "priority", event.target.value)} className="w-16 p-1.5 border border-[#E0DCD3] rounded bg-[#FAF8F5]" /></td>
                    <td className="p-2"><label className="inline-flex items-center gap-2"><input aria-label={`${region.name} ${model.name} POP display`} type="checkbox" disabled={isLocked} checked={Boolean(setting.pop)} onChange={(event) => updateBrand(model, "pop", event.target.checked)} /> <span className="text-[10px]">+15% demand · Rs. {POP_COST} L/qtr</span></label></td>
                    <td className={`p-2 font-mono font-bold ${contribution < 0 ? "text-red-700" : "text-emerald-700"}`}><div>{contribution < 0 ? "Loss " : "Rs. "}{Math.abs(contribution).toFixed(1)} L</div><div className="text-[10px] font-normal text-[#5A5C60]">Net Rs. {realizedPrice.toLocaleString("en-IN")} · {Math.round(units).toLocaleString("en-IN")} units</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-2"><ShoppingCart className="w-4 h-4 text-emerald-700 shrink-0" /><span>ABC = (price - COGS) × units sold - allocated advertising - allocated sales force cost.</span></div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2"><Megaphone className="w-4 h-4 text-amber-700 shrink-0" /><span>Rebates are shown to customers as “Special price deal”.</span></div>
        <div className="p-3 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl"><strong>ABC view:</strong> uses the latest quarter’s sold units and allocates regional costs by demand weight.</div>
      </div>
    </section>
  );
}