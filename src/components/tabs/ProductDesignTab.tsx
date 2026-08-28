import React, { useState } from "react";
import { TeamState, ScooterModel, AddonId, SegmentDef } from "../../types/simulation";
import { CATALOG, ADDONS, TECHS, techById, SEGMENTS, ARCHETYPES, TEAM_COLORS, CLAIMS, fmtRs } from "../../engine/catalog";
import { scoreModel, qualityFit, enforceModelRules, mkModel, unitCost } from "../../engine/simulationEngine";
import { jaroWinklerSimilarity } from "../../lib/jaroWinkler";
import { ScooterVisualizer } from "../ScooterVisualizer";
import { Plus, Edit3, AlertCircle, Wrench, Cpu, Zap, CheckCircle2, Clock, Lock, FlaskConical, X } from "lucide-react";

interface ProductDesignTabProps {
  team: TeamState;
  onChange: (updatedTeam: TeamState) => void;
  onNotify: (msg: string) => void;
}

const SHORT_BENEFIT: Record<string, string> = {
  perf: "Performance",
  range: "Range",
  charge: "Charging",
  tech: "Tech",
  build: "Build",
  comfort: "Comfort",
  safety: "Safety",
  econ: "Economy"
};

const SEGMENT_COLORS: Record<string, string> = {
  S1: "#3B82F6",
  S2: "#10B981",
  S3: "#22C55E",
  S4: "#F59E0B",
  S5: "#8B5CF6"
};

