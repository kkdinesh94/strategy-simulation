import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, ClipboardList, RefreshCw } from "lucide-react";
import { executeD1Query } from "../lib/cloudflareD1";

export const QUARTER_ITEMS = {
  1: [
    ["Register team, company name and mission", "charter", "decisions"],
    ["Purchase market survey", "charter", "decisions"]
  ],
  2: [
    ["Review MOA", "charter", "decisions"],
    ["Select target segments", "marketing", "decisions"],
    ["Design initial EV models", "product", "decisions"],
    ["Select test cities", "sales", "decisions"],
    ["Choose facility location", "operations", "facility"],
    ["Invest in initial fixed capacity", "finance", "decisions"]
  ],
  3: [
    ["Set HR compensation", "hr", "hr"],
    ["Hire sales staff", "sales", "sales"],
    ["Set brand prices", "marketing", "brands"],
    ["Place ads", "marketing", "ads"],
    ["Run production simulation", "operations", "schedule"],
    ["Set production schedule", "operations", "schedule"]
  ],
  4: [
    ["Evaluate fast test results", "performance", "fastTests"],
    ["Evaluate competitive benchmark", "performance", "benchmark"],
    ["Revise brand designs", "product", "decisions"],
    ["Revise prices", "marketing", "brands"],
    ["Revise ad copy", "marketing", "ads"],
    ["Create quality improvement plan", "operations", "quality"]
  ],
  5: [
    ["Prepare business plan", "strategy", "strategy"],
    ["Negotiate VC funding", "finance", "financing"],
    ["Expand market", "sales", "decisions"],
    ["Invest in R&D", "rnd", "decisions"]
  ],
  continuous: [
    ["Monitor performance", "performance", "scorecard"],
    ["Improve products and operations", "operations", "decisions"],
    ["Execute the continuous improvement loop", "strategy", "strategy"]
  ],
  final: [["Board report: performance, market position and valuation", "performance", "scorecard"]]
};

const RECORD_QUERIES = {
  decisions: (universeId, teamId, quarter) => ["SELECT 1 AS present FROM team_decisions WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [universeId, teamId, quarter]],
  strategy: (universeId, teamId, quarter) => ["SELECT 1 AS present FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [universeId, teamId, quarter]],
  hr: (universeId, teamId, quarter) => ["SELECT 1 AS present FROM hr_decisions WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [universeId, teamId, quarter]],
  schedule: (universeId, teamId, quarter) => ["SELECT 1 AS present FROM production_schedules WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [universeId, teamId, quarter]],
  fastTests: (_universeId, teamId, quarter) => ["SELECT 1 AS present FROM fast_test_results WHERE team_id = ? AND quarter = ? LIMIT 1", [teamId, quarter]],
  benchmark: (universeId, teamId, quarter) => ["SELECT 1 AS present FROM competitive_benchmark_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? LIMIT 1", [universeId, teamId, quarter]],
  facility: (_universeId, teamId) => ["SELECT 1 AS present FROM production_facilities WHERE team_id = ? LIMIT 1", [teamId]],
  sales: (_universeId, teamId, quarter) => ["SELECT 1 AS present FROM sales_force WHERE team_id = ? AND quarter = ? LIMIT 1", [teamId, quarter]],
  brands: (universeId, teamId, quarter) => ["SELECT 1 AS present FROM brands WHERE universe_id = ? AND team_id = ? AND quarter = ? LIMIT 1", [universeId, teamId, quarter]],
  ads: (universeId, teamId, quarter) => ["SELECT 1 AS present FROM ad_campaigns WHERE universe_id = ? AND team_id = ? AND quarter = ? LIMIT 1", [universeId, teamId, quarter]],
  financing: (_universeId, teamId, quarter) => ["SELECT 1 AS present FROM financing_decisions WHERE team_id = ? AND quarter = ? LIMIT 1", [teamId, quarter]],
  quality: (_universeId, teamId) => ["SELECT 1 AS present FROM quality_components WHERE team_id = ? LIMIT 1", [teamId]],
  scorecard: (universeId, teamId, quarter) => ["SELECT 1 AS present FROM balanced_scorecard WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [universeId, teamId, quarter]]
};

export function quarterItems(quarter) {
  if (quarter >= 9) return QUARTER_ITEMS.final;
  if (quarter >= 6) return QUARTER_ITEMS.continuous;
  return QUARTER_ITEMS[quarter] || QUARTER_ITEMS[5];
}

export default function QuarterChecklist({ universeId, teamId, quarter = 1, onNavigate }) {
  const [isOpen, setIsOpen] = useState(true);
  const [completed, setCompleted] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const items = useMemo(() => quarterItems(Number(quarter)), [quarter]);

  const loadCompletion = async () => {
    if (!universeId || teamId === undefined || teamId === null) return;
    setIsLoading(true);
    const keys = [...new Set(items.map((item) => item[2]))];
    const results = await Promise.all(keys.map(async (key) => {
      const query = RECORD_QUERIES[key];
      if (!query) return [key, false];
      const [sql, params] = query(universeId, teamId, quarter);
      const response = await executeD1Query(sql, params);
      return [key, Boolean(response.success && (response.results || response.rows || []).length)];
    }));
    setCompleted(Object.fromEntries(results));
    setIsLoading(false);
  };

  useEffect(() => { loadCompletion(); }, [universeId, teamId, quarter, items]);

  const completeCount = items.filter((item) => completed[item[2]]).length;
  const title = quarter >= 9 ? "Final board report" : quarter >= 6 ? "Continuous improvement" : `Quarter ${quarter} priorities`;

  return (
    <aside className="w-full min-w-0 shrink-0 lg:sticky lg:top-4 lg:self-start">
      <div className="overflow-hidden rounded-xl border border-[#E5E1D8] bg-white shadow-sm">
        <button type="button" onClick={() => setIsOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 border-b border-[#E5E1D8] bg-[#1F2022] px-4 py-3 text-left text-white">
          <span className="flex min-w-0 items-center gap-2"><ClipboardList className="h-4 w-4 shrink-0 text-amber-300" /><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Q{quarter}</span><span className="block truncate text-sm font-semibold">{title}</span></span></span>
          {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        </button>
        {isOpen && <div className="p-3">
          <div className="mb-3 flex items-center justify-between text-[11px] text-[#77797D]"><span>{completeCount} of {items.length} complete</span><button type="button" onClick={loadCompletion} disabled={isLoading} title="Refresh checklist" aria-label="Refresh checklist" className="rounded p-1 hover:bg-[#F3F0EA] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /></button></div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#EEEAE2]"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${items.length ? (completeCount / items.length) * 100 : 0}%` }} /></div>
          <ul className="space-y-1">
            {items.map(([label, tab, source]) => { const done = completed[source]; return <li key={label}><button type="button" onClick={() => onNavigate(tab)} className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs leading-4 text-[#4A4C50] transition hover:bg-[#F7F5F0] hover:text-[#1F2022]"><span className="mt-0.5 shrink-0">{done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-[#B8B5AE]" />}</span><span className={done ? "text-[#8A8C8F] line-through" : ""}>{label}</span></button></li>; })}
          </ul>
        </div>}
      </div>
    </aside>
  );
}
