export const COMPETITIVE_BENCHMARK_REGION_COST = 15;

const tierFor = (value: unknown): string => {
  const id = String(value || "").toUpperCase();
  if (/1|STANDARD|BASIC|ENTRY/.test(id)) return "Entry";
  if (/2|3|MID|ENHANCED|PREMIUM/.test(id)) return "Mid";
  if (/4|5|10|ADVANCED|ULTRA|LONG/.test(id)) return "Premium";
  return value ? "Configured" : "Not disclosed";
};

const claimsFor = (team: any): string[] => (Array.isArray(team?.dec?.claims) ? team.dec.claims : []).slice(0, 2);

const placementsFor = (team: any): any[] => {
  const placements = team?.draft?.mediaPlacements;
  return Array.isArray(placements) && placements.length ? placements : [];
};

export function buildCompetitiveBenchmark(state: any, quarter: number, region: string) {
  const teams = Array.isArray(state?.teams) ? state.teams : [];
  const segments = [
    { id: "urban_commuter", name: "Urban Commuter", pct: 30 },
    { id: "fleet_operator", name: "Fleet Operator", pct: 25 },
    { id: "performance_enthusiast", name: "Performance Enthusiast", pct: 15 },
    { id: "tech_pioneer", name: "Tech Pioneer", pct: 15 },
    { id: "eco_advocate", name: "Eco Advocate", pct: 15 }
  ];
  const competitors = teams.map((team: any) => {
    const result = (team.hist || []).find((item: any) => Number(item.q) === quarter) || (team.hist || []).slice(-1)[0] || {};
    const modelRows = Array.isArray(result.modelRows) ? result.modelRows : [];
    const totalSales = modelRows.reduce((sum: number, model: any) => sum + Number(model.units || 0), 0);
    const shortfall = Math.max(0, Number(result.lost || 0));
    const segmentSales = segments.map((segment) => {
      const units = modelRows.reduce((sum: number, model: any) => sum + Number(model.segSales?.[segment.id] || 0), 0);
      const weight = totalSales > 0 ? units / totalSales : segment.pct / 100;
      return { segmentId: segment.id, segmentName: segment.name, unitsDemanded: Math.round(units + shortfall * weight) };
    });
    const models = (Array.isArray(team.models) ? team.models : []).map((model: any, index: number) => ({
      name: model.name || `Brand ${index + 1}`,
      price: Number(model.price || 0),
      components: Object.entries(model.cfg || {}).map(([category, value]) => ({ category, tier: tierFor(value) })),
      brandJudgment: Math.round(Number(result.judg?.[team.prim]?.p || result.brandJ || 0))
    }));
    const placements = placementsFor(team);
    const media = Object.entries(placements.reduce((counts: Record<string, number>, placement: any) => {
      const type = String(placement.mediaType || "Unspecified");
      counts[type] = (counts[type] || 0) + Math.max(0, Number(placement.insertions || 0));
      return counts;
    }, {})).map(([mediaType, insertions]) => ({ mediaType, insertions }));
    const people = Math.max(0, Math.round(Number(team.staff || 0)));
    return {
      teamId: String(team.i),
      brand: team.name,
      color: team.color,
      models,
      salesBySegment: segmentSales,
      advertising: { media, insertions: media.reduce((sum: number, item: any) => sum + Number(item.insertions), 0), adJudgment: Math.round(Number(result.campJ || 0)), topBenefitClaims: claimsFor(team) },
      salesForce: { peoplePerOffice: team.centres ? Math.round((people / team.centres) * 10) / 10 : people, offices: Math.max(0, Math.round(Number(team.centres || 0))), specialisation: [{ segment: team.prim || "Unassigned", people: Math.ceil(people * 0.6) }, { segment: team.sec || "Unassigned", people: Math.floor(people * 0.4) }] }
    };
  });
  const segmentTotals = segments.map((segment) => {
    const entries = competitors.map((competitor: any) => ({ brand: competitor.brand, color: competitor.color, units: competitor.salesBySegment.find((item: any) => item.segmentId === segment.id)?.unitsDemanded || 0 }));
    const total = entries.reduce((sum: number, entry: any) => sum + entry.units, 0);
    return { segmentId: segment.id, segmentName: segment.name, totalDemand: total, shares: entries.map((entry: any) => ({ ...entry, share: total ? entry.units / total : 0 })) };
  });
  return { quarter, region, competitors, segmentMarketShares: segmentTotals };
}
