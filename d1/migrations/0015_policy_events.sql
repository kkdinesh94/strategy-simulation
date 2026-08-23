CREATE TABLE IF NOT EXISTS policy_events (
    event_id TEXT PRIMARY KEY,
    quarter INTEGER NOT NULL,
    region TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    demand_impact_pct REAL NOT NULL DEFAULT 0,
    cost_impact_pct REAL NOT NULL DEFAULT 0,
    eligible_segment TEXT,
    eligibility_condition TEXT
);

CREATE INDEX IF NOT EXISTS idx_policy_events_quarter_region ON policy_events(quarter, region);

INSERT OR IGNORE INTO policy_events (event_id, quarter, region, event_type, description, demand_impact_pct, cost_impact_pct, eligible_segment, eligibility_condition) VALUES
('policy:q2:north:subsidy', 2, 'Metro North (Delhi-NCR)', 'Subsidy', 'State subsidy makes long-range urban scooters more attractive to commuters.', 0.15, 0, 'S2', 'battery_range >= 75km'),
('policy:q3:west:tax-credit', 3, 'Metro West (Mumbai/Pune)', 'Tax Credit', 'A purchase tax credit rewards efficient scooters for eco-conscious buyers.', 0.12, -0.05, 'S3', 'battery_range >= 65km'),
('policy:q4:south:grant', 4, 'Metro South (Bengaluru/Chennai)', 'Charging Infrastructure Grant', 'New public chargers reduce range anxiety for connected, fast-charging vehicles.', 0.18, -0.03, 'S1', 'charging_score >= 7'),
('policy:q5:global:regulation', 5, 'Global', 'Emissions Regulation', 'Tighter emissions rules shift demand toward efficient electric vehicles.', 0.10, -0.08, NULL, 'battery_range >= 65km'),
('policy:q6:global:tariff', 6, 'Global', 'Import Tariff', 'An import tariff raises production costs for vehicles using imported components.', 0, 0.10, NULL, NULL);