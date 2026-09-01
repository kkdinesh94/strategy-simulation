import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { LockKeyhole, ShoppingCart, TrendingUp } from "lucide-react";

interface MarketSurveyReportProps {
  universeId: string;
  teamId: number | string;
  quarter: number;
  onNotify?: (msg: string) => void;
  onPurchased?: () => void;
}

type Precision = "low" | "medium" | "high";

interface SurveyRow {
  survey_id: string;
  universe_id: string;
  quarter: number;
  precision_level: Precision;
  purchase_cost: number;
  segment_id: string;
  benefit_range_importance: number;
  benefit_charging_importance: number;
  benefit_price_importance: number;
  benefit_autonomy_importance: number;
  benefit_design_importance: number;
  benefit_reliability_importance: number;
  media_social_pref: number;
  media_auto_press_pref: number;
  media_business_press_pref: number;
  media_ev_forums_pref: number;
  media_youtube_pref: number;
  wtp_min: number;
  wtp_expected: number;
  wtp_max: number;
  segment_size_units: number;
  error_margin: number;
}

const PRECISION_COSTS: Record<Precision, number> = { low: 5, medium: 15, high: 30 };
const PRECISION_MARGIN: Record<Precision, string> = { low: "±15%", medium: "±8%", high: "±4%" };
const PRECISION_LABELS: Record<Precision, string> = { low: "Low Precision", medium: "Medium Precision", high: "High Precision" };

const SEGMENT_COLORS: Record<string, string> = {
  urban_commuter: "#3B82F6",
  fleet_operator: "#10B981",
  performance_enthusiast: "#8B5CF6",
  tech_pioneer: "#F59E0B",
  eco_advocate: "#22C55E"
};

const SEGMENT_LABELS: Record<string, string> = {
  urban_commuter: "Urban Commuter",
  fleet_operator: "Fleet Operator",
  performance_enthusiast: "Performance Enthusiast",
  tech_pioneer: "Tech Pioneer",
  eco_advocate: "Eco Advocate"
};

const SEGMENT_ORDER = ["urban_commuter", "fleet_operator", "performance_enthusiast", "tech_pioneer", "eco_advocate"];

const lakh = (value: number) => (Number(value || 0) / 100000).toFixed(1);

