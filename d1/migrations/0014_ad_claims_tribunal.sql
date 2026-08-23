ALTER TABLE ad_violations ADD COLUMN plaintiff_team_id TEXT;
ALTER TABLE ad_violations ADD COLUMN defendant_response TEXT NOT NULL DEFAULT '';
ALTER TABLE ad_violations ADD COLUMN ruling TEXT;
ALTER TABLE ad_violations ADD COLUMN ruled_at TEXT;
ALTER TABLE ad_violations ADD COLUMN ruling_document TEXT;

CREATE TABLE IF NOT EXISTS ad_claim_bans (
    ban_id TEXT PRIMARY KEY,
    violation_id TEXT NOT NULL UNIQUE,
    universe_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    claim TEXT NOT NULL,
    offense_number INTEGER NOT NULL,
    ban_start_quarter INTEGER NOT NULL,
    ban_until_quarter INTEGER NOT NULL,
    fine_pct REAL NOT NULL DEFAULT 0,
    fine_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ad_claim_bans_team_claim ON ad_claim_bans(universe_id, team_id, claim, ban_until_quarter);