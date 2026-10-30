/**
 * HR compensation packages: they set both productivity and payroll cost, and a productive
 * workforce cannot conjure output beyond the production schedule.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HR_PACKAGES } from "../src/engine/catalog";
import { hrMults, lineEfficiencyOf, payrollOf, simulateQuarter } from "../src/engine/simulationEngine";
import { competent, league } from "./helpers";

test("the default package costs exactly what the legacy 100% pay index cost", () => {
  const st = league();
  const t = st.teams[0];
  const legacy = payrollOf(t, t.staff);
  t.hrCompensation = { sales: { ...HR_PACKAGES.sales }, production: { ...HR_PACKAGES.production } };
  const pkg = payrollOf(t, t.staff);
  assert.ok(Math.abs(pkg.sales - legacy.sales) < 1e-9 && Math.abs(pkg.plant - legacy.plant) < 1e-9);
});

test("a richer package costs more, and the quarter actually charges it", () => {
  const st = league();
  for (const t of st.teams) if (!t.isBot) competent(t, st);
  const rich = st.teams[0];
  const plain = st.teams[1];
  plain.hrCompensation = { sales: { ...HR_PACKAGES.sales }, production: { ...HR_PACKAGES.production } };
  rich.hrCompensation = { sales: { ...HR_PACKAGES.sales, salary: 7 }, production: { ...HR_PACKAGES.production, salary: 5 } };
  assert.ok(payrollOf(rich, 10).sales > payrollOf(plain, 10).sales * 1.8);
  simulateQuarter(st);
  const r = rich.hist[rich.hist.length - 1];
  assert.ok(Math.abs(r.salesPayroll - payrollOf(rich, rich.staff).sales) < 1e-6, "sales payroll charged from the package");
  assert.ok(Math.abs(r.plantPayroll - payrollOf(rich, rich.staff).plant) < 1e-6, "plant payroll charged from the package");
});

test("a productive plant never builds more than was scheduled", () => {
  const st = league();
  for (const t of st.teams) if (!t.isBot) competent(t, st);
  const t = st.teams[0];
  t.hrCompensation = { production: { ...HR_PACKAGES.production, salary: 10 } };
  assert.ok(hrMults(st, t).plant > 1, "pay above market raises productivity");
  assert.equal(lineEfficiencyOf(st, t).eff, 1);
  simulateQuarter(st);
  const r = t.hist[t.hist.length - 1];
  assert.ok(r.produced <= Object.values(t.dec.prod).reduce((a, b) => a + (b || 0), 0) + 1);
});
