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

-- 6. Application Configuration & Settings
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
