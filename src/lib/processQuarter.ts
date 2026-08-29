import { GameState, TeamState } from "../types/simulation";
import { SEGMENTS } from "../engine/catalog";
import { computeBSC, hrMults, priceFit, qualityFit, reachOf, scoreModel, simulateQuarter } from "../engine/simulationEngine";
import { applyBatteryLifecycle, BatteryDisposition } from "./batteryLifecycle";

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

const regions = (state: any): string[] => Array.isArray(state.regions) && state.regions.length
  ? state.regions.map((region: any) => String(region.name || region.id || region)).filter(Boolean)
  : ["Global"];

const batteryRanges: Record<string, number> = { BC1: 100, BC2: 80, BC3: 75, BC4: 65, BC5: 50 };

function meetsEligibility(model: any, condition: string | null): boolean {
  if (!condition) return true;
  const match = condition.trim().match(/^([a-z_]+)\s*(>=|<=|=|>|<)\s*([\d.]+)\s*km?$/i);
  if (!match) return false;
  const [, field, operator, rawValue] = match;
  const metrics: Record<string, number> = {
    battery_range: batteryRanges[model?.cfg?.battery] || Number(model?.range) || 0,
    charging_score: Number(model?.chargingScore) || ({ BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 }[model?.cfg?.battery] || 0)
  };
  const actual = metrics[field.toLowerCase()];
  const expected = Number(rawValue);
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return operator === ">=" ? actual >= expected : operator === "<=" ? actual <= expected : operator === ">" ? actual > expected : operator === "<" ? actual < expected : actual === expected;
}

function policyImpact(model: any, segment: any, region: string, quarter: number, policies: PolicyEvent[]): number {
  return policies
    .filter((event) => event.quarter === quarter && (event.region === "Global" || event.region === region))
    .filter((event) => !event.eligible_segment || event.eligible_segment === segment.id || event.eligible_segment.toLowerCase() === segment.name.toLowerCase())
    .filter((event) => meetsEligibility(model, event.eligibility_condition))
    .reduce((impact, event) => impact + Number(event.demand_impact_pct || 0), 0);
}

export type ChargingBoost = Record<string, Record<string, number>>;

export function calculateDemand(state: GameState, universeId: string, policies: PolicyEvent[] = [], chargingBoost: ChargingBoost = {}): DemandResult[] {
  const quarter = state.quarter;
  const season = (quarter - 1) % 4 === 1 ? 0.9 : (quarter - 1) % 4 === 2 ? 1.25 : 1;
  const tam = state.cfg.tam0 * Math.pow(1 + state.cfg.growth, quarter - 1) * season;
  const output: DemandResult[] = [];
  for (const region of regions(state)) for (const team of state.teams) {
    const salesProductivity = hrMults(state, team).sales;
    const coverage = Math.max(0.05, Math.min(1, reachOf(team, salesProductivity)));
    for (const model of team.models) for (const segment of SEGMENTS) {
      const scores = scoreModel(model, team);
      let brandJudgment = Math.max(0, Math.min(100, qualityFit(scores, segment) * 100));
      // Line-extension naming bonus (Jaro-Winkler >= 0.6): a rename judged as a continuation
      // of the prior brand carries over some inherited awareness instead of starting cold.
      if (model.brandLoyaltyCarryOver) brandJudgment = Math.min(100, brandJudgment * 1.05);
      const priceJudgment = Math.max(0, Math.min(100, priceFit(model.price, segment) * 100));
      const spend = (Number(team.dec.ad) || 0) * (Number(team.dec.alloc?.[segment.id]) || 0) / 100;
      const claimFit = (team.dec.claims || []).reduce((total, claim) => total + (segment.w[claim] || 0), 0) / 100;
      const advertisingImpact = Math.max(0, Math.min(1, (team.dec.claims?.length ? 0.8 + 0.8 * claimFit : 0.9) * 0.9 * (1 - Math.exp(-spend / 120))));
      const baseSize = tam * segment.pct / regions(state).length;
      const policyDemandImpactPct = policyImpact(model, segment, region, quarter, policies);
      const chargingDemandImpactPct = (chargingBoost[String(team.i)]?.[region] || 0) / 100;
      const demandUnits = baseSize * brandJudgment / 100 * priceJudgment / 100 * advertisingImpact * salesProductivity * coverage * (1 + policyDemandImpactPct) * (1 + chargingDemandImpactPct);
      output.push({
        demand_id: `${universeId}:${quarter}:${region}:${team.i}:${model.id}:${segment.id}`,
        universe_id: universeId,
        quarter,
        region,
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
        policy_demand_impact_pct: policyDemandImpactPct
      });
    }
  }
  return output;
}

