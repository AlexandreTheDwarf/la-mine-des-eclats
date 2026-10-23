import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialState,
  gameReducer,
  parseGameSave,
  encodeSave,
  decodeSave,
  advanceGameTime,
  getDerivedStats,
} from "../src/game.ts";
import {
  ORIGIN_STAGES,
  RELICS,
  emptyOriginProgress,
  TALENT_RESPEC_COST,
} from "../src/origin.ts";
import {
  planRiftExpedition,
  planOriginExpedition,
  riftVariant,
  VARIANT_KEYS,
} from "../src/expeditionPlanning.ts";
import { CREW } from "../src/crew.ts";
import { RIFT_ROUTES, RIFT_APPROACHES } from "../src/riftNetwork.ts";

const START = 1_000_000;
function veteran() {
  return {
    ...createInitialState(),
    lastSavedAt: START,
    lastSimulatedAt: START,
    maxDepth: 800,
    expeditions: 3,
    shards: 10_000_000,
    grandWorks: { freight: 3, furnace: 3, bureau: 2 },
    surveyData: 60,
    originSignalFound: true,
    industryMaterials: { gears: 500, alloy: 500, prism: 500 },
    riftRouteCompletions: Object.fromEntries(
      RIFT_ROUTES.map((route) => [route.id, 1]),
    ),
  };
}
const act = (state, type, rest = {}) => gameReducer(state, { type, ...rest });
const finish = (state) =>
  act(state, "TICK", {
    seconds: (state.origin.activeJob ?? state.activeRiftExpedition).remaining,
  });

test("v12 migration adds only the new chapter and preserves a paid legacy mission", () => {
  const old = {
    ...veteran(),
    version: 12,
    activeRiftExpedition: {
      routeId: "lanterns",
      approachId: "survey",
      crewId: "mica",
      duration: 270,
      remaining: 160,
    },
  };
  delete old.origin;
  const migrated = parseGameSave(JSON.stringify(old));
  assert.equal(migrated.version, 14);
  assert.deepEqual(migrated.origin, emptyOriginProgress());
  assert.deepEqual(migrated.activeRiftExpedition, old.activeRiftExpedition);
  assert.equal(migrated.shards, old.shards);
  assert.equal(migrated.surveyData, old.surveyData);
  assert.equal(finish(migrated).riftExpeditionsCompleted, 1);
  delete old.inventory;
  assert.throws(() => parseGameSave(JSON.stringify(old)), /incomplète/);
});

test("chapter gates, resource checks and the shared convoi slot cannot be bypassed", () => {
  const state = veteran();
  assert.equal(
    act(createInitialState(), "START_ORIGIN_EXPEDITION", { id: "threshold" })
      .origin.activeJob,
    null,
  );
  assert.equal(act(state, "START_ORIGIN_EXPEDITION", { id: "heart" }), state);
  assert.equal(
    act({ ...state, surveyData: 31 }, "START_ORIGIN_EXPEDITION", {
      id: "threshold",
    }).origin.activeJob,
    null,
  );
  assert.equal(
    act({ ...state, shards: 0 }, "START_ORIGIN_EXPEDITION", { id: "threshold" })
      .origin.activeJob,
    null,
  );
  assert.equal(
    act(
      { ...state, industryMaterials: { gears: 0, alloy: 0, prism: 0 } },
      "START_ORIGIN_EXPEDITION",
      { id: "threshold" },
    ).origin.activeJob,
    null,
  );
  const launched = act(state, "START_ORIGIN_EXPEDITION", { id: "threshold" });
  const plan = planOriginExpedition(state, "threshold");
  assert.equal(launched.shards, state.shards - plan.cost.shards);
  assert.equal(launched.industryMaterials.gears, 488);
  assert.equal(act(launched, "START_RIFT_EXPEDITION"), launched);
  assert.equal(
    act(launched, "START_ORIGIN_EXPEDITION", { id: "threshold" }),
    launched,
  );
  const normal = act(state, "START_RIFT_EXPEDITION");
  assert.equal(
    act(normal, "START_ORIGIN_EXPEDITION", { id: "threshold" }),
    normal,
  );
});

