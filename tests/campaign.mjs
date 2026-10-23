import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState, gameReducer, advanceGameTime, encodeSave, decodeSave, parseGameSave, getDerivedStats, rockMaxHpFor, ORE_ORDER, shardsForStrike, passiveShardsPerSecond, TOOLS } from "../src/game.ts";
import { DAWN_PROJECTS, canStartDawnProject, emptyCampaign } from "../src/campaign.ts";
import { campaignChapters, nextCampaignStep } from "../src/progression.ts";
import { RELICS } from "../src/origin.ts";

const START = 1_000_000;
function funded() {
  const state = createInitialState();
  return { ...state, depth: 600, maxDepth: 600, expeditions: 3, lastSimulatedAt: START, lastSavedAt: START,
    shards: 30_000_000, originSignalFound: true, industryMaterials: { gears: 500, alloy: 500, prism: 500 },
    grandWorks: { freight: 5, furnace: 5, bureau: 5 },
    crewXp: Object.fromEntries(Object.keys(state.crewXp).map((id) => [id, 260])),
    origin: { ...state.origin, ownedRelics: RELICS.map((r) => r.id), visits: { threshold: 2, archive: 2, heart: 2 } } };
}
function finished() { return { ...funded(), campaign: { ...emptyCampaign(), stage: 3, completed: true } }; }

test("v12/v13 migrations preserve resources, relics and paid work without auto-finishing the campaign", () => {
  for (const version of [12, 13]) {
    const old = { ...funded(), version, productionQueue: [{ recipeId: "alloy", duration: 42, remaining: 19 }] };
    for (const key of ["campaign", "reducedMotion", "automaticOreRemainders", "passiveShardRemainder"]) delete old[key];
    if (version === 12) delete old.origin;
    const next = parseGameSave(JSON.stringify(old));
    assert.equal(next.version, 14);
    assert.equal(next.shards, old.shards);
    assert.deepEqual(next.productionQueue, old.productionQueue);
    assert.deepEqual(next.campaign, emptyCampaign());
    if (old.origin) assert.deepEqual(next.origin, old.origin);
  }
});

test("all finale gates are enforced even with unlimited shards", () => {
  const state = funded();
  assert.equal(canStartDawnProject(state), true);
  const blocked = [
    { ...state, origin: { ...state.origin, visits: { ...state.origin.visits, heart: 0 } } },
    { ...state, grandWorks: { freight: 0, furnace: 0, bureau: 0 } },
    { ...state, origin: { ...state.origin, ownedRelics: [] } },
    { ...state, shards: 0 },
    { ...state, industryMaterials: { gears: 0, alloy: 0, prism: 0 } },
  ];
  for (const candidate of blocked) assert.equal(gameReducer(candidate, { type: "START_DAWN_PROJECT" }), candidate);
});

test("a project is paid exactly once and survives export, reload and mining cycles", () => {
  const state = funded();
  const started = gameReducer(state, { type: "START_DAWN_PROJECT" });
  assert.equal(started.shards, state.shards - DAWN_PROJECTS[0].shards);
  assert.equal(gameReducer(started, { type: "START_DAWN_PROJECT" }), started);
  const decoded = decodeSave(encodeSave(started));
  assert.deepEqual(decoded.campaign, started.campaign);
  const cycled = gameReducer(decoded, { type: "START_EXPEDITION" });
  assert.equal(cycled.expeditions, 4);
  assert.deepEqual(cycled.campaign, started.campaign);
});

test("online and offline finale completion agrees and never starts an unpaid phase", () => {
  const start = gameReducer(funded(), { type: "START_DAWN_PROJECT" });
  const online = gameReducer(start, { type: "TICK", seconds: 3600 });
  const offline = advanceGameTime(start, START + 3_600_000, true);
  assert.deepEqual(online.campaign, offline.campaign);
  assert.equal(offline.campaign.stage, 1);
  assert.equal(offline.campaign.project, null);
  assert.equal(offline.campaign.completed, false);
  assert.equal(advanceGameTime(offline, START + 3_600_000), offline);
});

test("three explicit investments finish the story once without erasing the mine", () => {
  let state = funded();
  const original = structuredClone(state);
  for (const project of DAWN_PROJECTS) {
    state = gameReducer(state, { type: "START_DAWN_PROJECT" });
    assert.ok(state.campaign.project);
    state = gameReducer(state, { type: "TICK", seconds: project.duration });
  }
  assert.equal(state.campaign.completed, true);
  assert.equal(state.campaign.stage, 3);
  assert.equal(state.shards, original.shards - DAWN_PROJECTS.reduce((sum, project) => sum + project.shards, 0));
  assert.deepEqual(state.origin.ownedRelics, original.origin.ownedRelics);
  assert.equal(state.depth, original.depth);
  assert.equal(gameReducer(state, { type: "START_DAWN_PROJECT" }), state);
  assert.equal(decodeSave(encodeSave(state)).campaign.completed, true);
});

