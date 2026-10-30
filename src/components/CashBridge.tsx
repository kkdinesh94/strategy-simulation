import React from "react";
import { GameState, TeamState } from "../types/simulation";
import { proFormaCalc } from "../engine/simulationEngine";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

/**
 * Opening cash to projected closing cash for this quarter's plan, step by step. Every figure
 * comes from proFormaCalc, the same projection the auditor uses for its insufficient-funds check.
 */
export function CashBridge({ team, gameState }: { team: TeamState; gameState: GameState }) {
  const pf = proFormaCalc(gameState, team);
  const steps = [
    { label: "Opening cash", v: pf.cash, kind: "total" as const },
    { label: "Sales (est.)", v: pf.revenue, kind: "in" as const },
    { label: "New funding", v: pf.inflow, kind: "in" as const },
    { label: "Materials", v: -pf.materials, kind: "out" as const },
    { label: "Payroll", v: -pf.people, kind: "out" as const },
    { label: "Advertising", v: -pf.ad, kind: "out" as const },
    { label: "Quality", v: -pf.quality, kind: "out" as const },
    { label: "Growth capex & R&D", v: -pf.growth, kind: "out" as const },
    { label: "Running costs", v: -pf.running, kind: "out" as const },
    { label: "Shareholder payouts", v: -(pf.shareBuyback + pf.dividends), kind: "out" as const },
    { label: "Closing cash", v: pf.close, kind: "total" as const }
  ];

  // Running level before and after each step
  let level = 0;
  const bars = steps.map((s) => {
    if (s.kind === "total") {
      level = s.v;
      return { ...s, from: 0, to: s.v };
    }
    const from = level;
    level += s.v;
    return { ...s, from, to: level };
  });

  const W = 500;
  const rowH = 24;
  const L = 128;
  const R = 56;
  const lo = Math.min(0, -pf.bankHeadroom * 0.25, ...bars.map((b) => Math.min(b.from, b.to)));
  const hi = Math.max(1, ...bars.map((b) => Math.max(b.from, b.to)));
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  const H = bars.length * rowH + 22;
  const fmt = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(Math.round(v)).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Projected cash bridge for this quarter">
        <line x1={x(0)} x2={x(0)} y1={0} y2={H - 18} stroke="#1F2022" strokeWidth={1} />
        {bars.map((b, i) => {
          const y = i * rowH + 4;
          const x0 = x(Math.min(b.from, b.to));
          const w = Math.max(1.5, Math.abs(x(b.to) - x(b.from)));
          const color = b.kind === "total" ? (b.v < 0 ? "#DC2626" : "#1F2022") : b.kind === "in" ? "#15803D" : "#C2410C";
          return (
            <g key={b.label}>
              <text x={L - 8} y={y + 13} textAnchor="end" fontSize="11" fill="#3F4145" fontWeight={b.kind === "total" ? 700 : 400}>
                {b.label}
              </text>
              <rect x={x0} y={y + 2} width={w} height={rowH - 8} rx={3} fill={color} opacity={b.kind === "total" ? 0.9 : 0.75} />
              {i < bars.length - 1 && <line x1={x(b.to)} x2={x(b.to)} y1={y + rowH - 6} y2={y + rowH + 2} stroke="#A8A29E" strokeDasharray="2 2" />}
              <text x={Math.max(x(b.from), x(b.to)) + 6} y={y + 13} fontSize="10.5" fill={color} fontFamily="ui-monospace, monospace" fontWeight={600}>
                {b.kind === "in" ? "+" : ""}
                {fmt(b.v)}
              </text>
            </g>
          );
        })}
        <text x={x(0)} y={H - 4} fontSize="9.5" fill="#8A8C90" textAnchor="middle">
          0
        </text>
        <text x={W - R} y={H - 4} fontSize="9.5" fill="#8A8C90" textAnchor="end">
          Rs. lakh
        </text>
      </svg>
      <p className={`text-[11px] ${pf.close < 0 ? "text-red-700 font-semibold" : "text-[#6C6D70]"}`}>
        {pf.close < 0
          ? `This plan closes Rs. ${fmt(-pf.close)} L short. The auditor will refuse it unless you cut spending or raise funds (unused bank credit: Rs. ${fmt(pf.bankHeadroom)} L).`
          : `Sales are estimated from last quarter's sell-through (${pf.estUnitsSold.toLocaleString("en-IN")} units). Unused bank credit: Rs. ${fmt(pf.bankHeadroom)} L.`}
      </p>
    </div>
  );
}

/** Revenue and profit by quarter with the closing cash line. */
export function FinanceHistory({ team }: { team: TeamState }) {
  const data = team.hist.map((h) => ({ q: `Q${h.q}`, revenue: Math.round(h.revenue), profit: Math.round(h.profit), cash: Math.round(h.cash) }));
  if (!data.length) return <p className="text-xs text-[#6C6D70] py-10 text-center">History appears after the first quarter runs.</p>;
  return (
    <div className="h-[230px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#EFEBE3" vertical={false} />
          <XAxis dataKey="q" tick={{ fontSize: 10, fill: "#6C6D70" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#6C6D70" }} axisLine={false} tickLine={false} />
          <ReferenceLine y={0} stroke="#1F2022" />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number, n: string) => [`Rs. ${v.toLocaleString("en-IN")} L`, n]} />
          <Bar dataKey="revenue" name="Revenue" fill="#A8A29E" radius={[3, 3, 0, 0]} />
          <Bar dataKey="profit" name="Profit" fill="#C83E2B" radius={[3, 3, 0, 0]} />
          <Line dataKey="cash" name="Closing cash" stroke="#15803D" strokeWidth={2} dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CashBridge;
