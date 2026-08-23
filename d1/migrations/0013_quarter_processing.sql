CREATE TABLE IF NOT EXISTS game_state (
    universe_id TEXT PRIMARY KEY,
    quarter INTEGER NOT NULL DEFAULT 1,
    decisions_locked INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS demand_results (
    demand_id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    region TEXT NOT NULL,
    team_i TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    segment_id TEXT NOT NULL,
    base_segment_size REAL NOT NULL,
    brand_judgment_score REAL NOT NULL,
    price_judgment_score REAL NOT NULL,
    advertising_impact_score REAL NOT NULL,
    sales_force_productivity REAL NOT NULL,
    channel_coverage_factor REAL NOT NULL,
    demand_units REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_demand_results_lookup ON demand_results(universe_id, quarter, team_i);