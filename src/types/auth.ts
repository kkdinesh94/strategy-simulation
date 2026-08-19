import { GameState } from "./simulation";

export type UserRole = "player" | "instructor" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institution: string;
  universeId: string;
  teamI: number; // 0 to 9 (Team 1 to Team 10)
  password?: string;
  lastActiveAt?: string; // ISO timestamp
  activeMinutes?: number; // total active time spent in minutes
  isOnline?: boolean;
}

export interface Universe {
  id: string;
  name: string;
  code: string;
  instructorEmail: string;
  maxTeams: number; // default 10
  maxMembersPerTeam: number; // default 8
  gameState: GameState;
  createdAt: string;
  deadlineISO?: string | null;
}

export interface RosterMember {
  user: User;
  teamName: string;
  teamI: number;
}
