import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Save, Sparkles } from "lucide-react";

const DEFAULT_MULTIPLIER = 2.5;
const DEFAULT_SEGMENTS = [
  { segmentId: "urban_commuter", name: "Urban Commuter", priceWillingToPay: 18000, weights: { range: 4, charging: 5, autonomy: 3, image: 4 } },
  { segmentId: "fleet_operator", name: "Fleet Operator", priceWillingToPay: 24000, weights: { range: 7, charging: 9, autonomy: 5, image: 3 } },
  { segmentId: "performance_enthusiast", name: "Performance Enthusiast", priceWillingToPay: 42000, weights: { range: 7, charging: 6, autonomy: 5, image: 9 } },
  { segmentId: "tech_pioneer", name: "Tech Pioneer", priceWillingToPay: 50000, weights: { range: 9, charging: 7, autonomy: 10, image: 8 } },
  { segmentId: "eco_advocate", name: "Eco Advocate", priceWillingToPay: 32000, weights: { range: 8, charging: 5, autonomy: 6, image: 7 } }
];

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

function normalizeComponent(row) {
  const category = row.category || "Other";
  return {
    id: row.componentId || row.component_id,
    category,
    name: row.name,
    cost: Number(row.cost ?? row.materialCost ?? row.material_cost ?? 0),
    performance: Number(row.performance ?? row.performanceScore ?? row.performance_score ?? 0),
    benefitKey: row.benefitKey || ({ Battery: "range", Charging: "charging", Autonomy: "autonomy", Software: "autonomy", Safety: "autonomy", Motor: "image", Interior: "image", Exterior: "image" }[category] || "range"),
    benefit: row.benefit || row.benefitDelivered || row.benefit_delivered || ""
  };
}

function normalizeSegment(row) {
  const weights = row.weights || {
    range: Number(row.rangePriority ?? row.range_priority ?? 0),
    charging: Number(row.chargingSpeedPriority ?? row.charging_speed_priority ?? 0),
    autonomy: Number(row.autonomyPriority ?? row.autonomy_priority ?? 0),
    image: Number(row.brandImagePriority ?? row.brand_image_priority ?? 0)
  };
  return {
    segmentId: row.segmentId || row.segment_id,
    name: row.name,
    priceWillingToPay: Number(row.priceWillingToPay ?? row.price_willing_to_pay ?? 0),
    weights
  };
}

