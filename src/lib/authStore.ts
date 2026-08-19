import { User, Universe, UserRole } from "../types/auth";
import { GameState } from "../types/simulation";
import { newState } from "../engine/simulationEngine";
import {
  saveUsersBatchToFirestore,
  saveUniverseToFirestore,
  fetchUsersFromFirestore,
  fetchUniversesFromFirestore
} from "./firebase";

const USERS_STORAGE_KEY = "ev_venture_league_users_v2";
const UNIVERSES_STORAGE_KEY = "ev_venture_league_universes_v2";
const CURRENT_USER_KEY = "ev_venture_league_current_user_v2";
const ACTIVE_UNIVERSE_ID_KEY = "ev_venture_league_active_univ_id_v2";

export const DEFAULT_10_TEAMS = [
  { name: "Aurora EV Motors", arch: "premium", isBot: false },
  { name: "CityRun Mobility", arch: "commuter", isBot: false },
  { name: "Zip GenZ Scooters", arch: "budget", isBot: false },
  { name: "HaulEV Fleet Solutions", arch: "fleeteco", isBot: false },
  { name: "VoltRide Mobility", arch: "commuter", isBot: false },
  { name: "EcoSpeed India", arch: "budget", isBot: false },
  { name: "Nexus Electric", arch: "premium", isBot: false },
  { name: "Kinetic Pulse EV", arch: "commuter", isBot: false },
  { name: "Zenith e-Motion", arch: "premium", isBot: false },
  { name: "TurboGrid Motors", arch: "fleeteco", isBot: false }
];

export function createInitialUniverse(id = "univ_nitw_2026", name = "EV League - NIT Warangal MBA 2026", code = "NITW2026"): Universe {
  const initialGameState: GameState = newState(
    DEFAULT_10_TEAMS,
    12,    // 12 quarters
    25000, // initial quarterly market size
    5      // VC opens Q5
  );

  return {
    id,
    name,
    code,
    instructorEmail: "instructor@nitw.ac.in",
    maxTeams: 10,
    maxMembersPerTeam: 8,
    gameState: initialGameState,
    createdAt: new Date().toISOString()
  };
}

export function getInitialUsers(universeId: string): User[] {
  return [
    {
      id: "usr_admin",
      email: "admin@evleague.edu",
      name: "Dr. System Administrator",
      role: "admin",
      institution: "NIT Warangal",
      universeId,
      teamI: -1,
      password: "admin123"
    },
    {
      id: "usr_prof",
      email: "instructor@nitw.ac.in",
      name: "Dr. Kamala Kannan Dinesh",
      role: "instructor",
      institution: "Department of Management Studies, NITW",
      universeId,
      teamI: -1,
      password: "prof123"
    },
    {
      id: "usr_std1",
      email: "student1@nitw.ac.in",
      name: "Rahul Sharma (Team Lead)",
      role: "player",
      institution: "NIT Warangal MBA '26",
      universeId,
      teamI: 0, // Team 1: Aurora EV Motors
      password: "student123"
    },
    {
      id: "usr_std2",
      email: "student2@nitw.ac.in",
      name: "Priya Patel",
      role: "player",
      institution: "NIT Warangal MBA '26",
      universeId,
      teamI: 1, // Team 2: CityRun Mobility
      password: "student123"
    },
    {
      id: "usr_std3",
      email: "student3@nitw.ac.in",
      name: "Ananya Roy",
      role: "player",
      institution: "NIT Warangal MBA '26",
      universeId,
      teamI: 2, // Team 3: Zip GenZ
      password: "student123"
    }
  ];
}

export function loadUsers(): User[] {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    if (data) {
      const parsed: User[] = JSON.parse(data);
      // Ensure admins and instructors have teamI = -1
      return parsed.map((u) => {
        if (u.role === "admin" || u.role === "instructor") {
          return { ...u, teamI: -1 };
        }
        return u;
      });
    }
  } catch (e) {
    console.error("Failed to load users from localStorage", e);
  }
  const defaultUniv = loadActiveUniverse();
  const init = getInitialUsers(defaultUniv.id);
  saveUsers(init);
  return init;
}

export function saveUsersLocal(users: User[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save users local", e);
  }
}

export function saveUsers(users: User[]) {
  saveUsersLocal(users);
}

export function loadUniverses(): Universe[] {
  try {
    const data = localStorage.getItem(UNIVERSES_STORAGE_KEY);
    if (data) {
      const parsed: Universe[] = JSON.parse(data);
      if (parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to load universes", e);
  }
  const init = [createInitialUniverse()];
  saveUniverses(init);
  return init;
}

export function saveUniverses(universes: Universe[]) {
  try {
    localStorage.setItem(UNIVERSES_STORAGE_KEY, JSON.stringify(universes));
  } catch (e) {
    console.error("Failed to save universes", e);
  }
}

export function loadActiveUniverse(): Universe {
  const universes = loadUniverses();
  const activeId = localStorage.getItem(ACTIVE_UNIVERSE_ID_KEY);
  if (activeId) {
    const found = universes.find((u) => u.id === activeId);
    if (found) return found;
  }
  return universes[0] || createInitialUniverse();
}

export function saveActiveUniverse(universe: Universe) {
  const universes = loadUniverses();
  const idx = universes.findIndex((u) => u.id === universe.id);
  if (idx >= 0) {
    universes[idx] = universe;
  } else {
    universes.push(universe);
  }
  saveUniverses(universes);
  localStorage.setItem(ACTIVE_UNIVERSE_ID_KEY, universe.id);
  // Sync to Firestore
  saveUniverseToFirestore(universe);
}

export function loadCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load current user", e);
  }
  return null;
}

export function saveCurrentUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error("Failed to save current user", e);
  }
}

// Check team capacity (Max 8 per team)
export function getTeamMembersCount(users: User[], universeId: string, teamI: number): number {
  return users.filter((u) => u.universeId === universeId && u.role === "player" && u.teamI === teamI).length;
}

export function canJoinTeam(users: User[], universeId: string, teamI: number, maxPerTeam = 8): boolean {
  const count = getTeamMembersCount(users, universeId, teamI);
  return count < maxPerTeam;
}

export function getAccessibleUniverses(currentUser: User | null, allUniverses: Universe[]): Universe[] {
  if (!allUniverses || allUniverses.length === 0) return [];
  if (!currentUser) return allUniverses;
  if (currentUser.role === "admin") return allUniverses;

  if (currentUser.role === "instructor") {
    const userEmail = currentUser.email.toLowerCase().trim();
    const assigned = allUniverses.filter(
      (u) =>
        (u.instructorEmail && u.instructorEmail.toLowerCase().trim() === userEmail) ||
        u.id === currentUser.universeId
    );
    return assigned.length > 0 ? assigned : allUniverses;
  }

  // Players / Students
  const userUniv = allUniverses.filter((u) => u.id === currentUser.universeId);
  return userUniv.length > 0 ? userUniv : allUniverses;
}