function BenefitBarChart({ rows, color, errorMargin }: { rows: { name: string; value: number }[]; color: string; errorMargin: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" horizontal={false} />
        <XAxis type="number" domain={[0, "dataMax + 20"]} tick={{ fontSize: 11, fill: "#5A5C60" }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "#1F2022" }} />
        <ReferenceLine x={100} stroke="#9CA3AF" strokeDasharray="4 4" label={{ value: "Market Average", position: "top", fontSize: 10, fill: "#7A7C80" }} />
        <Tooltip
          formatter={(value: number) => [`${value} ± ${Math.round(errorMargin * 100)}%`, "Importance"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#E5E1D8" }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} label={(props: any) => {
          const { x, y, width, height, value } = props;
          return (
            <text x={x + width + 6} y={y + height / 2} dy={4} fontSize={10} fill="#7A7C80">
              {value} ±{Math.round(errorMargin * 100)}%
            </text>
          );
        }}>
          {rows.map((row) => (
            <Cell key={row.name} fill={row.value > 100 ? color : "#B9B5AA"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function MarketSurveyReport({ universeId, teamId, quarter, onNotify, onPurchased }: MarketSurveyReportProps) {
  const [results, setResults] = useState<SurveyRow[]>([]);
  const [purchased, setPurchased] = useState(false);
  const [precision, setPrecision] = useState<Precision>("low");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string>(SEGMENT_ORDER[0]);
  const [error, setError] = useState("");

  const load = async (level: Precision) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/market-survey?universe_id=${encodeURIComponent(universeId)}&team_id=${encodeURIComponent(String(teamId))}&quarter=${quarter}&precision=${level}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Market survey could not be loaded.");
      const rows: SurveyRow[] = payload.results || [];
      setResults(rows);
      setPurchased(Boolean(payload.purchased));
      if (rows.length) setActiveSegment((current) => (rows.some((row) => row.segment_id === current) ? current : rows[0].segment_id));
    } catch (loadError: any) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(precision);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universeId, quarter, precision]);

  const purchase = async () => {
    setPurchasing(true);
    setError("");
    try {
      const response = await fetch("/api/market-survey/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universe_id: universeId, quarter, precision_level: precision, team_id: teamId })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Purchase failed.");
      onNotify?.(`Market Opportunity Analysis purchased (${PRECISION_LABELS[precision]}) for Rs. ${payload.cost} L.`);
      await load(precision);
      onPurchased?.();
    } catch (purchaseError: any) {
      setError(purchaseError.message);
    } finally {
      setPurchasing(false);
    }
  };

  const activeRow = useMemo(() => results.find((row) => row.segment_id === activeSegment), [results, activeSegment]);
  const errorMargin = results[0]?.error_margin ?? 0;

  const benefitRows = useMemo(() => {
    if (!activeRow) return [];
    return [
      { name: "Range", value: activeRow.benefit_range_importance },
      { name: "Charging Speed", value: activeRow.benefit_charging_importance },
      { name: "Price / TCO", value: activeRow.benefit_price_importance },
      { name: "Autonomy", value: activeRow.benefit_autonomy_importance },
      { name: "Design", value: activeRow.benefit_design_importance },
      { name: "Reliability", value: activeRow.benefit_reliability_importance }
    ];
  }, [activeRow]);

  const mediaRows = useMemo(() => {
    if (!activeRow) return [];
    return [
      { name: "Social Media", value: activeRow.media_social_pref },
      { name: "Auto Press", value: activeRow.media_auto_press_pref },
      { name: "Business Press", value: activeRow.media_business_press_pref },
      { name: "EV Forums", value: activeRow.media_ev_forums_pref },
      { name: "YouTube / Streaming", value: activeRow.media_youtube_pref }
    ];
  }, [activeRow]);

  return (
    <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xl font-bold text-[#1F2022]">Market Opportunity Analysis Report</h2>
          </div>
          <p className="text-xs text-[#5A5C60] mt-1">Segment-level customer benefit priorities, media preferences, and willingness-to-pay.</p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E0DCD3] text-[#5A5C60]">
          Quarter {quarter}
        </span>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</div>}

      {loading ? (
        <div className="text-xs text-[#5A5C60]">Loading Market Opportunity Analysis...</div>
      ) : !purchased ? (
        <div className="space-y-4">
          <p className="text-xs text-[#5A5C60]">
            Purchase the Market Opportunity Analysis to understand customer benefit priorities, media preferences, and
            willingness-to-pay by segment. Higher precision costs more but tightens the confidence interval around each
            estimate.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(PRECISION_COSTS) as Precision[]).map((level) => (
              <label
                key={level}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs font-medium transition ${
                  precision === level ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm" : "bg-[#FAF8F5] border-[#E0DCD3] hover:bg-white text-[#1F2022]"
                }`}
              >
                <input type="radio" name="precision" value={level} checked={precision === level} onChange={() => setPrecision(level)} className="accent-emerald-600" />
                <span className="flex-1">
                  {PRECISION_LABELS[level]}
                  <span className="block text-[10px] font-normal text-[#5A5C60]">{PRECISION_MARGIN[level]} margin</span>
                </span>
                <span className="font-mono">Rs. {PRECISION_COSTS[level]} L</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={purchase}
            disabled={purchasing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1F2022] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            {purchasing ? <LockKeyhole className="h-4 w-4 animate-pulse" /> : <ShoppingCart className="h-4 w-4" />}
            {purchasing ? "Purchasing..." : "Purchase MOA Survey"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
              {PRECISION_LABELS[precision]} · {PRECISION_MARGIN[precision]}
            </span>
            <span className="text-xs font-mono text-[#5A5C60]">Cost paid: Rs. {PRECISION_COSTS[precision]} L</span>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#E5E1D8] pb-3">
            {SEGMENT_ORDER.filter((id) => results.some((row) => row.segment_id === id)).map((segId) => {
              const isActive = activeSegment === segId;
              const color = SEGMENT_COLORS[segId];
              return (
                <button
                  key={segId}
                  type="button"
                  onClick={() => setActiveSegment(segId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    isActive ? "text-white shadow-sm" : "bg-[#FAF8F5] border-[#E0DCD3] text-[#1F2022] hover:bg-white"
                  }`}
                  style={isActive ? { backgroundColor: color, borderColor: color } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? "#fff" : color }} />
                  {SEGMENT_LABELS[segId]}
                </button>
              );
            })}
          </div>

          {activeRow && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-[#1F2022] mb-2">Benefit Importance Ratings</h3>
                <BenefitBarChart rows={benefitRows} color={SEGMENT_COLORS[activeSegment]} errorMargin={errorMargin} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F2022] mb-2">Media Preferences</h3>
                <BenefitBarChart rows={mediaRows} color={SEGMENT_COLORS[activeSegment]} errorMargin={errorMargin} />
              </div>

              <div className="lg:col-span-2">
                <h3 className="text-sm font-bold text-[#1F2022] mb-3">Willingness to Pay (WTP)</h3>
                <div className="relative h-8 rounded-full bg-[#FAF8F5] border border-[#E0DCD3]">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full"
                    style={{
                      left: "0%",
                      right: "0%",
                      backgroundColor: SEGMENT_COLORS[activeSegment],
                      opacity: 0.25
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono text-[#5A5C60]">
                    <span>Min: Rs. {lakh(activeRow.wtp_min)} L</span>
                    <span className="font-bold text-[#1F2022]">Expected: Rs. {lakh(activeRow.wtp_expected)} L</span>
                    <span>Max: Rs. {lakh(activeRow.wtp_max)} L</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E0DCD3] text-xs font-mono text-[#5A5C60]">
                    Estimated segment size: <strong className="text-[#1F2022]">{activeRow.segment_size_units.toLocaleString("en-IN")}</strong> units/quarter
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-[#5A5C60] border-t border-[#E5E1D8] pt-3">
            Data shown at {precision} precision. Estimates reflect buying intentions; actual sales depend on your relative
            marketing mix versus competitors.
          </p>
        </div>
      )}
    </div>
  );
}
