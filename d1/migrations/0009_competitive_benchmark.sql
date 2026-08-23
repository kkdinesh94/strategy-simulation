CREATE TABLE IF NOT EXISTS competitive_benchmark_purchases (
  purchase_id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  quarter INTEGER NOT NULL,
  region TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('region', 'global')),
  cost REAL NOT NULL,
  report_json TEXT NOT NULL,
  purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (universe_id, team_id, quarter, region, scope)
);

CREATE INDEX IF NOT EXISTS idx_competitive_benchmark_lookup
  ON competitive_benchmark_purchases (universe_id, team_id, quarter, region, scope);
