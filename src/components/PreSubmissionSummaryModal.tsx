import React from "react";
import { TeamState, GameState } from "../types/simulation";
import { fmtL, fmtRs, CLAIMS_CATALOG } from "../engine/catalog";
import { proFormaCalc, auditTeam, centreOpenCost } from "../engine/simulationEngine";
import {
  FileText,
  Lock,
  X,
  Bike,
  Factory,
  Megaphone,
  Store,
  Cpu,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  ShieldAlert
} from "lucide-react";

interface PreSubmissionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLock: () => void;
  team: TeamState;
  gameState: GameState;
}

export const PreSubmissionSummaryModal: React.FC<PreSubmissionSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirmLock,
  team,
  gameState
}) => {
  if (!isOpen) return null;

  const dec = team.dec;
  const pf = proFormaCalc(gameState, team);
  const auditErrors = auditTeam(gameState, team);

  // Compute production summary
  const totalProductionUnits = (Object.values(dec.prod) as number[]).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );

  // Compute total ad spend
  const adSpendL = dec.ad || 0;

  // Selected brand claims
  const selectedClaims = (dec.claims || []).map((id) => {
    const found = CLAIMS_CATALOG.find((c) => c.id === id);
    return found ? found.title : id;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF8F5] rounded-2xl border border-[#E5E1D8] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[#1F2022] font-sans">
        {/* Modal Header */}
        <div className="p-5 bg-[#1F2022] text-white flex items-center justify-between border-b border-[#323336]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2C2D30] rounded-xl border border-[#3E4044] text-emerald-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Executive Decision Summary Sheet
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-[10px] font-mono font-bold uppercase">
                  Quarter {gameState.quarter} Lock-In
                </span>
              </div>
              <p className="text-xs text-[#A0A2A8] mt-0.5">
                Review major operational, commercial, and financial commitments for <strong>{team.name}</strong> before final lock.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A0A2A8] hover:text-white hover:bg-[#2C2D30] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Auditor Alerts if any */}
          {auditErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="font-bold text-sm text-red-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Auditor Decision Validation Issues Detected:
              </div>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1 font-mono">
                {auditErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Departmental Summaries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Product & Pricing */}
            <div className="p-4 rounded-xl bg-white border border-[#E0DCD3] space-y-2.5 shadow-2xs">
              <div className="font-bold text-[#1F2022] flex items-center gap-1.5 text-sm border-b border-[#E5E1D8] pb-1.5">
                <Bike className="w-4 h-4 text-blue-600" />
                Product Lineup & Production Target
              </div>

              {team.models.length === 0 ? (
                <div className="text-[#8A8C90] font-mono">No scooter models created yet.</div>
              ) : (
                <div className="space-y-2 font-mono">
                  {team.models.map((m) => {
                    const prodUnits = dec.prod[m.id] || 0;
                    return (
                      <div key={m.id} className="flex items-center justify-between bg-[#FAF8F5] p-2 rounded border border-[#E0DCD3]">
                        <div>
                          <div className="font-bold text-[#1F2022]">{m.name}</div>
                          <div className="text-[10px] text-[#6C6D70]">List Price: {fmtRs(m.price)}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-indigo-700">{prodUnits.toLocaleString()} units</span>
                          <div className="text-[10px] text-[#6C6D70]">Inventory: {m.inv} units</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Operations & Manufacturing Quality */}
            <div className="p-4 rounded-xl bg-white border border-[#E0DCD3] space-y-2.5 shadow-2xs">
              <div className="font-bold text-[#1F2022] flex items-center gap-1.5 text-sm border-b border-[#E5E1D8] pb-1.5">
                <Factory className="w-4 h-4 text-emerald-700" />
                Operations & Factory Quality
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Total Planned Production:</span>
                  <strong className="text-[#1F2022]">{totalProductionUnits.toLocaleString()} units</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Plant Capacity Expansion:</span>
                  <strong className="text-[#1F2022]">+{dec.expBlocks || 0} Blocks ({(dec.expBlocks || 0) * 500} units)</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Quality Improvement Budget:</span>
                  <strong className="text-emerald-700">{fmtL(dec.quality || 0)} L</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6C6D70]">Staff Headcount Net Hire:</span>
                  <strong className="text-[#1F2022]">{dec.hire > 0 ? `+${dec.hire}` : dec.hire} staff</strong>
                </div>
              </div>
            </div>

            {/* 3. Marketing & Segment Advertising */}
            <div className="p-4 rounded-xl bg-white border border-[#E0DCD3] space-y-2.5 shadow-2xs">
              <div className="font-bold text-[#1F2022] flex items-center gap-1.5 text-sm border-b border-[#E5E1D8] pb-1.5">
                <Megaphone className="w-4 h-4 text-purple-700" />
                Marketing & Brand Campaigns
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Total Advertising Budget:</span>
                  <strong className="text-purple-700">{fmtL(adSpendL)} L</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Market Research Intelligence:</span>
                  <strong className="text-[#1F2022]">{dec.buyIntel ? "Purchased (Rs. 15 L)" : "None"}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Consumer Panel Clinic:</span>
                  <strong className="text-[#1F2022]">{dec.buyClinic ? "Purchased (Rs. 25 L)" : "None"}</strong>
                </div>
                <div className="py-1">
                  <span className="text-[#6C6D70] block mb-1">Selected Advertising Claims:</span>
                  {selectedClaims.length === 0 ? (
                    <span className="text-[#8A8C90]">None selected</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedClaims.map((cl, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded text-[10px] font-bold">
                          {cl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Sales & Showroom Outlets */}
            <div className="p-4 rounded-xl bg-white border border-[#E0DCD3] space-y-2.5 shadow-2xs">
              <div className="font-bold text-[#1F2022] flex items-center gap-1.5 text-sm border-b border-[#E5E1D8] pb-1.5">
                <Store className="w-4 h-4 text-amber-700" />
                Sales & Showrooms
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Active Experience Centers:</span>
                  <strong className="text-[#1F2022]">{team.centres} outlets</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">New Outlets Opening:</span>
                  <strong className="text-amber-700">+{dec.newCentres || 0} outlets ({fmtL(centreOpenCost(dec.newCentreCities))} L)</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6C6D70]">Sales Force Headcount:</span>
                  <strong className="text-[#1F2022]">{team.staff} sales staff</strong>
                </div>
              </div>
            </div>

            {/* 5. R&D & Licensing */}
            <div className="p-4 rounded-xl bg-white border border-[#E0DCD3] space-y-2.5 shadow-2xs">
              <div className="font-bold text-[#1F2022] flex items-center gap-1.5 text-sm border-b border-[#E5E1D8] pb-1.5">
                <Cpu className="w-4 h-4 text-indigo-700" />
                R&D Projects & Licensing
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Newly Started R&D Projects:</span>
                  <strong className="text-indigo-700">{(dec.rndStarts || []).length} projects</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6C6D70]">R&D Direct Outlay:</span>
                  <strong className="text-[#1F2022]">{fmtL(dec.rndStartCost || 0)} L</strong>
                </div>
              </div>
            </div>

            {/* 6. Financing & Debt Options */}
            <div className="p-4 rounded-xl bg-white border border-[#E0DCD3] space-y-2.5 shadow-2xs">
              <div className="font-bold text-[#1F2022] flex items-center gap-1.5 text-sm border-b border-[#E5E1D8] pb-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                Capital & Financing Target
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">Bank Credit Target:</span>
                  <strong className="text-[#1F2022]">{fmtL(dec.bankTarget || 0)} L</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-[#6C6D70]">New Bond Issue (LT Debt):</span>
                  <strong className="text-[#1F2022]">{fmtL(dec.ltIssue || 0)} L</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6C6D70]">VC Funding Ask:</span>
                  <strong className="text-purple-700">{dec.vc ? `Rs. ${dec.vc.ask} L (${dec.vc.equity}% Equity)` : "None"}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Forma Cash Outlook Banner */}
          <div className="bg-white text-[#1F2022] p-5 rounded-2xl border border-[#E0DCD3] space-y-3 font-mono shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-2">
              <div className="font-bold flex items-center gap-2 text-sm text-emerald-800">
                <BarChart3 className="w-4 h-4 text-emerald-700" /> Pro Forma Financial Outlook
              </div>
              <span className="text-[11px] font-bold text-[#5A5C60]">Quarter {gameState.quarter} Projection</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Starting Cash</div>
                <div className="font-bold text-sm text-[#1F2022] mt-0.5">{fmtL(pf.cash)} L</div>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Committed COGS & Opex</div>
                <div className="font-bold text-sm text-red-700 mt-0.5">-{fmtL(pf.out + pf.running + pf.people)} L</div>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">New Capital Inflow</div>
                <div className="font-bold text-sm text-emerald-800 mt-0.5">+{fmtL(pf.inflow)} L</div>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3]">
                <div className="text-[10px] text-[#5A5C60] font-bold uppercase">Projected Closing Cash</div>
                <div className={`font-bold text-sm ${pf.close < 0 ? "text-red-700" : "text-emerald-800"}`}>
                  {fmtL(pf.close)} L
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 bg-[#FAF8F5] border-t border-[#E5E1D8] flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-[#E0DCD3] text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA] font-bold text-xs rounded-xl transition shadow-2xs"
          >
            Cancel & Keep Editing
          </button>

          <button
            onClick={() => {
              if (auditErrors.length > 0) {
                alert("Cannot lock decisions until auditor validation errors are resolved!");
                return;
              }
              onConfirmLock();
            }}
            disabled={auditErrors.length > 0}
            className={`px-6 py-2.5 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-2xs ${
              auditErrors.length > 0
                ? "bg-slate-300 cursor-not-allowed text-slate-500"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            <Lock className="w-4 h-4" /> Confirm & Lock Team Decisions
          </button>
        </div>
      </div>
    </div>
  );
};
