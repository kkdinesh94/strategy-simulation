/**
 * Named, server-owned queries for gameplay panels. Browsers ask for a query by key and the
 * server binds the caller's own cohort and team, so no client ever sends SQL.
 *
 * Bound-type note: D1 compares parameters by storage type, so TEXT team columns get
 * String(teamId) and INTEGER team columns get Number(teamId).
 */

export interface TeamDataContext {
  universeId: string;
  teamId: number;
  quarter: number;
  payload?: any;
}

async function rows(db: any, sql: string, ...params: unknown[]): Promise<any[]> {
  try {
    const result = await db.prepare(sql).bind(...params).all();
    return result.results || [];
  } catch {
    // Optional tables (sales_force, brands...) may not exist in a fresh database.
    return [];
  }
}

const CHECKLIST: Record<string, (c: TeamDataContext) => [string, unknown[]]> = {
  decisions: (c) => ["SELECT 1 AS present FROM team_decisions WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [c.universeId, c.teamId, c.quarter]],
  strategy: (c) => ["SELECT 1 AS present FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [c.universeId, c.teamId, c.quarter]],
  schedule: (c) => ["SELECT 1 AS present FROM production_schedules WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [c.universeId, c.teamId, c.quarter]],
  fastTests: (c) => ["SELECT 1 AS present FROM fast_test_results WHERE team_id = ? AND quarter = ? LIMIT 1", [String(c.teamId), c.quarter]],
  benchmark: (c) => ["SELECT 1 AS present FROM competitive_benchmark_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? LIMIT 1", [c.universeId, String(c.teamId), c.quarter]],
  sales: (c) => ["SELECT 1 AS present FROM sales_force WHERE team_id = ? AND quarter = ? LIMIT 1", [String(c.teamId), c.quarter]],
  ads: (c) => ["SELECT 1 AS present FROM ad_campaigns WHERE universe_id = ? AND team_id = ? AND quarter = ? LIMIT 1", [c.universeId, String(c.teamId), c.quarter]],
  scorecard: (c) => ["SELECT 1 AS present FROM balanced_scorecard WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [c.universeId, String(c.teamId), c.quarter]],
  marketSurvey: (c) => ["SELECT 1 AS present FROM market_survey_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? LIMIT 1", [c.universeId, String(c.teamId), c.quarter]]
};

const ABC_REPORT_SQL = `
WITH ad_totals AS (
  SELECT COALESCE(SUM(brand_ad_spend), 0) AS total_brand_ad_spend,
         COALESCE(MAX(total_ad_budget), 0) AS total_ad_budget
  FROM advertising_placements
  WHERE universe_id = ? AND team_id = ? AND quarter = ?
),
regional_force AS (
  SELECT so.region,
         SUM(COALESCE(sf.total_salespeople, so.sales_force_count, 0) *
             (COALESCE(sf.salary_base, 0) + COALESCE(sf.health_benefits, 0) + COALESCE(sf.performance_bonus, 0))) AS regional_sales_force_cost,
         SUM(COALESCE(so.quarterly_lease, 0)) AS office_lease,
         SUM(COALESCE(sf.total_salespeople, so.sales_force_count, 0) *
             (COALESCE(sf.salary_base, 0) + COALESCE(sf.health_benefits, 0) + COALESCE(sf.performance_bonus, 0))) AS staff_cost
  FROM sales_offices so
  LEFT JOIN sales_force sf ON sf.office_id = so.office_id
    AND sf.team_id = so.team_id AND sf.quarter = ?
  WHERE so.team_id = ?
  GROUP BY so.region
),
brand_ad_spend AS (
  SELECT brand_id, COALESCE(SUM(brand_ad_spend), 0) AS brand_ad_spend
  FROM advertising_placements
  WHERE universe_id = ? AND team_id = ? AND quarter = ?
  GROUP BY brand_id
),
brand_sales AS (
  SELECT b.brand_id, b.name AS brand_name, sr.region,
         COALESCE(sr.units_sold, 0) AS units_sold,
         COALESCE(sr.price, b.price, 0) AS price,
         COALESCE(b.unit_production_cost, 0) AS unit_production_cost,
         COALESCE(b.brand_priority_weight, 0) AS brand_priority_weight,
         COALESCE(ba.brand_ad_spend, 0) AS brand_ad_spend,
         COALESCE(at.total_brand_ad_spend, 0) AS total_brand_ad_spend,
         COALESCE(at.total_ad_budget, 0) AS total_ad_budget,
         COALESCE(rf.regional_sales_force_cost, 0) AS regional_sales_force_cost,
         COALESCE(rf.office_lease, 0) AS office_lease,
         COALESCE(rf.staff_cost, 0) AS staff_cost
  FROM brands b
  JOIN sales_results sr ON sr.brand_id = b.brand_id
    AND sr.universe_id = ? AND sr.team_id = ? AND sr.quarter = ?
  LEFT JOIN brand_ad_spend ba ON ba.brand_id = b.brand_id
  CROSS JOIN ad_totals at
  LEFT JOIN regional_force rf ON rf.region = sr.region
  WHERE b.team_id = ?
)
SELECT * FROM brand_sales ORDER BY region, brand_name;
`;

const WEB_SALES_COLUMNS = ["is_active", "online_configurator", "order_tracking", "secure_checkout", "toll_free_support", "staff_count", "monthly_cost"] as const;

export async function runTeamDataQuery(db: any, key: string, c: TeamDataContext): Promise<{ success: boolean; results?: any[]; error?: string; status?: number }> {
  if (key.startsWith("checklist:")) {
    const query = CHECKLIST[key.slice("checklist:".length)];
    if (!query) return { success: false, error: "Unknown checklist item.", status: 400 };
    const [sql, params] = query(c);
    return { success: true, results: await rows(db, sql, ...params) };
  }

  if (key === "abc-report") {
    const t = String(c.teamId);
    const q = c.quarter;
    const u = c.universeId;
    return { success: true, results: await rows(db, ABC_REPORT_SQL, u, t, q, q, t, u, t, q, u, t, q, t) };
  }

  if (key === "market-segments") {
    return { success: true, results: await rows(db, "SELECT * FROM market_segments ORDER BY segment_id") };
  }

  // Web sales center rows are keyed per cohort so team numbers in different cohorts never collide.
  const webTeam = `${c.universeId}:${c.teamId}`;
  if (key === "web-sales:get") {
    const [config] = await rows(db, "SELECT value FROM app_settings WHERE key = ?", "web_sales_center_config");
    const [decision] = await rows(db, `SELECT ${WEB_SALES_COLUMNS.join(", ")} FROM web_sales_center WHERE team_id = ? AND quarter = ? LIMIT 1`, webTeam, c.quarter);
    return { success: true, results: [{ config: config?.value ?? null, decision: decision ?? null }] };
  }

  if (key === "web-sales:save") {
    const p = c.payload || {};
    const values = WEB_SALES_COLUMNS.map((col) => Math.max(0, Number(p[col]) || 0));
    try {
      await db.prepare(`INSERT INTO web_sales_center (wsc_id, team_id, quarter, ${WEB_SALES_COLUMNS.join(", ")})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(wsc_id) DO UPDATE SET ${WEB_SALES_COLUMNS.map((col) => `${col} = excluded.${col}`).join(", ")}`)
        .bind(`${webTeam}:${c.quarter}`, webTeam, c.quarter, ...values).run();
      return { success: true, results: [] };
    } catch (err: any) {
      return { success: false, error: err.message || "Could not save the web sales centre.", status: 500 };
    }
  }

  return { success: false, error: "Unknown data request.", status: 400 };
}
