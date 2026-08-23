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
      const rawDb = createOrRecoverSQLite(sqliteModule);
      if (rawDb) {
        dbInstance = wrapWithSelfHealing(rawDb, sqliteModule);
        return dbInstance;
      }
    }
  } catch (err) {
    console.warn("Failed to initialize node:sqlite, falling back to JSON engine:", err);
  }

  // Resilient JSON-backed local SQLite engine fallback
  dbInstance = createFallbackD1Engine();
  console.log("Using resilient Cloudflare D1 local persistence engine");
  return dbInstance;
}

function createOrRecoverSQLite(sqliteModule: any): any {
  try {
    // Test if existing database file is healthy
    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const testDb = new sqliteModule.DatabaseSync(DB_FILE_PATH);
        const check = testDb.prepare("PRAGMA integrity_check").all();
        const isOk = Array.isArray(check) && check.length > 0 && (check[0].integrity_check === "ok" || check[0]["integrity_check"] === "ok");
        if (!isOk) {
          throw new Error("Integrity check failed: " + JSON.stringify(check));
        }
        testDb.exec("PRAGMA journal_mode = WAL;");
        testDb.exec("PRAGMA synchronous = NORMAL;");
        console.log("Connected to Cloudflare D1 Local SQLite Engine (node:sqlite) at:", DB_FILE_PATH);
        initD1Tables(testDb);
        return testDb;
      } catch (corruptErr: any) {
        console.warn("Detected corrupted SQLite database file, auto-repairing and recreating database:", corruptErr.message);
        cleanupCorruptFiles();
      }
    }

    // Create fresh healthy SQLite database
    const freshDb = new sqliteModule.DatabaseSync(DB_FILE_PATH);
    freshDb.exec("PRAGMA journal_mode = WAL;");
    freshDb.exec("PRAGMA synchronous = NORMAL;");
    console.log("Created fresh Cloudflare D1 SQLite database at:", DB_FILE_PATH);
    initD1Tables(freshDb);
    return freshDb;
  } catch (e: any) {
    console.error("Error creating SQLite database:", e);
    return null;
  }
}

function cleanupCorruptFiles() {
  try {
    const walFile = `${DB_FILE_PATH}-wal`;
    const shmFile = `${DB_FILE_PATH}-shm`;
    const backupCorrupt = `${DB_FILE_PATH}.corrupt_${Date.now()}`;
    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        fs.renameSync(DB_FILE_PATH, backupCorrupt);
      } catch {
        try { fs.unlinkSync(DB_FILE_PATH); } catch {}
      }
    }
    if (fs.existsSync(walFile)) {
      try { fs.unlinkSync(walFile); } catch {}
    }
    if (fs.existsSync(shmFile)) {
      try { fs.unlinkSync(shmFile); } catch {}
    }
  } catch (err) {
    console.warn("Cleanup corrupt files warning:", err);
  }
}

function wrapWithSelfHealing(rawDb: any, sqliteModule: any) {
  let activeDb = rawDb;

  const recover = () => {
    console.warn("Recovering corrupted SQLite D1 database instance...");
    try {
      if (typeof activeDb?.close === "function") {
        try { activeDb.close(); } catch {}
      }
    } catch {}
    cleanupCorruptFiles();
    activeDb = createOrRecoverSQLite(sqliteModule);
    if (!activeDb) {
      activeDb = createFallbackD1Engine();
    }
    return activeDb;
  };

  return {
    exec: (sql: string) => {
      try {
        return activeDb.exec(sql);
      } catch (err: any) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk I/O"))) {
          recover();
          return activeDb.exec(sql);
        }
        throw err;
      }
    },
    prepare: (sql: string) => {
      try {
        const stmt = activeDb.prepare(sql);
        return {
          all: (...params: any[]) => {
            try {
              return stmt.all(...params);
            } catch (err: any) {
              if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk I/O"))) {
                recover();
                return activeDb.prepare(sql).all(...params);
              }
              throw err;
            }
          },
          get: (...params: any[]) => {
            try {
              return stmt.get(...params);
            } catch (err: any) {
              if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk I/O"))) {
                recover();
                return activeDb.prepare(sql).get(...params);
              }
              throw err;
            }
          },
          run: (...params: any[]) => {
            try {
              return stmt.run(...params);
            } catch (err: any) {
              if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk I/O"))) {
                recover();
                return activeDb.prepare(sql).run(...params);
              }
              throw err;
            }
          }
        };
      } catch (err: any) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk I/O"))) {
          recover();
          return activeDb.prepare(sql);
        }
        throw err;
      }
    },
    insertUser: (u: any) => {
      if (typeof activeDb.insertUser === "function") {
        return activeDb.insertUser(u);
      }
      try {
        const stmt = activeDb.prepare(`
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
          u.universeId || u.universe_id,
          u.teamI ?? u.team_i ?? -1,
          u.password || "student123",
          u.lastActiveAt || u.last_active_at || new Date().toISOString(),
          u.activeMinutes ?? u.active_minutes ?? 0,
          u.isOnline || u.is_online ? 1 : 0
        );
      } catch (err: any) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt"))) {
          recover();
          return activeDb.insertUser?.(u);
        }
      }
    },
    deleteUser: (target: string) => {
      if (!target) return;
      if (typeof activeDb.deleteUser === "function") {
        return activeDb.deleteUser(target);
      }
      try {
        const targetClean = target.trim();
        activeDb.prepare(`
          DELETE FROM users 
          WHERE id = ? 
             OR email = ? 
             OR LOWER(id) = LOWER(?) 
             OR LOWER(email) = LOWER(?)
        `).run(targetClean, targetClean, targetClean, targetClean);
      } catch (err: any) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt"))) {
          recover();
          return activeDb.deleteUser?.(target);
        }
      }
    },
    insertUniverse: (u: any) => {
      if (typeof activeDb.insertUniverse === "function") {
        return activeDb.insertUniverse(u);
      }
      try {
        const stmt = activeDb.prepare(`
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
          u.instructorEmail || u.instructor_email || "instructor@nitw.ac.in",
          u.maxTeams || u.max_teams || 10,
          u.maxMembersPerTeam || u.max_members_per_team || 8,
          typeof u.gameState === "string" ? u.gameState : JSON.stringify(u.gameState)
        );
      } catch (err: any) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt"))) {
          recover();
          return activeDb.insertUniverse?.(u);
        }
      }
    },
    deleteUniverse: (id: string) => {
      if (typeof activeDb.deleteUniverse === "function") {
        return activeDb.deleteUniverse(id);
      }
      try {
        activeDb.prepare("DELETE FROM universes WHERE id = ?").run(id);
        activeDb.prepare("UPDATE users SET universe_id = '', team_i = -1 WHERE universe_id = ?").run(id);
      } catch (err: any) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt"))) {
          recover();
          return activeDb.deleteUniverse?.(id);
        }
      }
    },
    removeUserFromUniverse: (id: string) => {
      if (typeof activeDb.removeUserFromUniverse === "function") {
        return activeDb.removeUserFromUniverse(id);
      }
      try {
        activeDb.prepare("UPDATE users SET universe_id = '', team_i = -1 WHERE id = ? OR LOWER(email) = LOWER(?)").run(id, id);
      } catch (err: any) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt"))) {
          recover();
          return activeDb.removeUserFromUniverse?.(id);
        }
      }
    }
  };
}