export function processQuarterState(state: GameState, universeId = "pending", policies: PolicyEvent[] = [], batteryDecisions: BatteryDecision[] = [], chargingBoost: ChargingBoost = {}): { state: GameState; logs: QuarterLog[]; demand: DemandResult[] } {
  const quarter = state.quarter;
  const demand = calculateDemand(state, universeId, policies, chargingBoost);
  const logs: QuarterLog[] = [
    { step: "lock", status: "complete", detail: `Locked decisions for Q${quarter}.` },
    { step: "demand", status: "complete", detail: `Computed ${demand.length} regional brand-segment demand rows.` }
  ];
  simulateQuarter(state);
  const lifecycle = state.teams.map((team: any) => {
    const decision = batteryDecisions.find((item) => String(item.teamId) === String(team.i))?.disposition || "warranty";
    const result = team.hist[team.hist.length - 1];
    const applied = applyBatteryLifecycle(result, team.hist, quarter, decision);
    team.cumProfit += applied.revenue - applied.cost;
    team.cumRevenue += applied.revenue;
    result.bsc = computeBSC(team, result, state);
    return { teamId: String(team.i), disposition: decision, ...applied };
  });
  const results = state.teams.reduce((count, team) => count + (team.hist.some((row) => row.q === quarter) ? 1 : 0), 0);
  logs.push({ step: "production", status: "complete", detail: `Simulated production for ${results} team${results === 1 ? "" : "s"}.` });
  logs.push({ step: "sales", status: "complete", detail: "Allocated actual sales against available inventory." });
  logs.push({ step: "financials", status: "complete", detail: "Updated revenue, COGS, warranty, advertising, and salaries." });
  if (quarter >= 5) logs.push({ step: "battery", status: "complete", detail: `Processed ${lifecycle.reduce((total, item) => total + item.projection.returnedUnits, 0).toLocaleString()} end-of-first-life batteries.` });
  logs.push({ step: "scores", status: "complete", detail: "Computed Fast Test inputs and balanced scorecards." });
  logs.push({ step: "advance", status: "complete", detail: `Advanced game to Q${state.quarter}.` });
  logs.push({ step: "unlock", status: "complete", detail: `Unlocked decisions for Q${state.quarter}.` });
  return { state, logs, demand };
}

export function scorecardRecords(state: GameState, quarter: number) {
  return state.teams.map((team: TeamState) => {
    const result: any = team.hist.find((row) => row.q === quarter);
    const score = result?.bsc || computeBSC(team, result, state);
    return { teamId: String(team.i), teamName: team.name, score: score.total, dimensions: score.parts, raw: result || {} };
  });
}

