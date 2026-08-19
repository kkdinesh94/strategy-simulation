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
  // Default to cloudflare_d1 with fallback
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
 * Fetch all users using active provider with intelligent fallback
 */
export async function fetchUsersUnified(): Promise<User[]> {
  const provider = getActiveDatabaseProvider();

  if (provider === "cloudflare_d1" || provider === "hybrid") {
    try {
      const d1Users = await fetchUsersFromD1();
      if (d1Users && d1Users.length > 0) {
        return d1Users;
      }
    } catch (e) {
      console.warn("D1 users fetch failed, trying Firestore fallback:", e);
    }
  }

  // Fallback to Firestore
  try {
    const firestoreUsers = await fetchUsersFromFirestore();
    if (firestoreUsers && firestoreUsers.length > 0) {
      // If in hybrid or D1 mode, background-sync to D1
      if (provider === "hybrid" || provider === "cloudflare_d1") {
        saveUsersBatchToD1(firestoreUsers).catch(() => {});
      }
      return firestoreUsers;
    }
  } catch (e) {
    console.warn("Firestore users fetch failed:", e);
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
 * Delete user unified
 */
export async function deleteUserUnified(userId: string): Promise<void> {
  const provider = getActiveDatabaseProvider();
  if (provider === "cloudflare_d1" || provider === "hybrid") {
    await deleteUserFromD1(userId);
  }
  if (provider === "firebase" || provider === "hybrid") {
    await deleteUserFromFirestore(userId);
  }
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
 * Fetch all universes using active provider with intelligent fallback
 */
export async function fetchUniversesUnified(): Promise<Universe[]> {
  const provider = getActiveDatabaseProvider();

  if (provider === "cloudflare_d1" || provider === "hybrid") {
    try {
      const d1Universes = await fetchUniversesFromD1();
      if (d1Universes && d1Universes.length > 0) {
        return d1Universes;
      }
    } catch (e) {
      console.warn("D1 universes fetch failed, trying Firestore fallback:", e);
    }
  }

  // Fallback to Firestore
  try {
    const firestoreUniverses = await fetchUniversesFromFirestore();
    if (firestoreUniverses && firestoreUniverses.length > 0) {
      if (provider === "hybrid" || provider === "cloudflare_d1") {
        firestoreUniverses.forEach((u) => saveUniverseToD1(u).catch(() => {}));
      }
      return firestoreUniverses;
    }
  } catch (e) {
    console.warn("Firestore universes fetch failed:", e);
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
 * Delete universe unified
 */
export async function deleteUniverseUnified(universeId: string): Promise<void> {
  const provider = getActiveDatabaseProvider();
  if (provider === "cloudflare_d1" || provider === "hybrid") {
    await deleteUniverseFromD1(universeId);
  }
  if (provider === "firebase" || provider === "hybrid") {
    await deleteUniverseFromFirestore(universeId);
  }
}
