/**
 * Session handling for the browser. The session token lives in localStorage and is
 * attached to every same-origin /api request by a fetch wrapper, so existing
 * fetch("/api/...") calls across the app are authenticated without changes.
 */
import type { User } from "../types/auth";

const TOKEN_KEY = "ev_venture_league_session_v1";

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: the session lasts for this page only */
  }
}

let installed = false;

/** Wraps window.fetch once so /api calls carry the bearer token and 401s end the session. */
export function installAuthFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isApi = url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);
    if (!isApi) return original(input, init);
    const token = getSessionToken();
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    const response = await original(input, { ...init, headers });
    if (response.status === 401 && token && !url.includes("/api/auth/login")) {
      setSessionToken(null);
      window.dispatchEvent(new CustomEvent("ev:unauthorized"));
    }
    return response;
  };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) }
  });
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`) as Error & { status?: number; details?: string[] };
    error.status = response.status;
    error.details = payload?.details;
    throw error;
  }
  return payload as T;
}

export interface CohortInfo {
  universeId: string;
  name: string;
  maxMembersPerTeam: number;
  teams: { i: number; name: string; members: number }[];
}

export const authApi = {
  async login(email: string, password: string) {
    const out = await call<{ token: string; user: User; mustChangePassword: boolean }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setSessionToken(out.token);
    return out;
  },
  async register(input: { name: string; email: string; password: string; code: string; teamI: number; institution?: string }) {
    const out = await call<{ token: string; user: User }>("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
    setSessionToken(out.token);
    return out;
  },
  cohort(code: string) {
    return call<CohortInfo>(`/api/auth/cohort?code=${encodeURIComponent(code.trim())}`);
  },
  me() {
    return call<{ user: User }>("/api/auth/me");
  },
  async logout() {
    try {
      await call("/api/auth/logout", { method: "POST" });
    } finally {
      setSessionToken(null);
    }
  },
  changePassword(currentPassword: string, newPassword: string) {
    return call<{ success: true }>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
  },
  resetPassword(userId: string, newPassword: string) {
    return call<{ success: true }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ userId, newPassword }) });
  }
};

/** Runs a named server query (see server/api/teamData.ts) for the signed-in team. */
export async function teamData<T = any>(key: string, params: { universeId: string; teamId: number | string; quarter: number; payload?: unknown }) {
  try {
    const out = await call<{ success: boolean; results: T[] }>("/api/team-data", {
      method: "POST",
      body: JSON.stringify({ key, universeId: params.universeId, teamId: Number(params.teamId), quarter: params.quarter, payload: params.payload })
    });
    return { success: true as const, results: out.results || [] };
  } catch (err: any) {
    return { success: false as const, results: [] as T[], error: err.message as string };
  }
}

export type SaveErrorDetail = { status: number; message: string; details: string[] };

/** Broadcast when a background save of the game state is refused, so the app can react. */
export function emitSaveError(detail: SaveErrorDetail) {
  window.dispatchEvent(new CustomEvent<SaveErrorDetail>("ev:save-error", { detail }));
}
