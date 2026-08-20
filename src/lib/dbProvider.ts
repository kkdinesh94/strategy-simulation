import { User, Universe } from "../types/auth";
import {
  fetchUsersFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveUsersBatchToFirestore,
  fetchUniversesFromFirestore,
  saveUniverseToFirestore,
  deleteUniverseFromFirestore,
  subscribeUniverse as subscribeUniverseFirestore,
  subscribeUsers as subscribeUsersFirestore,
  subscribeAllUniverses as subscribeAllUniversesFirestore
} from "./firebase";
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

export type DatabaseProviderType = "cloudflare_d1" | "firebase" | "hybrid";

const PROVIDER_STORAGE_KEY = "ev_venture_league_active_db_provider_v1";

export function getActiveDatabaseProvider(): DatabaseProviderType {
  try {
    const saved = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (saved === "cloudflare_d1" || saved === "firebase" || saved === "hybrid") {
      return saved;
    }
  } catch (e) {
    console.error("Error reading db provider:", e);
  }
  // Default to cloudflare_d1
  return "cloudflare_d1";
}

export function setActiveDatabaseProvider(provider: DatabaseProviderType) {
  try {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  } catch (e) {
    console.error("Error saving db provider:", e);
  }
}

/**
 * Fetch all users using active provider with clean error handling
 */
export async function fetchUsersUnified(): Promise<User[]> {
  const provider = getActiveDatabaseProvider();

  if (provider === "cloudflare_d1" || provider === "hybrid") {
    try {
      const d1Users = await fetchUsersFromD1();
      // If D1 responded (even if empty []), return D1 state directly
      if (Array.isArray(d1Users)) {
        return d1Users;
      }
    } catch (e) {
      console.warn("D1 users fetch error:", e);
    }
  }

  if (provider === "firebase") {
    try {
      const firestoreUsers = await fetchUsersFromFirestore();
      return firestoreUsers || [];
    } catch (e) {
      console.warn("Firestore users fetch failed:", e);
    }
  }

  return [];
}

/**
 * Save user to active provider (or both in hybrid mode)
 */
export async function saveUserUnified(user: User): Promise<void> {
  const provider = getActiveDatabaseProvider();

  if (provider === "cloudflare_d1") {
    await saveUserToD1(user);
    // Silent background mirror to Firestore
    saveUserToFirestore(user).catch(() => {});
  } else if (provider === "firebase") {
    await saveUserToFirestore(user);
  } else {
    // Hybrid: writes to both
    await Promise.allSettled([
      saveUserToD1(user),
      saveUserToFirestore(user)
    ]);
  }
}

/**
 * Delete user unified across D1 and Firestore
 */
export async function deleteUserUnified(userId: string): Promise<void> {
  await Promise.allSettled([
    deleteUserFromD1(userId),
    deleteUserFromFirestore(userId)
  ]);
}

/**
 * Remove / Detach user from universe
 */
export async function removeUserFromUniverseUnified(user: User): Promise<void> {
  const detachedUser: User = {
    ...user,
    universeId: "",
    teamI: -1
  };
  await Promise.allSettled([
    removeUserFromUniverseInD1(user.id),
    saveUserToFirestore(detachedUser)
  ]);
}

/**
 * Save users batch unified
 */
export async function saveUsersBatchUnified(users: User[]): Promise<void> {
  const provider = getActiveDatabaseProvider();
  if (provider === "cloudflare_d1" || provider === "hybrid") {
    await saveUsersBatchToD1(users);
  }
  if (provider === "firebase" || provider === "hybrid") {
    await saveUsersBatchToFirestore(users);
  }
}

/**
 * Fetch all universes using active provider
 */
export async function fetchUniversesUnified(): Promise<Universe[]> {
  const provider = getActiveDatabaseProvider();

  if (provider === "cloudflare_d1" || provider === "hybrid") {
    try {
      const d1Universes = await fetchUniversesFromD1();
      // If D1 returned an array (even if 0 items), honor it directly
      if (Array.isArray(d1Universes)) {
        return d1Universes;
      }
    } catch (e) {
      console.warn("D1 universes fetch error:", e);
    }
  }

  if (provider === "firebase") {
    try {
      const firestoreUniverses = await fetchUniversesFromFirestore();
      return firestoreUniverses || [];
    } catch (e) {
      console.warn("Firestore universes fetch failed:", e);
    }
  }

  return [];
}

/**
 * Save universe to active provider
 */
export async function saveUniverseUnified(universe: Universe): Promise<void> {
  const provider = getActiveDatabaseProvider();

  if (provider === "cloudflare_d1") {
    await saveUniverseToD1(universe);
    // Silent background mirror to Firestore
    saveUniverseToFirestore(universe).catch(() => {});
  } else if (provider === "firebase") {
    await saveUniverseToFirestore(universe);
  } else {
    // Hybrid
    await Promise.allSettled([
      saveUniverseToD1(universe),
      saveUniverseToFirestore(universe)
    ]);
  }
}

/**
 * Delete universe unified across both D1 and Firestore
 */
export async function deleteUniverseUnified(universeId: string): Promise<void> {
  await Promise.allSettled([
    deleteUniverseFromD1(universeId),
    deleteUniverseFromFirestore(universeId)
  ]);
}
