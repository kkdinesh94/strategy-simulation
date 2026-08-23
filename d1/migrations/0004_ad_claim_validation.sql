CREATE TABLE IF NOT EXISTS ad_campaigns (
    campaign_id TEXT PRIMARY KEY,
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

ALTER TABLE ad_campaigns ADD COLUMN universe_id TEXT;

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

CREATE INDEX IF NOT EXISTS idx_ad_violations_universe ON ad_violations(universe_id, quarter DESC);
CREATE INDEX IF NOT EXISTS idx_ad_violations_team_claim ON ad_violations(universe_id, team_id, claim, quarter DESC);