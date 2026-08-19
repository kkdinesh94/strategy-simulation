import React from "react";
import { TeamState, GameState } from "../types/simulation";
import { proFormaCalc, bankLimit, ltLimit, equityOf, debtOf } from "../engine/simulationEngine";
import { AlertTriangle, CheckCircle2, XCircle, Info, ShieldCheck, DollarSign, Wrench, Factory, TrendingUp } from "lucide-react";

interface DecisionAuditorProps {
  team: TeamState;
  gameState: GameState;
  onClose?: () => void;
}

export interface AuditRuleResult {
  id: string;
  title: string;
  category: "Finance" | "Operations" | "Marketing" | "Strategy";
  severity: "block" | "warn" | "pass";
  message: string;
  actionHint?: string;
}

export function runDecisionAudit(team: TeamState, gameState: GameState): AuditRuleResult[] {
  const results: AuditRuleResult[] = [];
  const pf = proFormaCalc(gameState, team);
  const q = gameState.quarter;

  // Rule 1: Cash Adequacy / Solvency
  const endingCash = pf.close;
  if (endingCash < 0) {
    results.push({
      id: "cash_adequacy",
      title: "Negative Ending Cash Balance",
      category: "Finance",
      severity: "block",
      message: `Projected ending cash is -Rs. ${Math.abs(endingCash).toFixed(1)} Lakhs. Solvency breached! High-cost shark debt (15%/qtr) will trigger automatically.`,
      actionHint: "Issue LT debt, reduce capex/ad spend, or raise prices to ensure positive liquidity."
    });
  } else if (endingCash < 50) {
    results.push({
      id: "cash_adequacy",
      title: "Low Cash Runway Buffer",
      category: "Finance",
      severity: "warn",
      message: `Projected cash balance is Rs. ${endingCash.toFixed(1)} Lakhs. A small demand shortfall could cause negative cash.`,
      actionHint: "Consider holding at least Rs. 100 Lakhs cash buffer."
    });
  } else {
    results.push({
      id: "cash_adequacy",
      title: "Cash Balance & Liquidity",
      category: "Finance",
      severity: "pass",
      message: `Projected ending cash is healthy at Rs. ${endingCash.toFixed(1)} Lakhs.`
    });
  }

  // Rule 2: Plant Operating Capacity vs Scheduled Production
  const totalProdUnits = Object.values(team.dec.prod).reduce((a, b) => a + (+b || 0), 0);
  const maxCap = team.capacity + (+team.dec.expBlocks || 0) * 500;
  if (totalProdUnits > maxCap) {
    results.push({
      id: "capacity_exceeded",
      title: "Production Exceeds Installed Plant Capacity",
      category: "Operations",
      severity: "block",
      message: `Scheduled production (${totalProdUnits.toLocaleString()} units) exceeds max available capacity (${maxCap.toLocaleString()} units).`,
      actionHint: "Expand plant blocks or lower production targets."
    });
  } else if (totalProdUnits === 0 && q >= 2) {
    results.push({
      id: "zero_production",
      title: "Zero Production Scheduled",
      category: "Operations",
      severity: "warn",
      message: "You have zero units scheduled for production this quarter.",
      actionHint: "Set production quantities for your active models in Operations."
    });
  } else {
    const util = maxCap > 0 ? (totalProdUnits / maxCap) * 100 : 0;
    results.push({
      id: "capacity_utilization",
      title: "Plant Capacity Allocation",
      category: "Operations",
      severity: "pass",
      message: `Plant capacity utilization is at ${util.toFixed(1)}% (${totalProdUnits.toLocaleString()} / ${maxCap.toLocaleString()} units).`
    });
  }

  // Rule 3: Model Pricing & BOM Unit Margins
  for (const m of team.models) {
    if (m.price <= 0) {
      results.push({
        id: `price_zero_${m.id}`,
        title: `Zero Price for ${m.name}`,
        category: "Marketing",
        severity: "block",
        message: `Model '${m.name}' has no retail selling price assigned.`,
        actionHint: "Set a valid retail price in Product Design or Sales tabs."
      });
    } else if (m.price < 40000) {
      results.push({
        id: `price_low_${m.id}`,
        title: `Unusually Low Price for ${m.name}`,
        category: "Marketing",
        severity: "warn",
        message: `'${m.name}' retail price (Rs. ${m.price.toLocaleString()}) is below industry minimum threshold.`,
        actionHint: "Verify price positioning against segment expectation."
      });
    }
  }

  // Rule 4: Sales Force & Channel Expansion Limits
  const newCentres = +team.dec.newCentres || 0;
  if (newCentres > 3 && q <= 4) {
    results.push({
      id: "centre_expansion_cap",
      title: "Rapid Channel Expansion Cap",
      category: "Operations",
      severity: "warn",
      message: `Opening ${newCentres} new sales hubs in early quarters may strain managerial bandwidth and cash flow.`,
      actionHint: "Pace channel expansion to 1-2 centers per quarter."
    });
  }

  // Rule 5: Debt Capacity vs Debt Issuance
  const newLtDebt = +team.dec.ltIssue || 0;
  const maxLt = ltLimit(team);
  if (newLtDebt > maxLt) {
    results.push({
      id: "debt_limit_exceeded",
      title: "Long-Term Debt Issue Exceeds Debt Capacity",
      category: "Finance",
      severity: "block",
      message: `Requested LT debt (Rs. ${newLtDebt} L) exceeds maximum allowable debt limit (Rs. ${maxLt.toFixed(1)} L) based on leverage ratios.`,
      actionHint: "Reduce long-term bond issuance to within maximum borrowing capacity."
    });
  }

  // Rule 6: Target Segment Consistency
  if (!team.prim || !team.sec) {
    results.push({
      id: "charter_segments",
      title: "Target Market Segments Unassigned",
      category: "Strategy",
      severity: "block",
      message: "Primary or Secondary target market segments have not been defined in Executive Charter.",
      actionHint: "Select target segments in Charter tab before submitting decisions."
    });
  }

  return results;
}

