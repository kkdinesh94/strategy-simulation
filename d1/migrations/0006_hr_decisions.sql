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