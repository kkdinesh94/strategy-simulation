import { User, Universe } from "../types/auth";
import {
  fetchUsersFromD1,
  saveUserToD1,
  deleteUserFromD1,
  removeUserFromUniverseInD1,
  saveUsersBatchToD1,
  fetchUniversesFromD1,
  saveUniverseToD1,
  deleteUniverseFromD1,
  checkD1Status
} from "./cloudflareD1";
import { getInitialUsers, createInitialUniverse, saveUsers, saveUniverses } from "./authStore";

export type DatabaseProviderType = "cloudflare_d1";

const PROVIDER_STORAGE_KEY = "ev_venture_league_active_db_provider_v1";

export function getActiveDatabaseProvider(): DatabaseProviderType {
  try {
    const saved = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (saved === "cloudflare_d1") {
      return saved;
    }
  } catch (e) {
    console.error("Error reading db provider:", e);
  }
  return "cloudflare_d1";
}

export function setActiveDatabaseProvider(_provider: DatabaseProviderType) {
  try {
    localStorage.setItem(PROVIDER_STORAGE_KEY, "cloudflare_d1");
  } catch (e) {
    console.error("Error saving db provider:", e);
  }
}

export async function fetchUsersUnified(): Promise<User[]> {
  try {
    const d1Users = await fetchUsersFromD1();
    if (Array.isArray(d1Users)) {
      saveUsers(d1Users);
      return d1Users;
    }
  } catch (e) {
    console.warn("D1 users fetch error:", e);
  }

  try {
    const local = localStorage.getItem("ev_venture_league_users_v2");
    if (local) {
      const parsed: User[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}

  return [];
}

export async function saveUserUnified(user: User): Promise<void> {
  try {
    await saveUserToD1(user);
  } catch (e) {
    console.warn("D1 save user warning:", e);
  }

  try {
    const local = localStorage.getItem("ev_venture_league_users_v2");
    if (local) {
      const parsed: User[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const idx = parsed.findIndex((u) => u.id === user.id);
        if (idx >= 0) {
          parsed[idx] = user;
        } else {
          parsed.push(user);
        }
        localStorage.setItem("ev_venture_league_users_v2", JSON.stringify(parsed));
      }
    }
  } catch (e) {}
}

export async function deleteUserUnified(userId: string, userEmail?: string): Promise<void> {
  const deleted = await deleteUserFromD1(userId, userEmail);
  if (!deleted) {
    throw new Error("Cloudflare D1 did not delete a matching user.");
  }

  try {
    const local = localStorage.getItem("ev_venture_league_users_v2");
    if (local) {
      const parsed: User[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const uIdLower = (userId || "").toLowerCase().trim();
        const uEmailLower = (userEmail || "").toLowerCase().trim();
        const filtered = parsed.filter((u) => {
          const idMatch = (u.id || "").toLowerCase().trim() === uIdLower;
          const emailMatch =
            (u.email || "").toLowerCase().trim() === uIdLower ||
            (Boolean(uEmailLower) && (u.email || "").toLowerCase().trim() === uEmailLower);
          return !idMatch && !emailMatch;
        });
        localStorage.setItem("ev_venture_league_users_v2", JSON.stringify(filtered));
      }
    }
  } catch (e) {}

}

export async function removeUserFromUniverseUnified(user: User): Promise<void> {
  const detachedUser: User = {
    ...user,
    universeId: "",
    teamI: -1
  };

  try {
    const local = localStorage.getItem("ev_venture_league_users_v2");
    if (local) {
      const parsed: User[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const updated = parsed.map((u) => (u.id === user.id ? detachedUser : u));
        localStorage.setItem("ev_venture_league_users_v2", JSON.stringify(updated));
      }
    }
  } catch (e) {}

  await removeUserFromUniverseInD1(user.id);
}

export async function saveUsersBatchUnified(users: User[]): Promise<void> {
  saveUsers(users);
  await saveUsersBatchToD1(users);
}

export async function fetchUniversesUnified(): Promise<Universe[]> {
  try {
    const d1Universes = await fetchUniversesFromD1();
    if (Array.isArray(d1Universes) && d1Universes.length > 0) {
      saveUniverses(d1Universes);
      return d1Universes;
    }
  } catch (e) {
    console.warn("D1 universes fetch error:", e);
  }

  try {
    const local = localStorage.getItem("ev_venture_league_universes_v2");
    if (local) {
      const parsed: Universe[] = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const u of parsed) {
          await saveUniverseToD1(u);
        }
        return parsed;
      }
    }
  } catch (e) {}

  const defaultInit = [createInitialUniverse()];
  for (const u of defaultInit) {
    await saveUniverseToD1(u);
  }
  saveUniverses(defaultInit);
  return defaultInit;
}

export async function saveUniverseUnified(universe: Universe): Promise<void> {
  try {
    await saveUniverseToD1(universe);
  } catch (e) {
    console.warn("D1 save universe warning:", e);
  }

  try {
    const local = localStorage.getItem("ev_venture_league_universes_v2");
    if (local) {
      const parsed: Universe[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const idx = parsed.findIndex((u) => u.id === universe.id);
        if (idx >= 0) {
          parsed[idx] = universe;
        } else {
          parsed.push(universe);
        }
        localStorage.setItem("ev_venture_league_universes_v2", JSON.stringify(parsed));
      }
    }
  } catch (e) {}
}

export async function deleteUniverseUnified(universeId: string): Promise<void> {
  try {
    const local = localStorage.getItem("ev_venture_league_universes_v2");
    if (local) {
      const parsed: Universe[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((u) => u.id !== universeId);
        localStorage.setItem("ev_venture_league_universes_v2", JSON.stringify(filtered));
      }
    }
  } catch (e) {}

  await deleteUniverseFromD1(universeId);
}
