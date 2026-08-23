-- Paid quarterly Fast Test judgments.
CREATE TABLE IF NOT EXISTS fast_test_results (
    result_id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    region TEXT NOT NULL,
    result_type TEXT NOT NULL CHECK (result_type IN ('brand', 'ad', 'reliability')),
    subject_id TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    segment_id TEXT NOT NULL,
    segment_name TEXT NOT NULL,
    brand_judgment REAL,
    price_judgment REAL,
    ad_judgment REAL,
    reliability_judgment REAL,
    purchase_cost REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (team_id, quarter, region, result_type, subject_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_fast_test_results_lookup ON fast_test_results(team_id, quarter, region);