import React, { useState } from "react";
import { TeamState, GameState } from "../../types/simulation";
import { TECHS, techById, SEGMENTS } from "../../engine/catalog";
import { scoreModel, qualityFit } from "../../engine/simulationEngine";
import { Clock, FlaskConical, Handshake, X, Zap } from "lucide-react";
import { TechMap, STATUS_COLORS, TechStatus } from "../TechMap";
import { SectionTabs } from "../SectionTabs";
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

const STATUS_LABEL: Record<TechStatus, string> = { owned: "Owned", lab: "In the lab", queued: "Starts this quarter", open: "Not started" };

export const RnDTab: React.FC<RnDTabProps> = ({ team, gameState, onChange, onOfferLicence, onNotify, universeId }) => {
  const isLocked = team.dec.locked;
  const pendingStarts: { id: string; mode: "fast" | "std" }[] = (team.dec as any).rndStarts || [];
  const [selectedId, setSelectedId] = useState<string>(() => pendingStarts[0]?.id || team.rnd[0]?.id || TECHS.find((t) => !team.techs.includes(t.id))?.id || TECHS[0].id);
  const [drawer, setDrawer] = useState<"timeline" | "licensing">("timeline");
  const [licTech, setLicTech] = useState<string>(team.techs[0] || "");
  const rivals = gameState.teams.filter((t) => t.i !== team.i);
  const [selectedBuyerI, setSelectedBuyerI] = useState<number>(rivals[0]?.i ?? 0);
  const [licenceFee, setLicenceFee] = useState<number>(80);

  const statusOf = (id: string): TechStatus =>
    team.techs.includes(id) ? "owned" : team.rnd.some((p) => p.id === id) ? "lab" : pendingStarts.some((p) => p.id === id) ? "queued" : "open";
  const slotsUsed = team.rnd.length + pendingStarts.length;

  const handleStartRnd = (techId: string, mode: "fast" | "std") => {
    if (isLocked) return;
    if (statusOf(techId) !== "open") return;
    if (slotsUsed >= 2) {
      onNotify("The lab can run at most two R&D projects concurrently (auditor constraint).");
      return;
    }
    const tc = techById(techId);
    if (!tc) return;
    const cost = mode === "fast" ? tc.fast : tc.std;
    onChange({
      ...team,
      dec: { ...team.dec, rndStarts: [...pendingStarts, { id: techId, mode }], rndStartCost: (team.dec.rndStartCost || 0) + cost } as any
    });
    onNotify(`${tc.name} added to lab queue (${mode === "fast" ? "1 qtr crash" : "2 qtr standard"}). Costs Rs. ${cost} L.`);
  };

  const handleCancelPendingRnd = (techId: string) => {
    if (isLocked) return;
    const tc = techById(techId);
    const pend = pendingStarts.find((p) => p.id === techId);
    if (!pend || !tc) return;
    const cost = pend.mode === "fast" ? tc.fast : tc.std;
    onChange({
      ...team,
      dec: { ...team.dec, rndStarts: pendingStarts.filter((p) => p.id !== techId), rndStartCost: Math.max(0, (team.dec.rndStartCost || 0) - cost) } as any
    });
  };

  const handleSendOffer = async () => {
    if (isLocked) return;
    if (!licTech) {
      onNotify("Select a completed technology to license.");
      return;
    }
    await onOfferLicence(licTech, selectedBuyerI, licenceFee);
  };

  const tc = techById(selectedId)!;
  const status = statusOf(selectedId);
  const inLab = team.rnd.find((p) => p.id === selectedId);
  const queued = pendingStarts.find((p) => p.id === selectedId);
  const owners = rivals.filter((t) => t.techs.includes(selectedId));
  const flagship = team.models.slice().sort((a, b) => b.price - a.price)[0];
  const committed = pendingStarts.reduce((s, p) => s + ((p.mode === "fast" ? techById(p.id)?.fast : techById(p.id)?.std) || 0), 0);

  // Fit on each model's own target segment, with and without the selected technology fitted
  const impact = team.models.map((m) => {
    const seg = SEGMENTS.find((s) => s.id === (m.targetSegment ?? "S2")) || SEGMENTS[1];
    const now = Math.round(qualityFit(scoreModel(m, team), seg) * 100);
    const hypTeam = { ...team, techs: [...new Set([...team.techs, selectedId])] };
    const hypModel = { ...m, equippedTechs: m.equippedTechs ? [...new Set([...m.equippedTechs, selectedId])] : undefined };
    const after = Math.round(qualityFit(scoreModel(hypModel, hypTeam), seg) * 100);
    return { m, seg, now, after };
  });

  const kpis = [
    { label: "Lab slots", value: `${slotsUsed} / 2`, note: slotsUsed >= 2 ? "lab is full" : `${2 - slotsUsed} free this quarter`, tone: slotsUsed >= 2 ? "text-amber-700" : "text-[#1F2022]" },
    { label: "Technologies owned", value: `${team.techs.length} / ${TECHS.length}`, note: team.techs.length ? team.techs.map((id) => techById(id)?.name.split(" (")[0]).join(", ") : "none yet", tone: "text-emerald-700" },
    { label: "Committed this quarter", value: `Rs. ${committed} L`, note: pendingStarts.length ? `${pendingStarts.length} new project${pendingStarts.length > 1 ? "s" : ""}` : "no new projects", tone: "text-[#1F2022]" },
    {
      label: "Rival technology",
      value: `${rivals.reduce((s, t) => s + t.techs.length, 0)}`,
      note: `owned across ${rivals.length} rivals`,
      tone: "text-[#1F2022]"
    }
  ];

  const Q = gameState.cfg.quarters;
  const q = gameState.quarter;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="px-3 py-2.5 bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
            <div className="text-[11px] text-[#6C6D70]">{k.label}</div>
            <div className={`text-base font-bold font-mono ${k.tone}`}>{k.value}</div>
            <div className="text-[10px] text-[#8A8C90] truncate">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3">
        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-[#1F2022] flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-[#5A5C60]" /> Technology map
            </h3>
            <div className="flex flex-wrap gap-3 text-[10px] text-[#5A5C60]">
              {(Object.keys(STATUS_COLORS) as TechStatus[]).map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <i className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                  {STATUS_LABEL[s]}
                </span>
              ))}
            </div>
          </div>
          <TechMap team={team} flagship={flagship} statusOf={statusOf} selectedId={selectedId} onSelect={setSelectedId} />
          <p className="text-[11px] text-[#6C6D70] mt-2">
            Bars are {flagship?.name || "your flagship"}'s attribute scores (0–10); the red extension is what the selected technology would add once fitted.
          </p>
        </div>

        {/* Inspector */}
        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4 flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold" style={{ color: STATUS_COLORS[status] }}>
              {STATUS_LABEL[status]}
              {inLab && ` · ready Q${inLab.qDone}`}
              {queued && ` · ${queued.mode === "fast" ? "crash" : "standard"}`}
            </div>
            <h3 className="text-base font-bold text-[#1F2022] leading-snug">{tc.name}</h3>
            <p className="text-[11px] text-[#5A5C60] mt-1">{tc.note}</p>
          </div>

          {inLab && (
            <div>
              <div className="flex justify-between text-[10px] text-[#6C6D70] mb-1">
                <span>Started Q{(inLab as any).qStart ?? "?"}</span>
                <span>Ready Q{inLab.qDone}</span>
              </div>
              <div className="h-2 rounded-full bg-[#EDE9E1] overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${Math.min(100, Math.max(8, ((q - ((inLab as any).qStart ?? q)) / Math.max(1, inLab.qDone - ((inLab as any).qStart ?? q))) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold text-[#1F2022] mb-1">Fit gain on your models</div>
            <table className="w-full text-[11px]">
              <tbody>
                {impact.map((r) => (
                  <tr key={r.m.id} className="border-t border-[#F3F0EA]">
                    <td className="py-1 pr-1">
                      <div className="font-semibold text-[#1F2022] truncate max-w-[120px]">{r.m.name}</div>
                      <div className="text-[10px] text-[#8A8C90]">{r.seg.name}</div>
                    </td>
                    <td className="py-1 text-right font-mono text-[#5A5C60]">{r.now}</td>
                    <td className="py-1 text-right font-mono">→ {r.after}</td>
                    <td className={`py-1 text-right font-mono font-bold ${r.after > r.now ? "text-emerald-700" : "text-[#8A8C90]"}`}>
                      {status === "owned" ? "fitted" : `${r.after - r.now >= 0 ? "+" : ""}${r.after - r.now}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[11px]">
            <div className="text-[#6C6D70] mb-1">Rivals who own it ({owners.length} of {rivals.length})</div>
            {owners.length ? (
              <div className="flex flex-wrap gap-1">
                {owners.map((t) => (
                  <span key={t.i} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FAF8F5]">
                    <i className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[#5A5C60]">Nobody yet: a chance to differentiate, or to license it out later.</span>
            )}
            {owners.length > rivals.length / 2 && <p className="mt-1 text-amber-700">Most rivals have it: this is now table stakes, not an edge.</p>}
          </div>

          <div className="mt-auto space-y-1.5">
            {status === "open" && (
              <>
                <button
                  type="button"
                  disabled={isLocked || slotsUsed >= 2}
                  onClick={() => handleStartRnd(tc.id, "std")}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#1F2022] text-white text-xs font-semibold hover:bg-[#343538] disabled:opacity-40"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Standard · ready Q{q + 2}
                  </span>
                  <span className="font-mono">Rs. {tc.std} L</span>
                </button>
                <button
                  type="button"
                  disabled={isLocked || slotsUsed >= 2}
                  onClick={() => handleStartRnd(tc.id, "fast")}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#1F2022] text-[#1F2022] text-xs font-semibold hover:bg-[#FAF8F5] disabled:opacity-40"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Crash · ready Q{q + 1}
                  </span>
                  <span className="font-mono">
                    Rs. {tc.fast} L <span className="text-[10px] text-[#6C6D70]">(+{Math.round((tc.fast / tc.std - 1) * 100)}%)</span>
                  </span>
                </button>
                {slotsUsed >= 2 && <p className="text-[10px] text-amber-700 text-center">Both lab slots are in use.</p>}
              </>
            )}
            {status === "queued" && !isLocked && (
              <button
                type="button"
                onClick={() => handleCancelPendingRnd(tc.id)}
                className="w-full px-3 py-2 rounded-lg border border-[#E0DCD3] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#FAF8F5]"
              >
                <X className="w-3.5 h-3.5" /> Cancel this project
              </button>
            )}
            {status === "owned" && (
              <button
                type="button"
                onClick={() => {
                  setLicTech(tc.id);
                  setDrawer("licensing");
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#E0DCD3] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#FAF8F5]"
              >
                <Handshake className="w-3.5 h-3.5" /> License it to a rival
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="px-4 pt-3">
          <SectionTabs
            ariaLabel="R&D views"
            active={drawer}
            onChange={setDrawer}
            groups={[
              { label: "Lab", tabs: [{ key: "timeline", label: "Project timeline" }] },
              { label: "Intellectual property", tabs: [{ key: "licensing", label: "Licensing exchange", badge: team.techs.length ? `${team.techs.length}` : undefined }] }
            ]}
          />
        </div>
        <div className="p-4 drawer-flat">
          {drawer === "timeline" && (
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid text-[10px] text-[#8A8C90] mb-1" style={{ gridTemplateColumns: `180px repeat(${Q}, minmax(0, 1fr))` }}>
                  <span />
                  {Array.from({ length: Q }, (_, i) => (
                    <span key={i} className={`text-center ${i + 1 === q ? "font-bold text-[#C83E2B]" : ""}`}>
                      Q{i + 1}
                    </span>
                  ))}
                </div>
                {TECHS.map((t) => {
                  const st = statusOf(t.id);
                  const p = team.rnd.find((r) => r.id === t.id) as any;
                  const pend = pendingStarts.find((r) => r.id === t.id);
                  const start = p ? p.qStart ?? q - 1 : pend ? q : null;
                  const done = p ? p.qDone : pend ? q + (pend.mode === "fast" ? 1 : 2) : null;
                  return (
                    <div key={t.id} className="grid items-center py-1 border-t border-[#F3F0EA] cursor-pointer" style={{ gridTemplateColumns: `180px repeat(${Q}, minmax(0, 1fr))` }} onClick={() => setSelectedId(t.id)}>
                      <span className={`text-[11px] truncate pr-2 flex items-center gap-1.5 ${t.id === selectedId ? "font-bold text-[#1F2022]" : "text-[#5A5C60]"}`}>
                        <i className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[st] }} />
                        {t.name.split(" (")[0]}
                      </span>
                      {Array.from({ length: Q }, (_, i) => {
                        const col = i + 1;
                        const active = start !== null && done !== null && col >= start && col < done;
                        const isDone = done !== null && col === done;
                        return (
                          <div key={i} className={`h-4 mx-px rounded-sm ${col === q ? "ring-1 ring-[#C83E2B]/40" : ""}`} style={{ background: active ? (pend ? `${STATUS_COLORS.queued}55` : `${STATUS_COLORS.lab}aa`) : "#F5F2EC" }}>
                            {isDone && <div className="h-full grid place-items-center text-[9px] font-bold" style={{ color: pend ? STATUS_COLORS.queued : STATUS_COLORS.lab }}>◆</div>}
                            {st === "owned" && col >= q && <div className="h-full rounded-sm" style={{ background: `${STATUS_COLORS.owned}33` }} title="Owned and available" />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <p className="text-[10px] text-[#8A8C90] mt-2">Bars run from start to the quarter before delivery; ◆ marks the quarter the technology becomes usable. Crash projects take one quarter, standard projects two.</p>
              </div>
            </div>
          )}

          {drawer === "licensing" && (
            <div className="space-y-4">
              {team.techs.length > 0 ? (
                <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-[#FAF8F5] border border-[#E0DCD3]">
                  <label className="text-[11px] text-[#5A5C60]">
                    Technology
                    <select value={licTech} onChange={(e) => setLicTech(e.target.value)} className="block mt-1 p-2 text-xs bg-white border border-[#E0DCD3] rounded-lg">
                      {team.techs.map((id) => (
                        <option key={id} value={id}>
                          {techById(id)?.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] text-[#5A5C60]">
                    Buyer
                    <select value={selectedBuyerI} onChange={(e) => setSelectedBuyerI(+e.target.value)} className="block mt-1 p-2 text-xs bg-white border border-[#E0DCD3] rounded-lg">
                      {rivals.map((r) => (
                        <option key={r.i} value={r.i} disabled={r.techs.includes(licTech)}>
                          {r.name} {r.isBot ? "(Bot)" : ""}
                          {r.techs.includes(licTech) ? " · already owns it" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] text-[#5A5C60]">
                    One-time fee (Rs. L)
                    <input type="number" min={1} step={5} value={licenceFee} onChange={(e) => setLicenceFee(+e.target.value)} className="block mt-1 w-24 p-2 text-xs bg-white border border-[#E0DCD3] rounded-lg font-mono" />
                  </label>
                  <button onClick={handleSendOffer} disabled={isLocked} className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white font-semibold text-xs rounded-lg disabled:opacity-40">
                    Send offer
                  </button>
                  <p className="basis-full text-[11px] text-[#6C6D70]">
                    Rule of thumb: licence fees settle around half the standard development cost
                    {techById(licTech) ? ` (about Rs. ${Math.round((techById(licTech)!.std || 0) / 2)} L here)` : ""}. Licensing earns cash now but hands a rival your edge.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#5A5C60]">Finish an R&D project first; then you can offer licences to rivals.</p>
              )}
              <LicensingBoard
                gameId={universeId}
                teamId={team.i}
                quarter={gameState.quarter}
                teams={gameState.teams}
                ownedTechnologies={team.techs.map((id) => ({ project_id: id, name: techById(id)?.name || id }))}
                onNotify={onNotify}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
