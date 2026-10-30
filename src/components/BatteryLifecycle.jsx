import React, { useEffect, useState } from "react";
import { Battery, CheckCircle2, CircleDollarSign, Recycle, ShieldCheck } from "lucide-react";
import { BATTERY_FIRST_LIFE_QUARTERS, BATTERY_RETURN_RATE, projectBatteryLifecycle } from "../lib/batteryLifecycle";

const formatL = (value) => `Rs. ${Number(value || 0).toFixed(2)} L`;
const OPTIONS = [
  { id: "warranty", title: "Warranty replacement", icon: ShieldCheck, color: "#C83E2B", description: "Replace the pack out of the warranty reserve. Simple, but the old pack's value is lost." },
  { id: "repurpose", title: "Second-life storage", icon: CircleDollarSign, color: "#C77D0A", description: "Sell packs that still hold charge into stationary energy storage." },
  { id: "recycle", title: "Recycling", icon: Recycle, color: "#15803D", description: "Recover lithium, nickel and cobalt; the strongest sustainability signal." }
];
const OPEN_Q = BATTERY_FIRST_LIFE_QUARTERS + 1;

/** Returned packs flow from the quarter they were sold, through the return rate, into one of three paths. */
function LifecycleFlow({ projection, quarter, soldUnits, selection }) {
  const W = 640;
  const H = 210;
  const returned = projection.returnedUnits;
  const ys = [42, 105, 168];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Battery return flow">
      <rect x={4} y={70} width={120} height={70} rx={10} fill="#1F2022" />
      <text x={64} y={96} textAnchor="middle" fontSize="11" fill="#D6D3CE">
        Sold in Q{quarter - BATTERY_FIRST_LIFE_QUARTERS}
      </text>
      <text x={64} y={120} textAnchor="middle" fontSize="18" fontWeight={700} fill="white">
        {soldUnits.toLocaleString("en-IN")}
      </text>
      <path d={`M124 105 C 165 105, 165 105, 200 105`} stroke="#A8A29E" strokeWidth={Math.max(2, Math.min(22, returned / 40))} fill="none" />
      <text x={162} y={92} textAnchor="middle" fontSize="10" fill="#6C6D70">
        {Math.round(BATTERY_RETURN_RATE * 100)}% return
      </text>
      <rect x={200} y={78} width={120} height={54} rx={10} fill="white" stroke="#1F2022" strokeWidth={1.5} />
      <text x={260} y={100} textAnchor="middle" fontSize="11" fill="#5A5C60">
        Packs back in Q{quarter}
      </text>
      <text x={260} y={121} textAnchor="middle" fontSize="17" fontWeight={700} fill="#1F2022">
        {returned.toLocaleString("en-IN")}
      </text>
      {OPTIONS.map((o, i) => {
        const opt = projection.options[o.id] || {};
        const chosen = selection === o.id;
        const net = (opt.revenue || 0) - (opt.cost || 0);
        return (
          <g key={o.id} opacity={chosen ? 1 : 0.4}>
            <path d={`M320 105 C 380 105, 380 ${ys[i]}, 430 ${ys[i]}`} stroke={o.color} strokeWidth={chosen ? Math.max(3, Math.min(22, returned / 40)) : 2} fill="none" strokeLinecap="round" />
            <rect x={430} y={ys[i] - 24} width={206} height={48} rx={9} fill={chosen ? o.color : "white"} stroke={o.color} />
            <text x={442} y={ys[i] - 5} fontSize="11.5" fontWeight={700} fill={chosen ? "white" : "#1F2022"}>
              {o.title}
            </text>
            <text x={442} y={ys[i] + 13} fontSize="10.5" fill={chosen ? "white" : "#5A5C60"} fontFamily="ui-monospace, monospace">
              net {net >= 0 ? "+" : "−"}Rs. {Math.abs(net).toFixed(1)} L · ESG {opt.esgImpact > 0 ? "+" : ""}
              {opt.esgImpact || 0}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function BatteryLifecycle({ universeId, teamId, quarter, onNotify, team, totalQuarters = 12 }) {
  const [data, setData] = useState({ projections: [], decision: null });
  const [selection, setSelection] = useState("warranty");
  const [status, setStatus] = useState("idle");
  const active = quarter >= OPEN_Q;

  useEffect(() => {
    if (!active) return;
    fetch(`/api/battery-lifecycle?universeId=${encodeURIComponent(universeId)}&teamId=${encodeURIComponent(teamId)}&quarter=${quarter}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Could not load battery lifecycle data."))))
      .then((payload) => {
        setData(payload);
        if (payload.decision?.disposition) setSelection(payload.decision.disposition);
      })
      .catch((error) => onNotify?.(error.message));
  }, [universeId, teamId, quarter, onNotify, active]);

  const hist = team?.hist || [];
  // Same projection the engine charges, computed from your sales history
  const local = projectBatteryLifecycle(hist, quarter);
  const projection = data.projections.find((item) => item.quarter === quarter) || (local.returnedUnits || !data.projections.length ? local : data.projections[0]);
  const soldUnits = hist.find((h) => h.q === quarter - BATTERY_FIRST_LIFE_QUARTERS)?.units || 0;

  const timeline = Array.from({ length: Math.max(0, totalQuarters - BATTERY_FIRST_LIFE_QUARTERS) }, (_, i) => {
    const q = i + OPEN_Q;
    const sold = hist.find((h) => h.q === q - BATTERY_FIRST_LIFE_QUARTERS);
    return { q, known: Boolean(sold), returned: sold ? Math.round(sold.units * BATTERY_RETURN_RATE) : 0, soldQ: q - BATTERY_FIRST_LIFE_QUARTERS };
  });
  const maxReturned = Math.max(1, ...timeline.map((t) => t.returned));

  const save = async () => {
    setStatus("saving");
    try {
      const response = await fetch("/api/battery-lifecycle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ universeId, teamId, quarter, disposition: selection }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save lifecycle decision.");
      setData((current) => ({ ...current, decision: payload.decision }));
      setStatus("saved");
      onNotify?.("Battery lifecycle decision saved.");
    } catch (error) {
      setStatus("error");
      onNotify?.(error.message);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <Battery className="h-4 w-4" /> Battery lifecycle
          </div>
          <h1 className="mt-1 text-2xl font-bold text-[#1F2022]">Where your used packs go</h1>
          <p className="mt-1 text-sm text-[#5A5C60]">
            {Math.round(BATTERY_RETURN_RATE * 100)}% of the scooters you sell come back for a pack decision {BATTERY_FIRST_LIFE_QUARTERS} quarters later. The choice moves cost, revenue and the sustainability score.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4">
        <h2 className="text-sm font-bold text-[#1F2022]">Returns ahead</h2>
        <p className="text-[11px] text-[#6C6D70] mb-3">Each quarter's returns are fixed by sales {BATTERY_FIRST_LIFE_QUARTERS} quarters earlier; later bars fill in as you sell.</p>
        <div className="grid gap-1.5 items-end h-28" style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}>
          {timeline.map((t) => (
            <div key={t.q} className="flex flex-col items-center justify-end h-full">
              <span className="text-[10px] font-mono text-[#5A5C60]">{t.known ? t.returned.toLocaleString("en-IN") : ""}</span>
              <div
                className={`w-full rounded-t ${t.q === quarter ? "bg-emerald-600" : t.known ? "bg-emerald-300" : "border border-dashed border-[#C9C3B9] bg-transparent"}`}
                style={{ height: t.known ? `${Math.max(4, (t.returned / maxReturned) * 80)}%` : "18%" }}
                title={t.known ? `Q${t.q}: ${t.returned} packs from Q${t.soldQ} sales` : `Q${t.q}: depends on Q${t.soldQ} sales`}
              />
            </div>
          ))}
        </div>
        <div className="grid gap-1.5 mt-1" style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}>
          {timeline.map((t) => (
            <span key={t.q} className={`text-center text-[10px] ${t.q === quarter ? "font-bold text-emerald-700" : "text-[#8A8C90]"}`}>
              Q{t.q}
            </span>
          ))}
        </div>
      </div>

      {!active ? (
        <div className="rounded-xl border border-[#E5E1D8] bg-white p-6 text-center">
          <Battery className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
          <h2 className="text-base font-bold">The first decision comes in Q{OPEN_Q}</h2>
          <p className="mt-1 text-sm text-[#5A5C60]">That is when packs from Quarter {OPEN_Q - BATTERY_FIRST_LIFE_QUARTERS} sales come back. Plan for them now: recycling and second-life both need returned volume to matter.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4">
            <h2 className="text-sm font-bold text-[#1F2022] mb-1">Q{quarter} decision</h2>
            <LifecycleFlow projection={projection} quarter={quarter} soldUnits={soldUnits} selection={selection} />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {OPTIONS.map(({ id, title, icon: Icon, color, description }) => {
              const option = projection.options?.[id] || {};
              const chosen = selection === id;
              const net = (option.revenue || 0) - (option.cost || 0);
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => {
                    setSelection(id);
                    setStatus("idle");
                  }}
                  className={`text-left rounded-xl border bg-white p-4 transition ${chosen ? "ring-2" : "border-[#E5E1D8] hover:border-slate-400"}`}
                  style={chosen ? { borderColor: color, boxShadow: `0 0 0 2px ${color}33` } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <Icon className="h-4 w-4" style={{ color }} />
                      {title}
                    </span>
                    {chosen ? <CheckCircle2 className="h-4 w-4" style={{ color }} /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                  </div>
                  <p className="mt-2 min-h-8 text-[11px] text-[#5A5C60]">{description}</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#F0ECE5] pt-3 text-[10px]">
                    <span>
                      Cost<strong className="mt-1 block font-mono text-[#1F2022]">{formatL(option.cost)}</strong>
                    </span>
                    <span>
                      Revenue<strong className="mt-1 block font-mono text-emerald-700">{formatL(option.revenue)}</strong>
                    </span>
                    <span>
                      Net<strong className={`mt-1 block font-mono ${net >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatL(net)}</strong>
                    </span>
                    <span>
                      ESG<strong className="mt-1 block font-mono text-emerald-700">{option.esgImpact > 0 ? "+" : ""}{option.esgImpact || 0}</strong>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#5A5C60]">The ESG impact feeds the Sustainability dimension of the Balanced Scorecard; cost and revenue go through this quarter's income statement.</p>
            <button type="button" onClick={save} disabled={status === "saving"} className="rounded-lg bg-[#1F2022] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {status === "saved" ? "Saved" : status === "saving" ? "Saving..." : `Save Q${quarter} decision`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
