import React, { Suspense, lazy, useState } from "react";
import { TeamState, ScooterModel, AddonId, SegmentDef } from "../../types/simulation";
import { CATALOG, ADDONS, TECHS, techById, SEGMENTS, SEG_NEEDS, ARCHETYPES, BALANCE, fmtRs } from "../../engine/catalog";
import { scoreModel, qualityFit, priceFit, enforceModelRules, mkModel, unitCost } from "../../engine/simulationEngine";
import { jaroWinklerSimilarity } from "../../lib/jaroWinkler";
import { ScooterVisualizer } from "../ScooterVisualizer";
import { SectionTabs } from "../SectionTabs";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
import { Plus, Edit3, AlertCircle, Zap, CheckCircle2, Clock, Lock, FlaskConical, X } from "lucide-react";

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

// three.js is large; the studio controls render first and the 3D view streams in
const Vehicle3D = lazy(() => import("../Vehicle3D"));

const COST_COLORS = ["#A8A29E", "#C2410C", "#7C3AED", "#0E7490", "#2563EB", "#57534E", "#64748B", "#B91C1C", "#A16207", "#15803D", "#DB2777"];

export const ProductDesignTab: React.FC<ProductDesignTabProps> = ({
  team,
  onChange,
  onNotify
}) => {
  const [activeModelIdx, setActiveModelIdx] = useState<number>(0);
  const [focusedCategory, setFocusedCategory] = useState<string | undefined>(undefined);
  const [drawer, setDrawer] = useState<"addons" | "tech" | "portfolio">("addons");
  const isLocked = team.dec.locked;

  // Custom modal state for renaming and launching models
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>("");

  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState<boolean>(false);
  const [launchNameInput, setLaunchNameInput] = useState<string>("");

  // New-brand inline creation form (left column)
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

  const categoryNames: Record<string, string> = Object.fromEntries(Object.entries(CATALOG).map(([k, c]) => [k, c.label]));
  const shortLabels: Record<string, string> = currentModel
    ? Object.fromEntries(
        Object.keys(CATALOG).map((cat) => {
          const opt = CATALOG[cat].opts.find((o) => o.id === (currentModel.cfg as any)[cat]);
          return [cat, opt ? opt.name.split(" · ")[0].split(" (")[0] : ""];
        })
      )
    : {};

  // What switching one component would do: cost, attribute and target-fit deltas
  const optionImpact = (cat: string, optId: string) => {
    const hyp: ScooterModel = { ...currentModel, cfg: { ...currentModel.cfg, [cat]: optId } as any, add: { ...currentModel.add } };
    enforceModelRules(hyp);
    const hypScores = scoreModel(hyp, team);
    const attrs = Object.keys(SHORT_BENEFIT)
      .map((k) => ({ k, d: (hypScores[k] || 0) - (scores[k] || 0) }))
      .filter((x) => Math.abs(x.d) >= 0.05)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    return {
      cost: unitCost(hyp) - currentCost,
      fit: Math.round(qualityFit(hypScores, targetSeg) * 100) - currentTargetFitPct,
      attrs
    };
  };

  const price = currentModel?.price || 0;
  const pFit = currentModel ? priceFit(price, targetSeg) : 0;
  const PRICE_MIN = 55000;
  const PRICE_MAX = 200000;
  const pricePct = (p: number) => ((Math.max(PRICE_MIN, Math.min(PRICE_MAX, p)) - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  const costRows = currentModel
    ? [
        { key: "platform", label: "Platform & assembly", cost: BALANCE.basePlatform + BALANCE.assembly },
        ...Object.keys(CATALOG).map((cat) => ({
          key: cat,
          label: CATALOG[cat].label,
          cost: CATALOG[cat].opts.find((o) => o.id === (currentModel.cfg as any)[cat])?.cost || 0
        })),
        { key: "addons", label: "Add-ons", cost: ADDONS.filter((a) => currentModel.add[a.id]).reduce((s, a) => s + a.cost, 0) }
      ].filter((r) => r.cost > 0)
    : [];
  const batteryShare = currentCost > 0 ? ((costRows.find((r) => r.key === "battery")?.cost || 0) / currentCost) * 100 : 0;

  const radarData = Object.keys(SHORT_BENEFIT).map((k) => {
    const maxW = Math.max(...Object.values(targetSeg.w));
    return { attr: SHORT_BENEFIT[k], model: +(scores[k] || 0).toFixed(1), need: +(((targetSeg.w[k] || 0) / maxW) * 10).toFixed(1) };
  });

  return (
    <div className="space-y-4">
      {/* Brand strip: which model is on the bench, its target and launch */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#F3F0EA] rounded-lg">
          {team.models.map((m, idx) => {
            const isActive = idx === activeModelIdx;
            return (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => setActiveModelIdx(idx)}
                className={`px-3 py-1.5 rounded-md text-sm transition flex items-center gap-1.5 ${
                  isActive ? "bg-white text-[#1F2022] font-semibold shadow-sm" : "text-[#5A5C60] hover:text-[#1F2022]"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEGMENT_COLORS[m.targetSegment ?? "S2"] }} />
                {m.name}
              </button>
            );
          })}
        </div>
        {team.models.length < 3 && !isLocked && (
          <button
            onClick={openLaunchModal}
            className="px-3 py-1.5 text-[#1F2022] border border-dashed border-[#C9C3B9] rounded-lg text-xs font-semibold hover:bg-white transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New model ({team.models.length}/3)
          </button>
        )}
        {currentModel && (
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-[#5A5C60]" htmlFor="target-seg">
              Target
            </label>
            <select
              id="target-seg"
              value={targetSegId}
              disabled={isLocked}
              onChange={(e) => handleTargetSegmentChange(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white border border-[#E0DCD3] rounded-lg font-semibold text-[#1F2022] focus:outline-none focus:border-[#C83E2B]"
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
              className="px-2.5 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#1F2022] border border-[#E0DCD3] text-xs font-semibold rounded-lg transition flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" /> Rename
            </button>
          </div>
        )}
      </div>

      {currentModel && (
        <>
          {/* STUDIO: the vehicle and the component inspector side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3">
            <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-2 space-y-2 min-w-0">
              <Suspense fallback={<div className="h-[420px] rounded-xl bg-[#F4F0E8] grid place-items-center text-xs text-[#8A8C90]">Loading 3D studio…</div>}>
              <Vehicle3D
                model={currentModel}
                color={team.color}
                activeCategory={focusedCategory}
                onSelectCategory={setFocusedCategory}
                labels={shortLabels}
                categoryNames={categoryNames}
                height={420}
                fallback={<ScooterVisualizer model={currentModel} color={team.color} width={420} showDetails={false} activeCategory={focusedCategory} />}
              />
              </Suspense>
              {/* Spec sheet strip under the render */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-1 pb-1">
                {[
                  { label: "Unit cost", value: fmtRs(currentCost), tone: "text-[#1F2022]" },
                  { label: "Retail price", value: fmtRs(price), tone: "text-[#1F2022]" },
                  { label: "Gross margin", value: `${marginPct.toFixed(1)}%`, tone: marginPct < 12 ? "text-red-600" : "text-emerald-700" },
                  { label: `${targetSeg.name} fit`, value: `${currentTargetFitPct} / 100`, tone: currentTargetFitPct >= 70 ? "text-emerald-700" : currentTargetFitPct >= 40 ? "text-amber-700" : "text-red-600" }
                ].map((k) => (
                  <div key={k.label} className="px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#EFEBE3]">
                    <div className="text-[10px] text-[#6C6D70]">{k.label}</div>
                    <div className={`text-sm font-bold font-mono ${k.tone}`}>{k.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* INSPECTOR */}
            <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm flex flex-col min-h-0 lg:h-[496px]">
              {!focusedCategory || !CATALOG[focusedCategory] ? (
                <>
                  <div className="px-4 pt-4 pb-2">
                    <h3 className="text-sm font-bold text-[#1F2022]">Bill of materials</h3>
                    <p className="text-[11px] text-[#6C6D70]">Pick a component, here or on the vehicle, to compare its options.</p>
                  </div>
                  <ul className="flex-1 overflow-y-auto px-2 pb-2">
                    {Object.keys(CATALOG).map((cat, idx) => {
                      const opt = CATALOG[cat].opts.find((o) => o.id === (currentModel.cfg as any)[cat]);
                      return (
                        <li key={cat}>
                          <button
                            type="button"
                            onClick={() => setFocusedCategory(cat)}
                            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#FAF8F5] text-left transition"
                          >
                            <span className="w-5 h-5 rounded-full border-2 border-[#C83E2B] text-[10px] font-bold grid place-items-center shrink-0">{idx + 1}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[11px] text-[#6C6D70]">{CATALOG[cat].label}</span>
                              <span className="block text-xs font-semibold text-[#1F2022] truncate">{opt?.name}</span>
                            </span>
                            <span className="text-[11px] font-mono text-[#5A5C60] shrink-0">{opt && opt.cost > 0 ? fmtRs(opt.cost) : "Incl."}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <>
                  <div className="px-4 pt-3 pb-2 border-b border-[#EFEBE3]">
                    <button type="button" onClick={() => setFocusedCategory(undefined)} className="text-[11px] text-[#5A5C60] hover:text-[#1F2022]">
                      ← All components
                    </button>
                    <h3 className="text-sm font-bold text-[#1F2022] mt-0.5">{CATALOG[focusedCategory].label}</h3>
                    <p className="text-[11px] text-[#6C6D70]">Deltas versus the current build. Fit is for {targetSeg.name}.</p>
                  </div>
                  <ul className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {CATALOG[focusedCategory].opts.map((o) => {
                      const isReqOk = !o.req || o.req(currentModel);
                      const isSelected = (currentModel.cfg as any)[focusedCategory] === o.id;
                      const impact = isSelected ? null : optionImpact(focusedCategory, o.id);
                      return (
                        <li key={o.id}>
                          <button
                            type="button"
                            disabled={isLocked || !isReqOk || isSelected}
                            onClick={() => handleCfgChange(focusedCategory, o.id)}
                            className={`w-full text-left p-2.5 rounded-lg border transition ${
                              isSelected
                                ? "border-[#C83E2B] bg-[#FDEEE9]"
                                : !isReqOk
                                ? "border-[#E0DCD3] bg-[#F3F2EF] text-[#9CA3AF] cursor-not-allowed"
                                : "border-[#E0DCD3] bg-white hover:border-[#1F2022] disabled:opacity-60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold leading-snug">{o.name}</span>
                              <span className="font-mono text-[11px] shrink-0">{o.cost === 0 ? "Incl." : fmtRs(o.cost)}</span>
                            </div>
                            {isSelected ? (
                              <div className="text-[10px] font-semibold text-[#C83E2B] mt-1">Fitted</div>
                            ) : !isReqOk ? (
                              <div className="flex items-center gap-1 text-[10px] mt-1">
                                <Lock className="w-3 h-3" /> Needs a stronger powertrain
                              </div>
                            ) : (
                              impact && (
                                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${impact.cost > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                                    {impact.cost > 0 ? "+" : "−"}
                                    {fmtRs(Math.abs(impact.cost)).replace("Rs. ", "Rs ")}
                                  </span>
                                  {impact.fit !== 0 && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${impact.fit > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                      Fit {impact.fit > 0 ? "+" : ""}
                                      {impact.fit}
                                    </span>
                                  )}
                                  {impact.attrs.slice(0, 3).map((a) => (
                                    <span key={a.k} className={`px-1.5 py-0.5 rounded text-[10px] ${a.d > 0 ? "text-emerald-700" : "text-red-600"}`}>
                                      {SHORT_BENEFIT[a.k]} {a.d > 0 ? "▲" : "▼"}
                                      {Math.abs(a.d).toFixed(1)}
                                    </span>
                                  ))}
                                </div>
                              )
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* ANALYSIS: price against willingness to pay, where the cost goes, what the segment values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-sm space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-[#1F2022]">Price</h3>
                <span className="text-[11px] text-[#6C6D70]">
                  Price fit <strong className="text-[#1F2022]">{Math.round(pFit * 100)}%</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#5A5C60]">Rs.</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Retail selling price"
                  value={priceInput}
                  disabled={isLocked}
                  onChange={handlePriceInputChange}
                  onBlur={handlePriceInputBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      handlePriceStep(500);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      handlePriceStep(-500);
                    }
                  }}
                  className="w-28 px-2 py-1 text-right border border-[#E0DCD3] rounded-lg font-bold font-mono text-base bg-white text-[#1F2022] focus:outline-none focus:border-[#C83E2B]"
                />
                <span className={`ml-auto text-xs font-semibold font-mono ${margin <= 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {fmtRs(margin)} / unit
                </span>
              </div>
              {/* Price ruler: segment WTP band, unit cost and the 12% margin floor */}
              <div className="relative pt-5 pb-4">
                <div className="relative h-2 rounded-full bg-[#EDE9E1]">
                  <div
                    className="absolute inset-y-0 rounded-full"
                    style={{ left: `${pricePct(targetSeg.wtp[0])}%`, width: `${pricePct(targetSeg.wtp[1]) - pricePct(targetSeg.wtp[0])}%`, background: `${SEGMENT_COLORS[targetSegId]}55` }}
                  />
                  <div className="absolute -top-1 bottom-[-4px] w-0.5 bg-red-500" style={{ left: `${pricePct(currentCost)}%` }} title="Unit cost" />
                  <div className="absolute -top-1 bottom-[-4px] w-0.5 bg-amber-500" style={{ left: `${pricePct(currentCost / 0.88)}%` }} title="12% margin floor" />
                </div>
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={500}
                  value={price}
                  disabled={isLocked}
                  aria-label="Retail price slider"
                  onChange={(e) => {
                    setPriceInput(e.target.value);
                    const updatedModels = [...team.models];
                    updatedModels[activeModelIdx] = { ...updatedModels[activeModelIdx], price: +e.target.value };
                    onChange({ ...team, models: updatedModels });
                  }}
                  className="absolute inset-x-0 top-[14px] w-full accent-[#1F2022] bg-transparent"
                />
                <div className="absolute left-0 right-0 bottom-0 flex justify-between text-[9px] text-[#8A8C90] font-mono">
                  <span>55k</span>
                  <span>200k</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#5A5C60]">
                <span className="flex items-center gap-1">
                  <i className="w-3 h-2 rounded-sm" style={{ background: `${SEGMENT_COLORS[targetSegId]}55` }} />
                  {targetSeg.name} pays {Math.round(targetSeg.wtp[0] / 1000)}–{Math.round(targetSeg.wtp[1] / 1000)}k
                </span>
                <span className="flex items-center gap-1">
                  <i className="w-0.5 h-3 bg-red-500" /> Unit cost
                </span>
                <span className="flex items-center gap-1">
                  <i className="w-0.5 h-3 bg-amber-500" /> 12% margin floor
                </span>
              </div>
              {SEG_NEEDS[targetSegId] && (
                <p className="text-[11px] text-[#5A5C60] leading-snug border-t border-[#EFEBE3] pt-2">
                  <strong className="text-[#1F2022]">How {targetSeg.name} react to price.</strong> {SEG_NEEDS[targetSegId].price}
                </p>
              )}
              {marginPct < 12 && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Margin is below the auditor's 12% floor.
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-sm space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-[#1F2022]">Where the cost goes</h3>
                <span className="text-[11px] font-mono font-semibold text-[#1F2022]">{fmtRs(currentCost)}</span>
              </div>
              <div className="flex h-4 rounded-md overflow-hidden ring-1 ring-[#E5E1D8]" role="img" aria-label="Unit cost breakdown">
                {costRows.map((r, i) => (
                  <div
                    key={r.key}
                    title={`${r.label}: ${fmtRs(r.cost)}`}
                    onClick={() => CATALOG[r.key] && setFocusedCategory(r.key)}
                    className={CATALOG[r.key] ? "cursor-pointer hover:opacity-80" : ""}
                    style={{ width: `${(r.cost / currentCost) * 100}%`, background: COST_COLORS[i % COST_COLORS.length], outline: focusedCategory === r.key ? "2px solid #1F2022" : undefined, outlineOffset: -2 }}
                  />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {costRows
                  .map((r, i) => ({ ...r, color: COST_COLORS[i % COST_COLORS.length] }))
                  .sort((a, b) => b.cost - a.cost)
                  .slice(0, 8)
                  .map((r) => (
                    <li key={r.key} className="flex items-center gap-1.5 min-w-0">
                      <i className="w-2 h-2 rounded-sm shrink-0" style={{ background: r.color }} />
                      <span className="truncate text-[#5A5C60]">{r.label}</span>
                      <span className="ml-auto font-mono text-[#1F2022]">{Math.round((r.cost / currentCost) * 100)}%</span>
                    </li>
                  ))}
              </ul>
              <p className="text-[11px] text-[#6C6D70] leading-snug">
                The battery pack is <strong className="text-[#1F2022]">{batteryShare.toFixed(0)}%</strong> of unit cost. In real EV two-wheelers the pack is usually the largest single cost.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-sm">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-[#1F2022]">What {targetSeg.name} values</h3>
              </div>
              <div className="h-[170px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="#E5E1D8" />
                    <PolarAngleAxis dataKey="attr" tick={{ fontSize: 9, fill: "#5A5C60" }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar name="Importance to segment" dataKey="need" stroke={SEGMENT_COLORS[targetSegId]} fill={SEGMENT_COLORS[targetSegId]} fillOpacity={0.15} strokeDasharray="4 3" />
                    <Radar name={currentModel.name} dataKey="model" stroke="#1F2022" fill="#1F2022" fillOpacity={0.12} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 text-[10px] text-[#5A5C60] mb-2">
                <span className="flex items-center gap-1">
                  <i className="w-3 h-0.5 bg-[#1F2022]" /> {currentModel.name} (0–10)
                </span>
                <span className="flex items-center gap-1">
                  <i className="w-3 h-0.5" style={{ background: SEGMENT_COLORS[targetSegId] }} /> Importance (scaled)
                </span>
              </div>
              <div className="space-y-1">
                {SEGMENTS.map((seg) => {
                  const fit = Math.round(qualityFit(scores, seg) * 100);
                  return (
                    <div key={seg.id} className="flex items-center gap-2 text-[10px]">
                      <span className={`w-20 truncate ${seg.id === targetSegId ? "font-bold text-[#1F2022]" : "text-[#5A5C60]"}`}>{seg.name}</span>
                      <div className="flex-1 h-1.5 bg-[#EDE9E1] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${fit}%`, background: fitColor(fit) }} />
                      </div>
                      <span className="w-6 text-right font-mono" style={{ color: fitColor(fit) }}>
                        {fit}
                      </span>
                    </div>
                  );
                })}
              </div>
              {bestUpgrade && currentTargetFitPct < 70 && (
                <button
                  type="button"
                  onClick={() => setFocusedCategory(bestUpgrade.cat)}
                  className="mt-2 w-full text-left bg-[#FFFBEB] border border-[#FCD34D] rounded-lg px-2.5 py-1.5 text-[11px] text-amber-900 hover:bg-amber-100"
                >
                  Biggest lever: upgrading {CATALOG[bestUpgrade.cat].label} (+{Math.round(bestUpgrade.delta * 100)} fit) →
                </button>
              )}
            </div>
          </div>

          {/* DRAWER: accessories, technology and portfolio */}
          <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
            <div className="px-4 pt-3">
              <SectionTabs
                ariaLabel="More product decisions"
                active={drawer}
                onChange={setDrawer}
                groups={[
                  {
                    label: "Specification",
                    tabs: [
                      { key: "addons", label: "Add-ons", badge: `${ADDONS.filter((a) => currentModel.add[a.id]).length}` },
                      { key: "tech", label: "R&D technology", badge: `${team.techs.length}/${TECHS.length}` }
                    ]
                  },
                  { label: "Portfolio", tabs: [{ key: "portfolio", label: "Segment coverage" }] }
                ]}
              />
            </div>
            <div className="p-4">
              {drawer === "addons" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ADDONS.map((a) => {
                    const isReqOk = !a.req || a.req(currentModel);
                    const isChecked = currentModel.add[a.id];
                    return (
                      <label
                        key={a.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition ${
                          !isReqOk ? "opacity-40 cursor-not-allowed border-[#E0DCD3] bg-[#FAF8F5]" : isChecked ? "border-[#1F2022] bg-[#FAF8F5] font-medium" : "border-[#E0DCD3] hover:bg-[#FAF8F5]"
                        }`}
                      >
                        <input type="checkbox" checked={isChecked} disabled={!isReqOk || isLocked} onChange={() => handleAddonToggle(a.id)} className="accent-[#1F2022] rounded" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{a.name}</div>
                          <div className="text-[10px] text-[#5A5C60] font-mono">+{fmtRs(a.cost)}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {drawer === "tech" && (
                <>
                  {team.techs.length === 0 && (
                    <div className="mb-3 p-3 rounded-lg bg-[#FAF8F5] border border-dashed border-[#E0DCD3] text-[11px] text-[#5A5C60] flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 shrink-0" />
                      No technology developed yet. Start projects or license technology on the R&D screen.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {TECHS.map((tc) => {
                      const isOwned = team.techs.includes(tc.id);
                      const inProgress = team.rnd.find((p) => p.id === tc.id);
                      const isPending = ((team.dec as any).rndStarts || []).find((p: any) => p.id === tc.id);
                      const isEquipped = isOwned && (currentModel.equippedTechs ?? team.techs).includes(tc.id);
                      return (
                        <div
                          key={tc.id}
                          className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 ${
                            isEquipped ? "border-[#1F2022] bg-[#FAF8F5]" : isOwned ? "border-emerald-300" : "border-[#E0DCD3] opacity-70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold leading-snug">{tc.name}</span>
                            {isOwned ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : inProgress ? (
                              <span className="text-[10px] text-amber-700 flex items-center gap-0.5 shrink-0">
                                <Clock className="w-3 h-3" /> Q{inProgress.qDone}
                              </span>
                            ) : isPending ? (
                              <span className="text-[10px] text-purple-700 flex items-center gap-0.5 shrink-0">
                                <Zap className="w-3 h-3" /> Queued
                              </span>
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-[#8A8C90] shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-purple-800">
                              {Object.entries(tc.fx)
                                .map(([stat, val]) => `+${val} ${SHORT_BENEFIT[stat] ?? stat}`)
                                .join(" · ")}
                            </span>
                            {isOwned && (
                              <label className="flex items-center gap-1 cursor-pointer shrink-0">
                                <input type="checkbox" checked={isEquipped} disabled={isLocked} onChange={() => handleRndTechToggle(tc.id)} className="accent-[#1F2022]" />
                                <span className="text-[11px] font-semibold">{isEquipped ? "Fitted" : "Fit"}</span>
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {drawer === "portfolio" && (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {SEGMENTS.map((segment) => {
                      const modelsForSeg = team.models.filter((m) => (m.targetSegment ?? "S2") === segment.id);
                      const isSelected = selectedSegmentId === segment.id;
                      const segColor = SEGMENT_COLORS[segment.id] || "#8A8C90";
                      const top2 = Object.entries(segment.w)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 2)
                        .map(([k]) => SHORT_BENEFIT[k]);
                      return (
                        <button
                          key={segment.id}
                          type="button"
                          onClick={() => handleSegmentCardClick(segment.id)}
                          className={`text-left p-2.5 rounded-lg border transition ${isSelected ? "border-[#1F2022] bg-[#FAF8F5]" : "border-[#E5E1D8] hover:bg-[#FAF8F5]"}`}
                          style={{ borderTop: `3px solid ${segColor}` }}
                        >
                          <div className="text-xs font-semibold text-[#1F2022]">{segment.name}</div>
                          <div className="text-[10px] text-[#6C6D70]">{Math.round(segment.pct * 100)}% of buyers</div>
                          <div className="text-[10px] text-[#6C6D70]">Wants {top2.join(", ")}</div>
                          <div className={`text-[10px] mt-1 font-semibold ${modelsForSeg.length ? "text-[#1F2022]" : "text-[#A8AAAD]"}`}>
                            {modelsForSeg.length ? modelsForSeg.map((m) => m.name).join(", ") : "Not covered"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {team.models.length < 3 && !isLocked && (
                    <div className="p-3 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-[#1F2022]">Add a brand for an uncovered segment</div>
                      <div className="flex flex-wrap gap-1">
                        {unassignedSegments.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setNewBrandSegmentId(s.id)}
                            className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition ${
                              newBrandSegmentId === s.id ? "bg-[#1F2022] text-white border-[#1F2022]" : "bg-white text-[#1F2022] border-[#E0DCD3] hover:bg-slate-100"
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
                        className="w-full px-2 py-1.5 text-xs border border-[#E0DCD3] rounded-lg bg-white focus:outline-none focus:border-[#1F2022]"
                      />
                      <button
                        type="button"
                        disabled={!newBrandSegmentId || !newBrandName.trim()}
                        onClick={handleCreateBrandForSegment}
                        className="w-full px-3 py-1.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold rounded-lg disabled:opacity-40 transition"
                      >
                        Create brand (Rs. 50 L)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
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