export async function runQuarterWorkflow(db: any, universeId: string) {
  await db.exec(`CREATE TABLE IF NOT EXISTS game_state (universe_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL DEFAULT 1, decisions_locked INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS policy_events (event_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL, region TEXT NOT NULL, event_type TEXT NOT NULL, description TEXT NOT NULL, demand_impact_pct REAL NOT NULL DEFAULT 0, cost_impact_pct REAL NOT NULL DEFAULT 0, eligible_segment TEXT, eligibility_condition TEXT);
    CREATE TABLE IF NOT EXISTS demand_results (demand_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, team_i TEXT NOT NULL, brand_id TEXT NOT NULL, brand_name TEXT NOT NULL, segment_id TEXT NOT NULL, base_segment_size REAL NOT NULL, brand_judgment_score REAL NOT NULL, price_judgment_score REAL NOT NULL, advertising_impact_score REAL NOT NULL, sales_force_productivity REAL NOT NULL, channel_coverage_factor REAL NOT NULL, demand_units REAL NOT NULL, policy_demand_impact_pct REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS fast_test_results (result_id TEXT PRIMARY KEY, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, result_type TEXT NOT NULL, subject_id TEXT NOT NULL, subject_name TEXT NOT NULL, segment_id TEXT NOT NULL, segment_name TEXT NOT NULL, brand_judgment REAL, price_judgment REAL, ad_judgment REAL, reliability_judgment REAL, purchase_cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (team_id, quarter, region, result_type, subject_id, segment_id));
    CREATE TABLE IF NOT EXISTS balanced_scorecard (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, team_name TEXT NOT NULL, overall_score REAL NOT NULL, dimensions_json TEXT NOT NULL, raw_metrics_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter));
    CREATE TABLE IF NOT EXISTS battery_lifecycle_decisions (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, disposition TEXT NOT NULL CHECK (disposition IN ('warranty', 'repurpose', 'recycle')), returned_units REAL NOT NULL DEFAULT 0, warranty_reserve REAL NOT NULL DEFAULT 0, cost REAL NOT NULL DEFAULT 0, revenue REAL NOT NULL DEFAULT 0, esg_impact REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter));
    CREATE TABLE IF NOT EXISTS rd_projects (project_id TEXT PRIMARY KEY, name TEXT, description TEXT, component_unlocked TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rd_license_offers (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, seller_team_id TEXT NOT NULL, buyer_team_id TEXT NOT NULL, project_id TEXT NOT NULL, license_fee REAL NOT NULL CHECK (license_fee >= 1), special_terms TEXT NOT NULL DEFAULT '', offered_quarter INTEGER NOT NULL, execute_quarter INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'rejected', 'executed')), accepted_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS team_component_access (game_id TEXT NOT NULL, team_id TEXT NOT NULL, component_id TEXT NOT NULL, source_license_id TEXT, unlocked_quarter INTEGER NOT NULL, PRIMARY KEY (game_id, team_id, component_id));
    CREATE TABLE IF NOT EXISTS charging_network (team_id TEXT NOT NULL, region TEXT NOT NULL, quarter INTEGER NOT NULL, charger_count INTEGER NOT NULL DEFAULT 0, charger_type TEXT NOT NULL CHECK (charger_type IN ('Level 2 AC', 'DC Fast Charge', 'Ultra-rapid 350kW')), installation_cost REAL NOT NULL DEFAULT 0, quarterly_maintenance REAL NOT NULL DEFAULT 0, demand_boost_pct REAL NOT NULL DEFAULT 0, UNIQUE (team_id, region, quarter));`);
  try { await db.exec("ALTER TABLE demand_results ADD COLUMN policy_demand_impact_pct REAL NOT NULL DEFAULT 0"); } catch {}
  const universe: any = await db.prepare("SELECT id, game_state FROM universes WHERE id = ?").bind(universeId).first();
  if (!universe) throw new Error("Simulation universe was not found.");
  const state = typeof universe.game_state === "string" ? JSON.parse(universe.game_state) : universe.game_state;
  const currentQuarter = Number(state.quarter || 1);
  const policiesResponse: any = await db.prepare("SELECT * FROM policy_events WHERE quarter = ?").bind(currentQuarter).all();
  const policies = (policiesResponse.results || []) as PolicyEvent[];
  const batteryResponse: any = await db.prepare("SELECT team_i, disposition FROM battery_lifecycle_decisions WHERE universe_id = ? AND quarter = ?").bind(universeId, currentQuarter).all();
  const batteryDecisions = (batteryResponse.results || []).map((row: any) => ({ teamId: String(row.team_i), disposition: row.disposition as BatteryDisposition }));
  const dueLicenses: any = await db.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND status = 'accepted' AND execute_quarter <= ?").bind(universeId, currentQuarter).all();
  const licenseWrites: any[] = [];
  for (const offer of (dueLicenses.results || []) as any[]) {
    const buyer = state.teams.find((candidate: any) => String(candidate.i) === String(offer.buyer_team_id));
    const seller = state.teams.find((candidate: any) => String(candidate.i) === String(offer.seller_team_id));
    const fee = Number(offer.license_fee) || 0;
    if (buyer) buyer.cash -= fee;
    if (seller) seller.cash += fee;
    licenseWrites.push(db.prepare("UPDATE rd_license_offers SET status = 'executed' WHERE id = ?").bind(offer.id));
    licenseWrites.push(db.prepare("INSERT OR IGNORE INTO team_component_access (game_id, team_id, component_id, source_license_id, unlocked_quarter) SELECT ?, ?, component_unlocked, ?, ? FROM rd_projects WHERE project_id = ?").bind(universeId, offer.buyer_team_id, offer.id, currentQuarter, offer.project_id));
  }
  if (licenseWrites.length) await db.batch(licenseWrites);
  const chargingRows: any = state.teams.length
    ? await db.prepare(`SELECT * FROM charging_network WHERE quarter <= ? AND team_id IN (${state.teams.map(() => "?").join(",")})`).bind(currentQuarter, ...state.teams.map((team: any) => String(team.i))).all()
    : { results: [] };
  const chargingBoost: ChargingBoost = {};
  for (const row of (chargingRows.results || []) as any[]) {
    const team = state.teams.find((candidate: any) => String(candidate.i) === String(row.team_id));
    if (!team) continue;
    // Chargers stay deployed once built: maintenance and the demand boost they earn recur every quarter,
    // while installation capex is a one-time hit in the quarter it was purchased.
    team.cash -= Number(row.quarterly_maintenance) || 0;
    if (Number(row.quarter) === currentQuarter) team.cash -= Number(row.installation_cost) || 0;
    const teamBoost = chargingBoost[String(team.i)] || (chargingBoost[String(team.i)] = {});
    teamBoost[row.region] = (teamBoost[row.region] || 0) + (Number(row.demand_boost_pct) || 0);
  }
  const marker: any = await db.prepare("SELECT decisions_locked, quarter FROM game_state WHERE universe_id = ?").bind(universeId).first();
  if (Number(marker?.decisions_locked) === 1) throw new Error(`Q${currentQuarter} is already being processed or locked.`);
  await db.prepare("INSERT INTO game_state (universe_id, quarter, decisions_locked) VALUES (?, ?, 1) ON CONFLICT(universe_id) DO UPDATE SET quarter = excluded.quarter, decisions_locked = 1, updated_at = datetime('now')").bind(universeId, currentQuarter).run();
  const schedules: any = await db.prepare("SELECT team_i, inputs_json, outputs_json FROM production_schedules WHERE universe_id = ? AND quarter = ?").bind(universeId, currentQuarter).all();
  for (const schedule of (schedules.results || [])) {
    const team = state.teams.find((candidate: any) => String(candidate.i) === String(schedule.team_i));
    if (team) {
      const inputs = JSON.parse(schedule.inputs_json || "{}");
      const outputs = JSON.parse(schedule.outputs_json || "{}");
      const scheduledProduction = Array.isArray(outputs.days)
        ? outputs.days.reduce((production: Record<string, number>, day: any) => {
          if (day.brandId) production[String(day.brandId)] = (production[String(day.brandId)] || 0) + Number(day.units || 0);
          return production;
        }, {})
        : outputs.prod || outputs.production || inputs.prod || inputs.production;
      team.dec.prod = scheduledProduction && Object.keys(scheduledProduction).length ? scheduledProduction : team.dec.prod;
    }
  }
  state.teams.forEach((team: any) => { team.dec.locked = true; });
  const result = processQuarterState(state, universeId, policies, batteryDecisions, chargingBoost);
  const lifecycleRows = result.state.teams.map((team: any) => {
    const quarterResult: any = team.hist.find((row: any) => row.q === currentQuarter);
    return db.prepare("UPDATE battery_lifecycle_decisions SET returned_units = ?, cost = ?, revenue = ?, esg_impact = ?, updated_at = datetime('now') WHERE universe_id = ? AND team_i = ? AND quarter = ?")
      .bind(Number(quarterResult?.batteryReturns || 0), Number(quarterResult?.batteryLifecycleCost || 0), Number(quarterResult?.batteryLifecycleRevenue || 0), Number(quarterResult?.sustainabilityScore || 0), universeId, String(team.i), currentQuarter);
  });
  if (lifecycleRows.length) await db.batch(lifecycleRows);
  const demandColumns = "(demand_id, universe_id, quarter, region, team_i, brand_id, brand_name, segment_id, base_segment_size, brand_judgment_score, price_judgment_score, advertising_impact_score, sales_force_productivity, channel_coverage_factor, demand_units, policy_demand_impact_pct)";
  await db.batch(result.demand.map((row) => db.prepare(`INSERT OR REPLACE INTO demand_results ${demandColumns} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(row.demand_id, row.universe_id, row.quarter, row.region, row.team_i, row.brand_id, row.brand_name, row.segment_id, row.base_segment_size, row.brand_judgment_score, row.price_judgment_score, row.advertising_impact_score, row.sales_force_productivity, row.channel_coverage_factor, row.demand_units, row.policy_demand_impact_pct)));
  const fastRows = result.demand.map((row) => {
    const segment = SEGMENTS.find((candidate) => candidate.id === row.segment_id);
    return db.prepare("INSERT OR REPLACE INTO fast_test_results (result_id, team_id, quarter, region, result_type, subject_id, subject_name, segment_id, segment_name, brand_judgment, price_judgment, ad_judgment, reliability_judgment) VALUES (?, ?, ?, ?, 'brand', ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`fast:${row.demand_id}`, row.team_i, currentQuarter, row.region, row.brand_id, row.brand_name, row.segment_id, segment?.name || row.segment_id, row.brand_judgment_score, row.price_judgment_score, row.advertising_impact_score * 100, null);
  });
  await db.batch(fastRows);
  const reliabilityRows = result.state.teams.map((team: any) => {
    const quarterResult: any = team.hist.find((row: any) => row.q === currentQuarter);
    return db.prepare("INSERT OR REPLACE INTO fast_test_results (result_id, team_id, quarter, region, result_type, subject_id, subject_name, segment_id, segment_name, reliability_judgment) VALUES (?, ?, ?, 'Global', 'reliability', 'company', 'Company reliability', 'company', 'Company-wide', ?)").bind(`fast:${universeId}:${team.i}:${currentQuarter}:reliability`, String(team.i), currentQuarter, Math.round(Number(quarterResult?.reliab || 0) * 100));
  });
  await db.batch(reliabilityRows);
  const records = scorecardRecords(result.state, currentQuarter);
  await db.batch(records.map((record) => db.prepare("INSERT INTO balanced_scorecard (id, universe_id, team_i, quarter, team_name, overall_score, dimensions_json, raw_metrics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET overall_score=excluded.overall_score, dimensions_json=excluded.dimensions_json, raw_metrics_json=excluded.raw_metrics_json, updated_at=datetime('now')").bind(`${universeId}:${record.teamId}:${currentQuarter}`, universeId, record.teamId, currentQuarter, record.teamName, record.score, JSON.stringify(record.dimensions), JSON.stringify(record.raw))));
  result.state.teams.forEach((team: any) => { team.dec.locked = false; });
  await db.prepare("UPDATE universes SET game_state = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(result.state), universeId).run();
  await db.prepare("UPDATE game_state SET quarter = ?, decisions_locked = 0, updated_at = datetime('now') WHERE universe_id = ?").bind(result.state.quarter, universeId).run();
  return { ...result, scorecards: records };
}
