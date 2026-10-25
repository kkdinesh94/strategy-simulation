import { GameState, ScooterModel, TeamState } from "../types/simulation";
import { MARKETS, SEGMENTS, BALANCE } from "../engine/catalog";
import { hrMults, priceFit, qualityFit, reachOf, scoreModel, simulateQuarter, type QuarterEffects } from "../engine/simulationEngine";
import { BatteryDisposition } from "./batteryLifecycle";
import { BSC_DIMENSIONS } from "./scorecard";

export type PolicyEvent = {
  event_id: string;
  quarter: number;
  region: string;
  event_type: string;
  description: string;
  demand_impact_pct: number;
  cost_impact_pct: number;
  eligible_segment: string | null;
  eligibility_condition: string | null;
};

export type QuarterLog = { step: string; status: "complete" | "info"; detail: string };

export type DemandResult = {
  demand_id: string;
  universe_id: string;
  quarter: number;
  region: string;
  team_i: string;
  brand_id: string;
  brand_name: string;
  segment_id: string;
  base_segment_size: number;
  brand_judgment_score: number;
  price_judgment_score: number;
  advertising_impact_score: number;
  sales_force_productivity: number;
  channel_coverage_factor: number;
  demand_units: number;
  policy_demand_impact_pct: number;
};

export type BatteryDecision = { teamId: string; disposition: BatteryDisposition };

/** Charging demand boost per team and region, in percent. */
export type ChargingBoost = Record<string, Record<string, number>>;

/** Per-team charger costs this quarter, Rs. L. */
export type ChargingCosts = Record<string, { maintenance: number; installation: number }>;

const batteryRanges: Record<string, number> = { BC1: 100, BC2: 80, BC3: 75, BC4: 65, BC5: 50 };

function meetsEligibility(model: any, condition: string | null): boolean {
  if (!condition) return true;
  const match = condition.trim().match(/^([a-z_]+)\s*(>=|<=|=|>|<)\s*([\d.]+)\s*km?$/i);
  if (!match) return false;
  const [, field, operator, rawValue] = match;
  const metrics: Record<string, number> = {
    battery_range: batteryRanges[model?.cfg?.battery] || Number(model?.range) || 0,
    charging_score: Number(model?.chargingScore) || ({ BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 } as Record<string, number>)[model?.cfg?.battery] || 0
  };
  const actual = metrics[field.toLowerCase()];
  const expected = Number(rawValue);
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return operator === ">=" ? actual >= expected : operator === "<=" ? actual <= expected : operator === ">" ? actual > expected : operator === "<" ? actual < expected : actual === expected;
}

/** Regions where a team sells: "Global" plus the regions and cities of its stores. */
function teamRegions(team: TeamState): Set<string> {
  const out = new Set<string>(["Global"]);
  for (const id of team.storeCities || []) {
    const market = MARKETS.find((m) => m.id === id);
    if (market) {
      out.add(market.region);
      out.add(market.city);
    }
  }
  return out;
}

/** Combined demand impact (fraction, e.g. 0.1 = +10%) of this quarter's policy events on one model in one segment. */
export function policyImpact(team: TeamState, model: ScooterModel, segmentId: string, quarter: number, policies: PolicyEvent[]): number {
  if (!policies.length) return 0;
  const segment = SEGMENTS.find((s) => s.id === segmentId);
  const regions = teamRegions(team);
  return policies
    .filter((event) => Number(event.quarter) === quarter && regions.has(event.region))
    .filter((event) => !event.eligible_segment || event.eligible_segment === segmentId || event.eligible_segment.toLowerCase() === segment?.name.toLowerCase())
    .filter((event) => meetsEligibility(model, event.eligibility_condition))
    .reduce((impact, event) => impact + Number(event.demand_impact_pct || 0), 0);
}

/** Total charging boost for a team as a fraction, capped so infrastructure cannot buy unlimited demand. */
export function chargingBoostOf(boost: ChargingBoost, teamI: number): number {
  const total = Object.values(boost[String(teamI)] || {}).reduce((sum, pct) => sum + Number(pct || 0), 0) / 100;
  return Math.min(BALANCE.maxChargingBoost, Math.max(0, total));
}

