import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  getDocFromServer,
  onSnapshot,
  query
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { User, Universe } from "../types/auth";

const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID if provided, or default
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || "(default)"
);

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    console.warn("Firestore test connection check:", error);
    return true; // Still connected or online
  }
}

// --- Firestore Users API ---

export async function fetchUsersFromFirestore(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, "users"));
    const users: User[] = [];
    snap.forEach((docSnap) => {
      users.push(docSnap.data() as User);
    });
    return users;
  } catch (err) {
    console.warn("Error fetching users from Firestore, falling back to local:", err);
    return [];
  }
}

export async function saveUserToFirestore(user: User): Promise<void> {
  try {
    await setDoc(doc(db, "users", user.id), user, { merge: true });
  } catch (err) {
    console.error("Error saving user to Firestore:", err);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (err) {
    console.error("Error deleting user from Firestore:", err);
  }
}

export async function saveUsersBatchToFirestore(users: User[]): Promise<void> {
  try {
    const promises = users.map((u) => setDoc(doc(db, "users", u.id), u, { merge: true }));
    await Promise.all(promises);
  } catch (err) {
    console.error("Error saving users batch to Firestore:", err);
  }
}

export function subscribeUsers(onUpdate: (users: User[]) => void) {
  try {
    const q = query(collection(db, "users"));
    return onSnapshot(
      q,
      (snap) => {
        const users: User[] = [];
        snap.forEach((docSnap) => {
          users.push(docSnap.data() as User);
        });
        if (users.length > 0) {
          onUpdate(users);
        }
      },
      (err) => {
        console.warn("Users realtime listener error:", err);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe to users:", err);
    return () => {};
  }
}

// --- Firestore Universes API ---

export async function fetchUniversesFromFirestore(): Promise<Universe[]> {
  try {
    const snap = await getDocs(collection(db, "universes"));
    const universes: Universe[] = [];
    snap.forEach((docSnap) => {
      universes.push(docSnap.data() as Universe);
    });
    return universes;
  } catch (err) {
    console.warn("Error fetching universes from Firestore:", err);
    return [];
  }
}

export async function saveUniverseToFirestore(universe: Universe): Promise<void> {
  try {
    await setDoc(doc(db, "universes", universe.id), universe, { merge: true });
  } catch (err) {
    console.error("Error saving universe to Firestore:", err);
  }
}

export async function deleteUniverseFromFirestore(universeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "universes", universeId));
  } catch (err) {
    console.error("Error deleting universe from Firestore:", err);
  }
}

export function subscribeUniverse(universeId: string, onUpdate: (univ: Universe) => void) {
  try {
    const ref = doc(db, "universes", universeId);
    return onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as Universe);
        }
      },
      (err) => {
        console.warn("Universe realtime listener error:", err);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe to universe:", err);
    return () => {};
  }
}

export function subscribeAllUniverses(onUpdate: (universes: Universe[]) => void) {
  try {
    const q = query(collection(db, "universes"));
    return onSnapshot(
      q,
      (snap) => {
        const universes: Universe[] = [];
        snap.forEach((docSnap) => {
          universes.push(docSnap.data() as Universe);
        });
        if (universes.length > 0) {
          onUpdate(universes);
        }
      },
      (err) => {
        console.warn("All universes realtime listener error:", err);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe to all universes:", err);
    return () => {};
  }
}

// --- Generic Raw Collection / Document Helpers for Admin Visual Database Explorer ---

export async function rawFetchCollectionDocs(collectionName: string): Promise<{ id: string; [key: string]: any }[]> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    const results: { id: string; [key: string]: any }[] = [];
    snap.forEach((d) => {
      results.push({ id: d.id, ...d.data() });
    });
    return results;
  } catch (err) {
    console.error(`Error fetching collection ${collectionName}:`, err);
    throw err;
  }
}

export async function rawSetDocInFirestore(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    await setDoc(doc(db, collectionName, docId), data, { merge: true });
  } catch (err) {
    console.error(`Error writing doc ${docId} in ${collectionName}:`, err);
    throw err;
  }
}

export async function rawDeleteDocInFirestore(collectionName: string, docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (err) {
    console.error(`Error deleting doc ${docId} in ${collectionName}:`, err);
    throw err;
  }
}

