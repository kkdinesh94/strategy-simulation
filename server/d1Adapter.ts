/**
 * Cloudflare D1-compatible async API over the local node:sqlite database, so the local
 * dev server runs the exact same API handler (functions/api/[[route]].ts) as production.
 */
import { getD1Database } from "./d1Store";

type Param = string | number | bigint | null | Uint8Array;

function toSqlite(value: unknown): Param {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string" || typeof value === "bigint" || value instanceof Uint8Array) return value;
  return JSON.stringify(value);
}

function plain(row: any) {
  return row ? { ...row } : null;
}

class LocalStatement {
  constructor(private db: any, readonly sql: string, private params: Param[] = []) {}

  bind(...params: unknown[]) {
    return new LocalStatement(this.db, this.sql, params.map(toSqlite));
  }

  async first(column?: string) {
    const row = plain(this.db.prepare(this.sql).get(...this.params));
    if (!row) return null;
    return column ? row[column] ?? null : row;
  }

  async all() {
    const results = this.db.prepare(this.sql).all(...this.params).map(plain);
    return { results, success: true, meta: {} };
  }

  async run() {
    const info = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: Number(info?.changes ?? 0), last_row_id: Number(info?.lastInsertRowid ?? 0) } };
  }

  runSync() {
    return this.db.prepare(this.sql).run(...this.params);
  }
}

/** Pass a node:sqlite DatabaseSync (tests use ":memory:"); defaults to the local dev database file. */
export function createLocalD1(db: any = getD1Database()) {
  return {
    prepare: (sql: string) => new LocalStatement(db, sql),
    exec: async (sql: string) => {
      db.exec(sql);
      return { count: 1, duration: 0 };
    },
    batch: async (statements: LocalStatement[]) => {
      db.exec("BEGIN");
      try {
        const out = statements.map((s) => {
          const info = s.runSync();
          return { success: true, meta: { changes: Number(info?.changes ?? 0) } };
        });
        db.exec("COMMIT");
        return out;
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    }
  };
}
