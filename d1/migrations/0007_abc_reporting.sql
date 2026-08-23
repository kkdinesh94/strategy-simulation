-- Migration: 0007_abc_reporting.sql
-- Relational inputs for contribution analysis by brand and region.

CREATE TABLE IF NOT EXISTS brands (
    brand_id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    unit_production_cost REAL NOT NULL DEFAULT 0,
    brand_priority_weight REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_brands_team ON brands(universe_id, team_id);

CREATE TABLE IF NOT EXISTS sales_results (
    result_id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    region TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    units_sold REAL NOT NULL DEFAULT 0,
    price REAL,
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_results_lookup ON sales_results(universe_id, team_id, quarter);

CREATE TABLE IF NOT EXISTS advertising_placements (
    placement_id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    brand_ad_spend REAL NOT NULL DEFAULT 0,
    total_ad_budget REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
);

CREATE INDEX IF NOT EXISTS idx_advertising_placements_lookup ON advertising_placements(universe_id, team_id, quarter);

CREATE TABLE IF NOT EXISTS sales_force (
    record_id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    office_id TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    total_salespeople INTEGER NOT NULL DEFAULT 0,
    salary_base REAL NOT NULL DEFAULT 0,
    health_benefits REAL NOT NULL DEFAULT 0,
    performance_bonus REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sales_force_abc_lookup ON sales_force(team_id, quarter, office_id);

CREATE TABLE IF NOT EXISTS sales_offices (
    office_id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    quarterly_lease REAL NOT NULL DEFAULT 0,
    sales_force_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sales_offices_abc_lookup ON sales_offices(team_id, region);
