import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Check, Database, Loader2, LockKeyhole, RefreshCw, ShoppingCart, Sparkles } from "lucide-react";

const PRECISION_LEVELS = {
  low: { label: "Low", error: 15, cost: 0 },
  medium: { label: "Medium", error: 8, cost: 12 },
  high: { label: "High", error: 4, cost: 25 }
};

const BENEFITS = [
  { key: "range", label: "Range" },
  { key: "chargingSpeed", label: "Charging speed" },
  { key: "price", label: "Price" },
  { key: "autonomy", label: "Autonomy" },
  { key: "design", label: "Design" },
  { key: "reliability", label: "Reliability" }
];

const MEDIA = [
  { key: "socialMedia", label: "Social media" },
  { key: "autoJournals", label: "Auto journals" },
  { key: "businessPress", label: "Business press" },
  { key: "evForums", label: "EV forums" },
  { key: "youtube", label: "YouTube" }
];

const FALLBACK_SEGMENTS = ["Urban Tech", "Commuters", "Eco", "Young Adults", "Fleet"];

const valueFrom = (row, names, fallback = 0) => {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") return Number(row[name]);
  }
  return fallback;
};

const normalizeRow = (row, index) => ({
  id: row.segment_id || row.segmentId || row.id || `segment-${index}`,
  name: row.segment_name || row.segmentName || row.name || FALLBACK_SEGMENTS[index] || `Segment ${index + 1}`,
  benefits: {
    range: valueFrom(row, ["range_importance", "rangeImportance", "range"]),
    chargingSpeed: valueFrom(row, ["charging_speed_importance", "chargingSpeedImportance", "charging_speed"]),
    price: valueFrom(row, ["price_importance", "priceImportance"]),
    autonomy: valueFrom(row, ["autonomy_importance", "autonomyImportance", "tech_importance"]),
    design: valueFrom(row, ["design_importance", "designImportance", "brand_image_importance"]),
    reliability: valueFrom(row, ["reliability_importance", "reliabilityImportance", "build_importance"])
  },
  media: {
    socialMedia: valueFrom(row, ["social_media_preference", "socialMediaPreference", "social_media"]),
    autoJournals: valueFrom(row, ["auto_journals_preference", "autoJournalsPreference", "auto_journals"]),
    businessPress: valueFrom(row, ["business_press_preference", "businessPressPreference", "business_press"]),
    evForums: valueFrom(row, ["ev_forums_preference", "evForumsPreference", "ev_forums"]),
    youtube: valueFrom(row, ["youtube_preference", "youtubePreference"])
  },
  price: {
    min: valueFrom(row, ["price_willing_min", "priceWillingMin", "wtp_min", "min_price"]),
    expected: valueFrom(row, ["price_willing_expected", "priceWillingExpected", "wtp_expected", "expected_price"]),
    max: valueFrom(row, ["price_willing_max", "priceWillingMax", "wtp_max", "max_price"])
  },
  size: valueFrom(row, ["estimated_segment_size", "estimatedSegmentSize", "segment_size_units", "segment_size"])
});

const formatCurrency = (value) => value ? `Rs. ${Math.round(value).toLocaleString("en-IN")}` : "—";
const formatUnits = (value) => value ? `${Math.round(value).toLocaleString("en-IN")} units` : "—";

function MetricRow({ label, value, error }) {
  const rounded = Math.round(value);
  const differentiator = rounded > 100;
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="w-32 shrink-0 text-sm text-slate-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${differentiator ? "bg-teal-500" : "bg-slate-400"}`} style={{ width: `${Math.min(100, Math.max(4, rounded))}%` }} />
      </div>
      <span className={`w-20 text-right font-mono text-sm font-semibold ${differentiator ? "text-teal-700" : "text-slate-800"}`}>
        {rounded || "—"} <span className="text-[11px] font-normal text-slate-400">±{error}%</span>
      </span>
    </div>
  );
}

function SurveyCard({ title, items, data, error }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">{title}</h3>
        <span className="font-mono text-[11px] text-slate-400">Mean = 100</span>
      </div>
      {items.map((item) => <MetricRow key={item.key} label={item.label} value={data[item.key]} error={error} />)}
    </section>
  );
}

