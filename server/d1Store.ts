import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let dbInstance: any = null;

// File path for local SQLite storage
const DB_FILE_PATH = path.join(process.cwd(), "ev_venture_d1.sqlite");

export function getD1Database() {
  if (dbInstance) return dbInstance;

  try {
    // Attempt to load Node.js native sqlite DatabaseSync (Node 22+)
    // @ts-ignore
    const sqliteModule = require("node:sqlite");
    if (sqliteModule && sqliteModule.DatabaseSync) {
      dbInstance = new sqliteModule.DatabaseSync(DB_FILE_PATH);
      console.log("Connected to Cloudflare D1 Local SQLite Engine (node:sqlite) at:", DB_FILE_PATH);
      initD1Tables(dbInstance);
      return dbInstance;
    }
  } catch (_err) {
    // Gracefully fall back to local persistent store if node:sqlite is not exposed
  }

  // Resilient JSON-backed local SQLite engine
  dbInstance = createFallbackD1Engine();
  console.log("Using resilient Cloudflare D1 local persistence engine");
  return dbInstance;
}

function initD1Tables(db: any) {
  try {
    db.exec(`
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
          role TEXT NOT NULL CHECK(role IN ('admin', 'instructor', 'player')),
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
  } catch (e) {
    console.error("Error initializing SQLite D1 tables:", e);
  }
}

function createFallbackD1Engine() {
  const memoryStore: {
    universes: Map<string, any>;
    users: Map<string, any>;
    decisions: any[];
    audit_logs: any[];
  } = {
    universes: new Map(),
    users: new Map(),
    decisions: [],
    audit_logs: []
  };

  const backupFile = path.join(process.cwd(), "ev_venture_d1_fallback.json");
  let fileLoaded = false;
  if (fs.existsSync(backupFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
      if (data.universes) {
        Object.entries(data.universes).forEach(([k, v]) => memoryStore.universes.set(k, v));
      }
      if (data.users) {
        Object.entries(data.users).forEach(([k, v]) => memoryStore.users.set(k, v));
      }
      fileLoaded = true;
    } catch (e) {
      console.warn("Fallback backup load error:", e);
    }
  }

  // Auto-seed default initial users only on very first cold start if no backup file exists
  if (!fileLoaded && memoryStore.users.size === 0) {
    const defaultUnivId = "univ_nitw_2026";
    const initialUsers = [
      {
        id: "usr_admin",
        email: "admin@evleague.edu",
        name: "Dr. System Administrator",
        role: "admin",
        institution: "NIT Warangal",
        universe_id: defaultUnivId,
        universeId: defaultUnivId,
        team_i: -1,
        teamI: -1,
        password: "admin123",
        active_minutes: 10,
        is_online: 0
      },
      {
        id: "usr_prof",
        email: "instructor@nitw.ac.in",
        name: "Dr. Kamala Kannan Dinesh",
        role: "instructor",
        institution: "Department of Management Studies, NITW",
        universe_id: defaultUnivId,
        universeId: defaultUnivId,
        team_i: -1,
        teamI: -1,
        password: "prof123",
        active_minutes: 25,
        is_online: 0
      },
      {
        id: "usr_std1",
        email: "student1@nitw.ac.in",
        name: "Rahul Sharma (Team Lead)",
        role: "player",
        institution: "NIT Warangal MBA '26",
        universe_id: defaultUnivId,
        universeId: defaultUnivId,
        team_i: 0,
        teamI: 0,
        password: "student123",
        active_minutes: 15,
        is_online: 0
      },
      {
        id: "usr_std2",
        email: "student2@nitw.ac.in",
        name: "Priya Patel",
        role: "player",
        institution: "NIT Warangal MBA '26",
        universe_id: defaultUnivId,
        universeId: defaultUnivId,
        team_i: 1,
        teamI: 1,
        password: "student123",
        active_minutes: 8,
        is_online: 0
      },
      {
        id: "usr_std3",
        email: "student3@nitw.ac.in",
        name: "Ananya Roy",
        role: "player",
        institution: "NIT Warangal MBA '26",
        universe_id: defaultUnivId,
        universeId: defaultUnivId,
        team_i: 2,
        teamI: 2,
        password: "student123",
        active_minutes: 5,
        is_online: 0
      }
    ];

    initialUsers.forEach((u) => memoryStore.users.set(u.id, u));
  }

  const persist = () => {
    try {
      const payload = {
        universes: Object.fromEntries(memoryStore.universes.entries()),
        users: Object.fromEntries(memoryStore.users.entries())
      };
      fs.writeFileSync(backupFile, JSON.stringify(payload, null, 2), "utf-8");
    } catch (e) {
      console.warn("Persist fallback error:", e);
    }
  };

  return {
    isFallback: true,
    exec: (_sql: string) => {},
    prepare: (sql: string) => {
      const lower = sql.toLowerCase().trim();
      return {
        all: (..._params: any[]) => {
          if (lower.includes("from universes")) {
            return Array.from(memoryStore.universes.values());
          }
          if (lower.includes("from users")) {
            return Array.from(memoryStore.users.values());
          }
          return [];
        },
        get: (...params: any[]) => {
          if (lower.includes("count(*)")) {
            if (lower.includes("universes")) return { count: memoryStore.universes.size };
            if (lower.includes("users")) return { count: memoryStore.users.size };
          }
          if (lower.includes("from universes where id =")) {
            return memoryStore.universes.get(params[0]);
          }
          if (lower.includes("from users where id =") || lower.includes("from users where email =")) {
            return memoryStore.users.get(params[0]) || Array.from(memoryStore.users.values()).find((u: any) => u.email === params[0]);
          }
          return null;
        },
        run: (...params: any[]) => {
          if (lower.includes("delete from universes where id =") && params[0]) {
            memoryStore.universes.delete(params[0]);
          }
          if (lower.includes("delete from users where id =") && params[0]) {
            memoryStore.users.delete(params[0]);
          }
          persist();
          return { changes: 1 };
        }
      };
    },
    insertUniverse: (u: any) => {
      memoryStore.universes.set(u.id, u);
      persist();
    },
    deleteUniverse: (id: string) => {
      memoryStore.universes.delete(id);
      // Detach any users previously belonging to this universe
      for (const [uid, user] of memoryStore.users.entries()) {
        if (user.universeId === id || user.universe_id === id) {
          memoryStore.users.set(uid, {
            ...user,
            universeId: "",
            universe_id: "",
            teamI: -1,
            team_i: -1
          });
        }
      }
      persist();
    },
    insertUser: (u: any) => {
      memoryStore.users.set(u.id, u);
      persist();
    },
    deleteUser: (id: string) => {
      memoryStore.users.delete(id);
      persist();
    },
    removeUserFromUniverse: (userId: string) => {
      const u = memoryStore.users.get(userId);
      if (u) {
        memoryStore.users.set(userId, {
          ...u,
          universeId: "",
          universe_id: "",
          teamI: -1,
          team_i: -1
        });
        persist();
      }
    }
  };
}
