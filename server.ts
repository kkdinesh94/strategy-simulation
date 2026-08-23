import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { getD1Database } from "./server/d1Store";
import { buildCompetitiveBenchmark, COMPETITIVE_BENCHMARK_REGION_COST } from "./src/lib/competitiveBenchmark";
import { runQuarterWorkflow } from "./src/lib/processQuarter";
import { projectBatteryLifecycle } from "./src/lib/batteryLifecycle";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  const d1 = getD1Database();

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      app: "EV Venture League Simulation",
      dbProvider: "Cloudflare D1 & SQLite 3 Ready"
    });
  });

  app.all("/api/battery-lifecycle", (req, res) => {
    try {
      const input: any = req.method === "GET" ? req.query : req.body || {};
      const universeId = String(input.universeId || input.universe_id || "").trim();
      const teamId = String(input.teamId || input.team_id || "").trim();
      const quarter = Number(input.quarter);
      if (!universeId || !teamId || !Number.isInteger(quarter) || quarter < 1) return res.status(400).json({ error: "universeId, teamId, and a positive integer quarter are required." });
      d1.exec("CREATE TABLE IF NOT EXISTS battery_lifecycle_decisions (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, disposition TEXT NOT NULL CHECK (disposition IN ('warranty', 'repurpose', 'recycle')), returned_units REAL NOT NULL DEFAULT 0, warranty_reserve REAL NOT NULL DEFAULT 0, cost REAL NOT NULL DEFAULT 0, revenue REAL NOT NULL DEFAULT 0, esg_impact REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      const universe: any = d1.prepare("SELECT game_state FROM universes WHERE id = ?").get(universeId);
      if (!universe) return res.status(404).json({ error: "Simulation universe was not found." });
      const state = JSON.parse(universe.game_state || "{}");
      const team = (state.teams || []).find((item: any) => String(item.i) === teamId);
      if (!team) return res.status(404).json({ error: "Team was not found." });
      const projections = Array.from({ length: 8 }, (_, index) => projectBatteryLifecycle(team.hist || [], Math.max(5, quarter) + index));
      const existing: any = d1.prepare("SELECT * FROM battery_lifecycle_decisions WHERE universe_id = ? AND team_i = ? AND quarter = ?").get(universeId, teamId, quarter);
      if (req.method === "GET") return res.json({ quarter, active: quarter >= 5, projections, decision: existing || null });
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      if (quarter < 5) return res.status(400).json({ error: "Battery lifecycle decisions open from Q5." });
      const disposition = String(input.disposition || "");
      if (!["warranty", "repurpose", "recycle"].includes(disposition)) return res.status(400).json({ error: "Choose warranty, repurpose, or recycle." });
      const projection = projectBatteryLifecycle(team.hist || [], quarter);
      const option: any = projection.options[disposition];
      const id = `${universeId}:${teamId}:${quarter}`;
      d1.prepare("INSERT INTO battery_lifecycle_decisions (id, universe_id, team_i, quarter, disposition, returned_units, warranty_reserve, cost, revenue, esg_impact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET disposition = excluded.disposition, returned_units = excluded.returned_units, warranty_reserve = excluded.warranty_reserve, cost = excluded.cost, revenue = excluded.revenue, esg_impact = excluded.esg_impact, updated_at = datetime('now')").run(id, universeId, teamId, quarter, disposition, projection.returnedUnits, projection.warrantyReserve, option.cost, option.revenue, option.esgImpact);
      return res.json({ success: true, decision: { id, universeId, teamId, quarter, disposition, returned_units: projection.returnedUnits, warranty_reserve: projection.warrantyReserve, cost: option.cost, revenue: option.revenue, esg_impact: option.esgImpact } });
    } catch (err: any) { return res.status(500).json({ error: err.message || "Battery lifecycle could not be saved." }); }
  });

  app.all("/api/ad-tribunal", (req, res) => {
    try {
      d1.exec("CREATE TABLE IF NOT EXISTS ad_campaigns (campaign_id TEXT PRIMARY KEY, universe_id TEXT, team_id TEXT, quarter INTEGER, segment_target TEXT, brand_mentioned TEXT, benefit_1 TEXT, benefit_2 TEXT, benefit_3 TEXT, benefit_4 TEXT, benefit_5 TEXT, ad_judgment INTEGER)");
      d1.exec("CREATE TABLE IF NOT EXISTS ad_violations (violation_id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, quarter INTEGER NOT NULL, offense_number INTEGER NOT NULL DEFAULT 0, penalty_type TEXT NOT NULL DEFAULT 'pending', fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, ban_until_quarter INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))");
      d1.exec("CREATE TABLE IF NOT EXISTS ad_claim_bans (ban_id TEXT PRIMARY KEY, violation_id TEXT NOT NULL UNIQUE, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, offense_number INTEGER NOT NULL, ban_start_quarter INTEGER NOT NULL, ban_until_quarter INTEGER NOT NULL, fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
      for (const statement of ["ALTER TABLE ad_violations ADD COLUMN plaintiff_team_id TEXT", "ALTER TABLE ad_violations ADD COLUMN defendant_response TEXT NOT NULL DEFAULT ''", "ALTER TABLE ad_violations ADD COLUMN ruling TEXT", "ALTER TABLE ad_violations ADD COLUMN ruled_at TEXT", "ALTER TABLE ad_violations ADD COLUMN ruling_document TEXT"]) { try { d1.exec(statement); } catch {} }
      const universeId = String(req.query.universe_id || req.body?.universe_id || "").trim();
      if (req.method === "GET") {
        const quarter = Number(req.query.quarter);
        if (!universeId || !Number.isInteger(quarter) || quarter < 1) return res.status(400).json({ error: "universe_id and a positive integer quarter are required." });
        const universe: any = d1.prepare("SELECT game_state FROM universes WHERE id = ?").get(universeId);
        const state = JSON.parse(universe?.game_state || "{}");
        const teamName = (teamId: string) => (state.teams || []).find((team: any) => String(team.i) === teamId || String(team.id) === teamId)?.name || teamId;
        const rows: any[] = d1.prepare(`SELECT v.*, c.segment_target, c.brand_mentioned, c.benefit_1, c.benefit_2, c.benefit_3, c.benefit_4, c.benefit_5 FROM ad_violations v LEFT JOIN ad_campaigns c ON c.campaign_id = v.campaign_id WHERE v.universe_id = ? AND v.quarter = ? ORDER BY v.created_at DESC`).all(universeId, quarter);
        const complaints = rows.map((row: any) => ({ ...row, plaintiff_team: teamName(String(row.plaintiff_team_id || "Market Integrity Office")), defendant_team: teamName(String(row.team_id)), evidence: { campaignId: row.campaign_id, segmentTarget: row.segment_target, brandMentioned: row.brand_mentioned, claimedBenefits: [row.benefit_1, row.benefit_2, row.benefit_3, row.benefit_4, row.benefit_5].filter(Boolean), validationReason: row.reason }, defendant_response: row.defendant_response || "No response filed.", ruling: row.ruling || "pending" }));
        return res.json({ complaints, quarter });
      }
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const ruling = String(req.body?.ruling || "").toLowerCase();
      const violationId = String(req.body?.violation_id || "").trim();
      if (!universeId || !violationId || !["guilty", "not guilty"].includes(ruling)) return res.status(400).json({ error: "universe_id, violation_id, and ruling (Guilty or Not Guilty) are required." });
      const violation: any = d1.prepare("SELECT * FROM ad_violations WHERE violation_id = ? AND universe_id = ?").get(violationId, universeId);
      if (!violation) return res.status(404).json({ error: "Complaint not found." });
      if (violation.ruling) return res.json({ success: true, ruling: violation.ruling, document: violation.ruling_document, alreadyRuled: true });
      const prior: any = d1.prepare("SELECT COUNT(*) AS count FROM ad_violations WHERE universe_id = ? AND team_id = ? AND claim = ? AND ruling = 'guilty'").get(universeId, violation.team_id, violation.claim);
      const offenseNumber = Number(prior?.count || 0) + 1;
      const finePct = offenseNumber === 2 ? 0.05 : offenseNumber >= 3 ? Math.min(0.2, 0.1 * Math.pow(2, offenseNumber - 3)) : 0;
      const universe: any = d1.prepare("SELECT game_state FROM universes WHERE id = ?").get(universeId);
      const state = JSON.parse(universe?.game_state || "{}");
      const team: any = (state.teams || []).find((item: any) => String(item.i) === String(violation.team_id) || String(item.id) === String(violation.team_id));
      const fineAmount = Number(team?.revenue || team?.financials?.revenue || team?.cumRevenue || 0) * finePct;
      const banUntil = Number(violation.quarter) + 4;
      const teamName = team?.name || violation.team_id;
      const document = `To: ${state.instructorEmail || "Instructor"}\nSubject: Ad Claims Tribunal Ruling - ${teamName} - Q${violation.quarter}\n\nThe Ad Claims Tribunal has ruled ${ruling === "guilty" ? "GUILTY" : "NOT GUILTY"} in the complaint concerning the claim "${violation.claim}".\n\nPlaintiff: ${violation.plaintiff_team_id || "Market Integrity Office"}\nDefendant: ${teamName}\nEvidence: Campaign ${violation.campaign_id}; ${violation.reason}\nDefendant response: ${violation.defendant_response || "No response filed."}\n\n${ruling === "guilty" ? `Penalty: ${finePct ? `${finePct * 100}% revenue fine (Rs. ${fineAmount.toFixed(2)}) and ` : ""}four-quarter claim ban through Q${banUntil}.` : "No penalty applies."}\n\nRegards,\nAd Claims Tribunal`;
      d1.prepare("UPDATE ad_violations SET ruling = ?, ruled_at = datetime('now'), offense_number = ?, fine_pct = ?, fine_amount = ?, ban_until_quarter = ?, penalty_type = ?, ruling_document = ? WHERE violation_id = ? AND ruling IS NULL").run(ruling, ruling === "guilty" ? offenseNumber : 0, finePct, fineAmount, ruling === "guilty" ? banUntil : 0, ruling === "guilty" ? (finePct ? "fine_and_ban" : "ban") : "none", document, violation.violation_id);
      if (ruling === "guilty" && team && fineAmount > 0) {
        team.cash = Math.max(0, Number(team.cash || 0) - fineAmount);
        d1.prepare("UPDATE universes SET game_state = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(state), universeId);
      }
      if (ruling === "guilty") d1.prepare("INSERT INTO ad_claim_bans (ban_id, violation_id, universe_id, team_id, claim, offense_number, ban_start_quarter, ban_until_quarter, fine_pct, fine_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(`ban:${violation.violation_id}`, violation.violation_id, universeId, violation.team_id, violation.claim, offenseNumber, violation.quarter, banUntil, finePct, fineAmount);
      return res.json({ success: true, ruling, offenseNumber, finePct, fineAmount, banUntil, document });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.post("/api/process-quarter", async (req, res) => {
    try {
      const universeId = String(req.body?.universeId || "").trim();
      if (!universeId) return res.status(400).json({ error: "universeId is required." });
      const result = await runQuarterWorkflow(d1, universeId);
      return res.json({ success: true, quarter: result.state.quarter, logs: result.logs, demandRows: result.demand.length, scorecards: result.scorecards });
    } catch (err: any) {
      return res.status(err.message?.includes("already") ? 409 : 500).json({ error: err.message || "Quarter processing failed." });
    }
  });

  app.get("/api/policy-events", (req, res) => {
    try {
      const quarter = Number(req.query.quarter);
      if (!Number.isInteger(quarter) || quarter < 1) return res.status(400).json({ error: "A positive integer quarter is required." });
      d1.exec("CREATE TABLE IF NOT EXISTS policy_events (event_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL, region TEXT NOT NULL, event_type TEXT NOT NULL, description TEXT NOT NULL, demand_impact_pct REAL NOT NULL DEFAULT 0, cost_impact_pct REAL NOT NULL DEFAULT 0, eligible_segment TEXT, eligibility_condition TEXT)");
      return res.json({ events: d1.prepare("SELECT * FROM policy_events WHERE quarter = ? ORDER BY event_id").all(quarter) });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.all("/api/charging-network", (req, res) => {
    try {
      const teamId = String(req.body?.teamId ?? req.query.teamId ?? "").trim();
      const quarter = Number(req.body?.quarter ?? req.query.quarter);
      if (!teamId || !Number.isInteger(quarter) || quarter < 1) return res.status(400).json({ error: "teamId and a positive integer quarter are required." });
      d1.exec("CREATE TABLE IF NOT EXISTS charging_network (team_id TEXT NOT NULL, region TEXT NOT NULL, quarter INTEGER NOT NULL, charger_count INTEGER NOT NULL DEFAULT 0, charger_type TEXT NOT NULL CHECK (charger_type IN ('Level 2 AC', 'DC Fast Charge', 'Ultra-rapid 350kW')), installation_cost REAL NOT NULL DEFAULT 0, quarterly_maintenance REAL NOT NULL DEFAULT 0, demand_boost_pct REAL NOT NULL DEFAULT 0, UNIQUE (team_id, region, quarter))");
      if (req.method === "GET") return res.json({ investments: d1.prepare("SELECT * FROM charging_network WHERE team_id = ? AND quarter <= ? ORDER BY quarter, region").all(teamId, quarter) });
      const typeConfig: Record<string, [number, number, number]> = { "Level 2 AC": [0.08, 0.12, 0.006], "DC Fast Charge": [0.18, 0.35, 0.014], "Ultra-rapid 350kW": [0.3, 0.7, 0.025] };
      const investments = Array.isArray(req.body?.investments) ? req.body.investments : [];
      if (!investments.length) return res.status(400).json({ error: "At least one regional investment is required." });
      const statements = investments.map((investment: any) => {
        const region = String(investment.region || "").trim(); const chargerType = String(investment.charger_type || ""); const count = Math.max(0, Math.floor(Number(investment.charger_count) || 0)); const config = typeConfig[chargerType];
        if (!region || !config) throw new Error("Each investment needs a valid region and charger type.");
        return { statement: d1.prepare("INSERT INTO charging_network (team_id, region, quarter, charger_count, charger_type, installation_cost, quarterly_maintenance, demand_boost_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(team_id, region, quarter) DO UPDATE SET charger_count = excluded.charger_count, charger_type = excluded.charger_type, installation_cost = excluded.installation_cost, quarterly_maintenance = excluded.quarterly_maintenance, demand_boost_pct = excluded.demand_boost_pct"), params: [teamId, region, quarter, count, chargerType, count * config[1], count * config[2], count * config[0]] };
      });
      statements.forEach((statement: any) => statement.statement.run(...statement.params));
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ error: err.message || "Charging strategy could not be saved." }); }
  });

  app.get("/api/strategy-plans", (req, res) => {
    try {
      const universeId = String(req.query.universeId || "").trim();
      const teamId = Number(req.query.teamId);
      const quarter = Number(req.query.quarter);
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1) return res.status(400).json({ error: "universeId, teamId, and a positive integer quarter are required." });
      d1.exec("CREATE TABLE IF NOT EXISTS strategy_plans (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, plan_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      const row: any = d1.prepare("SELECT * FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter = ?").get(universeId, teamId, quarter);
      return res.json({ plan: row ? JSON.parse(row.plan_json) : null, updatedAt: row?.updated_at || null });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.post("/api/strategy-plans", (req, res) => {
    try {
      const { universeId, teamId, quarter, plan } = req.body || {};
      const teamI = Number(teamId);
      const quarterNumber = Number(quarter);
      if (!String(universeId || "").trim() || !Number.isInteger(teamI) || !Number.isInteger(quarterNumber) || quarterNumber < 1 || !plan || typeof plan !== "object") return res.status(400).json({ error: "universeId, teamId, quarter, and plan are required." });
      if (String(plan.mission || "").trim().split(/\s+/).filter(Boolean).length > 200) return res.status(400).json({ error: "Mission statement cannot exceed 200 words." });
      const priorities = plan.priorities || {};
      const priorityTotal = ["Marketing", "Sales", "Manufacturing", "R&D", "Human Resources"].reduce((sum, name) => sum + Number(priorities[name] || 0), 0);
      if (priorityTotal !== 100) return res.status(400).json({ error: "Functional priorities must total 100 points." });
      d1.exec("CREATE TABLE IF NOT EXISTS strategy_plans (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, plan_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      const id = `${universeId}:${teamI}:${quarterNumber}`;
      d1.prepare("INSERT INTO strategy_plans (id, universe_id, team_i, quarter, plan_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET plan_json = excluded.plan_json, updated_at = datetime('now')").run(id, String(universeId), teamI, quarterNumber, JSON.stringify(plan));
      return res.json({ success: true, id });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.all("/api/competitive-benchmark", (req, res) => {
    try {
      const input = req.method === "POST" ? req.body || {} : req.query;
      const teamId = String(input.teamId || input.team_id || "").trim();
      const quarter = Number(input.quarter);
      const region = String(input.region || "Global").trim() || "Global";
      const scope = String(input.scope || (region.toLowerCase() === "global" ? "global" : "region"));
      if (!teamId || !Number.isInteger(quarter) || quarter < 1 || !["region", "global"].includes(scope)) return res.status(400).json({ error: "teamId, a positive integer quarter, and a valid scope are required." });
      d1.exec("CREATE TABLE IF NOT EXISTS competitive_benchmark_purchases (purchase_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, scope TEXT NOT NULL, cost REAL NOT NULL, report_json TEXT NOT NULL, purchased_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_id, quarter, region, scope))");
      const universe: any = d1.prepare("SELECT id, game_state FROM universes ORDER BY updated_at DESC LIMIT 1").get();
      if (!universe) return res.status(404).json({ error: "No simulation universe is available." });
      const purchase: any = d1.prepare("SELECT * FROM competitive_benchmark_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? AND region = ? AND scope = ?").get(universe.id, teamId, quarter, region, scope);
      if (req.method === "GET") return res.json({ purchased: Boolean(purchase), cost: COMPETITIVE_BENCHMARK_REGION_COST * (scope === "global" ? 3 : 1), report: purchase ? JSON.parse(purchase.report_json) : null });
      const cost = COMPETITIVE_BENCHMARK_REGION_COST * (scope === "global" ? 3 : 1);
      if (Number(input.market_research_budget || input.budget) < cost) return res.status(402).json({ error: `Allocate at least Rs. ${cost} L to purchase this report.` });
      const report = buildCompetitiveBenchmark(JSON.parse(universe.game_state), quarter, region);
      d1.prepare("INSERT INTO competitive_benchmark_purchases (purchase_id, universe_id, team_id, quarter, region, scope, cost, report_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_id, quarter, region, scope) DO UPDATE SET report_json = excluded.report_json, cost = excluded.cost, purchased_at = datetime('now')").run(`${universe.id}:${teamId}:${quarter}:${region}:${scope}`, universe.id, teamId, quarter, region, scope, cost, JSON.stringify(report));
      return res.json({ success: true, purchased: true, cost, report });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.post("/api/balanced-scorecard", (req, res) => {
    try {
      const universeId = String(req.body?.universeId || "").trim();
      const quarter = Number(req.body?.quarter);
      const records = Array.isArray(req.body?.records) ? req.body.records.slice(0, 100) : [];
      if (!universeId || !Number.isInteger(quarter) || quarter < 4 || !records.length) return res.status(400).json({ error: "universeId, Q4-or-later quarter, and scorecard records are required." });
      d1.exec("CREATE TABLE IF NOT EXISTS balanced_scorecard (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, team_name TEXT NOT NULL, overall_score REAL NOT NULL, dimensions_json TEXT NOT NULL, raw_metrics_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      for (const record of records) {
        const teamId = String(record.teamId || "").trim();
        const id = `${universeId}:${teamId}:${quarter}`;
        d1.prepare("INSERT INTO balanced_scorecard (id, universe_id, team_i, quarter, team_name, overall_score, dimensions_json, raw_metrics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET team_name = excluded.team_name, overall_score = excluded.overall_score, dimensions_json = excluded.dimensions_json, raw_metrics_json = excluded.raw_metrics_json, updated_at = datetime('now')").run(id, universeId, teamId, quarter, String(record.teamName || teamId), Number(record.score) || 0, JSON.stringify(record.dimensions || {}), JSON.stringify(record.raw || {}));
      }
      return res.json({ success: true, quarter, saved: records.length });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.post("/api/production-schedules", (req, res) => {
    try {
      const { universeId, teamId, quarter, inputs, outputs } = req.body || {};
      const teamI = Number(teamId);
      const quarterNumber = Number(quarter);
      if (!String(universeId || "").trim() || !Number.isInteger(teamI) || !Number.isInteger(quarterNumber) || quarterNumber < 1 || !inputs || !outputs) {
        return res.status(400).json({ error: "universeId, teamId, quarter, inputs, and outputs are required." });
      }
      d1.exec("CREATE TABLE IF NOT EXISTS production_schedules (schedule_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, inputs_json TEXT NOT NULL, outputs_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      d1.exec("CREATE TABLE IF NOT EXISTS changeover_investments (team_id TEXT, quarter INTEGER, amount_invested REAL, changeover_hours_saved REAL, new_changeover_time REAL)");
      const scheduleId = `${universeId}:${teamI}:${quarterNumber}`;
      d1.prepare(`INSERT INTO production_schedules (schedule_id, universe_id, team_i, quarter, inputs_json, outputs_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET inputs_json = excluded.inputs_json, outputs_json = excluded.outputs_json, updated_at = datetime('now')`)
        .run(scheduleId, String(universeId), teamI, quarterNumber, JSON.stringify(inputs), JSON.stringify(outputs));
      const investment = Math.max(0, Number(inputs.changeoverInvestment) || 0);
      const hoursSaved = 6 * investment / (investment + 10);
      d1.prepare("DELETE FROM changeover_investments WHERE team_id = ? AND quarter = ?").run(String(teamI), quarterNumber);
      d1.prepare("INSERT INTO changeover_investments (team_id, quarter, amount_invested, changeover_hours_saved, new_changeover_time) VALUES (?, ?, ?, ?, ?)").run(String(teamI), quarterNumber, investment, hoursSaved, Math.max(2, 8 - hoursSaved));
      return res.json({ success: true, scheduleId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/production-schedules", (req, res) => {
    try {
      const universeId = String(req.query.universeId || "").trim();
      const teamI = Number(req.query.teamId);
      const quarterNumber = Number(req.query.quarter);
      if (!universeId || !Number.isInteger(teamI) || !Number.isInteger(quarterNumber)) return res.status(400).json({ error: "universeId, teamId, and quarter are required." });
      const row: any = d1.prepare("SELECT * FROM production_schedules WHERE universe_id = ? AND team_i = ? AND quarter = ?").get(universeId, teamI, quarterNumber);
      if (!row) return res.status(404).json({ error: "Schedule not found." });
      return res.json({ ...row, inputs: JSON.parse(row.inputs_json), outputs: JSON.parse(row.outputs_json) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.all("/api/rd/license", (req, res) => {
    try {
      d1.exec(`CREATE TABLE IF NOT EXISTS vehicle_components (component_id TEXT PRIMARY KEY, category TEXT, name TEXT, material_cost REAL, performance_score INTEGER, benefit_delivered TEXT, is_rd_unlocked INTEGER DEFAULT 0, available_from_quarter INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS rd_projects (project_id TEXT PRIMARY KEY, name TEXT, description TEXT, component_unlocked TEXT NOT NULL); CREATE TABLE IF NOT EXISTS rd_project_completions (game_id TEXT NOT NULL, team_id TEXT NOT NULL, project_id TEXT NOT NULL, completed_quarter INTEGER NOT NULL, PRIMARY KEY (game_id, team_id, project_id)); CREATE TABLE IF NOT EXISTS rd_license_offers (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, seller_team_id TEXT NOT NULL, buyer_team_id TEXT NOT NULL, project_id TEXT NOT NULL, license_fee REAL NOT NULL CHECK (license_fee >= 1), special_terms TEXT NOT NULL DEFAULT '', offered_quarter INTEGER NOT NULL, execute_quarter INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'offered', accepted_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))); CREATE TABLE IF NOT EXISTS team_component_access (game_id TEXT NOT NULL, team_id TEXT NOT NULL, component_id TEXT NOT NULL, source_license_id TEXT, unlocked_quarter INTEGER NOT NULL, PRIMARY KEY (game_id, team_id, component_id));`);
      const gameId = String(req.body?.game_id || req.header("X-Game-Id") || req.query.game_id || req.query.universe_id || "").trim();
      const teamId = String(req.query.team_id || req.body?.buyer_team_id || "").trim();
      const quarter = Number(req.body?.quarter || req.query.quarter || 1);
      if (!gameId) return res.status(400).json({ error: "game_id is required." });
      d1.prepare("UPDATE rd_license_offers SET status = 'executed' WHERE game_id = ? AND status = 'accepted' AND execute_quarter <= ?").run(gameId, quarter);
      const due = d1.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND status = 'executed' AND execute_quarter <= ?").all(gameId, quarter);
      for (const offer of due) d1.prepare("INSERT OR IGNORE INTO team_component_access (game_id, team_id, component_id, source_license_id, unlocked_quarter) SELECT ?, ?, component_unlocked, ?, ? FROM rd_projects WHERE project_id = ?").run(gameId, offer.buyer_team_id, offer.id, offer.execute_quarter, offer.project_id);
      if (req.method === "GET") {
        if (!teamId) return res.status(400).json({ error: "team_id is required." });
        const available = d1.prepare("SELECT p.project_id, p.name, p.description, p.component_unlocked, c.name AS component_name, c.category, c.benefit_delivered, x.team_id AS seller_team_id FROM rd_projects p JOIN vehicle_components c ON c.component_id = p.component_unlocked JOIN rd_project_completions x ON x.game_id = ? AND x.project_id = p.project_id AND x.completed_quarter < ? WHERE x.team_id <> ? AND NOT EXISTS (SELECT 1 FROM team_component_access a WHERE a.game_id = ? AND a.team_id = ? AND a.component_id = p.component_unlocked) ORDER BY p.name").all(gameId, quarter, teamId, gameId, teamId);
        const outbound = d1.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND seller_team_id = ? ORDER BY created_at DESC").all(gameId, teamId);
        return res.json({ available, outbound });
      }
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const body = req.body || {};
      if (!body.seller_team_id || !body.buyer_team_id || !body.project_id || !Number.isInteger(quarter) || quarter < 1) return res.status(400).json({ error: "seller_team_id, buyer_team_id, project_id, and a positive integer quarter are required." });
      if (body.action === "accept") {
        const offer = d1.prepare("SELECT * FROM rd_license_offers WHERE id = ? AND game_id = ? AND buyer_team_id = ?").get(String(body.license_id || ""), gameId, String(body.buyer_team_id));
        if (!offer || offer.status !== "offered") return res.status(409).json({ error: "Offer is missing or no longer open." });
        d1.prepare("UPDATE rd_license_offers SET status = 'accepted', accepted_at = datetime('now') WHERE id = ? AND status = 'offered'").run(offer.id);
        return res.json({ success: true, offer: { ...offer, status: "accepted" } });
      }
      const fee = Number(body.license_fee);
      if (!Number.isFinite(fee) || fee < 1) return res.status(400).json({ error: "license_fee must be at least 1." });
      if (String(body.seller_team_id) === String(body.buyer_team_id)) return res.status(400).json({ error: "Seller and buyer must be different teams." });
      const completion = d1.prepare("SELECT completed_quarter FROM rd_project_completions WHERE game_id = ? AND team_id = ? AND project_id = ? AND completed_quarter < ? LIMIT 1").get(gameId, String(body.seller_team_id), String(body.project_id), quarter);
      if (!completion) return res.status(409).json({ error: "Seller must have completed this R&D project in a prior quarter." });
      const offer = { id: crypto.randomUUID(), game_id: gameId, seller_team_id: String(body.seller_team_id), buyer_team_id: String(body.buyer_team_id), project_id: String(body.project_id), license_fee: fee, special_terms: typeof body.special_terms === "string" ? body.special_terms.trim() : "", offered_quarter: quarter, execute_quarter: quarter + 1, status: "offered" };
      d1.prepare("INSERT INTO rd_license_offers (id, game_id, seller_team_id, buyer_team_id, project_id, license_fee, special_terms, offered_quarter, execute_quarter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'offered')").run(offer.id, offer.game_id, offer.seller_team_id, offer.buyer_team_id, offer.project_id, offer.license_fee, offer.special_terms, offer.offered_quarter, offer.execute_quarter);
      return res.status(201).json({ success: true, offer });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Cloudflare D1 Status & Diagnostics
  app.get("/api/d1/status", (_req, res) => {
    try {
      let univCount = 0;
      let userCount = 0;
      try {
        const uRes = d1.prepare("SELECT COUNT(*) as count FROM universes").get();
        univCount = uRes?.count ?? 0;
        const usrRes = d1.prepare("SELECT COUNT(*) as count FROM users").get();
        userCount = usrRes?.count ?? 0;
      } catch (e) {
        console.warn("D1 count query warning:", e);
      }

      res.json({
        status: "connected",
        provider: "Cloudflare D1 (SQLite Engine)",
        tableCounts: { universes: univCount, users: userCount },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Initialize D1 Schema
  app.post("/api/d1/init-schema", (_req, res) => {
    try {
      if (typeof d1.exec === "function") {
        d1.exec(`
          CREATE TABLE IF NOT EXISTS universes (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              code TEXT NOT NULL,
              instructor_email TEXT NOT NULL,
              max_teams INTEGER NOT NULL DEFAULT 10,
              max_members_per_team INTEGER NOT NULL DEFAULT 8,
              game_state TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              role TEXT NOT NULL,
              institution TEXT DEFAULT '',
              universe_id TEXT NOT NULL,
              team_i INTEGER NOT NULL DEFAULT -1,
              password TEXT NOT NULL,
              last_active_at TEXT,
              active_minutes INTEGER NOT NULL DEFAULT 0,
              is_online INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS team_decisions (
              id TEXT PRIMARY KEY,
              universe_id TEXT NOT NULL,
              team_i INTEGER NOT NULL,
              quarter INTEGER NOT NULL,
              decision_json TEXT NOT NULL,
              submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
              submitted_by TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS audit_logs (
              id TEXT PRIMARY KEY,
              universe_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              action TEXT NOT NULL,
              details_json TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS app_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
      }
      res.json({ success: true, message: "D1 database schema initialized successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // D1 Universes API
  app.get("/api/d1/universes", (_req, res) => {
    try {
      let rows: any[] = [];
      try {
        rows = d1.prepare("SELECT * FROM universes ORDER BY created_at DESC").all();
      } catch (e) {
        console.warn("D1 get universes warning:", e);
      }
      const universes = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        instructorEmail: r.instructor_email || r.instructorEmail,
        maxTeams: r.max_teams || r.maxTeams || 10,
        maxMembersPerTeam: r.max_members_per_team || r.maxMembersPerTeam || 8,
        gameState: typeof r.game_state === "string" ? JSON.parse(r.game_state) : r.gameState || r.game_state,
        createdAt: r.created_at || r.createdAt
      }));
      res.json(universes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/d1/universes", (req, res) => {
    try {
      const u = req.body;
      if (!u || !u.id) return res.status(400).json({ error: "Invalid universe data" });

      if (d1.insertUniverse) {
        d1.insertUniverse(u);
      } else {
        const stmt = d1.prepare(`
          INSERT INTO universes (id, name, code, instructor_email, max_teams, max_members_per_team, game_state, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            code = excluded.code,
            instructor_email = excluded.instructor_email,
            max_teams = excluded.max_teams,
            max_members_per_team = excluded.max_members_per_team,
            game_state = excluded.game_state,
            updated_at = datetime('now')
        `);
        stmt.run(
          u.id,
          u.name || "EV League Simulation",
          u.code || "NITW2026",
          u.instructorEmail || "instructor@nitw.ac.in",
          u.maxTeams || 10,
          u.maxMembersPerTeam || 8,
          JSON.stringify(u.gameState)
        );
      }
      res.json({ success: true, universeId: u.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/d1/universes/:id", (req, res) => {
    try {
      const id = req.params.id;
      if (d1.deleteUniverse) {
        d1.deleteUniverse(id);
      } else {
        d1.prepare("DELETE FROM universes WHERE id = ?").run(id);
        try {
          d1.prepare("UPDATE users SET universe_id = '', team_i = -1 WHERE universe_id = ?").run(id);
        } catch (e) {}
      }
      res.json({ success: true, universeId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Remove user from universe (sets universe_id = '', team_i = -1)
  app.post("/api/d1/users/:id/remove-from-universe", (req, res) => {
    try {
      const id = req.params.id;
      if (d1.removeUserFromUniverse) {
        d1.removeUserFromUniverse(id);
      } else {
        d1.prepare("UPDATE users SET universe_id = '', team_i = -1 WHERE id = ?").run(id);
      }
      res.json({ success: true, userId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // D1 Users API
  app.get("/api/d1/users", (_req, res) => {
    try {
      let rows: any[] = [];
      try {
        rows = d1.prepare("SELECT * FROM users ORDER BY name ASC").all();
      } catch (e) {
        console.warn("D1 get users warning:", e);
      }
      const users = rows.map((r: any) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        institution: r.institution,
        universeId: r.universe_id || r.universeId,
        teamI: r.team_i ?? r.teamI ?? -1,
        password: r.password,
        lastActiveAt: r.last_active_at || r.lastActiveAt,
        activeMinutes: r.active_minutes ?? r.activeMinutes ?? 0,
        isOnline: Boolean(r.is_online ?? r.isOnline)
      }));
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/d1/users", (req, res) => {
    try {
      const u = req.body;
      if (!u || !u.id) return res.status(400).json({ error: "Invalid user data" });

      if (d1.insertUser) {
        d1.insertUser(u);
      } else {
        const stmt = d1.prepare(`
          INSERT INTO users (id, email, name, role, institution, universe_id, team_i, password, last_active_at, active_minutes, is_online)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            role = excluded.role,
            institution = excluded.institution,
            universe_id = excluded.universe_id,
            team_i = excluded.team_i,
            password = excluded.password,
            last_active_at = excluded.last_active_at,
            active_minutes = excluded.active_minutes,
            is_online = excluded.is_online
        `);
        stmt.run(
          u.id,
          u.email,
          u.name,
          u.role,
          u.institution || "",
          u.universeId,
          u.teamI ?? -1,
          u.password || "student123",
          u.lastActiveAt || new Date().toISOString(),
          u.activeMinutes || 0,
          u.isOnline ? 1 : 0
        );
      }
      res.json({ success: true, userId: u.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/d1/users/batch", (req, res) => {
    try {
      const { users } = req.body;
      if (Array.isArray(users)) {
        for (const u of users) {
          if (d1.insertUser) {
            d1.insertUser(u);
          } else {
            const stmt = d1.prepare(`
              INSERT INTO users (id, email, name, role, institution, universe_id, team_i, password, last_active_at, active_minutes, is_online)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                email = excluded.email,
                name = excluded.name,
                role = excluded.role,
                institution = excluded.institution,
                universe_id = excluded.universe_id,
                team_i = excluded.team_i,
                password = excluded.password,
                last_active_at = excluded.last_active_at,
                active_minutes = excluded.active_minutes,
                is_online = excluded.is_online
            `);
            stmt.run(
              u.id,
              u.email,
              u.name,
              u.role,
              u.institution || "",
              u.universeId,
              u.teamI ?? -1,
              u.password || "student123",
              u.lastActiveAt || new Date().toISOString(),
              u.activeMinutes || 0,
              u.isOnline ? 1 : 0
            );
          }
        }
      }
      res.json({ success: true, count: users?.length || 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/d1/users/:id", (req, res) => {
    try {
      const id = req.params.id;
      const email = (req.query.email as string) || "";
      let deletedCount = 0;
      try {
        const targets = [id, email].filter(Boolean);
        for (const t of targets) {
          const result = d1.prepare(`
            DELETE FROM users 
            WHERE id = ? 
               OR email = ? 
               OR LOWER(id) = LOWER(?) 
               OR LOWER(email) = LOWER(?)
          `).run(t, t, t, t);
          deletedCount += Number(result?.changes || 0);
        }
      } catch (e) {
        console.warn("SQL delete user warning:", e);
      }
      res.status(deletedCount > 0 ? 200 : 404).json({ success: deletedCount > 0, deletedId: id, email, deletedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // D1 SQL Query Console Endpoint
  app.post("/api/d1/query", (req, res) => {
    try {
      const { sql, params = [] } = req.body;
      if (!sql || typeof sql !== "string") {
        return res.status(400).json({ error: "Missing SQL string" });
      }

      const lower = sql.trim().toLowerCase();
      if (lower.startsWith("select") || lower.startsWith("pragma") || lower.startsWith("explain")) {
        const rows = d1.prepare(sql).all(...params);
        res.json({ success: true, results: rows, rows: rows.length });
      } else {
        const info = d1.prepare(sql).run(...params);
        res.json({ success: true, changes: info?.changes || 1 });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Gemini AI Executive Strategic Advisor Endpoint
  app.post("/api/advisor", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured in environment.",
        });
      }

      const { prompt, context } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `You are an elite Business School Professor and Board of Directors Chairperson for the EV Venture League business simulation (patterned after ASCM Marketplace Simulation).
Analyze the provided student team decision metrics, financial numbers, target segment positioning, and balanced scorecard scores.
Provide 3 concise, highly actionable, strategic recommendations in clear markdown formatting with bullet points.
Focus on financial viability, pricing strategy, capacity planning, R&D/licensing, and segment alignment. Avoid generic fluff.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\nContext:\n${JSON.stringify(context, null, 2)}\n\nStudent Query: ${prompt || "Analyze our current strategy and give board guidance."}` }] }
        ]
      });

      return res.json({ advice: response.text });
    } catch (err: any) {
      console.error("Advisor API error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate AI advice." });
    }
  });

  // AI-generated quarterly instructor briefing from the team's persisted records.
  app.post("/api/executive-briefing", async (req, res) => {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
        return res.status(400).json({ error: "ANTHROPIC_API_KEY is not configured in environment." });
      }

      const universeId = String(req.body?.universeId || "").trim();
      const teamId = Number(req.body?.teamId);
      const quarter = Number(req.body?.quarter);
      const role = String(req.body?.role || "President").trim();
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1) {
        return res.status(400).json({ error: "universeId, teamId, and a positive integer quarter are required." });
      }

      const readJson = (value: unknown) => {
        if (typeof value !== "string") return value || {};
        try { return JSON.parse(value); } catch { return {}; }
      };
      const optionalRows = (sql: string, ...params: any[]) => {
        try { return d1.prepare(sql).all(...params) || []; } catch { return []; }
      };
      const scorecards = optionalRows(
        "SELECT quarter, overall_score, dimensions_json, raw_metrics_json FROM balanced_scorecard WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?) ORDER BY quarter",
        universeId, String(teamId), quarter - 1, quarter
      ).map((row: any) => ({ ...row, dimensions: readJson(row.dimensions_json), rawMetrics: readJson(row.raw_metrics_json) }));
      const plans = optionalRows(
        "SELECT quarter, plan_json, updated_at FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?, ?) ORDER BY quarter",
        universeId, teamId, quarter - 1, quarter, quarter + 1
      ).map((row: any) => ({ quarter: row.quarter, updatedAt: row.updated_at, plan: readJson(row.plan_json) }));
      const proForma = optionalRows(
        "SELECT quarter, statement_json, updated_at FROM pro_forma_statements WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?) ORDER BY quarter",
        universeId, teamId, quarter, quarter + 1
      ).map((row: any) => ({ quarter: row.quarter, updatedAt: row.updated_at, statement: readJson(row.statement_json) }));
      const decisions = optionalRows(
        "SELECT quarter, decision_json, submitted_at, submitted_by FROM team_decisions WHERE universe_id = ? AND team_i = ? AND quarter <= ? ORDER BY quarter DESC, submitted_at DESC LIMIT 20",
        universeId, teamId, quarter
      ).map((row: any) => ({ quarter: row.quarter, submittedAt: row.submitted_at, submittedBy: row.submitted_by, decision: readJson(row.decision_json) }));

      const sourceData = { universeId, teamId, quarter, role, scorecards, strategyPlans: plans, proForma, decisions };
      const systemPrompt = `You are a business consultant writing a concise executive summary for an instructor presentation in an EV venture simulation. Write for a business-school audience. Use only the supplied data; never invent metrics or decisions. Explain cause and effect, distinguish actual results from forecasts, and call out missing data as uncertainty. Return valid JSON only with exactly these string fields: performance, decisions, nextQuarter, uncertainties. Each field must contain 1-2 polished paragraphs, with no markdown headings or bullet lists.`;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1400,
          system: systemPrompt,
          messages: [{ role: "user", content: `Prepare the quarterly briefing for the ${role}.\n\nD1 data:\n${JSON.stringify(sourceData, null, 2)}` }]
        })
      });
      if (!response.ok) throw new Error(`Anthropic request failed (${response.status}).`);
      const payload: any = await response.json();
      const text = payload?.content?.find((item: any) => item.type === "text")?.text || "{}";
      const parsed = readJson(text.replace(/^```json\s*|\s*```$/g, ""));
      return res.json({ sourceData, sections: {
        performance: String(parsed.performance || "Performance data was retrieved, but no summary was generated."),
        decisions: String(parsed.decisions || "No decision rationale was available for this quarter."),
        nextQuarter: String(parsed.nextQuarter || "No next-quarter plan was available."),
        uncertainties: String(parsed.uncertainties || "No additional uncertainties were identified by the model.")
      } });
    } catch (err: any) {
      console.error("Executive briefing API error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate executive briefing." });
    }
  });

  // Vite middleware setup for development vs production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EV Venture League Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