export default function MarketSurveyReport({ quarter = 1, onPurchasePrecision, initialPrecision = "low" }) {
  const [rows, setRows] = useState([]);
  const [precision, setPrecision] = useState(initialPrecision);
  const [purchased, setPurchased] = useState(initialPrecision === "low");
  const [activeSegment, setActiveSegment] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const loadSurvey = async () => {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/d1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: "SELECT * FROM market_survey_results ORDER BY segment_id" })
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) throw new Error(payload.error || "The market survey could not be loaded.");
      setRows((payload.results || payload.rows || []).map(normalizeRow));
      setStatus("ready");
    } catch (fetchError) {
      setError(fetchError.message || "The market survey could not be loaded.");
      setStatus("error");
    }
  };

  useEffect(() => { loadSurvey(); }, []);

  const selected = rows[activeSegment];
  const level = PRECISION_LEVELS[precision];
  const displayLevel = purchased ? level : PRECISION_LEVELS.low;
  const available = useMemo(() => rows.length > 0, [rows]);

  const buyPrecision = () => {
    setPurchased(true);
    onPurchasePrecision?.({ quarter, precision, cost: level.cost });
  };

  return (
    <div className="space-y-6 rounded-2xl bg-[#f5f7f8] p-4 text-slate-900 md:p-7">
      <header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700"><BarChart3 className="h-4 w-4" /> Intelligence / Q{quarter}</div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Market Opportunity Analysis</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">EV consumer demand signals, willingness to pay, and media behavior across the simulated market.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><Database className="h-4 w-4" /> D1 · market_survey_results</div>
      </header>

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-amber-500" /><div><p className="text-sm font-semibold">Survey precision · Q{quarter}</p><p className="text-xs text-slate-500">Purchase a precision level each quarter to reduce the error margin.</p></div></div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(PRECISION_LEVELS).map(([key, option]) => <button key={key} type="button" onClick={() => { setPrecision(key); setPurchased(key === "low"); }} className={`rounded-lg border px-3 py-2 text-left text-xs transition ${precision === key ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}><span className="font-semibold">{option.label}</span><span className="ml-2 font-mono text-slate-400">±{option.error}% · {option.cost ? `${option.cost} L` : "Included"}</span></button>)}
          <button type="button" disabled={purchased} onClick={buyPrecision} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-default disabled:bg-teal-700">{purchased ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}{purchased ? "Purchased" : "Purchase"}</button>
        </div>
      </div>

      {status === "loading" && <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading survey results...</div>}
      {status === "error" && <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><span className="flex items-center gap-2"><AlertCircle className="h-5 w-5 shrink-0" />{error}</span><button type="button" onClick={loadSurvey} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold"><RefreshCw className="h-3.5 w-3.5" /> Retry</button></div>}
      {status === "ready" && !available && <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">No market survey rows are available for this universe.</div>}

      {status === "ready" && selected && <>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Market segments">{rows.map((row, index) => <button key={row.id} type="button" onClick={() => setActiveSegment(index)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${activeSegment === index ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{row.name}</button>)}</nav>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-5"><SurveyCard title="Benefit importance" items={BENEFITS} data={selected.benefits} error={displayLevel.error} /><SurveyCard title="Media preferences" items={MEDIA} data={selected.media} error={displayLevel.error} /></div>
          <div className="space-y-5"><section className="rounded-xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-300">Segment opportunity</p><p className="mt-3 text-4xl font-semibold tracking-tight">{formatUnits(selected.size)}</p><p className="mt-1 text-sm text-slate-400">Estimated addressable demand per quarter <span className="font-mono text-slate-500">±{displayLevel.error}%</span></p></section><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Price willing to pay</h3><div className="mt-5 grid grid-cols-3 gap-3">{[["Minimum", selected.price.min], ["Expected", selected.price.expected], ["Maximum", selected.price.max]].map(([label, value]) => <div key={label} className="border-l-2 border-teal-500 pl-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(value)}</p><p className="font-mono text-[11px] text-slate-400">±{displayLevel.error}%</p></div>)}</div></section><div className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-4 w-4" /> Figures shown at {displayLevel.label.toLowerCase()} precision for Q{quarter}{!purchased && precision !== "low" ? "; purchase selected precision to reduce error" : "."}</div></div>
        </div>
      </>}
    </div>
  );
}
