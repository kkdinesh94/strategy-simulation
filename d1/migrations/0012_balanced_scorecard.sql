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
    UNIQUE (universe_id, team_i, quarter),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_balanced_scorecard_lookup ON balanced_scorecard(universe_id, quarter, team_i);