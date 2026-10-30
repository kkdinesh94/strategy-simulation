import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Factory, ShieldCheck, Users } from "lucide-react";
import { lineEfficiencyOf, marketBonusOf, payFactorsOf, payrollOf, reachOf, withWebStore } from "../engine/simulationEngine";

const DEFAULTS = {
  sales: { salary: 3.5, benefits: 8, vacation: 15, bonus: 10 },
  production: { salary: 2.5, benefits: 8, vacation: 18, bonus: 8, safetyBonus: 5 }
};

const LIMITS = {
  salary: [0, 10, 0.1],
  benefits: [0, 25, 1],
  vacation: [0, 35, 1],
  bonus: [0, 30, 1],
  safetyBonus: [0, 20, 1]
};

const labels = {
  salary: ["Base salary", "Rs. L / quarter"],
  benefits: ["Health benefits", "% of salary"],
  vacation: ["Vacation days", "days / year"],
  bonus: ["Performance bonus", "% of salary"],
  safetyBonus: ["Safety record bonus", "% of salary"]
};

function numberOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function packageValue(pkg, kind) {
  const safety = kind === "production" ? numberOr(pkg.safetyBonus, 0) : 0;
  return numberOr(pkg.salary, 0) * (1 + numberOr(pkg.benefits, 0) / 100 + numberOr(pkg.bonus, 0) / 100 + safety / 100) + numberOr(pkg.vacation, 0) * 0.03;
}

function packageFor(team, kind) {
  return { ...DEFAULTS[kind], ...(team?.hrCompensation?.[kind] || {}) };
}

function scoreFor(pkg, teams, kind) {
  const packages = (teams || []).map((team) => packageFor(team, kind));
  const values = packages.map((teamPackage) => packageValue(teamPackage, kind));
  const benchmark = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const benchmarkPackage = Object.keys(DEFAULTS[kind]).reduce((average, field) => {
    average[field] = packages.reduce((sum, teamPackage) => sum + numberOr(teamPackage[field], DEFAULTS[kind][field]), 0) / Math.max(1, packages.length);
    return average;
  }, {});
  const score = benchmark > 0 ? packageValue(pkg, kind) / benchmark : 1;
  return { benchmark, benchmarkPackage, score: Math.max(0.75, Math.min(1.25, score)) };
}

function Slider({ field, value, benchmark, onChange, disabled }) {
  const [min, max, step] = LIMITS[field];
  const [title, unit] = labels[field];
  const benchmarkPosition = `${Math.max(0, Math.min(100, ((benchmark - min) / (max - min)) * 100))}%`;
  return <label className="block space-y-1.5">
    <span className="flex items-center justify-between text-xs font-semibold text-[#303236]"><span>{title}</span><span className="font-mono text-[#1F2022]">{Number(value).toFixed(field === "salary" ? 1 : 0)} <span className="font-sans text-[10px] text-[#77797D]">{unit}</span></span></span>
    <span className="relative block"><input aria-label={title} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(field, Number(event.target.value))} className="relative z-10 w-full accent-[#1F2022]" /><span aria-hidden="true" className="absolute top-1/2 z-0 h-4 -translate-y-1/2 border-l-2 border-indigo-600" style={{ left: benchmarkPosition }} title={`Industry average: ${benchmark.toFixed(field === "salary" ? 1 : 0)}`} /></span>
  </label>;
}

function Gauge({ score }) {
  // 0.75x .. 1.25x mapped onto a half dial
  const a = Math.PI * (1 - (Math.max(0.75, Math.min(1.25, score)) - 0.75) / 0.5);
  const cx = 60, cy = 56, r = 46;
  const arc = (from, to, color) => {
    const p = (t) => [cx + r * Math.cos(Math.PI * (1 - t)), cy - r * Math.sin(Math.PI * (1 - t))];
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return <path d={`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`} stroke={color} strokeWidth={9} fill="none" />;
  };
  return (
    <svg viewBox="0 0 120 78" className="w-[120px] h-auto" role="img" aria-label={`Productivity ${score.toFixed(2)}x`}>
      {arc(0, 0.5, "#F3D9A4")}
      {arc(0.5, 1, "#BFE3CC")}
      <line x1={cx} y1={cy} x2={cx + (r - 6) * Math.cos(a)} y2={cy - (r - 6) * Math.sin(a)} stroke="#1F2022" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill="#1F2022" />
      <text x={cx} y={cy + 19} textAnchor="middle" fontSize="13" fontWeight={700} fill={score >= 1 ? "#15803D" : "#B45309"}>
        {score.toFixed(2)}x
      </text>
      <text x={14} y={66} fontSize="8" fill="#8A8C90">0.75</text>
      <text x={106} y={66} fontSize="8" fill="#8A8C90" textAnchor="end">1.25</text>
    </svg>
  );
}

