CREATE TABLE IF NOT EXISTS battery_lifecycle_decisions (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_i TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    disposition TEXT NOT NULL CHECK (disposition IN ('warranty', 'repurpose', 'recycle')),
    returned_units REAL NOT NULL DEFAULT 0,
    warranty_reserve REAL NOT NULL DEFAULT 0,
    cost REAL NOT NULL DEFAULT 0,
    revenue REAL NOT NULL DEFAULT 0,
    esg_impact REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (universe_id, team_i, quarter),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_battery_lifecycle_lookup ON battery_lifecycle_decisions(universe_id, team_i, quarter);