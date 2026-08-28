import React, { useState } from "react";
import { TeamState, GameState } from "../../types/simulation";
import { TECHS, techById, fmtRs } from "../../engine/catalog";
import { Cpu, Handshake, CheckCircle2, Clock, Zap, DollarSign } from "lucide-react";
import { RnDVisualizer } from "../RnDVisualizer";
import { RDPipelineRoadmap } from "../RDPipelineRoadmap";
import LicensingBoard from "../LicensingBoard";

interface RnDTabProps {
  team: TeamState;
  gameState: GameState;
  onChange: (updatedTeam: TeamState) => void;
  onOfferLicence: (techId: string, buyerI: number, fee: number) => Promise<void>;
  onRespondLicence: (contractId: number, accept: boolean) => Promise<void>;
  onNotify: (msg: string) => void;
  universeId?: string;
}

export const RnDTab: React.FC<RnDTabProps> = ({
  team,
  gameState,
  onChange,
  onOfferLicence,
  onRespondLicence,
  onNotify,
  universeId
}) => {
  const isLocked = team.dec.locked;
  const [selectedRndTech, setSelectedRndTech] = useState<string>(TECHS[0].id);
  const [selectedBuyerI, setSelectedBuyerI] = useState<number>(0);
  const [licenceFee, setLicenceFee] = useState<number>(80);

  const pendingStarts = (team.dec as any).rndStarts || [];

  const handleStartRnd = (techId: string, mode: "fast" | "std") => {
    if (isLocked) return;
    if (team.techs.includes(techId) || team.rnd.some((p) => p.id === techId) || pendingStarts.some((p: any) => p.id === techId)) return;

    if (team.rnd.length + pendingStarts.length >= 2) {
      onNotify("The lab can run at most two R&D projects concurrently (auditor constraint).");
      return;
    }

    const tc = techById(techId);
    if (!tc) return;

    const cost = mode === "fast" ? tc.fast : tc.std;
    const newPending = [...pendingStarts, { id: techId, mode }];

    onChange({
      ...team,
      dec: {
        ...team.dec,
        rndStarts: newPending,
        rndStartCost: (team.dec.rndStartCost || 0) + cost
      } as any
    });

    onNotify(`${tc.name} added to lab queue (${mode === "fast" ? "1 qtr crash" : "2 qtr standard"}). Costs Rs. ${cost} L.`);
  };

  const handleCancelPendingRnd = (techId: string) => {
    if (isLocked) return;
    const tc = techById(techId);
    const pend = pendingStarts.find((p: any) => p.id === techId);
    if (!pend || !tc) return;

    const cost = pend.mode === "fast" ? tc.fast : tc.std;
    const newPending = pendingStarts.filter((p: any) => p.id !== techId);

    onChange({
      ...team,
      dec: {
        ...team.dec,
        rndStarts: newPending,
        rndStartCost: Math.max(0, (team.dec.rndStartCost || 0) - cost)
      } as any
    });
  };

  const handleSendOffer = async () => {
    if (isLocked) return;
    if (!selectedRndTech) {
      onNotify("Select a completed technology to license.");
      return;
    }
    await onOfferLicence(selectedRndTech, selectedBuyerI, licenceFee);
  };

  const rivals = gameState.teams.filter((t) => t.i !== team.i);

  return (
    <div className="space-y-6">
      {/* R&D Pipeline Gantt Roadmap */}
      <RDPipelineRoadmap team={team} gameState={gameState} />

      {/* Intro Banner */}
      <div className="bg-[#FAF8F5] p-6 rounded-xl border border-[#E5E1D8] shadow-2xs">
        <div className="flex items-center gap-3 mb-2">
          <Cpu className="w-6 h-6 text-emerald-700" />
          <h2 className="text-xl font-bold text-[#1F2022]">
            Research & Development and Technology Licensing
          </h2>
        </div>
        <p className="text-sm text-[#5A5C60]">
          R&D projects create proprietary technologies that upgrade your entire product line. Choose between <strong>Standard Development</strong> (2 quarters, ~30% cheaper) and <strong>Crash Development</strong> (1 quarter, higher engineering cost). Once completed, you can license your technology to rival firms to recoup development capital.
        </p>
      </div>

      {/* R&D Visualizer Component */}
      <RnDVisualizer
        team={team}
        gameState={gameState}
        selectedTechId={selectedRndTech}
        onSelectTech={(id) => setSelectedRndTech(id)}
      />

      {/* Available R&D Projects */}
      <div className="bg-[#FAF8F5] p-6 rounded-xl border border-[#E5E1D8] shadow-2xs">
        <h3 className="text-lg font-bold text-[#1F2022] mb-4">
          Firm Technology Portfolio & Lab
        </h3>

        <div className="space-y-3">
          {TECHS.map((tc) => {
            const isOwned = team.techs.includes(tc.id);
            const inProgress = team.rnd.find((p) => p.id === tc.id);
            const isPending = pendingStarts.find((p: any) => p.id === tc.id);

            return (
              <div
                key={tc.id}
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition ${
                  isOwned
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : inProgress || isPending
                    ? "bg-amber-50/80 border-amber-300 text-amber-950"
                    : "bg-white border-[#E0DCD3]"
                }`}
              >
                <div className="flex-1 min-w-[240px]">
                  <div className="font-bold text-sm text-[#1F2022] flex items-center gap-2">
                    {tc.name}
                    {isOwned && (
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Completed
                      </span>
                    )}
                    {inProgress && (
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" /> Lab: Ready Q{inProgress.qDone}
                      </span>
                    )}
                    {isPending && (
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-100 text-purple-900 border border-purple-300 rounded-full flex items-center gap-1">
                        <Zap className="w-3 h-3 text-purple-700" /> Starts Q{gameState.quarter} ({isPending.mode})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#6C6D70] mt-1">{tc.note}</div>
                </div>

                <div className="flex items-center gap-2">
                  {!isOwned && !inProgress && !isPending && (
                    <>
                      <button
                        onClick={() => handleStartRnd(tc.id, "fast")}
                        disabled={isLocked}
                        className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                      >
                        Crash (1 qtr) · Rs. {tc.fast} L
                      </button>
                      <button
                        onClick={() => handleStartRnd(tc.id, "std")}
                        disabled={isLocked}
                        className="px-3 py-1.5 bg-[#1F2022] hover:bg-[#343538] text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                      >
                        Standard (2 qtr) · Rs. {tc.std} L
                      </button>
                    </>
                  )}

                  {isPending && !isLocked && (
                    <button
                      onClick={() => handleCancelPendingRnd(tc.id)}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 rounded-lg text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Licensing Exchange */}
      <div className="bg-[#FAF8F5] p-6 rounded-xl border border-[#E5E1D8] shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <Handshake className="w-5 h-5 text-emerald-700" />
          <h3 className="text-lg font-bold text-[#1F2022]">
            Technology Licensing Exchange
          </h3>
        </div>

        {team.techs.length > 0 ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[10px] font-mono font-semibold uppercase text-purple-900">
                  Select Completed Technology
                </label>
                <select
                  value={selectedRndTech}
                  onChange={(e) => setSelectedRndTech(e.target.value)}
                  className="p-2 text-xs bg-white text-[#1F2022] border border-[#E0DCD3] rounded-lg font-medium focus:outline-none focus:border-purple-600"
                >
                  {team.techs.map((id) => (
                    <option key={id} value={id}>
                      {techById(id)?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-semibold uppercase text-purple-900">
                  Target Competitor Firm
                </label>
                <select
                  value={selectedBuyerI}
                  onChange={(e) => setSelectedBuyerI(+e.target.value)}
                  className="p-2 text-xs bg-white text-[#1F2022] border border-[#E0DCD3] rounded-lg font-medium focus:outline-none focus:border-purple-600"
                >
                  {rivals.map((r) => (
                    <option key={r.i} value={r.i}>
                      {r.name} {r.isBot ? "(Bot)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-semibold uppercase text-purple-900">
                  One-time Licence Fee (Rs. L)
                </label>
                <input
                  type="number"
                  min={1}
                  step={5}
                  value={licenceFee}
                  onChange={(e) => setLicenceFee(+e.target.value)}
                  className="w-24 p-2 text-xs bg-white text-[#1F2022] border border-[#E0DCD3] rounded-lg font-mono font-bold focus:outline-none focus:border-purple-600"
                />
              </div>

              <button
                onClick={handleSendOffer}
                disabled={isLocked}
                className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white font-semibold text-xs rounded-lg transition self-end shadow-2xs"
              >
                Send Licensing Offer
              </button>
            </div>
            <p className="text-xs text-[#6C6D70]">
              Benchmark rule of thumb: Benchmark licence fees are typically around 50% of standard R&D development costs.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#6C6D70] italic">
            Your firm has not completed any proprietary technology yet. Finish an R&D project first to offer licensing contracts to rivals.
          </p>
        )}
      </div>

      <LicensingBoard
        gameId={universeId}
        teamId={team.i}
        quarter={gameState.quarter}
        teams={gameState.teams}
        ownedTechnologies={team.techs.map((id) => ({ project_id: id, name: techById(id)?.name || id }))}
        onNotify={onNotify}
      />
    </div>
  );
};