export default function VehicleDesigner({
  brandId = "default-brand",
  currentQuarter = 1,
  targetSegmentId = "urban_commuter",
  redesignFee = 500,
  onSaved
}) {
  const [components, setComponents] = useState([]);
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS);
  const [selectedIds, setSelectedIds] = useState([]);
  const [multiplier, setMultiplier] = useState(DEFAULT_MULTIPLIER);
  const [brandName, setBrandName] = useState(brandId);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/vehicle-designer?quarter=${encodeURIComponent(currentQuarter)}`)
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload.error || "Unable to load vehicle design data.");
        if (cancelled) return;
        setComponents((payload.components || []).map(normalizeComponent));
        if (payload.segments?.length) setSegments(payload.segments.map(normalizeSegment));
        setStatus("ready");
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error.message);
          setStatus("error");
        }
      });
    return () => { cancelled = true; };
  }, [currentQuarter]);

  const selected = useMemo(
    () => components.filter((component) => selectedIds.includes(component.id)),
    [components, selectedIds]
  );
  const grouped = useMemo(() => components.reduce((groups, component) => {
    (groups[component.category] ||= []).push(component);
    return groups;
  }, {}), [components]);
  const materialCost = selected.reduce((total, component) => total + component.cost, 0);
  const retailPrice = materialCost * multiplier;
  const scores = segments.map((segment) => {
    const weightedScore = selected.reduce((total, component) => {
      const weight = segment.weights[component.benefitKey] ?? 0;
      return total + component.performance * weight;
    }, 0);
    const maximum = Math.max(1, selected.reduce((total, component) => total + 10 * (segment.weights[component.benefitKey] ?? 0), 0));
    return { ...segment, score: Math.min(100, Math.round((weightedScore / maximum) * 100)) };
  });
  const targetSegment = scores.find((segment) => segment.segmentId === targetSegmentId) || scores[0];

  const toggleComponent = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  };

  const saveDesign = async () => {
    setSaveState("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/vehicle-designer/brands/${encodeURIComponent(brandId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quarter: currentQuarter, brandName, componentIds: selectedIds, multiplier })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save vehicle design.");
      setSaveState("saved");
      setMessage(payload.redesignFee > 0 ? `Design saved. Redesign fee: ${formatMoney(payload.redesignFee)}` : "Design saved with no additional quarterly fee.");
      onSaved?.(payload);
    } catch (error) {
      setSaveState("error");
      setMessage(error.message);
    }
  };

  if (status === "loading") return <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading vehicle components...</div>;
  if (status === "error") return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{message}</div>;

  return (
    <div className="space-y-5 text-slate-900">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700"><Sparkles className="h-4 w-4" /> Vehicle design / Q{currentQuarter}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">Brand Spec Sheet</h2></div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Brand name <input aria-label="Brand name" type="text" value={brandName} onChange={(event) => setBrandName(event.target.value)} className="w-44 rounded-lg border border-slate-300 px-2 py-1.5" /></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Retail multiplier <input aria-label="Retail multiplier" type="number" min="1" step="0.1" value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value) || 1)} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right" /></label>
      </header>
      <p className="text-xs font-medium text-slate-500">Product-line extensions should build on the original name, for example: Model S &rarr; Model S Plus &rarr; Model S Pro.</p>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Available components</h3><div className="space-y-4">{Object.entries(grouped).map(([category, items]) => <div key={category}><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-teal-700">{category}</h4><div className="space-y-2">{items.map((component) => <label key={component.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition ${selectedIds.includes(component.id) ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-400"}`}><span className="flex min-w-0 items-center gap-3"><input type="checkbox" checked={selectedIds.includes(component.id)} onChange={() => toggleComponent(component.id)} className="h-4 w-4 accent-teal-600" /><span className="min-w-0"><span className="block text-sm font-semibold">{component.name}</span><span className="block truncate text-xs text-slate-500">{component.benefit}</span></span></span><span className="shrink-0 text-right text-xs"><strong className="block">{formatMoney(component.cost)}</strong><span className="text-slate-500">Score {component.performance}</span></span></label>)}</div></div>)}</div></section>
        <section className="space-y-5"><div className="rounded-xl bg-slate-950 p-5 text-white shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-300">Current specification</p><p className="mt-2 text-sm text-slate-300">{selected.length} components selected</p></div><button type="button" onClick={saveDesign} disabled={saveState === "saving"} className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-60">{saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : saveState === "saved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save design</button></div><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-400">Material cost</p><p className="mt-1 text-lg font-semibold">{formatMoney(materialCost)}</p></div><div><p className="text-xs text-slate-400">Estimated retail</p><p className="mt-1 text-lg font-semibold">{formatMoney(retailPrice)}</p></div><div><p className="text-xs text-slate-400">Multiplier</p><p className="mt-1 text-lg font-semibold">{multiplier.toFixed(1)}x</p></div></div></div>
          {message && <div className={`rounded-lg border p-3 text-sm ${saveState === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-800"}`}>{message}</div>}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Segment fit score</h3><div className="space-y-4">{scores.map((segment) => <div key={segment.segmentId}><div className="mb-1 flex justify-between text-xs font-semibold"><span>{segment.name}</span><span>{segment.score}/100</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${segment.segmentId === targetSegment?.segmentId ? "bg-teal-500" : "bg-slate-500"}`} style={{ width: `${segment.score}%` }} /></div>{segment.segmentId === targetSegment?.segmentId && retailPrice > segment.priceWillingToPay && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><AlertTriangle className="h-4 w-4" /> Retail price exceeds this segment's willing-to-pay of {formatMoney(segment.priceWillingToPay)}.</p>}</div>)}</div></div>
        </section>
      </div>
    </div>
  );
}