test("origin return and fatigue are identical online, offline and across reloads", () => {
  const launched = act(veteran(), "START_ORIGIN_EXPEDITION", {
    id: "threshold",
  });
  const duration = launched.origin.activeJob.duration;
  const partial = act(launched, "TICK", { seconds: duration - 1 });
  assert.ok(partial.origin.activeJob);
  const arrived = act(partial, "TICK", { seconds: 1 });
  const offline = advanceGameTime(
    launched,
    START + (duration + 90) * 1000,
    true,
  );
  assert.equal(arrived.origin.awaitingChoice, "threshold");
  assert.equal(offline.origin.awaitingChoice, "threshold");
  assert.equal(arrived.crewXp.mica, offline.crewXp.mica);
  assert.equal(arrived.crewFatigue.mica, 40);
  assert.equal(offline.crewFatigue.mica, 39);
  assert.equal(offline.offlineReport.expeditions, 1);
  assert.equal(offline.origin.ownedRelics.length, 0);
  const restored = decodeSave(encodeSave(offline));
  assert.equal(restored.origin.awaitingChoice, "threshold");
  assert.equal(
    advanceGameTime(restored, restored.lastSimulatedAt).crewXp.mica,
    arrived.crewXp.mica,
  );
});

test("each discovery grants one relic once, and revisits recover the alternative", () => {
  let state = finish(
    act(veteran(), "START_ORIGIN_EXPEDITION", { id: "threshold" }),
  );
  assert.equal(act(state, "CLAIM_ORIGIN_RELIC", { id: "compass" }), state);
  assert.equal(
    act(state, "START_ORIGIN_EXPEDITION", { id: "threshold" }),
    state,
  );
  state = act(state, "CLAIM_ORIGIN_RELIC", { id: "hammer" });
  assert.deepEqual(state.origin.ownedRelics, ["hammer"]);
  assert.equal(state.origin.visits.threshold, 1);
  assert.equal(state.researchPoints, 15);
  assert.equal(act(state, "CLAIM_ORIGIN_RELIC", { id: "hammer" }), state);
  state = finish(act(state, "START_ORIGIN_EXPEDITION", { id: "threshold" }));
  assert.equal(act(state, "CLAIM_ORIGIN_RELIC", { id: "hammer" }), state);
  state = act(state, "CLAIM_ORIGIN_RELIC", { id: "engine" });
  assert.deepEqual(state.origin.ownedRelics, ["hammer", "engine"]);
  assert.equal(state.origin.visits.threshold, 2);
  assert.equal(
    act(state, "START_ORIGIN_EXPEDITION", { id: "threshold" }),
    state,
  );
});

test("all three chapters and six relics are attainable with finite spending", () => {
  let state = veteran();
  state.origin.variantDiscoveries = [...VARIANT_KEYS].slice(0, 4);
  for (const stage of ORIGIN_STAGES) {
    for (const id of stage.relics) {
      state = act(state, "START_ORIGIN_EXPEDITION", { id: stage.id });
      assert.equal(state.origin.activeJob.stageId, stage.id);
      state = finish(decodeSave(encodeSave(state)));
      state = act(state, "CLAIM_ORIGIN_RELIC", { id });
    }
  }
  assert.equal(state.origin.ownedRelics.length, 6);
  assert.deepEqual(state.origin.visits, { threshold: 2, archive: 2, heart: 2 });
  assert.ok(state.shards >= 5_700_000);
  assert.deepEqual(decodeSave(encodeSave(state)).origin, state.origin);
});

test("two equipped relics have bounded effects and are never duplicated", () => {
  let state = veteran();
  state.origin.ownedRelics = RELICS.map((relic) => relic.id);
  state.machines.drill = 10;
  state.upgrades.power = 20;
  const before = getDerivedStats(state);
  state = act(state, "TOGGLE_RELIC", { id: "hammer" });
  state = act(state, "TOGGLE_RELIC", { id: "engine" });
  assert.equal(
    getDerivedStats(state).clickDamage,
    Math.round(before.clickDamage * 1.25),
  );
  assert.equal(getDerivedStats(state).autoDamage, before.autoDamage * 1.15);
  const third = act(state, "TOGGLE_RELIC", { id: "compass" });
  assert.deepEqual(third.origin.equippedRelics, ["hammer", "engine"]);
  state = act(state, "TOGGLE_RELIC", { id: "hammer" });
  assert.equal(getDerivedStats(state).clickDamage, before.clickDamage);
  state = act(state, "TOGGLE_RELIC", { id: "compass" });
  assert.equal(state.origin.equippedRelics.length, 2);
  assert.equal(
    act(veteran(), "TOGGLE_RELIC", { id: "hammer" }).origin.equippedRelics
      .length,
    0,
  );
});

