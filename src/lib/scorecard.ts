/**
 * Balanced Scorecard — one definition used by the engine (to score each quarter),
 * the server (to store and export scores) and the Scorecard screen (to display them).
 *
 * Each dimension is scored 0–100 relative to the other teams that quarter (best = 100,
 * worst = 0), then combined as a weighted average, so the total is always 0–100 and
 * one weak dimension lowers the score instead of zeroing it.
 */
import type { QuarterResult, TeamState } from "../types/simulation";

export const BSC_DIMENSIONS = [
  { key: "financialPerformance", label: "Financial Performance", shortLabel: "Financial", weight: 15, higherIsBetter: true },
  { key: "financialRisk", label: "Financial Risk (debt / equity)", shortLabel: "Risk", weight: 10, higherIsBetter: false },
  { key: "marketPerformance", label: "Market Performance", shortLabel: "Market", weight: 20, higherIsBetter: true },
  { key: "marketingEffectiveness", label: "Marketing Effectiveness", shortLabel: "Marketing", weight: 10, higherIsBetter: true },
  { key: "investmentFuture", label: "Investment in Future", shortLabel: "Future", weight: 10, higherIsBetter: true },
  { key: "wealthCreation", label: "Wealth Creation", shortLabel: "Wealth", weight: 10, higherIsBetter: true },
  { key: "assetManagement", label: "Asset Management", shortLabel: "Assets", weight: 5, higherIsBetter: true },
  { key: "hrManagement", label: "HR Management", shortLabel: "People", weight: 5, higherIsBetter: true },
  { key: "manufacturingProductivity", label: "Manufacturing Productivity", shortLabel: "Manufacturing", weight: 10, higherIsBetter: true },
  { key: "sustainability", label: "Sustainability", shortLabel: "Sustainability", weight: 5, higherIsBetter: true }
] as const;

export type BscKey = (typeof BSC_DIMENSIONS)[number]["key"];
export type BscScores = Record<BscKey, number>;

const num = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);
const clamp100 = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

/** Raw (unscaled) metrics for one team's quarter. */
export function bscRawMetrics(team: TeamState, result: Partial<QuarterResult>, prior?: Partial<QuarterResult> | null): BscScores {
  const revenue = Math.max(1, num(result.revenue));
  const equity = Math.max(1, num(team.paidIn) + num(team.cumProfit));
  const debt = num(team.debt?.bank) + num(team.debt?.lt) + num(team.debt?.shark);
  const shares = Math.max(1, num(result.shares, team.shares || 100));
  const equityPerShare = equity / shares;
  const priorShares = Math.max(1, num(prior?.shares, shares));
  const priorEquityPerShare = prior ? Math.max(0, equity - num(result.profit)) / priorShares : equityPerShare;
  const assets = Math.max(1, num(result.cash, team.cash) + num(result.invValue) + num(result.ppe, team.ppe));
  return {
    financialPerformance: num(result.profit) / revenue,
    financialRisk: debt / equity,
    marketPerformance: avg([num(result.share), avg([num(result.sharePrim), num(result.shareSec)])]),
    marketingEffectiveness: avg([num(result.brandJ), num(result.campJ)]),
    investmentFuture: num(result.rndSpend) + num(result.quality) + num(result.dev),
    wealthCreation: priorEquityPerShare > 0 ? (equityPerShare - priorEquityPerShare) / priorEquityPerShare : 0,
    assetManagement: avg([num(result.revenue) / assets, num(result.util)]),
    hrManagement: avg([num(result.hrM?.sales, num(team.hr?.sales) / 100), num(result.hrM?.plant, num(team.hr?.plant) / 100)]) * 100,
    manufacturingProductivity: avg([num(result.reliab), Math.max(0, 1 - num(result.cogs) / revenue), num(result.util)]),
    sustainability: num(result.sustainabilityScore)
  };
}

/** Scales raw metrics to 0–100 across all teams (best = 100, worst = 0, all equal = 50). */
export function bscRelativeScores(raws: Record<string, BscScores>): Record<string, BscScores> {
  const ids = Object.keys(raws);
  const out: Record<string, BscScores> = {};
  for (const id of ids) out[id] = {} as BscScores;
  for (const d of BSC_DIMENSIONS) {
    const values = ids.map((id) => num(raws[id][d.key]));
    const hi = Math.max(...values);
    const lo = Math.min(...values);
    for (const id of ids) {
      const v = num(raws[id][d.key]);
      out[id][d.key] = hi > lo ? clamp100(((d.higherIsBetter ? v - lo : hi - v) / (hi - lo)) * 100) : 50;
    }
  }
  return out;
}

export function bscWeightedTotal(scores: Partial<BscScores>): number {
  return BSC_DIMENSIONS.reduce((total, d) => total + num(scores[d.key]) * d.weight, 0) / 100;
}
