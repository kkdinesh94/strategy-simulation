import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Landmark, MapPin, RefreshCw, X } from "lucide-react";
import { SEGMENTS } from "../engine/catalog";
import { unitCost } from "../engine/simulationEngine";
import { meetsEligibility, policyMetric, policyRegionShare } from "../lib/processQuarter";

const pct = (v) => `${v > 0 ? "+" : ""}${Math.round(v * 1000) / 10}%`;

// Demand up is good news; cost up is bad news
function Chip({ v, kind, muted }) {
  if (!v) return null;
  const good = kind === "demand" ? v > 0 : v < 0;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-md font-mono text-[11px] font-semibold ${muted ? "bg-[#F3F0EA] text-[#A8AAAD]" : good ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
      {pct(v)} {kind}
    </span>
  );
}

/**
 * This quarter's policy events and, for each one, whether it reaches this team: the engine
 * applies an event only where the team has stores in the event's region, only to the eligible
 * segment's demand, and only for models meeting the condition.
 */
export default function PolicyEvents({ universeId, quarter, onNotify, team }) {
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
    return () => {
      cancelled = true;
    };
  }, [universeId, quarter, onNotify]);

  const models = team?.models || [];
  const segName = (id) => SEGMENTS.find((s) => s.id === id || s.name.toLowerCase() === String(id).toLowerCase())?.name || id;

  const lastRows = team?.hist?.[team.hist.length - 1]?.modelRows || [];
  const lastUnits = Object.fromEntries(lastRows.map((r) => [r.name, r.units]));
  const checks = events.map((event) => {
    const share = team ? policyRegionShare(team, event.region) : event.region === "Global" ? 1 : 0;
    const inRegion = share > 0;
    const perModel = models.map((m) => {
      const metric = policyMetric(m, event.eligibility_condition);
      const ok = meetsEligibility(m, event.eligibility_condition);
      return { m, ok, metric, applies: inRegion && ok };
    });
    const c = Number(event.cost_impact_pct) || 0;
    // Rough rupee effect of a cost event: last quarter's units of each qualifying model x unit cost x impact
    const costL = perModel.filter((p) => p.applies).reduce((x, p) => x + (lastUnits[p.m.name] || 0) * unitCost(p.m) * c * share, 0) / 1e5;
    return { event, inRegion, share, perModel, reaches: perModel.some((p) => p.applies), costL };
  });
  const reaching = checks.filter((c) => c.reaches);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700">
            <Landmark className="h-4 w-4" /> Policy events
          </div>
          <h1 className="mt-1 text-2xl font-bold text-[#1F2022]">Q{quarter} policy landscape</h1>
          <p className="mt-1 text-sm text-[#5A5C60]">Subsidies, taxes and rules shift demand and costs. Each one reaches you only through your stores and your specification; demand effects also depend on the segment.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-2 bg-white rounded-xl border border-[#E5E1D8] text-center">
            <div className="text-[10px] text-[#6C6D70]">Active</div>
            <div className="text-lg font-bold font-mono">{events.length}</div>
          </div>
          <div className="px-3 py-2 bg-white rounded-xl border border-[#E5E1D8] text-center">
            <div className="text-[10px] text-[#6C6D70]">Reach you</div>
            <div className={`text-lg font-bold font-mono ${reaching.length ? "text-emerald-700" : "text-[#5A5C60]"}`}>{reaching.length}</div>
          </div>
        </div>
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-2 rounded-xl border border-[#E5E1D8] bg-white p-5 text-sm text-[#5A5C60]">
          <RefreshCw className="h-4 w-4 animate-spin" /> Checking current policy events...
        </div>
      )}
      {status === "error" && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4" /> Policy events could not be loaded.
        </div>
      )}
      {status === "ready" && !events.length && <div className="rounded-xl border border-[#E5E1D8] bg-white p-8 text-center text-sm text-[#5A5C60]">No policy events are active this quarter.</div>}

      {checks.length > 0 && models.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-4 overflow-x-auto">
          <h2 className="text-sm font-bold text-[#1F2022] mb-1">Impact on your models</h2>
          <p className="text-[11px] text-[#6C6D70] mb-3">Effective effects for your business: a regional event is scaled by that region's share of your store footprint. Demand effects apply in the event's segment; cost effects to every unit sold.</p>
          <table className="w-full text-xs min-w-[480px]">
            <thead>
              <tr className="text-[10px] text-[#8A8C90] text-left">
                <th className="font-medium pb-2">Event</th>
                {models.map((m) => (
                  <th key={m.id} className="font-medium pb-2 text-center">
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checks.map(({ event, perModel, share }) => (
                <tr key={event.event_id} className="border-t border-[#F3F0EA]">
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-[#1F2022]">{event.event_type}</div>
                    <div className="text-[10px] text-[#8A8C90]">
                      {event.region} · {event.eligible_segment ? segName(event.eligible_segment) : "all segments"}
                    </div>
                  </td>
                  {perModel.map((p) => (
                    <td key={p.m.id} className="py-2 text-center">
                      {p.applies ? (
                        <span className="inline-flex flex-wrap justify-center gap-1">
                          <Chip v={(Number(event.demand_impact_pct) || 0) * share} kind="demand" />
                          <Chip v={(Number(event.cost_impact_pct) || 0) * share} kind="cost" />
                        </span>
                      ) : (
                        <span className="inline-block min-w-[64px] px-2 py-1 rounded-md bg-[#F3F0EA] text-[#A8AAAD]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {checks.map(({ event, inRegion, share, perModel, reaches, costL }) => {
          const v = Number(event.demand_impact_pct) || 0;
          const c = Number(event.cost_impact_pct) || 0;
          return (
            <article key={event.event_id} className={`rounded-xl border p-4 shadow-sm ${reaches ? "border-emerald-300 bg-white" : "border-[#E5E1D8] bg-[#FAF8F5]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${reaches ? "text-emerald-700" : "text-[#8A8C90]"}`}>{reaches ? "Reaches you" : "Does not reach you"}</div>
                  <h2 className="mt-0.5 text-base font-bold text-[#1F2022]">{event.event_type}</h2>
                </div>
                <span className="flex flex-col items-end gap-1">
                  <Chip v={v} kind="demand" muted={!reaches} />
                  <Chip v={c} kind="cost" muted={!reaches} />
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#4A4C50]">{event.description}</p>
              {c !== 0 && (
                <p className={`mt-1 text-[11px] ${reaches ? (c > 0 ? "text-red-700" : "text-emerald-700") : "text-[#8A8C90]"}`}>
                  Unit cost {c > 0 ? "rises" : "falls"} {Math.abs(Math.round(c * 1000) / 10)}% on qualifying sales{event.region === "Global" ? "" : " in the region"} this quarter
                  {reaches && costL ? `: about Rs. ${Math.abs(costL).toFixed(1)} L ${c > 0 ? "more" : "less"} at last quarter's volume` : ""}.
                </p>
              )}
              <ul className="mt-3 space-y-1.5 text-xs">
                <li className="flex items-start gap-2">
                  {inRegion ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <X className="h-4 w-4 text-red-500 shrink-0" />}
                  <span>
                    <strong>Region:</strong> {event.region}.{" "}
                    {inRegion ? (share < 1 ? `You sell here: about ${Math.round(share * 100)}% of your store footprint, so you feel that share of the effect.` : "You sell here.") : (
                      <span className="text-[#5A5C60]">
                        <MapPin className="inline h-3 w-3" /> You have no store here; enter the market on the Sales screen to qualify.
                      </span>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Segment:</strong> {v === 0 ? "not relevant: a cost effect hits every unit you build" : event.eligible_segment ? `only ${segName(event.eligible_segment)} demand` : "demand in every segment"}.
                  </span>
                </li>
                {perModel.map((p) => (
                  <li key={p.m.id} className="flex items-start gap-2">
                    {p.ok ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <X className="h-4 w-4 text-red-500 shrink-0" />}
                    <span>
                      <strong>{p.m.name}:</strong>{" "}
                      {event.eligibility_condition ? (
                        <>
                          needs <code className="font-code">{event.eligibility_condition}</code>
                          {p.metric && Number.isFinite(p.metric.actual) ? `, has ${p.metric.actual}` : ""}
                          {!p.ok && " — upgrade it on the Product screen to qualify"}
                        </>
                      ) : (
                        "no specification condition"
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
