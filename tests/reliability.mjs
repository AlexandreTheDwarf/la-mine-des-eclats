import assert from "node:assert/strict";
import test from "node:test";
import {
  SAVE_KEY, MAX_OFFLINE_SECONDS, advanceGameTime, createInitialState,
  parseGameSave, gameReducer, encodeSave, decodeSave,
  INDUSTRY_RECIPES, industrySpeed,
} from "../src/game.ts";
import { BACKUP_KEY, GameSaveStore } from "../src/saveStore.ts";
import { CREW, crewAdjustedCost, crewXpForRoute } from "../src/crew.ts";
import { RIFT_ROUTES, riftExpeditionCost, riftOriginReady } from "../src/riftNetwork.ts";

const START = 1_000_000;
const atStart = () => ({ ...createInitialState(), lastSimulatedAt: START, lastSavedAt: START });
function travelling() {
  return {
    ...atStart(),
    expeditions: 3, maxDepth: 360, shards: 10_000_000,
    grandWorks: { freight: 3, furnace: 3, bureau: 2 },
    industryMaterials: { gears: 500, alloy: 500, prism: 500 },
    activeRiftExpedition: { routeId: "lanterns", approachId: "survey", crewId: "mica", duration: 270, remaining: 270 },
    productionQueue: [{ recipeId: "gears", duration: 20, remaining: 20 }],
  };
}
class MemoryStorage {
  values = new Map();
  failRead = false;
  failWrite = false;
  getItem(key) { if (this.failRead) throw new Error("SecurityError"); return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.failWrite) throw new Error("QuotaExceededError"); this.values.set(key, value); }
}

test("a suspended tab pays industry and travel once, including rest after arrival", () => {
  const state = advanceGameTime(travelling(), START + 600_000);
  assert.equal(state.activeRiftExpedition, null);
  assert.equal(state.riftExpeditionsCompleted, 1);
  assert.equal(state.completedBatches, 1);
  assert.equal(state.crewXp.mica, 35);
  assert.ok(Math.abs(state.crewFatigue.mica - (40 - 330 / 90)) < 1e-9);
  assert.equal(state.offlineReport.expeditions, 1);
  assert.equal(state.offlineReport.batches, 1);
  assert.equal(advanceGameTime(state, START + 600_000), state);
  const reloaded = advanceGameTime(parseGameSave(JSON.stringify(state)), START + 600_000, true);
  assert.equal(reloaded.riftExpeditionsCompleted, 1);
  assert.equal(reloaded.crewXp.mica, 35);
});

test("saving does not consume time that has not yet been simulated", () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, JSON.stringify(travelling()));
  const store = new GameSaveStore(() => storage);
  const state = store.load(START);
  assert.equal(store.write(state, START + 600_000), true);
  const restored = new GameSaveStore(() => storage).load(START + 600_000);
  assert.equal(restored.riftExpeditionsCompleted, 1);
  assert.equal(restored.activeRiftExpedition, null);
});

test("live callback grouping preserves mining and subsecond remainders", () => {
  let state = atStart();
  state.machines.drill = 1;
  const together = advanceGameTime(state, START + 4_500);
  let separate = state;
  for (let i = 1; i <= 4; i++) separate = advanceGameTime(separate, START + i * 1_000);
  assert.equal(together.rockHp, separate.rockHp);
  assert.equal(together.shards, separate.shards);
  assert.equal(together.lastSimulatedAt, START + 4_000);
  assert.equal(advanceGameTime(together, START + 4_999), together);
});

test("eight-hour cap is consumed once and backwards clocks grant nothing", () => {
  let state = atStart();
  state.machines.drill = 1;
  const later = START + 48 * 3_600_000;
  const capped = advanceGameTime(state, later, true);
  assert.equal(capped.offlineReport.seconds, MAX_OFFLINE_SECONDS);
  assert.equal(capped.lastSimulatedAt, later);
  assert.equal(advanceGameTime(capped, later), capped);
  const backwards = advanceGameTime(capped, later - 1_000);
  assert.equal(backwards.shards, capped.shards);
  assert.equal(backwards.lastSimulatedAt, later - 1_000);
});

