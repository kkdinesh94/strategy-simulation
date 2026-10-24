/**
 * Field-level patches for a universe's game state.
 *
 * Browsers never upload a whole game state any more. Each save sends only the
 * fields this client changed since its last copy, and the server merges them
 * into the stored state under per-role rules. That keeps two students (or a
 * student and the instructor) from overwriting each other's work, and stops a
 * player from editing anything outside their own team's decisions.
 */
import type { GameState, LicenceContract, TeamState } from "../types/simulation";
import type { Universe } from "../types/auth";
import { auditTeam, botDecideLicence } from "../engine/simulationEngine";

export interface TeamPatch {
  set?: Record<string, unknown>;
  dec?: Record<string, unknown>;
}

export interface UniversePatch {
  universeId: string;
  /** Quarter the client was looking at; a mismatch means the client is stale. */
  quarter: number;
  meta?: Partial<Pick<Universe, "name" | "code" | "instructorEmail" | "maxTeams" | "maxMembersPerTeam" | "deadlineISO">>;
  teams?: Record<string, TeamPatch>;
  contracts?: LicenceContract[];
}

const META_KEYS = ["name", "code", "instructorEmail", "maxTeams", "maxMembersPerTeam", "deadlineISO"] as const;

/** Team fields a player may edit for their own team. Everything else is computed by the engine. */
export const PLAYER_TEAM_FIELDS = new Set([
  "name", "tagline", "vision", "mission", "goals", "prim", "sec", "roles", "draft",
  "models", "hr", "hrCompensation", "qualityComponents", "charterDone"
]);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Builds a patch from the client's previous copy to its new copy. Returns null when
 * the change is structural (teams added/removed, quarter changed) and needs a full
 * staff replace instead.
 */
export function buildUniversePatch(prev: Universe, next: Universe): UniversePatch | null {
  const a = prev.gameState;
  const b = next.gameState;
  if (!a || !b || a.quarter !== b.quarter || a.teams.length !== b.teams.length || a.phase !== b.phase || !same(a.cfg, b.cfg)) return null;

  const patch: UniversePatch = { universeId: next.id, quarter: b.quarter };
  for (const key of META_KEYS) {
    if (!same(prev[key], next[key])) ((patch.meta ||= {}) as Record<string, unknown>)[key] = next[key];
  }
  b.teams.forEach((team, i) => {
    const old = a.teams[i];
    if (same(old, team)) return;
    const tp: TeamPatch = {};
    for (const key of new Set([...Object.keys(old), ...Object.keys(team)])) {
      if (key === "dec") {
        for (const dk of new Set([...Object.keys(old.dec || {}), ...Object.keys(team.dec || {})])) {
          if (!same((old.dec as any)?.[dk], (team.dec as any)?.[dk])) (tp.dec ||= {})[dk] = (team.dec as any)?.[dk] ?? null;
        }
      } else if (!same((old as any)[key], (team as any)[key])) {
        (tp.set ||= {})[key] = (team as any)[key] ?? null;
      }
    }
    if (tp.set || tp.dec) (patch.teams ||= {})[String(i)] = tp;
  });
  const changedContracts = b.contracts.filter((c) => !same(c, a.contracts.find((x) => x.id === c.id)));
  if (changedContracts.length) patch.contracts = changedContracts;
  return patch;
}

export function isEmptyPatch(p: UniversePatch): boolean {
  return !p.meta && !p.teams && !p.contracts;
}

export type PatchActor = { role: "player" | "instructor" | "admin"; teamI: number; name: string };

export class PatchError extends Error {
  constructor(message: string, public status: number, public details?: string[]) {
    super(message);
  }
}

/** Keeps engine-owned model fields (inventory, launch quarter) from the stored copy. */
function mergeModels(stored: TeamState, incoming: unknown, quarter: number): TeamState["models"] {
  if (!Array.isArray(incoming)) throw new PatchError("models must be a list.", 400);
  if (incoming.length < 1 || incoming.length > 3) throw new PatchError("A team must have between 1 and 3 models.", 400);
  return incoming.map((m: any) => {
    const prior = stored.models.find((x) => x.id === m?.id);
    const price = Number(m?.price);
    if (!m || typeof m.id !== "string" || !m.cfg || typeof m.cfg !== "object" || !Number.isFinite(price)) {
      throw new PatchError("Each model needs an id, a configuration and a price.", 400);
    }
    return {
      ...m,
      name: String(m.name || prior?.name || "Model").slice(0, 60),
      price: Math.round(price),
      inv: prior ? prior.inv || 0 : 0,
      launchedQ: prior ? prior.launchedQ : quarter,
      lastHash: prior ? prior.lastHash : null
    };
  });
}

/**
 * Applies a patch to a stored universe. Mutates and returns `universe`.
 * Players may only touch their own team's editable fields and their own licence offers;
 * staff may edit any team and the universe settings.
 */
