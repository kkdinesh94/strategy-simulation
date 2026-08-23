/**
 * Cloudflare Pages Functions & Workers API Router
 * Handles all /api/* routes natively with Cloudflare D1 (env.DB) and Gemini AI
 */

interface Env {
  DB: any; // Cloudflare D1Database binding
  GEMINI_API_KEY?: string;
  NODE_ENV?: string;
  VEHICLE_REDESIGN_FEE?: string;
}

const componentBenefitKey: Record<string, string> = {
  Battery: "range",
  Charging: "charging",
  Autonomy: "autonomy",
  Motor: "image",
  Interior: "image",
  Exterior: "image",
  Software: "autonomy",
  Safety: "autonomy"
};

function jaroWinkler(first: string, second: string): number {
  const a = first.trim().toLowerCase();
  const b = second.trim().toLowerCase();
  if (a === b) return 1;
  if (!a || !b) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const firstMatches = new Array(a.length).fill(false);
  const secondMatches = new Array(b.length).fill(false);
  let matches = 0;

  for (let firstIndex = 0; firstIndex < a.length; firstIndex += 1) {
    const start = Math.max(0, firstIndex - matchDistance);
    const end = Math.min(firstIndex + matchDistance + 1, b.length);
    for (let secondIndex = start; secondIndex < end; secondIndex += 1) {
      if (secondMatches[secondIndex] || a[firstIndex] !== b[secondIndex]) continue;
      firstMatches[firstIndex] = true;
      secondMatches[secondIndex] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;

  const firstOrdered = a.split("").filter((_, index) => firstMatches[index]);
  const secondOrdered = b.split("").filter((_, index) => secondMatches[index]);
  let transpositions = 0;
  for (let index = 0; index < firstOrdered.length; index += 1) {
    if (firstOrdered[index] !== secondOrdered[index]) transpositions += 1;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix += 1;
  return jaro + prefix * 0.1 * (1 - jaro);
}

function normalizeComponentIds(componentIds: string[]): string[] {
  return [...new Set(componentIds.map((componentId) => String(componentId).trim()).filter(Boolean))].sort();
}

export async function onRequest(context: { request: Request; env: Env; params: { route?: string[] } }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Health check
    if (path === "/api/health") {
      return new Response(
        JSON.stringify({ status: "ok", provider: "Cloudflare Workers / D1", app: "EV Venture League Simulation" }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Vehicle designer catalog and brand save API.
    if (path === "/api/vehicle-designer" && method === "GET") {
      const requestedQuarter = Number(url.searchParams.get("quarter") || 1);
      const currentQuarter = Number.isFinite(requestedQuarter) ? Math.max(1, requestedQuarter) : 1;
      const componentRows = await env.DB.prepare(
        "SELECT component_id, category, name, material_cost, performance_score, benefit_delivered FROM vehicle_components WHERE available_from_quarter <= ? ORDER BY category, material_cost"
      ).bind(currentQuarter).all();
      const segmentRows = await env.DB.prepare(
        "SELECT segment_id, name, price_sensitivity, range_priority, charging_speed_priority, autonomy_priority, brand_image_priority, segment_size_pct FROM market_segments ORDER BY segment_id"
      ).all();

      return new Response(JSON.stringify({
        components: (componentRows.results || []).map((row: any) => ({
          componentId: row.component_id,
          category: row.category,
          name: row.name,
          cost: Number(row.material_cost),
          performance: Number(row.performance_score),
          benefit: row.benefit_delivered,
          benefitKey: componentBenefitKey[row.category] || "range"
        })),
        segments: (segmentRows.results || []).map((row: any) => ({
          segmentId: row.segment_id,
          name: row.name,
          priceWillingToPay: Math.round(60000 - Number(row.price_sensitivity || 0) * 3500),
          weights: {
            range: Number(row.range_priority || 0),
            charging: Number(row.charging_speed_priority || 0),
            autonomy: Number(row.autonomy_priority || 0),
            image: Number(row.brand_image_priority || 0)
          }
        }))
      }), { status: 200, headers: corsHeaders });
    }

    if (path.startsWith("/api/vehicle-designer/brands/") && method === "POST") {
      if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      }
      const brandId = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
      const body = await request.json() as {
        quarter?: number;
        componentIds?: string[];
        multiplier?: number;
        brandName?: string;
        submittedBy?: string;
      };
      const quarter = Number(body.quarter);
      const componentIds = normalizeComponentIds(Array.isArray(body.componentIds) ? body.componentIds : []);
      const brandName = typeof body.brandName === "string" ? body.brandName.trim() : "";
      const multiplier = Number(body.multiplier ?? 2.5);
      const redesignFee = Math.max(0, Number(env.VEHICLE_REDESIGN_FEE ?? 500));
      if (!brandId || !Number.isInteger(quarter) || quarter < 1 || !Number.isFinite(multiplier) || multiplier <= 0) {
        return new Response(JSON.stringify({ error: "brandId, a positive integer quarter, and a positive multiplier are required." }), { status: 400, headers: corsHeaders });
      }

      const decisionId = `vehicle-design:${brandId}:Q${quarter}`;
      const existingQuarter = await env.DB.prepare(
        "SELECT id FROM team_decisions WHERE id = ?"
      ).bind(decisionId).first();
      const latestDecision = await env.DB.prepare(
        "SELECT quarter, decision_json FROM team_decisions WHERE id LIKE ? AND quarter < ? ORDER BY quarter DESC LIMIT 1"
      ).bind(`vehicle-design:${brandId}:Q%`, quarter).first();
      const fee = existingQuarter ? 0 : (latestDecision ? redesignFee : 0);
      let priorBrandName = brandId;
      let configurationChanged = false;
      if (latestDecision?.decision_json) {
        try {
          const priorDecision = JSON.parse(latestDecision.decision_json);
          priorBrandName = typeof priorDecision.brandName === "string" && priorDecision.brandName.trim()
            ? priorDecision.brandName.trim()
            : brandId;
          configurationChanged = JSON.stringify(normalizeComponentIds(priorDecision.componentIds || [])) !== JSON.stringify(componentIds);
        } catch {
          configurationChanged = true;
        }
      }
      if (configurationChanged && (!brandName || brandName.toLowerCase() === priorBrandName.toLowerCase())) {
        return new Response(JSON.stringify({
          error: "A changed component configuration requires a new brand name.",
          originalBrandName: priorBrandName
        }), { status: 400, headers: corsHeaders });
      }
      const finalBrandName = brandName || priorBrandName;
      const brandLoyaltyCarryOver = configurationChanged && jaroWinkler(finalBrandName, priorBrandName) >= 0.6 ? 1 : 0;
      const decision = JSON.stringify({
        type: "vehicle_design",
        brandId,
        brandName: finalBrandName,
        quarter,
        componentIds,
        multiplier,
        redesignFee: fee,
        brand_loyalty_carry_over: brandLoyaltyCarryOver
      });
      await env.DB.prepare(`
        INSERT INTO team_decisions (id, universe_id, team_i, quarter, decision_json, redesign_fee, submitted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET decision_json = excluded.decision_json, redesign_fee = excluded.redesign_fee, submitted_at = datetime('now'), submitted_by = excluded.submitted_by
      `).bind(
        decisionId,
        "vehicle-designer",
        -1,
        quarter,
        decision,
        fee,
        body.submittedBy || "vehicle-designer"
      ).run();
      return new Response(JSON.stringify({ success: true, brandId, brandName: finalBrandName, quarter, redesignFee: fee, brand_loyalty_carry_over: brandLoyaltyCarryOver, decisionId }), { status: 200, headers: corsHeaders });
    }

    // 2. Cloudflare D1 Status
    if (path === "/api/d1/status" || path === "/api/d1/health") {
      if (!env.DB) {
        return new Response(
          JSON.stringify({ status: "disconnected", error: "D1 database binding 'DB' is not configured in environment." }),
          { status: 200, headers: corsHeaders }
        );
      }
      try {
        const univCount = await env.DB.prepare("SELECT COUNT(*) as count FROM universes").first("count");
        const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
        return new Response(
          JSON.stringify({
            status: "connected",
            provider: "Cloudflare D1",
            tableCounts: { universes: univCount ?? 0, users: userCount ?? 0 }
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ status: "uninitialized", error: err.message || "Tables not yet initialized." }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // 3. Initialize D1 Schema
    if (path === "/api/d1/init-schema" && method === "POST") {
      if (!env.DB) {
        return new Response(JSON.stringify({ error: "No D1 DB binding found" }), { status: 500, headers: corsHeaders });
      }
      await env.DB.exec(`
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
            redesign_fee REAL NOT NULL DEFAULT 0,
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
      `);
      return new Response(JSON.stringify({ success: true, message: "D1 Schema successfully initialized." }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // 4. Universes API (D1)
    if (path === "/api/d1/universes") {
      if (method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM universes ORDER BY created_at DESC").all();
        const universes = (results || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          instructorEmail: row.instructor_email,
          maxTeams: row.max_teams,
          maxMembersPerTeam: row.max_members_per_team,
          gameState: typeof row.game_state === "string" ? JSON.parse(row.game_state) : row.game_state,
          createdAt: row.created_at
        }));
        return new Response(JSON.stringify(universes), { status: 200, headers: corsHeaders });
      }

      if (method === "POST") {
        const universe = await request.json();
        await env.DB.prepare(`
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
        `).bind(
          universe.id,
          universe.name,
          universe.code || "NITW2026",
          universe.instructorEmail || "instructor@nitw.ac.in",
          universe.maxTeams || 10,
          universe.maxMembersPerTeam || 8,
          JSON.stringify(universe.gameState)
        ).run();

        return new Response(JSON.stringify({ success: true, universeId: universe.id }), { status: 200, headers: corsHeaders });
      }
    }

    // 5. Users API (D1)
    if (path === "/api/d1/users") {
      if (method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY name ASC").all();
        const users = (results || []).map((row: any) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          institution: row.institution,
          universeId: row.universe_id,
          teamI: row.team_i,
          password: row.password,
          lastActiveAt: row.last_active_at,
          activeMinutes: row.active_minutes,
          isOnline: Boolean(row.is_online)
        }));
        return new Response(JSON.stringify(users), { status: 200, headers: corsHeaders });
      }

      if (method === "POST") {
        const user = await request.json();
        await env.DB.prepare(`
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
        `).bind(
          user.id,
          user.email,
          user.name,
          user.role,
          user.institution || "",
          user.universeId,
          user.teamI ?? -1,
          user.password || "student123",
          user.lastActiveAt || new Date().toISOString(),
          user.activeMinutes || 0,
          user.isOnline ? 1 : 0
        ).run();

        return new Response(JSON.stringify({ success: true, userId: user.id }), { status: 200, headers: corsHeaders });
      }
    }

    // DELETE /api/d1/users/:id — permanently remove user from D1
    if (
      path.startsWith("/api/d1/users/") &&
      !path.endsWith("/batch") &&
      !path.endsWith("/remove-from-universe") &&
      method === "DELETE"
    ) {
      const segments = path.split("/").filter(Boolean);
      const userId = decodeURIComponent(segments[segments.length - 1]);
      const email = url.searchParams.get("email") || "";

      let deletedCount = 0;
      const result = await env.DB.prepare(
        `DELETE FROM users WHERE id = ? OR email = ? OR LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?)`
      ).bind(userId, userId, userId, userId).run();
      deletedCount += Number(result?.meta?.changes || 0);

      if (email) {
        const emailResult = await env.DB.prepare(
          `DELETE FROM users WHERE id = ? OR email = ? OR LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?)`
        ).bind(email, email, email, email).run();
        deletedCount += Number(emailResult?.meta?.changes || 0);
      }

      return new Response(JSON.stringify({ success: deletedCount > 0, deletedId: userId, email, deletedCount }), {
        status: deletedCount > 0 ? 200 : 404,
        headers: corsHeaders
      });
    }

    // DELETE /api/d1/universes/:id — permanently remove universe from D1
    if (path.startsWith("/api/d1/universes/") && method === "DELETE") {
      const segments = path.split("/").filter(Boolean);
      const universeId = decodeURIComponent(segments[segments.length - 1]);

      await env.DB.prepare("DELETE FROM universes WHERE id = ?").bind(universeId).run();

      return new Response(JSON.stringify({ success: true, deletedId: universeId }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // POST /api/d1/users/:id/remove-from-universe — detach user from universe
    if (path.endsWith("/remove-from-universe") && method === "POST") {
      const segments = path.split("/").filter(Boolean);
      const userId = decodeURIComponent(segments[segments.length - 2]);

      await env.DB.prepare(
        `UPDATE users SET universe_id = '', team_i = -1 WHERE id = ?`
      ).bind(userId).run();

      return new Response(JSON.stringify({ success: true, userId }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Batch Users
    if (path === "/api/d1/users/batch" && method === "POST") {
      const { users } = await request.json();
      if (Array.isArray(users)) {
        const statements = users.map((u: any) =>
          env.DB.prepare(`
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
          `).bind(
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
          )
        );
        await env.DB.batch(statements);
      }
      return new Response(JSON.stringify({ success: true, count: users?.length || 0 }), { status: 200, headers: corsHeaders });
    }

    // 6. SQL Query Execution Console (Admin)
    if (path === "/api/d1/query" && method === "POST") {
      const { sql, params = [] } = await request.json();
      if (!sql || typeof sql !== "string") {
        return new Response(JSON.stringify({ error: "No SQL provided" }), { status: 400, headers: corsHeaders });
      }

      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("select") || trimmed.startsWith("pragma") || trimmed.startsWith("explain")) {
        const { results } = await env.DB.prepare(sql).bind(...params).all();
        return new Response(JSON.stringify({ success: true, results, rows: results?.length || 0 }), {
          status: 200,
          headers: corsHeaders
        });
      } else {
        const info = await env.DB.prepare(sql).bind(...params).run();
        return new Response(JSON.stringify({ success: true, meta: info?.meta, changes: info?.meta?.changes || 0 }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }

    // Gemini advisor endpoint (Cloudflare Edge compatible)
    if (path === "/api/advisor" && method === "POST") {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 400, headers: corsHeaders });
      }
      const { prompt, context: simContext } = await request.json();
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const systemInstruction = `You are an elite Business School Professor and Board of Directors Chairperson for the EV Venture League simulation. Analyze the student team metrics and provide 3 concise, highly actionable recommendations in markdown.`;

      const aiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemInstruction}\n\nContext:\n${JSON.stringify(simContext, null, 2)}\n\nQuery: ${prompt || "Analyze our current strategy."}`
                }
              ]
            }
          ]
        })
      });
      const aiData: any = await aiRes.json();
      const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate advice at this moment.";
      return new Response(JSON.stringify({ advice: text }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found: " + path }), { status: 404, headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Server error" }), { status: 500, headers: corsHeaders });
  }
}
