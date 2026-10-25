/**
 * Activity-based costing for one completed quarter, built from the engine's own results
 * (team.hist). Materials are traced to each model directly; activity cost pools are
 * assigned to models by their cost driver. Costs with no activity driver stay at company
 * level, so the report always reconciles to the quarter's net profit.
 */
import { SEGMENTS } from "../engine/catalog";
import type { QuarterResult } from "../types/simulation";

export interface CostPool {
  key: "advertising" | "selling" | "service" | "plant";
  label: string;
  driver: string;
  amount: number; // Rs. L
}

export interface AbcModelRow {
  name: string;
  units: number;
  revenue: number;
  materials: number;
  pools: Record<CostPool["key"], number>;
  contribution: number;
  margin: number; // contribution / revenue
}

export interface AbcSegmentRow {
  id: string;
  name: string;
  units: number;
  revenue: number;
  contribution: number;
  margin: number;
}

export interface AbcReport {
  quarter: number;
  pools: CostPool[];
  models: AbcModelRow[];
  segments: AbcSegmentRow[];
  totalContribution: number;
  /** G&A, R&D, launches, research, licences, interest, depreciation, store openings... */
  companyLevel: number;
  profit: number;
}

const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

export function buildAbcReport(r: QuarterResult): AbcReport {
  const pools: CostPool[] = [
    { key: "advertising", label: "Advertising", driver: "share of revenue", amount: r.ad || 0 },
    { key: "selling", label: "Sales force & stores", driver: "share of units sold", amount: (r.salesPayroll || 0) + (r.netOpex || 0) },
    { key: "service", label: "Warranty & quality", driver: "share of units sold", amount: (r.warranty || 0) + (r.quality || 0) },
    { key: "plant", label: "Plant & holding", driver: "share of units sold", amount: (r.plantPayroll || 0) + (r.fixed || 0) + (r.holding || 0) }
  ];
  const rows = r.modelRows || [];
  const totalUnits = rows.reduce((s, m) => s + m.units, 0);
  const totalRevenue = rows.reduce((s, m) => s + (m.units * m.price) / 1e5, 0);

  const models: AbcModelRow[] = rows.map((m) => {
    const revenue = (m.units * m.price) / 1e5;
    const materials = (m.units * m.cost) / 1e5;
    const allocated = Object.fromEntries(
      pools.map((p) => [p.key, p.amount * (p.key === "advertising" ? share(revenue, totalRevenue) : share(m.units, totalUnits))])
    ) as AbcModelRow["pools"];
    const contribution = revenue - materials - Object.values(allocated).reduce((s, v) => s + v, 0);
    return { name: m.name, units: m.units, revenue, materials, pools: allocated, contribution, margin: share(contribution, revenue) };
  });

  // Each segment's sales carry their model's per-unit contribution.
  const segments: AbcSegmentRow[] = SEGMENTS.map((seg) => {
    let units = 0, revenue = 0, contribution = 0;
    rows.forEach((m, i) => {
      const u = m.segSales?.[seg.id] || 0;
      units += u;
      revenue += (u * m.price) / 1e5;
      contribution += models[i].units > 0 ? (models[i].contribution * u) / models[i].units : 0;
    });
    return { id: seg.id, name: seg.name, units, revenue, contribution, margin: share(contribution, revenue) };
  }).filter((s) => s.units > 0);

  const totalContribution = models.reduce((s, m) => s + m.contribution, 0);
  return { quarter: r.q, pools, models, segments, totalContribution, companyLevel: totalContribution - r.profit, profit: r.profit };
}
