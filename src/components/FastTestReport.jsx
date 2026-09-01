import React, { useEffect, useMemo, useState } from "react";
import { LockKeyhole, RefreshCw, ShoppingCart } from "lucide-react";

export const FAST_TEST_REPORT_COST = 20;

const scoreClass = (score) => score < 70 ? "bg-red-100 text-red-800" : score <= 80 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900";

export default function FastTestReport({ teamId, quarter, region = "Global", disabled = false }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/fast-tests?teamId=${encodeURIComponent(teamId)}&quarter=${quarter}&region=${encodeURIComponent(region)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Fast Test report could not be loaded.");
      setResults(payload.results || []);
      setPurchased(Boolean(payload.purchased));
    } catch (loadError) {
      setError(loadError.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [teamId, quarter, region]);

  const purchase = async () => {
    setPurchasing(true);
    try {
      const response = await fetch("/api/fast-tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, quarter, region }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Fast Test purchase failed.");
      setResults(payload.results || []);
      setPurchased(true);
      setError("");
    } catch (purchaseError) { setError(purchaseError.message); } finally { setPurchasing(false); }
  };

  const segments = useMemo(() => [...new Map(results.filter((row) => row.result_type !== "reliability").map((row) => [row.segment_id, { id: row.segment_id, name: row.segment_name }])).values()], [results]);
  const reportRows = useMemo(() => [...new Map(results.filter((row) => row.result_type !== "reliability").map((row) => [`${row.result_type}:${row.subject_id}`, { ...row, values: {} }])).values()].map((row) => ({ ...row, values: Object.fromEntries(results.filter((item) => item.result_type === row.result_type && item.subject_id === row.subject_id).map((item) => [item.segment_id, item.result_type === "ad" ? item.ad_judgment : Math.round((Number(item.brand_judgment) + Number(item.price_judgment)) / 2)])) })), [results]);
  const reliability = results.find((row) => row.result_type === "reliability")?.reliability_judgment;

  if (loading) return <div className="text-xs text-[#5A5C60]">Loading Fast Test data...</div>;
  if (!purchased) return <div className="space-y-2">
    {error && <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#FAF8F5] p-4 text-xs text-[#5A5C60]">
      <span><LockKeyhole className="mr-2 inline h-4 w-4" />Purchase this quarter's brand, price, and advertising judgments for a flat Rs. {FAST_TEST_REPORT_COST} L.</span>
      <button type="button" onClick={purchase} disabled={disabled || purchasing} className="inline-flex items-center gap-2 rounded-lg bg-[#1F2022] px-3 py-2 font-semibold text-white disabled:opacity-40">
        <ShoppingCart className="h-4 w-4" />{purchasing ? "Purchasing..." : `Purchase for Rs. ${FAST_TEST_REPORT_COST} L`}
      </button>
    </div>
  </div>;
  return <div className="space-y-3">
    {error && <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}<button type="button" onClick={load} aria-label="Refresh Fast Test"><RefreshCw className="h-4 w-4" /></button></div>}
    <div className="overflow-x-auto"><table className="min-w-full border-collapse text-xs"><thead><tr><th className="border-b border-[#E0DCD3] p-2 text-left">Subject</th>{segments.map((segment) => <th key={segment.id} className="border-b border-[#E0DCD3] p-2 text-center">{segment.name}</th>)}</tr></thead><tbody>{reportRows.map((row) => <tr key={`${row.result_type}:${row.subject_id}`}><th className="border-b border-[#F0ECE5] p-2 text-left font-semibold">{row.subject_name}<span className="ml-2 text-[10px] uppercase text-[#7A7C80]">{row.result_type}</span></th>{segments.map((segment) => { const score = row.values[segment.id]; return <td key={segment.id} className="border-b border-[#F0ECE5] p-1 text-center"><span className={`inline-flex min-w-10 justify-center rounded px-2 py-1 font-mono font-bold ${scoreClass(score ?? 0)}`}>{score ?? "-"}</span></td>; })}</tr>)}</tbody></table></div>
    <div className="flex items-center justify-between text-[11px] text-[#5A5C60]"><span>Red &lt; 70 · Amber 70-80 · Green &gt; 80</span>{reliability !== undefined && <span>Company reliability: <strong>{reliability}</strong>/100</span>}</div>
  </div>;
}
