import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from "recharts";
import { GameState } from "../types/simulation";
import { TEAM_COLORS } from "../engine/catalog";
import { TrendingUp } from "lucide-react";

interface MarketShareTrendsProps {
  gameState: GameState;
  currentTeamIdx: number;
}

const MarketShareTrends: React.FC<MarketShareTrendsProps> = ({ gameState, currentTeamIdx }) => {
  const { teams } = gameState;

  const quarters = useMemo(() => {
    const qs = new Set<number>();
    teams.forEach((t) => t.hist.forEach((h) => qs.add(h.q)));
    return Array.from(qs).sort((a, b) => a - b);
  }, [teams]);

  const shareData = useMemo(() => {
    return quarters.map((q) => {
      const row: Record<string, number> = { quarter: q };
      const totalRevenue = teams.reduce((sum, t) => {
        const h = t.hist.find((x) => x.q === q);
        return sum + (h ? h.revenue : 0);
      }, 0);
      teams.forEach((t) => {
        const h = t.hist.find((x) => x.q === q);
        const rev = h ? h.revenue : 0;
        row[t.name] = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;
      });
      return row;
    });
  }, [quarters, teams]);

  const profitData = useMemo(() => {
    const cumByTeam: Record<string, number> = {};
    return quarters.map((q) => {
      const row: Record<string, number> = { quarter: q };
      teams.forEach((t) => {
        const h = t.hist.find((x) => x.q === q);
        const prevCum = cumByTeam[t.name] || 0;
        const cum = prevCum + (h ? h.profit : 0);
        cumByTeam[t.name] = cum;
        row[t.name] = cum;
      });
      return row;
    });
  }, [quarters, teams]);

  if (gameState.quarter < 2) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-[#E5E1D8] shadow-sm text-center space-y-3 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#1F2022]">Trend Data Not Yet Available</h3>
        <p className="text-xs text-[#5A5C60] leading-relaxed">
          Complete at least two quarters to unlock market share and cumulative profit trend charts across the industry universe.
        </p>
      </div>
    );
  }

  const equalShare = 100 / teams.length;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#1F2022]">Market share by quarter (%)</h3>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={shareData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} label={{ value: "Quarter", position: "insideBottom", offset: -2, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: "%", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={equalShare} stroke="#5A5C60" strokeDasharray="4 4" label={{ value: "Equal share", fontSize: 10, fill: "#5A5C60" }} />
            {teams.map((t, idx) => {
              const isCurrent = t.i === currentTeamIdx;
              return (
                <Line
                  key={t.i}
                  type="monotone"
                  dataKey={t.name}
                  stroke={TEAM_COLORS[idx % TEAM_COLORS.length]}
                  strokeWidth={isCurrent ? 3 : 1.5}
                  dot={isCurrent}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#1F2022]">Cumulative profit by quarter (Rs. L)</h3>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={profitData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} label={{ value: "Quarter", position: "insideBottom", offset: -2, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: "Rs. L", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `Rs. ${v.toFixed(1)} L`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {teams.map((t, idx) => {
              const isCurrent = t.i === currentTeamIdx;
              return (
                <Line
                  key={t.i}
                  type="monotone"
                  dataKey={t.name}
                  stroke={TEAM_COLORS[idx % TEAM_COLORS.length]}
                  strokeWidth={isCurrent ? 3 : 1.5}
                  dot={isCurrent}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarketShareTrends;
