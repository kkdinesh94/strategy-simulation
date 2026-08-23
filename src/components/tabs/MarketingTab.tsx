import React from "react";
import { TeamState, GameState } from "../../types/simulation";
import { SEGMENTS, CLAIMS } from "../../engine/catalog";
import { Megaphone, AlertTriangle, Eye, Sparkles } from "lucide-react";
import { MarketingVisualizer } from "../MarketingVisualizer";
import MediaPlanner from "../MediaPlanner";

interface MarketingTabProps {
  team: TeamState;
  gameState: GameState;
  onChange: (updatedTeam: TeamState) => void;
  onNotify: (msg: string) => void;
}

export const MarketingTab: React.FC<MarketingTabProps> = ({
  team,
  gameState,
  onChange,
  onNotify
}) => {
  const isLocked = team.dec.locked;
  const isEarlyGame = gameState.quarter <= 3;

  const handleAdBudgetChange = (val: number) => {
    if (isLocked) return;
    const capped = isEarlyGame ? Math.min(300, val) : Math.min(800, val);
    onChange({
      ...team,
      dec: {
        ...team.dec,
        ad: Math.max(0, capped)
      }
    });
  };

  const handleClaimToggle = (claimKey: string) => {
    if (isLocked) return;
    const currentClaims = team.dec.claims || [];
    const exists = currentClaims.includes(claimKey);

    if (exists) {
      onChange({
        ...team,
        dec: {
          ...team.dec,
          claims: currentClaims.filter((k) => k !== claimKey)
        }
      });
    } else {
      if (currentClaims.length >= 2) {
        onNotify("Maximum 2 claims allowed per advertising campaign.");
        return;
      }
      onChange({
        ...team,
        dec: {
          ...team.dec,
          claims: [...currentClaims, claimKey]
        }
      });
    }
  };

  const handleAllocChange = (segId: string, pct: number) => {
    if (isLocked) return;
    const updatedAlloc = {
      ...team.dec.alloc,
      [segId]: Math.max(0, Math.min(100, Math.round(pct)))
    };
    onChange({
      ...team,
      dec: {
        ...team.dec,
        alloc: updatedAlloc
      }
    });
  };

  const handleResearchToggle = (field: "buyIntel" | "buyClinic") => {
    if (isLocked) return;
    onChange({
      ...team,
      dec: {
        ...team.dec,
        [field]: !team.dec[field]
      }
    });
  };

  const totalAlloc = SEGMENTS.reduce((x, s) => x + (team.dec.alloc[s.id] || 0), 0);

  return (
    <div className="space-y-6">
      {/* Marketing Visualizer Component */}
      <MarketingVisualizer team={team} gameState={gameState} />

      <MediaPlanner
        team={team}
        onChange={onChange}
        competitiveBenchmarkData={team.hist[team.hist.length - 1]?.intel || []}
      />

      {/* Advertising Campaign Budget */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Megaphone className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-[#1F2022]">
            Advertising Campaign & Media Budget
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="block text-xs font-mono font-semibold uppercase text-[#5A5C60] mb-2">
              Quarterly Media Advertising Budget (Rs. L)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={isEarlyGame ? 300 : 800}
                step={10}
                value={team.dec.ad}
                disabled={isLocked}
                onChange={(e) => handleAdBudgetChange(+e.target.value)}
                className="w-36 p-2.5 text-base font-mono font-bold bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-emerald-700 focus:outline-none focus:border-[#C83E2B]"
              />
              <span className="text-xs text-[#5A5C60]">Lakhs / Quarter</span>
            </div>
            {isEarlyGame && (
              <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Auditor cap: Max Rs. 300 L during Quarters 1-3 test-market phase.
              </p>
            )}
          </div>

          <div className="p-4 bg-[#FAF8F5] rounded-lg border border-[#E0DCD3] text-xs text-[#5A5C60] space-y-1">
            <div className="font-bold text-[#1F2022]">Media Dynamics:</div>
            <div>• Ad spend builds brand awareness and customer purchase intent.</div>
            <div>• Unfed brand awareness decays by ~10% per quarter.</div>
            <div>• Diminishing marginal returns occur above ~Rs. 120 L per segment.</div>
          </div>
        </div>
      </div>

      {/* Campaign Claims (Deceptive Advertising Checks) */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-[#1F2022]">
            Ad Copy Claims (Pick Up to 2)
          </h3>
        </div>
        <p className="text-xs text-[#5A5C60] mb-4">
          All advertising claims must be supportable by actual product specs. False or unbacked claims trigger <strong>Deceptive Advertising Penalties</strong> from the auditor and damage brand satisfaction.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.keys(CLAIMS).map((k) => {
            const isSelected = (team.dec.claims || []).includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleClaimToggle(k)}
                disabled={isLocked}
                className={`p-3 rounded-lg border text-left text-xs font-medium transition ${
                  isSelected
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm"
                    : "bg-[#FAF8F5] border-[#E0DCD3] hover:bg-white text-[#1F2022]"
                }`}
              >
                {CLAIMS[k]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Media Budget Segment Allocation */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#1F2022]">
            Media Budget Allocation Across Segments (%)
          </h3>
          <span
            className={`font-mono text-xs font-bold px-3 py-1 rounded-full ${
              totalAlloc === 100
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            Total: {totalAlloc}% (Must = 100%)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {SEGMENTS.map((s) => {
            const val = team.dec.alloc[s.id] || 0;
            const isPrim = team.prim === s.id;
            const isSec = team.sec === s.id;

            return (
              <div
                key={s.id}
                className={`p-3 rounded-lg border ${
                  isPrim
                    ? "border-emerald-500 bg-emerald-50/40"
                    : isSec
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-[#E0DCD3] bg-[#FAF8F5]"
                }`}
              >
                <div className="text-xs font-bold text-[#1F2022] mb-1">
                  {s.name}
                </div>
                <div className="text-[10px] text-[#5A5C60] mb-2">
                  Aw: {(team.aw[s.id] * 100).toFixed(0)}%
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={val}
                  disabled={isLocked}
                  onChange={(e) => handleAllocChange(s.id, +e.target.value)}
                  className="w-full p-2 text-sm font-mono font-bold bg-white border border-[#E0DCD3] rounded-lg text-[#1F2022]"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Market Research Subscriptions */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-[#1F2022]">
            Syndicated Market Research Subscriptions
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
              team.dec.buyIntel
                ? "bg-emerald-50 border-emerald-500"
                : "bg-[#FAF8F5] border-[#E0DCD3] hover:bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={team.dec.buyIntel}
              disabled={isLocked}
              onChange={() => handleResearchToggle("buyIntel")}
              className="accent-emerald-600 rounded mt-1"
            />
            <div>
              <div className="font-bold text-sm text-[#1F2022]">
                Competitor Intelligence Report (Rs. 15 L)
              </div>
              <div className="text-xs text-[#5A5C60] mt-1">
                Reveals rival ad budgets, experience center counts, sales headcount, completed technologies, and estimated unit manufacturing costs.
              </div>
            </div>
          </label>

          <label
            className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
              team.dec.buyClinic
                ? "bg-emerald-50 border-emerald-500"
                : "bg-[#FAF8F5] border-[#E0DCD3] hover:bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={team.dec.buyClinic}
              disabled={isLocked}
              onChange={() => handleResearchToggle("buyClinic")}
              className="accent-emerald-600 rounded mt-1"
            />
            <div>
              <div className="font-bold text-sm text-[#1F2022]">
                Customer Clinic Rating Report (Rs. 10 L)
              </div>
              <div className="text-xs text-[#5A5C60] mt-1">
                Provides consumer panel scores (0-100) for every competitor model on Quality Fit, Price Fit, and Campaign Appeal across all 5 market segments.
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
