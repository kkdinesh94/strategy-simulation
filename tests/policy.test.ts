/**
 * Policy events: the seeded events must actually reach teams that sell in their region and meet
 * their condition (they are written with labelled regions and with or without a "km" unit).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newState } from "../src/engine/simulationEngine";
import { inPolicyRegion, meetsEligibility, policyImpact, type PolicyEvent } from "../src/lib/processQuarter";

// The rows seeded by migration 0015, parsed from the SQL so the test follows the real data
const seeded: PolicyEvent[] = [...readFileSync(new URL("../d1/migrations/0015_policy_events.sql", import.meta.url), "utf8").matchAll(/\('([^']+)', (\d+), '([^']+)', '([^']+)', '([^']+)', ([\d.-]+), ([\d.-]+), (NULL|'[^']+'), (NULL|'[^']+')\)/g)].map((m) => ({
  event_id: m[1],
  quarter: Number(m[2]),
  region: m[3],
  event_type: m[4],
  description: m[5],
  demand_impact_pct: Number(m[6]),
  cost_impact_pct: Number(m[7]),
  eligible_segment: m[8] === "NULL" ? null : m[8].slice(1, -1),
  eligibility_condition: m[9] === "NULL" ? null : m[9].slice(1, -1)
}));

test("conditions parse with and without a unit", () => {
  const model: any = { cfg: { battery: "BC1" } };
  assert.equal(meetsEligibility(model, "battery_range >= 75km"), true);
  assert.equal(meetsEligibility(model, "battery_range >= 75"), true);
  assert.equal(meetsEligibility(model, "charging_score >= 7"), true);
  assert.equal(meetsEligibility({ cfg: { battery: "BC5" } }, "charging_score >= 7"), false);
});

test("every seeded event reaches a team with stores in the four home metros and a top battery", () => {
  assert.ok(seeded.length >= 4, "seeded events were parsed");
  const st = newState([{ name: "T", arch: "premium", isBot: false }], 12);
  const team = st.teams[0];
  // Only demand impacts are modelled; cost_impact_pct is not applied by the engine yet
  for (const event of seeded.filter((e) => e.demand_impact_pct !== 0)) {
    assert.ok(inPolicyRegion(team, event.region), `${event.event_id}: region "${event.region}" never matches a home-metro team`);
    const seg = event.eligible_segment || "S1";
    assert.ok(policyImpact(team, team.models[0], seg, event.quarter, [event]) !== 0, `${event.event_id} never applies`);
  }
});

test("a team without a store in the region gets nothing from a regional event", () => {
  const st = newState([{ name: "T", arch: "premium", isBot: false }], 12);
  const team = st.teams[0];
  team.storeCities = ["del"];
  assert.equal(inPolicyRegion(team, "Metro West (Mumbai/Pune)"), false);
  assert.equal(inPolicyRegion(team, "Metro North (Delhi-NCR)"), true);
  assert.equal(inPolicyRegion(team, "Global"), true);
});
