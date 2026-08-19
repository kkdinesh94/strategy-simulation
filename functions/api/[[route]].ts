/**
 * Cloudflare Pages Functions & Workers API Router
 * Handles all /api/* routes natively with Cloudflare D1 (env.DB) and Gemini AI
 */

interface Env {
  DB: any; // Cloudflare D1Database binding
  GEMINI_API_KEY?: string;
  NODE_ENV?: string;
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
