import React, { useState } from "react";
import { TeamState, GameState } from "../../types/simulation";
import { fmtL, fmtRs } from "../../engine/catalog";
import {
  bankLimit,
  ltLimit,
  valuationOf,
  proFormaCalc,
  equityOf,
  sharesOf,
  stockPriceOf,
  marketCapOf,
  maxShareIssueLimit,
  maxShareBuybackLimit
} from "../../engine/simulationEngine";
import { ProFormaWorkbench } from "../ProFormaWorkbench";
import { ProFormaPanel } from "./ProFormaPanel";
import { DecisionAuditor } from "../DecisionAuditor";
import {
  DollarSign,
  Landmark,
  PieChart,
  AlertTriangle,
  FileText,
  Sparkles,
  ShieldCheck,
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Gift
} from "lucide-react";

interface FinanceTabProps {
  team: TeamState;
  gameState: GameState;
  onChange: (updatedTeam: TeamState) => void;
  onNotify: (msg: string) => void;
  universeId: string;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({
  team,
  gameState,
  onChange,
  onNotify,
  universeId
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "proforma" | "equity" | "workbench" | "auditor" | "abc" | "debt" | "vc"
  >("proforma");
  const isLocked = team.dec.locked;

  const pf = proFormaCalc(gameState, team);
  const maxBank = bankLimit(team);
  const maxLT = ltLimit(team);
  const currentValuation = valuationOf(team);
  const lastHist = team.hist[team.hist.length - 1];
  const netEquity = equityOf(team);

  // Shares and Equity Metrics
  const curShares = sharesOf(team);
  const curStockPrice = stockPriceOf(team);
  const curMarketCap = marketCapOf(team);
  const maxIssue = maxShareIssueLimit(team);
  const maxBuyback = maxShareBuybackLimit(team);

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

  const handleShareIssueChange = (val: number) => {
    if (isLocked) return;
    const capped = Math.max(0, Math.min(maxIssue, Math.round(val)));
    onChange({
      ...team,
      dec: {
        ...team.dec,
        shareIssue: capped
      }
    });
  };

  const handleShareBuybackChange = (val: number) => {
    if (isLocked) return;
    const capped = Math.max(0, Math.min(maxBuyback, Math.round(val)));
    onChange({
      ...team,
      dec: {
        ...team.dec,
        shareBuyback: capped
      }
    });
  };

  const handleDividendChange = (val: number) => {
    if (isLocked) return;
    const capped = Math.max(0, Math.min(10, Math.round(val * 100) / 100));
    onChange({
      ...team,
      dec: {
        ...team.dec,
        dividendPerShare: capped
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
    <div className="space-y-6 font-sans">
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
          onClick={() => setActiveSubTab("equity")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "equity"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
          }`}
        >
          <Coins className="w-3.5 h-3.5" /> Capital Structure & Shares
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
      {activeSubTab === "proforma" && <ProFormaPanel team={team} gameState={gameState} universeId={universeId} onNotify={onNotify} />}
      {false && activeSubTab === "proforma" && (
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
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Stock Price / MktCap</div>
                <div className="text-lg font-bold text-amber-700 mt-1">
                  Rs. {curStockPrice.toFixed(2)}
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">Cap: Rs. {curMarketCap.toLocaleString("en-IN")} L</div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E0DCD3] shadow-sm">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Operating Margin (EBITDA %)</div>
                <div className="text-lg font-bold text-blue-700 mt-1">
                  {lastHist && lastHist.revenue > 0 ? ((lastHist.ebitda / lastHist.revenue) * 100).toFixed(1) : "0.0"}%
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
              Projects ending cash based on committed decision expenditures, financing flows, and liquid reserves.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
                <span className="text-[#5A5C60]">Starting Liquid Cash:</span>
                <span className="font-bold text-[#1F2022]">{fmtL(pf.cash)} L</span>
              </div>
              {pf.equityInflow > 0 && (
                <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-amber-700">
                  <span>+ Equity Capital Raise (Share Offering):</span>
                  <span>+{fmtL(pf.equityInflow)} L</span>
                </div>
              )}
              {pf.ltInflow > 0 && (
                <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-emerald-700">
                  <span>+ Debt Borrowing Inflow (Bond Issue):</span>
                  <span>+{fmtL(pf.ltInflow)} L</span>
                </div>
              )}
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
              {pf.shareBuyback > 0 && (
                <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-purple-700">
                  <span>- Share Buyback (Treasury Repurchase):</span>
                  <span>-{fmtL(pf.shareBuyback)} L</span>
                </div>
              )}
              {pf.dividends > 0 && (
                <div className="flex justify-between py-1 border-b border-[#E0DCD3] text-indigo-700">
                  <span>- Cash Dividends Declared:</span>
                  <span>-{fmtL(pf.dividends)} L</span>
                </div>
              )}
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

      {/* SUB-TAB 2: CAPITAL STRUCTURE & SHARES */}
      {activeSubTab === "equity" && (
        <div className="space-y-6">
          {/* Treasury & Equity Metrics Summary */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-bold text-[#1F2022]">
                    Treasury & Shareholder Equity Overview
                  </h3>
                  <p className="text-xs text-[#5A5C60]">
                    Manage company equity, public stock issuance, treasury buybacks, and dividend payouts.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold uppercase">
                Stock Exchange Traded
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Stock Price</div>
                <div className="text-xl font-bold text-amber-700 mt-1">
                  Rs. {curStockPrice.toFixed(2)}
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">Per Share</div>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Shares Outstanding</div>
                <div className="text-xl font-bold text-[#1F2022] mt-1">
                  {curShares.toFixed(1)} L
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">{(curShares * 100000).toLocaleString("en-IN")} Shares</div>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Market Capitalization</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {fmtL(curMarketCap)} L
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">Price × Shares</div>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">EPS (Last Quarter)</div>
                <div className={`text-xl font-bold mt-1 ${lastHist && (lastHist.eps || 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  Rs. {lastHist && lastHist.eps !== undefined ? lastHist.eps.toFixed(2) : (lastHist ? (lastHist.profit / curShares).toFixed(2) : "0.00")}
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">Earnings / Share</div>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Cum Dividends Paid</div>
                <div className="text-xl font-bold text-indigo-700 mt-1">
                  {fmtL(team.cumDividends || 0)} L
                </div>
                <div className="text-[10px] text-[#5A5C60] mt-0.5">Total Shareholder Yield</div>
              </div>
            </div>

            {/* Ownership Breakdown */}
            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3] space-y-2">
              <div className="text-xs font-bold text-[#1F2022] flex justify-between">
                <span>Corporate Ownership Structure</span>
                <span className="font-mono text-[#5A5C60]">
                  Founders: {(100 - team.equityVC - team.equityEm).toFixed(1)}% | VC: {team.equityVC.toFixed(1)}% | Emergency Lender: {team.equityEm.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${Math.max(0, 100 - team.equityVC - team.equityEm)}%` }}
                  className="bg-emerald-600 h-full"
                  title="Founders"
                />
                <div
                  style={{ width: `${team.equityVC}%` }}
                  className="bg-purple-600 h-full"
                  title="VC Investors"
                />
                <div
                  style={{ width: `${team.equityEm}%` }}
                  className="bg-red-500 h-full"
                  title="Emergency Debt Dilution"
                />
              </div>
            </div>
          </div>

          {/* Strategic Capital Decisions: Issue Shares, Buyback, Dividends */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Share Issuance */}
            <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E0DCD3] pb-2 text-emerald-800">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold">Issue New Shares (Equity Offering)</h4>
              </div>
              <p className="text-xs text-[#5A5C60]">
                Raise non-debt capital by issuing new shares at the current stock price (Rs. {curStockPrice.toFixed(2)}/sh).
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#5A5C60]">Capital to Raise (Rs. L):</span>
                    <span className="font-bold text-emerald-700">Rs. {team.dec.shareIssue || 0} L</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxIssue}
                    step={25}
                    disabled={isLocked}
                    value={team.dec.shareIssue || 0}
                    onChange={(e) => handleShareIssueChange(+e.target.value)}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-[#5A5C60] mt-1">
                    <span>Rs. 0 L</span>
                    <span>Max: Rs. {maxIssue} L</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>New Shares Issued:</span>
                    <span className="font-bold text-emerald-800">
                      {team.dec.shareIssue ? ((team.dec.shareIssue / curStockPrice)).toFixed(2) : "0.00"} L shares
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pro Forma Dilution:</span>
                    <span className="font-bold text-emerald-800">
                      {team.dec.shareIssue
                        ? (((team.dec.shareIssue / curStockPrice) / (curShares + (team.dec.shareIssue / curStockPrice))) * 100).toFixed(1)
                        : "0.0"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Share Buyback */}
            <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E0DCD3] pb-2 text-purple-800">
                <RefreshCw className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-bold">Share Buyback (Treasury Repurchase)</h4>
              </div>
              <p className="text-xs text-[#5A5C60]">
                Repurchase shares from the open market using liquid cash reserves to reduce share count and boost EPS.
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#5A5C60]">Buyback Outlay (Rs. L):</span>
                    <span className="font-bold text-purple-700">Rs. {team.dec.shareBuyback || 0} L</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxBuyback}
                    step={25}
                    disabled={isLocked || maxBuyback <= 0}
                    value={team.dec.shareBuyback || 0}
                    onChange={(e) => handleShareBuybackChange(+e.target.value)}
                    className="w-full accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-[#5A5C60] mt-1">
                    <span>Rs. 0 L</span>
                    <span>Max: Rs. {maxBuyback} L</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/70 rounded-lg border border-purple-200 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Shares Repurchased:</span>
                    <span className="font-bold text-purple-800">
                      {team.dec.shareBuyback ? ((team.dec.shareBuyback / curStockPrice)).toFixed(2) : "0.00"} L shares
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ending Share Base:</span>
                    <span className="font-bold text-purple-800">
                      {Math.max(25, curShares - (team.dec.shareBuyback ? team.dec.shareBuyback / curStockPrice : 0)).toFixed(1)} L shares
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Dividend Payout */}
            <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E0DCD3] pb-2 text-indigo-800">
                <Gift className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold">Dividend Declaration</h4>
              </div>
              <p className="text-xs text-[#5A5C60]">
                Declare cash dividends per share to reward equity holders and directly boost the Balanced Scorecard Wealth metric.
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#5A5C60]">Dividend / Share (Rs.):</span>
                    <span className="font-bold text-indigo-700">Rs. {(team.dec.dividendPerShare || 0).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.min(5, team.cash / Math.max(1, curShares))}
                    step={0.1}
                    disabled={isLocked || team.cash <= 0}
                    value={team.dec.dividendPerShare || 0}
                    onChange={(e) => handleDividendChange(+e.target.value)}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-[#5A5C60] mt-1">
                    <span>Rs. 0.00</span>
                    <span>Max: Rs. {Math.min(5, team.cash / Math.max(1, curShares)).toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Total Cash Dividend:</span>
                    <span className="font-bold text-indigo-800">
                      Rs. {((team.dec.dividendPerShare || 0) * curShares).toFixed(1)} L
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dividend Yield:</span>
                    <span className="font-bold text-indigo-800">
                      {curStockPrice > 0 ? (((team.dec.dividendPerShare || 0) / curStockPrice) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Stock Price & Valuation Trajectory */}
          {team.hist.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-4">
              <h4 className="font-bold text-sm text-[#1F2022] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Historical Equity & Valuation Trajectory
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E0DCD3] text-[#5A5C60] uppercase text-[10px]">
                      <th className="text-left py-2">Quarter</th>
                      <th className="text-right py-2">Stock Price (Rs.)</th>
                      <th className="text-right py-2">Shares (L)</th>
                      <th className="text-right py-2">Market Cap (Rs. L)</th>
                      <th className="text-right py-2">Net Profit (Rs. L)</th>
                      <th className="text-right py-2">EPS (Rs.)</th>
                      <th className="text-right py-2">Dividends (Rs. L)</th>
                      <th className="text-right py-2">Book Equity (Rs. L)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.hist.map((h) => {
                      const sh = h.shares || 100;
                      const sp = h.stockPrice || (curStockPrice);
                      return (
                        <tr key={h.q} className="border-b border-[#E0DCD3] hover:bg-[#FAF8F5]">
                          <td className="py-2 text-left font-bold text-[#1F2022]">Q{h.q}</td>
                          <td className="py-2 text-right font-bold text-amber-700">Rs. {sp.toFixed(2)}</td>
                          <td className="py-2 text-right">{sh.toFixed(1)} L</td>
                          <td className="py-2 text-right font-bold text-emerald-700">{fmtL(sh * sp)} L</td>
                          <td className={`py-2 text-right font-bold ${h.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                            {fmtL(h.profit)} L
                          </td>
                          <td className="py-2 text-right font-bold">
                            Rs. {h.eps !== undefined ? h.eps.toFixed(2) : (h.profit / sh).toFixed(2)}
                          </td>
                          <td className="py-2 text-right text-indigo-700">
                            {h.dividendsPaid ? `Rs. ${h.dividendsPaid.toFixed(1)} L` : "-"}
                          </td>
                          <td className="py-2 text-right text-[#5A5C60]">
                            {fmtL(h.cash + (h.invValue || 0) + (h.ppe || 0) - (h.debt.bank + h.debt.lt + h.debt.shark))} L
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

