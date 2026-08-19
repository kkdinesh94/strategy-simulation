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

-- 5. Application Configuration & Settings
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
