/**
 * Server-side authentication primitives shared by the Cloudflare Pages function
 * and the local dev server. Uses only Web Crypto so it runs in both runtimes.
 *
 * Passwords are stored as "pbkdf2$<iterations>$<saltB64>$<hashB64>". Rows that
 * still hold a legacy plaintext password are accepted once and re-hashed on the
 * next successful login.
 */

export type Role = "player" | "instructor" | "admin";

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: Role;
  universeId: string;
  teamI: number;
}

// Cloudflare Workers caps PBKDF2 at 100k iterations.
const PBKDF2_ITERATIONS = 100_000;
const SESSION_TTL_DAYS = 14;

/** Default passwords that shipped in seed data; accounts still using one are asked to change it. */
export const KNOWN_DEFAULT_PASSWORDS = ["admin123", "prof123", "student123"];

const enc = new TextEncoder();

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return b64(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${await pbkdf2(password, salt, PBKDF2_ITERATIONS)}`;
}

export function isHashed(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith("pbkdf2$");
}

/** Returns whether the password matches and whether the stored value should be upgraded to a hash. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };
  if (!isHashed(stored)) return { ok: timingSafeEqual(password, stored), needsRehash: true };
  const [, iter, salt, hash] = stored.split("$");
  const candidate = await pbkdf2(password, unb64(salt), Number(iter));
  return { ok: timingSafeEqual(candidate, hash), needsRehash: Number(iter) !== PBKDF2_ITERATIONS };
}

export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 200) return "Password is too long.";
  if (KNOWN_DEFAULT_PASSWORDS.includes(password)) return "Choose a password other than the default one.";
  return null;
}

async function tokenHash(token: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(token)));
}

export async function ensureAuthTables(db: any): Promise<void> {
  await db.exec("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL)");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)");
}

export async function createSession(db: any, userId: string): Promise<string> {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000).toISOString();
  await db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await tokenHash(token), userId, expires).run();
  return token;
}

export async function deleteSession(db: any, token: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await tokenHash(token)).run();
}

export async function deleteSessionsForUser(db: any, userId: string, exceptToken?: string): Promise<void> {
  if (exceptToken) {
    await db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").bind(userId, await tokenHash(exceptToken)).run();
  } else {
    await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+([a-f0-9]{64})$/i);
  return match ? match[1] : null;
}

export async function getSession(db: any, request: Request): Promise<Session | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const row: any = await db
    .prepare("SELECT u.id, u.email, u.name, u.role, u.universe_id, u.team_i, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?")
    .bind(await tokenHash(token))
    .first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await deleteSession(db, token);
    return null;
  }
  return {
    userId: row.id,
    email: row.email,
    name: row.name,
    role: (["player", "instructor", "admin"].includes(row.role) ? row.role : "player") as Role,
    universeId: row.universe_id || "",
    teamI: Number(row.team_i ?? -1)
  };
}

export const isStaff = (s: Session | null): boolean => !!s && (s.role === "instructor" || s.role === "admin");

/** Shape of a user record that is safe to send to a browser. */
export function publicUser(row: any, opts: { includeEmail?: boolean } = {}) {
  return {
    id: row.id,
    email: opts.includeEmail === false ? "" : row.email,
    name: row.name,
    role: row.role,
    institution: row.institution || "",
    universeId: row.universe_id ?? row.universeId ?? "",
    teamI: Number(row.team_i ?? row.teamI ?? -1),
    lastActiveAt: row.last_active_at ?? row.lastActiveAt ?? null,
    activeMinutes: Number(row.active_minutes ?? row.activeMinutes ?? 0),
    isOnline: Boolean(row.is_online ?? row.isOnline)
  };
}

/** Universe ids an instructor may manage: ones assigned to their email plus their own home universe. */
export async function staffUniverseIds(db: any, s: Session): Promise<Set<string> | "all"> {
  if (s.role === "admin") return "all";
  const rows: any = await db.prepare("SELECT id FROM universes WHERE LOWER(instructor_email) = LOWER(?) OR id = ?").bind(s.email, s.universeId).all();
  return new Set(((rows.results || []) as any[]).map((r) => String(r.id)));
}

export async function canManageUniverse(db: any, s: Session, universeId: string): Promise<boolean> {
  if (!isStaff(s)) return false;
  const ids = await staffUniverseIds(db, s);
  return ids === "all" || ids.has(universeId);
}
