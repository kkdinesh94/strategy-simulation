export type BatteryDisposition = "warranty" | "repurpose" | "recycle";

export type BatteryLifecycleDecision = {
  universeId?: string;
  teamId: string;
  quarter: number;
  disposition: BatteryDisposition;
};

export type BatteryLifecycleProjection = {
  quarter: number;
  returnedUnits: number;
  warrantyReserve: number;
  options: Record<BatteryDisposition, { cost: number; revenue: number; esgImpact: number }>;
};

export const BATTERY_RETURN_RATE = 0.1;
const REPURPOSE_REVENUE_PER_UNIT = 0.12;
const REPURPOSE_PROCESSING_COST_PER_UNIT = 0.025;
const RECYCLE_COST_PER_UNIT = 0.03;

export function batteryReturnsForQuarter(hist: Array<{ q?: number; units?: number }>, quarter: number): number {
  if (quarter < 5) return 0;
  const firstLifeSales = hist
    .filter((result) => Number(result.q) === 1 || Number(result.q) === 2)
    .reduce((total, result) => total + Number(result.units || 0), 0);
  return Math.round(firstLifeSales * BATTERY_RETURN_RATE);
}

export function projectBatteryLifecycle(hist: Array<{ q?: number; units?: number; warranty?: number }>, quarter: number): BatteryLifecycleProjection {
  const returnedUnits = batteryReturnsForQuarter(hist, quarter);
  const q1Q2Warranty = hist
    .filter((result) => Number(result.q) === 1 || Number(result.q) === 2)
    .reduce((total, result) => total + Number(result.warranty || 0), 0);
  const q1Q2Units = hist
    .filter((result) => Number(result.q) === 1 || Number(result.q) === 2)
    .reduce((total, result) => total + Number(result.units || 0), 0);
  const warrantyReserve = q1Q2Units > 0 ? q1Q2Warranty / q1Q2Units : 0;

  return {
    quarter,
    returnedUnits,
    warrantyReserve,
    options: {
      warranty: { cost: returnedUnits * warrantyReserve, revenue: 0, esgImpact: -2 },
      repurpose: { cost: returnedUnits * REPURPOSE_PROCESSING_COST_PER_UNIT, revenue: returnedUnits * REPURPOSE_REVENUE_PER_UNIT, esgImpact: 5 },
      recycle: { cost: returnedUnits * RECYCLE_COST_PER_UNIT, revenue: 0, esgImpact: 10 }
    }
  };
}

export function applyBatteryLifecycle(result: any, hist: Array<{ q?: number; units?: number; warranty?: number }>, quarter: number, disposition: BatteryDisposition) {
  const projection = projectBatteryLifecycle(hist, quarter);
  const selected = projection.options[disposition] || projection.options.warranty;
  const netImpact = selected.revenue - selected.cost;
  result.batteryReturns = projection.returnedUnits;
  result.batteryDisposition = disposition;
  result.batteryLifecycleCost = selected.cost;
  result.batteryLifecycleRevenue = selected.revenue;
  result.sustainabilityScore = selected.esgImpact;
  result.revenue += selected.revenue;
  result.ebitda += netImpact;
  result.profit += netImpact;
  result.cash += netImpact;
  return { projection, cost: selected.cost, revenue: selected.revenue, esgImpact: selected.esgImpact };
}