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

-- 7. Application Configuration & Settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed initial default configuration
INSERT OR IGNORE INTO app_settings (key, value) VALUES
('active_provider', 'cloudflare_d1'),
('d1_schema_version', '1.0.0'),
('app_title', 'EV Venture League Simulation');
