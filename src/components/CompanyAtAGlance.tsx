import React from "react";
import { CloudRain, Sparkles, Sun, ArrowRight } from "lucide-react";
import type { GameState, TeamState } from "../types/simulation";
import { SEGMENTS, TECHS, CLAIMS } from "../engine/catalog";
import {
  seasonOf,
  scoreModel,
  qualityFit,
  unitCost,
  lineEfficiencyOf,
  reachOf,
  withWebStore,
  marketBonusOf,
  hrMults,
  claimAudit,
  proFormaCalc
} from "../engine/simulationEngine";
import { ScooterVisualizer } from "./ScooterVisualizer";
import type { TabKey } from "./Navbar";

/** Every quarter of the game: season, the VC window, and profit for the quarters already played. */
export function QuarterJourney({ team, gameState }: { team: TeamState; gameState: GameState }) {
  const Q = gameState.cfg.quarters;
  const maxAbs = Math.max(1, ...team.hist.map((h) => Math.abs(h.profit)));
  return (
    <div className="bg-white border border-[#E5E1D8] rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold text-[#1F2022]">The road ahead</h2>
        <div className="flex gap-3 text-[10px] text-[#6C6D70]">
          <span className="flex items-center gap-1">
            <CloudRain className="w-3 h-3 text-sky-600" /> Monsoon x0.9
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" /> Festive x1.25
          </span>
          <span className="flex items-center gap-1">
            <i className="w-2 h-2 bg-emerald-600 rounded-sm" />/<i className="w-2 h-2 bg-red-600 rounded-sm" /> Profit / loss
          </span>
        </div>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Q}, minmax(0, 1fr))` }}>
        {Array.from({ length: Q }, (_, i) => {
          const q = i + 1;
          const s = seasonOf(q);
          const h = team.hist.find((r) => r.q === q);
          const isNow = q === gameState.quarter;
          const Icon = s.f > 1 ? Sparkles : s.f < 1 ? CloudRain : Sun;
          return (
            <div
              key={q}
              className={`relative rounded-lg border px-1 pt-1 pb-1.5 text-center ${isNow ? "border-[#C83E2B] bg-[#FDF3EF]" : q < gameState.quarter ? "border-[#EFEBE3] bg-[#FAF8F5]" : "border-dashed border-[#E0DCD3]"}`}
              title={`Q${q}: ${s.label}${h ? `, profit Rs. ${Math.round(h.profit)} L` : ""}`}
            >
              <div className={`text-[10px] font-semibold ${isNow ? "text-[#C83E2B]" : "text-[#5A5C60]"}`}>Q{q}</div>
              <Icon className={`w-3.5 h-3.5 mx-auto ${s.f > 1 ? "text-amber-600" : s.f < 1 ? "text-sky-600" : "text-[#C9C3B9]"}`} />
              <div className="relative h-8 mt-1">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-[#E0DCD3]" />
                {h && (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-2.5 rounded-sm ${h.profit >= 0 ? "bg-emerald-600" : "bg-red-600"}`}
                    style={{ height: `${Math.max(2, (Math.abs(h.profit) / maxAbs) * 16)}px`, ...(h.profit >= 0 ? { bottom: "50%" } : { top: "50%" }) }}
                  />
                )}
              </div>
              {q === gameState.cfg.vcQuarter && <div className="text-[9px] font-semibold text-purple-700">VC</div>}
              {q === 1 && <div className="text-[9px] text-[#8A8C90]">setup</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One small live picture per decision area; each opens that screen. */
export function CompanyAtAGlance({ team, gameState, onNavigate }: { team: TeamState; gameState: GameState; onNavigate: (tab: TabKey) => void }) {
  const flagship = team.models.slice().sort((a, b) => b.price - a.price)[0];
  const seg = SEGMENTS.find((s) => s.id === (flagship?.targetSegment ?? "S2")) || SEGMENTS[1];
  const fit = flagship ? Math.round(qualityFit(scoreModel(flagship, team), seg) * 100) : 0;
  const margin = flagship ? ((flagship.price - unitCost(flagship)) / flagship.price) * 100 : 0;
  const scheduled = team.models.reduce((x, m) => x + (team.dec.prod[m.id] || 0), 0);
  const line = lineEfficiencyOf(gameState, team);
  const util = team.capacity ? scheduled / team.capacity : 0;
  const reach = withWebStore(reachOf({ centres: team.centres + (team.dec.newCentres || 0), staff: team.staff + (team.dec.hire || 0) }, hrMults(gameState, team).sales, marketBonusOf(gameState, team)), team);
  const awareness = SEGMENTS.reduce((x, s) => x + (team.aw[s.id] || 0) * s.pct, 0);
  const claims = team.dec.claims || [];
  const refused = Object.values(claimAudit(team, claims)).filter(Boolean).length;
  const pf = proFormaCalc(gameState, team);

  const Card = ({ tab, title, value, note, tone, children }: { tab: TabKey; title: string; value: string; note: string; tone?: string; children: React.ReactNode }) => (
    <button type="button" onClick={() => onNavigate(tab)} className="group text-left bg-white border border-[#E5E1D8] rounded-xl p-3 hover:border-[#1F2022] transition flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between text-[11px] text-[#6C6D70]">
        {title}
        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
      </div>
      <div className="h-[58px] flex items-center">{children}</div>
      <div>
        <div className={`text-base font-semibold tabular-nums ${tone || "text-[#1F2022]"}`}>{value}</div>
        <div className="text-[11px] text-[#8A8C90] truncate">{note}</div>
      </div>
    </button>
  );

  const bar = (pct: number, color: string) => (
    <div className="w-full h-2.5 rounded-full bg-[#EDE9E1] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: color }} />
    </div>
  );

  return (
    <section aria-label="Company at a glance" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <Card tab="product" title="Product" value={flagship?.name || "No model"} note={`${seg.name} fit ${fit} · margin ${margin.toFixed(0)}%`} tone={margin < 12 ? "text-red-700" : undefined}>
        {flagship && (
          <div className="w-full [&_svg]:w-full [&_svg]:h-[58px]">
            <ScooterVisualizer model={flagship} color={team.color} width={150} bare />
          </div>
        )}
      </Card>
      <Card tab="operations" title="Plant" value={`${Math.round(util * 100)}% loaded`} note={`${Math.round(scheduled * line.eff).toLocaleString("en-IN")} units to be built`} tone={util > 1 ? "text-red-700" : undefined}>
        <div className="w-full flex gap-1">
          {Array.from({ length: Math.max(1, Math.round(team.capacity / 500)) }, (_, i) => (
            <div key={i} className="flex-1 h-8 rounded-sm bg-[#EDE9E1] overflow-hidden flex items-end">
              <div className="w-full bg-[#1F2022]" style={{ height: `${Math.max(0, Math.min(1, (scheduled - i * 500) / 500)) * 100}%` }} />
            </div>
          ))}
        </div>
      </Card>
      <Card tab="sales" title="Network" value={`${(reach * 100).toFixed(0)}% reach`} note={`${(team.storeCities || []).length + (team.dec.newCentreCities || []).length} stores · ${team.staff + (team.dec.hire || 0)} sales staff`}>
        {bar(reach, "#15803D")}
      </Card>
      <Card
        tab="marketing"
        title="Campaign"
        value={`${(awareness * 100).toFixed(0)}% aware`}
        note={claims.length ? `${claims.map((c) => CLAIMS[c].split(" ")[0]).join(" + ")}${refused ? ` · ${refused} refused` : ""}` : "no claims chosen"}
        tone={refused ? "text-red-700" : undefined}
      >
        <div className="w-full flex items-end gap-1 h-10">
          {SEGMENTS.map((s) => (
            <div key={s.id} className="flex-1 bg-[#EDE9E1] rounded-sm h-full flex items-end" title={`${s.name}: ${Math.round((team.aw[s.id] || 0) * 100)}%`}>
              <div className="w-full rounded-sm bg-[#2563EB]" style={{ height: `${(team.aw[s.id] || 0) * 100}%` }} />
            </div>
          ))}
        </div>
      </Card>
      <Card tab="rnd" title="R&D" value={`${team.techs.length} of ${TECHS.length} owned`} note={team.rnd.length ? `${team.rnd.length} in the lab` : "lab idle"}>
        <div className="w-full grid grid-cols-6 gap-1">
          {TECHS.map((t) => (
            <div
              key={t.id}
              title={t.name}
              className="h-8 rounded-sm"
              style={{ background: team.techs.includes(t.id) ? "#15803D" : team.rnd.some((p) => p.id === t.id) ? "#C77D0A" : "#EDE9E1" }}
            />
          ))}
        </div>
      </Card>
      <Card tab="finance" title="Cash" value={`Rs. ${Math.round(pf.close).toLocaleString("en-IN")} L`} note="projected close this quarter" tone={pf.close < 0 ? "text-red-700" : undefined}>
        <div className="w-full flex items-end gap-1 h-10">
          {team.hist.slice(-8).map((h) => (
            <div key={h.q} className="flex-1 rounded-sm bg-[#15803D]/70" title={`Q${h.q}: Rs. ${Math.round(h.cash)} L`} style={{ height: `${Math.max(6, (Math.max(0, h.cash) / Math.max(1, ...team.hist.map((x) => x.cash))) * 100)}%` }} />
          ))}
          <div className={`flex-1 rounded-sm ${pf.close < 0 ? "bg-red-500" : "bg-[#15803D]/30"} border border-dashed border-[#15803D]`} style={{ height: `${Math.max(6, (Math.max(0, pf.close) / Math.max(1, pf.close, ...team.hist.map((x) => x.cash))) * 100)}%` }} title="This quarter (projected)" />
        </div>
      </Card>
    </section>
  );
}
