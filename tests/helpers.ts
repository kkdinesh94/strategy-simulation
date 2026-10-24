import { newState, simulateQuarter, unitCost, type QuarterEffects } from "../src/engine/simulationEngine";
import type { GameState, TeamState } from "../src/types/simulation";

export const ARCHES = ["premium", "commuter", "budget", "fleeteco"] as const;

/** Claims each archetype's starter model can truthfully back up (see auditTeam). */
export const TRUTHFUL_CLAIMS: Record<string, string[]> = {
  premium: ["tech", "perf"],
  commuter: ["range", "comfort"],
  budget: ["econ", "comfort"],
  fleeteco: ["econ", "safety"]
};

/** Four human teams (one per archetype) against six bots. */
export function league(): GameState {
  const arches = ["premium", "commuter", "budget", "fleeteco", "commuter", "budget", "premium", "commuter", "premium", "fleeteco"];
  return newState(arches.map((arch, i) => ({ name: `Team ${i + 1}`, arch, isBot: i >= 4 })), 12);
}

/** What a reasonable student team does: write a charter, produce to demand, react to stock-outs, expand when full. */
export function competent(t: TeamState, st: GameState) {
  t.vision ||= "Clean, dependable scooters for Indian cities.";
  t.mission ||= "Design, build and service scooters our riders trust.";
  const m = t.models[0];
  const last = t.hist[t.hist.length - 1];
  if (last && st.quarter > 2) {
    if (last.stockout) m.price = Math.round((m.price * 1.02) / 500) * 500;
    else if (last.endInv > last.units * 0.4) m.price = Math.max(Math.round((unitCost(m) * 1.15) / 500) * 500, Math.round((m.price * 0.98) / 500) * 500);
  }
  const demand = last ? last.units + last.lost : 0;
  t.dec.prod = { [m.id]: Math.min(t.capacity, st.quarter === 1 ? 600 : Math.max(0, Math.round(demand * 1.1 + 200 - (m.inv || 0)))) };
  t.dec.expBlocks = last && demand > t.capacity * 0.95 && t.cash > 900 ? 2 : 0;
  t.dec.ad = st.quarter <= 3 ? 250 : 300;
  t.dec.claims = TRUTHFUL_CLAIMS[t.arch];
  t.dec.quality = 20;
}

/** A team that only writes its charter and never changes a decision. */
export function passive(t: TeamState) {
  t.vision ||= "v";
  t.mission ||= "m";
}

export function playGame(strategy: (t: TeamState, st: GameState) => void, opts: { effects?: (st: GameState) => QuarterEffects; onQuarter?: (st: GameState, before: { cash: number }[]) => void } = {}) {
  const st = league();
  while (st.quarter <= st.cfg.quarters) {
    for (const t of st.teams) if (!t.isBot) strategy(t, st);
    const before = st.teams.map((t) => ({ cash: t.cash }));
    simulateQuarter(st, opts.effects ? opts.effects(st) : {});
    opts.onQuarter?.(st, before);
  }
  return st;
}

/** Net margin over quarters 6–12, once the business is established. */
export function lateMargin(t: TeamState): number {
  const late = t.hist.filter((r) => r.q >= 6);
  const revenue = late.reduce((s, r) => s + r.revenue, 0);
  return revenue ? late.reduce((s, r) => s + r.profit, 0) / revenue : 0;
}
