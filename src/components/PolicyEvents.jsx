import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Landmark, RefreshCw } from "lucide-react";

export default function PolicyEvents({ universeId, quarter, onNotify }) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("loading");
  const notifiedQuarter = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/policy-events?quarter=${encodeURIComponent(quarter)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Policy events unavailable");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const activeEvents = Array.isArray(payload.events) ? payload.events : [];
        setEvents(activeEvents);
        setStatus("ready");
        if (activeEvents.length && onNotify && notifiedQuarter.current !== quarter) {
          notifiedQuarter.current = quarter;
          onNotify(`Policy Alert: ${activeEvents.map((event) => event.event_type).join(", ")} active in Q${quarter}.`);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, [universeId, quarter, onNotify]);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700"><Landmark className="h-4 w-4" /> Policy Events</div>
          <h1 className="mt-1 text-2xl font-bold text-[#1F2022]">Q{quarter} policy landscape</h1>
          <p className="mt-1 text-sm text-[#5A5C60]">Regional demand shifts reward teams whose vehicle specifications meet the active rules.</p>
        </div>
        <span className="rounded-full border border-[#E0DCD3] bg-white px-3 py-1 text-xs font-semibold text-[#5A5C60]">{events.length} active</span>
      </div>

      {status === "loading" && <div className="flex items-center gap-2 rounded-xl border border-[#E5E1D8] bg-white p-5 text-sm text-[#5A5C60]"><RefreshCw className="h-4 w-4 animate-spin" /> Checking current policy events...</div>}
      {status === "error" && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><AlertTriangle className="h-4 w-4" /> Policy events could not be loaded.</div>}
      {status === "ready" && !events.length && <div className="rounded-xl border border-[#E5E1D8] bg-white p-8 text-center text-sm text-[#5A5C60]">No policy events are active this quarter.</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.event_id} className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-xs font-bold uppercase tracking-wider text-amber-800">Policy Alert</div><h2 className="mt-1 text-lg font-bold text-[#1F2022]">{event.event_type}</h2></div>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4A4C50]">{event.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="font-semibold uppercase text-[#5A5C60]">Region</dt><dd className="mt-1 font-bold text-[#1F2022]">{event.region}</dd></div>
              <div><dt className="font-semibold uppercase text-[#5A5C60]">Demand impact</dt><dd className="mt-1 font-bold text-emerald-700">{Number(event.demand_impact_pct) > 0 ? "+" : ""}{Number(event.demand_impact_pct) * 100}%</dd></div>
              <div><dt className="font-semibold uppercase text-[#5A5C60]">Eligible segment</dt><dd className="mt-1 font-bold text-[#1F2022]">{event.eligible_segment || "All segments"}</dd></div>
              <div><dt className="font-semibold uppercase text-[#5A5C60]">Condition</dt><dd className="mt-1 font-mono font-bold text-[#1F2022]">{event.eligibility_condition || "None"}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}