export const DecisionAuditor: React.FC<DecisionAuditorProps> = ({ team, gameState, onClose }) => {
  const auditResults = runDecisionAudit(team, gameState);
  const blocks = auditResults.filter((r) => r.severity === "block");
  const warns = auditResults.filter((r) => r.severity === "warn");
  const passes = auditResults.filter((r) => r.severity === "pass");

  return (
    <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-md p-5 space-y-4 text-[#1F2022]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E0DCD3] pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-[#1F2022] text-base">
              Executive Decision Auditor & Constraint Checker
            </h3>
            <p className="text-xs text-[#5A5C60]">
              Automated in-game auditor validating financial solvency, capacity constraints, and operational bounds.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {blocks.length > 0 ? (
            <span className="px-2.5 py-1 text-xs font-bold font-mono bg-red-100 text-red-800 rounded-md border border-red-300 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {blocks.length} Blocking Error{blocks.length > 1 ? "s" : ""}
            </span>
          ) : warns.length > 0 ? (
            <span className="px-2.5 py-1 text-xs font-bold font-mono bg-amber-100 text-amber-800 rounded-md border border-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {warns.length} Warning{warns.length > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-bold font-mono bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All Checks Passed
            </span>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
          <div className="text-[10px] uppercase font-mono font-bold text-red-600">Blocking Rules</div>
          <div className="text-lg font-bold font-mono text-red-700">{blocks.length}</div>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="text-[10px] uppercase font-mono font-bold text-amber-600">Warnings</div>
          <div className="text-lg font-bold font-mono text-amber-700">{warns.length}</div>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="text-[10px] uppercase font-mono font-bold text-emerald-600">Passed Checks</div>
          <div className="text-lg font-bold font-mono text-emerald-700">{passes.length}</div>
        </div>
      </div>

      {/* Detailed Rules List */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {auditResults.map((r) => (
          <div
            key={r.id}
            className={`p-3 rounded-lg border text-xs transition space-y-1 ${
              r.severity === "block"
                ? "bg-red-50 border-red-200 text-[#1F2022]"
                : r.severity === "warn"
                ? "bg-amber-50 border-amber-200 text-[#1F2022]"
                : "bg-[#FAF8F5] border-[#E0DCD3] text-[#1F2022]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                {r.severity === "block" ? (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                ) : r.severity === "warn" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{r.title}</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-white rounded border border-[#E0DCD3] text-[#5A5C60] font-semibold">
                {r.category}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#5A5C60] pl-6">
              {r.message}
            </p>
            {r.actionHint && (
              <div className="pl-6 pt-1 text-[11px] font-medium text-blue-700 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" /> <span>Recommendation: {r.actionHint}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
