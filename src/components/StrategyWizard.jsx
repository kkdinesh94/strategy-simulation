import React, { useEffect, useState } from "react";
import { ArrowRight, Target } from "lucide-react";
import CompanySetupTab from "./tabs/CompanySetupTab";

const OBJECTIVES = ["Market Presence", "Profit", "Cash", "Shareholder Value"];
const EMPTY_PLAN = {
  culture: [],
  problemStatement: "",
  objectives: OBJECTIVES,
  advantage: "Differentiation",
  focus: "Broad",
  priorities: { Marketing: 20, Sales: 20, Manufacturing: 20, "R&D": 20, "Human Resources": 20 },
  kpis: { marketShare: "", netIncome: "", endingCash: "", netEquity: "" }
};

function normalizePlan(value) {
  return {
    ...EMPTY_PLAN,
    ...value,
    culture: Array.isArray(value?.culture) ? value.culture : [],
    objectives: Array.isArray(value?.objectives) && value.objectives.length === 4 ? value.objectives : OBJECTIVES,
    priorities: { ...EMPTY_PLAN.priorities, ...(value?.priorities || {}) },
    kpis: { ...EMPTY_PLAN.kpis, ...(value?.kpis || {}) }
  };
}

// Deprecated: superseded by CompanySetupTab, which merges this wizard with CharterTab.
export default function StrategyWizard(props) {
  return <CompanySetupTab {...props} initialStep={4} />;
}

export function StrategySummary({ universeId, teamId, quarter, onOpen }) {
  const [plan, setPlan] = useState(null);
  useEffect(() => {
    fetch(`/api/strategy-plans?universeId=${encodeURIComponent(universeId)}&teamId=${encodeURIComponent(teamId)}&quarter=${quarter}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setPlan(data?.plan ? normalizePlan(data.plan) : null))
      .catch(() => setPlan(null));
  }, [universeId, teamId, quarter]);
  return <div className="strategy-summary">
    <div className="strategy-summary-mark"><Target size={18} /></div>
    <div className="strategy-summary-copy"><span className="strategy-eyebrow">Q{quarter} STRATEGY SUMMARY</span><h2>{plan?.mission || "Your strategic north star is waiting."}</h2><p>{plan ? `${plan.advantage} · ${plan.focus} focus · Priority: ${plan.objectives[0]}` : "Align mission, choices, resources, and measurable goals in one shared plan."}</p></div>
    <button type="button" className="strategy-summary-action" onClick={onOpen}>{plan ? "Review plan" : "Start planning"}<ArrowRight size={16} /></button>
  </div>;
}