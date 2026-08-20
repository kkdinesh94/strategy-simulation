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
import { getInitialUsers, createInitialUniverse, saveUsers, saveUniverses } from "./authStore";

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
  // Cloudflare D1 is the primary default edge database
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
 * Fetch all users with Cloudflare D1 as the authoritative primary database.
 * If Cloudflare D1 is empty, seamlessly auto-imports/transfers from Firestore or seeds initial defaults.
 */
export async function fetchUsersUnified(): Promise<User[]> {
  const provider = getActiveDatabaseProvider();

  // If user explicitly chose Firebase-only
  if (provider === "firebase") {
    try {
      const fsUsers = await fetchUsersFromFirestore();
      if (fsUsers && fsUsers.length > 0) {
        saveUsers(fsUsers);
        return fsUsers;
      }
    } catch (e) {
      console.warn("Firestore fetch users error:", e);
    }
  }

  // 1. Primary: Fetch from Cloudflare D1
  try {
    const d1Users = await fetchUsersFromD1();
    if (Array.isArray(d1Users) && d1Users.length > 0) {
      // D1 has active data - it is the single source of truth
      saveUsers(d1Users);
      return d1Users;
    }
  } catch (e) {
    console.warn("D1 users fetch error:", e);
  }

  // 2. D1 is empty: Auto-import/transfer from Firestore if available
  console.log("Cloudflare D1 is empty. Checking Firestore for migration/transfer...");
  try {
    const firestoreUsers = await fetchUsersFromFirestore();
    if (Array.isArray(firestoreUsers) && firestoreUsers.length > 0) {
      console.log(`Auto-importing ${firestoreUsers.length} users from Firestore into Cloudflare D1...`);
      await saveUsersBatchToD1(firestoreUsers);
      saveUsers(firestoreUsers);
      return firestoreUsers;
    }
  } catch (e) {
    console.warn("Firestore fallback check error:", e);
  }

  // 3. Check local cache snapshot
  try {
    const local = localStorage.getItem("ev_venture_league_users_v2");
    if (local) {
      const parsed: User[] = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await saveUsersBatchToD1(parsed);
        return parsed;
      }
    }
  } catch (e) {}

  // 4. Initial fallback seed if database has never had users
  const defaultInit = getInitialUsers("univ_nitw_2026");
  await saveUsersBatchToD1(defaultInit);
  saveUsers(defaultInit);
  return defaultInit;
}

/**
 * Save / update user to Cloudflare D1 as primary and mirror to Firestore
 */
export async function saveUserUnified(user: User): Promise<void> {
  // 1. Save to D1 (primary backend)
  try {
    await saveUserToD1(user);
  } catch (e) {
    console.warn("D1 save user warning:", e);
  }

  // 2. Mirror to Firestore asynchronously
  saveUserToFirestore(user).catch(() => {});

  // 3. Update local cache
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

/**
 * Delete user permanently across Cloudflare D1, Firestore, and local state
 */
export async function deleteUserUnified(userId: string): Promise<void> {
  // 1. Remove from local storage immediately to prevent UI ghosting
  try {
    const local = localStorage.getItem("ev_venture_league_users_v2");
    if (local) {
      const parsed: User[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((u) => u.id !== userId);
        localStorage.setItem("ev_venture_league_users_v2", JSON.stringify(filtered));
      }
    }
  } catch (e) {}

  // 2. Delete from D1 (primary backend) and Firestore (mirror)
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

  // 1. Update local storage
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

  // 2. Execute on D1 and Firestore
  await Promise.allSettled([
    removeUserFromUniverseInD1(user.id),
    saveUserToFirestore(detachedUser)
  ]);
}

/**
 * Save users batch unified across both stores
 */
export async function saveUsersBatchUnified(users: User[]): Promise<void> {
  saveUsers(users);
  await Promise.allSettled([
    saveUsersBatchToD1(users),
    saveUsersBatchToFirestore(users)
  ]);
}

/**
 * Fetch all universes with Cloudflare D1 as the authoritative primary database.
 * If Cloudflare D1 is empty, auto-imports/transfers from Firestore or seeds initial defaults.
 */
export async function fetchUniversesUnified(): Promise<Universe[]> {
  const provider = getActiveDatabaseProvider();

  // If user explicitly chose Firebase-only
  if (provider === "firebase") {
    try {
      const fsUniverses = await fetchUniversesFromFirestore();
      if (fsUniverses && fsUniverses.length > 0) {
        saveUniverses(fsUniverses);
        return fsUniverses;
      }
    } catch (e) {
      console.warn("Firestore fetch universes error:", e);
    }
  }

  // 1. Primary: Fetch from Cloudflare D1
  try {
    const d1Universes = await fetchUniversesFromD1();
    if (Array.isArray(d1Universes) && d1Universes.length > 0) {
      saveUniverses(d1Universes);
      return d1Universes;
    }
  } catch (e) {
    console.warn("D1 universes fetch error:", e);
  }

  // 2. D1 is empty: Auto-import/transfer from Firestore if available
  console.log("Cloudflare D1 universes empty. Checking Firestore for migration/transfer...");
  try {
    const firestoreUniverses = await fetchUniversesFromFirestore();
    if (Array.isArray(firestoreUniverses) && firestoreUniverses.length > 0) {
      console.log(`Auto-importing ${firestoreUniverses.length} universe(s) from Firestore into Cloudflare D1...`);
      for (const u of firestoreUniverses) {
        await saveUniverseToD1(u);
      }
      saveUniverses(firestoreUniverses);
      return firestoreUniverses;
    }
  } catch (e) {
    console.warn("Firestore universes fallback error:", e);
  }

  // 3. Check local storage cache
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

  // 4. Initial default universe creation
  const defaultInit = [createInitialUniverse()];
  for (const u of defaultInit) {
    await saveUniverseToD1(u);
    saveUniverseToFirestore(u).catch(() => {});
  }
  saveUniverses(defaultInit);
  return defaultInit;
}

/**
 * Save universe to Cloudflare D1 as primary and mirror to Firestore
 */
export async function saveUniverseUnified(universe: Universe): Promise<void> {
  // 1. Save to D1
  try {
    await saveUniverseToD1(universe);
  } catch (e) {
    console.warn("D1 save universe warning:", e);
  }

  // 2. Mirror to Firestore
  saveUniverseToFirestore(universe).catch(() => {});

  // 3. Update local cache
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

/**
 * Delete universe permanently across Cloudflare D1, Firestore, and local state
 */
export async function deleteUniverseUnified(universeId: string): Promise<void> {
  // 1. Remove from local storage immediately
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

  // 2. Delete from D1 and Firestore
  await Promise.allSettled([
    deleteUniverseFromD1(universeId),
    deleteUniverseFromFirestore(universeId)
  ]);
}

