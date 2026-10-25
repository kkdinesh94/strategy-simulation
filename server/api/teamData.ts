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
    // Optional tables (fast_test_results, market_survey_purchases...) may not exist in a fresh database.
    return [];
  }
}

/**
 * Tables without a universe_id column (fast_test_results, charging_network, decision_audit_log)
 * key their team column as "<universeId>:<team>".
 */
export const scopedTeam = (c: Pick<TeamDataContext, "universeId" | "teamId">) => `${c.universeId}:${c.teamId}`;

const CHECKLIST: Record<string, (c: TeamDataContext) => [string, unknown[]]> = {
  strategy: (c) => ["SELECT 1 AS present FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [c.universeId, c.teamId, c.quarter]],
  schedule: (c) => ["SELECT 1 AS present FROM production_schedules WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [c.universeId, c.teamId, c.quarter]],
  fastTests: (c) => ["SELECT 1 AS present FROM fast_test_results WHERE team_id = ? AND quarter = ? LIMIT 1", [scopedTeam(c), c.quarter]],
  benchmark: (c) => ["SELECT 1 AS present FROM competitive_benchmark_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? LIMIT 1", [c.universeId, String(c.teamId), c.quarter]],
  scorecard: (c) => ["SELECT 1 AS present FROM balanced_scorecard WHERE universe_id = ? AND team_i = ? AND quarter = ? LIMIT 1", [c.universeId, String(c.teamId), c.quarter]],
  marketSurvey: (c) => ["SELECT 1 AS present FROM market_survey_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? LIMIT 1", [c.universeId, String(c.teamId), c.quarter]],
  marketSurveyAny: (c) => ["SELECT 1 AS present FROM market_survey_purchases WHERE universe_id = ? AND team_id = ? AND quarter <= ? LIMIT 1", [c.universeId, String(c.teamId), c.quarter]]
};

export async function runTeamDataQuery(db: any, key: string, c: TeamDataContext): Promise<{ success: boolean; results?: any[]; error?: string; status?: number }> {
  if (key.startsWith("checklist:")) {
    const query = CHECKLIST[key.slice("checklist:".length)];
    if (!query) return { success: false, error: "Unknown checklist item.", status: 400 };
    const [sql, params] = query(c);
    return { success: true, results: await rows(db, sql, ...params) };
  }

  if (key === "market-segments") {
    return { success: true, results: await rows(db, "SELECT * FROM market_segments ORDER BY segment_id") };
  }

  return { success: false, error: "Unknown data request.", status: 400 };
}
