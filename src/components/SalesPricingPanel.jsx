import React from "react";
import { BadgeIndianRupee, ShoppingCart } from "lucide-react";
import { unitCost } from "../engine/simulationEngine";
import { MARKETS } from "../engine/catalog";

const asNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

// Read-only ABC (advertising + brand + channel cost) breakdown, weighted by
// each owned market's real size share among your stores. Price lives in
// Product Design (model.price) — this view doesn't edit it, since regional
// pricing here never fed the simulation.
export default function SalesPricingPanel({ team }) {
  const models = team?.models || [];
  const ownedCities = team?.storeCities || [];
  const markets = MARKETS.filter((m) => ownedCities.includes(m.id));
  const totalMarketSize = markets.reduce((sum, m) => sum + m.marketSize, 0) || 1;
  const latestResult = team?.hist?.[team.hist.length - 1];
  const latestRows = latestResult?.modelRows || [];
  const totalUnits = latestResult?.units || 0;
  const adCost = asNumber(team?.dec?.ad);
  const salesForceCost = asNumber(team?.staff) * 3.5 * (asNumber(team?.hr?.sales, 100) / 100);

  return (
    <section className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E1D8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BadgeIndianRupee className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold">Per-market contribution breakdown</h3>
          </div>
          <p className="text-xs text-[#5A5C60] mt-1">Last quarter's sales split across your actual store markets, weighted by each market's real size.</p>
        </div>
      </div>

      {markets.length === 0 ? (
        <p className="text-xs text-[#5A5C60]">You have no open stores yet — pick markets in the panel above to see a contribution breakdown here.</p>
      ) : models.length === 0 ? (
        <p className="text-xs text-[#5A5C60]">Create a brand in Product Design to see contribution by market.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead><tr className="text-left text-[10px] uppercase text-[#5A5C60] border-b border-[#E5E1D8]">
              <th className="p-2">Market</th><th className="p-2">Share of your stores</th><th className="p-2">Brand</th><th className="p-2">Price (Rs.)</th><th className="p-2">Est. units</th><th className="p-2">Est. contribution</th>
            </tr></thead>
            <tbody>
              {markets.map((market) => {
                const weight = market.marketSize / totalMarketSize;
                const adShare = adCost * weight;
                const salesShare = salesForceCost * weight;
                return models.map((model, idx) => {
                  const cogs = unitCost(model);
                  const row = latestRows.find((item) => item.name === model.name);
                  const units = asNumber(row?.units) * weight;
                  const allocatedAd = totalUnits ? adShare * (units / (totalUnits * weight || 1)) : 0;
                  const allocatedSales = totalUnits ? salesShare * (units / (totalUnits * weight || 1)) : 0;
                  const contribution = ((model.price - cogs) * units) / 100000 - allocatedAd - allocatedSales;
                  return (
                    <tr key={`${market.id}-${model.id}`} className={`border-b border-[#F0EDE7] ${contribution < 0 ? "bg-red-50" : ""}`}>
                      {idx === 0 && <td className="p-2 font-semibold align-top" rowSpan={models.length}>{market.city}<div className="text-[10px] font-normal text-[#5A5C60]">{market.region}</div></td>}
                      {idx === 0 && <td className="p-2 font-mono align-top" rowSpan={models.length}>{(weight * 100).toFixed(0)}%</td>}
                      <td className="p-2">{model.name}<div className="text-[10px] text-[#5A5C60]">COGS Rs. {cogs.toLocaleString("en-IN")}</div></td>
                      <td className="p-2 font-mono">{model.price.toLocaleString("en-IN")}</td>
                      <td className="p-2 font-mono">{Math.round(units).toLocaleString("en-IN")}</td>
                      <td className={`p-2 font-mono font-bold ${contribution < 0 ? "text-red-700" : "text-emerald-700"}`}>{contribution < 0 ? "Loss " : "Rs. "}{Math.abs(contribution).toFixed(1)} L</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-2 text-[11px]"><ShoppingCart className="w-4 h-4 text-emerald-700 shrink-0" /><span>Contribution = (price - COGS) × est. units - allocated ad spend - allocated sales payroll, split by each market's real size share. Set price in Product Design; it applies everywhere.</span></div>
    </section>
  );
}
