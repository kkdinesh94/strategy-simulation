import React from "react";
import { AlertTriangle, Banknote, Landmark, PiggyBank, TrendingUp } from "lucide-react";
import { equityOf, bankLimit } from "../engine/simulationEngine";

const DEFAULT_BANK_RATE = 0.03;
const CD_RATE = 0.02;

export function FinancingPanel({ team, gameState, onChange, isLocked = false }) {
  const interestRate = Number(team.dec.interestRate ?? DEFAULT_BANK_RATE);
  const loanBalance = Number(team.debt.bank || 0);
  const maxLoan = Math.max(0, bankLimit(team));
  const requestedBalance = Number(team.dec.bankTarget ?? loanBalance);
  const cdInvestment = Math.max(0, Number(team.dec.cdInvestment || 0));
  const vc = team.dec.vc || { ask: 0, equity: 0, sharesOffered: 0, sharePrice: 0 };
  const netEquity = equityOf(team);

  const updateDecision = (changes) => onChange({ ...team, dec: { ...team.dec, ...changes } });
  const updateLoanBalance = (value) => {
    const balance = Math.max(0, Math.min(maxLoan, Math.round(Number(value) || 0)));
    updateDecision({
      bankTarget: balance,
      bankLoanDrawn: Math.max(0, balance - loanBalance),
      bankLoanRepaid: Math.max(0, loanBalance - balance)
    });
  };
  const updateVc = (field, value) => updateDecision({ vc: { ...vc, [field]: Math.max(0, Number(value) || 0) } });

  return (
    <section className="space-y-5 bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#E0DCD3] pb-3">
        <Banknote className="w-5 h-5 text-emerald-700" />
        <div>
          <h3 className="text-lg font-bold text-[#1F2022]">Financing Desk</h3>
          <p className="text-xs text-[#5A5C60]">Set treasury funding for Quarter {gameState.quarter}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <Metric label="Current Cash" value={`Rs. ${Number(team.cash || 0).toFixed(1)} L`} tone={team.cash < 0 ? "text-red-600" : "text-emerald-700"} />
        <Metric label="Bank Loan Balance" value={`Rs. ${loanBalance.toFixed(1)} L`} tone="text-amber-700" />
        <Metric label="Net Equity" value={`Rs. ${netEquity.toFixed(1)} L`} tone={netEquity < 0 ? "text-red-600" : "text-blue-700"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-4 bg-[#FAF8F5] rounded-lg border border-[#E0DCD3] space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm"><Landmark className="w-4 h-4 text-emerald-700" /> Bank loan</div>
          <label className="block text-xs text-[#5A5C60]">Target loan balance (Rs. L)</label>
          <input type="number" min="0" max={maxLoan} step="25" disabled={isLocked} value={requestedBalance} onChange={(event) => updateLoanBalance(event.target.value)} className="w-full p-2 border border-[#D7D2C8] rounded bg-white font-mono" />
          <label className="block text-xs text-[#5A5C60]">Quarterly interest rate</label>
          <input type="number" min="0" max="25" step="0.1" disabled={isLocked} value={(interestRate * 100).toFixed(1)} onChange={(event) => updateDecision({ interestRate: Math.max(0, Math.min(0.25, Number(event.target.value) / 100)) })} className="w-full p-2 border border-[#D7D2C8] rounded bg-white font-mono" />
          <div className="text-[11px] text-[#5A5C60]">Draw: Rs. {Math.max(0, requestedBalance - loanBalance).toFixed(1)} L | Repay: Rs. {Math.max(0, loanBalance - requestedBalance).toFixed(1)} L</div>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-900"><PiggyBank className="w-4 h-4" /> 3-month CD</div>
          <p className="text-xs text-emerald-900/70">Invest idle cash for one quarter at a fixed {(CD_RATE * 100).toFixed(1)}% return.</p>
          <label className="block text-xs text-emerald-900/70">Amount invested (Rs. L)</label>
          <input type="number" min="0" max={Math.max(0, team.cash)} step="25" disabled={isLocked || team.cash <= 0} value={cdInvestment} onChange={(event) => updateDecision({ cdInvestment: Math.max(0, Math.min(Math.max(0, team.cash), Number(event.target.value) || 0)) })} className="w-full p-2 border border-emerald-200 rounded bg-white font-mono" />
          <div className="text-xs font-mono text-emerald-800">Maturity: Rs. {(cdInvestment * (1 + CD_RATE)).toFixed(1)} L</div>
        </div>
      </div>

      {gameState.quarter >= 5 && <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-purple-900"><TrendingUp className="w-4 h-4" /> VC business plan funding</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NumberField label="Funding request (Rs. L)" value={vc.ask} disabled={isLocked} onChange={(value) => updateVc("ask", value)} />
          <NumberField label="Shares offered (L)" value={vc.sharesOffered || 0} disabled={isLocked} onChange={(value) => updateVc("sharesOffered", value)} />
          <NumberField label="Share price (Rs.)" value={vc.sharePrice || 0} disabled={isLocked} onChange={(value) => updateVc("sharePrice", value)} />
        </div>
      </div>}

      {team.cash < 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />Emergency loan will cover the quarter-end deficit at penalty interest and deduct Balanced Scorecard performance.</div>}
      {netEquity < 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">Bankruptcy condition: common stock plus retained earnings cannot be negative.</div>}
    </section>
  );
}

function Metric({ label, value, tone }) {
  return <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E0DCD3]"><div className="text-[10px] uppercase text-[#5A5C60]">{label}</div><div className={`text-lg font-bold mt-1 ${tone}`}>{value}</div></div>;
}

function NumberField({ label, value, disabled, onChange }) {
  return <label className="text-xs text-purple-900/70">{label}<input type="number" min="0" step="0.5" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full p-2 border border-purple-200 rounded bg-white font-mono text-purple-950" /></label>;
}