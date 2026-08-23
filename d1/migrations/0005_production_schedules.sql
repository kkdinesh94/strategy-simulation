CREATE TABLE IF NOT EXISTS production_schedules (
    schedule_id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_i INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    inputs_json TEXT NOT NULL,
    outputs_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (universe_id, team_i, quarter)
);

CREATE INDEX IF NOT EXISTS idx_production_schedules_lookup
    ON production_schedules(universe_id, team_i, quarter);