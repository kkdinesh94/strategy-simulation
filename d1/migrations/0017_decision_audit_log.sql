CREATE TABLE IF NOT EXISTS decision_audit_log (
    log_id TEXT PRIMARY KEY,
    team_id TEXT,
    quarter INTEGER,
    decision_area TEXT,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp TEXT
);

CREATE INDEX IF NOT EXISTS idx_decision_audit_team_quarter
    ON decision_audit_log(team_id, quarter, timestamp);