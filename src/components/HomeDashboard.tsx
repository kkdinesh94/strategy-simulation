import React from "react";
import { ArrowRight, CheckCircle2, Clock, Lock, Trophy } from "lucide-react";
import type { GameState, TeamState } from "../types/simulation";
import type { Universe } from "../types/auth";
import { cumBSC, equityOf, leaderboardOf, seasonOf } from "../engine/simulationEngine";
import { fmtL } from "../engine/catalog";
import QuarterChecklist from "./QuarterChecklist";
import { StrategySummary } from "./StrategyWizard";
import { NewsText } from "./NewsText";
import type { TabKey } from "./Navbar";

interface HomeDashboardProps {
  team: TeamState;
  gameState: GameState;
  universe: Universe;
  readOnly: boolean;
  onNavigate: (tab: TabKey) => void;
  onLockToggle: () => void;
}

function Kpi({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-[#1F2022]";
  return (
    <div className="bg-white border border-[#E5E1D8] rounded-xl p-4 min-w-0">
      <div className="text-xs text-[#6C6D70]">{label}</div>
      <div className={`mt-1 text-xl sm:text-2xl font-semibold tabular-nums truncate ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-[#8A8C90] truncate">{hint}</div>}
    </div>
  );
}

const signedL = (v: number) => `${v < 0 ? "−" : ""}Rs. ${fmtL(Math.abs(v))} L`;

export function HomeDashboard({ team, gameState, universe, readOnly, onNavigate, onLockToggle }: HomeDashboardProps) {
  const last = team.hist[team.hist.length - 1];
  const gameOver = gameState.phase === "gameover";
  const q = gameState.quarter;
  const season = seasonOf(Math.min(q, gameState.cfg.quarters));
  const board = leaderboardOf(gameState);
  const rank = board.findIndex((row) => row.i === team.i) + 1;
  const report = gameState.reports[gameState.reports.length - 1];
  const deadline = universe.deadlineISO ? new Date(universe.deadlineISO) : null;

  return (
    <div className="space-y-6 max-w-6xl">
      <section className="bg-white border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C83E2B]">
            {gameOver ? "Final results" : `Quarter ${q} of ${gameState.cfg.quarters}`}
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-semibold text-[#1F2022]">
            {gameOver
              ? `${team.name} finished ${rank ? `#${rank} of ${board.length}` : "the game"}`
              : team.dec.locked
              ? "Decisions submitted"
              : q === 1
              ? "Set up your company"
              : "Plan this quarter's decisions"}
          </h1>
          <p className="mt-1.5 text-sm text-[#5A5C60] leading-relaxed">
            {gameOver
              ? "The simulation is over. Review your scorecard and statements in Results."
              : team.dec.locked
              ? readOnly
                ? "This team has submitted its decisions."
                : "Your instructor will run the quarter. You can unlock to make changes until then."
              : q === 1
              ? "Quarter 1 is for setup: write your charter, choose target segments and plan production. Customers start buying in Quarter 2."
              : `${season.label}. Work through the checklist, check your cash forecast, then lock and submit.`}
          </p>
          {deadline && !gameOver && (
            <p className="mt-2 text-sm text-[#3A3C40] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#8A8C90]" /> Deadline {deadline.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        {!gameOver && !readOnly && (
          <button
            onClick={onLockToggle}
            className={`shrink-0 px-5 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
              team.dec.locked ? "bg-white border border-[#E0DCD3] text-[#1F2022] hover:bg-[#F3F0EA]" : "bg-[#1F2022] text-white hover:bg-[#343538]"
            }`}
          >
            {team.dec.locked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4" />}
            {team.dec.locked ? "Unlock to edit" : "Review & submit"}
          </button>
        )}
        {gameOver && (
          <button onClick={() => onNavigate("performance")} className="shrink-0 px-5 py-3 rounded-xl text-sm font-semibold bg-[#1F2022] text-white flex items-center gap-2">
            <Trophy className="w-4 h-4" /> See final scorecard
          </button>
        )}
      </section>

      <section aria-label="Key figures" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Cash" value={`Rs. ${fmtL(team.cash)} L`} hint={team.cash < 200 ? "Running low" : "Available now"} tone={team.cash < 200 ? "bad" : "default"} />
        <Kpi label="Shareholders' equity" value={`Rs. ${fmtL(equityOf(team))} L`} hint={`Paid-in Rs. ${fmtL(team.paidIn)} L`} />
        <Kpi label="Scorecard" value={last ? cumBSC(team).toFixed(1) : "—"} hint={rank ? `Rank ${rank} of ${board.length}` : "Scored from Quarter 1"} />
        <Kpi
          label={last ? `Q${last.q} profit` : "Last quarter profit"}
          value={last ? signedL(last.profit) : "—"}
          hint={last ? `${last.units.toLocaleString("en-IN")} units sold · ${(last.share * 100).toFixed(1)}% share` : "No results yet"}
          tone={last ? (last.profit >= 0 ? "good" : "bad") : "default"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <h2 className="text-sm font-semibold text-[#1F2022] mb-2">This quarter's checklist</h2>
          <QuarterChecklist universeId={universe.id} teamId={team.i} quarter={q} onNavigate={onNavigate} team={team} />
        </section>
        <section className="min-w-0 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-[#1F2022] mb-2">Your strategy</h2>
            <StrategySummary universeId={universe.id} teamId={team.i} quarter={q} onOpen={() => onNavigate("charter")} />
          </div>
          {report && (
            <div className="bg-white border border-[#E5E1D8] rounded-xl">
              <div className="px-4 py-3 border-b border-[#EEEAE2] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#1F2022]">Market news · Q{report.q}</h2>
                <button onClick={() => onNavigate("performance")} className="text-xs text-[#5A5C60] hover:text-[#1F2022] flex items-center gap-1">
                  All results <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="divide-y divide-[#F0ECE5]">
                {report.news.slice(0, 5).map((line, i) => (
                  <li key={i} className="px-4 py-2.5 text-sm text-[#3A3C40] leading-relaxed">
                    <NewsText text={line} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
