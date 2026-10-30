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

test("a cost event changes what each unit sold costs, and the books still balance", async () => {
  const { processQuarterState } = await import("../src/lib/processQuarter");
  const { simulateQuarter, debtOf, equityOf } = await import("../src/engine/simulationEngine");
  const { competent, league } = await import("./helpers");
  const play = (policies: PolicyEvent[]) => {
    const st = league();
    for (let q = 1; q <= 3; q += 1) {
      for (const t of st.teams) if (!t.isBot) competent(t, st);
      if (q < 3) simulateQuarter(st);
      else processQuarterState(st, "u", { policies });
    }
    return st.teams[0];
  };
  const tariff: PolicyEvent = { event_id: "t", quarter: 3, region: "Global", event_type: "Import Tariff", description: "", demand_impact_pct: 0, cost_impact_pct: 0.1, eligible_segment: null, eligibility_condition: null };
  const base = play([]);
  const hit = play([tariff]);
  const rb = base.hist[base.hist.length - 1];
  const rh = hit.hist[hit.hist.length - 1];
  assert.equal(rh.units, rb.units, "a pure cost event leaves demand alone");
  assert.ok(Math.abs(rh.cogs - rb.cogs * 1.1) < 0.5, `cogs ${rh.cogs.toFixed(1)} should be 10% above ${rb.cogs.toFixed(1)}`);
  assert.ok(Math.abs(hit.cash + rh.invValue + hit.ppe - (debtOf(hit) + equityOf(hit))) < 1, "balance sheet still balances");
});

test("a regional event touches only that region's share of the team's store footprint", async () => {
  const { policyRegionShare, policyCostImpact } = await import("../src/lib/processQuarter");
  const st = newState([{ name: "T", arch: "premium", isBot: false }], 12);
  const team = st.teams[0];
  team.storeCities = ["del", "bom", "blr", "ccu"]; // 480k, 520k, 400k, 220k units a year
  assert.ok(Math.abs(policyRegionShare(team, "Metro West (Mumbai/Pune)") - 520 / 1620) < 1e-9);
  assert.equal(policyRegionShare(team, "Global"), 1);
  const credit: PolicyEvent = { event_id: "c", quarter: 3, region: "Metro West (Mumbai/Pune)", event_type: "Tax Credit", description: "", demand_impact_pct: 0, cost_impact_pct: -0.05, eligible_segment: null, eligibility_condition: null };
  assert.ok(Math.abs(policyCostImpact(team, team.models[0], 3, [credit]) - -0.05 * (520 / 1620)) < 1e-9);
});
