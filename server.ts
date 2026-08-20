import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { getD1Database } from "./server/d1Store";

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
      if (d1.deleteUser) {
        d1.deleteUser(id);
      }
      try {
        d1.prepare("DELETE FROM users WHERE id = ? OR email = ?").run(id, id);
      } catch (e) {
        console.warn("SQL delete user warn:", e);
      }
      res.json({ success: true, deletedId: id });
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
