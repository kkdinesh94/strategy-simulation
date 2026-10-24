import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { teamData } from "../lib/apiClient";

// The contribution query itself lives on the server (server/api/teamData.ts, key "abc-report").

const money = (value) => `Rs. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} L`;
const percent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

function correctiveAction(margin, scope) {
  if (margin >= 0) return null;
  return scope === "region"
    ? "Close office or reduce regional staff costs"
    : "Raise price, reduce ad spend, or discontinue brand";
}

export default function ABCReport({ universeId, teamId, quarter }) {
  const [state, setState] = useState({ status: "loading", rows: [], error: "" });

  const loadReport = async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    const result = await teamData("abc-report", { universeId, teamId, quarter });
    if (!result.success) {
      setState({ status: "error", rows: [], error: result.error || "Unable to load contribution analysis." });
      return;
    }
    setState({ status: "ready", rows: result.results || [], error: "" });
  };

  useEffect(() => {
    loadReport();
  }, [universeId, teamId, quarter]);

  const rows = state.rows.map((row) => {
    const revenue = Number(row.units_sold || 0) * Number(row.price || 0);
    const cogs = Number(row.units_sold || 0) * Number(row.unit_production_cost || 0);
    const adShare = Number(row.total_brand_ad_spend || 0) > 0
      ? Number(row.brand_ad_spend || 0) / Number(row.total_brand_ad_spend)
      : 0;
    const margin = revenue - cogs - adShare * Number(row.total_ad_budget || 0) -
      Number(row.brand_priority_weight || 0) * Number(row.regional_sales_force_cost || 0);
    return {
      ...row,
      revenue,
      cogs,
      allocatedAdvertising: adShare * Number(row.total_ad_budget || 0),
      allocatedSalesForce: Number(row.brand_priority_weight || 0) * Number(row.regional_sales_force_cost || 0),
      margin,
      marginPercent: revenue ? margin / revenue : 0
    };
  });

  const regions = Object.values(rows.reduce((result, row) => {
    const region = result[row.region] || {
      region: row.region, revenue: 0, cogs: 0, officeLease: Number(row.office_lease || 0),
      staffCost: Number(row.staff_cost || 0)
    };
    region.revenue += row.revenue;
    region.cogs += row.cogs;
    result[row.region] = region;
    return result;
  }, {})).map((region) => ({
    ...region,
    operatingCosts: region.officeLease + region.staffCost,
    profitLoss: region.revenue - region.cogs - region.operatingCosts
  }));

  return (
    <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#1F2022]">Contribution Analysis</h3>
          <p className="text-xs text-[#5A5C60] mt-1">Brand profitability by region, including activity-based advertising and sales force costs.</p>
        </div>
        <button type="button" onClick={loadReport} disabled={state.status === "loading"} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#E0DCD3] rounded-lg hover:bg-[#FAF8F5] disabled:opacity-50" title="Refresh report">
          <RefreshCw className={`w-3.5 h-3.5 ${state.status === "loading" ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {state.status === "loading" && <p className="text-sm text-[#5A5C60]">Loading contribution data from D1...</p>}
      {state.status === "error" && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.status === "ready" && rows.length === 0 && <p className="text-sm text-[#5A5C60]">No sales results are available for this team and quarter.</p>}

      {state.status === "ready" && rows.length > 0 && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-3"><TrendingDown className="w-4 h-4 text-[#5A5C60]" /><h4 className="font-bold text-sm">Brand x Region</h4></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono min-w-[980px]">
                <thead><tr className="border-b border-[#E0DCD3] text-[#5A5C60] uppercase">
                  <th className="text-left py-2">Brand / Region</th><th className="text-right py-2">Revenue</th><th className="text-right py-2">COGS</th><th className="text-right py-2">Ad Alloc.</th><th className="text-right py-2">Sales Force</th><th className="text-right py-2">Contribution</th><th className="text-right py-2">Margin %</th><th className="text-left py-2 pl-4">Action</th>
                </tr></thead>
                <tbody>{rows.map((row) => <tr key={`${row.brand_id}-${row.region}`} className={`border-b border-[#E0DCD3] ${row.margin < 0 ? "bg-red-50 text-red-900" : ""}`}>
                  <td className="py-2 font-sans font-bold">{row.brand_name}<span className="block text-[10px] font-normal text-[#5A5C60]">{row.region}</span></td><td className="text-right py-2">{money(row.revenue)}</td><td className="text-right py-2">{money(row.cogs)}</td><td className="text-right py-2">{money(row.allocatedAdvertising)}</td><td className="text-right py-2">{money(row.allocatedSalesForce)}</td><td className="text-right py-2 font-bold">{money(row.margin)}</td><td className="text-right py-2 font-bold">{percent(row.marginPercent)}</td><td className="py-2 pl-4 font-sans text-[11px]">{correctiveAction(row.margin, "brand") || "Healthy contribution"}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-[#5A5C60]" /><h4 className="font-bold text-sm">Regional Operating Profit / Loss</h4></div>
            <div className="overflow-x-auto"><table className="w-full text-xs font-mono min-w-[760px]"><thead><tr className="border-b border-[#E0DCD3] text-[#5A5C60] uppercase"><th className="text-left py-2">Region</th><th className="text-right py-2">Revenue</th><th className="text-right py-2">COGS</th><th className="text-right py-2">Office Lease</th><th className="text-right py-2">Staff</th><th className="text-right py-2">Profit / Loss</th><th className="text-left py-2 pl-4">Action</th></tr></thead><tbody>{regions.map((region) => <tr key={region.region} className={`border-b border-[#E0DCD3] ${region.profitLoss < 0 ? "bg-red-50 text-red-900" : ""}`}><td className="py-2 font-sans font-bold">{region.region}</td><td className="text-right py-2">{money(region.revenue)}</td><td className="text-right py-2">{money(region.cogs)}</td><td className="text-right py-2">{money(region.officeLease)}</td><td className="text-right py-2">{money(region.staffCost)}</td><td className="text-right py-2 font-bold">{money(region.profitLoss)}</td><td className="py-2 pl-4 font-sans text-[11px]">{correctiveAction(region.profitLoss, "region") || "Healthy region"}</td></tr>)}</tbody></table></div>
          </div>
        </>
      )}
    </div>
  );
}
