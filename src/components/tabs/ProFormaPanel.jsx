import React, { useEffect, useState } from "react";
import { AlertTriangle, Play, Save } from "lucide-react";
import { proFormaCalc, unitCost } from "../../engine/simulationEngine";
import { CENTRE, CAP_BLOCK, HR } from "../../engine/catalog";
import { saveProFormaStatement } from "../../lib/cloudflareD1";

const money = (value) => `Rs. ${Number(value || 0).toFixed(1)} L`;
const MINIMUM_CASH_LAKH = 3;

export function ProFormaPanel({ team, gameState, universeId, onNotify, compact = false, decisionRevision = 0 }) {
  const [activeTab, setActiveTab] = useState("cash");
  const [productionRun, setProductionRun] = useState(false);
  const [saving, setSaving] = useState(false);

  const calculateStatement = () => {
    const pf = proFormaCalc(gameState, team);
    const forecastedUnits = team.models.reduce((total, model) => total + (Number(team.dec.prod[model.id]) || 0), 0);
    const revenue = team.models.reduce((total, model) => total + ((Number(team.dec.prod[model.id]) || 0) * Number(model.price || 0)) / 100000, 0);
    const productionCosts = productionRun ? pf.materials : 0;
    const salesForceSalaries = (team.staff + (Number(team.dec.hire) || 0)) * HR.salesCost * (team.hr.sales / 100);
    const officeLeases = 50 + 0.02 * team.capacity;
    const research = (team.dec.buyIntel ? 15 : 0) + (team.dec.buyClinic ? 10 : 0);
    const changeover = Number(team.dec.changeoverInvestment) || 0;
    const rnd = (Number(team.dec.devCost) || 0) + (Number(team.dec.rndStartCost) || 0);
    const outflows = { productionCosts, advertising: Number(team.dec.ad) || 0, salesForceSalaries, officeLeases, rnd, quality: Number(team.dec.quality) || 0, changeover, research };
    const totalOutflows = Object.values(outflows).reduce((sum, value) => sum + value, 0);
    const inflows = { revenue, equityIssued: Number(team.dec.shareIssue) || 0, debtDrawn: (Number(team.dec.bankTarget) || 0) + (Number(team.dec.ltIssue) || 0) };
    const totalInflows = Object.values(inflows).reduce((sum, value) => sum + value, 0);
    const lastActual = [...(team.hist || [])].sort((a, b) => Number(b.q || 0) - Number(a.q || 0))[0];
    const openingCash = Number(lastActual?.cash ?? team.cash ?? 0);
    const endingCash = openingCash + totalInflows - totalOutflows;
    const grossMargin = revenue - productionCosts;
    const operatingExpenses = totalOutflows - productionCosts;
    const netIncome = grossMargin - operatingExpenses;
    const inventory = team.models.reduce((total, model) => total + (Number(model.inv) || 0) * unitCost(model) / 100000, 0);
    const fixedAssets = Number(team.ppe || 0) + (Number(team.dec.expBlocks) || 0) * CAP_BLOCK.cost + (Number(team.dec.newCentres) || 0) * CENTRE.open;
    const loans = (Number(team.debt.bank) || 0) + (Number(team.debt.lt) || 0) + (Number(team.debt.shark) || 0) + inflows.debtDrawn;
    const commonStock = (Number(team.paidIn) || 0) + inflows.equityIssued;
    const retainedEarnings = (Number(team.cumProfit) || 0) + netIncome;
    return { quarter: gameState.quarter, forecastedUnits, inflows, outflows, totalInflows, totalOutflows, endingCash, revenue, cogs: productionCosts, grossMargin, operatingExpenses, netIncome, openingCash, lastActual, assets: { cash: endingCash, inventory, fixedAssets }, liabilities: { loans }, equity: { commonStock, retainedEarnings } };
  };

  const [statement, setStatement] = useState(() => calculateStatement());
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setIsCalculating(true);
    const timer = window.setTimeout(() => {
      setStatement(calculateStatement());
      setIsCalculating(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [gameState, team, productionRun, decisionRevision]);

  const runSimulation = async () => {
    setProductionRun(true);
    setSaving(true);
    const productionCosts = proFormaCalc(gameState, team).materials;
    const savedStatement = {
      ...statement,
      outflows: { ...statement.outflows, productionCosts },
      totalOutflows: statement.totalOutflows + productionCosts,
      endingCash: statement.endingCash - productionCosts,
      cogs: productionCosts,
      grossMargin: statement.revenue - productionCosts,
      netIncome: statement.netIncome - productionCosts,
      assets: { ...statement.assets, cash: statement.endingCash - productionCosts }
    };
    const saved = await saveProFormaStatement({ universeId, teamI: team.i, quarter: gameState.quarter, statement: savedStatement });
    setSaving(false);
    onNotify?.(saved ? "Production costs projected and pro forma saved." : "Production costs projected; D1 save was unavailable.");
  };

  const rows = (items) => Object.entries(items).map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#E5E1D8] py-2 text-xs"><span className="capitalize text-[#5A5C60]">{label.replace(/([A-Z])/g, " $1")}</span><strong className="font-mono text-[#1F2022]">{money(value)}</strong></div>);

  return <section className={`space-y-5 rounded-xl border border-[#E5E1D8] bg-white p-6 shadow-sm ${compact ? "p-4" : ""}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4"><div><h3 className="text-lg font-bold text-[#1F2022]">Quarter {statement.quarter} Pro Forma</h3><p className="text-xs text-[#5A5C60]">{isCalculating ? "Recalculating forecast..." : `Live forecast for ${statement.forecastedUnits.toLocaleString()} planned units.`}</p></div>{!compact && <button onClick={runSimulation} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#1F2022] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving ? <Save className="h-4 w-4" /> : <Play className="h-4 w-4" />}{saving ? "Saving..." : "Run Production Simulation"}</button>}</div>
    <div className={`flex items-center justify-between rounded-lg border-2 p-4 ${statement.endingCash > 0 ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50"}`}><div><span className="block text-sm font-bold">Projected Quarter-End Cash</span><span className={`text-[10px] font-bold uppercase ${statement.endingCash > 0 ? "text-emerald-700" : "text-red-700"}`}>{statement.endingCash > 0 ? "Positive cash position" : "Cash must stay positive"}</span></div><strong className={`font-mono text-lg ${statement.endingCash > 0 ? "text-emerald-800" : "text-red-800"}`}>{money(statement.endingCash)}</strong></div>
    {compact && <div className="text-[10px] text-[#5A5C60]">Opening cash uses the latest locally stored D1 actual: {money(statement.openingCash)}.</div>}
    <div className="flex gap-2 border-b border-[#E5E1D8]">{[["cash", "Cash Flow Statement"], ["income", "Income Statement"], ["balance", "Balance Sheet"]].map(([id, label]) => <button key={id} onClick={() => setActiveTab(id)} className={`border-b-2 px-3 py-2 text-xs font-semibold ${activeTab === id ? "border-emerald-700 text-emerald-800" : "border-transparent text-[#5A5C60]"}`}>{label}</button>)}</div>
    {activeTab === "cash" && <div className="space-y-4"><div><h4 className="text-sm font-bold">Inflows</h4>{rows(statement.inflows)}<div className="flex justify-between pt-2 text-xs font-bold"><span>Total inflows</span><span>{money(statement.totalInflows)}</span></div></div><div><h4 className="text-sm font-bold">Outflows</h4>{rows(statement.outflows)}<div className="flex justify-between pt-2 text-xs font-bold"><span>Total outflows</span><span>{money(statement.totalOutflows)}</span></div></div><div className={`flex items-center justify-between rounded-lg border p-4 ${statement.endingCash > MINIMUM_CASH_LAKH ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}><span className="text-sm font-bold">Ending Cash Position</span><strong className="font-mono">{money(statement.endingCash)}</strong></div>{statement.endingCash <= MINIMUM_CASH_LAKH && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" />Bankruptcy warning: ending cash must remain above Rs. 300,000.</div>}</div>}
    {activeTab === "income" && <div className="space-y-2">{rows({ revenue: statement.revenue, cogs: statement.cogs, grossMargin: statement.grossMargin, operatingExpenses: statement.operatingExpenses, netIncome: statement.netIncome })}</div>}
    {activeTab === "balance" && <div className="grid gap-6 md:grid-cols-3"><div><h4 className="text-sm font-bold">Assets</h4>{rows(statement.assets)}</div><div><h4 className="text-sm font-bold">Liabilities</h4>{rows(statement.liabilities)}</div><div><h4 className="text-sm font-bold">Equity</h4>{rows(statement.equity)}</div></div>}
  </section>;
}

export default ProFormaPanel;