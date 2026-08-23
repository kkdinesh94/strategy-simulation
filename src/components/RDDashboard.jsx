import React from "react";
import { CheckCircle2, Clock, FlaskConical, Lock, Zap } from "lucide-react";

const MAX_CONCURRENT_PROJECTS = 2;

const projectIdOf = (project) => project.project_id || project.projectId;
const investmentProjectIdOf = (investment) => investment.project_id || investment.projectId;

const formatCost = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")} L`;

function progressFor(investment, project, currentQuarter) {
  const start = Number(investment.q_start ?? investment.qStart ?? currentQuarter);
  const duration = Number(investment.quarters_to_complete ?? investment.quartersToComplete ?? project.quarters_to_complete ?? 1);
  const done = Number(investment.q_done ?? investment.qDone ?? start + duration);
  return Math.min(100, Math.max(0, Math.round(((currentQuarter - start + 1) / Math.max(1, done - start + 1)) * 100)));
}

export default function RDDashboard({
  projects = [],
  investments = [],
  currentQuarter = 1,
  onInvest,
  onCancel
}) {
  const investmentIds = new Set(investments.map(investmentProjectIdOf));
  const activeInvestments = investments.filter((investment) => !investment.completed);
  const canStartProject = activeInvestments.length < MAX_CONCURRENT_PROJECTS;
  const projectById = new Map(projects.map((project) => [projectIdOf(project), project]));
  const availableProjects = projects.filter((project) => !investmentIds.has(projectIdOf(project)));

  return (
    <div className="space-y-5 text-slate-900">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
            <FlaskConical className="h-4 w-4" /> R&D laboratory / Q{currentQuarter}
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Technology unlocks</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500">{activeInvestments.length}/{MAX_CONCURRENT_PROJECTS} concurrent projects</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Available R&D projects</h3>
        {availableProjects.length === 0 ? (
          <p className="text-sm text-slate-500">No locked components are waiting for investment.</p>
        ) : (
          <div className="space-y-3">
            {availableProjects.map((project) => {
              const oneQuarter = Number(project.cost_one_quarter ?? project.costOneQuarter ?? 0);
              const twoQuarters = Number(project.cost_two_quarters ?? project.costTwoQuarters ?? 0);
              const segments = project.benefit_segments || project.benefitSegments || [];
              const segmentText = Array.isArray(segments) ? segments.join(", ") : String(segments);
              return (
                <article key={projectIdOf(project)} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4 text-amber-600" />{project.name}</h4>
                      <p className="mt-1 text-xs text-slate-500">{project.description}</p>
                      {segmentText && <p className="mt-2 text-[11px] font-medium text-teal-700">Valued by: {segmentText}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={!canStartProject} onClick={() => onInvest?.(project, { quarters: 1, cost: oneQuarter })} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        <Zap className="h-3.5 w-3.5" /> 1 quarter · {formatCost(oneQuarter)}
                      </button>
                      <button type="button" disabled={!canStartProject} onClick={() => onInvest?.(project, { quarters: 2, cost: twoQuarters })} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        <Clock className="h-3.5 w-3.5" /> 2 quarters · {formatCost(twoQuarters)}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!canStartProject && <p className="mt-3 text-xs font-semibold text-amber-700">The lab is full. A maximum of two projects may run concurrently.</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Current investments</h3>
        {activeInvestments.length === 0 ? (
          <p className="text-sm text-slate-500">No R&D investments are in progress.</p>
        ) : (
          <div className="space-y-4">
            {activeInvestments.map((investment) => {
              const project = projectById.get(investmentProjectIdOf(investment)) || investment;
              const progress = progressFor(investment, project, currentQuarter);
              return (
                <div key={investmentProjectIdOf(investment)} className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{project.name}</span><span className="text-teal-700">{progress}%</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-teal-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} /></div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{investment.mode === "fast" ? "1-quarter track" : "2-quarter track"} · {formatCost(investment.cost)}</span>{onCancel && <button type="button" onClick={() => onCancel(investment)} className="font-semibold text-red-700">Cancel</button>}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-teal-600" /> Completed projects make their linked component selectable in VehicleDesigner.</div>
    </div>
  );
}