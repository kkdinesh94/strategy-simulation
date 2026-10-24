/**
 * Plays full 12-quarter games against the real engine and checks that the economy is
 * winnable, punishes neglect, and keeps its books balanced. Run with `npm test`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { auditTeam, debtOf, equityOf, newState, simulateQuarter, cumBSC, leaderboardOf } from "../src/engine/simulationEngine";
import { ARCHES, competent, lateMargin, league, passive, playGame } from "./helpers";

test("every archetype's starting design passes the auditor once the charter is written", () => {
  const st = newState(ARCHES.map((arch, i) => ({ name: `T${i}`, arch, isBot: false })), 12);
  for (const t of st.teams) {
    t.vision = "v";
    t.mission = "m";
    assert.deepEqual(auditTeam(st, t), [], `${t.arch} starter is blocked`);
  }
});

test("books balance every quarter: assets = liabilities + equity, and cash moves by the cash-flow total", () => {
  playGame(competent, {
    onQuarter: (st, before) => {
      st.teams.forEach((t, i) => {
        const r = t.hist[t.hist.length - 1];
        const assets = t.cash + r.invValue + t.ppe;
        assert.ok(Math.abs(assets - (debtOf(t) + equityOf(t))) < 1, `Q${r.q} ${t.name}: balance sheet off by ${(assets - debtOf(t) - equityOf(t)).toFixed(1)}`);
        assert.ok(Math.abs(t.cash - before[i].cash - r.cashFlow!.net) < 0.6, `Q${r.q} ${t.name}: cash moved ${(t.cash - before[i].cash).toFixed(1)} but cash flow says ${r.cashFlow!.net}`);
      });
    }
  });
});

test("a competently run team in every archetype is profitable by the late game", () => {
  const st = playGame(competent);
  for (const t of st.teams.filter((x) => !x.isBot)) {
    assert.equal(t.bankrupt, false, `${t.arch} went bankrupt`);
    assert.ok(t.cumProfit > 0, `${t.arch} cumulative profit ${t.cumProfit.toFixed(0)}`);
    const margin = lateMargin(t);
    assert.ok(margin >= 0.06 && margin <= 0.25, `${t.arch} Q6–12 net margin ${(margin * 100).toFixed(1)}% outside 6–25%`);
  }
});

test("neglect is punished: teams that never adjust do worse than teams that manage", () => {
  const good = playGame(competent);
  const bad = playGame(passive);
  for (let i = 0; i < 4; i++) {
    assert.ok(good.teams[i].cumProfit > bad.teams[i].cumProfit + 1000, `${good.teams[i].arch}: managing should clearly beat neglect`);
  }
});

test("bots adapt each quarter and stay solvent", () => {
  const st = playGame(competent);
  for (const bot of st.teams.filter((t) => t.isBot)) {
    const units = bot.hist.map((r) => r.units);
    assert.ok(new Set(units.slice(1)).size > 2, `${bot.name} never changed its plan`);
    assert.equal(bot.bankrupt, false, `${bot.name} went bankrupt`);
  }
});

test("balanced scorecard is 0–100, separates teams, and drives the leaderboard", () => {
  const st = playGame(competent);
  for (const t of st.teams) for (const r of t.hist) assert.ok(r.bsc.total >= 0 && r.bsc.total <= 100, `BSC ${r.bsc.total}`);
  const scores = st.teams.map((t) => cumBSC(t));
  assert.ok(Math.max(...scores) - Math.min(...scores) > 10, "scorecard does not separate teams");
  const lb = leaderboardOf(st);
  assert.equal(lb[0].bscCum, Math.max(...scores));
});

test("R&D projects queued by a player actually start, finish, and are charged once", () => {
  const st = league();
  const t = st.teams[0];
  passive(t);
  (t.dec as any).rndStarts = [{ id: "T1", mode: "std" }];
  t.dec.rndStartCost = 0; // a client-sent total is ignored
  simulateQuarter(st);
  assert.equal(t.hist[0].rndSpend, 160, "standard T1 costs Rs. 160 L");
  assert.ok(t.rnd.some((p) => p.id === "T1"), "project did not start");
  simulateQuarter(st);
  simulateQuarter(st);
  assert.ok(t.techs.includes("T1"), "project did not complete after two quarters");
  assert.equal(t.hist[1].rndSpend, 0, "project charged twice");
});

test("charging and policy effects change real sales, and their costs hit profit", () => {
  const run = (boost: number, opex: number) => {
    const st = league();
    for (let q = 0; q < 3; q++) {
      for (const t of st.teams) if (!t.isBot) competent(t, st);
      simulateQuarter(st, { demandMult: (team) => (team.i === 1 ? boost : 1), extraOpex: { 1: opex } });
    }
    return st.teams[1].hist[2];
  };
  const base = run(1, 0);
  const boosted = run(1.3, 0);
  const costly = run(1, 50);
  assert.ok(boosted.units > base.units, "demand boost did not raise sales");
  assert.ok(Math.abs(base.profit - costly.profit - 50) < 1, "infrastructure opex not charged to profit");
});

test("battery packs return a year after sale and only once", () => {
  const st = playGame(competent);
  const t = st.teams[1];
  const byQ = (q: number) => t.hist.find((r) => r.q === q) as any;
  assert.equal(byQ(5).batteryReturns, Math.round(byQ(1).units * 0.1));
  assert.equal(byQ(6).batteryReturns, Math.round(byQ(2).units * 0.1));
  assert.equal(byQ(7).batteryReturns, Math.round(byQ(3).units * 0.1));
  assert.ok(byQ(7).batteryReturns > 0, "Q3 sales should produce returns in Q7");
});
