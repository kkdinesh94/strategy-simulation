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

/** Packs reach end of first life one year (four quarters) after the scooter was sold. */
export const BATTERY_FIRST_LIFE_QUARTERS = 4;

function soldInQuarter(hist: Array<{ q?: number; units?: number; warranty?: number }>, quarter: number) {
  return hist.find((result) => Number(result.q) === quarter);
}

export function batteryReturnsForQuarter(hist: Array<{ q?: number; units?: number }>, quarter: number): number {
  const sold = soldInQuarter(hist, quarter - BATTERY_FIRST_LIFE_QUARTERS);
  return Math.round(Number(sold?.units || 0) * BATTERY_RETURN_RATE);
}

export function projectBatteryLifecycle(hist: Array<{ q?: number; units?: number; warranty?: number }>, quarter: number): BatteryLifecycleProjection {
  const returnedUnits = batteryReturnsForQuarter(hist, quarter);
  const sold = soldInQuarter(hist, quarter - BATTERY_FIRST_LIFE_QUARTERS);
  // Warranty cost per returned pack mirrors the warranty cost per unit booked when it was sold.
  const warrantyReserve = Number(sold?.units) > 0 ? Number(sold?.warranty || 0) / Number(sold!.units) : 0;

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