function initD1Tables(db: any) {
  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

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

          CREATE TABLE IF NOT EXISTS production_schedules (
            schedule_id TEXT PRIMARY KEY,
            universe_id TEXT NOT NULL,
            team_i INTEGER NOT NULL,
            quarter INTEGER NOT NULL,
            inputs_json TEXT NOT NULL,
            outputs_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (universe_id, team_i, quarter)
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

    // Check if database was already initialized
    try {
      const seeded = db.prepare("SELECT value FROM app_settings WHERE key = 'db_seeded'").get();
      if (!seeded) {
        const defaultUnivId = "univ_nitw_2026";
        const initialUsers = [
          { id: "usr_admin", email: "admin@evleague.edu", name: "Dr. System Administrator", role: "admin", inst: "NIT Warangal", univ: defaultUnivId, team: -1, pass: "admin123" },
          { id: "usr_prof", email: "instructor@nitw.ac.in", name: "Dr. Kamala Kannan Dinesh", role: "instructor", inst: "Department of Management Studies, NITW", univ: defaultUnivId, team: -1, pass: "prof123" },
          { id: "usr_std1", email: "student1@nitw.ac.in", name: "Rahul Sharma (Team Lead)", role: "player", inst: "NIT Warangal MBA '26", univ: defaultUnivId, team: 0, pass: "student123" },
          { id: "usr_std2", email: "student2@nitw.ac.in", name: "Priya Patel", role: "player", inst: "NIT Warangal MBA '26", univ: defaultUnivId, team: 1, pass: "student123" },
          { id: "usr_std3", email: "student3@nitw.ac.in", name: "Ananya Roy", role: "player", inst: "NIT Warangal MBA '26", univ: defaultUnivId, team: 2, pass: "student123" }
        ];

        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO users (id, email, name, role, institution, universe_id, team_i, password, last_active_at, active_minutes, is_online)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0, 0)
        `);

        for (const u of initialUsers) {
          insertStmt.run(u.id, u.email, u.name, u.role, u.inst, u.univ, u.team, u.pass);
        }

        db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('db_seeded', 'true')").run();
      }
    } catch (_seedErr) {}
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
          if (lower.includes("delete from universes") && params[0]) {
            const target = params[0];
            memoryStore.universes.delete(target);
            for (const [key, u] of memoryStore.universes.entries()) {
              if (key === target || u.id === target) {
                memoryStore.universes.delete(key);
              }
            }
          }
          if (lower.includes("delete from users") && params.length > 0) {
            const targets = params.map((p) => String(p).toLowerCase().trim());
            for (const [key, u] of memoryStore.users.entries()) {
              const kLower = key.toLowerCase().trim();
              const idLower = (u.id || "").toLowerCase().trim();
              const emailLower = (u.email || "").toLowerCase().trim();
              if (
                targets.includes(kLower) ||
                targets.includes(idLower) ||
                targets.includes(emailLower)
              ) {
                memoryStore.users.delete(key);
              }
            }
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
      for (const [key, u] of memoryStore.universes.entries()) {
        if (key === id || u.id === id) {
          memoryStore.universes.delete(key);
        }
      }
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
    deleteUser: (target: string) => {
      if (!target) return;
      const tLower = target.toLowerCase().trim();
      memoryStore.users.delete(target);
      for (const [key, u] of memoryStore.users.entries()) {
        const kLower = key.toLowerCase().trim();
        const idLower = (u.id || "").toLowerCase().trim();
        const emailLower = (u.email || "").toLowerCase().trim();
        if (kLower === tLower || idLower === tLower || emailLower === tLower) {
          memoryStore.users.delete(key);
        }
      }
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