/** Diagnostic demand rows (stored for Fast Test reports); actual sales come from the engine. */
export function calculateDemand(state: GameState, universeId: string, policies: PolicyEvent[] = [], chargingBoost: ChargingBoost = {}): DemandResult[] {
  const quarter = state.quarter;
  const season = (quarter - 1) % 4 === 1 ? 0.9 : (quarter - 1) % 4 === 2 ? 1.25 : 1;
  const tam = quarter === 1 ? 0 : state.cfg.tam0 * Math.pow(1 + state.cfg.growth, quarter - 1) * season;
  const output: DemandResult[] = [];
  for (const team of state.teams) {
    const salesProductivity = hrMults(state, team).sales;
    const coverage = Math.max(0.05, Math.min(1, reachOf(team, salesProductivity)));
    const charging = chargingBoostOf(chargingBoost, team.i);
    for (const model of team.models) for (const segment of SEGMENTS) {
      const scores = scoreModel(model, team);
      let brandJudgment = Math.max(0, Math.min(100, qualityFit(scores, segment) * 100));
      // Line-extension naming bonus: a rename judged as a continuation of the prior brand keeps some awareness.
      if ((model as any).brandLoyaltyCarryOver) brandJudgment = Math.min(100, brandJudgment * 1.05);
      const priceJudgment = Math.max(0, Math.min(100, priceFit(model.price, segment) * 100));
      const spend = (Number(team.dec.ad) || 0) * (Number(team.dec.alloc?.[segment.id]) || 0) / 100;
      const claimFit = (team.dec.claims || []).reduce((total, claim) => total + (segment.w[claim] || 0), 0) / 100;
      const advertisingImpact = Math.max(0, Math.min(1, (team.dec.claims?.length ? 0.8 + 0.8 * claimFit : 0.9) * 0.9 * (1 - Math.exp(-spend / 120))));
      const policyPct = policyImpact(team, model, segment.id, quarter, policies);
      const baseSize = tam * segment.pct;
      const demandUnits = baseSize * brandJudgment / 100 * priceJudgment / 100 * advertisingImpact * salesProductivity * coverage * (1 + policyPct) * (1 + charging);
      output.push({
        demand_id: `${universeId}:${quarter}:Global:${team.i}:${model.id}:${segment.id}`,
        universe_id: universeId,
        quarter,
        region: "Global",
        team_i: String(team.i),
        brand_id: model.id,
        brand_name: model.name,
        segment_id: segment.id,
        base_segment_size: baseSize,
        brand_judgment_score: brandJudgment,
        price_judgment_score: priceJudgment,
        advertising_impact_score: advertisingImpact,
        sales_force_productivity: salesProductivity,
        channel_coverage_factor: coverage,
        demand_units: demandUnits,
        policy_demand_impact_pct: policyPct
      });
    }
  }
  return output;
}

export interface QuarterInputs {
  policies?: PolicyEvent[];
  batteryDecisions?: BatteryDecision[];
  chargingBoost?: ChargingBoost;
  chargingCosts?: ChargingCosts;
  licence?: Record<number, { paid: number; recd: number }>;
}