test("old saves preserve resources, active paid jobs and the already earned signal", () => {
  const old = { ...travelling(), version: 11, surveyData: 32 };
  delete old.lastSimulatedAt;
  delete old.originSignalFound;
  const migrated = parseGameSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.lastSimulatedAt, old.lastSavedAt);
  assert.equal(migrated.originSignalFound, true);
  assert.equal(migrated.shards, old.shards);
  assert.deepEqual(migrated.activeRiftExpedition, old.activeRiftExpedition);
  assert.deepEqual(migrated.productionQueue, old.productionQueue);
  assert.equal(decodeSave(encodeSave(migrated)).originSignalFound, true);
});

test("new origin requires all five discoveries even with abundant cartography", () => {
  const onlyLanterns = { ...atStart().riftRouteCompletions, lanterns: 100 };
  assert.equal(riftOriginReady(1_000, onlyLanterns), false);
  const all = Object.fromEntries(RIFT_ROUTES.map((route) => [route.id, 1]));
  assert.equal(riftOriginReady(31, all), false);
  assert.equal(riftOriginReady(32, all), true);
  let state = { ...travelling(), surveyData: 40, riftRouteCompletions: onlyLanterns };
  state = advanceGameTime(state, START + 300_000);
  assert.equal(state.originSignalFound, false);
});

test("Braise saves components from every first visit, without removing the last unit", () => {
  const braise = CREW.find((member) => member.id === "braise");
  for (const route of RIFT_ROUTES) {
    const base = riftExpeditionCost(route, 0);
    const reduced = crewAdjustedCost(base, braise, 0, 100);
    assert.ok(Object.keys(base.materials).some((key) => reduced.materials[key] < base.materials[key]));
    assert.ok(Object.values(reduced.materials).every((value) => value >= 1));
  }
  assert.equal(crewAdjustedCost({ shards: 1, materials: { gears: 1 } }, braise, 900, 0).materials.gears, 1);
});

test("long-route training is within 2.5x of short-route XP efficiency", () => {
  const rates = RIFT_ROUTES.map((route) => crewXpForRoute(route) / route.duration);
  assert.ok(Math.max(...rates) / Math.min(...rates) < 2.5);
});

test("corruption never writes, and a valid backup can be recovered explicitly", () => {
  const storage = new MemoryStorage();
  const damaged = '{"version":12,';
  storage.setItem(SAVE_KEY, damaged);
  storage.setItem(BACKUP_KEY, JSON.stringify(travelling()));
  const store = new GameSaveStore(() => storage);
  store.load(START);
  assert.equal(store.problem.kind, "damaged");
  assert.equal(store.write(atStart(), START), false);
  assert.equal(storage.getItem(SAVE_KEY), damaged);
  assert.equal(store.recover(store.problem.backup, START), true);
  assert.equal(storage.getItem(`${SAVE_KEY}-recovery-${START}`), damaged);
  assert.equal(parseGameSave(storage.getItem(SAVE_KEY)).shards, travelling().shards);
});

test("quota failure leaves the primary intact and retry retains the expected revision", () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, JSON.stringify(atStart()));
  const original = storage.getItem(SAVE_KEY);
  const store = new GameSaveStore(() => storage);
  const state = store.load(START);
  storage.failWrite = true;
  assert.equal(store.write({ ...state, shards: 123 }, START), false);
  assert.equal(store.problem.kind, "unavailable");
  assert.equal(storage.getItem(SAVE_KEY), original);
  storage.failWrite = false;
  assert.equal(store.retry(), true);
  assert.equal(store.write({ ...state, shards: 123 }, START), true);
});

test("storage unavailable at boot cannot overwrite a save when permission returns", () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, JSON.stringify(travelling()));
  const original = storage.getItem(SAVE_KEY);
  storage.failRead = true;
  const store = new GameSaveStore(() => storage);
  const placeholder = store.load(START);
  storage.failRead = false;
  assert.equal(store.retry(), false);
  assert.equal(store.write(placeholder, START), false);
  assert.equal(storage.getItem(SAVE_KEY), original);
  assert.equal(store.load(START).shards, travelling().shards);
});

