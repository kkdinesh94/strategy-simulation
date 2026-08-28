import React, { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer
} from "recharts";
import { GameState } from "../types/simulation";
import { SEGMENTS, TEAM_COLORS } from "../engine/catalog";
import { scoreModel, qualityFit } from "../engine/simulationEngine";
import { MapPin } from "lucide-react";

const SegmentReferenceArea = ReferenceArea as any;

interface PerceptualMapProps {
  gameState: GameState;
  currentTeamIdx: number;
  quarter: number;
}

interface MapPoint {
  x: number;
  y: number;
  label: string;
  teamName: string;
  color: string;
  isCurrentTeam: boolean;
  price: number;
}

function areaToRadius(size: number) {
  return Math.sqrt(size / Math.PI);
}

function StarShape(props: any) {
  const { cx, cy, fill } = props;
  const r = areaToRadius(120);
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r / 2.4;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return <polygon points={points.join(" ")} fill={fill} stroke="#1F2022" strokeWidth={0.75} />;
}

function CircleShape(props: any) {
  const { cx, cy, fill } = props;
  const r = areaToRadius(60);
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#1F2022" strokeWidth={0.5} fillOpacity={0.85} />;
}

function MapTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p: MapPoint = payload[0].payload;
  return (
    <div className="bg-white border border-[#E5E1D8] rounded-lg shadow-md p-3 text-xs font-mono space-y-1">
      <div className="font-bold font-sans text-[#1F2022] flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
        {p.teamName}
      </div>
      <div className="text-[#5A5C60]">
        Model: <span className="font-bold text-[#1F2022]">{p.label}</span>
      </div>
      <div className="text-[#5A5C60]">
        Price: <span className="font-bold text-[#1F2022]">Rs. {p.price.toFixed(1)} L</span>
      </div>
      <div className="text-[#5A5C60]">
        Quality Score: <span className="font-bold text-[#1F2022]">{p.y.toFixed(0)} / 100</span>
      </div>
    </div>
  );
}

export default function PerceptualMap({ gameState, currentTeamIdx, quarter }: PerceptualMapProps) {
  const seriesByTeam = useMemo(() => {
    return gameState.teams.map((team) => {
      const points: MapPoint[] = team.models.map((model) => {
        const scores = scoreModel(model, team);
        const avgQuality =
          (SEGMENTS.reduce((sum, seg) => sum + qualityFit(scores, seg), 0) / SEGMENTS.length) * 100;
        return {
          x: model.price / 100000,
          y: avgQuality,
          label: model.name,
          teamName: team.name,
          color: TEAM_COLORS[team.i % TEAM_COLORS.length],
          isCurrentTeam: team.i === currentTeamIdx,
          price: model.price / 100000
        };
      });
      return { team, points };
    });
  }, [gameState, currentTeamIdx]);

  if (quarter < 3) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-[#E5E1D8] shadow-sm text-center space-y-3 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#1F2022]">Market Map Not Yet Available</h3>
        <p className="text-xs text-[#5A5C60] leading-relaxed">
          Market map is available from Q3 onwards, once enough competitive pricing and quality data has accumulated.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
        <MapPin className="w-5 h-5 text-teal-700" />
        <div>
          <h3 className="text-base font-bold text-[#1F2022]">Perceptual Market Positioning Map</h3>
          <p className="text-xs text-[#5A5C60]">
            All brands plotted by price (Rs. Lakh) versus average brand quality score across all consumer segments.
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={480}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" />
          <XAxis
            type="number"
            dataKey="x"
            name="Price"
            unit=" L"
            domain={["dataMin - 5", "dataMax + 5"]}
            tick={{ fontSize: 11, fill: "#5A5C60" }}
            label={{ value: "Price (Rs. Lakh)", position: "insideBottom", offset: -10, fontSize: 12, fill: "#1F2022" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Quality"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#5A5C60" }}
            label={{ value: "Brand quality score (0-100)", angle: -90, position: "insideLeft", fontSize: 12, fill: "#1F2022" }}
          />
          {SEGMENTS.map((seg) => (
            <SegmentReferenceArea
              key={seg.id}
              x1={seg.wtp[0] / 100000}
              x2={seg.wtp[1] / 100000}
              y1={0}
              y2={100}
              fill="#0B9E63"
              fillOpacity={0.07}
              stroke="none"
              label={{
                value: seg.name,
                position: "insideTop" as const,
                fontSize: 10,
                fill: "#5A5C60"
              }}
            />
          ))}


          <ReferenceLine
            y={50}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
            label={{ value: "Market average", position: "right", fontSize: 10, fill: "#7A7C80" }}
          />

          <Tooltip content={<MapTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Legend
            payload={seriesByTeam.map(({ team }) => ({
              value: team.name,
              type: "circle",
              color: TEAM_COLORS[team.i % TEAM_COLORS.length]
            }))}
            wrapperStyle={{ fontSize: 11 }}
          />

          {seriesByTeam.map(({ team, points }) => {
            const isCurrent = team.i === currentTeamIdx;
            return (
              <Scatter
                key={team.i}
                name={team.name}
                data={points}
                fill={TEAM_COLORS[team.i % TEAM_COLORS.length]}
                shape={isCurrent ? <StarShape /> : <CircleShape />}
                legendType="none"
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
