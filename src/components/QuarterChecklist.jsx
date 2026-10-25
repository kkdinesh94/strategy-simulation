import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, ClipboardList, RefreshCw } from "lucide-react";
import { teamData } from "../lib/apiClient";

export const QUARTER_ITEMS = {
  1: [
    ["Register team, company name and mission", "charter", "strategy"],
    ["Purchase Market Opportunity Analysis (top of Marketing tab)", "marketing", "marketSurvey"]
  ],
  2: [
    ["Review MOA", "charter", "marketSurveyAny"],
    ["Select target segments", "marketing", "segments"],
    ["Design initial EV models", "product", "models"],
    ["Select test cities", "sales", "cities"],
    ["Choose facility location", "operations", "facility"],
    ["Invest in initial fixed capacity", "finance", "capacity"]
  ],
  3: [
    ["Set HR compensation", "hr", "hr"],
    ["Hire sales staff", "sales", "hire"],
    ["Set brand prices", "marketing", "pricing"],
    ["Place ads", "marketing", "ads"],
    ["Run production simulation", "operations", "schedule"],
    ["Set production schedule", "operations", "schedule"]
  ],
  4: [
    ["Evaluate fast test results", "performance", "fastTests"],
    ["Evaluate competitive benchmark", "performance", "benchmark"],
    ["Revise brand designs", "product", "pricing"],
    ["Revise prices", "marketing", "pricing"],
    ["Revise ad copy", "marketing", "ads"],
    ["Create quality improvement plan", "operations", "quality"]
  ],
  5: [
    ["Prepare business plan", "strategy", "strategy"],
    ["Negotiate VC funding", "finance", "financing"],
    ["Expand market", "sales", "newCities"],
    ["Invest in R&D", "rnd", "rnd"]
  ],
  continuous: [
    ["Monitor performance", "performance", "scorecard"],
    ["Improve products and operations", "operations", "pricing"],
    ["Execute the continuous improvement loop", "strategy", "strategy"]
  ],
  final: [["Board report: performance, market position and valuation", "performance", "scorecard"]]
};

// Completion of these items is recorded server-side; see server/api/teamData.ts for the queries.
const RECORD_KEYS = new Set(["strategy", "schedule", "fastTests", "benchmark", "scorecard", "marketSurvey", "marketSurveyAny"]);

// These decisions live only on the in-memory team state (team.dec / team.qualityComponents),
// never in D1, so completion is checked locally instead of against a nonexistent table.
const LOCAL_CHECKS = {
  segments: (team) => Boolean(team?.prim),
  models: (team) => Boolean(team?.models?.length && team.models.every((m) => m.name && m.price > 0)),
  cities: (team) => Boolean((team?.storeCities?.length || 0) + (team?.dec?.newCentreCities?.length || 0)),
  newCities: (team) => Boolean(team?.dec?.newCentreCities?.length),
  capacity: (team) => Boolean((team?.dec?.expBlocks || 0) > 0 || (team?.hist || []).some((r) => r.capAdd > 0)),
  hire: (team) => Boolean((team?.dec?.hire || 0) > 0),
  ads: (team) => Boolean((team?.dec?.ad || 0) > 0 && team?.dec?.claims?.length),
  rnd: (team) => Boolean(team?.dec?.rndStarts?.length || (team?.rnd || []).length),
  facility: (team) => Boolean(team?.dec?.facilityLocation),
  financing: (team) => Boolean(team?.dec?.vc?.ask > 0 || (team?.dec?.bankTarget || 0) !== (team?.debt?.bank || 0) || team?.dec?.cdInvestment > 0),
  quality: (team) => Boolean(team?.qualityComponents?.length),
  hr: (team) => Boolean(team?.hrCompensation?.sales || team?.hrCompensation?.production),
  // Brand prices live on team.models[].price and are never written to the (unused) `brands`
  // D1 table. Locking the quarter is the real signal that current prices passed the
  // auditor's price-sanity checks (floor/ceiling, minimum margin over unit cost).
  pricing: (team) => Boolean(team?.dec?.locked)
};

export function quarterItems(quarter) {
  if (quarter >= 9) return QUARTER_ITEMS.final;
  if (quarter >= 6) return QUARTER_ITEMS.continuous;
  return QUARTER_ITEMS[quarter] || QUARTER_ITEMS[5];
}

export default function QuarterChecklist({ universeId, teamId, quarter = 1, onNavigate, team }) {
  const [isOpen, setIsOpen] = useState(true);
  const [completed, setCompleted] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const items = useMemo(() => quarterItems(Number(quarter)), [quarter]);

  const loadCompletion = async () => {
    if (!universeId || teamId === undefined || teamId === null) return;
    setIsLoading(true);
    const keys = [...new Set(items.map((item) => item[2]))];
    const results = await Promise.all(keys.map(async (key) => {
      const localCheck = LOCAL_CHECKS[key];
      if (localCheck) return [key, localCheck(team)];
      if (!RECORD_KEYS.has(key)) return [key, false];
      const response = await teamData(`checklist:${key}`, { universeId, teamId, quarter });
      return [key, Boolean(response.success && response.results.length)];
    }));
    setCompleted(Object.fromEntries(results));
    setIsLoading(false);
  };

  useEffect(() => { loadCompletion(); }, [universeId, teamId, quarter, items, team]);

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
