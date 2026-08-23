import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, GripVertical, Loader2, Megaphone, Plus, X } from "lucide-react";

export const BENEFITS = [
  "Zero-emission sustainability", "Long driving range", "Fast DC charging",
  "Low total cost of ownership", "Advanced autonomous features", "Premium interior design",
  "Performance acceleration", "OTA software updates", "Fleet management software",
  "Government incentive eligible", "High reliability / low maintenance", "Nationwide service network"
];

const BENEFIT_DIMENSIONS = {
  "Zero-emission sustainability": "image", "Long driving range": "range", "Fast DC charging": "charging",
  "Low total cost of ownership": "price", "Advanced autonomous features": "autonomy", "Premium interior design": "image",
  "Performance acceleration": "image", "OTA software updates": "autonomy", "Fleet management software": "price",
  "Government incentive eligible": "price", "High reliability / low maintenance": "price", "Nationwide service network": "price"
};

const FALLBACK_SEGMENTS = [
  { segmentId: "urban_commuter", name: "Urban Commuter", weights: { range: 4, charging: 5, autonomy: 3, image: 4, price: 10 } },
  { segmentId: "fleet_operator", name: "Fleet Operator", weights: { range: 7, charging: 9, autonomy: 5, image: 3, price: 8 } },
  { segmentId: "performance_enthusiast", name: "Performance Enthusiast", weights: { range: 7, charging: 6, autonomy: 5, image: 9, price: 3 } },
  { segmentId: "tech_pioneer", name: "Tech Pioneer", weights: { range: 9, charging: 7, autonomy: 10, image: 8, price: 4 } },
  { segmentId: "eco_advocate", name: "Eco Advocate", weights: { range: 8, charging: 5, autonomy: 6, image: 7, price: 2 } }
];

const valueFrom = (row, names) => {
  for (const name of names) if (row[name] !== undefined && row[name] !== null && row[name] !== "") return Number(row[name]);
  return 0;
};

function normalizeSegment(row, index) {
  const source = row.weights || row.benefits || {};
  return {
    segmentId: row.segmentId || row.segment_id || `segment-${index}`,
    name: row.name || row.segment_name || `Segment ${index + 1}`,
    weights: {
      range: valueFrom(source, ["range", "rangePriority", "range_priority"]) || valueFrom(row, ["rangePriority", "range_priority"]),
      charging: valueFrom(source, ["charging", "chargingSpeed", "chargingSpeedPriority", "charging_speed_priority"]) || valueFrom(row, ["chargingSpeedPriority", "charging_speed_priority"]),
      autonomy: valueFrom(source, ["autonomy", "autonomyPriority", "autonomy_priority"]) || valueFrom(row, ["autonomyPriority", "autonomy_priority"]),
      image: valueFrom(source, ["image", "design", "brandImagePriority", "brand_image_priority"]) || valueFrom(row, ["brandImagePriority", "brand_image_priority"]),
      price: valueFrom(source, ["price", "priceSensitivity", "price_sensitivity"]) || valueFrom(row, ["priceSensitivity", "price_sensitivity"])
    }
  };
}

function scoreBenefits(benefits, segment) {
  if (!segment || benefits.length === 0) return 0;
  const scoredBenefits = benefits.slice(0, 5);
  const prominenceScore = scoredBenefits.reduce((total, benefit, index) => {
    const weight = segment.weights[BENEFIT_DIMENSIONS[benefit]] || 0;
    return total + weight * (scoredBenefits.length - index);
  }, 0);
  const maximumProminence = 10 * (scoredBenefits.length * (scoredBenefits.length + 1)) / 2;
  const clutterPenalty = Math.max(0, benefits.length - 5) * 8;
  return Math.max(0, Math.min(100, Math.round((prominenceScore / Math.max(1, maximumProminence)) * 100 - clutterPenalty)));
}

