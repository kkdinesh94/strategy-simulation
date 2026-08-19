import React, { useState } from "react";
import { TeamState, ScooterModel, AddonId } from "../../types/simulation";
import { CATALOG, ADDONS, TECHS, techById, SEGMENTS, ARCHETYPES, fmtRs } from "../../engine/catalog";
import { scoreModel, qualityFit, priceFit, enforceModelRules, mkModel, unitCost } from "../../engine/simulationEngine";
import { ScooterVisualizer } from "../ScooterVisualizer";
import { Plus, Edit3, Trash2, ShieldCheck, AlertCircle, Wrench, Cpu, Zap, CheckCircle2, Clock, Lock, FlaskConical, X } from "lucide-react";

interface ProductDesignTabProps {
  team: TeamState;
  onChange: (updatedTeam: TeamState) => void;
  onNotify: (msg: string) => void;
}

export const ProductDesignTab: React.FC<ProductDesignTabProps> = ({
  team,
  onChange,
  onNotify
}) => {
  const [activeModelIdx, setActiveModelIdx] = useState<number>(0);
  const [focusedCategory, setFocusedCategory] = useState<string | undefined>(undefined);
  const isLocked = team.dec.locked;

  // Custom modal state for renaming and launching models
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>("");

  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState<boolean>(false);
  const [launchNameInput, setLaunchNameInput] = useState<string>("");

  const currentModel = team.models[activeModelIdx] || team.models[0];

  const handleCfgChange = (cat: string, val: string) => {
    if (isLocked) return;
    setFocusedCategory(cat);
    const updatedModels = [...team.models];
    const m = { ...updatedModels[activeModelIdx] };
    m.cfg = { ...m.cfg, [cat]: val as any };

    const msgs = enforceModelRules(m);
    if (msgs.length) onNotify(msgs.join(" "));

    updatedModels[activeModelIdx] = m;
    onChange({ ...team, models: updatedModels });
  };

  const handleAddonToggle = (addonId: AddonId) => {
    if (isLocked) return;
    const updatedModels = [...team.models];
    const m = { ...updatedModels[activeModelIdx] };
    m.add = { ...m.add, [addonId]: !m.add[addonId] };

    const msgs = enforceModelRules(m);
    if (msgs.length) onNotify(msgs.join(" "));

    updatedModels[activeModelIdx] = m;
    onChange({ ...team, models: updatedModels });
  };

  const handleRndTechToggle = (techId: string) => {
    if (isLocked) return;
    if (!team.techs.includes(techId)) {
      onNotify("This technology is not yet developed or licensed by your firm.");
      return;
    }
    const updatedModels = [...team.models];
    const m = { ...updatedModels[activeModelIdx] };

    const currentEquipped = m.equippedTechs ?? [...team.techs];
    const isEquipped = currentEquipped.includes(techId);

    let newEquipped: string[];
    if (isEquipped) {
      newEquipped = currentEquipped.filter((id) => id !== techId);
      onNotify(`${techById(techId)?.name || techId} unequipped from ${m.name}.`);
    } else {
      newEquipped = [...currentEquipped, techId];
      onNotify(`${techById(techId)?.name || techId} equipped on ${m.name}.`);
    }

    m.equippedTechs = newEquipped;
    updatedModels[activeModelIdx] = m;
    onChange({ ...team, models: updatedModels });
  };

  const handlePriceChange = (val: number) => {
    if (isLocked) return;
    const updatedModels = [...team.models];
    updatedModels[activeModelIdx] = {
      ...updatedModels[activeModelIdx],
      price: Math.max(55000, Math.min(200000, Math.round(val / 500) * 500))
    };
    onChange({ ...team, models: updatedModels });
  };

  const openRenameModal = () => {
    if (isLocked || !currentModel) return;
    setRenameInput(currentModel.name);
    setIsRenameModalOpen(true);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (renameInput && renameInput.trim()) {
      const updatedModels = [...team.models];
      updatedModels[activeModelIdx] = {
        ...updatedModels[activeModelIdx],
        name: renameInput.trim().substring(0, 30)
      };
      onChange({ ...team, models: updatedModels });
      onNotify(`Brand name updated to "${renameInput.trim().substring(0, 30)}"`);
    }
    setIsRenameModalOpen(false);
  };

  const openLaunchModal = () => {
    if (isLocked || team.models.length >= 3) return;
    setLaunchNameInput(`Model ${team.models.length + 1}`);
    setIsLaunchModalOpen(true);
  };

  const handleSaveLaunchModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || team.models.length >= 3) return;

    const baseArch = ARCHETYPES.commuter;
    const modelName = launchNameInput.trim() || `Model ${team.models.length + 1}`;
    const newM = mkModel(modelName, baseArch.cfg, ["boot"], 110000);
    newM.isNew = true;

    const updatedModels = [...team.models, newM];
    const updatedProd = { ...team.dec.prod, [newM.id]: 0 };

    onChange({
      ...team,
      models: updatedModels,
      dec: {
        ...team.dec,
        prod: updatedProd,
        devCost: (team.dec.devCost || 0) + 50
      }
    });

    setActiveModelIdx(updatedModels.length - 1);
    setIsLaunchModalOpen(false);
    onNotify(`New model "${modelName}" launched! Rs. 50 L development charge applied.`);
  };

  const scores = currentModel ? scoreModel(currentModel, team) : {};
  const currentCost = currentModel ? unitCost(currentModel) : 0;
  const margin = currentModel ? currentModel.price - currentCost : 0;
  const marginPct = currentModel && currentModel.price > 0 ? (margin / currentModel.price) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Product Line Header Tabs */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {team.models.map((m, idx) => (
            <button
              key={m.id || idx}
              onClick={() => setActiveModelIdx(idx)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition flex items-center gap-2 ${
                activeModelIdx === idx
                  ? "bg-[#1F2022] text-white shadow-sm font-medium"
                  : "bg-[#FAF8F5] text-[#1F2022] border border-[#E0DCD3] hover:bg-slate-100"
              }`}
            >
              <span>{m.name}</span>
              <span className="text-[10px] opacity-80">({fmtRs(m.price)})</span>
            </button>
          ))}

          {team.models.length < 3 && !isLocked && (
            <button
              onClick={openLaunchModal}
              className="px-3.5 py-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Launch Model ({team.models.length}/3)
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-[#5A5C60]">
          Max 3 models in product line (Good / Better / Best)
        </div>
      </div>

      {currentModel && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Configurator Options & Addons */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Component Specs */}
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-[#1F2022]">
                    BOM Component Specification
                  </h3>
                </div>
                <button
                  onClick={openRenameModal}
                  disabled={isLocked}
                  className="px-3 py-1 bg-[#FAF8F5] hover:bg-slate-100 text-[#1F2022] border border-[#E0DCD3] text-xs font-semibold rounded-lg transition flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Rename Brand
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(CATALOG).map((cat) => {
                  const category = CATALOG[cat];
                  return (
                    <div
                      key={cat}
                      className="space-y-1"
                      onMouseEnter={() => setFocusedCategory(cat)}
                    >
                      <label className="block text-[11px] font-mono font-semibold uppercase text-[#5A5C60] flex items-center justify-between">
                        <span>{category.label}</span>
                        {focusedCategory === cat && (
                          <span className="text-[10px] text-[#C83E2B] font-bold">Highlighted in Visualizer</span>
                        )}
                      </label>
                      <select
                        value={(currentModel.cfg as any)[cat]}
                        disabled={isLocked}
                        onFocus={() => setFocusedCategory(cat)}
                        onChange={(e) => handleCfgChange(cat, e.target.value)}
                        className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg font-medium text-[#1F2022] focus:outline-none focus:border-[#C83E2B] focus:bg-white transition"
                      >
                        {category.opts.map((o) => {
                          const isReqOk = !o.req || o.req(currentModel);
                          return (
                            <option
                              key={o.id}
                              value={o.id}
                              disabled={!isReqOk}
                            >
                              {o.name} · {o.cost === 0 ? "Incl." : fmtRs(o.cost)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Value-Add Options */}
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
              <h3 className="text-sm font-bold text-[#1F2022] uppercase font-mono tracking-wider mb-3">
                Value-Added Options & Accessories
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ADDONS.map((a) => {
                  const isReqOk = !a.req || a.req(currentModel);
                  const isChecked = currentModel.add[a.id];
                  return (
                    <label
                      key={a.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition ${
                        !isReqOk
                          ? "opacity-40 cursor-not-allowed border-[#E0DCD3] bg-[#FAF8F5]"
                          : isChecked
                          ? "border-blue-500 bg-blue-50 text-blue-900 font-medium"
                          : "border-[#E0DCD3] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isReqOk || isLocked}
                        onChange={() => handleAddonToggle(a.id)}
                        className="accent-blue-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{a.name}</div>
                        <div className="text-[10px] text-[#5A5C60] font-mono">
                          +{fmtRs(a.cost)}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Proprietary R&D Component Specification */}
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-[#1F2022]">
                      Proprietary R&D Components & Tech Upgrades
                    </h3>
                    <p className="text-xs text-[#5A5C60]">
                      Technologies developed in your lab or acquired via licensing. Toggle equipped tech for <strong>{currentModel.name}</strong>.
                    </p>
                  </div>
                </div>
                <div className="text-xs font-mono font-semibold px-2.5 py-1 bg-purple-50 text-purple-800 rounded-md border border-purple-200">
                  {team.techs.length} / {TECHS.length} Techs Unlocked
                </div>
              </div>

              {team.techs.length === 0 && (
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-dashed border-[#E0DCD3] text-center space-y-1.5">
                  <FlaskConical className="w-8 h-8 text-[#5A5C60] mx-auto" />
                  <div className="text-xs font-semibold text-[#1F2022]">
                    No Proprietary R&D Components Developed Yet
                  </div>
                  <div className="text-[11px] text-[#5A5C60] max-w-md mx-auto leading-relaxed">
                    Initiate research projects or purchase technology licenses in the <strong>R&D Tab</strong> to unlock high-performance components (HyperCharge, ADAS, Solid-State Battery, etc.) for product development.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TECHS.map((tc) => {
                  const isOwned = team.techs.includes(tc.id);
                  const inProgress = team.rnd.find((p) => p.id === tc.id);
                  const pendingStarts = (team.dec as any).rndStarts || [];
                  const isPending = pendingStarts.find((p: any) => p.id === tc.id);

                  // Current model equipped state (default to all owned techs if equippedTechs is undefined)
                  const equippedList = currentModel.equippedTechs ?? [...team.techs];
                  const isEquipped = isOwned && equippedList.includes(tc.id);

                  return (
                    <div
                      key={tc.id}
                      className={`p-3 rounded-xl border text-xs transition flex flex-col justify-between gap-2.5 ${
                        isEquipped
                          ? "border-blue-500 bg-blue-50 text-blue-950 shadow-sm"
                          : isOwned
                          ? "border-emerald-300 bg-emerald-50/50 text-[#1F2022]"
                          : inProgress || isPending
                          ? "border-amber-300 bg-amber-50/50 text-[#1F2022] opacity-80"
                          : "border-[#E0DCD3] bg-[#FAF8F5] text-[#5A5C60] opacity-60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-xs truncate">{tc.name}</span>
                          {isOwned ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 rounded-full shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Unlocked
                            </span>
                          ) : inProgress ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-100 text-amber-800 rounded-full shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Ready Q{inProgress.qDone}
                            </span>
                          ) : isPending ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-100 text-purple-800 rounded-full shrink-0 flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Queued
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-200 text-slate-600 rounded-full shrink-0 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] leading-tight text-[#5A5C60] mb-2">
                          {tc.note}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#E0DCD3] flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(tc.fx).map(([stat, val]) => (
                            <span
                              key={stat}
                              className="px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-[#E0DCD3] text-purple-800 font-semibold uppercase"
                            >
                              +{val} {stat}
                            </span>
                          ))}
                        </div>

                        {isOwned ? (
                          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                            <input
                              type="checkbox"
                              checked={isEquipped}
                              disabled={isLocked}
                              onChange={() => handleRndTechToggle(tc.id)}
                              className="accent-blue-600 rounded"
                            />
                            <span className="text-[11px] font-semibold text-blue-700">
                              {isEquipped ? "Equipped" : "Equip"}
                            </span>
                          </label>
                        ) : (
                          <span className="text-[10px] italic text-[#5A5C60] shrink-0">
                            Develop in R&D
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Visualizer, Costing, and Segment Fit */}
          <div className="space-y-6">
            {/* Visual Preview Card */}
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm text-center">
              <h3 className="text-xs font-mono font-semibold uppercase text-[#5A5C60] mb-3">
                2D Vehicle Visualizer
              </h3>
              <ScooterVisualizer
                model={currentModel}
                color={team.color}
                width={300}
                showDetails={false}
                activeCategory={focusedCategory}
              />
              <div className="mt-4 font-bold text-lg text-[#1F2022]">
                {currentModel.name}
              </div>

              {/* Equipped Proprietary R&D Tech Badges */}
              {(() => {
                const activeEquippedIds = (currentModel.equippedTechs ?? team.techs).filter((id) =>
                  team.techs.includes(id)
                );
                if (activeEquippedIds.length === 0) return null;
                return (
                  <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                    {activeEquippedIds.map((id) => {
                      const tc = techById(id);
                      if (!tc) return null;
                      return (
                        <span
                          key={id}
                          className="px-2 py-0.5 text-[10px] font-mono font-medium bg-purple-100 text-purple-800 rounded border border-purple-200 flex items-center gap-1 shadow-sm"
                        >
                          <Zap className="w-3 h-3 text-purple-600" />
                          {tc.name}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Financial Unit Economics */}
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase text-[#5A5C60]">
                Unit Economics & Margin
              </h3>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
                  <span className="text-[#5A5C60]">BOM Materials & Assembly:</span>
                  <span className="font-bold text-[#1F2022]">{fmtRs(currentCost)}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#E0DCD3]">
                  <span className="text-[#5A5C60]">Retail Selling Price:</span>
                  <div className="flex items-center gap-1">
                    <span>Rs.</span>
                    <input
                      type="number"
                      value={currentModel.price}
                      min={55000}
                      max={200000}
                      step={500}
                      disabled={isLocked}
                      onChange={(e) => handlePriceChange(+e.target.value)}
                      className="w-24 p-1 text-right border border-[#E0DCD3] rounded font-bold bg-[#FAF8F5] text-[#1F2022]"
                    />
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
                  <span className="text-[#5A5C60]">Gross Contribution / Unit:</span>
                  <span className={`font-bold ${margin <= 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {fmtRs(margin)} ({marginPct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {marginPct < 12 && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Warning: Gross margin is below 12%. The auditor requires at least 12% margin to cover fixed operating overhead.
                  </span>
                </div>
              )}
            </div>

            {/* Segment Fit Preview */}
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase text-[#5A5C60]">
                Segment Fit Ratings (0.00 - 1.00)
              </h3>

              <div className="space-y-2">
                {SEGMENTS.map((s) => {
                  const qScore = qualityFit(scores, s);
                  const pScore = priceFit(currentModel.price, s);
                  const isPrim = team.prim === s.id;
                  const isSec = team.sec === s.id;

                  return (
                    <div
                      key={s.id}
                      className={`p-2 rounded-lg border text-xs ${
                        isPrim
                          ? "border-emerald-500 bg-emerald-50/50"
                          : isSec
                          ? "border-blue-500 bg-blue-50/50"
                          : "border-[#E0DCD3]"
                      }`}
                    >
                      <div className="flex justify-between font-semibold mb-1">
                        <span>
                          {s.name} {isPrim && "◂ Primary"} {isSec && "◂ Secondary"}
                        </span>
                        <span className="font-mono">
                          Quality {qScore.toFixed(2)} | Price {pScore.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${Math.min(100, qScore * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENAME BRAND MODAL */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-base text-[#1F2022]">Rename Model Brand</h3>
              </div>
              <button onClick={() => setIsRenameModalOpen(false)} className="p-1 text-[#8A8C90] hover:text-[#1F2022]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Brand / Model Name (BOM Specification)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={30}
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="e.g. Aurora X200, Zip Pro, Metro Glide"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-medium text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                />
                <p className="text-[11px] text-[#8A8C90] mt-1">
                  This brand name will appear in advertisement claims, market share reports, and customer choice matrices.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] text-[#1F2022] font-semibold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white font-semibold rounded-lg text-xs transition shadow-2xs"
                >
                  Save Brand Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LAUNCH NEW MODEL MODAL */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-base text-[#1F2022]">Launch New Scooter Model</h3>
              </div>
              <button onClick={() => setIsLaunchModalOpen(false)} className="p-1 text-[#8A8C90] hover:text-[#1F2022]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLaunchModel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Model Brand Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={30}
                  value={launchNameInput}
                  onChange={(e) => setLaunchNameInput(e.target.value)}
                  placeholder="e.g. Model 2, Urban Cruiser"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-medium text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                />
                <p className="text-[11px] text-[#8A8C90] mt-1">
                  Launching a new product line adds a Rs. 50 L R&D tooling charge for this quarter.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] text-[#1F2022] font-semibold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white font-semibold rounded-lg text-xs transition shadow-2xs"
                >
                  Launch Model (Rs. 50 L)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