test("talents unlock at level 3, first choice is free and respec costs exactly once", () => {
  let state = veteran();
  assert.equal(
    act(state, "SELECT_CREW_TALENT", { crewId: "mica", id: "field" }),
    state,
  );
  state.crewXp.mica = 260;
  const first = act(state, "SELECT_CREW_TALENT", {
    crewId: "mica",
    id: "field",
  });
  assert.equal(first.shards, state.shards);
  assert.ok(
    planRiftExpedition(first).duration < planRiftExpedition(state).duration,
  );
  assert.equal(
    act(first, "SELECT_CREW_TALENT", { crewId: "mica", id: "field" }),
    first,
  );
  const respec = act(first, "SELECT_CREW_TALENT", {
    crewId: "mica",
    id: "study",
  });
  assert.equal(respec.shards, first.shards - TALENT_RESPEC_COST);
  assert.equal(
    planRiftExpedition(respec).manifest.rewards.survey,
    planRiftExpedition(state).manifest.rewards.survey + 1,
  );
  const broke = { ...respec, shards: 0 };
  assert.equal(
    act(broke, "SELECT_CREW_TALENT", { crewId: "mica", id: "field" }).origin
      .talents.mica,
    "study",
  );
});

test("every crew talent has a real manifest effect", () => {
  for (const member of CREW) {
    for (const id of ["field", "study"]) {
      const state = veteran();
      state.selectedCrewId = member.id;
      state.crewXp[member.id] = 260;
      const before = planRiftExpedition(state);
      const talented = act(state, "SELECT_CREW_TALENT", {
        crewId: member.id,
        id,
      });
      assert.notDeepEqual(
        planRiftExpedition(talented),
        before,
        `${member.id}/${id}`,
      );
    }
  }
});

test("variants reward the displayed pairing, rotate on returns, and discover only once", () => {
  let state = veteran();
  const variant = riftVariant("lanterns", 1);
  state.selectedCrewId = variant.crewId;
  state.selectedRiftApproachId = variant.approachId;
  const planned = planRiftExpedition(state);
  assert.equal(planned.matched, true);
  state = finish(act(state, "START_RIFT_EXPEDITION"));
  assert.deepEqual(state.origin.variantDiscoveries, [variant.key]);
  assert.deepEqual(state.riftReports[0].rewards, planned.manifest.rewards);
  assert.equal(state.riftReports[0].variantKey, variant.key);
  assert.notEqual(planRiftExpedition(state).variant.key, variant.key);
  state.riftRouteCompletions.lanterns = 4;
  state = finish(act(state, "START_RIFT_EXPEDITION"));
  assert.equal(state.origin.variantDiscoveries.length, 1);
  const classic = veteran();
  classic.riftRouteCompletions.lanterns = 0;
  classic.selectedCrewId = riftVariant("lanterns", 0).crewId;
  assert.equal(planRiftExpedition(classic).matched, false);
});

test("loadout changes cannot rewrite a running manifest, even after export/import", () => {
  let state = veteran();
  state.crewXp.mica = 260;
  state.origin.ownedRelics = ["compass", "lens", "lantern"];
  state.origin.equippedRelics = ["compass", "lens"];
  state = act(state, "SELECT_CREW_TALENT", { crewId: "mica", id: "field" });
  const plan = planRiftExpedition(state);
  state = act(state, "START_RIFT_EXPEDITION");
  state = act(state, "TOGGLE_RELIC", { id: "lens" });
  state = act(state, "TOGGLE_RELIC", { id: "lantern" });
  state = act(state, "SELECT_CREW_TALENT", { crewId: "mica", id: "study" });
  state = decodeSave(encodeSave(state));
  assert.equal(state.activeRiftExpedition.duration, plan.duration);
  assert.deepEqual(state.activeRiftExpedition.manifest, plan.manifest);
  state = finish(state);
  assert.deepEqual(state.riftReports[0].rewards, plan.manifest.rewards);
  assert.equal(state.crewFatigue.mica, plan.manifest.fatigue);
});

test("new mining cycles preserve talents, relics, discoveries and paid origin jobs", () => {
  let state = veteran();
  state.depth = 2_000;
  state.crewXp.mica = 260;
  state = act(state, "SELECT_CREW_TALENT", { crewId: "mica", id: "field" });
  state.origin.ownedRelics = ["lens"];
  state.origin.equippedRelics = ["lens"];
  state = act(state, "START_ORIGIN_EXPEDITION", { id: "threshold" });
  const cycle = act(state, "START_EXPEDITION");
  assert.equal(cycle.expeditions, 4);
  assert.deepEqual(cycle.origin, state.origin);
  assert.equal(finish(cycle).origin.awaitingChoice, "threshold");
});