test("malformed or incomplete campaign data is rejected, never silently cleared", () => {
  const cases = [null, {}, { ...emptyCampaign(), stage: 4 }, { ...emptyCampaign(), completed: true },
    { ...emptyCampaign(), project: { stage: 1, duration: 300, remaining: 200 } },
    { ...emptyCampaign(), project: { stage: 0, duration: 300, remaining: 400 } },
    { ...emptyCampaign(), records: { unknown: 20 } },
    { ...emptyCampaign(), challenge: { id: "steady", progress: 0, seconds: 0, routes: [], crew: [] } },
  ];
  for (const campaign of cases) assert.throws(() => parseGameSave(JSON.stringify({ ...funded(), campaign })));
  const missing = funded(); delete missing.campaign;
  assert.throws(() => parseGameSave(JSON.stringify(missing)));
});

test("challenge attempts require the ending and are mutually exclusive", () => {
  const state = funded();
  assert.equal(gameReducer(state, { type: "START_CHALLENGE", id: "steady" }), state);
  const started = gameReducer(finished(), { type: "START_CHALLENGE", id: "steady" });
  assert.equal(gameReducer(started, { type: "START_CHALLENGE", id: "workshop" }), started);
  const cancelled = gameReducer(started, { type: "ABANDON_CHALLENGE" });
  assert.equal(cancelled.campaign.challenge, null);
  assert.equal(cancelled.shards, started.shards);
  assert.equal(cancelled.campaign.completed, true);
});

test("the precision challenge counts successful strikes and fails without harming the campaign", () => {
  let state = { ...finished(), upgrades: { ...finished().upgrades, sturdy: 8 }, durability: 300 };
  state = gameReducer(state, { type: "START_CHALLENGE", id: "steady" });
  for (let i = 0; i < 80; i++) state = gameReducer(state, { type: "STRIKE" });
  assert.equal(state.campaign.challenge, null);
  assert.ok("steady" in state.campaign.records);
  const started = gameReducer(state, { type: "START_CHALLENGE", id: "steady" });
  const failed = gameReducer(started, { type: "REPAIR" });
  assert.equal(failed.campaign.challenge, null);
  assert.equal(failed.campaign.completed, true);
  assert.deepEqual(failed.campaign.records, state.campaign.records);
});

test("autarky counts offline production but an actual sale ends the attempt", () => {
  let state = { ...finished(), inventory: Object.fromEntries(ORE_ORDER.map((id) => [id, 5000])), autoRepeatRecipeId: "gears", productionQueue: [{ recipeId: "gears", duration: 24, remaining: 24 }] };
  state = gameReducer(state, { type: "START_CHALLENGE", id: "workshop" });
  const result = advanceGameTime(state, START + 600_000, true);
  assert.ok("workshop" in result.campaign.records);
  assert.equal(result.campaign.challenge, null);
  const sold = gameReducer(state, { type: "SELL_ALL" });
  assert.equal(sold.campaign.challenge, null);
  assert.ok(sold.coins > state.coins);
  const empty = { ...state, inventory: createInitialState().inventory };
  assert.ok(gameReducer(empty, { type: "SELL_ALL" }).campaign.challenge);
});

test("three horizons requires three different routes AND three different crew members", () => {
  let state = { ...finished(), originSignalFound: true, surveyData: 100 };
  state = gameReducer(state, { type: "START_CHALLENGE", id: "voyager" });
  for (const [route, crew] of [["lanterns", "mica"], ["lanterns", "braise"], ["magnet", "mica"], ["magnet", "braise"], ["emberSpine", "nova"]]) {
    state = gameReducer(state, { type: "SELECT_RIFT_ROUTE", id: route });
    state = gameReducer(state, { type: "SELECT_CREW", id: crew });
    state = gameReducer(state, { type: "START_RIFT_EXPEDITION" });
    state = gameReducer(state, { type: "TICK", seconds: state.activeRiftExpedition.remaining });
    state = decodeSave(encodeSave(state));
  }
  assert.ok("voyager" in state.campaign.records);
  assert.equal(state.campaign.challenge, null);
});

test("the guide recognises old advanced saves and returns precise early milestones", () => {
  const fresh = createInitialState();
  assert.equal(nextCampaignStep(fresh).destination, "mine");
  assert.equal(nextCampaignStep({ ...fresh, rocksBroken: 5 }).destination, "inventory");
  assert.equal(nextCampaignStep({ ...fresh, rocksBroken: 5, salesCompleted: 1 }).destination, "forge");
  assert.ok(nextCampaignStep(funded()).title.includes("fondations"));
  assert.equal(campaignChapters({ ...finished(), originSignalFound: true }).filter((chapter) => chapter.complete).length, 6);
});

test("automatic extraction matches live ticks and a long absence, even when crossing sectors", () => {
  const state = { ...createInitialState(), lastSimulatedAt: START, lastSavedAt: START, machines: { ...createInitialState().machines, drill: 12, excavator: 2 } };
  const offline = advanceGameTime(state, START + 3_600_000, true);
  let online = state;
  for (let second = 1; second <= 3600; second++) online = advanceGameTime(online, START + second * 1000);
  assert.equal(offline.depth, online.depth);
  assert.equal(offline.rocksBroken, online.rocksBroken);
  assert.equal(offline.shards, online.shards);
  assert.deepEqual(offline.inventory, online.inventory);
  assert.ok(Math.abs(offline.rockHp - online.rockHp) < 1e-6);
  assert.equal(offline.activeEvent, null);
});

