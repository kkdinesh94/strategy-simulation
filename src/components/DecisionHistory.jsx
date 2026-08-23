import React, { useEffect, useMemo, useState } from "react";
import { Clock3, Filter, History, Search } from "lucide-react";

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "Not set";
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed);
  } catch {
    return String(value);
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function DecisionHistory({ teamId, quarter, onNotify }) {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/decisions?teamId=${encodeURIComponent(teamId)}&quarter=${encodeURIComponent(quarter)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Decision history could not be loaded.");
        return payload;
      })
      .then((payload) => {
        if (!cancelled) {
          setEntries(Array.isArray(payload.decisions) ? payload.decisions : []);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus("error");
          onNotify?.(error.message);
        }
      });
    return () => { cancelled = true; };
  }, [teamId, quarter, onNotify]);

  const areas = useMemo(() => [...new Set(entries.map((entry) => entry.decision_area).filter(Boolean))].sort(), [entries]);
  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (area !== "all" && entry.decision_area !== area) return false;
      if (!query) return true;
      return [entry.decision_area, entry.field_changed, entry.old_value, entry.new_value]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
    return filtered.reduce((result, entry) => {
      const key = entry.decision_area || "General";
      (result[key] ||= []).push(entry);
      return result;
    }, {});
  }, [entries, search, area]);

  return (
    <section className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm p-5 space-y-5 text-[#1F2022]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1D8] pb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><History className="w-5 h-5 text-rose-600" /> Decision History</h3>
          <p className="text-xs text-[#5A5C60] mt-1">A field-level record of the decisions your team made in Quarter {quarter}.</p>
        </div>
        <span className="text-xs font-mono font-bold text-[#5A5C60]">{entries.length} recorded change{entries.length === 1 ? "" : "s"}</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8A8C90]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search decisions" aria-label="Search decisions" className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] text-sm outline-none focus:border-[#1F2022]" />
        </label>
        <label className="relative sm:w-56">
          <Filter className="absolute left-3 top-2.5 w-4 h-4 text-[#8A8C90]" />
          <select value={area} onChange={(event) => setArea(event.target.value)} aria-label="Filter by functional area" className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] text-sm appearance-none">
            <option value="all">All functional areas</option>
            {areas.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {status === "loading" && <p className="text-sm text-[#5A5C60] py-8 text-center">Loading decision history...</p>}
      {status === "error" && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">Decision history is temporarily unavailable.</p>}
      {status === "ready" && !Object.keys(groups).length && <p className="text-sm text-[#5A5C60] py-8 text-center">No decisions match this quarter and filter.</p>}

      {status === "ready" && Object.entries(groups).map(([group, groupEntries]) => (
        <div key={group} className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wide text-rose-700">{group}</h4>
          <div className="border-l-2 border-rose-200 ml-2 pl-4 space-y-4">
            {groupEntries.map((entry) => (
              <article key={entry.log_id} className="relative rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] p-3">
                <span className="absolute -left-[1.45rem] top-4 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-white" />
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <strong className="text-sm">{entry.field_changed}</strong>
                  <time className="text-[11px] text-[#686B70] flex items-center gap-1"><Clock3 className="w-3 h-3" />{formatTimestamp(entry.timestamp)}</time>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs">
                  <div><span className="block uppercase font-mono text-[10px] text-[#686B70] mb-1">Before</span><span className="break-words">{displayValue(entry.old_value)}</span></div>
                  <span className="text-rose-600 font-bold text-center">-&gt;</span>
                  <div><span className="block uppercase font-mono text-[10px] text-[#686B70] mb-1">After</span><span className="break-words font-semibold">{displayValue(entry.new_value)}</span></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
