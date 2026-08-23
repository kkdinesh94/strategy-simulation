import React, { useEffect, useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { Award, Database, Lock, Save, TrendingUp } from "lucide-react";
import { equityOf } from "../engine/simulationEngine";

const DIMENSIONS = [
  { key: "financialPerformance", label: "Financial Performance", shortLabel: "Financial", weight: 15, higherIsBetter: true },
  { key: "financialRisk", label: "Financial Risk", shortLabel: "Risk", weight: 10, higherIsBetter: true },
  { key: "marketPerformance", label: "Market Performance", shortLabel: "Market", weight: 20, higherIsBetter: true },
  { key: "marketingEffectiveness", label: "Marketing Effectiveness", shortLabel: "Marketing", weight: 10, higherIsBetter: true },
  { key: "investmentFuture", label: "Investment in Future", shortLabel: "Future", weight: 10, higherIsBetter: true },
  { key: "wealthCreation", label: "Wealth Creation", shortLabel: "Wealth", weight: 10, higherIsBetter: true },
  { key: "assetManagement", label: "Asset Management", shortLabel: "Assets", weight: 5, higherIsBetter: true },
  { key: "hrManagement", label: "HR Management", shortLabel: "People", weight: 5, higherIsBetter: true },
  { key: "manufacturingProductivity", label: "Manufacturing Productivity", shortLabel: "Manufacturing", weight: 10, higherIsBetter: true },
  { key: "sustainability", label: "Sustainability", shortLabel: "Sustainability", weight: 5, higherIsBetter: true }
];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const latestResult = (team, quarter) => [...(team?.hist || [])].filter((result) => number(result.q) <= quarter).sort((a, b) => number(b.q) - number(a.q))[0] || {};
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function rawMetrics(team, result, priorResult) {
  const revenue = Math.max(1, number(result.revenue));
  const equity = Math.max(1, equityOf(team));
  const debt = number(team.debt?.bank) + number(team.debt?.lt) + number(team.debt?.shark);
  const margin = number(result.profit) / revenue;
  const targetShare = average([number(result.sharePrim), number(result.shareSec)]);
  const brandScore = number(result.brandJ);
  const adScore = number(result.campJ);
  const futureSpend = number(result.rndSpend) + number(result.quality) + number(result.dev);
  const equityPerShare = equity / Math.max(1, number(result.shares, team.shares || 100));
  const priorEquityPerShare = priorResult && number(priorResult.shares, team.shares || 100) > 0
    ? Math.max(0, equity - number(priorResult.profit)) / number(priorResult.shares, team.shares || 100)
    : equityPerShare;
  const assets = Math.max(1, number(result.cash, team.cash) + number(result.invValue) + number(result.ppe, team.ppe));
  const turnover = number(result.revenue) / assets;
  const hrScore = average([number(result.hrM?.sales, number(team.hr?.sales) / 100), number(result.hrM?.plant, number(team.hr?.plant) / 100)]) * 100;
  const cogsEfficiency = clamp((1 - number(result.cogs) / revenue) * 100);

  return {
    financialPerformance: margin,
    financialRisk: debt / equity,
    marketPerformance: average([number(result.share), targetShare]),
    marketingEffectiveness: average([brandScore, adScore]),
    investmentFuture: futureSpend,
    wealthCreation: priorEquityPerShare > 0 ? (equityPerShare - priorEquityPerShare) / priorEquityPerShare : 0,
    assetManagement: average([turnover, number(result.util)]),
    hrManagement: hrScore,
    manufacturingProductivity: average([number(result.reliab), cogsEfficiency / 100, number(result.util)]),
    sustainability: number(result.sustainabilityScore)
  };
}

function scoreMetrics(records) {
  const scores = {};
  DIMENSIONS.forEach((dimension) => {
    const values = records.map((record) => number(record.raw[dimension.key]));
    const best = dimension.higherIsBetter ? Math.max(...values, 0) : Math.min(...values, 0);
    const worst = dimension.higherIsBetter ? Math.min(...values, 0) : Math.max(...values, 0);
    const spread = best - worst;
    records.forEach((record) => {
      const value = number(record.raw[dimension.key]);
      scores[record.teamId] ||= {};
      scores[record.teamId][dimension.key] = spread > 0
        ? clamp(dimension.higherIsBetter ? ((value - worst) / spread) * 100 : ((best - value) / spread) * 100)
        : 50;
    });
  });
  return scores;
}

function weightedTotal(scores) {
  return DIMENSIONS.reduce((total, dimension) => total + number(scores[dimension.key]) * dimension.weight / 100, 0);
}

export default function BalancedScorecard({ team, gameState, universeId, quarter }) {
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const teams = Array.isArray(gameState?.teams) ? gameState.teams : [team];
  const selectedQuarter = number(quarter, number(gameState?.quarter, team?.hist?.at(-1)?.q || 1));
  const visible = selectedQuarter >= 4;

  const records = useMemo(() => teams.map((entry) => {
    const result = latestResult(entry, selectedQuarter);
    const prior = latestResult(entry, selectedQuarter - 1);
    return { teamId: String(entry.i), team: entry, result, raw: rawMetrics(entry, result, prior) };
  }), [teams, selectedQuarter]);

  const scoreMap = useMemo(() => scoreMetrics(records), [records]);
  const activeRecord = records.find((record) => String(record.teamId) === String(team?.i)) || records[0];
  const activeScores = activeRecord ? scoreMap[activeRecord.teamId] || {} : {};
  const radarData = DIMENSIONS.map((dimension) => ({
    dimension: dimension.shortLabel,
    score: Math.round(number(activeScores[dimension.key])),
    industry: Math.round(average(records.map((record) => scoreMap[record.teamId]?.[dimension.key] || 0))),
    best: Math.round(Math.max(...records.map((record) => scoreMap[record.teamId]?.[dimension.key] || 0), 0))
  }));
  const activeTotal = weightedTotal(activeScores);
  const industryTotal = average(records.map((record) => weightedTotal(scoreMap[record.teamId] || {})));
  const bestTotal = Math.max(...records.map((record) => weightedTotal(scoreMap[record.teamId] || {})), 0);

  useEffect(() => {
    if (!visible || !universeId || !activeRecord) return undefined;
    setSaveState("saving");
    setSaveError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/balanced-scorecard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ universeId, quarter: selectedQuarter, records: records.map((record) => ({ teamId: record.teamId, teamName: record.team.name, score: weightedTotal(scoreMap[record.teamId] || {}), dimensions: scoreMap[record.teamId] || {}, raw: record.raw })) })
        });
        if (!response.ok) throw new Error((await response.json()).error || "Could not save scorecard.");
        setSaveState("saved");
      } catch (error) {
        setSaveState("error");
        setSaveError(error.message);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [visible, universeId, selectedQuarter, records, scoreMap, activeRecord]);

  if (!visible) return <section className="rounded-2xl border border-[#E5E1D8] bg-white p-8 text-center shadow-sm"><Lock className="mx-auto mb-3 h-7 w-7 text-slate-500" /><h3 className="text-lg font-bold">Balanced Scorecard locked until Q4</h3><p className="mt-2 text-xs text-[#5A5C60]">Comparative performance results become visible after the third completed quarter.</p></section>;

  const benchmarkLabel = saveState === "saved" ? "Saved to D1" : saveState === "saving" ? "Saving..." : saveState === "error" ? "D1 unavailable" : "Ready to save";
  return <section className="space-y-6 rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1D8] pb-5"><div><div className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /><h2 className="text-xl font-bold">Balanced Scorecard</h2></div><p className="mt-1 max-w-2xl text-xs text-[#5A5C60]">ASCM-inspired EV operating view. Weighted score across nine dimensions, normalized against the teams in this universe.</p></div><div className="flex items-center gap-2 text-[10px] font-mono text-[#5A5C60]"><Database className="h-3.5 w-3.5" />{benchmarkLabel}</div></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-[#1F2022] p-4 text-white"><div className="text-[10px] uppercase text-slate-300">{activeRecord?.team?.name || "Team"} overall</div><div className="mt-1 text-3xl font-bold">{activeTotal.toFixed(1)}<span className="text-sm font-normal text-slate-400"> / 100</span></div></div><div className="rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] p-4"><div className="text-[10px] uppercase text-[#5A5C60]">Industry average</div><div className="mt-1 text-2xl font-bold">{industryTotal.toFixed(1)}</div></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-[10px] uppercase text-emerald-800">Best competitor</div><div className="mt-1 text-2xl font-bold text-emerald-800">{bestTotal.toFixed(1)}</div></div></div>
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(280px,420px)_1fr]"><div className="h-[330px] min-w-0"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%"><PolarGrid stroke="#D9D4CA" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "#5A5C60" }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} /><Radar name="Team" dataKey="score" stroke="#D9485F" fill="#D9485F" fillOpacity={0.28} /><Radar name="Industry average" dataKey="industry" stroke="#64748B" fill="#64748B" fillOpacity={0.08} /><Tooltip formatter={(value, name) => [`${Number(value).toFixed(0)} / 100`, name]} /></RadarChart></ResponsiveContainer></div><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="border-b border-[#E5E1D8] text-left text-[10px] uppercase text-[#5A5C60]"><th className="py-2 pr-3">Dimension</th><th className="py-2 text-right">Weight</th><th className="py-2 text-right">Team</th><th className="py-2 text-right">Industry avg.</th><th className="py-2 text-right">Best</th></tr></thead><tbody>{DIMENSIONS.map((dimension) => { const value = number(activeScores[dimension.key]); const industry = average(records.map((record) => scoreMap[record.teamId]?.[dimension.key] || 0)); const best = Math.max(...records.map((record) => scoreMap[record.teamId]?.[dimension.key] || 0), 0); return <tr key={dimension.key} className="border-b border-[#F0ECE5]"><td className="py-2 pr-3 font-semibold">{dimension.label}</td><td className="py-2 text-right font-mono text-[#5A5C60]">{dimension.weight}%</td><td className="py-2 text-right font-mono font-bold text-rose-700">{value.toFixed(0)}</td><td className="py-2 text-right font-mono">{industry.toFixed(0)}</td><td className="py-2 text-right font-mono text-emerald-700">{best.toFixed(0)}</td></tr>; })}</tbody></table></div></div>
    <div className="overflow-x-auto"><h3 className="mb-2 text-sm font-bold">League overall scores</h3><table className="min-w-full text-xs"><thead><tr className="border-b border-[#E5E1D8] text-left text-[10px] uppercase text-[#5A5C60]"><th className="py-2 pr-3">Rank</th><th className="py-2">Team</th><th className="py-2 text-right">Overall score</th><th className="py-2 text-right">vs. industry avg.</th><th className="py-2 text-right">vs. best</th></tr></thead><tbody>{records.slice().sort((first, second) => weightedTotal(scoreMap[second.teamId] || {}) - weightedTotal(scoreMap[first.teamId] || {})).map((record, index) => { const score = weightedTotal(scoreMap[record.teamId] || {}); return <tr key={record.teamId} className={`border-b border-[#F0ECE5] ${record.teamId === activeRecord?.teamId ? "bg-rose-50" : ""}`}><td className="py-2 pr-3 font-mono">{index + 1}</td><td className="py-2 font-semibold">{record.team.name}</td><td className="py-2 text-right font-mono font-bold">{score.toFixed(1)}</td><td className="py-2 text-right font-mono">{(score - industryTotal >= 0 ? "+" : "")}{(score - industryTotal).toFixed(1)}</td><td className="py-2 text-right font-mono text-emerald-700">{(score - bestTotal >= 0 ? "=" : "-")}{Math.abs(score - bestTotal).toFixed(1)}</td></tr>; })}</tbody></table></div>
    {saveError && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800"><TrendingUp className="h-4 w-4" />{saveError}</div>}
    <div className="flex items-center gap-2 text-[10px] text-[#5A5C60]"><Save className="h-3.5 w-3.5" />Quarter Q{selectedQuarter} snapshot stores team scores and dimension details in <strong>balanced_scorecard</strong>.</div>
  </section>;
}
