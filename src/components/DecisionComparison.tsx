import React from "react";
import { TeamState, GameState, QuarterResult } from "../types/simulation";
import { CAP_BLOCK } from "../engine/catalog";

interface DecisionComparisonProps {
  team: TeamState;
  gameState: GameState;
}

interface ComparisonRow {
  label: string;
  prior: number | null;
  current: number;
}

function fmtVal(v: number | null): string {
  if (v === null || v === undefined) return "N/A";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export const DecisionComparison: React.FC<DecisionComparisonProps> = ({ team, gameState }) => {
  const prevQ = gameState.quarter - 1;
  const priorHist: QuarterResult | undefined = team.hist.find((h) => h.q === prevQ);

  if (gameState.quarter === 1 || !priorHist) {
    return (
      <div className="text-xs text-[#5A5C60] italic px-1">
        Prior quarter reference available from Q2.
      </div>
    );
  }

  const dec = team.dec;
  const totalProd = team.models.reduce((sum, m) => sum + (dec.prod[m.id] || 0), 0);
  const expBlocksPrior = priorHist.capAdd ? Math.round(priorHist.capAdd / CAP_BLOCK.units) : 0;

  const rows: ComparisonRow[] = [
    { label: "Ad Budget (Rs. L)", prior: priorHist.ad, current: dec.ad },
    { label: "Total Production (units)", prior: priorHist.produced, current: totalProd },
    { label: "Capacity Expansion Blocks", prior: expBlocksPrior, current: dec.expBlocks || 0 },
    { label: "New Experience Centres", prior: null, current: dec.newCentres || 0 },
    { label: "Net Staff Change", prior: null, current: dec.hire || 0 },
    { label: "HR Sales Score", prior: priorHist.hrM ? priorHist.hrM.sales : null, current: team.hr.sales },
    { label: "Bank Loan Target (Rs. L)", prior: priorHist.debt ? priorHist.debt.bank : null, current: dec.bankTarget || 0 },
    { label: "Quality Investment (Rs. L)", prior: priorHist.quality, current: dec.quality || 0 }
  ];

  team.models.forEach((m) => {
    const priorRow = priorHist.modelRows?.find((r) => r.name === m.name);
    rows.push({
      label: `${m.name} — Price (Rs.)`,
      prior: priorRow ? priorRow.price : null,
      current: m.price
    });
    rows.push({
      label: `${m.name} — Production (units)`,
      prior: priorRow ? priorRow.units : null,
      current: dec.prod[m.id] || 0
    });
  });

  return (
    <details className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-[#1F2022]">
        📋 Compare with last quarter (Q{prevQ})
      </summary>
      <div className="px-4 pb-4 overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#E0DCD3] text-[#5A5C60] uppercase text-[10px]">
              <th className="text-left py-2">Decision</th>
              <th className="text-right py-2">Q{prevQ}</th>
              <th className="text-right py-2">Q{gameState.quarter}</th>
              <th className="text-right py-2">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const hasPrior = row.prior !== null && row.prior !== undefined;
              const change = hasPrior ? row.current - (row.prior as number) : null;
              const pctChange = hasPrior && row.prior !== 0 ? (change as number) / (row.prior as number) : null;
              const highlight = pctChange !== null && Math.abs(pctChange) > 0.2;

              return (
                <tr
                  key={idx}
                  className={`border-b border-[#E0DCD3] ${highlight ? "bg-amber-50" : ""}`}
                >
                  <td className="py-1.5 text-left text-[#1F2022]">{row.label}</td>
                  <td className="py-1.5 text-right text-[#5A5C60]">{fmtVal(row.prior)}</td>
                  <td className="py-1.5 text-right font-bold text-[#1F2022]">{fmtVal(row.current)}</td>
                  <td className="py-1.5 text-right font-bold">
                    {change === null || change === 0 ? (
                      <span className="text-[#5A5C60]">—</span>
                    ) : change > 0 ? (
                      <span className="text-emerald-700">▲ {fmtVal(Math.abs(change))}</span>
                    ) : (
                      <span className="text-red-600">▼ {fmtVal(Math.abs(change))}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
};

export default DecisionComparison;