/** Runs one quarter for every team with all external effects applied. Mutates and returns `state`. */
export function processQuarterState(state: GameState, universeId = "pending", inputs: QuarterInputs = {}): { state: GameState; logs: QuarterLog[]; demand: DemandResult[] } {
  const quarter = state.quarter;
  const policies = inputs.policies || [];
  const chargingBoost = inputs.chargingBoost || {};
  const demand = calculateDemand(state, universeId, policies, chargingBoost);

  const extraOpex: Record<number, number> = {};
  const extraCapex: Record<number, number> = {};
  const battery: Record<number, BatteryDisposition> = {};
  for (const team of state.teams) {
    const costs = inputs.chargingCosts?.[String(team.i)];
    if (costs) {
      extraOpex[team.i] = costs.maintenance;
      extraCapex[team.i] = costs.installation;
    }
    const choice = inputs.batteryDecisions?.find((d) => String(d.teamId) === String(team.i))?.disposition;
    if (choice) battery[team.i] = choice;
  }
  const effects: QuarterEffects = {
    demandMult: (team, model, segmentId) => (1 + policyImpact(team, model, segmentId, quarter, policies)) * (1 + chargingBoostOf(chargingBoost, team.i)),
    extraOpex,
    extraCapex,
    licence: inputs.licence || {},
    battery
  };

  simulateQuarter(state, effects);

  const returned = state.teams.reduce((sum, t) => sum + Number((t.hist[t.hist.length - 1] as any)?.batteryReturns || 0), 0);
  const logs: QuarterLog[] = [
    { step: "lock", status: "complete", detail: `Locked decisions for Q${quarter}.` },
    { step: "demand", status: "complete", detail: `Applied ${policies.length} policy event(s) and charging networks to customer demand.` },
    { step: "production", status: "complete", detail: `Simulated production and sales for ${state.teams.length} teams.` },
    { step: "financials", status: "complete", detail: "Posted revenue, costs, financing and cash for every team." },
    ...(returned > 0 ? [{ step: "battery", status: "complete" as const, detail: `Processed ${returned.toLocaleString("en-IN")} end-of-first-life battery packs.` }] : []),
    { step: "scores", status: "complete", detail: "Computed balanced scorecards." },
    { step: "advance", status: "complete", detail: `Advanced the game to Q${state.quarter}.` }
  ];
  return { state, logs, demand };
}

/** Rows for the balanced_scorecard table, using the same named dimensions the CSV export reads. */
export function scorecardRecords(state: GameState, quarter: number) {
  return state.teams.map((team: TeamState) => {
    const result: any = team.hist.find((row) => row.q === quarter) || {};
    const parts = result.bsc?.parts || {};
    const dimensions = Object.fromEntries(BSC_DIMENSIONS.map((d) => [d.key, Number(parts[d.key] || 0)]));
    return { teamId: String(team.i), teamName: team.name, score: Number(result.bsc?.total || 0), dimensions, raw: result };
  });
}

/**
 * Runs the cohort's current quarter on the server. `expectedQuarter` guards against a
 * double-click or a stale screen running two quarters in a row.
 */
