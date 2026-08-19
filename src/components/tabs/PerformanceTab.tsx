import React, { useState } from "react";
import { TeamState, GameState } from "../../types/simulation";
import { SEGMENTS, fmtL, fmtRs } from "../../engine/catalog";
import { ExecutiveDebrief } from "../ExecutiveDebrief";
import { Award, BarChart3, TrendingUp, Newspaper, Users, Eye, FileText, Lock, ShieldAlert, Sparkles, Building2, Store, DollarSign, Target } from "lucide-react";

interface PerformanceTabProps {
  team: TeamState;
  gameState: GameState;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ team, gameState }) => {
  const [activeReportTab, setActiveReportTab] = useState<"bsc" | "debrief" | "rivals" | "intel" | "clinic" | "share" | "news">("bsc");

  const lastResult = team.hist[team.hist.length - 1];
  const lastReport = gameState.reports[gameState.reports.length - 1];

  const hasIntelReport = !!(lastResult && lastResult.intel && lastResult.intel.length > 0);
  const hasClinicReport = !!(lastResult && lastResult.clinic && lastResult.clinic.length > 0);

  const bscLabels: Record<string, string> = {
    FP: "Financial Performance",
    MP: "Market Performance (Target Segments)",
    ME: "Marketing Effectiveness",
    IF: "Investment in Future",
    W: "Wealth Creation",
    HR: "Human Resource Management",
    AM: "Asset Management",
    MFG: "Manufacturing Productivity",
    FR: "Financial Risk"
  };

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
          <Lock className="w-3.5 h-3.5 text-purple-600" /> Competitor Intelligence (Rs. 15L)
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
          <Eye className="w-3.5 h-3.5 text-blue-600" /> Consumer Clinic Report (Rs. 10L)
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
      </div>

      {/* SUB-TAB: EXECUTIVE DEBRIEF PACK */}
      {activeReportTab === "debrief" && (
        <ExecutiveDebrief gameState={gameState} currentTeam={team} />
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

      {/* BSC DEEP DIVE */}
      {activeReportTab === "bsc" && lastResult && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#1F2022]">
                  Balanced Scorecard Performance Breakdown
                </h3>
                <p className="text-xs text-[#5A5C60]">
                  Total Business Performance = Product of all 9 performance indicators. A score of zero in any indicator zeroes out Total Performance.
                </p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-center font-mono">
                <div className="text-[10px] uppercase text-emerald-800 font-bold">
                  Quarter {lastResult.q} Total Score
                </div>
                <div className="text-3xl font-extrabold text-emerald-700">
                  {lastResult.bsc.total.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.keys(bscLabels).map((key) => {
                const score = lastResult.bsc.parts[key] || 0;
                return (
                  <div
                    key={key}
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E1D8] space-y-1"
                  >
                    <div className="text-xs font-mono text-[#5A5C60] uppercase">
                      {bscLabels[key]}
                    </div>
                    <div className="text-xl font-bold font-mono text-[#1F2022]">
                      {score.toFixed(2)}
                    </div>
                    <div className="w-full bg-[#E0DCD3] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full"
                        style={{ width: `${Math.min(100, (score / 3) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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

