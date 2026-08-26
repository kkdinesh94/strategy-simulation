CREATE TABLE IF NOT EXISTS visibility_settings (
  id TEXT PRIMARY KEY,                          -- format: "{game_id}"
  game_id TEXT NOT NULL UNIQUE,
  reveal_brand_specs INTEGER NOT NULL DEFAULT 0,
  reveal_sales_data INTEGER NOT NULL DEFAULT 0,
  reveal_financials INTEGER NOT NULL DEFAULT 0,
  reveal_rd_projects INTEGER NOT NULL DEFAULT 0,
  competitive_benchmark_purchasable INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visibility_settings_game ON visibility_settings(game_id);