test("returning to an old gallery has equal loot online/offline and cannot advance depth", () => {
  const hp = rockMaxHpFor(360);
  const state = { ...funded(), depth: 360, selectedZoneId: 0, rockHp: hp, rockMaxHp: hp, machines: { ...funded().machines, excavator: 10 } };
  const bulk = gameReducer(state, { type: "TICK", seconds: 7200 });
  let small = state;
  for (let i = 0; i < 7200; i++) small = gameReducer(small, { type: "TICK", seconds: 1 });
  assert.equal(bulk.depth, 360);
  assert.equal(small.depth, 360);
  assert.deepEqual(bulk.inventory, small.inventory);
  assert.equal(bulk.rocksBroken, small.rocksBroken);
  assert.equal(bulk.shards, small.shards);
});

test("machines keep working while a manual event awaits a choice", () => {
  const state = { ...createInitialState(), machines: { ...createInitialState().machines, drill: 1 }, activeEvent: { kind: "song", title: "A", description: "B" } };
  const next = gameReducer(state, { type: "TICK", seconds: 100 });
  assert.ok(next.rocksBroken > state.rocksBroken);
  assert.deepEqual(next.activeEvent, state.activeEvent);
});

test("reduced motion survives saves and cycles; reset deliberately clears campaign progress", () => {
  let state = gameReducer(finished(), { type: "SET_REDUCED_MOTION", enabled: true });
  state = decodeSave(encodeSave(state));
  assert.equal(state.reducedMotion, true);
  state = gameReducer(state, { type: "START_EXPEDITION" });
  assert.equal(state.reducedMotion, true);
  assert.equal(state.campaign.completed, true);
  assert.deepEqual(gameReducer(state, { type: "RESET" }).campaign, emptyCampaign());
});

test("currency softening preserves early rewards and has diminishing growth at high damage", () => {
  for (const damage of [1, 2, 4, 8, 25, 50, 100]) assert.equal(shardsForStrike(damage), Math.max(1, Math.ceil(damage * .22)));
  assert.ok(shardsForStrike(1_000_000) < 500);
  assert.ok(shardsForStrike(4_000_000) / shardsForStrike(1_000_000) < 2.1);
  assert.ok(passiveShardsPerSecond(1_000_000) < 400);
});

test("forged tools improve machine power monotonically without taking away old funds", () => {
  const state = { ...funded(), shards: 100_000_000_000, machines: { ...funded().machines, drill: 10 } };
  const powers = TOOLS.map((_tool, toolTier) => getDerivedStats({ ...state, toolTier }).autoDamage);
  powers.forEach((power, index) => assert.ok(Number.isFinite(power) && power > (powers[index - 1] ?? 0)));
  const old = { ...state, version: 13 }; delete old.campaign;
  assert.equal(parseGameSave(JSON.stringify(old)).shards, state.shards);
});

test("fractional extraction survives repeated reloads without creating extra minerals", () => {
  let live = { ...createInitialState(), machines: { ...createInitialState().machines, drill: 3 } };
  let reloaded = structuredClone(live);
  for (let i = 0; i < 200; i++) {
    live = gameReducer(live, { type: "TICK", seconds: 5 });
    reloaded = decodeSave(encodeSave(gameReducer(reloaded, { type: "TICK", seconds: 5 })));
  }
  assert.deepEqual(reloaded.inventory, live.inventory);
  assert.equal(reloaded.shards, live.shards);
  for (const key of ORE_ORDER) assert.ok(Math.abs(reloaded.automaticOreRemainders[key] - live.automaticOreRemainders[key]) < 1e-8);
});

test("invalid time steps do not advance projects or issue currency", () => {
  const state = gameReducer(funded(), { type: "START_DAWN_PROJECT" });
  for (const seconds of [-1, 0, NaN, Infinity]) assert.equal(gameReducer(state, { type: "TICK", seconds }), state);
});

test("an eight-hour endgame batch stays finite, respects the cycle cap and round-trips", () => {
  const state = { ...funded(), depth: 1, rockHp: rockMaxHpFor(1), rockMaxHp: rockMaxHpFor(1),
    toolTier: 10, machines: { drill: 24, cart: 18, smelter: 18, resonator: 12, excavator: 14 },
    legacy: { force: 10, industry: 10, fortune: 8, endurance: 8 } };
  const result = gameReducer(state, { type: "TICK", seconds: 28800 });
  assert.equal(result.depth, 600);
  assert.ok(Number.isFinite(result.shards) && result.rockHp > 0);
  assert.ok(Object.values(result.inventory).every((amount) => Number.isSafeInteger(amount)));
  assert.deepEqual(decodeSave(encodeSave(result)).inventory, result.inventory);
});