test("a stale tab cannot overwrite another tab's progress or an external reset", () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, JSON.stringify(atStart()));
  const first = new GameSaveStore(() => storage);
  const second = new GameSaveStore(() => storage);
  first.load(START); second.load(START);
  first.write({ ...atStart(), shards: 456 }, START);
  assert.equal(second.write({ ...atStart(), shards: 12 }, START), false);
  assert.equal(second.problem.kind, "conflict");
  assert.equal(second.load(START).shards, 456);
  storage.values.delete(SAVE_KEY);
  assert.equal(second.write(atStart(), START), false);
});

test("reset/import backups contain the previous mine, not the replacement", () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, JSON.stringify(travelling()));
  const store = new GameSaveStore(() => storage);
  store.load(START);
  assert.equal(store.write(atStart(), START, true), true);
  assert.equal(parseGameSave(storage.getItem(BACKUP_KEY)).shards, travelling().shards);
  assert.equal(parseGameSave(storage.getItem(SAVE_KEY)).shards, atStart().shards);
});

test("invalid shapes and future schemas are rejected rather than normalized into a new mine", () => {
  for (const raw of ["{}", "[]", "null", '{"version":99,"depth":4}', '{"version":11,"shards":1e999}',
    JSON.stringify({ ...atStart(), inventory: null }),
    JSON.stringify({ ...atStart(), journal: [{ id: 1, text: {}, tone: "normal" }] }),
    JSON.stringify({ ...atStart(), activeRiftExpedition: { routeId: "missing" } }),
    JSON.stringify({ ...atStart(), riftReports: [{ routeId: "lanterns", rewards: null }] }),
  ]) assert.throws(() => parseGameSave(raw), undefined, raw.slice(0, 80));
});

test("a new mining cycle preserves the origin and crew progression", () => {
  const state = { ...travelling(), depth: 2_000, originSignalFound: true };
  const reset = gameReducer(state, { type: "START_EXPEDITION" });
  assert.equal(reset.originSignalFound, true);
  assert.deepEqual(reset.activeRiftExpedition, state.activeRiftExpedition);
  assert.deepEqual(reset.crewXp, state.crewXp);
});

test("the fastest furnace keeps all eight hours of repeated production", () => {
  const recipe = INDUSTRY_RECIPES.find((entry) => entry.id === "gears");
  const state = {
    ...travelling(), grandWorks: { freight: 5, furnace: 5, bureau: 5 },
    autoRepeatRecipeId: "gears", activeRiftExpedition: null,
    inventory: Object.fromEntries(Object.keys(atStart().inventory).map((id) => [id, 1e8])),
    productionQueue: [{ recipeId: "gears", duration: recipe.duration, remaining: recipe.duration }],
  };
  const result = advanceGameTime(state, START + MAX_OFFLINE_SECONDS * 1_000, true);
  const expected = Math.floor(MAX_OFFLINE_SECONDS * industrySpeed(state) / recipe.duration);
  assert.equal(result.completedBatches, expected);
  assert.equal(expected, 1_920, "all eight hours fit below the production safety guard");
});

test("a failed recovery archive cannot overwrite damaged bytes", () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, "damaged");
  const store = new GameSaveStore(() => storage);
  store.load(START);
  storage.failWrite = true;
  assert.equal(store.recover(atStart(), START), false);
  assert.equal(storage.getItem(SAVE_KEY), "damaged");
  storage.failWrite = false;
  assert.equal(store.retry(), false);
  assert.equal(store.write(atStart(), START), false);
});

test("a missing primary does not silently discard an unreadable backup", () => {
  const storage = new MemoryStorage();
  storage.setItem(BACKUP_KEY, "last surviving bytes");
  const store = new GameSaveStore(() => storage);
  store.load(START);
  assert.equal(store.problem.kind, "damaged");
  assert.equal(store.problem.raw, "last surviving bytes");
  assert.equal(store.write(atStart(), START), false);
  assert.equal(store.recover(atStart(), START), true);
  assert.equal(storage.getItem(`${SAVE_KEY}-recovery-${START}`), "last surviving bytes");
});
