import React, { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { Award, Lock } from "lucide-react";
import { BSC_DIMENSIONS as DIMENSIONS, bscRawMetrics, bscRelativeScores, bscWeightedTotal as weightedTotal } from "../lib/scorecard";

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const latestResult = (team, quarter) => [...(team?.hist || [])].filter((result) => number(result.q) <= quarter).sort((a, b) => number(b.q) - number(a.q))[0] || {};
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

/**
 * Scores come from the quarter's official results (computed on the server when the quarter ran).
 * Older saves without stored dimension scores are scored with the same shared formula.
 */
function scoresFor(records) {
  const stored = records.every((record) => record.result?.bsc?.parts && DIMENSIONS.every((d) => d.key in record.result.bsc.parts));
  if (stored) return Object.fromEntries(records.map((record) => [record.teamId, record.result.bsc.parts]));
  return bscRelativeScores(Object.fromEntries(records.map((record) => [record.teamId, record.raw])));
}

export default function BalancedScorecard({ team, gameState, quarter }) {
  const teams = Array.isArray(gameState?.teams) ? gameState.teams : [team];
  const selectedQuarter = number(quarter, number(gameState?.quarter, team?.hist?.at(-1)?.q || 1));
  const visible = selectedQuarter >= 4;

  const records = useMemo(() => teams.map((entry) => {
    const result = latestResult(entry, selectedQuarter);
    const prior = latestResult(entry, selectedQuarter - 1);
    return { teamId: String(entry.i), team: entry, result, raw: bscRawMetrics(entry, result, prior) };
  }), [teams, selectedQuarter]);

  const scoreMap = useMemo(() => scoresFor(records), [records]);
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

  if (!visible) return <section className="rounded-2xl border border-[#E5E1D8] bg-white p-8 text-center shadow-sm"><Lock className="mx-auto mb-3 h-7 w-7 text-slate-500" /><h3 className="text-lg font-bold">Balanced Scorecard locked until Q4</h3><p className="mt-2 text-xs text-[#5A5C60]">Comparative performance results become visible after the third completed quarter.</p></section>;

  return <section className="space-y-6 rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1D8] pb-5"><div><div className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /><h2 className="text-xl font-bold">Balanced Scorecard</h2></div><p className="mt-1 max-w-2xl text-xs text-[#5A5C60]">ASCM-inspired EV operating view. Weighted score across ten dimensions. Each dimension is scored 0–100 against the other teams in your cohort.</p></div><div className="text-[11px] text-[#5A5C60]">Quarter {selectedQuarter} results</div></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-[#1F2022] p-4 text-white"><div className="text-[10px] uppercase text-slate-300">{activeRecord?.team?.name || "Team"} overall</div><div className="mt-1 text-3xl font-bold">{activeTotal.toFixed(1)}<span className="text-sm font-normal text-slate-400"> / 100</span></div></div><div className="rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] p-4"><div className="text-[10px] uppercase text-[#5A5C60]">Industry average</div><div className="mt-1 text-2xl font-bold">{industryTotal.toFixed(1)}</div></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-[10px] uppercase text-emerald-800">Best competitor</div><div className="mt-1 text-2xl font-bold text-emerald-800">{bestTotal.toFixed(1)}</div></div></div>
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(280px,420px)_1fr]"><div className="h-[330px] min-w-0"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%"><PolarGrid stroke="#D9D4CA" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "#5A5C60" }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} /><Radar name="Team" dataKey="score" stroke="#D9485F" fill="#D9485F" fillOpacity={0.28} /><Radar name="Industry average" dataKey="industry" stroke="#64748B" fill="#64748B" fillOpacity={0.08} /><Tooltip formatter={(value, name) => [`${Number(value).toFixed(0)} / 100`, name]} /></RadarChart></ResponsiveContainer></div><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="border-b border-[#E5E1D8] text-left text-[10px] uppercase text-[#5A5C60]"><th className="py-2 pr-3">Dimension</th><th className="py-2 text-right">Weight</th><th className="py-2 text-right">Team</th><th className="py-2 text-right">Industry avg.</th><th className="py-2 text-right">Best</th></tr></thead><tbody>{DIMENSIONS.map((dimension) => { const value = number(activeScores[dimension.key]); const industry = average(records.map((record) => scoreMap[record.teamId]?.[dimension.key] || 0)); const best = Math.max(...records.map((record) => scoreMap[record.teamId]?.[dimension.key] || 0), 0); return <tr key={dimension.key} className="border-b border-[#F0ECE5]"><td className="py-2 pr-3 font-semibold">{dimension.label}</td><td className="py-2 text-right font-mono text-[#5A5C60]">{dimension.weight}%</td><td className="py-2 text-right font-mono font-bold text-rose-700">{value.toFixed(0)}</td><td className="py-2 text-right font-mono">{industry.toFixed(0)}</td><td className="py-2 text-right font-mono text-emerald-700">{best.toFixed(0)}</td></tr>; })}</tbody></table></div></div>
    <div className="overflow-x-auto"><h3 className="mb-2 text-sm font-bold">League overall scores</h3><table className="min-w-full text-xs"><thead><tr className="border-b border-[#E5E1D8] text-left text-[10px] uppercase text-[#5A5C60]"><th className="py-2 pr-3">Rank</th><th className="py-2">Team</th><th className="py-2 text-right">Overall score</th><th className="py-2 text-right">vs. industry avg.</th><th className="py-2 text-right">vs. best</th></tr></thead><tbody>{records.slice().sort((first, second) => weightedTotal(scoreMap[second.teamId] || {}) - weightedTotal(scoreMap[first.teamId] || {})).map((record, index) => { const score = weightedTotal(scoreMap[record.teamId] || {}); return <tr key={record.teamId} className={`border-b border-[#F0ECE5] ${record.teamId === activeRecord?.teamId ? "bg-rose-50" : ""}`}><td className="py-2 pr-3 font-mono">{index + 1}</td><td className="py-2 font-semibold">{record.team.name}</td><td className="py-2 text-right font-mono font-bold">{score.toFixed(1)}</td><td className="py-2 text-right font-mono">{(score - industryTotal >= 0 ? "+" : "")}{(score - industryTotal).toFixed(1)}</td><td className="py-2 text-right font-mono text-emerald-700">{(score - bestTotal >= 0 ? "=" : "-")}{Math.abs(score - bestTotal).toFixed(1)}</td></tr>; })}</tbody></table></div>
  </section>;
}
