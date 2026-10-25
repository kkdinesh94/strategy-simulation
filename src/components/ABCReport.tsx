import React, { useMemo, useState } from "react";
import type { TeamState } from "../types/simulation";
import { buildAbcReport } from "../lib/abcReport";

const lakh = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 1 })}`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function advice(margin: number): string | null {
  if (margin >= 0) return null;
  return "Loses money after its share of activity costs. Raise the price, cut its share of advertising, or retire it.";
}

/** Activity-based costing for a completed quarter, computed from the team's own results. */
export default function ABCReport({ team }: { team: TeamState }) {
  const quarters = team.hist.map((r) => r.q);
  const [selected, setSelected] = useState<number | null>(null);
  const q = selected ?? quarters[quarters.length - 1];
  const row = team.hist.find((r) => r.q === q);
  const report = useMemo(() => (row ? buildAbcReport(row) : null), [row]);

  if (!report) {
    return (
      <section className="bg-white border border-[#E5E1D8] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#1F2022]">Activity-based costing</h3>
        <p className="mt-2 text-sm text-[#5A5C60]">This report uses a quarter's actual results. It appears once your instructor has run Quarter 1.</p>
      </section>
    );
  }

  const th = "py-2 px-2 text-right font-medium";
  const td = "py-2 px-2 text-right tabular-nums";

  return (
    <section className="bg-white border border-[#E5E1D8] rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold text-[#1F2022]">Activity-based costing</h3>
          <p className="mt-1 text-sm text-[#5A5C60] leading-relaxed">
            Which models and segments actually make money once selling, service and plant costs are charged to the products that cause them. All figures in Rs. L.
          </p>
        </div>
        <label className="text-sm text-[#3A3C40] flex items-center gap-2">
          Quarter
          <select value={q} onChange={(e) => setSelected(Number(e.target.value))} className="border border-[#E0DCD3] rounded-lg px-2 py-1.5 bg-white">
            {quarters.map((n) => <option key={n} value={n}>Q{n}</option>)}
          </select>
        </label>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[#1F2022] mb-2">Cost pools and drivers</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {report.pools.map((p) => (
            <div key={p.key} className="border border-[#E5E1D8] rounded-lg p-3">
              <div className="text-xs text-[#6C6D70]">{p.label}</div>
              <div className="text-lg font-semibold tabular-nums text-[#1F2022]">{lakh(p.amount)}</div>
              <div className="text-xs text-[#8A8C90]">Assigned by {p.driver}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[#1F2022] mb-2">Profitability by model</h4>
        {report.models.every((m) => m.units === 0) ? (
          <p className="text-sm text-[#5A5C60]">No units were sold in Q{q}. In Quarter 1 customers are not buying yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-xs text-[#6C6D70] border-b border-[#E5E1D8]">
                <tr>
                  <th className="py-2 px-2 text-left font-medium">Model</th>
                  <th className={th}>Units</th><th className={th}>Revenue</th><th className={th}>Materials</th>
                  {report.pools.map((p) => <th key={p.key} className={th}>{p.label}</th>)}
                  <th className={th}>Contribution</th><th className={th}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {report.models.map((m) => (
                  <tr key={m.name} className="border-b border-[#F0EDE6] align-top">
                    <td className="py-2 px-2">
                      <div className="font-medium text-[#1F2022]">{m.name}</div>
                      {advice(m.margin) && <div className="text-xs text-red-700 max-w-[220px]">{advice(m.margin)}</div>}
                    </td>
                    <td className={td}>{m.units.toLocaleString("en-IN")}</td>
                    <td className={td}>{lakh(m.revenue)}</td>
                    <td className={td}>{lakh(m.materials)}</td>
                    {report.pools.map((p) => <td key={p.key} className={td}>{lakh(m.pools[p.key])}</td>)}
                    <td className={`${td} font-semibold ${m.contribution < 0 ? "text-red-700" : "text-emerald-700"}`}>{lakh(m.contribution)}</td>
                    <td className={`${td} ${m.margin < 0 ? "text-red-700" : ""}`}>{pct(m.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {report.segments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[#1F2022] mb-2">Profitability by segment</h4>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs text-[#6C6D70] border-b border-[#E5E1D8]">
                <tr><th className="py-2 px-2 text-left font-medium">Segment</th><th className={th}>Units</th><th className={th}>Revenue</th><th className={th}>Contribution</th><th className={th}>Margin</th></tr>
              </thead>
              <tbody>
                {report.segments.map((s) => (
                  <tr key={s.id} className="border-b border-[#F0EDE6]">
                    <td className="py-2 px-2 text-[#1F2022]">{s.name}</td>
                    <td className={td}>{s.units.toLocaleString("en-IN")}</td>
                    <td className={td}>{lakh(s.revenue)}</td>
                    <td className={`${td} ${s.contribution < 0 ? "text-red-700" : ""}`}>{lakh(s.contribution)}</td>
                    <td className={`${td} ${s.margin < 0 ? "text-red-700" : ""}`}>{pct(s.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-lg p-4 text-sm max-w-md">
        <div className="flex justify-between"><span>Total product contribution</span><span className="tabular-nums">{lakh(report.totalContribution)}</span></div>
        <div className="flex justify-between text-[#5A5C60]"><span>Company-level costs<span className="block text-xs">G&amp;A, R&amp;D, launches, research, licences, interest, depreciation, store openings</span></span><span className="tabular-nums">{lakh(-report.companyLevel)}</span></div>
        <div className="flex justify-between font-semibold border-t border-[#E5E1D8] mt-2 pt-2"><span>Net profit, Q{q}</span><span className={`tabular-nums ${report.profit < 0 ? "text-red-700" : ""}`}>{lakh(report.profit)}</span></div>
      </div>
    </section>
  );
}
