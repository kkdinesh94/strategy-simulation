/**
 * Cloudflare Pages Functions & Workers API Router
 * Handles all /api/* routes natively with Cloudflare D1 (env.DB) and Gemini AI
 */
import { buildCompetitiveBenchmark, COMPETITIVE_BENCHMARK_REGION_COST } from "../../src/lib/competitiveBenchmark";
import { runQuarterWorkflow } from "../../src/lib/processQuarter";

interface Env {
  DB: any; // Cloudflare D1Database binding
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  NODE_ENV?: string;
  VEHICLE_REDESIGN_FEE?: string;
}

const componentBenefitKey: Record<string, string> = {
  Battery: "range",
  Charging: "charging",
  Autonomy: "autonomy",
  Motor: "image",
  Interior: "image",
  Exterior: "image",
  Software: "autonomy",
  Safety: "autonomy"
};

function jaroWinkler(first: string, second: string): number {
  const a = first.trim().toLowerCase();
  const b = second.trim().toLowerCase();
  if (a === b) return 1;
  if (!a || !b) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const firstMatches = new Array(a.length).fill(false);
  const secondMatches = new Array(b.length).fill(false);
  let matches = 0;

  for (let firstIndex = 0; firstIndex < a.length; firstIndex += 1) {
    const start = Math.max(0, firstIndex - matchDistance);
    const end = Math.min(firstIndex + matchDistance + 1, b.length);
    for (let secondIndex = start; secondIndex < end; secondIndex += 1) {
      if (secondMatches[secondIndex] || a[firstIndex] !== b[secondIndex]) continue;
      firstMatches[firstIndex] = true;
      secondMatches[secondIndex] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;

  const firstOrdered = a.split("").filter((_, index) => firstMatches[index]);
  const secondOrdered = b.split("").filter((_, index) => secondMatches[index]);
  let transpositions = 0;
  for (let index = 0; index < firstOrdered.length; index += 1) {
    if (firstOrdered[index] !== secondOrdered[index]) transpositions += 1;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix += 1;
  return jaro + prefix * 0.1 * (1 - jaro);
}

function normalizeComponentIds(componentIds: string[]): string[] {
  return [...new Set(componentIds.map((componentId) => String(componentId).trim()).filter(Boolean))].sort();
}

type AdClaimResult = {
  claim: string;
  valid: boolean;
  reason: string;
  violation?: Record<string, unknown>;
};

const CLAIM_ALIASES: Record<string, string> = {
  range: "range",
  longestrangeinmarket: "range",
  charge: "charging",
  fastestcharginginmarket: "charging",
  charging: "charging",
  econ: "affordable",
  affordable: "affordable",
  mostaffordableev: "affordable",
  autonomy: "autonomy",
  mostautonomous: "autonomy",
  reliable: "reliable",
  reliability: "reliable",
  mostreliable: "reliable"
};

function claimType(claim: unknown): string {
  const normalized = String(claim || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return CLAIM_ALIASES[normalized] || normalized;
}

function readJson(value: unknown): any {
  if (typeof value !== "string") return value || {};
  try { return JSON.parse(value); } catch { return {}; }
}

function auditValue(value: unknown): string {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value ?? ""); } catch { return String(value ?? ""); }
}

function modelMetrics(model: any, components: Map<string, any>): { range: number; charging: number; autonomy: number; price: number; hasDcFastCharge: boolean } {
  const config = model?.cfg || {};
  const componentIds = Array.isArray(model?.componentIds) ? model.componentIds : [];
  const selectedComponents = componentIds.map((id: string) => components.get(id)).filter(Boolean);
  const byCategory = (category: string) => selectedComponents.filter((component: any) => component.category === category);
  const battery = byCategory("Battery")[0];
  const charging = byCategory("Charging")[0];
  const autonomy = byCategory("Autonomy")[0];
  const legacyRange: Record<string, number> = { BC1: 10, BC2: 8, BC3: 7.5, BC4: 6.5, BC5: 4.5 };
  const legacyCharging: Record<string, number> = { BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 };
  const legacyAutonomy: Record<string, number> = { CT1: 1.5, CT2: 5, CT3: 7.5, CT4: 10 };
  return {
    range: Number(model?.range ?? battery?.performance_score ?? legacyRange[config.battery] ?? 0),
    charging: Number(model?.charging ?? charging?.performance_score ?? legacyCharging[config.battery] ?? 0),
    autonomy: Number(model?.autonomy ?? autonomy?.performance_score ?? legacyAutonomy[config.tech] ?? 0),
    price: Number(model?.price || 0),
    hasDcFastCharge: Boolean(charging && /dc|fast|ultra/i.test(`${charging.component_id} ${charging.name}`))
  };
}

function priorQuarterRecord(team: any, quarter: number): any {
  return (team?.hist || []).find((record: any) => Number(record.q) === quarter - 1)
    || (team?.hist || []).slice(-1)[0]
    || {};
}

type FastTestResult = {
  result_id: string;
  team_id: string;
  quarter: number;
  region: string;
  result_type: "brand" | "ad" | "reliability";
  subject_id: string;
  subject_name: string;
  segment_id: string;
  segment_name: string;
  brand_judgment: number | null;
  price_judgment: number | null;
  ad_judgment: number | null;
  reliability_judgment: number | null;
};

const fastTestNumber = (row: any, keys: string[], fallback = 0): number => {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
};

const fastTestText = (row: any, keys: string[], fallback = ""): string => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim()) return String(row[key]).trim();
  }
  return fallback;
};

async function optionalRows(db: any, sql: string, ...params: any[]): Promise<any[]> {
  try {
    const response = await db.prepare(sql).bind(...params).all();
    return response.results || [];
  } catch {
    return [];
  }
}

/** Compute and persist the paid quarterly Fast Test report for one team. */
export async function computeFastTests(teamId: string | number, quarter: number, region: string, db?: any): Promise<FastTestResult[]> {
  if (!db) throw new Error("D1 database binding is required to compute fast tests.");
  const normalizedTeamId = String(teamId).trim();
  const normalizedRegion = String(region || "Global").trim() || "Global";
  if (!normalizedTeamId || !Number.isInteger(quarter) || quarter < 1) throw new Error("teamId and a positive integer quarter are required.");

  await db.exec(`CREATE TABLE IF NOT EXISTS fast_test_results (
    result_id TEXT PRIMARY KEY, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL,
    result_type TEXT NOT NULL CHECK (result_type IN ('brand', 'ad', 'reliability')),
    subject_id TEXT NOT NULL, subject_name TEXT NOT NULL, segment_id TEXT NOT NULL, segment_name TEXT NOT NULL,
    brand_judgment REAL, price_judgment REAL, ad_judgment REAL, reliability_judgment REAL,
    purchase_cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (team_id, quarter, region, result_type, subject_id, segment_id)
  );`);

  const decisionRows = await optionalRows(db, "SELECT decision_json FROM team_decisions WHERE team_i = ? AND quarter = ? ORDER BY submitted_at DESC LIMIT 1", normalizedTeamId, quarter);
  const decision = readJson(decisionRows[0]?.decision_json);

  const segments = await optionalRows(db, "SELECT * FROM market_segments ORDER BY segment_id");
  const components = await optionalRows(db, "SELECT * FROM vehicle_components");
  const componentMap = new Map(components.map((component: any) => [String(component.component_id), component]));
  const brands = await optionalRows(db, "SELECT * FROM brands WHERE team_id = ?", normalizedTeamId);
  const campaigns = await optionalRows(db, "SELECT * FROM ad_campaigns WHERE team_id = ? AND quarter = ?", normalizedTeamId, quarter);
  const universeRows = await optionalRows(db, "SELECT game_state FROM universes ORDER BY updated_at DESC");
  const state = universeRows.map((row: any) => readJson(row.game_state)).find((candidate: any) => (candidate.teams || []).some((team: any) => String(team.i) === normalizedTeamId || String(team.name) === normalizedTeamId));
  const stateTeam = (state?.teams || []).find((team: any) => String(team.i) === normalizedTeamId || String(team.name) === normalizedTeamId);
  const paidDecision = Object.keys(decision).length ? decision : (stateTeam?.dec || {});
  const researchBudget = fastTestNumber(paidDecision, ["market_research_budget", "marketResearchBudget"]);
  if (researchBudget <= 0) throw new Error("Purchase the Fast Test report with market_research_budget before computing it.");
  const purchaseCost = researchBudget;
  const designs = await optionalRows(db, "SELECT decision_json FROM team_decisions WHERE team_i = ? AND quarter <= ? ORDER BY quarter DESC, submitted_at DESC", normalizedTeamId, quarter);
  const designRows = designs.map((row: any) => readJson(row.decision_json)).filter((row: any) => row.type === "vehicle_design");
  const subjects = brands.length ? brands : designRows.length ? designRows : (stateTeam?.models || []);
  const normalizedSegments = segments.length ? segments : Object.entries(stateTeam?.base || {}).map(([id, row]: [string, any]) => ({ segment_id: id, name: id, ...row }));
  const benefitForComponent: Record<string, string> = { Battery: "range", Charging: "charging", Autonomy: "autonomy", Motor: "perf", Interior: "comfort", Exterior: "image", Software: "autonomy", Safety: "safety" };
  const scoreBrand = (brand: any, segment: any) => {
    const weights: Record<string, number> = {
      range: fastTestNumber(segment, ["range_priority", "range_importance", "range"]),
      charging: fastTestNumber(segment, ["charging_speed_priority", "charging_importance", "charging_speed"]),
      autonomy: fastTestNumber(segment, ["autonomy_priority", "autonomy_importance", "autonomy"]),
      image: fastTestNumber(segment, ["brand_image_priority", "design_importance", "image"]),
      perf: fastTestNumber(segment, ["performance_priority", "performance_importance", "perf"]),
      comfort: fastTestNumber(segment, ["comfort_priority", "comfort_importance", "comfort"]),
      safety: fastTestNumber(segment, ["safety_priority", "safety_importance", "safety"]),
      econ: fastTestNumber(segment, ["economy_priority", "price_importance", "econ"])
    };
    const componentIds = Array.isArray(brand.componentIds) ? brand.componentIds : Array.isArray(brand.component_ids) ? brand.component_ids : [];
    const config = brand.cfg || {};
    const tier = (value: any, values: Record<string, number>) => values[String(value)] || 0;
    const performance: Record<string, number> = {
      range: brand.range ?? tier(config.battery, { BC1: 10, BC2: 8, BC3: 7.5, BC4: 6.5, BC5: 4.5 }),
      charging: brand.charging ?? tier(config.battery, { BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 }),
      autonomy: brand.autonomy ?? tier(config.tech, { CT1: 1.5, CT2: 5, CT3: 7.5, CT4: 10 }),
      image: brand.image ?? tier(config.build, { BD1: 10, BD2: 6, BD3: 4 }),
      perf: brand.perf ?? tier(config.powertrain, { PT1: 10, PT2: 8, PT3: 6, PT4: 4 }),
      comfort: brand.comfort ?? tier(config.seat, { WIDE: 10, STD: 6 }),
      safety: brand.safety ?? tier(config.brakes, { BR1: 10, BR2: 7, BR3: 4 }),
      econ: brand.econ ?? 0
    };
    componentIds.map((id: any) => componentMap.get(String(id))).filter(Boolean).forEach((component: any) => {
      const benefit = benefitForComponent[component.category];
      if (benefit) performance[benefit] = Math.max(performance[benefit] || 0, fastTestNumber(component, ["performance_score", "performance"]));
    });
    const weightedTotal = Object.keys(weights).reduce((sum, key) => sum + Math.max(0, Number(performance[key]) || 0) * weights[key], 0);
    const maxTotal = Object.values(weights).reduce((sum, weight) => sum + weight * 10, 0) || 1;
    const tolerance = fastTestNumber(segment, ["price_tolerance", "price_willing_to_pay", "price_willing_max", "wtp_max"], 60000 - fastTestNumber(segment, ["price_sensitivity"], 0) * 3500);
    const price = fastTestNumber(brand, ["price", "msrp"], fastTestNumber(brand.cfg, ["price"]));
    return { brand: Math.max(0, Math.min(100, (weightedTotal / maxTotal) * 100 - Math.max(0, price - tolerance) / Math.max(1, tolerance) * 15)), price: price <= tolerance ? 100 : Math.max(0, 100 - ((price - tolerance) / Math.max(1, tolerance)) * 100) };
  };
  const rows: FastTestResult[] = [];
  for (const brand of subjects) for (const segment of normalizedSegments) {
    const scored = scoreBrand(brand, segment);
    const subjectId = fastTestText(brand, ["brand_id", "brandId", "id"], `${normalizedTeamId}-brand-${rows.length}`);
    rows.push({ result_id: `fast:${normalizedTeamId}:${quarter}:${normalizedRegion}:brand:${subjectId}:${segment.segment_id}`, team_id: normalizedTeamId, quarter, region: normalizedRegion, result_type: "brand", subject_id: subjectId, subject_name: fastTestText(brand, ["name", "brandName"], subjectId), segment_id: String(segment.segment_id), segment_name: fastTestText(segment, ["name", "segment_name"], String(segment.segment_id)), brand_judgment: Math.round(scored.brand), price_judgment: Math.round(scored.price), ad_judgment: null, reliability_judgment: null });
  }
  for (const campaign of campaigns) for (const segment of normalizedSegments) {
    const benefits = [1, 2, 3, 4, 5].map((index) => campaign[`benefit_${index}`]).filter(Boolean);
    const weights = benefits.reduce((sum, benefit, index) => sum + fastTestNumber(segment, [String(benefit), `${String(benefit)}_priority`, `${String(benefit)}_importance`]) / (index + 1), 0);
    const maxWeight = Math.max(1, Object.keys(segment).filter((key) => /priority|importance/.test(key)).reduce((sum, key) => sum + Number(segment[key] || 0), 0));
    rows.push({ result_id: `fast:${normalizedTeamId}:${quarter}:${normalizedRegion}:ad:${campaign.campaign_id}:${segment.segment_id}`, team_id: normalizedTeamId, quarter, region: normalizedRegion, result_type: "ad", subject_id: String(campaign.campaign_id), subject_name: fastTestText(campaign, ["campaign_name", "campaign_id"]), segment_id: String(segment.segment_id), segment_name: fastTestText(segment, ["name", "segment_name"], String(segment.segment_id)), brand_judgment: null, price_judgment: null, ad_judgment: Math.round(Math.max(0, Math.min(100, weights / maxWeight * 100))), reliability_judgment: null });
  }
  const quality = await optionalRows(db, "SELECT * FROM quality_components WHERE team_id = ?", normalizedTeamId);
  const warranty = quality.reduce((sum, item) => sum + fastTestNumber(item, ["warranty_cost_per_quarter"]), 0);
  const improvements = quality.reduce((sum, item) => sum + fastTestNumber(item, ["reliability_improvement"]) * (item.improvement_invested > 0 || item.source_action_study_done || item.variance_study_done ? 1 : 0), 0);
  const reliability = Math.max(0, Math.min(100, 100 - warranty / 10 + improvements));
  rows.push({ result_id: `fast:${normalizedTeamId}:${quarter}:${normalizedRegion}:reliability:company`, team_id: normalizedTeamId, quarter, region: normalizedRegion, result_type: "reliability", subject_id: "company", subject_name: "Company reliability", segment_id: "company", segment_name: "Company-wide", brand_judgment: null, price_judgment: null, ad_judgment: null, reliability_judgment: Math.round(reliability) });
  await db.batch(rows.map((row) => db.prepare(`INSERT INTO fast_test_results (result_id, team_id, quarter, region, result_type, subject_id, subject_name, segment_id, segment_name, brand_judgment, price_judgment, ad_judgment, reliability_judgment, purchase_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(result_id) DO UPDATE SET brand_judgment=excluded.brand_judgment, price_judgment=excluded.price_judgment, ad_judgment=excluded.ad_judgment, reliability_judgment=excluded.reliability_judgment, purchase_cost=excluded.purchase_cost`).bind(row.result_id, row.team_id, row.quarter, row.region, row.result_type, row.subject_id, row.subject_name, row.segment_id, row.segment_name, row.brand_judgment, row.price_judgment, row.ad_judgment, row.reliability_judgment, purchaseCost)));
  return rows;
}