export async function runQuarterWorkflow(db: any, universeId: string, expectedQuarter?: number) {
  await db.exec(`CREATE TABLE IF NOT EXISTS game_state (universe_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL DEFAULT 1, decisions_locked INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS policy_events (event_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL, region TEXT NOT NULL, event_type TEXT NOT NULL, description TEXT NOT NULL, demand_impact_pct REAL NOT NULL DEFAULT 0, cost_impact_pct REAL NOT NULL DEFAULT 0, eligible_segment TEXT, eligibility_condition TEXT);
    CREATE TABLE IF NOT EXISTS demand_results (demand_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, team_i TEXT NOT NULL, brand_id TEXT NOT NULL, brand_name TEXT NOT NULL, segment_id TEXT NOT NULL, base_segment_size REAL NOT NULL, brand_judgment_score REAL NOT NULL, price_judgment_score REAL NOT NULL, advertising_impact_score REAL NOT NULL, sales_force_productivity REAL NOT NULL, channel_coverage_factor REAL NOT NULL, demand_units REAL NOT NULL, policy_demand_impact_pct REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS fast_test_results (result_id TEXT PRIMARY KEY, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, result_type TEXT NOT NULL, subject_id TEXT NOT NULL, subject_name TEXT NOT NULL, segment_id TEXT NOT NULL, segment_name TEXT NOT NULL, brand_judgment REAL, price_judgment REAL, ad_judgment REAL, reliability_judgment REAL, purchase_cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (team_id, quarter, region, result_type, subject_id, segment_id));
    CREATE TABLE IF NOT EXISTS balanced_scorecard (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, team_name TEXT NOT NULL, overall_score REAL NOT NULL, dimensions_json TEXT NOT NULL, raw_metrics_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter));
    CREATE TABLE IF NOT EXISTS battery_lifecycle_decisions (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, disposition TEXT NOT NULL CHECK (disposition IN ('warranty', 'repurpose', 'recycle')), returned_units REAL NOT NULL DEFAULT 0, warranty_reserve REAL NOT NULL DEFAULT 0, cost REAL NOT NULL DEFAULT 0, revenue REAL NOT NULL DEFAULT 0, esg_impact REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter));
    CREATE TABLE IF NOT EXISTS rd_projects (project_id TEXT PRIMARY KEY, name TEXT, description TEXT, component_unlocked TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rd_license_offers (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, seller_team_id TEXT NOT NULL, buyer_team_id TEXT NOT NULL, project_id TEXT NOT NULL, license_fee REAL NOT NULL CHECK (license_fee >= 1), special_terms TEXT NOT NULL DEFAULT '', offered_quarter INTEGER NOT NULL, execute_quarter INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'rejected', 'executed')), accepted_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS team_component_access (game_id TEXT NOT NULL, team_id TEXT NOT NULL, component_id TEXT NOT NULL, source_license_id TEXT, unlocked_quarter INTEGER NOT NULL, PRIMARY KEY (game_id, team_id, component_id));
    CREATE TABLE IF NOT EXISTS charging_network (team_id TEXT NOT NULL, region TEXT NOT NULL, quarter INTEGER NOT NULL, charger_count INTEGER NOT NULL DEFAULT 0, charger_type TEXT NOT NULL CHECK (charger_type IN ('Level 2 AC', 'DC Fast Charge', 'Ultra-rapid 350kW')), installation_cost REAL NOT NULL DEFAULT 0, quarterly_maintenance REAL NOT NULL DEFAULT 0, demand_boost_pct REAL NOT NULL DEFAULT 0, UNIQUE (team_id, region, quarter));
    CREATE TABLE IF NOT EXISTS production_schedules (schedule_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, inputs_json TEXT NOT NULL, outputs_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter));`);
  try { await db.exec("ALTER TABLE demand_results ADD COLUMN policy_demand_impact_pct REAL NOT NULL DEFAULT 0"); } catch { /* column exists */ }
  try { await db.exec("ALTER TABLE universes ADD COLUMN deadline_iso TEXT"); } catch { /* column exists */ }

  const universe: any = await db.prepare("SELECT id, game_state FROM universes WHERE id = ?").bind(universeId).first();
  if (!universe) throw new Error("Simulation universe was not found.");
  const state: GameState = typeof universe.game_state === "string" ? JSON.parse(universe.game_state) : universe.game_state;
  const currentQuarter = Number(state.quarter || 1);
  if (currentQuarter > state.cfg.quarters) throw new Error("This game has already finished.");

  if (expectedQuarter !== undefined && Number(expectedQuarter) !== currentQuarter) {
    throw new Error(`Quarter ${expectedQuarter} has already been run. The cohort is now on Quarter ${currentQuarter}.`);
  }

  // One processing run at a time per cohort, claimed with a single atomic UPDATE. A claim older
  // than five minutes is left over from a crashed run and may be taken over. The claim is
  // always released in `finally`, so a failed run can never leave the cohort stuck.
  await db.prepare("INSERT OR IGNORE INTO game_state (universe_id, quarter, decisions_locked) VALUES (?, ?, 0)").bind(universeId, currentQuarter).run();
  const claim: any = await db.prepare("UPDATE game_state SET decisions_locked = 1, quarter = ?, updated_at = datetime('now') WHERE universe_id = ? AND (decisions_locked = 0 OR updated_at < datetime('now', '-5 minutes'))").bind(currentQuarter, universeId).run();
  if (Number(claim?.meta?.changes || 0) !== 1) throw new Error(`Quarter ${currentQuarter} is already being processed. Try again in a moment.`);

  try {
    const fresh: any = await db.prepare("SELECT json_extract(game_state, '$.quarter') AS q FROM universes WHERE id = ?").bind(universeId).first();
    if (Number(fresh?.q) !== currentQuarter) throw new Error(`Quarter ${currentQuarter} has already been run.`);
    const policies = ((await db.prepare("SELECT * FROM policy_events WHERE quarter = ?").bind(currentQuarter).all()).results || []) as PolicyEvent[];
    const batteryDecisions = (((await db.prepare("SELECT team_i, disposition FROM battery_lifecycle_decisions WHERE universe_id = ? AND quarter = ?").bind(universeId, currentQuarter).all()).results || []) as any[])
      .map((row) => ({ teamId: String(row.team_i), disposition: row.disposition as BatteryDisposition }));

    // Component licences agreed between teams: fees flow through each team's P&L.
    const licence: Record<number, { paid: number; recd: number }> = {};
    const dueLicenses = ((await db.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND status = 'accepted' AND execute_quarter <= ?").bind(universeId, currentQuarter).all()).results || []) as any[];
    const writes: any[] = [];
    for (const offer of dueLicenses) {
      const fee = Number(offer.license_fee) || 0;
      (licence[Number(offer.buyer_team_id)] ||= { paid: 0, recd: 0 }).paid += fee;
      (licence[Number(offer.seller_team_id)] ||= { paid: 0, recd: 0 }).recd += fee;
      writes.push(db.prepare("UPDATE rd_license_offers SET status = 'executed' WHERE id = ?").bind(offer.id));
      writes.push(db.prepare("INSERT OR IGNORE INTO team_component_access (game_id, team_id, component_id, source_license_id, unlocked_quarter) SELECT ?, ?, component_unlocked, ?, ? FROM rd_projects WHERE project_id = ?").bind(universeId, offer.buyer_team_id, offer.id, currentQuarter, offer.project_id));
    }

    // Chargers stay deployed once built: maintenance and their demand boost recur every quarter;
    // installation is capital spending in the quarter they were bought.
    const chargingBoost: ChargingBoost = {};
    const chargingCosts: ChargingCosts = {};
    const chargingRows = state.teams.length
      ? (((await db.prepare(`SELECT * FROM charging_network WHERE quarter <= ? AND team_id IN (${state.teams.map(() => "?").join(",")})`).bind(currentQuarter, ...state.teams.map((team) => `${universeId}:${team.i}`)).all()).results || []) as any[])
      : [];
    for (const row of chargingRows) {
      const team = state.teams.find((candidate) => `${universeId}:${candidate.i}` === String(row.team_id));
      if (!team) continue;
      const costs = (chargingCosts[String(team.i)] ||= { maintenance: 0, installation: 0 });
      costs.maintenance += Number(row.quarterly_maintenance) || 0;
      if (Number(row.quarter) === currentQuarter) costs.installation += Number(row.installation_cost) || 0;
      const teamBoost = (chargingBoost[String(team.i)] ||= {});
      teamBoost[row.region] = (teamBoost[row.region] || 0) + (Number(row.demand_boost_pct) || 0);
    }

    const schedules = ((await db.prepare("SELECT team_i, inputs_json, outputs_json FROM production_schedules WHERE universe_id = ? AND quarter = ?").bind(universeId, currentQuarter).all()).results || []) as any[];
    for (const schedule of schedules) {
      const team = state.teams.find((candidate) => String(candidate.i) === String(schedule.team_i));
      if (!team) continue;
      const inputs = JSON.parse(schedule.inputs_json || "{}");
      const outputs = JSON.parse(schedule.outputs_json || "{}");
      const scheduled = Array.isArray(outputs.days)
        ? outputs.days.reduce((production: Record<string, number>, day: any) => {
            if (day.brandId) production[String(day.brandId)] = (production[String(day.brandId)] || 0) + Number(day.units || 0);
            return production;
          }, {})
        : outputs.prod || outputs.production || inputs.prod || inputs.production;
      if (scheduled && Object.keys(scheduled).length) team.dec.prod = scheduled;
    }

    const result = processQuarterState(state, universeId, { policies, batteryDecisions, chargingBoost, chargingCosts, licence });

    for (const team of result.state.teams) {
      const r: any = team.hist.find((row) => row.q === currentQuarter);
      writes.push(db.prepare("UPDATE battery_lifecycle_decisions SET returned_units = ?, cost = ?, revenue = ?, esg_impact = ?, updated_at = datetime('now') WHERE universe_id = ? AND team_i = ? AND quarter = ?")
        .bind(Number(r?.batteryReturns || 0), Number(r?.batteryLifecycleCost || 0), Number(r?.batteryLifecycleRevenue || 0), Number(r?.sustainabilityScore || 0), universeId, String(team.i), currentQuarter));
      writes.push(db.prepare("INSERT OR REPLACE INTO fast_test_results (result_id, team_id, quarter, region, result_type, subject_id, subject_name, segment_id, segment_name, reliability_judgment) VALUES (?, ?, ?, 'Global', 'reliability', 'company', 'Company reliability', 'company', 'Company-wide', ?)")
        .bind(`fast:${universeId}:${team.i}:${currentQuarter}:reliability`, `${universeId}:${team.i}`, currentQuarter, Math.round(Number(r?.reliab || 0) * 100)));
    }
    const demandColumns = "(demand_id, universe_id, quarter, region, team_i, brand_id, brand_name, segment_id, base_segment_size, brand_judgment_score, price_judgment_score, advertising_impact_score, sales_force_productivity, channel_coverage_factor, demand_units, policy_demand_impact_pct)";
    for (const row of result.demand) {
      writes.push(db.prepare(`INSERT OR REPLACE INTO demand_results ${demandColumns} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(row.demand_id, row.universe_id, row.quarter, row.region, row.team_i, row.brand_id, row.brand_name, row.segment_id, row.base_segment_size, row.brand_judgment_score, row.price_judgment_score, row.advertising_impact_score, row.sales_force_productivity, row.channel_coverage_factor, row.demand_units, row.policy_demand_impact_pct));
      const segment = SEGMENTS.find((candidate) => candidate.id === row.segment_id);
      writes.push(db.prepare("INSERT OR REPLACE INTO fast_test_results (result_id, team_id, quarter, region, result_type, subject_id, subject_name, segment_id, segment_name, brand_judgment, price_judgment, ad_judgment, reliability_judgment) VALUES (?, ?, ?, ?, 'brand', ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(`fast:${row.demand_id}`, `${universeId}:${row.team_i}`, currentQuarter, row.region, row.brand_id, row.brand_name, row.segment_id, segment?.name || row.segment_id, row.brand_judgment_score, row.price_judgment_score, row.advertising_impact_score * 100, null));
    }
    const records = scorecardRecords(result.state, currentQuarter);
    for (const record of records) {
      writes.push(db.prepare("INSERT INTO balanced_scorecard (id, universe_id, team_i, quarter, team_name, overall_score, dimensions_json, raw_metrics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET overall_score=excluded.overall_score, dimensions_json=excluded.dimensions_json, raw_metrics_json=excluded.raw_metrics_json, updated_at=datetime('now')")
        .bind(`${universeId}:${record.teamId}:${currentQuarter}`, universeId, record.teamId, currentQuarter, record.teamName, record.score, JSON.stringify(record.dimensions), JSON.stringify(record.raw)));
    }
    result.state.teams.forEach((team) => { team.dec.locked = false; });
    writes.push(db.prepare("UPDATE universes SET game_state = ?, deadline_iso = NULL, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(result.state), universeId));
    // All results land together or not at all.
    await db.batch(writes);
    return { ...result, scorecards: records };
  } finally {
    await db.prepare("UPDATE game_state SET quarter = (SELECT json_extract(game_state, '$.quarter') FROM universes WHERE id = ?), decisions_locked = 0, updated_at = datetime('now') WHERE universe_id = ?").bind(universeId, universeId).run();
  }
}
