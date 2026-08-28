import React, { useState } from "react";
import { TeamState, GameState } from "../../types/simulation";
import { SEGMENTS, fmtL, fmtRs } from "../../engine/catalog";
import { ExecutiveDebrief } from "../ExecutiveDebrief";
import ExecutiveBriefing from "../ExecutiveBriefing";
import CompetitiveBenchmark from "../CompetitiveBenchmark";
import SWOTAnalysis from "../SWOTAnalysis";
import BalancedScorecard from "../BalancedScorecard";
import DecisionHistory from "../DecisionHistory";
import PerceptualMap from "../PerceptualMap";
import {
  sharesOf,
  stockPriceOf,
  marketCapOf,
  equityOf,
  cumBSC
} from "../../engine/simulationEngine";
import {
  Award,
  BarChart3,
  TrendingUp,
  Newspaper,
  Users,
  Eye,
  FileText,
  Lock,
  ShieldAlert,
  Sparkles,
  Building2,
  MapPin,
  Store,
  DollarSign,
  Target,
  Receipt,
  Scale,
  Coins,
  History,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface PerformanceTabProps {
  team: TeamState;
  gameState: GameState;
  universeId: string;
  onNotify?: (message: string) => void;
  functionalRole?: string;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ team, gameState, universeId, onNotify, functionalRole = "President" }) => {
  const [activeReportTab, setActiveReportTab] = useState<
    "bsc" | "statements" | "valuation" | "debrief" | "rivals" | "benchmark" | "intel" | "clinic" | "share" | "news" | "swot" | "history" | "market_map"
  >("bsc");
  const [statementType, setStatementType] = useState<"income" | "balance" | "cashflow">("income");
  const [selectedQuarter, setSelectedQuarter] = useState<number>(
    team.hist.length > 0 ? team.hist[team.hist.length - 1].q : 1
  );

  const lastResult = team.hist[team.hist.length - 1];
  const lastReport = gameState.reports[gameState.reports.length - 1];

  const currentHistItem =
    team.hist.find((h) => h.q === selectedQuarter) || lastResult;

  const hasIntelReport = !!(lastResult && lastResult.intel && lastResult.intel.length > 0);
  const hasClinicReport = !!(lastResult && lastResult.clinic && lastResult.clinic.length > 0);

  return (
    <div className="space-y-6 text-[#1F2022] font-sans">
      {/* Sub-Tab Navigation Bar */}
      <div className="bg-white p-3 rounded-2xl border border-[#E5E1D8] shadow-sm flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveReportTab("bsc")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "bsc"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-500" /> Balanced Scorecard
        </button>

        <button onClick={() => setActiveReportTab("swot")} className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${activeReportTab === "swot" ? "bg-[#1F2022] text-white shadow-sm" : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"}`}>
          <Target className="w-3.5 h-3.5 text-rose-600" /> SWOT Analysis
        </button>

        <button
          onClick={() => setActiveReportTab("statements")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "statements"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-emerald-600" /> 3-Way Financial Statements
        </button>

        <button
          onClick={() => setActiveReportTab("valuation")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "valuation"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-amber-600" /> Stock & Valuation League
        </button>

        <button
          onClick={() => setActiveReportTab("debrief")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "debrief"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-indigo-500" /> Executive Debrief Pack
        </button>

        <button
          onClick={() => setActiveReportTab("rivals")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "rivals"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Competitor Benchmarks
        </button>

        <button
          onClick={() => setActiveReportTab("intel")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "intel"
              ? "bg-[#1F2022] text-white shadow-sm"
              : hasIntelReport
              ? "bg-purple-50 text-purple-800 border border-purple-200"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-purple-600" /> Competitor Intelligence
        </button>

        <button
          onClick={() => setActiveReportTab("benchmark")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "benchmark"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-teal-600" /> Competitive Research
        </button>

        <button
          onClick={() => setActiveReportTab("clinic")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "clinic"
              ? "bg-[#1F2022] text-white shadow-sm"
              : hasClinicReport
              ? "bg-blue-50 text-blue-800 border border-blue-200"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" /> Consumer Clinic Report
        </button>

        <button
          onClick={() => setActiveReportTab("share")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "share"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-teal-600" /> Market Share & Demand
        </button>

        <button
          onClick={() => setActiveReportTab("news")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "news"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <Newspaper className="w-3.5 h-3.5 text-rose-600" /> Industry Press
        </button>

        <button
          onClick={() => setActiveReportTab("market_map")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "market_map"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-teal-700" /> Market Map
        </button>

        <button
          onClick={() => setActiveReportTab("history")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 ${
            activeReportTab === "history"
              ? "bg-[#1F2022] text-white shadow-sm"
              : "bg-[#FAF8F5] text-[#5A5C60] hover:bg-[#E5E1D8]"
          }`}
        >
          <History className="w-3.5 h-3.5 text-rose-600" /> Decision History
        </button>
      </div>

      {/* SUB-TAB: AUDITED 3-WAY FINANCIAL STATEMENTS */}
      {activeReportTab === "statements" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-6">
            {/* Header & Quarter Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E1D8] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2022] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-700" />
                  Audited Corporate Financial Statements
                </h3>
                <p className="text-xs text-[#5A5C60]">
                  Standardized GAAP/IFRS 3-way financial statements for {team.name}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Quarter Picker */}
                {team.hist.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-lg border border-[#E0DCD3]">
                    <span className="text-[10px] font-mono uppercase text-[#5A5C60] px-2 font-bold">Quarter:</span>
                    {team.hist.map((h) => (
                      <button
                        key={h.q}
                        onClick={() => setSelectedQuarter(h.q)}
                        className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition ${
                          selectedQuarter === h.q
                            ? "bg-[#1F2022] text-white"
                            : "text-[#5A5C60] hover:bg-slate-200"
                        }`}
                      >
                        Q{h.q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Statement Selector */}
                <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-lg border border-[#E0DCD3]">
                  <button
                    onClick={() => setStatementType("income")}
                    className={`px-3 py-1 rounded text-xs font-bold font-mono transition ${
                      statementType === "income" ? "bg-emerald-700 text-white" : "text-[#5A5C60] hover:bg-slate-200"
                    }`}
                  >
                    Income Statement
                  </button>
                  <button
                    onClick={() => setStatementType("balance")}
                    className={`px-3 py-1 rounded text-xs font-bold font-mono transition ${
                      statementType === "balance" ? "bg-emerald-700 text-white" : "text-[#5A5C60] hover:bg-slate-200"
                    }`}
                  >
                    Balance Sheet
                  </button>
                  <button
                    onClick={() => setStatementType("cashflow")}
                    className={`px-3 py-1 rounded text-xs font-bold font-mono transition ${
                      statementType === "cashflow" ? "bg-emerald-700 text-white" : "text-[#5A5C60] hover:bg-slate-200"
                    }`}
                  >
                    Cash Flow
                  </button>
                </div>
              </div>
            </div>

            {!currentHistItem ? (
              <div className="text-center py-12 text-[#5A5C60] text-xs font-mono">
                No financial history available yet. Complete Quarter 1 to generate audited financial statements.
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. INCOME STATEMENT */}
                {statementType === "income" && (
                  <div className="space-y-3 font-mono text-xs max-w-4xl mx-auto">
                    <div className="text-sm font-bold text-[#1F2022] font-sans pb-2 border-b-2 border-[#1F2022] flex justify-between">
                      <span>Statement of Profit and Loss (Income Statement)</span>
                      <span>Quarter {currentHistItem.q}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between py-1.5 text-emerald-800 font-bold border-b border-[#E0DCD3]">
                        <span>Gross Commercial Revenue:</span>
                        <span>{fmtL(currentHistItem.rev)} L</span>
                      </div>
                      <div className="flex justify-between py-1 text-red-600 pl-4 border-b border-[#E0DCD3]">
                        <span>Less: Direct Cost of Goods Sold (BOM Materials & Plant Labor):</span>
                        <span>-{fmtL(currentHistItem.cogs || currentHistItem.materials || 0)} L</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-[#1F2022] bg-[#FAF8F5] px-2 rounded">
                        <span>GROSS PROFIT (Contribution Margin):</span>
                        <span className="text-emerald-700">{fmtL(currentHistItem.gp)} L</span>
                      </div>

                      <div className="pt-2 text-[11px] font-bold text-[#5A5C60] uppercase">Operating Expenses (SG&A):</div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-[#5A5C60]">
                        <span>Brand Marketing & Segment Advertising:</span>
                        <span>{fmtL(currentHistItem.ad)} L</span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-[#5A5C60]">
                        <span>Experience Center Showroom Opex & Fixed Rent:</span>
                        <span>{fmtL(currentHistItem.centres * 12)} L</span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-[#5A5C60]">
                        <span>Sales Force & Corporate Payroll:</span>
                        <span>{fmtL(currentHistItem.staff * 2.5)} L</span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-[#5A5C60]">
                        <span>Quality Management & TQM Programs:</span>
                        <span>{fmtL(currentHistItem.qualitySpend || 0)} L</span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-[#5A5C60]">
                        <span>R&D Tech Engineering Outlays:</span>
                        <span>{fmtL(currentHistItem.rndSpend || 0)} L</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-[#1F2022] bg-[#FAF8F5] px-2 rounded">
                        <span>EBITDA (Operating Profit before Interest & Depreciation):</span>
                        <span className="text-emerald-700">{fmtL(currentHistItem.ebitda)} L</span>
                      </div>

                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-[#5A5C60]">
                        <span>Depreciation of PP&E Plant Assets:</span>
                        <span>-{fmtL(currentHistItem.deprec || 20)} L</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-[#1F2022] bg-[#FAF8F5] px-2 rounded">
                        <span>EBIT (Operating Profit):</span>
                        <span className={currentHistItem.ebitda - (currentHistItem.deprec || 20) >= 0 ? "text-emerald-700" : "text-red-600"}>
                          {fmtL(currentHistItem.ebitda - (currentHistItem.deprec || 20))} L
                        </span>
                      </div>

                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-red-600">
                        <span>Finance Costs (Bank Credit & Bond Debt Interest):</span>
                        <span>-{fmtL(currentHistItem.interest || 0)} L</span>
                      </div>

                      <div className="flex justify-between py-2 border-t-2 border-[#1F2022] text-sm font-bold bg-slate-100 px-2 rounded">
                        <span>NET PROFIT / (LOSS) AFTER TAX:</span>
                        <span className={currentHistItem.profit >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                          {fmtL(currentHistItem.profit)} L
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. BALANCE SHEET */}
                {statementType === "balance" && (
                  <div className="space-y-4 font-mono text-xs max-w-4xl mx-auto">
                    <div className="text-sm font-bold text-[#1F2022] font-sans pb-2 border-b-2 border-[#1F2022] flex justify-between">
                      <span>Statement of Financial Position (Balance Sheet)</span>
                      <span>Quarter {currentHistItem.q}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* ASSETS */}
                      <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3] space-y-2">
                        <div className="font-bold text-sm text-[#1F2022] border-b border-[#E0DCD3] pb-1">
                          TOTAL ASSETS
                        </div>
                        <div className="text-[11px] font-bold text-[#5A5C60] uppercase pt-1">Current Assets:</div>
                        <div className="flex justify-between pl-2">
                          <span>Liquid Cash & Bank Reserves:</span>
                          <span className="font-bold text-emerald-700">{fmtL(currentHistItem.cash)} L</span>
                        </div>
                        <div className="flex justify-between pl-2">
                          <span>Finished Goods Inventory Valuation:</span>
                          <span>{fmtL(currentHistItem.invValue || (currentHistItem.balanceSheet?.inventory) || 0)} L</span>
                        </div>

                        <div className="text-[11px] font-bold text-[#5A5C60] uppercase pt-2">Non-Current Assets:</div>
                        <div className="flex justify-between pl-2">
                          <span>Factory Plant, Machinery & PP&E:</span>
                          <span>{fmtL(currentHistItem.ppe || (currentHistItem.balanceSheet?.ppe) || 600)} L</span>
                        </div>

                        <div className="flex justify-between pt-3 border-t-2 border-[#1F2022] font-bold text-sm bg-white p-2 rounded">
                          <span>TOTAL ASSETS:</span>
                          <span className="text-emerald-700">
                            {fmtL(
                              currentHistItem.cash +
                              (currentHistItem.invValue || currentHistItem.balanceSheet?.inventory || 0) +
                              (currentHistItem.ppe || currentHistItem.balanceSheet?.ppe || 600)
                            )} L
                          </span>
                        </div>
                      </div>

                      {/* LIABILITIES & EQUITY */}
                      <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3] space-y-2">
                        <div className="font-bold text-sm text-[#1F2022] border-b border-[#E0DCD3] pb-1">
                          TOTAL LIABILITIES & EQUITY
                        </div>
                        <div className="text-[11px] font-bold text-[#5A5C60] uppercase pt-1">Liabilities:</div>
                        <div className="flex justify-between pl-2">
                          <span>Short-Term Bank Credit Facility:</span>
                          <span>{fmtL(currentHistItem.debt.bank)} L</span>
                        </div>
                        <div className="flex justify-between pl-2">
                          <span>5-Year Long-Term Corporate Bonds:</span>
                          <span>{fmtL(currentHistItem.debt.lt)} L</span>
                        </div>
                        <div className="flex justify-between pl-2 text-red-600">
                          <span>Emergency Shark Debt:</span>
                          <span>{fmtL(currentHistItem.debt.shark)} L</span>
                        </div>

                        <div className="text-[11px] font-bold text-[#5A5C60] uppercase pt-2">Shareholders' Equity:</div>
                        <div className="flex justify-between pl-2">
                          <span>Paid-in Capital & Common Stock:</span>
                          <span>{fmtL(team.paidIn)} L</span>
                        </div>
                        <div className="flex justify-between pl-2">
                          <span>Cumulative Retained Earnings:</span>
                          <span className={team.cumProfit >= 0 ? "text-emerald-700" : "text-red-600"}>
                            {fmtL(team.cumProfit)} L
                          </span>
                        </div>
                        <div className="flex justify-between pl-2 text-indigo-700">
                          <span>Less: Cumulative Dividends Distributed:</span>
                          <span>-{fmtL(team.cumDividends || 0)} L</span>
                        </div>

                        <div className="flex justify-between pt-3 border-t-2 border-[#1F2022] font-bold text-sm bg-white p-2 rounded">
                          <span>TOTAL LIABILITIES & EQUITY:</span>
                          <span className="text-emerald-700">
                            {fmtL(
                              currentHistItem.debt.bank +
                              currentHistItem.debt.lt +
                              currentHistItem.debt.shark +
                              (currentHistItem.cash +
                                (currentHistItem.invValue || currentHistItem.balanceSheet?.inventory || 0) +
                                (currentHistItem.ppe || currentHistItem.balanceSheet?.ppe || 600) -
                                (currentHistItem.debt.bank + currentHistItem.debt.lt + currentHistItem.debt.shark))
                            )} L
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CASH FLOW STATEMENT */}
                {statementType === "cashflow" && (
                  <div className="space-y-3 font-mono text-xs max-w-4xl mx-auto">
                    <div className="text-sm font-bold text-[#1F2022] font-sans pb-2 border-b-2 border-[#1F2022] flex justify-between">
                      <span>Statement of Cash Flows</span>
                      <span>Quarter {currentHistItem.q}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-[#5A5C60] uppercase">1. Cash Flows from Operating Activities:</div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3]">
                        <span>Net Profit for the Quarter:</span>
                        <span className={currentHistItem.profit >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                          {fmtL(currentHistItem.profit)} L
                        </span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3]">
                        <span>Add Back: Non-Cash Depreciation:</span>
                        <span>+{fmtL(currentHistItem.deprec || 20)} L</span>
                      </div>

                      <div className="text-[11px] font-bold text-[#5A5C60] uppercase pt-2">2. Cash Flows from Investing Activities:</div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-red-600">
                        <span>Capital Expenditures (Plant & Production Expansion):</span>
                        <span>-{fmtL(currentHistItem.cashFlow?.capex || (currentHistItem.expBlocks ? currentHistItem.expBlocks * 100 : 0))} L</span>
                      </div>

                      <div className="text-[11px] font-bold text-[#5A5C60] uppercase pt-2">3. Cash Flows from Financing Activities:</div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-amber-700">
                        <span>Proceeds from Share Issuance:</span>
                        <span>+{fmtL(currentHistItem.cashFlow?.shareIssuance || 0)} L</span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-purple-700">
                        <span>Outflow for Share Buybacks:</span>
                        <span>-{fmtL(currentHistItem.cashFlow?.shareBuyback || 0)} L</span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-indigo-700">
                        <span>Cash Dividends Distributed:</span>
                        <span>-{fmtL(currentHistItem.dividendsPaid || currentHistItem.cashFlow?.dividends || 0)} L</span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 border-b border-[#E0DCD3] text-emerald-700">
                        <span>Net Debt Financing (Bonds & Bank Credit):</span>
                        <span>+{fmtL(currentHistItem.cashFlow?.debtIncurred || (currentHistItem.debt.lt > 0 ? currentHistItem.debt.lt : 0))} L</span>
                      </div>

                      <div className="flex justify-between py-2 border-t-2 border-[#1F2022] text-sm font-bold bg-slate-100 px-2 rounded mt-3">
                        <span>ENDING CASH BALANCE:</span>
                        <span className="text-emerald-700 font-bold">{fmtL(currentHistItem.cash)} L</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB: STOCK & VALUATION LEAGUE */}
      {activeReportTab === "valuation" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
              <Coins className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-[#1F2022]">
                  Corporate Valuation & Public Equity League Table
                </h3>
                <p className="text-xs text-[#5A5C60]">
                  Stock price, market capitalization, earnings per share (EPS), and return on equity (ROE) across all 10 EV universe teams.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#E5E1D8] text-[#5A5C60] uppercase text-[10px]">
                    <th className="text-left py-2.5">Rank & Firm</th>
                    <th className="text-right py-2.5">Stock Price</th>
                    <th className="text-right py-2.5">Shares Out</th>
                    <th className="text-right py-2.5">Market Cap</th>
                    <th className="text-right py-2.5">EPS (Qtr)</th>
                    <th className="text-right py-2.5">P/E Ratio</th>
                    <th className="text-right py-2.5">Dividends Paid</th>
                    <th className="text-right py-2.5">BSC Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...gameState.teams]
                    .sort((a, b) => marketCapOf(b) - marketCapOf(a))
                    .map((t, idx) => {
                      const r = t.hist[t.hist.length - 1];
                      const isSelf = t.i === team.i;
                      const sp = stockPriceOf(t);
                      const sh = sharesOf(t);
                      const mcap = marketCapOf(t);
                      const eps = r && r.eps !== undefined ? r.eps : (r ? r.profit / sh : 0);
                      const pe = eps > 0 ? (sp / (eps * 4)).toFixed(1) + "x" : "N/A";

                      return (
                        <tr
                          key={t.i}
                          className={`border-b border-[#E0DCD3] transition ${
                            isSelf ? "bg-amber-50 font-bold" : "hover:bg-[#FAF8F5]"
                          }`}
                        >
                          <td className="py-3 text-left font-sans font-bold flex items-center gap-2 text-[#1F2022]">
                            <span className="w-5 text-center text-[#5A5C60] font-mono">#{idx + 1}</span>
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.name} {isSelf && " (You)"}
                          </td>
                          <td className="text-right py-3 text-amber-700 font-bold">
                            Rs. {sp.toFixed(2)}
                          </td>
                          <td className="text-right py-3 text-[#1F2022]">
                            {sh.toFixed(1)} L
                          </td>
                          <td className="text-right py-3 text-emerald-700 font-bold">
                            {fmtL(mcap)} L
                          </td>
                          <td className={`text-right py-3 font-bold ${eps >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                            Rs. {eps.toFixed(2)}
                          </td>
                          <td className="text-right py-3 text-[#5A5C60]">
                            {pe}
                          </td>
                          <td className="text-right py-3 text-indigo-700 font-bold">
                            {t.cumDividends ? `Rs. ${fmtL(t.cumDividends)} L` : "-"}
                          </td>
                          <td className="text-right py-3 text-amber-700 font-bold">
                            {cumBSC(t).toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: EXECUTIVE DEBRIEF PACK */}
      {activeReportTab === "debrief" && (
        <div className="space-y-6"><ExecutiveBriefing team={team} gameState={gameState} universeId={universeId} role={functionalRole} /><ExecutiveDebrief gameState={gameState} currentTeam={team} /></div>
      )}

      {activeReportTab === "swot" && <SWOTAnalysis universeId={universeId} teamId={team.i} quarter={selectedQuarter} teamName={team.name} onNotify={onNotify} />}

      {activeReportTab === "history" && <DecisionHistory teamId={team.i} quarter={gameState.quarter} onNotify={onNotify} />}

      {/* SUB-TAB: MARKET MAP */}
      {activeReportTab === "market_map" && (
        <PerceptualMap gameState={gameState} currentTeamIdx={team.i} quarter={gameState.quarter} />
      )}

      {/* SUB-TAB: COMPETITOR BENCHMARKS (PUBLIC) */}
      {activeReportTab === "rivals" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
              <Building2 className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-base font-bold text-[#1F2022]">
                  Industry Universe Competitor Leaderboard (Quarter {gameState.quarter - 1 || 1})
                </h3>
                <p className="text-xs text-[#5A5C60]">
                  Public market performance metrics for all competing firms across the 10-team EV universe.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#E5E1D8] text-[#5A5C60] uppercase text-[10px]">
                    <th className="text-left py-2.5">Firm Name</th>
                    <th className="text-right py-2.5">Quarter Revenue</th>
                    <th className="text-right py-2.5">Units Sold</th>
                    <th className="text-right py-2.5">Market Share</th>
                    <th className="text-right py-2.5">Cumulative Profit</th>
                    <th className="text-right py-2.5">Ending Cash</th>
                    <th className="text-right py-2.5">BSC Total Score</th>
                  </tr>
                </thead>
                <tbody>
                  {gameState.teams.map((t) => {
                    const r = t.hist[t.hist.length - 1];
                    const isSelf = t.i === team.i;

                    return (
                      <tr
                        key={t.i}
                        className={`border-b border-[#E0DCD3] transition ${
                          isSelf ? "bg-[#FAF8F5] font-bold" : "hover:bg-[#FAF8F5]"
                        }`}
                      >
                        <td className="py-3 text-left font-sans font-bold flex items-center gap-2 text-[#1F2022]">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          {t.name} {isSelf && " (Your Firm)"}
                        </td>
                        <td className="text-right py-3 text-emerald-700 font-bold">
                          {r ? fmtL(r.rev) + " L" : "Rs. 0 L"}
                        </td>
                        <td className="text-right py-3 text-[#1F2022]">
                          {r ? r.units.toLocaleString("en-IN") : "0"}
                        </td>
                        <td className="text-right py-3 text-indigo-700 font-bold">
                          {r ? (r.share * 100).toFixed(1) + "%" : "0.0%"}
                        </td>
                        <td className="text-right py-3 text-[#1F2022]">
                          {fmtL(t.cumProfit)} L
                        </td>
                        <td className="text-right py-3 text-[#1F2022]">
                          {fmtL(t.cash)} L
                        </td>
                        <td className="text-right py-3 text-amber-700 font-bold">
                          {r ? r.bsc.total.toFixed(1) : "0.0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === "benchmark" && (
        <CompetitiveBenchmark
          teamId={team.i}
          quarter={selectedQuarter}
          budget={team.dec.market_research_budget || 0}
        />
      )}

      {/* SUB-TAB: COMPETITOR INTELLIGENCE REPORT (GATED) */}
      {activeReportTab === "intel" && (
        <div className="space-y-6">
          {hasIntelReport ? (
            <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="text-base font-bold text-[#1F2022]">
                      Syndicated Competitor Intelligence Report
                    </h3>
                    <p className="text-xs text-[#5A5C60]">
                      Deep audit of rival advertising budgets, outlets, headcount, tech capabilities, and estimated manufacturing cost structures.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 text-xs font-mono font-bold rounded-lg">
                  Subscribed (Rs. 15 L / Qtr)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lastResult.intel.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between font-bold border-b border-[#E0DCD3] pb-1.5 font-sans">
                      <span className="flex items-center gap-2 text-sm text-[#1F2022]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="text-purple-700 font-mono">Est. Ad Budget: Rs. {item.adBudget} L</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#5A5C60]">Experience Centers:</span>{" "}
                        <strong className="text-[#1F2022]">{item.centres} Outlets</strong>
                      </div>
                      <div>
                        <span className="text-[#5A5C60]">Sales Headcount:</span>{" "}
                        <strong className="text-[#1F2022]">{item.staff} Staff</strong>
                      </div>
                      <div>
                        <span className="text-[#5A5C60]">Brand Awareness Avg:</span>{" "}
                        <strong className="text-emerald-700">{item.awAvg}%</strong>
                      </div>
                      <div>
                        <span className="text-[#5A5C60]">Active Technologies:</span>{" "}
                        <strong className="text-[#1F2022]">{item.techs.length} Techs</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E0DCD3]">
                      <div className="text-[10px] font-bold uppercase text-[#5A5C60] mb-1">
                        Dissected Models & Estimated Unit Costs:
                      </div>
                      <div className="space-y-1">
                        {item.models.map((m: any, mIdx: number) => (
                          <div key={mIdx} className="flex justify-between text-[11px] bg-white p-1.5 rounded border border-[#E0DCD3]">
                            <span className="font-sans font-medium text-[#1F2022]">{m.name}</span>
                            <span className="text-rose-700 font-bold">COGS: Rs. {m.estCost.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[#E5E1D8] shadow-sm text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1F2022]">
                Competitor Intelligence Report Not Subscribed
              </h3>
              <p className="text-xs text-[#5A5C60] leading-relaxed">
                Your executive team did not subscribe to the <strong>Syndicated Competitor Intelligence Report (Rs. 15 L)</strong> for this quarter. Subscribing reveals competitor advertising spend, showroom expansion counts, sales staff headcount, finished R&D tech projects, and estimated model manufacturing cost structures (COGS).
              </p>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E5E1D8] text-xs text-[#1F2022] font-mono">
                Subscribe in the <strong>Marketing Tab</strong> during decision phase to unlock next quarter.
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: CONSUMER CLINIC PANEL REPORT (GATED) */}
      {activeReportTab === "clinic" && (
        <div className="space-y-6">
          {hasClinicReport ? (
            <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-base font-bold text-[#1F2022]">
                      Customer Clinic Ratings Across All Competitor Models
                    </h3>
                    <p className="text-xs text-[#5A5C60]">
                      Consumer panel rating scores (0-100) for Quality Fit / Price Fit across all market segments.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono font-bold rounded-lg">
                  Subscribed (Rs. 10 L / Qtr)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E5E1D8] text-[#5A5C60] uppercase text-[10px]">
                      <th className="text-left py-2.5">Competitor Firm</th>
                      <th className="text-left py-2.5">Model</th>
                      {SEGMENTS.map((s) => (
                        <th key={s.id} className="text-center py-2.5">{s.id} ({s.name})</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lastResult.clinic.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-[#E0DCD3]">
                        <td className="py-2.5 text-left font-sans font-bold text-[#1F2022] flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                          {row.team}
                        </td>
                        <td className="py-2.5 text-left font-bold text-indigo-700">{row.model}</td>
                        {SEGMENTS.map((s) => (
                          <td key={s.id} className="text-center py-2.5 font-bold text-[#1F2022]">
                            {row.cells[s.id] || "N/A"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[#E5E1D8] shadow-sm text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1F2022]">
                Customer Clinic Rating Report Not Subscribed
              </h3>
              <p className="text-xs text-[#5A5C60] leading-relaxed">
                Your executive team did not subscribe to the <strong>Customer Clinic Rating Report (Rs. 10 L)</strong> for this quarter. Subscribing provides objective consumer panel scores (0-100) for every competitor vehicle model on Quality Fit, Price Fit, and Campaign Appeal across all 5 consumer segments.
              </p>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E5E1D8] text-xs text-[#1F2022] font-mono">
                Subscribe in the <strong>Marketing Tab</strong> during decision phase to unlock next quarter.
              </div>
            </div>
          )}
        </div>
      )}

      {activeReportTab === "bsc" && (
        <BalancedScorecard
          team={team}
          gameState={gameState}
          universeId={universeId}
          quarter={selectedQuarter}
        />
      )}

      {/* MARKET SHARE & DEMAND */}
      {activeReportTab === "share" && lastResult && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-[#1F2022]">
            Market Share & Volume Sales Breakdown
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center font-mono">
            <div className="p-3 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] uppercase text-[#5A5C60]">Units Sold</div>
              <div className="text-xl font-bold text-[#1F2022]">
                {lastResult.units.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] uppercase text-[#5A5C60]">Unserved Stockout Demand</div>
              <div className={`text-xl font-bold ${lastResult.lost > 0 ? "text-red-600" : "text-[#1F2022]"}`}>
                {lastResult.lost.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] uppercase text-[#5A5C60]">Overall Category Share</div>
              <div className="text-xl font-bold text-emerald-700">
                {(lastResult.share * 100).toFixed(1)}%
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] uppercase text-[#5A5C60]">Target Segment Share (Avg)</div>
              <div className="text-xl font-bold text-purple-700">
                {(((lastResult.sharePrim + lastResult.shareSec) / 2) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INDUSTRY NEWS */}
      {activeReportTab === "news" && lastReport && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#1F2022]">
            Quarter {lastReport.q} Industry Ticker & Press Releases
          </h3>

          <div className="space-y-2">
            {lastReport.news.map((n, idx) => (
              <div
                key={idx}
                dangerouslySetInnerHTML={{ __html: n }}
                className="p-3 bg-[#FAF8F5] rounded-xl text-xs border border-[#E5E1D8] text-[#1F2022]"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