export default function AdCopyDesigner({ quarter = 1, initialBenefits = BENEFITS.slice(0, 3), segments: suppliedSegments, targetSegmentId, onChange }) {
  const [segments, setSegments] = useState(() => suppliedSegments?.length ? suppliedSegments.map(normalizeSegment) : FALLBACK_SEGMENTS);
  const [selectedBenefits, setSelectedBenefits] = useState(() => initialBenefits.filter((benefit) => BENEFITS.includes(benefit)));
  const [activeSegmentId, setActiveSegmentId] = useState(targetSegmentId || segments[0]?.segmentId);
  const [draggedBenefit, setDraggedBenefit] = useState(null);
  const [status, setStatus] = useState(suppliedSegments ? "ready" : "loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (suppliedSegments?.length) {
      const normalized = suppliedSegments.map(normalizeSegment);
      setSegments(normalized);
      setActiveSegmentId(targetSegmentId || normalized[0]?.segmentId);
      setStatus("ready");
      return undefined;
    }
    let cancelled = false;
    fetch("/api/d1/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sql: "SELECT * FROM market_segments ORDER BY segment_id" }) })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok || payload.success === false) throw new Error(payload.error || "Unable to load market segments.");
        if (cancelled) return;
        const loaded = (payload.results || payload.rows || []).map(normalizeSegment);
        if (loaded.length) {
          setSegments(loaded);
          setActiveSegmentId(targetSegmentId || loaded[0].segmentId);
        }
        setStatus("ready");
      })
      .catch((fetchError) => { if (!cancelled) { setError(fetchError.message); setStatus("error"); } });
    return () => { cancelled = true; };
  }, [suppliedSegments, targetSegmentId]);

  const activeSegment = segments.find((segment) => segment.segmentId === activeSegmentId) || segments[0];
  const availableBenefits = useMemo(() => BENEFITS.filter((benefit) => !selectedBenefits.includes(benefit)), [selectedBenefits]);
  const appealScore = scoreBenefits(selectedBenefits, activeSegment);
  const updateBenefits = (nextBenefits) => {
    setSelectedBenefits(nextBenefits);
    onChange?.({ benefits: nextBenefits, segmentTarget: activeSegment?.segmentId, adJudgment: scoreBenefits(nextBenefits, activeSegment) });
  };
  const handleDrop = (targetBenefit) => {
    if (!draggedBenefit || draggedBenefit === targetBenefit) return;
    const reordered = [...selectedBenefits];
    const fromIndex = reordered.indexOf(draggedBenefit);
    const toIndex = reordered.indexOf(targetBenefit);
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, draggedBenefit);
    updateBenefits(reordered);
    setDraggedBenefit(null);
  };

  if (status === "loading") return <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading market segments...</div>;
  if (status === "error") return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>;

  return (
    <div className="space-y-5 rounded-xl bg-[#f5f7f8] p-4 text-slate-900 md:p-6">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-end">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700"><Megaphone className="h-4 w-4" /> Campaign studio / Q{quarter}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">Ad Copy Designer</h2><p className="mt-1 text-sm text-slate-500">Lead with the message this segment values most.</p></div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Target segment <select value={activeSegment?.segmentId || ""} onChange={(event) => setActiveSegmentId(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="" disabled>Select a segment</option>{segments.map((segment) => <option key={segment.segmentId} value={segment.segmentId}>{segment.name}</option>)}</select></label>
      </header>

      {selectedBenefits.length > 5 && <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Ad clutter warning:</strong> {selectedBenefits.length} benefits are included. More than five benefits incurs a clutter penalty.</span></div>}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Priority list</h3><p className="mt-1 text-xs text-slate-500">The first message gets the strongest emphasis.</p></div><span className={`rounded-full px-2.5 py-1 font-mono text-xs font-bold ${selectedBenefits.length > 5 ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"}`}>{selectedBenefits.length} / 5 recommended</span></div><div className="space-y-2">{selectedBenefits.map((benefit, index) => <div key={benefit} draggable onDragStart={() => setDraggedBenefit(benefit)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(benefit)} className="flex cursor-grab items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 p-3 active:cursor-grabbing"><GripVertical className="h-4 w-4 shrink-0 text-teal-600" /><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{index + 1}</span><span className="flex-1 text-sm font-semibold">{benefit}</span><button type="button" aria-label={`Remove ${benefit}`} onClick={() => updateBenefits(selectedBenefits.filter((item) => item !== benefit))} className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600"><X className="h-4 w-4" /></button></div>)}</div>{selectedBenefits.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Add a benefit from the library to start your copy.</p>}</section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Benefit library</h3><div className="space-y-2">{availableBenefits.map((benefit) => <button type="button" key={benefit} onClick={() => updateBenefits([...selectedBenefits, benefit])} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 p-3 text-left text-sm font-medium transition hover:border-teal-400 hover:bg-teal-50"><Plus className="h-4 w-4 shrink-0 text-teal-600" />{benefit}</button>)}</div></section>
      </div>

      <section className="rounded-xl bg-slate-950 p-5 text-white shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-300">Estimated segment appeal</p><p className="mt-1 text-sm text-slate-400">{activeSegment?.name || "No segment selected"} · weighted from market segment priorities</p></div><div className="text-left sm:text-right"><span className="text-4xl font-semibold tracking-tight">{appealScore}</span><span className="ml-1 text-sm text-slate-400">/ 100</span></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${appealScore}%` }} /></div></section>
    </div>
  );
}
