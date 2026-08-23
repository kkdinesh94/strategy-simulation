import React from "react";
import { AlertTriangle, BarChart3, Copy, Info, Plus, Trash2 } from "lucide-react";

const SATURATION_THRESHOLD = 12;
const MEDIA_TYPES = [
  { value: "Local Digital", scope: "local" },
  { value: "Regional Auto Press", scope: "regional" },
  { value: "Social Media", scope: "regional" },
  { value: "EV Enthusiast Blogs", scope: "regional" },
  { value: "Business Press", scope: "regional" },
  { value: "Broadcast TV", scope: "regional" },
  { value: "Podcast / Streaming", scope: "regional" }
];

const DEFAULT_PLACEMENTS = [
  { placementId: "local-digital", mediaType: "Local Digital", region: "", costPerInsertion: 8, insertions: 4 },
  { placementId: "social-media", mediaType: "Social Media", region: "Metro", costPerInsertion: 12, insertions: 5 }
];

const makePlacement = () => ({
  placementId: `placement-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  mediaType: "Local Digital",
  region: "",
  costPerInsertion: 10,
  insertions: 1
});

const getPlacementCost = (placement) =>
  Math.max(0, Number(placement.costPerInsertion) || 0) * Math.pow(Math.max(0, Number(placement.insertions) || 0), 0.9);

export default function MediaPlanner({ team, onChange, competitiveBenchmarkData = [], mediaPreferenceScores = {} }) {
  const placements = Array.isArray(team?.draft?.mediaPlacements) && team.draft.mediaPlacements.length > 0
    ? team.draft.mediaPlacements
    : DEFAULT_PLACEMENTS;
  const adJudgment = Number(team?.hist?.[team.hist.length - 1]?.campJ) || 50;
  const benchmarkPurchased = Boolean(team?.dec?.buyIntel && competitiveBenchmarkData.length > 0);

  const updatePlacements = (nextPlacements) => {
    onChange({ ...team, draft: { ...(team.draft || {}), mediaPlacements: nextPlacements } });
  };

  const updatePlacement = (placementId, field, value) => {
    updatePlacements(placements.map((placement) =>
      placement.placementId === placementId ? { ...placement, [field]: value } : placement
    ));
  };

  const typeTotals = MEDIA_TYPES.reduce((totals, media) => {
    totals[media.value] = placements
      .filter((placement) => placement.mediaType === media.value)
      .reduce((sum, placement) => sum + (Number(placement.insertions) || 0), 0);
    return totals;
  }, {});

  const impact = placements.reduce((total, placement) => {
    const media = MEDIA_TYPES.find((item) => item.value === placement.mediaType);
    const insertions = Number(placement.insertions) || 0;
    const preferenceScore = Number(mediaPreferenceScores[placement.mediaType]) || 1;
    return total + (media?.scope === "local" ? 100 * insertions * adJudgment : preferenceScore * insertions * adJudgment);
  }, 0);
  const totalCost = placements.reduce((sum, placement) => sum + getPlacementCost(placement), 0);
  const industryAverage = benchmarkPurchased
    ? competitiveBenchmarkData.reduce((sum, benchmark) => sum + (Number(benchmark.adBudget) || 0) * adJudgment, 0) / competitiveBenchmarkData.length
    : 0;
  const impactDelta = impact - industryAverage;

  return (
    <section className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E1D8] pb-4">
        <div>
          <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600" /><h2 className="text-xl font-bold text-[#1F2022]">Media Placement Planner</h2></div>
          <p className="text-xs text-[#5A5C60] mt-1">Plan insertion frequency, reach, and diminishing media cost by outlet.</p>
        </div>
        <div className="px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg font-mono text-xs font-bold text-emerald-700">Frequency discount: cost = base x insertions<sup>0.90</sup></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg"><div className="text-[#5A5C60]">Planned spend</div><strong className="text-lg text-[#1F2022]">Rs. {totalCost.toFixed(1)} L</strong></div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg"><div className="text-emerald-800">Advertising impact</div><strong className="text-lg text-emerald-800">{impact.toFixed(0)} pts</strong></div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg"><div className="text-blue-800">Ad judgment input</div><strong className="text-lg text-blue-800">{adJudgment.toFixed(0)} / 100</strong></div>
      </div>

      <div className="overflow-x-auto"><table className="w-full text-xs min-w-[760px]"><thead><tr className="border-b border-[#E5E1D8] text-[#5A5C60] uppercase text-[10px]"><th className="text-left py-2">Media type</th><th className="text-left py-2">Region</th><th className="text-right py-2">Base / insertion</th><th className="text-right py-2">Insertions</th><th className="text-right py-2">Discounted cost</th><th className="w-10" /></tr></thead><tbody>{placements.map((placement) => { const isLocal = placement.mediaType === "Local Digital"; return <tr key={placement.placementId} className="border-b border-[#E0DCD3]"><td className="py-2 pr-2"><select value={placement.mediaType} onChange={(event) => updatePlacement(placement.placementId, "mediaType", event.target.value)} className="w-full p-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg">{MEDIA_TYPES.map((media) => <option key={media.value}>{media.value}</option>)}</select></td><td className="py-2 pr-2"><input value={placement.region} placeholder={isLocal ? "Local" : "Region"} onChange={(event) => updatePlacement(placement.placementId, "region", event.target.value)} className="w-full p-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg" /></td><td className="py-2 pr-2"><input type="number" min="0" step="0.5" value={placement.costPerInsertion} onChange={(event) => updatePlacement(placement.placementId, "costPerInsertion", event.target.value)} className="w-28 p-2 text-right bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg" /></td><td className="py-2 pr-2"><input type="number" min="0" step="1" value={placement.insertions} onChange={(event) => updatePlacement(placement.placementId, "insertions", event.target.value)} className="w-24 p-2 text-right bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg" /></td><td className="py-2 text-right font-mono font-bold text-emerald-700">Rs. {getPlacementCost(placement).toFixed(1)} L</td><td className="py-2 pl-2"><button type="button" title="Remove placement" onClick={() => updatePlacements(placements.filter((item) => item.placementId !== placement.placementId))} className="p-2 text-[#5A5C60] hover:text-rose-700"><Trash2 className="w-4 h-4" /></button></td></tr>; })}</tbody></table></div>
      <button type="button" onClick={() => updatePlacements([...placements, makePlacement()])} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"><Plus className="w-4 h-4" /> Add placement</button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2"><div className="flex items-center gap-2 text-sm font-bold text-amber-900"><AlertTriangle className="w-4 h-4" /> Saturation monitor</div>{MEDIA_TYPES.filter((media) => typeTotals[media.value] > SATURATION_THRESHOLD).map((media) => <p key={media.value} className="text-xs text-amber-900">{media.value} reaches {typeTotals[media.value]} insertions this quarter, above the {SATURATION_THRESHOLD}-insertion threshold.</p>)}{MEDIA_TYPES.every((media) => typeTotals[media.value] <= SATURATION_THRESHOLD) && <p className="text-xs text-amber-900">No media type is above the {SATURATION_THRESHOLD}-insertion quarterly threshold.</p>}<p className="flex items-start gap-1.5 text-xs text-amber-900"><Copy className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Rotate multiple ad copies to keep repeated exposure from saturating the audience.</p></div><div className="p-4 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg space-y-2 text-xs text-[#5A5C60]"><div className="flex items-center gap-2 font-bold text-[#1F2022]"><Info className="w-4 h-4 text-blue-600" /> Impact model</div><p>Local impact = 100 x insertions x ad judgment.</p><p>Regional impact = media preference score x insertions x ad judgment.</p><p>Current plan: <strong className="text-[#1F2022]">{impact.toFixed(0)} points</strong> across {placements.length} placements.</p></div></div>

      <div className="overflow-x-auto"><table className="w-full text-xs font-mono"><thead><tr className="border-b border-[#E5E1D8] text-[#5A5C60] uppercase text-[10px]"><th className="text-left py-2">Advertising impact</th><th className="text-right py-2">Team</th><th className="text-right py-2">Industry average</th><th className="text-right py-2">Variance</th></tr></thead><tbody><tr><td className="py-3 font-sans font-bold text-[#1F2022]">Quarterly placement plan</td><td className="py-3 text-right font-bold text-emerald-700">{impact.toFixed(0)}</td><td className="py-3 text-right">{benchmarkPurchased ? industryAverage.toFixed(0) : "Unavailable"}</td><td className={`py-3 text-right font-bold ${impactDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{benchmarkPurchased ? `${impactDelta >= 0 ? "+" : ""}${impactDelta.toFixed(0)}` : "Purchase benchmark"}</td></tr></tbody></table>{!benchmarkPurchased && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#5A5C60]"><Info className="w-3.5 h-3.5" /> Industry comparison unlocks when the Competitor Intelligence Report is purchased and available.</p>}</div>
    </section>
  );
}