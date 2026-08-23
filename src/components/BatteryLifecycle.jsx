import React, { useEffect, useState } from "react";
import { Battery, CheckCircle2, CircleDollarSign, Recycle, ShieldCheck } from "lucide-react";

const formatL = (value) => `Rs. ${Number(value || 0).toFixed(2)} L`;
const OPTIONS = [
  { id: "warranty", title: "Warranty replacement", icon: ShieldCheck, selected: "border-rose-500 ring-rose-100", iconClass: "text-rose-600", description: "Replace the pack under the warranty reserve." },
  { id: "repurpose", title: "Repurpose for storage", icon: CircleDollarSign, selected: "border-amber-500 ring-amber-100", iconClass: "text-amber-600", description: "Sell usable packs into the second-life energy storage market." },
  { id: "recycle", title: "Recycling program", icon: Recycle, selected: "border-emerald-500 ring-emerald-100", iconClass: "text-emerald-600", description: "Recover materials with the strongest sustainability signal." }
];

export default function BatteryLifecycle({ universeId, teamId, quarter, onNotify }) {
  const [data, setData] = useState({ projections: [], decision: null, active: quarter >= 5 });
  const [selection, setSelection] = useState("warranty");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    fetch(`/api/battery-lifecycle?universeId=${encodeURIComponent(universeId)}&teamId=${encodeURIComponent(teamId)}&quarter=${quarter}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load battery lifecycle data.")))
      .then((payload) => { setData(payload); if (payload.decision?.disposition) setSelection(payload.decision.disposition); })
      .catch((error) => onNotify?.(error.message));
  }, [universeId, teamId, quarter, onNotify]);

  const activeProjection = data.projections.find((item) => item.quarter === quarter) || data.projections[0] || { returnedUnits: 0, warrantyReserve: 0, options: {} };
  const save = async () => {
    setStatus("saving");
    try {
      const response = await fetch("/api/battery-lifecycle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ universeId, teamId, quarter, disposition: selection }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save lifecycle decision.");
      setData((current) => ({ ...current, decision: payload.decision }));
      setStatus("saved");
      onNotify?.("Battery lifecycle decision saved.");
    } catch (error) { setStatus("error"); onNotify?.(error.message); }
  };

  if (!data.active) return <section className="rounded-2xl border border-[#E5E1D8] bg-white p-8 text-center shadow-sm"><Battery className="mx-auto mb-3 h-8 w-8 text-emerald-600" /><h2 className="text-xl font-bold">Battery lifecycle opens in Q5</h2><p className="mt-2 text-sm text-[#5A5C60]">Q1-Q2 vehicles enter their first end-of-life decision window from Quarter 5.</p></section>;

  return <section className="space-y-6 rounded-2xl border border-[#E5E1D8] bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1D8] pb-5"><div><div className="flex items-center gap-2"><Battery className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold">Battery lifecycle desk</h2></div><p className="mt-1 text-xs text-[#5A5C60]">A fraction of Q1-Q2 sales reaches end-of-first-life each quarter. Choose where the battery value goes.</p></div><div className="rounded-lg bg-emerald-50 px-3 py-2 text-right"><div className="text-[10px] uppercase text-emerald-800">Q{quarter} returns</div><div className="font-mono text-xl font-bold text-emerald-900">{activeProjection.returnedUnits.toLocaleString()}</div></div></div>
    <div><h3 className="mb-2 text-sm font-bold">Projected returns by quarter</h3><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="border-b border-[#E5E1D8] text-left text-[10px] uppercase text-[#5A5C60]"><th className="py-2 pr-5">Quarter</th><th className="py-2 text-right">Returned batteries</th><th className="py-2 text-right">Warranty reserve / unit</th></tr></thead><tbody>{data.projections.map((item) => <tr key={item.quarter} className={`border-b border-[#F0ECE5] ${item.quarter === quarter ? "bg-emerald-50" : ""}`}><td className="py-2 pr-5 font-semibold">Q{item.quarter}</td><td className="py-2 text-right font-mono">{item.returnedUnits.toLocaleString()}</td><td className="py-2 text-right font-mono">{formatL(item.warrantyReserve)}</td></tr>)}</tbody></table></div></div>
    <div><h3 className="mb-3 text-sm font-bold">Disposition economics for Q{quarter}</h3><div className="grid gap-3 lg:grid-cols-3">{OPTIONS.map(({ id, title, icon: Icon, selected, iconClass, description }) => { const option = activeProjection.options[id] || {}; const chosen = selection === id; return <button type="button" key={id} onClick={() => setSelection(id)} className={`text-left rounded-xl border p-4 transition ${chosen ? `${selected} ring-2` : "border-[#E5E1D8] hover:border-slate-400"}`}><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><Icon className={`h-4 w-4 ${iconClass}`} />{title}</span>{chosen ? <CheckCircle2 className={`h-4 w-4 ${iconClass}`} /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}</div><p className="mt-2 min-h-8 text-[11px] text-[#5A5C60]">{description}</p><div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#F0ECE5] pt-3 text-[10px]"><span>Cost<strong className="mt-1 block font-mono text-[#1F2022]">{formatL(option.cost)}</strong></span><span>Revenue<strong className="mt-1 block font-mono text-emerald-700">{formatL(option.revenue)}</strong></span><span>ESG<strong className="mt-1 block font-mono text-emerald-700">{option.esgImpact > 0 ? "+" : ""}{option.esgImpact || 0}</strong></span></div></button>; })}</div></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E1D8] pt-4"><p className="text-xs text-[#5A5C60]">The ESG impact feeds the Sustainability dimension in the Balanced Scorecard.</p><button type="button" onClick={save} disabled={status === "saving"} className="rounded-lg bg-[#1F2022] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{status === "saved" ? "Saved to D1" : status === "saving" ? "Saving..." : "Save Q" + quarter + " decision"}</button></div>
  </section>;
}