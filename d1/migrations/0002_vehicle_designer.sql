-- Vehicle designer catalog and segment inputs.
ALTER TABLE team_decisions ADD COLUMN redesign_fee REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS market_segments (
    segment_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_sensitivity INTEGER DEFAULT 0,
    range_priority INTEGER DEFAULT 0,
    charging_speed_priority INTEGER DEFAULT 0,
    autonomy_priority INTEGER DEFAULT 0,
    brand_image_priority INTEGER DEFAULT 0,
    typical_buyer_persona TEXT,
    segment_size_pct REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vehicle_components (
    component_id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    material_cost REAL NOT NULL,
    performance_score INTEGER NOT NULL,
    benefit_delivered TEXT,
    is_rd_unlocked INTEGER NOT NULL DEFAULT 0,
    available_from_quarter INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO market_segments (segment_id, name, price_sensitivity, range_priority, charging_speed_priority, autonomy_priority, brand_image_priority, segment_size_pct) VALUES
('urban_commuter', 'Urban Commuter', 10, 4, 5, 3, 4, 30),
('fleet_operator', 'Fleet Operator', 8, 7, 9, 5, 3, 25),
('performance_enthusiast', 'Performance Enthusiast', 3, 7, 6, 5, 9, 15),
('tech_pioneer', 'Tech Pioneer', 4, 9, 7, 10, 8, 15),
('eco_advocate', 'Eco Advocate', 2, 8, 5, 6, 7, 15);

INSERT OR IGNORE INTO vehicle_components (component_id, category, name, material_cost, performance_score, benefit_delivered, is_rd_unlocked, available_from_quarter) VALUES
('battery_standard_60kwh', 'Battery', 'Battery: Standard 60 kWh', 7200, 5, 'Balanced range and purchase affordability.', 0, 1),
('battery_fast_charge_75kwh', 'Battery', 'Battery: Fast-charge 75 kWh', 9400, 7, 'Longer range with shorter charging stops.', 0, 2),
('battery_long_range_100kwh', 'Battery', 'Battery: Long-range 100 kWh', 13200, 10, 'Maximum driving range and reduced range anxiety.', 1, 4),
('motor_standard_150kw', 'Motor', 'Motor: Standard 150 kW', 4100, 5, 'Reliable everyday performance at a competitive cost.', 0, 1),
('motor_performance_220kw', 'Motor', 'Motor: Performance 220 kW', 6100, 8, 'Faster acceleration and a more engaging drive.', 0, 2),
('motor_dual_awd_300kw', 'Motor', 'Motor: Dual AWD 300 kW', 8900, 10, 'Maximum traction, acceleration, and performance.', 1, 4),
('charging_ac_11kw', 'Charging', 'Charging: AC 11 kW', 850, 5, 'Convenient overnight home charging.', 0, 1),
('charging_dc_150kw', 'Charging', 'Charging: DC 150 kW', 1550, 7, 'Faster public charging and improved trip convenience.', 0, 2),
('charging_ultra_250kw', 'Charging', 'Charging: Ultra-fast 250 kW', 2700, 10, 'Industry-leading charging speed and minimal downtime.', 1, 4),
('autonomy_driver_assist', 'Autonomy', 'Autonomy: Driver Assist', 1100, 5, 'Reduced driver workload in routine traffic.', 0, 1),
('autonomy_highway_pilot', 'Autonomy', 'Autonomy: Highway Pilot', 2300, 7, 'More relaxed and confident highway journeys.', 0, 2),
('autonomy_city_navigate', 'Autonomy', 'Autonomy: City Navigate', 4200, 10, 'Advanced assistance for complex urban environments.', 1, 4),
('interior_comfort_cloth', 'Interior', 'Interior: Comfort Cloth', 900, 5, 'Durable, comfortable seating at an accessible price.', 0, 1),
('interior_premium_vegan', 'Interior', 'Interior: Premium Vegan', 1750, 7, 'Premium feel with sustainable, easy-clean materials.', 0, 2),
('interior_lounge_cabin', 'Interior', 'Interior: Lounge Cabin', 3200, 10, 'First-class comfort and a spacious passenger experience.', 1, 4),
('software_connected_basic', 'Software', 'Software: Connected Essentials', 180, 5, 'Simple connectivity and dependable vehicle updates.', 0, 1),
('software_personalized_ui', 'Software', 'Software: Personalized UI', 420, 7, 'A more intuitive and engaging digital experience.', 0, 2),
('software_predictive_ai', 'Software', 'Software: Predictive AI', 950, 10, 'Proactive recommendations and smarter vehicle operation.', 1, 4),
('exterior_aero_standard', 'Exterior', 'Exterior: Standard Aero', 1600, 5, 'Efficient, practical styling with low production cost.', 0, 1),
('exterior_premium_lighting', 'Exterior', 'Exterior: Premium Lighting', 2450, 7, 'Distinctive presence and improved night-time visibility.', 0, 2),
('exterior_adaptive_aero', 'Exterior', 'Exterior: Adaptive Aero', 3900, 10, 'Improved efficiency through shape-changing aerodynamics.', 1, 4),
('safety_standard_suite', 'Safety', 'Safety: Standard Suite', 1250, 5, 'Core occupant protection and collision prevention.', 0, 1),
('safety_enhanced_sensors', 'Safety', 'Safety: Enhanced Sensors', 2150, 7, 'Earlier hazard detection and stronger active protection.', 0, 2),
('safety_predictive_protection', 'Safety', 'Safety: Predictive Protection', 3600, 10, 'Anticipatory protection using advanced sensing systems.', 1, 4);