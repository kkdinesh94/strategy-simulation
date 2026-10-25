/**
 * Server-side merge rules for game-state saves (see src/lib/universePatch.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyUniversePatch, buildUniversePatch, PatchError, redactUniverseForTeam } from "../src/lib/universePatch";
import type { Universe } from "../src/types/auth";
import { league } from "./helpers";
import { initialQualityComponents } from "../src/lib/qualityProgramme";

const universe = (): Universe => ({ id: "u1", name: "Test", code: "TEST", instructorEmail: "prof@x", maxTeams: 10, maxMembersPerTeam: 8, gameState: league(), createdAt: "" });
const player = { role: "player" as const, teamI: 0, name: "Asha" };
const staff = { role: "instructor" as const, teamI: -1, name: "Prof" };

function expectError(fn: () => unknown, status: number) {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof PatchError, String(err));
    assert.equal((err as PatchError).status, status);
    return err as PatchError;
  }
  assert.fail(`expected a ${status} error`);
}

test("a client diff becomes a field-level patch", () => {
  const before = universe();
  const after = structuredClone(before);
  after.gameState.teams[0].dec.ad = 222;
  after.gameState.teams[0].vision = "New vision";
  const patch = buildUniversePatch(before, after)!;
  assert.deepEqual(patch.teams, { "0": { set: { vision: "New vision" }, dec: { ad: 222 } } });
});

test("players can change their own decisions but not engine-owned numbers", () => {
  const u = universe();
  applyUniversePatch(u, { universeId: "u1", quarter: 1, teams: { "0": { set: { cash: 999999, vision: "v" }, dec: { ad: 150 } } } }, player);
  assert.equal(u.gameState.teams[0].cash, 3200);
  assert.equal(u.gameState.teams[0].vision, "v");
  assert.equal(u.gameState.teams[0].dec.ad, 150);
});

test("players cannot touch another team, bots, or cohort settings", () => {
  expectError(() => applyUniversePatch(universe(), { universeId: "u1", quarter: 1, teams: { "1": { dec: { ad: 1 } } } }, player), 403);
  expectError(() => applyUniversePatch(universe(), { universeId: "u1", quarter: 1, meta: { name: "x" } }, player), 403);
});

test("a stale client is refused after the quarter advances", () => {
  expectError(() => applyUniversePatch(universe(), { universeId: "u1", quarter: 2, teams: { "0": { dec: { ad: 1 } } } }, player), 409);
});

test("locking runs the auditor on the server", () => {
  const err = expectError(() => applyUniversePatch(universe(), { universeId: "u1", quarter: 1, teams: { "0": { dec: { locked: true } } } }, player), 422);
  assert.ok(err.details!.some((d) => d.includes("charter")));
  const u = universe();
  applyUniversePatch(u, { universeId: "u1", quarter: 1, teams: { "0": { set: { vision: "v", mission: "m" }, dec: { locked: true } } } }, player);
  assert.equal(u.gameState.teams[0].dec.locked, true);
  assert.equal(u.gameState.teams[0].dec.lockedBy, "Asha");
  expectError(() => applyUniversePatch(u, { universeId: "u1", quarter: 1, teams: { "0": { dec: { ad: 5 } } } }, player), 409);
});

test("model edits keep server-side inventory and stamp new launches", () => {
  const u = universe();
  const t = u.gameState.teams[0];
  t.models[0].inv = 120;
  const incoming = [{ ...t.models[0], inv: 99999, price: 150000 }, { ...t.models[0], id: "Mnew", name: "New", inv: 500 }];
  applyUniversePatch(u, { universeId: "u1", quarter: 1, teams: { "0": { set: { models: incoming } } } }, player);
  assert.equal(t.models[0].inv, 120);
  assert.equal(t.models[0].price, 150000);
  assert.equal(t.models[1].inv, 0);
  assert.equal(t.models[1].launchedQ, 1);
});

test("staff can manage any team; players only see their own pending decisions", () => {
  const u = universe();
  applyUniversePatch(u, { universeId: "u1", quarter: 1, teams: { "3": { dec: { locked: true } } }, meta: { deadlineISO: "2026-01-01T00:00:00Z" } }, staff);
  assert.equal(u.gameState.teams[3].dec.locked, true);
  assert.equal(u.deadlineISO, "2026-01-01T00:00:00Z");
  const seen = redactUniverseForTeam(u, 0);
  assert.equal(seen.gameState.teams[1].dec.ad, 0);
  assert.deepEqual(seen.gameState.teams[1].dec.prod, {});
  assert.equal(seen.gameState.teams[0].dec.ad, u.gameState.teams[0].dec.ad);
});

test("quality steps are replayed on the server; edited figures and costs are ignored", () => {
  const u = universe();
  const forged = initialQualityComponents().map((c) => ({ ...c, inspectionActive: true, reliabilityImprovement: 90, warrantyCostPerQuarter: 0 }));
  applyUniversePatch(u, { universeId: "u1", quarter: 1, teams: { "0": { set: { qualityComponents: forged }, dec: { qualityActionCost: 0 } } } }, player);
  const team = u.gameState.teams[0];
  // Four inspections were bought at their catalog price; nothing else changed.
  assert.equal(team.dec.qualityActionCost, 8 + 6 + 5 + 4);
  assert.ok(team.qualityComponents!.every((c) => c.inspectionActive && c.reliabilityImprovement === 0));
  assert.equal(team.qualityComponents![0].warrantyCostPerQuarter, 15.3);

  // Several clicks merged into one debounced save still replay in order: study, then improve.
  const next = team.qualityComponents!.map((c, i) => i === 0 ? { ...c, varianceStudyDone: true, sourceActionStudyDone: true } : c);
  applyUniversePatch(u, { universeId: "u1", quarter: 1, teams: { "0": { set: { qualityComponents: next } } } }, player);
  assert.equal(team.dec.qualityActionCost, 23 + 12 + 25);
  assert.equal(team.qualityComponents![0].reliabilityImprovement, 12);
});

test("quality steps cannot be skipped", () => {
  const skip = initialQualityComponents().map((c, i) => i === 0 ? { ...c, varianceStudyDone: true } : c);
  expectError(() => applyUniversePatch(universe(), { universeId: "u1", quarter: 1, teams: { "0": { set: { qualityComponents: skip } } } }, player), 400);
});

test("spending decisions cannot be negative", () => {
  expectError(() => applyUniversePatch(universe(), { universeId: "u1", quarter: 1, teams: { "0": { dec: { ad: -5000 } } } }, player), 400);
  expectError(() => applyUniversePatch(universe(), { universeId: "u1", quarter: 1, teams: { "0": { dec: { prod: { m1: -10 } } } } }, player), 400);
  expectError(() => applyUniversePatch(universe(), { universeId: "u1", quarter: 1, teams: { "0": { dec: { quality: "lots" } } } }, player), 400);
});
