import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, LockKeyhole, RefreshCw, ShoppingCart, Users } from "lucide-react";

const BASE_COST = 15;
const REGIONS = ["North America", "Europe", "Asia-Pacific"];
const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

function SegmentPie({ segment }) {
  let cursor = 0;
  const stops = segment.shares.map((entry) => {
    const start = cursor * 360;
    cursor += Number(entry.share || 0);
    return `${entry.color || "#64748b"} ${start}deg ${cursor * 360}deg`;
  });
  return <div className="flex items-center gap-3"><div className="h-20 w-20 shrink-0 rounded-full border-4 border-white shadow-sm" style={{ background: `conic-gradient(${stops.join(", ")})` }} aria-label={`${segment.segmentName} market share pie chart`} /><div className="min-w-0 space-y-1 text-[10px]">{segment.shares.map((entry) => <div key={entry.brand} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} /> <span className="truncate">{entry.brand}</span><strong className="ml-auto pl-2">{pct(entry.share)}</strong></div>)}</div></div>;
}

export default function CompetitiveBenchmark({ teamId, quarter, budget = 0, initialRegion = "North America" }) {
  const [region, setRegion] = useState(initialRegion);
  const [scope, setScope] = useState("region");
  const [payload, setPayload] = useState({ purchased: false, report: null, cost: BASE_COST });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cost = BASE_COST * (scope === "global" ? 3 : 1);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/competitive-benchmark?teamId=${encodeURIComponent(teamId)}&quarter=${quarter}&region=${encodeURIComponent(scope === "global" ? "Global" : region)}&scope=${scope}`);
      const next = await response.json();
      if (!response.ok) throw new Error(next.error || "Competitive benchmark could not be loaded.");
      setPayload(next);
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [teamId, quarter, region, scope]);

  const purchase = async () => {
    setError("");
    try {
      const response = await fetch("/api/competitive-benchmark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, quarter, region: scope === "global" ? "Global" : region, scope, market_research_budget: budget }) });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error || "Competitive benchmark purchase failed.");
      setPayload(next);
    } catch (purchaseError) { setError(purchaseError.message); }
  };

  const allSegments = useMemo(() => payload.report?.segmentMarketShares || [], [payload.report]);
  if (loading) return <div className="text-xs text-[#5A5C60]">Loading competitive benchmark...</div>;
  return <section className="space-y-5 rounded-xl border border-[#E5E1D8] bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1D8] pb-4"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-bold">Competitive Benchmark</h2></div><p className="mt-1 text-xs text-[#5A5C60]">Purchased research separates market demand from units competitors managed to deliver.</p></div><div className="flex flex-wrap items-center gap-2 text-xs"><select value={region} onChange={(event) => setRegion(event.target.value)} disabled={scope === "global"} className="rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] p-2 disabled:opacity-50">{REGIONS.map((item) => <option key={item}>{item}</option>)}</select><select value={scope} onChange={(event) => setScope(event.target.value)} className="rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] p-2"><option value="region">Region report · {BASE_COST} L</option><option value="global">Global report · {BASE_COST * 3} L</option></select></div></div>
    {error && <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}<button type="button" onClick={load} aria-label="Refresh competitive benchmark"><RefreshCw className="h-4 w-4" /></button></div>}
    {!payload.purchased ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#FAF8F5] p-4 text-xs text-[#5A5C60]"><span><LockKeyhole className="mr-2 inline h-4 w-4" />This {scope} report is gated. Available budget: {money(budget)}.</span><button type="button" onClick={purchase} disabled={Number(budget) < cost} className="inline-flex items-center gap-2 rounded-lg bg-[#1F2022] px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><ShoppingCart className="h-4 w-4" />Purchase for {cost} L</button></div> : <>
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] p-3 text-xs"><div className="text-[#5A5C60]">Scope</div><strong>{payload.report.region} · Q{payload.report.quarter}</strong></div><div className="rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] p-3 text-xs"><div className="text-[#5A5C60]">Research fee</div><strong>{payload.cost} L</strong></div></div>
      {payload.report.competitors.map((competitor) => <article key={competitor.teamId} className="space-y-4 rounded-lg border border-[#E5E1D8] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-bold"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: competitor.color }} />{competitor.brand}</h3><span className="text-xs text-[#5A5C60]">{competitor.salesForce.offices} offices · {competitor.salesForce.peoplePerOffice} people / office</span></div><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="border-b border-[#E5E1D8] text-left text-[10px] uppercase text-[#5A5C60]"><th className="py-2">Brand / price</th><th className="py-2">Components (tier)</th><th className="py-2 text-right">Brand judgment</th></tr></thead><tbody>{competitor.models.map((model) => <tr key={model.name} className="border-b border-[#F0ECE5] align-top"><td className="py-2 pr-4 font-semibold">{model.name}<div className="font-mono font-normal text-[#5A5C60]">{money(model.price)}</div></td><td className="py-2 pr-4">{model.components.map((item) => <span key={item.category} className="mr-2 inline-block">{item.category}: <strong>{item.tier}</strong></span>)}</td><td className="py-2 text-right font-mono font-bold text-emerald-700">{model.brandJudgment}/100</td></tr>)}</tbody></table></div><div className="grid gap-4 lg:grid-cols-3 text-xs"><div><h4 className="mb-2 font-bold">Demand by segment</h4>{competitor.salesBySegment.map((item) => <div key={item.segmentId} className="flex justify-between border-b border-[#F0ECE5] py-1"><span>{item.segmentName}</span><strong>{item.unitsDemanded.toLocaleString("en-IN")}</strong></div>)}</div><div><h4 className="mb-2 font-bold">Advertising decisions</h4><div className="text-[#5A5C60]">{competitor.advertising.media.map((item) => <div key={item.mediaType} className="flex justify-between"><span>{item.mediaType}</span><strong>{item.insertions}</strong></div>)}<div className="mt-1">Ad judgment: <strong>{competitor.advertising.adJudgment}/100</strong></div><div className="mt-1">Top claims: <strong>{competitor.advertising.topBenefitClaims.join(", ") || "None disclosed"}</strong></div></div></div><div><h4 className="mb-2 flex items-center gap-1 font-bold"><Users className="h-3.5 w-3.5" />Sales force</h4><div>{competitor.salesForce.peoplePerOffice} per office · {competitor.salesForce.offices} offices</div>{competitor.salesForce.specialisation.map((item) => <div key={item.segment}>{item.segment}: <strong>{item.people}</strong> people</div>)}</div></div></article>)}
      <div><h3 className="mb-3 font-bold">Segment market share</h3><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{allSegments.map((segment) => <div key={segment.segmentId} className="rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] p-3"><div className="mb-2 flex justify-between text-xs font-bold"><span>{segment.segmentName}</span><span>{segment.totalDemand.toLocaleString("en-IN")} demanded</span></div><SegmentPie segment={segment} /></div>)}</div></div>
    </>}
  </section>;
}
