/**
 * What the board advisor is allowed to see: the asking team's own position and decisions,
 * plus results every team can already see (market share, revenue, profit history).
 * Built on the server from the stored game, so rivals' pending decisions never leak.
 */
import { SEGMENTS } from "../engine/catalog";
import { debtOf, equityOf, reliabilityOf, unitCost } from "../engine/simulationEngine";
import type { GameState } from "../types/simulation";

export const ADVISOR_QUESTIONS_PER_QUARTER = 10;
export const ADVISOR_PROMPT_MAX = 600;

const r1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;

export function buildAdvisorContext(st: GameState, teamI: number) {
  const t = st.teams.find((x) => x.i === teamI);
  if (!t) throw new Error("Team was not found in this cohort.");
  const segName = (id: string) => SEGMENTS.find((s) => s.id === id)?.name || id;
  const recent = t.hist.slice(-3).map((r) => ({
    quarter: r.q, unitsSold: r.units, unitsLostToStockouts: r.lost, revenueL: r1(r.revenue), netProfitL: r1(r.profit),
    cashL: r1(r.cash), marketShare: r1(r.share * 100), reliability: r1(r.reliab * 100), distributionReach: r1(r.reach * 100), stockout: r.stockout
  }));
  const league = st.teams.map((x) => {
    const last = x.hist[x.hist.length - 1];
    return { team: x.name, isYou: x.i === teamI, marketShare: r1((last?.share || 0) * 100), revenueL: r1(last?.revenue || 0), netProfitL: r1(last?.profit || 0) };
  });
  return {
    currency: "Rs. lakh (L) unless stated; prices in rupees",
    quarter: st.quarter,
    quartersInGame: st.cfg.quarters,
    team: t.name,
    targetSegments: { primary: segName(t.prim), secondary: t.sec ? segName(t.sec) : null },
    position: { cashL: r1(t.cash), equityL: r1(equityOf(t)), debtL: r1(debtOf(t)), capacityUnits: t.capacity, stores: t.centres, salesStaff: t.staff, reliability: r1(reliabilityOf(t) * 100) },
    models: t.models.map((m) => ({ name: m.name, price: m.price, unitCost: Math.round(unitCost(m)), inventory: m.inv || 0, targetSegment: m.targetSegment ? segName(m.targetSegment) : null })),
    thisQuarterDecisions: {
      advertisingL: t.dec.ad, adClaims: t.dec.claims, production: t.dec.prod, qualitySpendL: t.dec.quality,
      hire: t.dec.hire, newStores: t.dec.newCentreCities?.length || 0, webStore: Boolean(t.dec.webStore),
      capacityBlocks: t.dec.expBlocks, locked: t.dec.locked
    },
    recentResults: recent,
    league,
    segments: SEGMENTS.map((s) => ({ name: s.name, shareOfMarket: r1(s.pct * 100), priceRange: s.wtp }))
  };
}