const PARTS = [
  ["salary", "Base", "#1F2022"],
  ["benefits", "Benefits", "#2563EB"],
  ["bonus", "Bonus", "#C77D0A"],
  ["safetyBonus", "Safety", "#15803D"],
  ["vacation", "Leave", "#A8A29E"]
];

// The package value split into the parts packageValue() adds up
function parts(pkg, kind) {
  const s = numberOr(pkg.salary, 0);
  return {
    salary: s,
    benefits: (s * numberOr(pkg.benefits, 0)) / 100,
    bonus: (s * numberOr(pkg.bonus, 0)) / 100,
    safetyBonus: kind === "production" ? (s * numberOr(pkg.safetyBonus, 0)) / 100 : 0,
    vacation: numberOr(pkg.vacation, 0) * 0.03
  };
}

function PackageBars({ pkg, benchmarkPackage, kind }) {
  const rows = [
    ["You", parts(pkg, kind)],
    ["Industry", parts(benchmarkPackage, kind)]
  ];
  const max = Math.max(...rows.map(([, p]) => Object.values(p).reduce((a, b) => a + b, 0))) || 1;
  return (
    <div className="space-y-1.5">
      {rows.map(([label, p]) => (
        <div key={label} className="flex items-center gap-2 text-[11px]">
          <span className="w-14 text-[#5A5C60]">{label}</span>
          <div className="flex-1 flex h-3 rounded overflow-hidden bg-[#F3F0EA]">
            {PARTS.filter(([k]) => p[k] > 0).map(([k, name, color]) => (
              <div key={k} title={`${name}: ${p[k].toFixed(2)}`} style={{ width: `${(p[k] / max) * 100}%`, background: color, opacity: label === "You" ? 0.9 : 0.4 }} />
            ))}
          </div>
          <span className="w-10 text-right font-mono">{Object.values(p).reduce((a, b) => a + b, 0).toFixed(2)}</span>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#6C6D70] pl-16">
        {PARTS.filter(([k]) => kind === "production" || k !== "safetyBonus").map(([k, name, color]) => (
          <span key={k} className="flex items-center gap-1">
            <i className="w-2 h-2 rounded-sm" style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompensationSection({ kind, title, icon, pkg, benchmarkPackage, score, disabled, onChange, effect }) {
  const fields = kind === "sales" ? ["salary", "benefits", "vacation", "bonus"] : ["salary", "benefits", "vacation", "bonus", "safetyBonus"];
  return (
    <section className="bg-white border border-[#E5E1D8] rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[#5A5C60]">{icon}</span>
          <div>
            <h2 className="text-sm font-bold text-[#1F2022]">{title}</h2>
            <p className="text-[11px] text-[#77797D]">Package value relative to every team's offer.</p>
          </div>
        </div>
        <Gauge score={score} />
      </div>
      <PackageBars pkg={pkg} benchmarkPackage={benchmarkPackage} kind={kind} />
      <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EFEBE3] text-[11px] text-[#3F4145]">{effect}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {fields.map((field) => (
          <Slider key={field} field={field} value={pkg[field]} benchmark={benchmarkPackage[field]} disabled={disabled} onChange={onChange} />
        ))}
      </div>
      <p className="text-[10px] text-[#8A8C90]">The blue tick on each slider marks the industry average.</p>
    </section>
  );
}

function IndustryScatter({ teams, me }) {
  const W = 360, H = 240, L = 36, B = 28, T = 10, R = 10;
  const x = (s) => L + ((s - 0.75) / 0.5) * (W - L - R);
  const y = (s) => H - B - ((s - 0.75) / 0.5) * (H - B - T);
  const pts = teams.map((t) => ({ t, s: scoreFor(packageFor(t, "sales"), teams, "sales").score, p: scoreFor(packageFor(t, "production"), teams, "production").score }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Sales and production pay of every team">
      <rect x={x(1)} y={T} width={x(1.25) - x(1)} height={y(1) - T} fill="#ECF7F0" />
      <rect x={L} y={y(1)} width={x(1) - L} height={H - B - y(1)} fill="#FBF3E4" />
      <line x1={x(1)} x2={x(1)} y1={T} y2={H - B} stroke="#C9C3B9" strokeDasharray="3 3" />
      <line x1={L} x2={W - R} y1={y(1)} y2={y(1)} stroke="#C9C3B9" strokeDasharray="3 3" />
      <text x={W - R - 4} y={T + 12} textAnchor="end" fontSize="9" fill="#15803D">pays above market</text>
      <text x={L + 4} y={H - B - 6} fontSize="9" fill="#B45309">pays below market</text>
      {[0.75, 1, 1.25].map((v) => (
        <g key={v}>
          <text x={x(v)} y={H - B + 14} textAnchor="middle" fontSize="9" fill="#8A8C90">{v.toFixed(2)}</text>
          <text x={L - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#8A8C90">{v.toFixed(2)}</text>
        </g>
      ))}
      <text x={(L + W - R) / 2} y={H - 2} textAnchor="middle" fontSize="9.5" fill="#5A5C60">Sales force score</text>
      <text x={10} y={(T + H - B) / 2} fontSize="9.5" fill="#5A5C60" textAnchor="middle" transform={`rotate(-90 10 ${(T + H - B) / 2})`}>Production score</text>
      {pts.map(({ t, s, p }) => (
        <g key={t.i}>
          <circle cx={x(s)} cy={y(p)} r={t.i === me ? 7 : 5} fill={t.color} stroke={t.i === me ? "#1F2022" : "white"} strokeWidth={t.i === me ? 2.5 : 1.5} opacity={0.9}>
            <title>{`${t.name}: sales ${s.toFixed(2)}x, production ${p.toFixed(2)}x`}</title>
          </circle>
          {t.i === me && (
            <text x={x(s) + 10} y={y(p) + 4} fontSize="10" fontWeight={700} fill="#1F2022">You</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function HRDashboard({ team, gameState, universeId, onChange, onNotify }) {
  const saved = team?.hrCompensation || {};
  const [sales, setSales] = useState(packageFor(team, "sales"));
  const [production, setProduction] = useState(packageFor(team, "production"));
  // Score against the other teams' saved packages plus this team's live draft
  const teams = useMemo(
    () => (gameState?.teams || []).map((t) => (t.i === team.i ? { ...t, hrCompensation: { ...(t.hrCompensation || {}), sales, production } } : t)),
    [gameState?.teams, team.i, sales, production]
  );
  const salesStats = useMemo(() => scoreFor(sales, teams, "sales"), [sales, teams]);
  const productionStats = useMemo(() => scoreFor(production, teams, "production"), [production, teams]);
  const isLocked = Boolean(team?.dec?.locked);

  useEffect(() => {
    setSales(packageFor({ hrCompensation: saved }, "sales"));
    setProduction(packageFor({ hrCompensation: saved }, "production"));
  }, [team?.i]);

  const update = (kind, field, value) => {
    if (isLocked) return;
    const next = kind === "sales" ? { ...sales, [field]: value } : { ...production, [field]: value };
    if (kind === "sales") setSales(next);
    else setProduction(next);
    onChange({ ...team, hrCompensation: { ...(team.hrCompensation || {}), [kind]: next } });
  };

  // Engine effects: the sales score scales staff reach, the production score scales units built
  const staff = team.staff + (team.dec.hire || 0);
  const centres = team.centres + (team.dec.newCentres || 0);
  const bonus = marketBonusOf(gameState, team);
  const reachAt = (m) => withWebStore(reachOf({ centres, staff }, m, bonus), team);
  const line = lineEfficiencyOf(gameState, team, productionStats.score);
  const scheduled = team.models.reduce((x, m) => x + (team.dec.prod[m.id] || 0), 0);
  const live = { ...team, hrCompensation: { ...(team.hrCompensation || {}), sales, production } };
  const pay = payrollOf(live, staff);
  const factors = payFactorsOf(live);
  const costLine = (cost, factor) => (
    <div className="mt-1.5 pt-1.5 border-t border-[#EFEBE3] flex justify-between">
      <span>Payroll this quarter</span>
      <span className="font-mono font-semibold">
        Rs. {cost.toFixed(1)} L <span className={factor > 1.005 ? "text-red-700" : factor < 0.995 ? "text-emerald-700" : "text-[#8A8C90]"}>({Math.round(factor * 100)}% of default pay)</span>
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "Sales force score", value: `${salesStats.score.toFixed(2)}x`, note: `${staff} staff across ${centres} stores`, good: salesStats.score >= 1 },
          { label: "Distribution reach", value: `${(reachAt(salesStats.score) * 100).toFixed(0)}%`, note: `${(reachAt(1) * 100).toFixed(0)}% at market pay`, good: salesStats.score >= 1 },
          { label: "Production score", value: `${productionStats.score.toFixed(2)}x`, note: "units built per unit scheduled", good: productionStats.score >= 1 },
          { label: "Scheduled → built", value: `${scheduled.toLocaleString("en-IN")} → ${Math.round(scheduled * line.eff).toLocaleString("en-IN")}`, note: `changeover x${line.changeover.toFixed(2)}`, good: line.eff >= 1 }
        ].map((k) => (
          <div key={k.label} className="px-3 py-2.5 bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
            <div className="text-[11px] text-[#6C6D70]">{k.label}</div>
            <div className={`text-base font-bold font-mono ${k.good ? "text-emerald-700" : "text-amber-700"}`}>{k.value}</div>
            <div className="text-[10px] text-[#8A8C90] truncate">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <CompensationSection
          kind="sales"
          title="Sales force"
          icon={<Users className="w-4 h-4" />}
          pkg={sales}
          benchmarkPackage={salesStats.benchmarkPackage}
          score={salesStats.score}
          disabled={isLocked}
          onChange={(field, value) => update("sales", field, value)}
          effect={
            <>
              Each salesperson extends reach {salesStats.score >= 1 ? "further" : "less far"} than at market pay: projected reach{" "}
              <strong>{(reachAt(salesStats.score) * 100).toFixed(1)}%</strong> versus {(reachAt(1) * 100).toFixed(1)}% at the industry average. Extra reach only pays if you can supply the extra demand.
              {costLine(pay.sales, factors.sales)}
            </>
          }
        />
        <CompensationSection
          kind="production"
          title="Plant workforce"
          icon={<ShieldCheck className="w-4 h-4" />}
          pkg={production}
          benchmarkPackage={productionStats.benchmarkPackage}
          score={productionStats.score}
          disabled={isLocked}
          onChange={(field, value) => update("production", field, value)}
          effect={
            <>
              Of {scheduled.toLocaleString("en-IN")} units scheduled the line is expected to build <strong>{Math.round(scheduled * line.eff).toLocaleString("en-IN")}</strong>{" "}
              (changeover x{line.changeover.toFixed(2)} × productivity x{line.plant.toFixed(2)}). Productivity above 1x can win back changeover losses, never build beyond the schedule.
              {costLine(pay.plant, factors.plant)}
            </>
          }
        />
      </div>

      <section className="bg-white border border-[#E5E1D8] rounded-xl p-4 shadow-sm grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-[#5A5C60]" />
            <h2 className="text-sm font-bold">Where every team pays</h2>
          </div>
          <p className="text-[11px] text-[#6C6D70] mb-2">Scores are relative to the industry average (1.00x) and bounded between 0.75x and 1.25x.</p>
          <IndustryScatter teams={teams} me={team.i} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] text-[#77797D] border-b border-[#E5E1D8]">
                <th className="p-2 font-medium">Team</th>
                <th className="p-2 font-medium text-right">Sales score</th>
                <th className="p-2 font-medium text-right">Production score</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((rival) => {
                const s = scoreFor(packageFor(rival, "sales"), teams, "sales").score;
                const p = scoreFor(packageFor(rival, "production"), teams, "production").score;
                return (
                  <tr key={rival.i} className={`border-b border-[#F0EDE7] ${rival.i === team.i ? "bg-[#FAF8F5] font-semibold" : ""}`}>
                    <td className="p-2">
                      <span className="flex items-center gap-1.5">
                        <i className="w-2 h-2 rounded-full" style={{ background: rival.color }} />
                        {rival.name}
                        {rival.i === team.i ? " (you)" : ""}
                      </span>
                    </td>
                    <td className={`p-2 text-right font-mono ${s >= 1 ? "text-emerald-700" : "text-amber-700"}`}>{s.toFixed(2)}x</td>
                    <td className={`p-2 text-right font-mono ${p >= 1 ? "text-emerald-700" : "text-amber-700"}`}>{p.toFixed(2)}x</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="flex items-center gap-2 text-[11px] text-[#77797D]">
        <Factory className="w-4 h-4" /> Packages set productivity relative to the industry and payroll relative to the default package. Underpaying the plant loses output; overpaying it only helps when changeovers lose output.
      </div>
    </div>
  );
}
