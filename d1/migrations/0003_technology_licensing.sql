-- Technology licensing offers and team-scoped component access.
CREATE TABLE IF NOT EXISTS rd_project_completions (
    game_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    completed_quarter INTEGER NOT NULL,
    PRIMARY KEY (game_id, team_id, project_id)
);

CREATE TABLE IF NOT EXISTS rd_license_offers (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    seller_team_id TEXT NOT NULL,
    buyer_team_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    license_fee REAL NOT NULL CHECK (license_fee >= 1),
    special_terms TEXT NOT NULL DEFAULT '',
    offered_quarter INTEGER NOT NULL,
    execute_quarter INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'rejected', 'executed')),
    accepted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rd_license_game_buyer ON rd_license_offers(game_id, buyer_team_id, status);
CREATE INDEX IF NOT EXISTS idx_rd_license_game_seller ON rd_license_offers(game_id, seller_team_id, status);

CREATE TABLE IF NOT EXISTS team_component_access (
    game_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    component_id TEXT NOT NULL,
    source_license_id TEXT,
    unlocked_quarter INTEGER NOT NULL,
    PRIMARY KEY (game_id, team_id, component_id)
);