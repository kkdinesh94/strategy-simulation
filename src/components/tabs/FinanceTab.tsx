import React, { useState } from "react";
import { TeamState, GameState } from "../../types/simulation";
import { fmtL, fmtRs } from "../../engine/catalog";
import { bankLimit, ltLimit, valuationOf, proFormaCalc, equityOf } from "../../engine/simulationEngine";
import { ProFormaWorkbench } from "../ProFormaWorkbench";
import { DecisionAuditor } from "../DecisionAuditor";
import { DollarSign, Landmark, PieChart, AlertTriangle, FileText, Sparkles, ShieldCheck } from "lucide-react";

interface FinanceTabProps {
  team: TeamState;
  gameState: GameState;
  onChange: (updatedTeam: TeamState) => void;
  onNotify: (msg: string) => void;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({
  team,
  gameState,
  onChange,
  onNotify
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"proforma" | "workbench" | "auditor" | "abc" | "debt" | "vc">("proforma");
  const isLocked = team.dec.locked;

  const pf = proFormaCalc(gameState, team);
  const maxBank = bankLimit(team);
  const maxLT = ltLimit(team);
  const currentValuation = valuationOf(team);
  const lastHist = team.hist[team.hist.length - 1];
  const netEquity = equityOf(team);

  const handleBankTargetChange = (val: number) => {
    if (isLocked) return;
    const capped = Math.max(0, Math.min(maxBank, Math.round(val)));
    onChange({
      ...team,
      dec: {
        ...team.dec,
        bankTarget: capped
      }
    });
  };

  const handleLtIssueChange = (val: number) => {
    if (isLocked) return;
    const capped = Math.max(0, Math.min(maxLT, Math.round(val)));
    onChange({
      ...team,
      dec: {
        ...team.dec,
        ltIssue: capped
      }
    });
  };

  const handleVChange = (field: "ask" | "equity", val: number) => {
    if (isLocked) return;
    const currentVc = team.dec.vc || { ask: 0, equity: 0 };
    const updatedVc = {
      ...currentVc,
      [field]: field === "ask" ? Math.max(0, Math.min(2000, Math.round(val))) : Math.max(0, Math.min(60, val))
    };
    onChange({
      ...team,
      dec: {
        ...team.dec,
        vc: updatedVc
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tab Selector */}
      <div className="bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-sm flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveSubTab("proforma")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "proforma"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#1F2022] border border-[#E0DCD3] hover:bg-slate-100"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Pro Forma Budget
        </button>

        <button
          onClick={() => setActiveSubTab("workbench")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "workbench"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Scenario What-If Workbench
        </button>

        <button
          onClick={() => setActiveSubTab("auditor")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "auditor"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Decision Auditor Checklist
        </button>

        <button
          onClick={() => setActiveSubTab("abc")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "abc"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#1F2022] border border-[#E0DCD3] hover:bg-slate-100"
          }`}
        >
          <PieChart className="w-3.5 h-3.5" /> Activity Based Costing (ABC)
        </button>

        <button
          onClick={() => setActiveSubTab("debt")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "debt"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#1F2022] border border-[#E0DCD3] hover:bg-slate-100"
          }`}
        >
          <Landmark className="w-3.5 h-3.5" /> Debt & Credit Lines
        </button>

        {gameState.quarter === gameState.cfg.vcQuarter && (
          <button
            onClick={() => setActiveSubTab("vc")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1.5 ${
              activeSubTab === "vc"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> VC Negotiation Room
          </button>
        )}
      </div>

      {/* SUB-TAB 1: PRO FORMA STATEMENTS */}
      {activeSubTab === "proforma" && (
        <div className="space-y-6">
          {/* Executive Financial Ratios Overview Card */}
          <div className="bg-[#FAF8F5] text-[#1F2022] p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold tracking-tight text-[#1F2022]">
                  Executive Financial Health & Solvency Ratios
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold uppercase">
                Audited Financial Statement
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3.5 bg-white rounded-xl border border-[#E0DCD3] shadow-sm">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">EBITDA (Operating Earnings)</div>
                <div className="text-lg font-bold text-emerald-700 mt-1">
                  Rs. {lastHist ? lastHist.ebitda.toFixed(1) : "0.0"} L
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">Earnings Before Interest & Tax</div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E0DCD3] shadow-sm">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Debt-to-Equity Ratio (D/E)</div>
                <div className="text-lg font-bold text-indigo-700 mt-1">
                  {netEquity > 0 ? ((team.debt.bank + team.debt.lt + team.debt.shark) / netEquity).toFixed(2) : "0.00"} x
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">Total Debt: {fmtL(team.debt.bank + team.debt.lt + team.debt.shark)} L</div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E0DCD3] shadow-sm">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Gross Profit Margin %</div>
                <div className="text-lg font-bold text-amber-700 mt-1">
                  {lastHist && lastHist.rev > 0 ? ((lastHist.gp / lastHist.rev) * 100).toFixed(1) : "0.0"}%
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">Gross Profit / Revenue</div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E0DCD3] shadow-sm">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Operating Margin (EBITDA %)</div>
                <div className="text-lg font-bold text-blue-700 mt-1">
                  {lastHist && lastHist.rev > 0 ? ((lastHist.ebitda / lastHist.rev) * 100).toFixed(1) : "0.0"}%
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">EBITDA / Revenue</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
            <h3 className="text-lg font-bold text-[#1F2022] mb-2">
              Quarter {gameState.quarter} Pro Forma Cash Budget
            </h3>
            <p className="text-xs text-[#5A5C60] mb-4">
              Projects ending cash based on committed decision expenditures and current liquid reserves.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
                <span className="text-[#5A5C60]">Starting Liquid Cash:</span>
                <span className="font-bold text-[#1F2022]">{fmtL(pf.cash)} L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-emerald-700">
                <span>+ Borrowing Inflow (Bond Issue):</span>
                <span>+{fmtL(pf.inflow)} L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-red-600">
                <span>- Scheduled Production Materials:</span>
                <span>-{fmtL(pf.materials)} L ({pf.prod} units)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-red-600">
                <span>- Advertising Campaign Spend:</span>
                <span>-{fmtL(pf.ad)} L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-red-600">
                <span>- Expansion & R&D Growth Outlays:</span>
                <span>-{fmtL(pf.growth)} L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-red-600">
                <span>- Sales & Factory Payroll:</span>
                <span>-{fmtL(pf.people)} L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-red-600">
                <span>- Showroom Opex, Overhead & Debt Interest:</span>
                <span>-{fmtL(pf.running)} L</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-[#1F2022] text-sm font-bold">
                <span>Projected Ending Cash:</span>
                <span className={pf.close < 0 ? "text-red-600" : "text-emerald-700"}>
                  {fmtL(pf.close)} L
                </span>
              </div>
            </div>

            {pf.close < 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Warning: Cash closes negative! If locked in short of cash, an emergency loan shark will automatically fund the deficit at penal interest rates (up to 25%/qtr) and take equity dilution.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 1.5: WORKBENCH */}
      {activeSubTab === "workbench" && (
        <ProFormaWorkbench team={team} gameState={gameState} />
      )}

      {/* SUB-TAB 1.6: AUDITOR */}
      {activeSubTab === "auditor" && (
        <DecisionAuditor team={team} gameState={gameState} />
      )}

      {/* SUB-TAB 2: ACTIVITY BASED COSTING (ABC) */}
      {activeSubTab === "abc" && (
        <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#1F2022]">
            Activity Based Costing (ABC) Profitability Analysis
          </h3>
          <p className="text-xs text-[#5A5C60]">
            ABC assigns demand-creating expenses (advertising, warranty, development, storage) directly to the generating brand model rather than pooling them into generic corporate overhead.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E0DCD3] text-[#5A5C60] uppercase">
                  <th className="text-left py-2">Model</th>
                  <th className="text-right py-2">Unit Cost</th>
                  <th className="text-right py-2">List Price</th>
                  <th className="text-right py-2">Gross Margin</th>
                  <th className="text-right py-2">Allocated Overhead</th>
                  <th className="text-right py-2">Net Unit Profit</th>
                </tr>
              </thead>
              <tbody>
                {team.models.map((m) => {
                  return (
                    <tr key={m.id} className="border-b border-[#E0DCD3]">
                      <td className="py-2 text-left font-sans font-bold text-[#1F2022]">
                        {m.name}
                      </td>
                      <td className="text-right py-2">{fmtRs(m.price * 0.65)}</td>
                      <td className="text-right py-2">{fmtRs(m.price)}</td>
                      <td className="text-right py-2 text-emerald-700">{fmtRs(m.price * 0.35)}</td>
                      <td className="text-right py-2 text-[#5A5C60]">{fmtRs(m.price * 0.15)}</td>
                      <td className="text-right py-2 font-bold text-emerald-700">{fmtRs(m.price * 0.20)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DEBT & CREDIT LINES */}
      {activeSubTab === "debt" && (
        <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-[#1F2022]">
              Debt Financing Options
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bank Line of Credit */}
            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3] space-y-3">
              <div className="font-bold text-sm text-[#1F2022]">
                Short-Term Bank Line of Credit
              </div>
              <div className="text-xs text-[#5A5C60]">
                Flexible credit line tied to 1.5x Net Equity. Variable interest rate based on capacity utilization.
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
                  <span className="text-[#5A5C60]">Available Debt Capacity:</span>
                  <span className="font-bold text-[#1F2022]">{fmtL(maxBank)} L</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#E0DCD3]">
                  <span className="text-[#5A5C60]">Target Credit Line Balance:</span>
                  <input
                    type="number"
                    min={0}
                    max={maxBank}
                    step={25}
                    value={team.dec.bankTarget || team.debt.bank}
                    disabled={isLocked}
                    onChange={(e) => handleBankTargetChange(+e.target.value)}
                    className="w-24 p-1 text-right border border-[#E0DCD3] rounded font-bold bg-white text-[#1F2022]"
                  />
                </div>
              </div>
            </div>

            {/* Long-Term Bonds */}
            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3] space-y-3">
              <div className="font-bold text-sm text-[#1F2022]">
                5-Year Long-Term Corporate Bonds
              </div>
              <div className="text-xs text-[#5A5C60]">
                Fixed 4.5%/qtr interest rate for 20 quarters. Protects against bank credit recalls during temporary loss periods.
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
                  <span className="text-[#5A5C60]">Available Bond Capacity:</span>
                  <span className="font-bold text-[#1F2022]">{fmtL(maxLT)} L</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#E0DCD3]">
                  <span className="text-[#5A5C60]">New Bond Issuance This Qtr:</span>
                  <input
                    type="number"
                    min={0}
                    max={maxLT}
                    step={50}
                    disabled={isLocked || team.debt.lt > 0}
                    value={team.dec.ltIssue || 0}
                    onChange={(e) => handleLtIssueChange(+e.target.value)}
                    className="w-24 p-1 text-right border border-[#E0DCD3] rounded font-bold bg-white text-[#1F2022]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: VC ROOM (Q5) */}
      {activeSubTab === "vc" && gameState.quarter === gameState.cfg.vcQuarter && (
        <div className="bg-purple-900 text-white p-6 rounded-xl shadow-lg space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-300" />
            <h3 className="text-xl font-bold">
              Quarter {gameState.cfg.vcQuarter} Venture Capital Negotiation Room
            </h3>
          </div>

          <div className="p-4 bg-purple-950/60 rounded-xl border border-purple-700 space-y-3">
            <div className="text-xs font-mono text-purple-300">
              Indicative Board Valuation of {team.name}:
            </div>
            <div className="text-3xl font-bold font-mono text-purple-200">
              Rs. {currentValuation.toLocaleString("en-IN")} L
            </div>
            <p className="text-xs text-purple-300">
              Valuation is derived from historical annual revenue, team reputation, and cumulative Balanced Scorecard score.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase text-purple-300 mb-1">
                Equity Investment Request / Ask (Rs. L)
              </label>
              <input
                type="number"
                min={0}
                max={2000}
                step={50}
                value={team.dec.vc ? team.dec.vc.ask : 0}
                disabled={isLocked}
                onChange={(e) => handleVChange("ask", +e.target.value)}
                className="w-full p-3 bg-purple-950 border border-purple-700 rounded-lg text-lg font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-purple-300 mb-1">
                Equity Stake Offered to VC Partners (%)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                step={0.5}
                value={team.dec.vc ? team.dec.vc.equity : 0}
                disabled={isLocked}
                onChange={(e) => handleVChange("equity", +e.target.value)}
                className="w-full p-3 bg-purple-950 border border-purple-700 rounded-lg text-lg font-mono font-bold text-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