/** Validate a campaign against the previous quarter's persisted market snapshot. */
export async function validateAdClaims(campaignId: string, teamId: string, quarter: number, db?: any): Promise<{ valid: boolean; results: AdClaimResult[] }> {
  if (!db) throw new Error("D1 database binding is required to validate ad claims.");
  if (!Number.isInteger(quarter) || quarter < 1) throw new Error("quarter must be a positive integer.");
  await db.exec(`CREATE TABLE IF NOT EXISTS ad_violations (violation_id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, quarter INTEGER NOT NULL, offense_number INTEGER NOT NULL, penalty_type TEXT NOT NULL, fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, ban_until_quarter INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);

  const campaign = await db.prepare("SELECT * FROM ad_campaigns WHERE campaign_id = ?").bind(campaignId).first();
  if (!campaign) throw new Error("Advertising campaign was not found.");
  const campaignTeamId = String(teamId || campaign.team_id || "");
  const requestedUniverseId = campaign.universe_id || null;
  const universeRows = await db.prepare(requestedUniverseId ? "SELECT * FROM universes WHERE id = ?" : "SELECT * FROM universes ORDER BY updated_at DESC").bind(...(requestedUniverseId ? [requestedUniverseId] : [])).all();
  const universe = (universeRows.results || []).find((row: any) => {
    const state = readJson(row.game_state);
    return requestedUniverseId || (state.teams || []).some((team: any) => String(team.i) === campaignTeamId || String(team.name) === campaignTeamId);
  });
  if (!universe) throw new Error("The campaign's universe could not be resolved.");
  const state = readJson(universe.game_state);
  const teams = Array.isArray(state.teams) ? state.teams : [];
  const targetTeam = teams.find((team: any) => String(team.i) === campaignTeamId || String(team.name) === campaignTeamId);
  if (!targetTeam) throw new Error("The campaign team was not found in the universe.");

  const componentRows = await db.prepare("SELECT component_id, category, name, performance_score FROM vehicle_components").all();
  const components = new Map<string, any>((componentRows.results || []).map((row: any) => [String(row.component_id), row] as [string, any]));
  const decisionRows = await db.prepare("SELECT team_i, quarter, decision_json FROM team_decisions WHERE universe_id = ? AND quarter <= ? ORDER BY quarter DESC").bind(universe.id, quarter - 1).all();
  const latestDesigns = new Map<string, any>();
  for (const row of (decisionRows.results || []) as any[]) {
    const decision = readJson(row.decision_json);
    if (decision.type !== "vehicle_design") continue;
    const key = `${row.team_i}:${decision.brandId || decision.brandName || row.team_i}`;
    if (!latestDesigns.has(key)) latestDesigns.set(key, { teamId: String(row.team_i), ...decision });
  }
  const brandsByTeam = new Map<string, any[]>();
  for (const design of latestDesigns.values()) {
    const brands = brandsByTeam.get(design.teamId) || [];
    brands.push(modelMetrics(design, components));
    brandsByTeam.set(design.teamId, brands);
  }
  for (const team of teams) {
    const teamKey = String(team.i);
    if (!brandsByTeam.has(teamKey)) brandsByTeam.set(teamKey, (team.models || []).map((model: any) => modelMetrics(model, components)));
  }
  const targetBrands = brandsByTeam.get(String(targetTeam.i)) || [];
  const competitorBrands = [...brandsByTeam.entries()].filter(([id]) => id !== String(targetTeam.i)).flatMap(([, brands]) => brands);
  const targetPrior = priorQuarterRecord(targetTeam, quarter);
  const competitorPrior = teams.map((team: any) => priorQuarterRecord(team, quarter));
  const industryAverageReliability = competitorPrior.length
    ? competitorPrior.reduce((sum: number, record: any) => sum + Number(record.reliability_rating ?? record.reliabilityRating ?? record.reliab ?? 0), 0) / competitorPrior.length
    : 0;
  const claims = Array.from({ length: 5 }, (_, index) => campaign[`benefit_${index + 1}`]).filter(Boolean);
  const results: AdClaimResult[] = [];
  for (const claim of claims) {
    const type = claimType(claim);
    let valid = quarter === 1;
    let reason = quarter === 1 ? "First-quarter test market grace period." : "Claim is not supported by the market snapshot.";
    if (quarter > 1 && type === "range") {
      valid = targetBrands.length > 0 && competitorBrands.length > 0 && Math.max(...targetBrands.map((brand) => brand.range)) >= Math.max(...competitorBrands.map((brand) => brand.range));
      reason = "Team range must be at least as high as every competitor brand.";
    } else if (quarter > 1 && type === "charging") {
      valid = targetBrands.some((brand) => brand.hasDcFastCharge);
      reason = "Team must offer a DC fast-charge component on at least one brand.";
    } else if (quarter > 1 && type === "affordable") {
      valid = targetBrands.length > 0 && competitorBrands.length > 0 && Math.min(...targetBrands.map((brand) => brand.price)) <= Math.min(...competitorBrands.map((brand) => brand.price));
      reason = "Team's lowest-priced brand must be no higher than the lowest competitor brand.";
    } else if (quarter > 1 && type === "autonomy") {
      valid = targetBrands.length > 0 && competitorBrands.length > 0 && Math.max(...targetBrands.map((brand) => brand.autonomy)) >= Math.max(...competitorBrands.map((brand) => brand.autonomy));
      reason = "Team must have the highest autonomy component tier in the market.";
    } else if (quarter > 1 && type === "reliable") {
      valid = Number(targetPrior.reliability_rating ?? targetPrior.reliabilityRating ?? targetPrior.reliab ?? 0) >= industryAverageReliability;
      reason = "Team reliability must be at least the industry average.";
    }
    const result: AdClaimResult = { claim: String(claim), valid, reason };
    if (!valid) {
      const priorCount = await db.prepare("SELECT COUNT(*) AS count FROM ad_violations WHERE universe_id = ? AND team_id = ? AND claim = ?").bind(universe.id, campaignTeamId, type).first("count");
      const offenseNumber = Number(priorCount || 0) + 1;
      const finePct = offenseNumber < 2 ? 0 : (offenseNumber - 1) * 0.05;
      const revenue = Number(targetPrior.revenue || 0);
      const violation = { violation_id: `${campaignId}:${type}`, campaign_id: campaignId, universe_id: universe.id, team_id: campaignTeamId, claim: type, quarter, offense_number: offenseNumber, penalty_type: finePct ? "fine_and_ban" : "ban", fine_pct: finePct, fine_amount: revenue * finePct, ban_until_quarter: quarter + 4, reason };
      await db.prepare("INSERT OR IGNORE INTO ad_violations (violation_id, campaign_id, universe_id, team_id, claim, quarter, offense_number, penalty_type, fine_pct, fine_amount, ban_until_quarter, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(violation.violation_id, violation.campaign_id, violation.universe_id, violation.team_id, violation.claim, violation.quarter, violation.offense_number, violation.penalty_type, violation.fine_pct, violation.fine_amount, violation.ban_until_quarter, violation.reason).run();
      result.violation = violation;
    }
    results.push(result);
  }
  return { valid: results.every((result) => result.valid), results };
}

export async function onRequest(context: { request: Request; env: Env; params: { route?: string[] } }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (path === "/api/policy-events" && method === "GET") {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const quarter = Number(url.searchParams.get("quarter"));
      if (!Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "A positive integer quarter is required." }), { status: 400, headers: corsHeaders });
      await env.DB.exec("CREATE TABLE IF NOT EXISTS policy_events (event_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL, region TEXT NOT NULL, event_type TEXT NOT NULL, description TEXT NOT NULL, demand_impact_pct REAL NOT NULL DEFAULT 0, cost_impact_pct REAL NOT NULL DEFAULT 0, eligible_segment TEXT, eligibility_condition TEXT)");
      const events = await env.DB.prepare("SELECT * FROM policy_events WHERE quarter = ? ORDER BY event_id").bind(quarter).all();
      return new Response(JSON.stringify({ events: events.results || [] }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/rd/license" && (method === "GET" || method === "POST")) {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS vehicle_components (component_id TEXT PRIMARY KEY, category TEXT, name TEXT, material_cost REAL, performance_score INTEGER, benefit_delivered TEXT, is_rd_unlocked INTEGER DEFAULT 0, available_from_quarter INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS rd_projects (project_id TEXT PRIMARY KEY, name TEXT, description TEXT, component_unlocked TEXT NOT NULL); CREATE TABLE IF NOT EXISTS rd_project_completions (game_id TEXT NOT NULL, team_id TEXT NOT NULL, project_id TEXT NOT NULL, completed_quarter INTEGER NOT NULL, PRIMARY KEY (game_id, team_id, project_id)); CREATE TABLE IF NOT EXISTS rd_license_offers (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, seller_team_id TEXT NOT NULL, buyer_team_id TEXT NOT NULL, project_id TEXT NOT NULL, license_fee REAL NOT NULL CHECK (license_fee >= 1), special_terms TEXT NOT NULL DEFAULT '', offered_quarter INTEGER NOT NULL, execute_quarter INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'rejected', 'executed')), accepted_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))); CREATE TABLE IF NOT EXISTS team_component_access (game_id TEXT NOT NULL, team_id TEXT NOT NULL, component_id TEXT NOT NULL, source_license_id TEXT, unlocked_quarter INTEGER NOT NULL, PRIMARY KEY (game_id, team_id, component_id));`);
      if (method === "GET") {
        const gameId = url.searchParams.get("game_id") || url.searchParams.get("universe_id") || "";
        const teamId = url.searchParams.get("team_id") || "";
        const quarter = Math.max(1, Number(url.searchParams.get("quarter") || 1));
        if (!gameId || !teamId) return new Response(JSON.stringify({ error: "game_id and team_id are required." }), { status: 400, headers: corsHeaders });
        await env.DB.prepare("UPDATE rd_license_offers SET status = 'executed' WHERE game_id = ? AND status = 'accepted' AND execute_quarter <= ?").bind(gameId, quarter).run();
        const due = await env.DB.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND status = 'executed' AND execute_quarter <= ?").bind(gameId, quarter).all();
        for (const offer of (due.results || []) as any[]) await env.DB.prepare("INSERT OR IGNORE INTO team_component_access (game_id, team_id, component_id, source_license_id, unlocked_quarter) SELECT ?, ?, component_unlocked, ?, ? FROM rd_projects WHERE project_id = ?").bind(gameId, offer.buyer_team_id, offer.id, offer.execute_quarter, offer.project_id).run();
        const available = await env.DB.prepare("SELECT p.project_id, p.name, p.description, p.component_unlocked, c.name AS component_name, c.category, c.benefit_delivered, x.team_id AS seller_team_id FROM rd_projects p JOIN vehicle_components c ON c.component_id = p.component_unlocked JOIN rd_project_completions x ON x.game_id = ? AND x.project_id = p.project_id AND x.completed_quarter < ? WHERE x.team_id <> ? AND NOT EXISTS (SELECT 1 FROM team_component_access a WHERE a.game_id = ? AND a.team_id = ? AND a.component_id = p.component_unlocked) ORDER BY p.name").bind(gameId, quarter, teamId, gameId, teamId).all();
        const outbound = await env.DB.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND seller_team_id = ? ORDER BY created_at DESC").bind(gameId, teamId).all();
        return new Response(JSON.stringify({ available: available.results || [], outbound: outbound.results || [] }), { status: 200, headers: corsHeaders });
      }
      const body = await request.json() as any;
      const gameId = String(body.game_id || request.headers.get("X-Game-Id") || "").trim();
      const quarter = Number(body.quarter);
      if (!gameId || !body.buyer_team_id || !Number.isInteger(quarter) || quarter < 1 || (body.action !== "accept" && (!body.seller_team_id || !body.project_id))) return new Response(JSON.stringify({ error: "game_id, buyer_team_id, and a positive integer quarter are required; offers also require seller_team_id and project_id." }), { status: 400, headers: corsHeaders });
      await env.DB.prepare("UPDATE rd_license_offers SET status = 'executed' WHERE game_id = ? AND status = 'accepted' AND execute_quarter <= ?").bind(gameId, quarter).run();
      const due = await env.DB.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND status = 'executed' AND execute_quarter <= ?").bind(gameId, quarter).all();
      for (const offer of (due.results || []) as any[]) {
        await env.DB.prepare("INSERT OR IGNORE INTO team_component_access (game_id, team_id, component_id, source_license_id, unlocked_quarter) SELECT ?, ?, component_unlocked, ?, ? FROM rd_projects WHERE project_id = ?").bind(gameId, offer.buyer_team_id, offer.id, offer.execute_quarter, offer.project_id).run();
      }
      if (body.action === "accept") {
        const offer = await env.DB.prepare("SELECT * FROM rd_license_offers WHERE id = ? AND game_id = ? AND buyer_team_id = ?").bind(String(body.license_id || ""), gameId, String(body.buyer_team_id)).first();
        if (!offer || offer.status !== "offered") return new Response(JSON.stringify({ error: "Offer is missing or no longer open." }), { status: 409, headers: corsHeaders });
        await env.DB.prepare("UPDATE rd_license_offers SET status = 'accepted', accepted_at = datetime('now') WHERE id = ? AND status = 'offered'").bind(offer.id).run();
        return new Response(JSON.stringify({ success: true, offer: { ...offer, status: "accepted" } }), { status: 200, headers: corsHeaders });
      }
      const fee = Number(body.license_fee);
      if (!Number.isFinite(fee) || fee < 1) return new Response(JSON.stringify({ error: "license_fee must be at least 1." }), { status: 400, headers: corsHeaders });
      if (String(body.seller_team_id) === String(body.buyer_team_id)) return new Response(JSON.stringify({ error: "Seller and buyer must be different teams." }), { status: 400, headers: corsHeaders });
      const completion = await env.DB.prepare("SELECT completed_quarter FROM rd_project_completions WHERE game_id = ? AND team_id = ? AND project_id = ? AND completed_quarter < ? ORDER BY completed_quarter DESC LIMIT 1").bind(gameId, String(body.seller_team_id), String(body.project_id), quarter).first();
      if (!completion) return new Response(JSON.stringify({ error: "Seller must have completed this R&D project in a prior quarter." }), { status: 409, headers: corsHeaders });
      const id = crypto.randomUUID();
      const offer = { id, game_id: gameId, seller_team_id: String(body.seller_team_id), buyer_team_id: String(body.buyer_team_id), project_id: String(body.project_id), license_fee: fee, special_terms: typeof body.special_terms === "string" ? body.special_terms.trim() : "", offered_quarter: quarter, execute_quarter: quarter + 1, status: "offered" };
      await env.DB.prepare("INSERT INTO rd_license_offers (id, game_id, seller_team_id, buyer_team_id, project_id, license_fee, special_terms, offered_quarter, execute_quarter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'offered')").bind(offer.id, offer.game_id, offer.seller_team_id, offer.buyer_team_id, offer.project_id, offer.license_fee, offer.special_terms, offer.offered_quarter, offer.execute_quarter).run();
      return new Response(JSON.stringify({ success: true, offer }), { status: 201, headers: corsHeaders });
    }

    // 1. Health check
    if (path === "/api/health") {
      return new Response(
        JSON.stringify({ status: "ok", provider: "Cloudflare Workers / D1", app: "EV Venture League Simulation" }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (path === "/api/decisions" && (method === "GET" || method === "POST" || method === "PUT")) {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS decision_audit_log (
          log_id TEXT PRIMARY KEY,
          team_id TEXT,
          quarter INTEGER,
          decision_area TEXT,
          field_changed TEXT,
          old_value TEXT,
          new_value TEXT,
          timestamp TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_decision_audit_team_quarter ON decision_audit_log(team_id, quarter, timestamp);
      `);

      if (method === "GET") {
        const teamId = String(url.searchParams.get("teamId") || url.searchParams.get("team_id") || "").trim();
        const quarter = Number(url.searchParams.get("quarter"));
        const area = String(url.searchParams.get("decisionArea") || url.searchParams.get("decision_area") || "").trim();
        if (!teamId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "teamId and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
        const params: any[] = [teamId, quarter];
        let query = "SELECT log_id, team_id, quarter, decision_area, field_changed, old_value, new_value, timestamp FROM decision_audit_log WHERE team_id = ? AND quarter = ?";
        if (area) { query += " AND decision_area = ?"; params.push(area); }
        query += " ORDER BY timestamp DESC, log_id DESC";
        const rows = await env.DB.prepare(query).bind(...params).all();
        return new Response(JSON.stringify({ decisions: rows.results || [] }), { status: 200, headers: corsHeaders });
      }

      const body = await request.json() as any;
      const teamId = String(body.teamId ?? body.team_id ?? "").trim();
      const quarter = Number(body.quarter);
      if (!teamId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "teamId and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });

      const decisionArea = String(body.decisionArea ?? body.decision_area ?? body.area ?? "General").trim() || "General";
      let changes: any[] = Array.isArray(body.changes) ? body.changes : [];
      if (!changes.length && body.oldDecision && body.newDecision && typeof body.oldDecision === "object" && typeof body.newDecision === "object") {
        const fields = new Set([...Object.keys(body.oldDecision), ...Object.keys(body.newDecision)]);
        changes = [...fields].filter((field) => auditValue(body.oldDecision[field]) !== auditValue(body.newDecision[field])).map((field) => ({ fieldChanged: field, oldValue: body.oldDecision[field], newValue: body.newDecision[field] }));
      }
      if (!changes.length) changes = [{ fieldChanged: body.fieldChanged ?? body.field_changed ?? "decision", oldValue: body.oldValue ?? body.old_value ?? "", newValue: body.newValue ?? body.new_value ?? body.decision ?? body.value ?? "" }];

      const timestamp = new Date().toISOString();
      await env.DB.batch(changes.map((change: any) => env.DB.prepare(
        "INSERT INTO decision_audit_log (log_id, team_id, quarter, decision_area, field_changed, old_value, new_value, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        crypto.randomUUID(),
        teamId,
        quarter,
        String(change.decisionArea ?? change.decision_area ?? decisionArea).trim() || decisionArea,
        String(change.fieldChanged ?? change.field_changed ?? change.field ?? "decision"),
        auditValue(change.oldValue ?? change.old_value),
        auditValue(change.newValue ?? change.new_value),
        timestamp
      )));
      return new Response(JSON.stringify({ success: true, logged: changes.length, teamId, quarter }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/process-quarter" && method === "POST") {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json() as { universeId?: string };
      const universeId = String(body.universeId || "").trim();
      if (!universeId) return new Response(JSON.stringify({ error: "universeId is required." }), { status: 400, headers: corsHeaders });
      try {
        const result = await runQuarterWorkflow(env.DB, universeId);
        return new Response(JSON.stringify({ success: true, quarter: result.state.quarter, logs: result.logs, demandRows: result.demand.length, scorecards: result.scorecards }), { status: 200, headers: corsHeaders });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Quarter processing failed." }), { status: err.message?.includes("already") ? 409 : 500, headers: corsHeaders });
      }
    }

    if (path === "/api/visibility-settings" && (method === "GET" || method === "POST")) {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS visibility_settings (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL UNIQUE,
        reveal_brand_specs INTEGER NOT NULL DEFAULT 0,
        reveal_sales_data INTEGER NOT NULL DEFAULT 0,
        reveal_financials INTEGER NOT NULL DEFAULT 0,
        reveal_rd_projects INTEGER NOT NULL DEFAULT 0,
        competitive_benchmark_purchasable INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_visibility_settings_game ON visibility_settings(game_id);`);

      if (method === "GET") {
        const gameId = String(url.searchParams.get("game_id") || url.searchParams.get("universe_id") || "").trim();
        if (!gameId) return new Response(JSON.stringify({ error: "game_id parameter is required." }), { status: 400, headers: corsHeaders });
        const row = await env.DB.prepare("SELECT * FROM visibility_settings WHERE game_id = ?").bind(gameId).first();
        if (row) {
          return new Response(JSON.stringify({ settings: row }), { status: 200, headers: corsHeaders });
        }
        return new Response(JSON.stringify({
          settings: {
            id: gameId,
            game_id: gameId,
            reveal_brand_specs: 0,
            reveal_sales_data: 0,
            reveal_financials: 0,
            reveal_rd_projects: 0,
            competitive_benchmark_purchasable: 1,
            updated_at: new Date().toISOString()
          }
        }), { status: 200, headers: corsHeaders });
      }

      if (method === "POST") {
        const body = await request.json() as any;
        const gameId = String(body.game_id || "").trim();
        if (!gameId) return new Response(JSON.stringify({ error: "game_id is required." }), { status: 400, headers: corsHeaders });

        const flags = [
          body.reveal_brand_specs,
          body.reveal_sales_data,
          body.reveal_financials,
          body.reveal_rd_projects,
          body.competitive_benchmark_purchasable
        ];

        const isValidFlag = (val: any) => val === 0 || val === 1 || val === "0" || val === "1";
        if (!flags.every(isValidFlag)) {
          return new Response(JSON.stringify({ error: "All flag values must be 0 or 1." }), { status: 400, headers: corsHeaders });
        }

        const reveal_brand_specs = Number(body.reveal_brand_specs);
        const reveal_sales_data = Number(body.reveal_sales_data);
        const reveal_financials = Number(body.reveal_financials);
        const reveal_rd_projects = Number(body.reveal_rd_projects);
        const competitive_benchmark_purchasable = Number(body.competitive_benchmark_purchasable);
        const now = new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO visibility_settings (id, game_id, reveal_brand_specs, reveal_sales_data, reveal_financials, reveal_rd_projects, competitive_benchmark_purchasable, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            game_id = excluded.game_id,
            reveal_brand_specs = excluded.reveal_brand_specs,
            reveal_sales_data = excluded.reveal_sales_data,
            reveal_financials = excluded.reveal_financials,
            reveal_rd_projects = excluded.reveal_rd_projects,
            competitive_benchmark_purchasable = excluded.competitive_benchmark_purchasable,
            updated_at = excluded.updated_at
        `).bind(gameId, gameId, reveal_brand_specs, reveal_sales_data, reveal_financials, reveal_rd_projects, competitive_benchmark_purchasable, now).run();

        const settings = {
          id: gameId,
          game_id: gameId,
          reveal_brand_specs,
          reveal_sales_data,
          reveal_financials,
          reveal_rd_projects,
          competitive_benchmark_purchasable,
          updated_at: now
        };

        return new Response(JSON.stringify({ success: true, settings }), { status: 200, headers: corsHeaders });
      }
    }

    if (path === "/api/competitive-benchmark" && (method === "GET" || method === "POST")) {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = method === "POST" ? await request.json() as any : {};
      const teamId = String(body.teamId || body.team_id || url.searchParams.get("teamId") || url.searchParams.get("team_id") || "").trim();
      const quarter = Number(body.quarter || url.searchParams.get("quarter"));
      const region = String(body.region || url.searchParams.get("region") || "Global").trim() || "Global";
      const scope = String(body.scope || url.searchParams.get("scope") || (region.toLowerCase() === "global" ? "global" : "region"));
      if (!teamId || !Number.isInteger(quarter) || quarter < 1 || !["region", "global"].includes(scope)) return new Response(JSON.stringify({ error: "teamId, a positive integer quarter, and a valid scope are required." }), { status: 400, headers: corsHeaders });
      await env.DB.exec("CREATE TABLE IF NOT EXISTS competitive_benchmark_purchases (purchase_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, scope TEXT NOT NULL, cost REAL NOT NULL, report_json TEXT NOT NULL, purchased_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_id, quarter, region, scope))");
      const universe: any = await env.DB.prepare("SELECT id, game_state FROM universes ORDER BY updated_at DESC LIMIT 1").first();
      if (!universe) return new Response(JSON.stringify({ error: "No simulation universe is available." }), { status: 404, headers: corsHeaders });

      const resolvedGameId = url.searchParams.get("game_id") || url.searchParams.get("universe_id") || body.game_id || body.universe_id || universe.id;
      if (resolvedGameId) {
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS visibility_settings (
          id TEXT PRIMARY KEY, game_id TEXT NOT NULL UNIQUE, reveal_brand_specs INTEGER NOT NULL DEFAULT 0,
          reveal_sales_data INTEGER NOT NULL DEFAULT 0, reveal_financials INTEGER NOT NULL DEFAULT 0,
          reveal_rd_projects INTEGER NOT NULL DEFAULT 0, competitive_benchmark_purchasable INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );`);
        const visRow = await env.DB.prepare("SELECT * FROM visibility_settings WHERE game_id = ?").bind(resolvedGameId).first();
        if (method === "GET" && visRow && Number(visRow.competitive_benchmark_purchasable) === 0) {
          return new Response(JSON.stringify({ error: "Competitive benchmark reports have been disabled by the instructor." }), { status: 403, headers: corsHeaders });
        }
      }

      const purchase: any = await env.DB.prepare("SELECT * FROM competitive_benchmark_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? AND region = ? AND scope = ?").bind(universe.id, teamId, quarter, region, scope).first();
      const cost = COMPETITIVE_BENCHMARK_REGION_COST * (scope === "global" ? 3 : 1);
      if (method === "GET") return new Response(JSON.stringify({ purchased: Boolean(purchase), cost, report: purchase ? readJson(purchase.report_json) : null }), { status: 200, headers: corsHeaders });
      if (Number(body.market_research_budget || body.budget) < cost) return new Response(JSON.stringify({ error: `Allocate at least Rs. ${cost} L to purchase this report.` }), { status: 402, headers: corsHeaders });
      const report = buildCompetitiveBenchmark(readJson(universe.game_state), quarter, region);
      await env.DB.prepare("INSERT INTO competitive_benchmark_purchases (purchase_id, universe_id, team_id, quarter, region, scope, cost, report_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_id, quarter, region, scope) DO UPDATE SET report_json = excluded.report_json, cost = excluded.cost, purchased_at = datetime('now')").bind(`${universe.id}:${teamId}:${quarter}:${region}:${scope}`, universe.id, teamId, quarter, region, scope, cost, JSON.stringify(report)).run();
      return new Response(JSON.stringify({ success: true, purchased: true, cost, report }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/fast-tests" && (method === "GET" || method === "POST")) {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = method === "POST" ? await request.json() as any : {};
      const teamId = String(body.teamId || body.team_id || url.searchParams.get("teamId") || url.searchParams.get("team_id") || "").trim();
      const quarter = Number(body.quarter || url.searchParams.get("quarter"));
      const region = String(body.region || url.searchParams.get("region") || "Global").trim() || "Global";
      if (!teamId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "teamId and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      if (method === "POST") {
        const results = await computeFastTests(teamId, quarter, region, env.DB);
        return new Response(JSON.stringify({ success: true, purchased: true, results }), { status: 200, headers: corsHeaders });
      }
      const resultRows = await env.DB.prepare("SELECT * FROM fast_test_results WHERE team_id = ? AND quarter = ? AND region = ? ORDER BY result_type, subject_name, segment_id").bind(teamId, quarter, region).all();
      let resultsList = (resultRows.results || []) as any[];

      const resolvedGameId = url.searchParams.get("game_id") || url.searchParams.get("universe_id");
      let gameIdToUse = resolvedGameId;
      if (!gameIdToUse) {
        const universe: any = await env.DB.prepare("SELECT id FROM universes ORDER BY updated_at DESC LIMIT 1").first();
        gameIdToUse = universe?.id;
      }
      if (gameIdToUse) {
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS visibility_settings (
          id TEXT PRIMARY KEY, game_id TEXT NOT NULL UNIQUE, reveal_brand_specs INTEGER NOT NULL DEFAULT 0,
          reveal_sales_data INTEGER NOT NULL DEFAULT 0, reveal_financials INTEGER NOT NULL DEFAULT 0,
          reveal_rd_projects INTEGER NOT NULL DEFAULT 0, competitive_benchmark_purchasable INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );`);
        const visRow = await env.DB.prepare("SELECT * FROM visibility_settings WHERE game_id = ?").bind(gameIdToUse).first();
        const revealSalesData = visRow ? Number(visRow.reveal_sales_data) : 0;
        if (revealSalesData === 0) {
          resultsList = resultsList.map((row: any) => {
            const isOwnTeam = String(row.team_id || row.teamId) === teamId;
            if (!isOwnTeam) {
              const { unit_sales, units_sold, unit_sales_data, ...rest } = row;
              return rest;
            }
            return row;
          });
        }
      }

      return new Response(JSON.stringify({ success: true, purchased: resultsList.length > 0, results: resultsList }), { status: 200, headers: corsHeaders });
    }

    const MARKET_SURVEY_COST: Record<string, number> = { low: 5, medium: 15, high: 30 };

    if (path === "/api/market-survey" && method === "GET") {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const universeId = String(url.searchParams.get("universe_id") || "").trim();
      const quarter = Number(url.searchParams.get("quarter"));
      const precision = String(url.searchParams.get("precision") || "low").trim();
      if (!universeId || !Number.isInteger(quarter) || quarter < 1 || !["low", "medium", "high"].includes(precision)) {
        return new Response(JSON.stringify({ error: "universe_id, a positive integer quarter, and a valid precision are required." }), { status: 400, headers: corsHeaders });
      }
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS market_survey_results (
        survey_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, quarter INTEGER NOT NULL,
        precision_level TEXT NOT NULL DEFAULT 'low' CHECK (precision_level IN ('low','medium','high')),
        purchase_cost REAL NOT NULL DEFAULT 0, segment_id TEXT NOT NULL,
        benefit_range_importance REAL, benefit_charging_importance REAL, benefit_price_importance REAL,
        benefit_autonomy_importance REAL, benefit_design_importance REAL, benefit_reliability_importance REAL,
        media_social_pref REAL, media_auto_press_pref REAL, media_business_press_pref REAL,
        media_ev_forums_pref REAL, media_youtube_pref REAL,
        wtp_min REAL, wtp_expected REAL, wtp_max REAL, segment_size_units INTEGER, error_margin REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (universe_id, quarter, precision_level, segment_id)
      );`);
      const rows = await env.DB.prepare("SELECT * FROM market_survey_results WHERE universe_id = ? AND quarter = ? AND precision_level = ? ORDER BY segment_id").bind(universeId, quarter, precision).all();
      const results = (rows.results || []) as any[];
      if (!results.length) return new Response(JSON.stringify({ results: [], purchased: false }), { status: 200, headers: corsHeaders });
      return new Response(JSON.stringify({ results, purchased: true, error_margin: results[0].error_margin }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/market-survey/purchase" && method === "POST") {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json() as any;
      const universeId = String(body.universe_id || "").trim();
      const teamId = String(body.team_id ?? "").trim();
      const quarter = Number(body.quarter);
      const precisionLevel = String(body.precision_level || "").trim();
      if (!universeId || !teamId || !Number.isInteger(quarter) || quarter < 1 || !["low", "medium", "high"].includes(precisionLevel)) {
        return new Response(JSON.stringify({ error: "universe_id, team_id, a positive integer quarter, and a valid precision_level are required." }), { status: 400, headers: corsHeaders });
      }
      const purchaseCost = MARKET_SURVEY_COST[precisionLevel];

      const existingRows = await env.DB.prepare("SELECT COUNT(*) AS count FROM market_survey_results WHERE universe_id = ? AND quarter = ? AND precision_level = ?").bind(universeId, quarter, precisionLevel).first();
      if (!existingRows || Number(existingRows.count) === 0) {
        return new Response(JSON.stringify({ error: "No market survey data is available for this universe, quarter, and precision level." }), { status: 404, headers: corsHeaders });
      }

      await env.DB.exec(`CREATE TABLE IF NOT EXISTS market_survey_purchases (
        id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, quarter INTEGER NOT NULL,
        precision_level TEXT NOT NULL CHECK (precision_level IN ('low','medium','high')),
        cost REAL NOT NULL DEFAULT 0, purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (universe_id, team_id, quarter, precision_level)
      );`);
      await env.DB.prepare("INSERT INTO market_survey_purchases (id, universe_id, team_id, quarter, precision_level, cost) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_id, quarter, precision_level) DO UPDATE SET cost = excluded.cost, purchased_at = datetime('now')").bind(`${universeId}:${teamId}:${quarter}:${precisionLevel}`, universeId, teamId, quarter, precisionLevel, purchaseCost).run();

      return new Response(JSON.stringify({ success: true, cost: purchaseCost }), { status: 200, headers: corsHeaders });
    }

    // Vehicle designer catalog and brand save API.
    if (path === "/api/vehicle-designer" && method === "GET") {
      const requestedQuarter = Number(url.searchParams.get("quarter") || 1);
      const currentQuarter = Number.isFinite(requestedQuarter) ? Math.max(1, requestedQuarter) : 1;
      const componentRows = await env.DB.prepare(
        "SELECT component_id, category, name, material_cost, performance_score, benefit_delivered FROM vehicle_components WHERE available_from_quarter <= ? ORDER BY category, material_cost"
      ).bind(currentQuarter).all();
      const segmentRows = await env.DB.prepare(
        "SELECT segment_id, name, price_sensitivity, range_priority, charging_speed_priority, autonomy_priority, brand_image_priority, segment_size_pct FROM market_segments ORDER BY segment_id"
      ).all();

      return new Response(JSON.stringify({
        components: (componentRows.results || []).map((row: any) => ({
          componentId: row.component_id,
          category: row.category,
          name: row.name,
          cost: Number(row.material_cost),
          performance: Number(row.performance_score),
          benefit: row.benefit_delivered,
          benefitKey: componentBenefitKey[row.category] || "range"
        })),
        segments: (segmentRows.results || []).map((row: any) => ({
          segmentId: row.segment_id,
          name: row.name,
          priceWillingToPay: Math.round(60000 - Number(row.price_sensitivity || 0) * 3500),
          weights: {
            range: Number(row.range_priority || 0),
            charging: Number(row.charging_speed_priority || 0),
            autonomy: Number(row.autonomy_priority || 0),
            image: Number(row.brand_image_priority || 0)
          }
        }))
      }), { status: 200, headers: corsHeaders });
    }

    if (path.startsWith("/api/vehicle-designer/brands/") && method === "POST") {
      if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      }
      const brandId = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
      const body = await request.json() as {
        quarter?: number;
        componentIds?: string[];
        multiplier?: number;
        brandName?: string;
        submittedBy?: string;
      };
      const quarter = Number(body.quarter);
      const componentIds = normalizeComponentIds(Array.isArray(body.componentIds) ? body.componentIds : []);
      const brandName = typeof body.brandName === "string" ? body.brandName.trim() : "";
      const multiplier = Number(body.multiplier ?? 2.5);
      const redesignFee = Math.max(0, Number(env.VEHICLE_REDESIGN_FEE ?? 500));
      if (!brandId || !Number.isInteger(quarter) || quarter < 1 || !Number.isFinite(multiplier) || multiplier <= 0) {
        return new Response(JSON.stringify({ error: "brandId, a positive integer quarter, and a positive multiplier are required." }), { status: 400, headers: corsHeaders });
      }

      const decisionId = `vehicle-design:${brandId}:Q${quarter}`;
      const existingQuarter = await env.DB.prepare(
        "SELECT id FROM team_decisions WHERE id = ?"
      ).bind(decisionId).first();
      const latestDecision = await env.DB.prepare(
        "SELECT quarter, decision_json FROM team_decisions WHERE id LIKE ? AND quarter < ? ORDER BY quarter DESC LIMIT 1"
      ).bind(`vehicle-design:${brandId}:Q%`, quarter).first();
      const fee = existingQuarter ? 0 : (latestDecision ? redesignFee : 0);
      let priorBrandName = brandId;
      let configurationChanged = false;
      if (latestDecision?.decision_json) {
        try {
          const priorDecision = JSON.parse(latestDecision.decision_json);
          priorBrandName = typeof priorDecision.brandName === "string" && priorDecision.brandName.trim()
            ? priorDecision.brandName.trim()
            : brandId;
          configurationChanged = JSON.stringify(normalizeComponentIds(priorDecision.componentIds || [])) !== JSON.stringify(componentIds);
        } catch {
          configurationChanged = true;
        }
      }
      if (configurationChanged && (!brandName || brandName.toLowerCase() === priorBrandName.toLowerCase())) {
        return new Response(JSON.stringify({
          error: "A changed component configuration requires a new brand name.",
          originalBrandName: priorBrandName
        }), { status: 400, headers: corsHeaders });
      }
      const finalBrandName = brandName || priorBrandName;
      const brandLoyaltyCarryOver = configurationChanged && jaroWinkler(finalBrandName, priorBrandName) >= 0.6 ? 1 : 0;
      const decision = JSON.stringify({
        type: "vehicle_design",
        brandId,
        brandName: finalBrandName,
        quarter,
        componentIds,
        multiplier,
        redesignFee: fee,
        brand_loyalty_carry_over: brandLoyaltyCarryOver
      });
      await env.DB.prepare(`
        INSERT INTO team_decisions (id, universe_id, team_i, quarter, decision_json, redesign_fee, submitted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET decision_json = excluded.decision_json, redesign_fee = excluded.redesign_fee, submitted_at = datetime('now'), submitted_by = excluded.submitted_by
      `).bind(
        decisionId,
        "vehicle-designer",
        -1,
        quarter,
        decision,
        fee,
        body.submittedBy || "vehicle-designer"
      ).run();
      return new Response(JSON.stringify({ success: true, brandId, brandName: finalBrandName, quarter, redesignFee: fee, brand_loyalty_carry_over: brandLoyaltyCarryOver, decisionId }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/charging-network" && (method === "GET" || method === "POST")) {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = method === "POST" ? await request.json() as any : {};
      const teamId = String(body.teamId ?? url.searchParams.get("teamId") ?? "").trim();
      const quarter = Number(body.quarter ?? url.searchParams.get("quarter"));
      if (!teamId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "teamId and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      await env.DB.exec("CREATE TABLE IF NOT EXISTS charging_network (team_id TEXT NOT NULL, region TEXT NOT NULL, quarter INTEGER NOT NULL, charger_count INTEGER NOT NULL DEFAULT 0, charger_type TEXT NOT NULL CHECK (charger_type IN ('Level 2 AC', 'DC Fast Charge', 'Ultra-rapid 350kW')), installation_cost REAL NOT NULL DEFAULT 0, quarterly_maintenance REAL NOT NULL DEFAULT 0, demand_boost_pct REAL NOT NULL DEFAULT 0, UNIQUE (team_id, region, quarter))");
      if (method === "GET") {
        const rows = await env.DB.prepare("SELECT * FROM charging_network WHERE team_id = ? AND quarter <= ? ORDER BY quarter, region").bind(teamId, quarter).all();
        return new Response(JSON.stringify({ investments: rows.results || [] }), { status: 200, headers: corsHeaders });
      }
      const typeConfig: Record<string, [number, number, number]> = { "Level 2 AC": [0.08, 0.12, 0.006], "DC Fast Charge": [0.18, 0.35, 0.014], "Ultra-rapid 350kW": [0.3, 0.7, 0.025] };
      const investments = Array.isArray(body.investments) ? body.investments : [];
      if (!investments.length) return new Response(JSON.stringify({ error: "At least one regional investment is required." }), { status: 400, headers: corsHeaders });
      await env.DB.batch(investments.map((investment: any) => {
        const region = String(investment.region || "").trim(); const chargerType = String(investment.charger_type || ""); const count = Math.max(0, Math.floor(Number(investment.charger_count) || 0)); const config = typeConfig[chargerType];
        if (!region || !config) throw new Error("Each investment needs a valid region and charger type.");
        return env.DB.prepare("INSERT INTO charging_network (team_id, region, quarter, charger_count, charger_type, installation_cost, quarterly_maintenance, demand_boost_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(team_id, region, quarter) DO UPDATE SET charger_count = excluded.charger_count, charger_type = excluded.charger_type, installation_cost = excluded.installation_cost, quarterly_maintenance = excluded.quarterly_maintenance, demand_boost_pct = excluded.demand_boost_pct").bind(teamId, region, quarter, count, chargerType, count * config[1], count * config[2], count * config[0]);
      }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    // 2. Cloudflare D1 Status
    if (path === "/api/strategy-plans" && method === "GET") {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding DB is not configured." }), { status: 500, headers: corsHeaders });
      const universeId = String(url.searchParams.get("universeId") || "").trim();
      const teamId = Number(url.searchParams.get("teamId"));
      const quarter = Number(url.searchParams.get("quarter"));
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "universeId, teamId, and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      const row: any = await env.DB.prepare("SELECT * FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter = ?").bind(universeId, teamId, quarter).first();
      return new Response(JSON.stringify({ plan: row ? JSON.parse(row.plan_json) : null, updatedAt: row?.updated_at || null }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/strategy-plans" && method === "POST") {
      const body = await request.json() as { universeId?: string; teamId?: number; quarter?: number; plan?: any; isDraft?: boolean };
      const universeId = String(body.universeId || "").trim(); const teamId = Number(body.teamId); const quarter = Number(body.quarter); const plan = body.plan;
      const isDraft = Boolean(body.isDraft);
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1 || !plan || typeof plan !== "object") return new Response(JSON.stringify({ error: "universeId, teamId, quarter, and plan are required." }), { status: 400, headers: corsHeaders });
      if (!isDraft && String(plan.mission || "").trim().split(/\s+/).filter(Boolean).length > 200) return new Response(JSON.stringify({ error: "Mission exceeds 200 words." }), { status: 400, headers: corsHeaders });
      if (!isDraft) {
        const priorityTotal = ["Marketing", "Sales", "Manufacturing", "R&D", "Human Resources"].reduce((sum, name) => sum + Number(plan.priorities?.[name] || 0), 0);
        if (priorityTotal !== 100) return new Response(JSON.stringify({ error: "Functional priorities must total 100." }), { status: 400, headers: corsHeaders });
      }
      const id = `${universeId}:${teamId}:${quarter}`;
      await env.DB.prepare("INSERT INTO strategy_plans (id, universe_id, team_i, quarter, plan_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET plan_json = excluded.plan_json, updated_at = datetime('now')").bind(id, universeId, teamId, quarter, JSON.stringify(plan)).run();
      return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/swot" && (method === "GET" || method === "POST")) {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = method === "POST" ? await request.json() as any : {};
      const universeId = String(body.universeId || url.searchParams.get("universeId") || "").trim();
      const teamId = Number(body.teamId ?? url.searchParams.get("teamId"));
      const quarter = Number(body.quarter ?? url.searchParams.get("quarter"));
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "universeId, teamId, and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      await env.DB.exec("CREATE TABLE IF NOT EXISTS swot_records (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, swot_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      const universe: any = await env.DB.prepare("SELECT id, game_state FROM universes WHERE id = ?").bind(universeId).first();
      if (!universe) return new Response(JSON.stringify({ error: "Simulation universe was not found." }), { status: 404, headers: corsHeaders });
      const state = readJson(universe.game_state);
      const teams = Array.isArray(state.teams) ? state.teams : [];
      const currentTeam = teams.find((team: any) => Number(team.i) === teamId);
      if (!currentTeam) return new Response(JSON.stringify({ error: "Team was not found in the simulation universe." }), { status: 404, headers: corsHeaders });
      const latest = (team: any) => [...(team.hist || [])].filter((item: any) => Number(item.q) <= quarter).sort((a: any, b: any) => Number(b.q) - Number(a.q))[0] || {};
      const number = (value: any, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
      const teamResult = latest(currentTeam);
      const teamLabel = (team: any) => String(team.name || `Team ${Number(team.i) + 1}`);
      const segments = Array.isArray(state.segments) ? state.segments : [];
      const segmentName = (id: string) => segments.find((segment: any) => String(segment.id || segment.segment_id) === id)?.name || id;
      const judgmentEntries = Object.entries(teamResult.judg || {}).map(([id, value]: [string, any]) => ({ id, score: number(value?.p) })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
      const scores = teams.map((team: any) => number(latest(team).brandJ)).filter((score) => score > 0);
      const adScores = teams.map((team: any) => number(latest(team).campJ)).filter((score) => score > 0);
      const averageBrandJudgment = scores.reduce((sum, score) => sum + score, 0) / (scores.length || 1);
      const averageAdJudgment = adScores.reduce((sum, score) => sum + score, 0) / (adScores.length || 1);
      const primary = String(currentTeam.prim || "");
      const primaryShare = number(teamResult.sharePrim || teamResult.share);
      const currentCash = number(teamResult.cash, number(currentTeam.cash));
      const negativeMarginBrands = (teamResult.modelRows || []).filter((model: any) => number(model.price) < number(model.cost)).map((model: any) => `${model.name || "Unnamed brand"} has an estimated negative unit margin`);
      const cityNetwork = ["Delhi / NCR", "Bengaluru / Chennai", "Mumbai / Pune", "Hyderabad", "Kolkata", "Ahmedabad"];
      const uncoveredCities = cityNetwork.slice(Math.max(0, Math.min(cityNetwork.length, number(currentTeam.centres)))).slice(0, 3);
      const uncontestedSegments = ["urban_commuter", "fleet_operator", "performance_enthusiast", "tech_pioneer", "eco_advocate"].filter((segmentId) => !teams.some((team: any) => number(latest(team).judg?.[segmentId]?.p) > 80)).map(segmentName);
      const actionSummary = (team: any) => {
        const result = latest(team);
        const decision = team.dec || {};
        const actions: string[] = [];
        if (number(decision.ad) > 250 || number(result.campJ) >= 75) actions.push("aggressive demand generation");
        if (number(result.rndSpend) > 0 || (team.rnd || []).length > 0) actions.push("technology-led R&D investment");
        if (number(decision.newCentres) > 0 || number(team.centres) >= 6) actions.push("network expansion");
        if (number(result.reliab) >= 0.75 || number(team.qualityCum) > 0) actions.push("quality and reliability differentiation");
        if ((team.models || []).some((model: any) => number(model.price) >= 50000)) actions.push("premium positioning");
        return actions.length ? actions.join(", ") : "measured, low-commitment posture";
      };
      const rivals = teams.filter((team: any) => Number(team.i) !== teamId).map((team: any) => ({ teamId: team.i, name: teamLabel(team), posture: actionSummary(team), evidence: { advertising: number(team.dec?.ad), rndSpend: number(latest(team).rndSpend), centres: number(team.centres), reliability: Math.round(number(latest(team).reliab) * 100) } }));
      const detected = {
        strengths: [...judgmentEntries.slice(0, 3).map((entry) => `${segmentName(entry.id)} brand judgment is ${Math.round(entry.score)}/100`), `Reliability rating is ${Math.round(number(teamResult.reliab) * 100)}/100`, `${Math.round(primaryShare * (primaryShare <= 1 ? 100 : 1))}% share in ${segmentName(primary)}`],
        weaknesses: [...negativeMarginBrands, ...(currentCash < 1000 ? [`Low cash position: Rs. ${Math.round(currentCash)} L`] : []), ...(number(teamResult.campJ) > 0 && number(teamResult.campJ) < averageAdJudgment ? [`Ad judgment below the league average (${Math.round(teamResult.campJ)} vs ${Math.round(averageAdJudgment)})`] : [])],
        opportunities: [...(uncoveredCities.length ? [`Uncontested city coverage: ${uncoveredCities.join(", ")}`] : []), ...(uncontestedSegments.length ? [`No team exceeds 80 brand judgment in: ${uncontestedSegments.join(", ")}`] : []), ...(averageBrandJudgment ? [`League average brand judgment is ${Math.round(averageBrandJudgment)}/100`] : [])],
        threats: teams.filter((team: any) => Number(team.i) !== teamId && (number(latest(team).rndSpend) > number(teamResult.rndSpend) || number(latest(team).reliab) > number(teamResult.reliab))).slice(0, 4).map((team: any) => `${teamLabel(team)} has superior ${number(latest(team).rndSpend) > number(teamResult.rndSpend) ? "R&D investment" : "reliability rating"}`)
      };
      const row: any = await env.DB.prepare("SELECT swot_json, updated_at FROM swot_records WHERE universe_id = ? AND team_i = ? AND quarter = ?").bind(universeId, teamId, quarter).first();
      if (method === "GET") return new Response(JSON.stringify({ swot: row ? readJson(row.swot_json) : detected, detected, competitors: rivals, updatedAt: row?.updated_at || null }), { status: 200, headers: corsHeaders });
      const swot = body.swot;
      const quadrants = ["strengths", "weaknesses", "opportunities", "threats"];
      if (!swot || typeof swot !== "object" || quadrants.some((key) => !Array.isArray(swot[key]) || swot[key].some((item: any) => typeof item !== "string" || item.trim().length > 240))) return new Response(JSON.stringify({ error: "Each SWOT quadrant must be an array of text items no longer than 240 characters." }), { status: 400, headers: corsHeaders });
      const normalized = Object.fromEntries(quadrants.map((key) => [key, swot[key].map((item: string) => item.trim()).filter(Boolean).slice(0, 20)]));
      const id = `${universeId}:${teamId}:${quarter}`;
      await env.DB.prepare("INSERT INTO swot_records (id, universe_id, team_i, quarter, swot_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET swot_json = excluded.swot_json, updated_at = datetime('now')").bind(id, universeId, teamId, quarter, JSON.stringify(normalized)).run();
      return new Response(JSON.stringify({ success: true, swot: normalized, updatedAt: new Date().toISOString() }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/balanced-scorecard" && method === "POST") {
      if (!env.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json() as { universeId?: string; quarter?: number; records?: any[] };
      const universeId = String(body.universeId || "").trim();
      const quarter = Number(body.quarter);
      const records = Array.isArray(body.records) ? body.records.slice(0, 100) : [];
      if (!universeId || !Number.isInteger(quarter) || quarter < 4 || !records.length) return new Response(JSON.stringify({ error: "universeId, Q4-or-later quarter, and scorecard records are required." }), { status: 400, headers: corsHeaders });
      await env.DB.exec("CREATE TABLE IF NOT EXISTS balanced_scorecard (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, team_name TEXT NOT NULL, overall_score REAL NOT NULL, dimensions_json TEXT NOT NULL, raw_metrics_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      await env.DB.batch(records.map((record: any) => {
        const teamId = String(record.teamId || "").trim();
        const id = `${universeId}:${teamId}:${quarter}`;
        return env.DB.prepare("INSERT INTO balanced_scorecard (id, universe_id, team_i, quarter, team_name, overall_score, dimensions_json, raw_metrics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET team_name = excluded.team_name, overall_score = excluded.overall_score, dimensions_json = excluded.dimensions_json, raw_metrics_json = excluded.raw_metrics_json, updated_at = datetime('now')").bind(id, universeId, teamId, quarter, String(record.teamName || teamId), Number(record.score) || 0, JSON.stringify(record.dimensions || {}), JSON.stringify(record.raw || {}));
      }));
      return new Response(JSON.stringify({ success: true, quarter, saved: records.length }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/d1/status" || path === "/api/d1/health") {
      if (!env.DB) {
        return new Response(
          JSON.stringify({ status: "disconnected", error: "D1 database binding 'DB' is not configured in environment." }),
          { status: 200, headers: corsHeaders }
        );
      }
      try {
        const univCount = await env.DB.prepare("SELECT COUNT(*) as count FROM universes").first("count");
        const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
        return new Response(
          JSON.stringify({
            status: "connected",
            provider: "Cloudflare D1",
            tableCounts: { universes: univCount ?? 0, users: userCount ?? 0 }
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ status: "uninitialized", error: err.message || "Tables not yet initialized." }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // 3. Initialize D1 Schema
    if (path === "/api/d1/init-schema" && method === "POST") {
      if (!env.DB) {
        return new Response(JSON.stringify({ error: "No D1 DB binding found" }), { status: 500, headers: corsHeaders });
      }
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS universes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            instructor_email TEXT NOT NULL,
            max_teams INTEGER NOT NULL DEFAULT 10,
            max_members_per_team INTEGER NOT NULL DEFAULT 8,
            game_state TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            institution TEXT DEFAULT '',
            universe_id TEXT NOT NULL,
            team_i INTEGER NOT NULL DEFAULT -1,
            password TEXT NOT NULL,
            last_active_at TEXT,
            active_minutes INTEGER NOT NULL DEFAULT 0,
            is_online INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS team_decisions (
            id TEXT PRIMARY KEY,
            universe_id TEXT NOT NULL,
            team_i INTEGER NOT NULL,
            quarter INTEGER NOT NULL,
            decision_json TEXT NOT NULL,
            redesign_fee REAL NOT NULL DEFAULT 0,
            submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
            submitted_by TEXT NOT NULL
        );
          CREATE TABLE IF NOT EXISTS decision_audit_log (
            log_id TEXT PRIMARY KEY,
            team_id TEXT,
            quarter INTEGER,
            decision_area TEXT,
            field_changed TEXT,
            old_value TEXT,
            new_value TEXT,
            timestamp TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_decision_audit_team_quarter ON decision_audit_log(team_id, quarter, timestamp);
        CREATE TABLE IF NOT EXISTS strategy_plans (
          id TEXT PRIMARY KEY,
          universe_id TEXT NOT NULL,
          team_i INTEGER NOT NULL,
          quarter INTEGER NOT NULL,
          plan_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (universe_id, team_i, quarter)
        );
          CREATE TABLE IF NOT EXISTS pro_forma_statements (
            id TEXT PRIMARY KEY,
            universe_id TEXT NOT NULL,
            team_i INTEGER NOT NULL,
            quarter INTEGER NOT NULL,
            statement_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (universe_id, team_i, quarter)
          );
          CREATE INDEX IF NOT EXISTS idx_pro_forma_lookup ON pro_forma_statements(universe_id, quarter, team_i);
          CREATE TABLE IF NOT EXISTS balanced_scorecard (
            id TEXT PRIMARY KEY,
            universe_id TEXT NOT NULL,
            team_i TEXT NOT NULL,
            quarter INTEGER NOT NULL,
            team_name TEXT NOT NULL,
            overall_score REAL NOT NULL,
            dimensions_json TEXT NOT NULL,
            raw_metrics_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (universe_id, team_i, quarter)
          );
          CREATE INDEX IF NOT EXISTS idx_balanced_scorecard_lookup ON balanced_scorecard(universe_id, quarter, team_i);
          CREATE TABLE IF NOT EXISTS hr_decisions (
            id TEXT PRIMARY KEY,
            universe_id TEXT NOT NULL,
            team_i INTEGER NOT NULL,
            quarter INTEGER NOT NULL,
            sales_json TEXT NOT NULL,
            production_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (universe_id, team_i, quarter)
          );
          CREATE INDEX IF NOT EXISTS idx_hr_decisions_lookup ON hr_decisions(universe_id, quarter, team_i);
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            universe_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            details_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS market_segments (
          segment_id TEXT PRIMARY KEY,
          name TEXT,
          description TEXT,
          price_sensitivity INTEGER,
          range_priority INTEGER,
          charging_speed_priority INTEGER,
          autonomy_priority INTEGER,
          brand_image_priority INTEGER,
          typical_buyer_persona TEXT,
          segment_size_pct REAL
        );
        CREATE TABLE IF NOT EXISTS vehicle_components (
          component_id TEXT PRIMARY KEY,
          category TEXT,
          name TEXT,
          material_cost REAL,
          performance_score INTEGER,
          benefit_delivered TEXT,
          is_rd_unlocked INTEGER DEFAULT 0,
          available_from_quarter INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS ad_campaigns (
          campaign_id TEXT PRIMARY KEY,
          universe_id TEXT,
          team_id TEXT,
          quarter INTEGER,
          segment_target TEXT,
          brand_mentioned TEXT,
          benefit_1 TEXT,
          benefit_2 TEXT,
          benefit_3 TEXT,
          benefit_4 TEXT,
          benefit_5 TEXT,
          ad_judgment INTEGER
        );
        CREATE TABLE IF NOT EXISTS ad_violations (
          violation_id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          universe_id TEXT NOT NULL,
          team_id TEXT NOT NULL,
          claim TEXT NOT NULL,
          quarter INTEGER NOT NULL,
          offense_number INTEGER NOT NULL,
          penalty_type TEXT NOT NULL,
          fine_pct REAL NOT NULL DEFAULT 0,
          fine_amount REAL NOT NULL DEFAULT 0,
          ban_until_quarter INTEGER NOT NULL,
          reason TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      return new Response(JSON.stringify({ success: true, message: "D1 Schema successfully initialized." }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // 4. Universes API (D1)
    if (path === "/api/d1/universes") {
      if (method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM universes ORDER BY created_at DESC").all();
        const universes = (results || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          instructorEmail: row.instructor_email,
          maxTeams: row.max_teams,
          maxMembersPerTeam: row.max_members_per_team,
          gameState: typeof row.game_state === "string" ? JSON.parse(row.game_state) : row.game_state,
          createdAt: row.created_at
        }));
        return new Response(JSON.stringify(universes), { status: 200, headers: corsHeaders });
      }

      if (method === "POST") {
        const universe = await request.json();
        await env.DB.prepare(`
          INSERT INTO universes (id, name, code, instructor_email, max_teams, max_members_per_team, game_state, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            code = excluded.code,
            instructor_email = excluded.instructor_email,
            max_teams = excluded.max_teams,
            max_members_per_team = excluded.max_members_per_team,
            game_state = excluded.game_state,
            updated_at = datetime('now')
        `).bind(
          universe.id,
          universe.name,
          universe.code || "NITW2026",
          universe.instructorEmail || "instructor@nitw.ac.in",
          universe.maxTeams || 10,
          universe.maxMembersPerTeam || 8,
          JSON.stringify(universe.gameState)
        ).run();

        return new Response(JSON.stringify({ success: true, universeId: universe.id }), { status: 200, headers: corsHeaders });
      }
    }

    if (path === "/api/d1/pro-forma-statements" && method === "POST") {
      const body = await request.json() as { universeId?: string; teamI?: number; quarter?: number; statement?: unknown };
      const universeId = String(body.universeId || "").trim();
      const teamI = Number(body.teamI);
      const quarter = Number(body.quarter);
      if (!universeId || !Number.isInteger(teamI) || !Number.isInteger(quarter) || !body.statement) {
        return new Response(JSON.stringify({ error: "universeId, teamI, quarter, and statement are required." }), { status: 400, headers: corsHeaders });
      }
      const id = `pro-forma:${universeId}:${teamI}:Q${quarter}`;
      await env.DB.prepare(`
        INSERT INTO pro_forma_statements (id, universe_id, team_i, quarter, statement_json, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET statement_json = excluded.statement_json, updated_at = datetime('now')
      `).bind(id, universeId, teamI, quarter, JSON.stringify(body.statement)).run();
      return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: corsHeaders });
    }

    // 5. Users API (D1)
    if (path === "/api/d1/users") {
      if (method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY name ASC").all();
        const users = (results || []).map((row: any) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          institution: row.institution,
          universeId: row.universe_id,
          teamI: row.team_i,
          password: row.password,
          lastActiveAt: row.last_active_at,
          activeMinutes: row.active_minutes,
          isOnline: Boolean(row.is_online)
        }));
        return new Response(JSON.stringify(users), { status: 200, headers: corsHeaders });
      }

      if (method === "POST") {
        const user = await request.json();
        await env.DB.prepare(`
          INSERT INTO users (id, email, name, role, institution, universe_id, team_i, password, last_active_at, active_minutes, is_online)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            role = excluded.role,
            institution = excluded.institution,
            universe_id = excluded.universe_id,
            team_i = excluded.team_i,
            password = excluded.password,
            last_active_at = excluded.last_active_at,
            active_minutes = excluded.active_minutes,
            is_online = excluded.is_online
        `).bind(
          user.id,
          user.email,
          user.name,
          user.role,
          user.institution || "",
          user.universeId,
          user.teamI ?? -1,
          user.password || "student123",
          user.lastActiveAt || new Date().toISOString(),
          user.activeMinutes || 0,
          user.isOnline ? 1 : 0
        ).run();

        return new Response(JSON.stringify({ success: true, userId: user.id }), { status: 200, headers: corsHeaders });
      }
    }

    // DELETE /api/d1/users/:id — permanently remove user from D1
    if (
      path.startsWith("/api/d1/users/") &&
      !path.endsWith("/batch") &&
      !path.endsWith("/remove-from-universe") &&
      method === "DELETE"
    ) {
      const segments = path.split("/").filter(Boolean);
      const userId = decodeURIComponent(segments[segments.length - 1]);
      const email = url.searchParams.get("email") || "";

      let deletedCount = 0;
      const result = await env.DB.prepare(
        `DELETE FROM users WHERE id = ? OR email = ? OR LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?)`
      ).bind(userId, userId, userId, userId).run();
      deletedCount += Number(result?.meta?.changes || 0);

      if (email) {
        const emailResult = await env.DB.prepare(
          `DELETE FROM users WHERE id = ? OR email = ? OR LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?)`
        ).bind(email, email, email, email).run();
        deletedCount += Number(emailResult?.meta?.changes || 0);
      }

      return new Response(JSON.stringify({ success: deletedCount > 0, deletedId: userId, email, deletedCount }), {
        status: deletedCount > 0 ? 200 : 404,
        headers: corsHeaders
      });
    }

    // DELETE /api/d1/universes/:id — permanently remove universe from D1
    if (path.startsWith("/api/d1/universes/") && method === "DELETE") {
      const segments = path.split("/").filter(Boolean);
      const universeId = decodeURIComponent(segments[segments.length - 1]);

      await env.DB.prepare("DELETE FROM universes WHERE id = ?").bind(universeId).run();

      return new Response(JSON.stringify({ success: true, deletedId: universeId }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // POST /api/d1/users/:id/remove-from-universe — detach user from universe
    if (path.endsWith("/remove-from-universe") && method === "POST") {
      const segments = path.split("/").filter(Boolean);
      const userId = decodeURIComponent(segments[segments.length - 2]);

      await env.DB.prepare(
        `UPDATE users SET universe_id = '', team_i = -1 WHERE id = ?`
      ).bind(userId).run();

      return new Response(JSON.stringify({ success: true, userId }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Batch Users
    if (path === "/api/d1/users/batch" && method === "POST") {
      const { users } = await request.json();
      if (Array.isArray(users)) {
        const statements = users.map((u: any) =>
          env.DB.prepare(`
            INSERT INTO users (id, email, name, role, institution, universe_id, team_i, password, last_active_at, active_minutes, is_online)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              email = excluded.email,
              name = excluded.name,
              role = excluded.role,
              institution = excluded.institution,
              universe_id = excluded.universe_id,
              team_i = excluded.team_i,
              password = excluded.password,
              last_active_at = excluded.last_active_at,
              active_minutes = excluded.active_minutes,
              is_online = excluded.is_online
          `).bind(
            u.id,
            u.email,
            u.name,
            u.role,
            u.institution || "",
            u.universeId,
            u.teamI ?? -1,
            u.password || "student123",
            u.lastActiveAt || new Date().toISOString(),
            u.activeMinutes || 0,
            u.isOnline ? 1 : 0
          )
        );
        await env.DB.batch(statements);
      }
      return new Response(JSON.stringify({ success: true, count: users?.length || 0 }), { status: 200, headers: corsHeaders });
    }

    // 6. SQL Query Execution Console (Admin)
    if (path === "/api/d1/query" && method === "POST") {
      const { sql, params = [] } = await request.json();
      if (!sql || typeof sql !== "string") {
        return new Response(JSON.stringify({ error: "No SQL provided" }), { status: 400, headers: corsHeaders });
      }

      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("select") || trimmed.startsWith("pragma") || trimmed.startsWith("explain")) {
        const { results } = await env.DB.prepare(sql).bind(...params).all();
        return new Response(JSON.stringify({ success: true, results, rows: results?.length || 0 }), {
          status: 200,
          headers: corsHeaders
        });
      } else {
        const info = await env.DB.prepare(sql).bind(...params).run();
        return new Response(JSON.stringify({ success: true, meta: info?.meta, changes: info?.meta?.changes || 0 }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }

    if (path === "/api/production-schedules" && method === "POST") {
      const body = await request.json() as { universeId?: string; teamId?: number; quarter?: number; inputs?: unknown; outputs?: unknown };
      const universeId = String(body.universeId || "").trim();
      const teamI = Number(body.teamId);
      const quarter = Number(body.quarter);
      if (!universeId || !Number.isInteger(teamI) || !Number.isInteger(quarter) || quarter < 1 || !body.inputs || !body.outputs) {
        return new Response(JSON.stringify({ error: "universeId, teamId, quarter, inputs, and outputs are required." }), { status: 400, headers: corsHeaders });
      }
      const scheduleId = `${universeId}:${teamI}:${quarter}`;
      await env.DB.prepare(`INSERT INTO production_schedules (schedule_id, universe_id, team_i, quarter, inputs_json, outputs_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET inputs_json = excluded.inputs_json, outputs_json = excluded.outputs_json, updated_at = datetime('now')`)
        .bind(scheduleId, universeId, teamI, quarter, JSON.stringify(body.inputs), JSON.stringify(body.outputs)).run();
      return new Response(JSON.stringify({ success: true, scheduleId }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/production-schedules" && method === "GET") {
      const universeId = String(url.searchParams.get("universeId") || "").trim();
      const teamI = Number(url.searchParams.get("teamId"));
      const quarter = Number(url.searchParams.get("quarter"));
      if (!universeId || !Number.isInteger(teamI) || !Number.isInteger(quarter)) {
        return new Response(JSON.stringify({ error: "universeId, teamId, and quarter are required." }), { status: 400, headers: corsHeaders });
      }
      const row: any = await env.DB.prepare("SELECT * FROM production_schedules WHERE universe_id = ? AND team_i = ? AND quarter = ?").bind(universeId, teamI, quarter).first();
      if (!row) return new Response(JSON.stringify({ error: "Schedule not found." }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify({ ...row, inputs: JSON.parse(row.inputs_json), outputs: JSON.parse(row.outputs_json) }), { status: 200, headers: corsHeaders });
    }

    if (path.startsWith("/api/ad-campaigns/") && path.endsWith("/validate") && method === "POST") {
      const campaignId = decodeURIComponent(path.split("/").filter(Boolean).slice(-2, -1)[0] || "");
      const body = await request.json() as { teamId?: string; quarter?: number };
      const teamId = String(body.teamId || "").trim();
      const quarter = Number(body.quarter);
      if (!campaignId || !teamId || !Number.isInteger(quarter) || quarter < 1) {
        return new Response(JSON.stringify({ error: "campaignId, teamId, and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      }
      const validation = await validateAdClaims(campaignId, teamId, quarter, env.DB);
      return new Response(JSON.stringify(validation), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/ad-tribunal") {
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS ad_campaigns (campaign_id TEXT PRIMARY KEY, universe_id TEXT, team_id TEXT, quarter INTEGER, segment_target TEXT, brand_mentioned TEXT, benefit_1 TEXT, benefit_2 TEXT, benefit_3 TEXT, benefit_4 TEXT, benefit_5 TEXT, ad_judgment INTEGER); CREATE TABLE IF NOT EXISTS ad_violations (violation_id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, quarter INTEGER NOT NULL, offense_number INTEGER NOT NULL DEFAULT 0, penalty_type TEXT NOT NULL DEFAULT 'pending', fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, ban_until_quarter INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS ad_claim_bans (ban_id TEXT PRIMARY KEY, violation_id TEXT NOT NULL UNIQUE, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, offense_number INTEGER NOT NULL, ban_start_quarter INTEGER NOT NULL, ban_until_quarter INTEGER NOT NULL, fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
      for (const statement of [
        "ALTER TABLE ad_violations ADD COLUMN plaintiff_team_id TEXT",
        "ALTER TABLE ad_violations ADD COLUMN defendant_response TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE ad_violations ADD COLUMN ruling TEXT",
        "ALTER TABLE ad_violations ADD COLUMN ruled_at TEXT",
        "ALTER TABLE ad_violations ADD COLUMN ruling_document TEXT"
      ]) { try { await env.DB.exec(statement); } catch { /* Existing D1 databases may already have the column. */ } }
      const universeId = String(url.searchParams.get("universe_id") || "").trim();
      if (method === "GET") {
        const quarter = Number(url.searchParams.get("quarter"));
        if (!universeId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "universe_id and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
        const universe: any = await env.DB.prepare("SELECT game_state FROM universes WHERE id = ?").bind(universeId).first();
        const state = readJson(universe?.game_state);
        const teamName = (teamId: string) => (state.teams || []).find((team: any) => String(team.i) === teamId || String(team.id) === teamId)?.name || teamId;
        const rows = await env.DB.prepare(`SELECT v.*, c.segment_target, c.brand_mentioned, c.benefit_1, c.benefit_2, c.benefit_3, c.benefit_4, c.benefit_5
          FROM ad_violations v LEFT JOIN ad_campaigns c ON c.campaign_id = v.campaign_id
          WHERE v.universe_id = ? AND v.quarter = ? ORDER BY v.created_at DESC`).bind(universeId, quarter).all();
        const complaints = (rows.results || []).map((row: any) => ({
          ...row,
          plaintiff_team: teamName(String(row.plaintiff_team_id || "Market Integrity Office")),
          defendant_team: teamName(String(row.team_id)),
          evidence: { campaignId: row.campaign_id, segmentTarget: row.segment_target, brandMentioned: row.brand_mentioned, claimedBenefits: [row.benefit_1, row.benefit_2, row.benefit_3, row.benefit_4, row.benefit_5].filter(Boolean), validationReason: row.reason },
          defendant_response: row.defendant_response || "No response filed.",
          ruling: row.ruling || "pending"
        }));
        return new Response(JSON.stringify({ complaints, quarter }), { status: 200, headers: corsHeaders });
      }
      if (method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
      const body = await request.json() as { universe_id?: string; violation_id?: string; ruling?: string };
      const ruling = String(body.ruling || "").toLowerCase();
      const bodyUniverseId = String(body.universe_id || universeId).trim();
      if (!bodyUniverseId || !body.violation_id || !["guilty", "not guilty"].includes(ruling)) return new Response(JSON.stringify({ error: "universe_id, violation_id, and ruling (Guilty or Not Guilty) are required." }), { status: 400, headers: corsHeaders });
      const violation: any = await env.DB.prepare("SELECT * FROM ad_violations WHERE violation_id = ? AND universe_id = ?").bind(String(body.violation_id), bodyUniverseId).first();
      if (!violation) return new Response(JSON.stringify({ error: "Complaint not found." }), { status: 404, headers: corsHeaders });
      if (violation.ruling) return new Response(JSON.stringify({ success: true, ruling: violation.ruling, document: violation.ruling_document, alreadyRuled: true }), { status: 200, headers: corsHeaders });
      const prior = await env.DB.prepare("SELECT COUNT(*) AS count FROM ad_violations WHERE universe_id = ? AND team_id = ? AND claim = ? AND ruling = 'guilty'").bind(bodyUniverseId, violation.team_id, violation.claim).first("count");
      const offenseNumber = Number(prior || 0) + 1;
      const finePct = offenseNumber === 2 ? 0.05 : offenseNumber >= 3 ? Math.min(0.2, 0.1 * Math.pow(2, offenseNumber - 3)) : 0;
      const universe: any = await env.DB.prepare("SELECT game_state FROM universes WHERE id = ?").bind(bodyUniverseId).first();
      const state = readJson(universe?.game_state);
      const team: any = (state.teams || []).find((item: any) => String(item.i) === String(violation.team_id) || String(item.id) === String(violation.team_id));
      const revenue = Number(team?.revenue || team?.financials?.revenue || team?.cumRevenue || 0);
      const fineAmount = revenue * finePct;
      const banUntil = Number(violation.quarter) + 4;
      const teamName = team?.name || violation.team_id;
      const document = `To: ${state.instructorEmail || "Instructor"}\nSubject: Ad Claims Tribunal Ruling - ${teamName} - Q${violation.quarter}\n\nThe Ad Claims Tribunal has ruled ${ruling === "guilty" ? "GUILTY" : "NOT GUILTY"} in the complaint concerning the claim "${violation.claim}".\n\nPlaintiff: ${violation.plaintiff_team_id || "Market Integrity Office"}\nDefendant: ${teamName}\nEvidence: Campaign ${violation.campaign_id}; ${violation.reason}\nDefendant response: ${violation.defendant_response || "No response filed."}\n\n${ruling === "guilty" ? `Penalty: ${finePct ? `${finePct * 100}% revenue fine (Rs. ${fineAmount.toFixed(2)}) and ` : ""}four-quarter claim ban through Q${banUntil}.` : "No penalty applies."}\n\nRegards,\nAd Claims Tribunal`;
      await env.DB.batch([
        env.DB.prepare("UPDATE ad_violations SET ruling = ?, ruled_at = datetime('now'), offense_number = ?, fine_pct = ?, fine_amount = ?, ban_until_quarter = ?, penalty_type = ?, ruling_document = ? WHERE violation_id = ? AND ruling IS NULL").bind(ruling, ruling === "guilty" ? offenseNumber : 0, finePct, fineAmount, ruling === "guilty" ? banUntil : 0, ruling === "guilty" ? (finePct ? "fine_and_ban" : "ban") : "none", document, violation.violation_id),
        ...(ruling === "guilty" ? [env.DB.prepare("INSERT INTO ad_claim_bans (ban_id, violation_id, universe_id, team_id, claim, offense_number, ban_start_quarter, ban_until_quarter, fine_pct, fine_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`ban:${violation.violation_id}`, violation.violation_id, bodyUniverseId, violation.team_id, violation.claim, offenseNumber, violation.quarter, banUntil, finePct, fineAmount)] : [])
      ]);
      if (ruling === "guilty" && team && fineAmount > 0) {
        team.cash = Math.max(0, Number(team.cash || 0) - fineAmount);
        await env.DB.prepare("UPDATE universes SET game_state = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(state), bodyUniverseId).run();
      }
      return new Response(JSON.stringify({ success: true, ruling, offenseNumber, finePct, fineAmount, banUntil, document }), { status: 200, headers: corsHeaders });
    }

    if (path === "/api/ad-violations" && method === "GET") {
      const universeId = url.searchParams.get("universe_id");
      const query = universeId
        ? "SELECT * FROM ad_violations WHERE universe_id = ? ORDER BY created_at DESC"
        : "SELECT * FROM ad_violations ORDER BY created_at DESC";
      const rows = await env.DB.prepare(query).bind(...(universeId ? [universeId] : [])).all();
      return new Response(JSON.stringify({ violations: rows.results || [] }), { status: 200, headers: corsHeaders });
    }

    // Gemini advisor endpoint (Cloudflare Edge compatible)
    if (path === "/api/executive-briefing" && method === "POST") {
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 400, headers: corsHeaders });
      const body = await request.json() as { universeId?: string; teamId?: number; quarter?: number; role?: string };
      const universeId = String(body.universeId || "").trim();
      const teamId = Number(body.teamId);
      const quarter = Number(body.quarter);
      const role = String(body.role || "President").trim();
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1) {
        return new Response(JSON.stringify({ error: "universeId, teamId, and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      }
      const readJson = (value: unknown) => { try { return typeof value === "string" ? JSON.parse(value) : value || {}; } catch { return {}; } };
      const rows = async (sql: string, ...params: any[]) => { try { const result = await env.DB.prepare(sql).bind(...params).all(); return result.results || []; } catch { return []; } };
      const scorecards = (await rows("SELECT quarter, overall_score, dimensions_json, raw_metrics_json FROM balanced_scorecard WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?) ORDER BY quarter", universeId, String(teamId), quarter - 1, quarter)).map((row: any) => ({ ...row, dimensions: readJson(row.dimensions_json), rawMetrics: readJson(row.raw_metrics_json) }));
      const strategyPlans = (await rows("SELECT quarter, plan_json, updated_at FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?, ?) ORDER BY quarter", universeId, teamId, quarter - 1, quarter, quarter + 1)).map((row: any) => ({ quarter: row.quarter, updatedAt: row.updated_at, plan: readJson(row.plan_json) }));
      const proForma = (await rows("SELECT quarter, statement_json, updated_at FROM pro_forma_statements WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?) ORDER BY quarter", universeId, teamId, quarter, quarter + 1)).map((row: any) => ({ quarter: row.quarter, updatedAt: row.updated_at, statement: readJson(row.statement_json) }));
      const decisions = (await rows("SELECT quarter, decision_json, submitted_at, submitted_by FROM team_decisions WHERE universe_id = ? AND team_i = ? AND quarter <= ? ORDER BY quarter DESC, submitted_at DESC LIMIT 20", universeId, teamId, quarter)).map((row: any) => ({ quarter: row.quarter, submittedAt: row.submitted_at, submittedBy: row.submitted_by, decision: readJson(row.decision_json) }));
      const sourceData = { universeId, teamId, quarter, role, scorecards, strategyPlans, proForma, decisions };
      const system = "You are a business consultant writing a concise executive summary for an instructor presentation in an EV venture simulation. Use only the supplied data; never invent metrics or decisions. Distinguish actual results from forecasts and call out missing data. Return valid JSON only with exactly these string fields: performance, decisions, nextQuarter, uncertainties. Each field must contain 1-2 polished paragraphs with no markdown headings or bullet lists.";
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1400, system, messages: [{ role: "user", content: `Prepare the quarterly briefing for the ${role}.\n\nD1 data:\n${JSON.stringify(sourceData, null, 2)}` }] }) });
      if (!aiRes.ok) return new Response(JSON.stringify({ error: `Anthropic request failed (${aiRes.status}).` }), { status: 502, headers: corsHeaders });
      const aiData: any = await aiRes.json();
      const text = aiData?.content?.find((item: any) => item.type === "text")?.text || "{}";
      const parsed = readJson(text.replace(/^```json\s*|\s*```$/g, "")) as any;
      return new Response(JSON.stringify({ sourceData, sections: { performance: String(parsed.performance || "Performance data was retrieved, but no summary was generated."), decisions: String(parsed.decisions || "No decision rationale was available for this quarter."), nextQuarter: String(parsed.nextQuarter || "No next-quarter plan was available."), uncertainties: String(parsed.uncertainties || "No additional uncertainties were identified by the model.") } }), { status: 200, headers: corsHeaders });
    }

    // Gemini advisor endpoint (Cloudflare Edge compatible)
    if (path === "/api/advisor" && method === "POST") {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 400, headers: corsHeaders });
      }
      const { prompt, context: simContext } = await request.json();
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const systemInstruction = `You are an elite Business School Professor and Board of Directors Chairperson for the EV Venture League simulation. Analyze the student team metrics and provide 3 concise, highly actionable recommendations in markdown.`;

      const aiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemInstruction}\n\nContext:\n${JSON.stringify(simContext, null, 2)}\n\nQuery: ${prompt || "Analyze our current strategy."}`
                }
              ]
            }
          ]
        })
      });
      const aiData: any = await aiRes.json();
      const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate advice at this moment.";
      return new Response(JSON.stringify({ advice: text }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found: " + path }), { status: 404, headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Server error" }), { status: 500, headers: corsHeaders });
  }
}