test("malformed v13 jobs, equipment and talents fail closed without losing the save", () => {
  const bad = [
    { ...veteran(), origin: null },
    { ...veteran(), origin: { ...emptyOriginProgress(), talents: {} } },
    {
      ...veteran(),
      origin: { ...emptyOriginProgress(), equippedRelics: ["hammer"] },
    },
    {
      ...veteran(),
      origin: { ...emptyOriginProgress(), ownedRelics: ["hammer", "hammer"] },
    },
    {
      ...veteran(),
      origin: { ...emptyOriginProgress(), awaitingChoice: "lost" },
    },
    {
      ...veteran(),
      origin: { ...emptyOriginProgress(), variantDiscoveries: ["lanterns:99"] },
    },
    { ...veteran(), origin: { ...emptyOriginProgress(), activeJob: {} } },
  ];
  const launched = act(veteran(), "START_RIFT_EXPEDITION");
  bad.push({
    ...launched,
    activeRiftExpedition: {
      ...launched.activeRiftExpedition,
      manifest: { rewards: null },
    },
  });
  const missing = veteran();
  delete missing.origin;
  bad.push(missing);
  for (const state of bad)
    assert.throws(() => parseGameSave(JSON.stringify(state)));
});

test("all six relics affect the documented statistic or manifest", () => {
  const base = veteran();
  base.selectedRiftRouteId = "glassArc";
  base.origin.ownedRelics = RELICS.map((relic) => relic.id);
  const before = planRiftExpedition(base);
  const withRelic = (id) => ({ ...base, origin: { ...base.origin, equippedRelics: [id] } });
  assert.equal(planRiftExpedition(withRelic("compass")).duration, Math.round(before.duration * .88));
  assert.equal(planRiftExpedition(withRelic("lens")).manifest.rewards.research, Math.round(before.manifest.rewards.research * 1.15));
  assert.equal(planRiftExpedition(withRelic("lantern")).manifest.fatigue, 30);
  assert.equal(planOriginExpedition(withRelic("lantern"), "threshold").fatigue, 30);
  assert.equal(getDerivedStats(withRelic("chisel")).yieldMultiplier, getDerivedStats(base).yieldMultiplier * 1.12);
});

test("all fifteen variants can be studied and are distinct", () => {
  const keys = new Set();
  for (const route of RIFT_ROUTES) for (let visit = 1; visit <= 3; visit++) {
    const state = veteran();
    state.selectedRiftRouteId = route.id;
    state.riftRouteCompletions[route.id] = visit;
    const variant = riftVariant(route.id, visit);
    state.selectedCrewId = variant.crewId;
    state.selectedRiftApproachId = variant.approachId;
    const returned = finish(act(state, "START_RIFT_EXPEDITION"));
    assert.equal(returned.origin.variantDiscoveries[0], variant.key);
    keys.add(variant.key);
  }
  assert.deepEqual(keys, VARIANT_KEYS);
});

test("pending relic choices survive a cycle and a reset intentionally clears the chapter", () => {
  let state = finish(act(veteran(), "START_ORIGIN_EXPEDITION", { id: "threshold" }));
  state.depth = 2_000;
  const cycled = act(state, "START_EXPEDITION");
  assert.equal(cycled.origin.awaitingChoice, "threshold");
  assert.equal(act(cycled, "CLAIM_ORIGIN_RELIC", { id: "engine" }).origin.visits.threshold, 1);
  assert.deepEqual(act(cycled, "RESET").origin, emptyOriginProgress());
});

test("an in-flight origin convoi retains XP and fatigue after equipment changes", () => {
  let state = veteran();
  state.selectedCrewId = "braise";
  state.crewXp.braise = 260;
  state.origin.talents.braise = "study";
  state.origin.ownedRelics = ["compass", "lantern"];
  state.origin.equippedRelics = ["compass", "lantern"];
  state = act(state, "START_ORIGIN_EXPEDITION", { id: "threshold" });
  const job = structuredClone(state.origin.activeJob);
  state = act(state, "TOGGLE_RELIC", { id: "lantern" });
  state = act(state, "SELECT_CREW_TALENT", { crewId: "braise", id: "field" });
  state = decodeSave(encodeSave(state));
  assert.deepEqual(state.origin.activeJob, job);
  state = finish(state);
  assert.equal(state.crewXp.braise, 410);
  assert.equal(state.crewFatigue.braise, 30);
});

test("all routes, talents and two-relic loadouts retain positive finite prices and durations", () => {
  for (const route of RIFT_ROUTES)
    for (const member of CREW)
      for (const approach of RIFT_APPROACHES) {
        const state = veteran();
        state.selectedRiftRouteId = route.id;
        state.selectedCrewId = member.id;
        state.selectedRiftApproachId = approach.id;
        state.crewXp[member.id] = 900;
        state.origin.talents[member.id] = "field";
        state.origin.ownedRelics = ["compass", "lantern"];
        state.origin.equippedRelics = ["compass", "lantern"];
        const plan = planRiftExpedition(state);
        assert.ok(
          plan.duration >= route.duration * approach.durationMultiplier * 0.6,
        );
        assert.ok(plan.cost.shards >= route.shardCost * 0.65);
        assert.ok(plan.manifest.fatigue >= 20);
      }
});
