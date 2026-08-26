-- Market Opportunity Analysis (MOA) survey results, purchasable per-precision by teams.
CREATE TABLE IF NOT EXISTS market_survey_results (
  survey_id    TEXT PRIMARY KEY,   -- "{universe_id}:{quarter}:{precision}:{segment_id}"
  universe_id  TEXT NOT NULL,
  quarter      INTEGER NOT NULL,
  precision_level TEXT NOT NULL DEFAULT 'low'
                   CHECK (precision_level IN ('low','medium','high')),
  purchase_cost REAL NOT NULL DEFAULT 0,
  segment_id   TEXT NOT NULL,
  benefit_range_importance     REAL,
  benefit_charging_importance  REAL,
  benefit_price_importance     REAL,
  benefit_autonomy_importance  REAL,
  benefit_design_importance    REAL,
  benefit_reliability_importance REAL,
  media_social_pref            REAL,
  media_auto_press_pref        REAL,
  media_business_press_pref    REAL,
  media_ev_forums_pref         REAL,
  media_youtube_pref           REAL,
  wtp_min      REAL,
  wtp_expected REAL,
  wtp_max      REAL,
  segment_size_units INTEGER,
  error_margin REAL,             -- 0.15 / 0.08 / 0.04 for low/medium/high
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (universe_id, quarter, precision_level, segment_id)
);
CREATE INDEX IF NOT EXISTS idx_market_survey_lookup
  ON market_survey_results(universe_id, quarter, precision_level);

CREATE TABLE IF NOT EXISTS market_survey_purchases (
  id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  quarter INTEGER NOT NULL,
  precision_level TEXT NOT NULL CHECK (precision_level IN ('low','medium','high')),
  cost REAL NOT NULL DEFAULT 0,
  purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (universe_id, team_id, quarter, precision_level)
);
CREATE INDEX IF NOT EXISTS idx_market_survey_purchases_lookup
  ON market_survey_purchases(universe_id, team_id, quarter);

-- Seed: univ_nitw_2026, quarter 1, all five segments, all three precision tiers.
-- Medium/low tiers apply seeded ±error_margin noise around the high-precision baseline.
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:high:urban_commuter', 'univ_nitw_2026', 1, 'high', 30, 'urban_commuter', 110, 115, 130, 70, 85, 120, 105, 80, 70, 115, 120, 800000, 1100000, 1400000, 5200, 0.04);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:high:fleet_operator', 'univ_nitw_2026', 1, 'high', 30, 'fleet_operator', 120, 130, 125, 80, 60, 140, 80, 90, 125, 100, 70, 900000, 1300000, 1700000, 3800, 0.04);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:high:performance_enthusiast', 'univ_nitw_2026', 1, 'high', 30, 'performance_enthusiast', 95, 90, 60, 85, 130, 100, 120, 130, 80, 110, 125, 1500000, 2200000, 3000000, 2100, 0.04);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:high:tech_pioneer', 'univ_nitw_2026', 1, 'high', 30, 'tech_pioneer', 130, 95, 70, 145, 110, 90, 130, 100, 90, 140, 135, 1200000, 1800000, 2500000, 1900, 0.04);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:high:eco_advocate', 'univ_nitw_2026', 1, 'high', 30, 'eco_advocate', 110, 80, 90, 85, 100, 115, 115, 95, 105, 120, 100, 1000000, 1500000, 2000000, 2000, 0.04);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:medium:urban_commuter', 'univ_nitw_2026', 1, 'medium', 15, 'urban_commuter', 104, 109, 136, 72, 84, 118, 105, 81, 70, 116, 123, 760409, 1092103, 1376510, 4952, 0.08);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:medium:fleet_operator', 'univ_nitw_2026', 1, 'medium', 15, 'fleet_operator', 126, 131, 134, 82, 56, 133, 76, 89, 121, 99, 73, 932637, 1235740, 1597303, 3906, 0.08);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:medium:performance_enthusiast', 'univ_nitw_2026', 1, 'medium', 15, 'performance_enthusiast', 90, 94, 57, 89, 120, 101, 119, 128, 77, 101, 118, 1440612, 2138534, 3033485, 2030, 0.08);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:medium:tech_pioneer', 'univ_nitw_2026', 1, 'medium', 15, 'tech_pioneer', 131, 94, 70, 153, 118, 93, 121, 95, 87, 132, 127, 1153835, 1750654, 2391557, 1796, 0.08);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:medium:eco_advocate', 'univ_nitw_2026', 1, 'medium', 15, 'eco_advocate', 104, 83, 91, 85, 102, 116, 107, 90, 101, 126, 96, 965159, 1506151, 2033526, 2032, 0.08);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:low:urban_commuter', 'univ_nitw_2026', 1, 'low', 5, 'urban_commuter', 118, 127, 116, 78, 89, 113, 102, 87, 77, 131, 125, 819820, 1095135, 1335285, 4443, 0.15);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:low:fleet_operator', 'univ_nitw_2026', 1, 'low', 5, 'fleet_operator', 116, 135, 140, 76, 62, 127, 72, 90, 137, 113, 61, 773376, 1294428, 1782349, 3853, 0.15);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:low:performance_enthusiast', 'univ_nitw_2026', 1, 'low', 5, 'performance_enthusiast', 100, 86, 64, 84, 126, 105, 106, 139, 69, 98, 122, 1584866, 2267546, 3074899, 1888, 0.15);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:low:tech_pioneer', 'univ_nitw_2026', 1, 'low', 5, 'tech_pioneer', 138, 94, 76, 134, 107, 88, 145, 88, 82, 138, 143, 1341549, 1743503, 2762107, 1822, 0.15);
INSERT OR IGNORE INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES ('univ_nitw_2026:1:low:eco_advocate', 'univ_nitw_2026', 1, 'low', 5, 'eco_advocate', 106, 90, 98, 82, 88, 115, 102, 89, 111, 125, 100, 876751, 1539003, 1888446, 1716, 0.15);
