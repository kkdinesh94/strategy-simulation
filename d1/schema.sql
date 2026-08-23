-- ==========================================================
-- EV Venture League - Cloudflare D1 SQLite Database Schema
-- Compatible with Cloudflare D1, Wrangler, and SQLite 3
-- ==========================================================

-- 1. Universes Table (Stores Simulation Universes & Complete Simulation GameStates)
CREATE TABLE IF NOT EXISTS universes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    instructor_email TEXT NOT NULL,
    max_teams INTEGER NOT NULL DEFAULT 10,
    max_members_per_team INTEGER NOT NULL DEFAULT 8,
    game_state TEXT NOT NULL, -- JSON stringified GameState (teams, markets, history, R&D catalog, pro-forma)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_universes_code ON universes(code);
CREATE INDEX IF NOT EXISTS idx_universes_instructor ON universes(instructor_email);

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

-- 2. Users Table (Stores Roster, Role-Based Access Control, and Telemetry)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'instructor', 'player')),
    institution TEXT DEFAULT '',
    universe_id TEXT NOT NULL,
    team_i INTEGER NOT NULL DEFAULT -1,
    password TEXT NOT NULL,
    last_active_at TEXT,
    active_minutes INTEGER NOT NULL DEFAULT 0,
    is_online INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_universe ON users(universe_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(universe_id, team_i);

-- 3. Team Decisions & Submissions Table (Historical Decision Archives)
CREATE TABLE IF NOT EXISTS team_decisions (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_i INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    decision_json TEXT NOT NULL,
    redesign_fee REAL NOT NULL DEFAULT 0,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    submitted_by TEXT NOT NULL,
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_decisions_lookup ON team_decisions(universe_id, team_i, quarter);

CREATE TABLE IF NOT EXISTS strategy_plans (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_i INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    plan_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (universe_id, team_i, quarter),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_strategy_plans_lookup ON strategy_plans(universe_id, team_i, quarter);

CREATE TABLE IF NOT EXISTS swot_records (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_i INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    swot_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (universe_id, team_i, quarter),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_swot_records_lookup ON swot_records(universe_id, team_i, quarter);

CREATE TABLE IF NOT EXISTS balanced_scorecard (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_i TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    overall_score REAL NOT NULL,
    dimensions_json TEXT NOT NULL,
    raw_metrics_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (universe_id, team_i, quarter),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_balanced_scorecard_lookup ON balanced_scorecard(universe_id, quarter, team_i);

CREATE TABLE IF NOT EXISTS pro_forma_statements (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_i INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    statement_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (universe_id, team_i, quarter),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pro_forma_lookup ON pro_forma_statements(universe_id, quarter, team_i);

-- 3a. Treasury financing decisions and quarterly financing outcomes
CREATE TABLE IF NOT EXISTS financing_decisions (
    team_id TEXT,
    quarter INTEGER,
    equity_issued REAL,
    bank_loan_drawn REAL,
    bank_loan_repaid REAL,
    cd_investment REAL,         -- 3-month certificate of deposit, earns interest
    vc_funding_received REAL,   -- only available after business plan presentation in Q5
    interest_rate REAL,
    loan_outstanding REAL
);

CREATE INDEX IF NOT EXISTS idx_financing_decisions_team_quarter ON financing_decisions(team_id, quarter);

-- 3a. Regional charging infrastructure investments.
CREATE TABLE IF NOT EXISTS charging_network (
    team_id TEXT NOT NULL,
    region TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    charger_count INTEGER NOT NULL DEFAULT 0,
    charger_type TEXT NOT NULL CHECK (charger_type IN ('Level 2 AC', 'DC Fast Charge', 'Ultra-rapid 350kW')),
    installation_cost REAL NOT NULL DEFAULT 0,
    quarterly_maintenance REAL NOT NULL DEFAULT 0,
    demand_boost_pct REAL NOT NULL DEFAULT 0, -- computed from charger_count x charger_type_weight
    UNIQUE (team_id, region, quarter)
);

CREATE INDEX IF NOT EXISTS idx_charging_network_team_quarter ON charging_network(team_id, quarter);
CREATE INDEX IF NOT EXISTS idx_charging_network_region ON charging_network(region);

-- 3a. Human resources compensation decisions and productivity inputs
CREATE TABLE IF NOT EXISTS hr_decisions (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_i INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    sales_json TEXT NOT NULL,
    production_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (universe_id, team_i, quarter),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hr_decisions_lookup ON hr_decisions(universe_id, quarter, team_i);

-- 3a. Office-level sales force allocations and compensation packages
CREATE TABLE IF NOT EXISTS sales_force (
    record_id TEXT PRIMARY KEY,
    team_id TEXT,
    office_id TEXT,
    quarter INTEGER,
    total_salespeople INTEGER,
    segment_specialist_counts TEXT, -- JSON {"Urban Commuter": 2, "Fleet Manager": 1, ...}
    support_specialists INTEGER,
    salary_base REAL,
    health_benefits REAL,
    performance_bonus REAL,
    productivity_score REAL -- computed from compensation vs. industry benchmark
);

CREATE INDEX IF NOT EXISTS idx_sales_force_team_quarter ON sales_force(team_id, quarter);
CREATE INDEX IF NOT EXISTS idx_sales_force_office ON sales_force(team_id, office_id);

-- 3b. Regional production facility options. Teams select one option in Q1.
CREATE TABLE IF NOT EXISTS production_facilities (
    facility_id TEXT PRIMARY KEY,
    team_id TEXT,
    location TEXT,
    fixed_capacity_per_day INTEGER,
    operating_capacity_per_day INTEGER,
    quarter_built INTEGER,
    build_cost REAL,
    labor_cost_per_unit REAL,
    overhead_cost_per_unit REAL,
    shipping_cost_to_region TEXT -- JSON {"North America": 50, "Europe": 120, ...}
);

CREATE INDEX IF NOT EXISTS idx_production_facilities_team ON production_facilities(team_id);
CREATE INDEX IF NOT EXISTS idx_production_facilities_location ON production_facilities(location);

-- 3c. Demand-pull production scheduler inputs and 65-day projections
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

CREATE INDEX IF NOT EXISTS idx_production_schedules_lookup ON production_schedules(universe_id, team_i, quarter);

-- 3c. Changeover investment decisions and diminishing-return projections
CREATE TABLE IF NOT EXISTS changeover_investments (
    team_id TEXT,
    quarter INTEGER,
    amount_invested REAL,
    changeover_hours_saved REAL, -- formula: diminishing returns curve
    new_changeover_time REAL -- hours per brand switch on production line
);

CREATE INDEX IF NOT EXISTS idx_changeover_investments_team_quarter ON changeover_investments(team_id, quarter);

-- 3d. Component-level quality improvement decisions
CREATE TABLE IF NOT EXISTS quality_components (
    qc_id TEXT PRIMARY KEY,
    team_id TEXT,
    component_category TEXT,
    inspection_active INTEGER DEFAULT 0,
    variance_study_done INTEGER DEFAULT 0,
    source_action_study_done INTEGER DEFAULT 0,
    improvement_invested REAL DEFAULT 0,
    warranty_cost_per_quarter REAL,
    defect_cost_per_quarter REAL,
    inspection_cost REAL,
    reliability_improvement REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quality_components_team ON quality_components(team_id);

INSERT OR IGNORE INTO production_facilities (
    facility_id, team_id, location, fixed_capacity_per_day,
    operating_capacity_per_day, quarter_built, build_cost,
    labor_cost_per_unit, overhead_cost_per_unit, shipping_cost_to_region
) VALUES
('facility_north_america', NULL, 'North America', 500, 450, 1, 2500000, 42.0, 18.0, '{"North America": 50, "Europe": 120, "Asia-Pacific": 150}'),
('facility_europe', NULL, 'Europe', 500, 450, 1, 2700000, 48.0, 30.0, '{"North America": 120, "Europe": 45, "Asia-Pacific": 135}'),
('facility_asia_pacific', NULL, 'Asia-Pacific', 500, 450, 1, 2200000, 28.0, 22.0, '{"North America": 150, "Europe": 135, "Asia-Pacific": 40}');

-- 4. Audit & Telemetry Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_universe ON audit_logs(universe_id, created_at DESC);

-- 5. Market Segments
CREATE TABLE IF NOT EXISTS market_segments (
    segment_id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    price_sensitivity INTEGER,
    range_priority INTEGER,
    charging_speed_priority INTEGER,
    autonomy_priority INTEGER,
    brand_image_priority INTEGER,
    typical_buyer_persona TEXT,
    segment_size_pct REAL
);

-- Seed initial EV market segments
INSERT OR IGNORE INTO market_segments (
    segment_id,
    name,
    description,
    price_sensitivity,
    range_priority,
    charging_speed_priority,
    autonomy_priority,
    brand_image_priority,
    typical_buyer_persona,
    segment_size_pct
) VALUES
('urban_commuter', 'Urban Commuter', 'Cost-conscious city drivers seeking practical, affordable EV transportation.', 10, 4, 5, 3, 4, 'Daily city commuter with a short, predictable route and a strong focus on purchase price.', 30.0),
('fleet_operator', 'Fleet Operator', 'Commercial operators prioritising uptime, durability, operating cost, and dependable charging.', 8, 7, 9, 5, 3, 'Fleet manager balancing total cost of ownership, reliability, and vehicle utilisation.', 25.0),
('performance_enthusiast', 'Performance Enthusiast', 'Driving-focused buyers willing to pay for acceleration, handling, and premium specifications.', 3, 7, 6, 5, 9, 'Performance buyer who expects top specifications and a distinctive premium brand.', 15.0),
('tech_pioneer', 'Tech Pioneer', 'Early adopters attracted to advanced technology, long range, and sophisticated autonomy features.', 4, 9, 7, 10, 8, 'Technology enthusiast eager to own the newest connected and autonomous EV capabilities.', 15.0),
('eco_advocate', 'Eco Advocate', 'Sustainability-led buyers who value environmental impact and responsible brand values above price.', 2, 8, 5, 6, 7, 'Environmentally conscious buyer prepared to pay more for a genuinely sustainable vehicle.', 15.0);

-- 5a. Advertising Campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
    campaign_id TEXT PRIMARY KEY,
    universe_id TEXT,
    team_id TEXT,
    quarter INTEGER,
    segment_target TEXT,
    brand_mentioned TEXT,
    benefit_1 TEXT,
    benefit_2 TEXT,
    benefit_3 TEXT,
    benefit_4 TEXT,
    benefit_5 TEXT,
    ad_judgment INTEGER CHECK (ad_judgment IS NULL OR ad_judgment BETWEEN 1 AND 100),
    FOREIGN KEY (segment_target) REFERENCES market_segments(segment_id),
    FOREIGN KEY (brand_mentioned) REFERENCES brands(brand_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_team_quarter ON ad_campaigns(team_id, quarter);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_segment ON ad_campaigns(segment_target);

-- 5aa. Paid quarterly Fast Test judgments.
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

-- 5b. Media placement plan for each advertising campaign
CREATE TABLE IF NOT EXISTS media_placements (
        placement_id TEXT PRIMARY KEY,
        campaign_id TEXT,
        media_type TEXT,
        region TEXT,
        cost_per_insertion REAL,
        insertions INTEGER,
        total_cost REAL GENERATED ALWAYS AS
            (cost_per_insertion * POWER(insertions, 0.90)) STORED,
        FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_placements_campaign ON media_placements(campaign_id);

-- 6. Vehicle Components & R&D Unlocks
CREATE TABLE IF NOT EXISTS vehicle_components (
    component_id TEXT PRIMARY KEY,
    category TEXT,
    name TEXT,
    material_cost REAL,
    performance_score INTEGER,
    benefit_delivered TEXT,
    is_rd_unlocked INTEGER DEFAULT 0,
    available_from_quarter INTEGER DEFAULT 1
);

-- Seed component choices; premium options require category R&D investment.
INSERT OR IGNORE INTO vehicle_components (
    component_id,
    category,
    name,
    material_cost,
    performance_score,
    benefit_delivered,
    is_rd_unlocked,
    available_from_quarter
) VALUES
('battery_standard_60kwh', 'Battery', 'Battery: Standard 60 kWh', 7200.0, 5, 'Balanced range and purchase affordability.', 0, 1),
('battery_fast_charge_75kwh', 'Battery', 'Battery: Fast-charge 75 kWh', 9400.0, 7, 'Longer range with shorter charging stops.', 0, 2),
('battery_long_range_100kwh', 'Battery', 'Battery: Long-range 100 kWh', 13200.0, 10, 'Maximum driving range and reduced range anxiety.', 1, 4),
('motor_standard_150kw', 'Motor', 'Motor: Standard 150 kW', 4100.0, 5, 'Reliable everyday performance at a competitive cost.', 0, 1),
('motor_performance_220kw', 'Motor', 'Motor: Performance 220 kW', 6100.0, 8, 'Faster acceleration and a more engaging drive.', 0, 2),
('motor_dual_awd_300kw', 'Motor', 'Motor: Dual AWD 300 kW', 8900.0, 10, 'Maximum traction, acceleration, and performance.', 1, 4),
('charging_ac_11kw', 'Charging', 'Charging: AC 11 kW', 850.0, 5, 'Convenient overnight home charging.', 0, 1),
('charging_dc_150kw', 'Charging', 'Charging: DC 150 kW', 1550.0, 7, 'Faster public charging and improved trip convenience.', 0, 2),
('charging_ultra_250kw', 'Charging', 'Charging: Ultra-fast 250 kW', 2700.0, 10, 'Industry-leading charging speed and minimal downtime.', 1, 4),
('autonomy_driver_assist', 'Autonomy', 'Autonomy: Driver Assist', 1100.0, 5, 'Reduced driver workload in routine traffic.', 0, 1),
('autonomy_highway_pilot', 'Autonomy', 'Autonomy: Highway Pilot', 2300.0, 7, 'More relaxed and confident highway journeys.', 0, 2),
('autonomy_city_navigate', 'Autonomy', 'Autonomy: City Navigate', 4200.0, 10, 'Advanced assistance for complex urban environments.', 1, 4),
('interior_comfort_cloth', 'Interior', 'Interior: Comfort Cloth', 900.0, 5, 'Durable, comfortable seating at an accessible price.', 0, 1),
('interior_premium_vegan', 'Interior', 'Interior: Premium Vegan', 1750.0, 7, 'Premium feel with sustainable, easy-clean materials.', 0, 2),
('interior_lounge_cabin', 'Interior', 'Interior: Lounge Cabin', 3200.0, 10, 'First-class comfort and a spacious passenger experience.', 1, 4),
('software_connected_basic', 'Software', 'Software: Connected Essentials', 180.0, 5, 'Simple connectivity and dependable vehicle updates.', 0, 1),
('software_personalized_ui', 'Software', 'Software: Personalized UI', 420.0, 7, 'A more intuitive and engaging digital experience.', 0, 2),
('software_predictive_ai', 'Software', 'Software: Predictive AI', 950.0, 10, 'Proactive recommendations and smarter vehicle operation.', 1, 4),
('exterior_aero_standard', 'Exterior', 'Exterior: Standard Aero', 1600.0, 5, 'Efficient, practical styling with low production cost.', 0, 1),
('exterior_premium_lighting', 'Exterior', 'Exterior: Premium Lighting', 2450.0, 7, 'Distinctive presence and improved night-time visibility.', 0, 2),
('exterior_adaptive_aero', 'Exterior', 'Exterior: Adaptive Aero', 3900.0, 10, 'Improved efficiency through shape-changing aerodynamics.', 1, 4),
('safety_standard_suite', 'Safety', 'Safety: Standard Suite', 1250.0, 5, 'Core occupant protection and collision prevention.', 0, 1),
('safety_enhanced_sensors', 'Safety', 'Safety: Enhanced Sensors', 2150.0, 7, 'Earlier hazard detection and stronger active protection.', 0, 2),
('safety_predictive_protection', 'Safety', 'Safety: Predictive Protection', 3600.0, 10, 'Anticipatory protection using advanced sensing systems.', 1, 4);

-- 7. R&D Projects
CREATE TABLE IF NOT EXISTS rd_projects (
    project_id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    component_unlocked TEXT,
    cost_one_quarter REAL,
    cost_two_quarters REAL,
    quarters_to_complete INTEGER,
    benefit_segments TEXT,
    FOREIGN KEY (component_unlocked) REFERENCES vehicle_components(component_id)
);

CREATE INDEX IF NOT EXISTS idx_rd_projects_component ON rd_projects(component_unlocked);

-- 7a. Technology licensing and team-scoped access
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

-- 8. Application Configuration & Settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed initial default configuration
INSERT OR IGNORE INTO app_settings (key, value) VALUES
('active_provider', 'cloudflare_d1'),
('d1_schema_version', '1.0.0'),
('app_title', 'EV Venture League Simulation'),
('web_sales_center_config', '{"monthlyCosts":{"base":2.5,"onlineConfigurator":1.5,"orderTracking":1.0,"secureCheckout":2.0,"tollFreeSupport":3.0,"perStaff":0.75},"demand":{"perStaff":0.015,"featureBoosts":{"onlineConfigurator":0.04,"orderTracking":0.03,"secureCheckout":0.02,"tollFreeSupport":0.025}}');

-- 8a. Team web sales center and digital capability decisions
CREATE TABLE IF NOT EXISTS web_sales_center (
    wsc_id TEXT PRIMARY KEY,
    team_id TEXT,
    quarter INTEGER,
    is_active INTEGER DEFAULT 0,
    online_configurator INTEGER DEFAULT 0,
    order_tracking INTEGER DEFAULT 0,
    secure_checkout INTEGER DEFAULT 0,
    toll_free_support INTEGER DEFAULT 0,
    staff_count INTEGER,
    monthly_cost REAL
);

CREATE INDEX IF NOT EXISTS idx_web_sales_center_team_quarter ON web_sales_center(team_id, quarter);

-- 9. Global Sales Offices & Market Territories
CREATE TABLE IF NOT EXISTS sales_offices (
    office_id TEXT PRIMARY KEY,
    team_id TEXT,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    quarter_opened INTEGER,
    setup_cost REAL NOT NULL,
    quarterly_lease REAL NOT NULL,
    sales_force_count INTEGER NOT NULL DEFAULT 0,
    web_channel_enabled INTEGER NOT NULL DEFAULT 0,
    segment_composition TEXT NOT NULL,
    market_size INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_offices_region ON sales_offices(region);
CREATE INDEX IF NOT EXISTS idx_sales_offices_team ON sales_offices(team_id);

INSERT OR IGNORE INTO sales_offices (
    office_id, team_id, city, region, quarter_opened, setup_cost,
    quarterly_lease, sales_force_count, web_channel_enabled,
    segment_composition, market_size
) VALUES
('apac-shanghai', '0', 'Shanghai', 'Asia-Pacific', 1, 52.0, 9.5, 18, 1, '{"urban_commuter":38,"fleet_operator":24,"tech_pioneer":16,"eco_advocate":12,"performance_enthusiast":10}', 420000),
('apac-tokyo', NULL, 'Tokyo', 'Asia-Pacific', NULL, 58.0, 11.0, 0, 0, '{"urban_commuter":30,"fleet_operator":20,"tech_pioneer":24,"eco_advocate":14,"performance_enthusiast":12}', 360000),
('apac-seoul', '2', 'Seoul', 'Asia-Pacific', 1, 48.0, 8.5, 16, 1, '{"urban_commuter":32,"fleet_operator":18,"tech_pioneer":25,"eco_advocate":13,"performance_enthusiast":12}', 280000),
('apac-singapore', NULL, 'Singapore', 'Asia-Pacific', NULL, 45.0, 10.5, 0, 0, '{"urban_commuter":26,"fleet_operator":28,"tech_pioneer":18,"eco_advocate":16,"performance_enthusiast":12}', 90000),
('apac-sydney', NULL, 'Sydney', 'Asia-Pacific', NULL, 44.0, 8.0, 0, 0, '{"urban_commuter":28,"fleet_operator":18,"tech_pioneer":18,"eco_advocate":22,"performance_enthusiast":14}', 145000),
('na-san-francisco', NULL, 'San Francisco', 'North America', NULL, 62.0, 12.0, 0, 0, '{"urban_commuter":20,"fleet_operator":14,"tech_pioneer":28,"eco_advocate":20,"performance_enthusiast":18}', 180000),
('na-los-angeles', '0', 'Los Angeles', 'North America', 2, 60.0, 11.5, 20, 1, '{"urban_commuter":24,"fleet_operator":18,"tech_pioneer":20,"eco_advocate":18,"performance_enthusiast":20}', 310000),
('na-austin', NULL, 'Austin', 'North America', NULL, 42.0, 7.5, 0, 0, '{"urban_commuter":26,"fleet_operator":20,"tech_pioneer":22,"eco_advocate":18,"performance_enthusiast":14}', 120000),
('na-new-york', NULL, 'New York', 'North America', NULL, 68.0, 14.0, 0, 0, '{"urban_commuter":34,"fleet_operator":16,"tech_pioneer":18,"eco_advocate":16,"performance_enthusiast":16}', 440000),
('na-toronto', '2', 'Toronto', 'North America', 1, 50.0, 9.0, 15, 1, '{"urban_commuter":30,"fleet_operator":18,"tech_pioneer":18,"eco_advocate":22,"performance_enthusiast":12}', 190000),
('eu-amsterdam', NULL, 'Amsterdam', 'Europe', NULL, 48.0, 9.0, 0, 0, '{"urban_commuter":28,"fleet_operator":18,"tech_pioneer":18,"eco_advocate":25,"performance_enthusiast":11}', 110000),
('eu-oslo', '0', 'Oslo', 'Europe', 2, 46.0, 8.0, 14, 1, '{"urban_commuter":24,"fleet_operator":16,"tech_pioneer":18,"eco_advocate":30,"performance_enthusiast":12}', 70000),
('eu-munich', NULL, 'Munich', 'Europe', NULL, 52.0, 9.5, 0, 0, '{"urban_commuter":24,"fleet_operator":24,"tech_pioneer":16,"eco_advocate":20,"performance_enthusiast":16}', 170000),
('eu-london', NULL, 'London', 'Europe', NULL, 70.0, 15.0, 0, 0, '{"urban_commuter":32,"fleet_operator":18,"tech_pioneer":18,"eco_advocate":18,"performance_enthusiast":14}', 390000),
('eu-paris', '2', 'Paris', 'Europe', 1, 64.0, 12.5, 17, 1, '{"urban_commuter":30,"fleet_operator":16,"tech_pioneer":16,"eco_advocate":24,"performance_enthusiast":16}', 280000),
('em-mumbai', '0', 'Mumbai', 'Emerging Markets', 1, 38.0, 5.5, 22, 1, '{"urban_commuter":44,"fleet_operator":26,"tech_pioneer":10,"eco_advocate":10,"performance_enthusiast":10}', 520000),
('em-dubai', NULL, 'Dubai', 'Emerging Markets', NULL, 50.0, 8.5, 0, 0, '{"urban_commuter":18,"fleet_operator":24,"tech_pioneer":20,"eco_advocate":14,"performance_enthusiast":24}', 130000),
('em-sao-paulo', NULL, 'São Paulo', 'Emerging Markets', NULL, 40.0, 6.0, 0, 0, '{"urban_commuter":40,"fleet_operator":25,"tech_pioneer":12,"eco_advocate":13,"performance_enthusiast":10}', 460000),
('em-nairobi', NULL, 'Nairobi', 'Emerging Markets', NULL, 30.0, 3.5, 0, 0, '{"urban_commuter":42,"fleet_operator":28,"tech_pioneer":8,"eco_advocate":14,"performance_enthusiast":8}', 85000),
('em-jakarta', '2', 'Jakarta', 'Emerging Markets', 2, 36.0, 5.0, 16, 1, '{"urban_commuter":45,"fleet_operator":24,"tech_pioneer":12,"eco_advocate":11,"performance_enthusiast":8}', 390000);

-- 10. ABC reporting inputs
CREATE TABLE IF NOT EXISTS brands (
    brand_id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    unit_production_cost REAL NOT NULL DEFAULT 0,
    brand_priority_weight REAL NOT NULL DEFAULT 0
);

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
