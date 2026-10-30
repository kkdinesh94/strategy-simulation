/**
 * API tests: the production handler (functions/api/[[route]].ts) running over an in-memory
 * SQLite database through the same D1 adapter the local dev server uses.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createLocalD1 } from "../server/d1Adapter";
import { initD1Tables } from "../server/d1Store";
import { createSession, hashPassword } from "../server/api/auth";
import { onRequest } from "../functions/api/[[route]]";
import { newState } from "../src/engine/simulationEngine";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");

const raw = new DatabaseSync(":memory:");
initD1Tables(raw);
const env: any = { DB: createLocalD1(raw) };

const tokens: Record<string, string> = {};

async function api(who: string | null, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (who) headers.Authorization = `Bearer ${tokens[who]}`;
  const request = new Request(`http://local${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const response = await onRequest({ request, env, params: {} });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

function addUniverse(id: string, instructorEmail: string) {
  const state = newState([
    { name: "Team 1", arch: "commuter", isBot: false },
    { name: "Team 2", arch: "budget", isBot: false },
    { name: "Team 3", arch: "premium", isBot: true }
  ], 12);
  raw.prepare("INSERT INTO universes (id, name, code, instructor_email, game_state) VALUES (?, ?, ?, ?, ?)")
    .run(id, id, `${id}-code`, instructorEmail, JSON.stringify(state));
}

async function addUser(key: string, role: string, universeId: string, teamI: number, email: string) {
  raw.prepare("INSERT INTO users (id, email, name, role, universe_id, team_i, password) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(key, email, key, role, universeId, teamI, await hashPassword("a-long-test-password"));
  tokens[key] = await createSession(env.DB, key);
}

before(async () => {
  // Request one public route first so the handler creates its auth tables.
  await api(null, "GET", "/api/health");
  addUniverse("cohortA", "profA@test.edu");
  addUniverse("cohortB", "profB@test.edu");
  await addUser("playerA", "player", "cohortA", 0, "a@test.edu");
  await addUser("playerB", "player", "cohortB", 0, "b@test.edu");
  await addUser("profA", "instructor", "cohortA", -1, "profA@test.edu");
});

test("anonymous callers are refused and user lists never carry passwords", async () => {
  assert.equal((await api(null, "GET", "/api/d1/users")).status, 401);
  const list = await api("profA", "GET", "/api/d1/users");
  assert.equal(list.status, 200);
  assert.ok(JSON.stringify(list.data).length > 2);
  assert.ok(!JSON.stringify(list.data).includes("pbkdf2"), "password hashes must not leave the server");
});

test("players cannot name another cohort or team", async () => {
  assert.equal((await api("playerA", "GET", "/api/fast-tests?universeId=cohortB&teamId=0&quarter=1")).status, 403);
  assert.equal((await api("playerA", "GET", "/api/fast-tests?teamId=1&quarter=1")).status, 403);
  assert.equal((await api("profA", "GET", "/api/decisions?universeId=cohortB&teamId=0&quarter=1")).status, 403);
});

test("fast-test results stay inside their cohort", async () => {
  const bought = await api("playerA", "POST", "/api/fast-tests", { universeId: "cohortA", teamId: 0, quarter: 1, region: "Global" });
  assert.equal(bought.status, 200);
  assert.ok(bought.data.results.length > 0);

  const own = await api("playerA", "GET", "/api/fast-tests?universeId=cohortA&teamId=0&quarter=1&region=Global");
  assert.ok(own.data.results.length > 0);
  // Team 0 in cohort B has the same team number but must see nothing.
  const rival = await api("playerB", "GET", "/api/fast-tests?teamId=0&quarter=1&region=Global");
  assert.equal(rival.status, 200);
  assert.equal(rival.data.results.length, 0);

  const checklistA = await api("playerA", "POST", "/api/team-data", { key: "checklist:fastTests", quarter: 1 });
  const checklistB = await api("playerB", "POST", "/api/team-data", { key: "checklist:fastTests", quarter: 1 });
  assert.equal(checklistA.data.results.length, 1);
  assert.equal(checklistB.data.results.length, 0);
});

test("decision history stays inside its cohort", async () => {
  const logged = await api("playerA", "POST", "/api/decisions", { universeId: "cohortA", teamId: 0, quarter: 1, changes: [{ fieldChanged: "ad", oldValue: 100, newValue: 250 }] });
  assert.equal(logged.status, 200);
  const own = await api("playerA", "GET", "/api/decisions?universeId=cohortA&teamId=0&quarter=1");
  assert.equal(own.data.decisions.length, 1);
  assert.equal(String(own.data.decisions[0].team_id), "0");
  const rival = await api("playerB", "GET", "/api/decisions?teamId=0&quarter=1");
  assert.equal(rival.data.decisions.length, 0);
  // The instructor of cohort A sees the entry when observing team 0.
  const staff = await api("profA", "GET", "/api/decisions?universeId=cohortA&teamId=0&quarter=1");
  assert.equal(staff.data.decisions.length, 1);
});

test("running a quarter in one cohort leaves the other cohort's reports alone", async () => {
  const run = await api("profA", "POST", "/api/process-quarter", { universeId: "cohortA", quarter: 1 });
  assert.equal(run.status, 200, JSON.stringify(run.data));
  const rival = await api("playerB", "GET", "/api/fast-tests?teamId=0&quarter=1&region=Global");
  assert.equal(rival.data.results.length, 0);
  // Players cannot run quarters.
  assert.equal((await api("playerB", "POST", "/api/process-quarter", { universeId: "cohortB", quarter: 1 })).status, 403);
});

test("the board advisor sees only the asking team's own decisions and is capped per quarter", async () => {
  assert.equal((await api("playerA", "POST", "/api/advisor", { prompt: "hi" })).status, 503, "no key configured");

  const sent: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: any) => {
    sent.push(String(init.body));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "**Cut price** on Model A." }] } }] }), { status: 200 });
  }) as any;
  env.GEMINI_API_KEY = "test-key";
  try {
    // Give the rival team a secret decision the advisor must not see.
    const row: any = raw.prepare("SELECT game_state FROM universes WHERE id = 'cohortA'").get();
    const state = JSON.parse(row.game_state);
    state.teams[1].dec.ad = 987654;
    raw.prepare("UPDATE universes SET game_state = ? WHERE id = 'cohortA'").run(JSON.stringify(state));

    const first = await api("playerA", "POST", "/api/advisor", { universeId: "cohortA", teamId: 0, prompt: "Price?" });
    assert.equal(first.status, 200);
    assert.match(first.data.advice, /Cut price/);
    assert.ok(!sent[0].includes("987654"), "a rival's pending decision reached the advisor");
    assert.ok(!sent[0].includes("test-key"), "the API key must travel in a header, not the body");
    assert.equal((await api("playerA", "POST", "/api/advisor", { universeId: "cohortB", teamId: 0 })).status, 403);

    for (let i = first.data.remaining; i > 0; i--) assert.equal((await api("playerA", "POST", "/api/advisor", { prompt: "again" })).status, 200);
    assert.equal((await api("playerA", "POST", "/api/advisor", { prompt: "one more" })).status, 429);
  } finally {
    globalThis.fetch = realFetch;
    delete env.GEMINI_API_KEY;
  }
});

test("chargers can only be planned for the current quarter, at the server's prices", async () => {
  const plan = (quarter: number) => ({ teamId: 0, quarter, investments: [{ region: "Delhi-NCR", charger_type: "DC Fast Charge", charger_count: 10, installation_cost: 0 }] });
  // A row dated to an earlier quarter would earn its boost without its installation ever being charged
  assert.equal((await api("playerA", "POST", "/api/charging-network", plan(0))).status, 400);
  const state = JSON.parse((raw.prepare("SELECT game_state FROM universes WHERE id = ?").get("cohortA") as any).game_state);
  assert.equal((await api("playerA", "POST", "/api/charging-network", plan(state.quarter + 3))).status, 409);
  assert.equal((await api("playerA", "POST", "/api/charging-network", plan(state.quarter))).status, 200);
  const saved = await api("playerA", "GET", `/api/charging-network?teamId=0&quarter=${state.quarter}`);
  const row = saved.data.investments.find((r: any) => r.region === "Delhi-NCR");
  assert.ok(row.installation_cost > 30, "installation is priced by the server, not taken from the request");
});