export function applyUniversePatch(universe: Universe, patch: UniversePatch, actor: PatchActor): Universe {
  const st: GameState = universe.gameState;
  if (Number(patch.quarter) !== st.quarter) {
    throw new PatchError(`The game has moved on to Quarter ${st.quarter}. Reload to see the latest results.`, 409);
  }
  const staff = actor.role !== "player";

  if (patch.meta) {
    if (!staff) throw new PatchError("Only instructors can change universe settings.", 403);
    for (const key of META_KEYS) if (key in patch.meta) (universe as any)[key] = (patch.meta as any)[key];
  }

  for (const [key, tp] of Object.entries(patch.teams || {})) {
    const idx = Number(key);
    const team = st.teams[idx];
    if (!team) throw new PatchError(`Team ${idx + 1} does not exist.`, 400);
    if (!staff && idx !== actor.teamI) throw new PatchError("You can only change your own team's decisions.", 403);
    if (!staff && team.isBot) throw new PatchError("Bot teams are managed by the simulation.", 403);

    const wasLocked = Boolean(team.dec?.locked);
    const unlocking = tp.dec && "locked" in tp.dec && !tp.dec.locked;
    const onlyLockFields = Object.keys(tp.set || {}).length === 0 && Object.keys(tp.dec || {}).every((k) => k === "locked" || k === "lockedBy");
    if (!staff && wasLocked && !unlocking && !onlyLockFields) {
      throw new PatchError("Your decisions are locked. Unlock them before making changes.", 409);
    }

    for (const [field, value] of Object.entries(tp.set || {})) {
      if (!staff && !PLAYER_TEAM_FIELDS.has(field)) continue; // engine-owned (cash, hist, debt...) — ignore silently
      if (field === "models") team.models = mergeModels(team, value, st.quarter);
      else (team as any)[field] = value;
    }
    if (tp.dec) {
      team.dec = { ...team.dec, ...(tp.dec as any) };
      if (!staff && tp.dec.locked) team.dec.lockedBy = actor.name;
    }

    // Locking is validated by the same auditor the browser shows, so it cannot be skipped.
    if (!wasLocked && team.dec.locked && !staff) {
      const errors = auditTeam(st, team);
      if (errors.length) {
        team.dec.locked = false;
        throw new PatchError("The auditor blocked this lock-in.", 422, errors);
      }
    }
  }

  for (const incoming of patch.contracts || []) {
    const existing = st.contracts.find((c) => c.id === incoming.id);
    if (!existing) {
      if (!staff && incoming.sellerI !== actor.teamI) throw new PatchError("You can only offer your own technologies.", 403);
      const seller = st.teams[incoming.sellerI];
      const buyer = st.teams[incoming.buyerI];
      const fee = Number(incoming.fee);
      if (!seller || !buyer || seller === buyer) throw new PatchError("Invalid licence parties.", 400);
      if (!seller.techs.includes(incoming.techId)) throw new PatchError("The seller has not developed that technology.", 400);
      if (!Number.isFinite(fee) || fee < 1 || fee > 5000) throw new PatchError("Licence fee must be between Rs. 1 L and Rs. 5,000 L.", 400);
      const contract: LicenceContract = { id: st.contractSeq, sellerI: seller.i, buyerI: buyer.i, techId: incoming.techId, fee, status: "offered", qOffered: st.quarter };
      if (buyer.isBot) contract.status = botDecideLicence(buyer, contract) ? "accepted" : "rejected";
      st.contracts.push(contract);
      st.contractSeq += 1;
    } else if (existing.status === "offered" && (incoming.status === "accepted" || incoming.status === "rejected")) {
      if (!staff && existing.buyerI !== actor.teamI) throw new PatchError("Only the buyer can respond to a licence offer.", 403);
      existing.status = incoming.status;
    } else if (staff) {
      Object.assign(existing, incoming);
    }
  }
  return universe;
}

/** Hides other teams' pending (unsubmitted) decisions from a player. Results history stays visible. */
export function redactUniverseForTeam(universe: Universe, teamI: number): Universe {
  const st = universe.gameState;
  if (!st?.teams) return universe;
  return {
    ...universe,
    gameState: {
      ...st,
      teams: st.teams.map((t) =>
        t.i === teamI
          ? t
          : {
              ...t,
              draft: undefined,
              dec: {
                ...t.dec,
                prod: {},
                alloc: {},
                claims: [],
                ad: 0,
                hire: 0,
                newCentres: 0,
                newCentreCities: [],
                rndStartCost: 0,
                expBlocks: 0,
                bankTarget: 0,
                ltIssue: 0,
                shareIssue: 0,
                shareBuyback: 0,
                dividendPerShare: 0,
                vc: null,
                devCost: 0
              } as any
            }
      )
    }
  };
}