const fitColor = (score: number) => (score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444");

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

  // New-brand inline creation form (left column)
  const [showAddBrandForm, setShowAddBrandForm] = useState<boolean>(false);
  const [newBrandSegmentId, setNewBrandSegmentId] = useState<string>("");
  const [newBrandName, setNewBrandName] = useState<string>("");

  const currentModel = team.models[activeModelIdx] || team.models[0];

  // Segment currently selected in the left-column segment picker
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(
    () => currentModel?.targetSegment ?? SEGMENTS[0].id
  );

  React.useEffect(() => {
    setSelectedSegmentId(currentModel?.targetSegment ?? SEGMENTS[0].id);
  }, [activeModelIdx, currentModel?.id, currentModel?.targetSegment]);

  const handleSegmentCardClick = (segId: string) => {
    setSelectedSegmentId(segId);
    const matchIdx = team.models.findIndex((m) => (m.targetSegment ?? "S2") === segId);
    if (matchIdx !== -1) setActiveModelIdx(matchIdx);
  };

  // Editable price text state to allow seamless typing and backspacing
  const [priceInput, setPriceInput] = useState<string>(() => String(currentModel?.price || 110000));

  // Sync priceInput when active model changes or on external model updates
  React.useEffect(() => {
    if (currentModel) {
      setPriceInput(String(currentModel.price));
    }
  }, [activeModelIdx, currentModel?.id, currentModel?.price]);

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

  const handleTargetSegmentChange = (segId: string) => {
    if (isLocked) return;
    const updatedModels = [...team.models];
    updatedModels[activeModelIdx] = { ...updatedModels[activeModelIdx], targetSegment: segId };
    onChange({ ...team, models: updatedModels });
  };

  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const raw = e.target.value;
    setPriceInput(raw);

    const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num) && num > 0) {
      const updatedModels = [...team.models];
      updatedModels[activeModelIdx] = {
        ...updatedModels[activeModelIdx],
        price: num
      };
      onChange({ ...team, models: updatedModels });
    }
  };

  const handlePriceInputBlur = () => {
    if (isLocked || !currentModel) return;
    const num = parseInt(priceInput.replace(/[^0-9]/g, ""), 10);
    let finalPrice = isNaN(num) ? 110000 : num;

    if (finalPrice < 55000) {
      finalPrice = 55000;
      onNotify("Minimum allowed Retail Selling Price is Rs. 55,000.");
    } else if (finalPrice > 200000) {
      finalPrice = 200000;
      onNotify("Maximum allowed Retail Selling Price is Rs. 2,00,000.");
    } else {
      // Round to nearest Rs. 500 for clean market pricing
      finalPrice = Math.round(finalPrice / 500) * 500;
    }

    setPriceInput(String(finalPrice));
    const updatedModels = [...team.models];
    updatedModels[activeModelIdx] = {
      ...updatedModels[activeModelIdx],
      price: finalPrice
    };
    onChange({ ...team, models: updatedModels });
  };

  const handlePriceStep = (delta: number) => {
    if (isLocked || !currentModel) return;
    const current = currentModel.price || 110000;
    const next = Math.max(55000, Math.min(200000, current + delta));
    setPriceInput(String(next));
    const updatedModels = [...team.models];
    updatedModels[activeModelIdx] = {
      ...updatedModels[activeModelIdx],
      price: next
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
      const trimmedName = renameInput.trim().substring(0, 30);
      const brandLoyaltyCarryOver = jaroWinklerSimilarity(currentModel.name, trimmedName) >= 0.6;
      const updatedModels = [...team.models];
      updatedModels[activeModelIdx] = {
        ...updatedModels[activeModelIdx],
        name: trimmedName,
        brandLoyaltyCarryOver
      };
      onChange({ ...team, models: updatedModels });
      onNotify(`Brand name updated to "${trimmedName}"`);
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

  const handleCreateBrandForSegment = () => {
    if (isLocked || team.models.length >= 3) return;
    if (!newBrandSegmentId || !newBrandName.trim()) return;

    const baseArch = ARCHETYPES.commuter;
    const modelName = newBrandName.trim() || `Model ${team.models.length + 1}`;
    const newM = mkModel(modelName, baseArch.cfg, ["boot"], 110000);
    newM.isNew = true;
    newM.targetSegment = newBrandSegmentId;

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
    setShowAddBrandForm(false);
    const targetName = SEGMENTS.find((s) => s.id === newBrandSegmentId)?.name || newBrandSegmentId;
    setNewBrandName("");
    setNewBrandSegmentId("");
    onNotify(`New brand "${modelName}" launched targeting ${targetName}! Rs. 50 L development charge applied.`);
  };

  const scores = currentModel ? scoreModel(currentModel, team) : {};
  const currentCost = currentModel ? unitCost(currentModel) : 0;
  const margin = currentModel ? currentModel.price - currentCost : 0;
  const marginPct = currentModel && currentModel.price > 0 ? (margin / currentModel.price) * 100 : 0;

  const targetSegId = currentModel ? currentModel.targetSegment ?? "S2" : "S2";
  const targetSeg: SegmentDef = SEGMENTS.find((s) => s.id === targetSegId) || SEGMENTS[1];
  const topBenefitEntries = Object.entries(targetSeg.w).sort(([, a], [, b]) => b - a);
  const topBenefitKey = topBenefitEntries[0]?.[0] || "perf";
  const currentTopBenefitScore = scores[topBenefitKey] || 0;

  // Segment picked in the left-column card — drives the context banner
  const bannerSeg: SegmentDef = SEGMENTS.find((s) => s.id === selectedSegmentId) || targetSeg;
  const bannerTop2 = Object.entries(bannerSeg.w)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key, val]) => `${CLAIMS[key] ?? key}: ${val}`);

  const isOptionBetter = (cat: string, optId: string): boolean => {
    if (!currentModel) return false;
    if ((currentModel.cfg as any)[cat] === optId) return false;
    const hypCfg: any = { ...currentModel.cfg, [cat]: optId };
    const hypothetical: ScooterModel = { ...currentModel, cfg: hypCfg };
    const hypScores = scoreModel(hypothetical, team);
    return (hypScores[topBenefitKey] || 0) > currentTopBenefitScore;
  };

  const bestUpgrade = (() => {
    if (!currentModel) return null;
    const baseFit = qualityFit(scores, targetSeg);
    let best: { cat: string; delta: number } | null = null;
    for (const cat of Object.keys(CATALOG)) {
      const category = CATALOG[cat];
      const currentOptId = (currentModel.cfg as any)[cat];
      const currentOpt = category.opts.find((o) => o.id === currentOptId);
      if (!currentOpt) continue;
      const candidates = category.opts.filter((o) => o.cost > currentOpt.cost && (!o.req || o.req(currentModel)));
      if (candidates.length === 0) continue;
      const nextOpt = candidates.reduce((min, o) => (o.cost < min.cost ? o : min));
      const hypCfg: any = { ...currentModel.cfg, [cat]: nextOpt.id };
      const hypothetical: ScooterModel = { ...currentModel, cfg: hypCfg };
      const hypScores = scoreModel(hypothetical, team);
      const delta = qualityFit(hypScores, targetSeg) - baseFit;
      if (delta > 0 && (!best || delta > best.delta)) {
        best = { cat, delta };
      }
    }
    return best;
  })();

  const currentTargetFitPct = Math.round(qualityFit(scores, targetSeg) * 100);

  const unassignedSegments = SEGMENTS.filter(
    (s) => !team.models.find((m) => (m.targetSegment ?? "S2") === s.id)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1F2022] font-mono uppercase tracking-wider">Brand Portfolio</h2>
        {team.models.length < 3 && !isLocked && (
          <button
            onClick={openLaunchModal}
            className="px-3.5 py-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Launch Model ({team.models.length}/3)
          </button>
        )}
      </div>

      {/* Portfolio Coverage Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="text-[10px] font-mono font-semibold uppercase text-[#5A5C60] mb-2">
          Portfolio Coverage — models targeting each segment
        </div>
        <div className="flex gap-2">
          {SEGMENTS.map((segment) => {
            const count = team.models.filter((m) => (m.targetSegment ?? "S2") === segment.id).length;
            const fillPct = team.models.length > 0 ? Math.min(100, (count / team.models.length) * 100) : 0;
            const segColor = SEGMENT_COLORS[segment.id] || "#8A8C90";
            return (
              <div key={segment.id} className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[9px] text-[#5A5C60] mb-1">
                  <span className="truncate">{segment.name}</span>
                  <span className="font-mono font-semibold shrink-0 ml-1">{count}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full overflow-hidden" style={{ height: 8 }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${fillPct}%`, backgroundColor: count > 0 ? segColor : "#D6D3D1" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {currentModel && (
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 240px", gap: "12px" }}>
          {/* LEFT COLUMN: Segment Picker */}
          <div className="space-y-2">
            {SEGMENTS.map((segment) => {
              const modelsForSeg = team.models.filter((m) => (m.targetSegment ?? "S2") === segment.id);
              const coverage = modelsForSeg.length;
              const isSelected = selectedSegmentId === segment.id;
              const segColor = SEGMENT_COLORS[segment.id] || "#8A8C90";

              return (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => handleSegmentCardClick(segment.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition ${
                    isSelected ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-[#E5E1D8] bg-white hover:bg-[#FAF8F5]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: segColor }} />
                    <span className="text-xs font-medium text-[#1F2022] truncate">{segment.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[#8A8C90] shrink-0">Your coverage</span>
                    <div className="flex-1 bg-slate-200 rounded-full overflow-hidden" style={{ height: 4 }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${team.models.length > 0 ? Math.min(100, (coverage / team.models.length) * 100) : 0}%`,
                          backgroundColor: coverage > 0 ? segColor : "#D6D3D1"
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono font-semibold text-[#5A5C60] shrink-0">
                      {coverage}/{team.models.length}
                    </span>
                  </div>
                  {coverage > 0 && (
                    <div className="text-[10px] text-[#5A5C60] mt-1 truncate">
                      {modelsForSeg.map((m) => m.name).join(", ")}
                    </div>
                  )}
                </button>
              );
            })}

            {!showAddBrandForm ? (
              team.models.length < 3 &&
              !isLocked && (
                <button
                  type="button"
                  onClick={() => setShowAddBrandForm(true)}
                  className="w-full px-3 py-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add brand for new segment
                </button>
              )
            ) : (
              <div className="p-3 bg-white border border-[#E0DCD3] rounded-lg space-y-2">
                <div className="text-[10px] font-mono font-semibold uppercase text-[#5A5C60]">
                  New brand segment
                </div>
                <div className="flex flex-wrap gap-1">
                  {unassignedSegments.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setNewBrandSegmentId(s.id)}
                      className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition ${
                        newBrandSegmentId === s.id
                          ? "bg-[#1F2022] text-white border-[#1F2022]"
                          : "bg-[#FAF8F5] text-[#1F2022] border-[#E0DCD3] hover:bg-slate-100"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Brand name"
                  maxLength={30}
                  className="w-full px-2 py-1.5 text-xs border border-[#E0DCD3] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#1F2022]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!newBrandSegmentId || !newBrandName.trim()}
                    onClick={handleCreateBrandForSegment}
                    className="flex-1 px-3 py-1.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold rounded-lg disabled:opacity-40 transition"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBrandForm(false);
                      setNewBrandName("");
                      setNewBrandSegmentId("");
                    }}
                    className="px-3 py-1.5 bg-white border border-[#E0DCD3] text-xs font-semibold rounded-lg hover:bg-[#FAF8F5]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CENTRE COLUMN: Component Editor */}
          <div className="space-y-4 min-w-0">
            {/* Model tab strip — pick which brand is being edited */}
            {team.models.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {team.models.map((m, idx) => {
                  const isActive = idx === activeModelIdx;
                  const dotColor = TEAM_COLORS[idx % TEAM_COLORS.length];
                  return (
                    <button
                      key={m.id || idx}
                      type="button"
                      onClick={() => setActiveModelIdx(idx)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition flex items-center gap-1.5 ${
                        isActive
                          ? "border-[#3B82F6] bg-[#EFF6FF] text-[#1F2022]"
                          : "border-[#E0DCD3] bg-white text-[#5A5C60] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Header: brand name + segment badge + segment selector + rename */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[13px] font-bold text-[#1F2022] truncate">{currentModel.name}</span>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#EAF3DE] text-[#1A4731] border border-[#27500A] whitespace-nowrap">
                  Targeting: {targetSeg.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-mono text-[#5A5C60]">Target segment:</label>
                <select
                  value={targetSegId}
                  disabled={isLocked}
                  onChange={(e) => handleTargetSegmentChange(e.target.value)}
                  className="px-2 py-1 text-xs bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg font-medium text-[#1F2022] focus:outline-none focus:border-[#C83E2B]"
                >
                  {SEGMENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={openRenameModal}
                  disabled={isLocked}
                  className="px-3 py-1 bg-[#FAF8F5] hover:bg-slate-100 text-[#1F2022] border border-[#E0DCD3] text-xs font-semibold rounded-lg transition flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Rename
                </button>
              </div>
            </div>

            {/* Segment context banner — reflects the segment picked in the left column */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-3 py-2 text-xs text-[#1F2022]">
              <strong>{bannerSeg.name}</strong> — top priorities: {bannerTop2.join(" · ")}
            </div>

            {/* Unit Economics & Pricing */}
            <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-sm space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase text-[#5A5C60]">
                Unit Economics & Margin
              </h3>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#E0DCD3]">
                  <span className="text-[#5A5C60]">BOM Materials & Assembly:</span>
                  <span className="font-bold text-[#1F2022]">{fmtRs(currentCost)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-[#E0DCD3]">
                  <div>
                    <span className="text-[#5A5C60] font-semibold">Retail Selling Price:</span>
                    <div className="text-[10px] text-[#8A8C90]">Type price directly or use ±500</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#5A5C60] font-mono text-xs">Rs.</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={priceInput}
                      disabled={isLocked}
                      onChange={handlePriceInputChange}
                      onBlur={handlePriceInputBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          handlePriceStep(500);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          handlePriceStep(-500);
                        }
                      }}
                      placeholder="110000"
                      className="w-24 px-2 py-1 text-right border border-[#E0DCD3] rounded-lg font-bold font-mono bg-white text-[#1F2022] focus:outline-none focus:ring-2 focus:ring-[#C83E2B]/30 focus:border-[#C83E2B] transition shadow-2xs"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={isLocked || currentModel.price >= 200000}
                        onClick={() => handlePriceStep(500)}
                        className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FAF8F5] hover:bg-slate-200 text-[#1F2022] border border-[#E0DCD3] rounded leading-none disabled:opacity-40 transition cursor-pointer"
                        title="Increase price by Rs. 500 (or press Up arrow)"
                      >
                        +500
                      </button>
                      <button
                        type="button"
                        disabled={isLocked || currentModel.price <= 55000}
                        onClick={() => handlePriceStep(-500)}
                        className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FAF8F5] hover:bg-slate-200 text-[#1F2022] border border-[#E0DCD3] rounded leading-none disabled:opacity-40 transition cursor-pointer"
                        title="Decrease price by Rs. 500 (or press Down arrow)"
                      >
                        -500
                      </button>
                    </div>
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
                    Warning: Gross margin is below 12%. The auditor requires at least 12% margin to cover fixed
                    operating overhead.
                  </span>
                </div>
              )}
            </div>

            {/* Core Component Specs */}
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-[#1F2022]">
                  BOM Component Specification
                </h3>
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
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {category.opts.map((o) => {
                          const isReqOk = !o.req || o.req(currentModel);
                          const isSelected = (currentModel.cfg as any)[cat] === o.id;
                          const isBetter = !isSelected && isReqOk && isOptionBetter(cat, o.id);
                          const disabled = isLocked || !isReqOk;

                          return (
                            <button
                              key={o.id}
                              type="button"
                              disabled={disabled}
                              onFocus={() => setFocusedCategory(cat)}
                              onClick={() => handleCfgChange(cat, o.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[11px] transition ${
                                isSelected
                                  ? "border-[#C83E2B] bg-[#FDEEE9] font-semibold text-[#1F2022]"
                                  : !isReqOk
                                  ? "border-[#E0DCD3] bg-[#F3F2EF] text-[#9CA3AF] cursor-not-allowed"
                                  : isLocked
                                  ? "border-[#E0DCD3] bg-[#FAF8F5] text-[#1F2022] opacity-60 cursor-not-allowed"
                                  : "border-[#E0DCD3] bg-white hover:bg-[#FAF8F5] text-[#1F2022]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">{o.name}</span>
                                <span className="font-mono text-[10px] shrink-0">
                                  {o.cost === 0 ? "Incl." : fmtRs(o.cost)}
                                </span>
                              </div>
                              {!isReqOk ? (
                                <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF] mt-0.5">
                                  <Lock className="w-3 h-3" /> Unlock via R&D
                                </div>
                              ) : isBetter ? (
                                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                  ✓ Better {SHORT_BENEFIT[topBenefitKey] ?? topBenefitKey}
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
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
          </div>

          {/* RIGHT COLUMN: All-segment fit panel */}
          <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-sm space-y-3 h-fit">
            <div>
              <h3 className="text-xs font-bold text-[#1F2022]">Segment fit — {currentModel.name}</h3>
              <p className="text-[10px] text-[#5A5C60] mt-0.5">How this brand scores across all 5 segments</p>
            </div>

            <div className="space-y-2.5">
              {SEGMENTS.map((seg) => {
                const fit = Math.round(qualityFit(scores, seg) * 100);
                const color = fitColor(fit);
                const isTarget = targetSegId === seg.id;
                return (
                  <div key={seg.id}>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-medium text-[#1F2022] truncate">
                        {seg.name} {isTarget && <span className="text-amber-500">★</span>}
                      </span>
                      <span className="font-mono font-semibold shrink-0" style={{ color }}>
                        {fit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full overflow-hidden" style={{ height: 6 }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, fit))}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {bestUpgrade && currentTargetFitPct < 70 && (
              <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-lg px-3 py-2 text-[11px] text-amber-900">
                Tip: upgrading {CATALOG[bestUpgrade.cat].label} could push {targetSeg.name} fit above 70.
              </div>
            )}
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

              {(() => {
                const priorName = currentModel?.name || "";
                const similarity = renameInput.trim() && priorName ? jaroWinklerSimilarity(priorName, renameInput.trim()) : 0;
                const isExtension = similarity >= 0.6;
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#5A5C60] font-medium">
                      <span>Brand continuity: {Math.round(similarity * 100)}%</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isExtension ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isExtension ? "✓ Line extension — demand head-start applies" : "◌ New brand — starts with no inherited awareness"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8A8C90]">
                      e.g. ZapX → ZapX Pro qualifies. ZapX → ThunderBolt does not.
                    </p>
                  </div>
                );
              })()}

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
