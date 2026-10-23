/** A reproducible player, not a fabricated stockpile. Every resource comes
 * from normal reducer actions. This deliberately simple policy is a benchmark,
 * not an optimum or a guarantee of how long a human will play. */
import assert from "node:assert/strict";
import {
  createInitialState, gameReducer, advanceGameTime, canForgeNext, canStartExpedition,
  TOOLS, UPGRADES, MACHINES, LEGACIES, RESEARCH, INDUSTRY_RECIPES, GOALS, ZONES, ORE_ORDER,
  upgradeCost, machineCost, legacyCost, researchCost, getDerivedStats, industryRecipeReady,
  oreStudyUnlocked, oreStudyCost, industryQueueCapacity, zoneForDepth, encodeSave,
} from "../src/game.ts";
import { GRAND_WORKS, grandWorkCost, grandWorkStages } from "../src/grandWorks.ts";
import { RIFT_ROUTES, riftRouteUnlocked } from "../src/riftNetwork.ts";
import { ORIGIN_STAGES, originStageUnlocked } from "../src/origin.ts";
import { CREW, crewLevel } from "../src/crew.ts";
import { planRiftExpedition, planOriginExpedition, riftVariant } from "../src/expeditionPlanning.ts";
import { DAWN_PROJECTS, canStartDawnProject } from "../src/campaign.ts";

const profiles = {
  active: { hits: 2, window: 900, period: 900, bootstrap: 900, days: 7 },
  casual: { hits: 1, window: 90, period: 900, bootstrap: 900, days: 21 },
  offline: { hits: 1, window: 90, period: 4 * 3600, bootstrap: 900, days: 60 },
  automation: { hits: 1, hitsAfterBootstrap: 0, window: 90, period: 900, bootstrap: 900, days: 30 },
};
const selected = process.argv.find((arg) => arg.startsWith("--profile="))?.split("=")[1];
const trace = process.argv.includes("--trace");
const start = 1_700_000_000_000;

function simulate(label, profile) {
  const originalRandom = Math.random;
  const originalNow = Date.now;
  let random = 12345;
  let seconds = 0;
  Math.random = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random / 4294967296; };
  Date.now = () => start + seconds * 1000;
  let state = createInitialState();
  const reached = new Map();
  let lastCheckpoint = "";
  const act = (action) => { state = gameReducer(state, action); };
  const record = (name, condition) => { if (condition && !reached.has(name)) { reached.set(name, +(seconds / 3600).toFixed(2)); if (trace) console.log(label, name, reached.get(name), "h"); } };

  function intention() {
    // Cycle gates must be earned by mining. Work stages are bought cheapest
    // first; the policy does not give itself a post-launch warehouse.
    const neededWorks = state.origin.ownedRelics.length === 6 ? 15 : 8;
    if (state.expeditions >= 2 && grandWorkStages(state.grandWorks) < neededWorks) {
      const options = GRAND_WORKS.filter((work) => state.grandWorks[work.id] < work.max)
        .map((work) => ({ kind: "work", id: work.id, cost: grandWorkCost(work, state.grandWorks[work.id]) }));
      options.sort((a, b) => a.cost.shards - b.cost.shards);
      return options[0];
    }
    if (state.expeditions < 3 || state.activeRiftExpedition || state.origin.activeJob || state.campaign.project) return null;
    if (state.originSignalFound) {
      const stage = ORIGIN_STAGES.find((entry) => state.origin.visits[entry.id] < 2 && originStageUnlocked(state.origin, true, state.surveyData, entry.id));
      if (stage) return { kind: "origin", id: stage.id, cost: planOriginExpedition(state, stage.id).cost };
    }
    if (state.origin.ownedRelics.length === 6) {
      if (Object.values(state.crewXp).reduce((sum, xp) => sum + crewLevel(xp), 0) >= 12) {
        const project = DAWN_PROJECTS[state.campaign.stage];
        return project ? { kind: "dawn", cost: { shards: project.shards, materials: project.materials } } : null;
      }
    }
    const candidates = RIFT_ROUTES.filter((route) => riftRouteUnlocked(state.surveyData, route));
    const unvisited = candidates.find((route) => !state.riftRouteCompletions[route.id]);
    const route = unvisited ?? candidates.filter((entry) => !state.origin.variantDiscoveries.includes(riftVariant(entry.id, state.riftRouteCompletions[entry.id]).key))
      .sort((a, b) => a.duration - b.duration)[0] ?? candidates[0];
    const variant = riftVariant(route.id, state.riftRouteCompletions[route.id]);
    act({ type: "SELECT_RIFT_ROUTE", id: route.id });
    act({ type: "SELECT_CREW", id: variant.crewId });
    act({ type: "SELECT_RIFT_APPROACH", id: variant.approachId });
    return { kind: "rift", cost: planRiftExpedition(state).cost };
  }

  function manage() {
    if (state.activeEvent) act({ type: "RESOLVE_EVENT", choice: "careful" });
    for (const goal of GOALS) if (!state.claimedGoals.includes(goal.id) && goal.progress(state) >= goal.target) act({ type: "CLAIM_GOAL", id: goal.id });
    if (state.origin.awaitingChoice) {
      const stage = ORIGIN_STAGES.find((entry) => entry.id === state.origin.awaitingChoice);
      act({ type: "CLAIM_ORIGIN_RELIC", id: stage.relics.find((id) => !state.origin.ownedRelics.includes(id)) });
    }
    for (const id of ["hammer", "engine"]) if (state.origin.ownedRelics.includes(id) && !state.origin.equippedRelics.includes(id) && state.origin.equippedRelics.length < 2) act({ type: "TOGGLE_RELIC", id });
    if (canStartExpedition(state) && state.expeditions < 3) act({ type: "START_EXPEDITION" });
    if (state.expeditions && !state.industryDoctrine) act({ type: "SELECT_INDUSTRY_DOCTRINE", id: "extraction" });
    for (const member of CREW) if (crewLevel(state.crewXp[member.id]) >= 3 && !state.origin.talents[member.id]) act({ type: "SELECT_CREW_TALENT", crewId: member.id, id: "field" });
    for (const legacy of [...LEGACIES].sort((a, b) => state.legacy[a.id] - state.legacy[b.id])) {
      if (state.legacy[legacy.id] < legacy.max && state.echoes >= legacyCost(legacy, state.legacy[legacy.id])) act({ type: "BUY_LEGACY", id: legacy.id });
    }
    if (canForgeNext(state)) act({ type: "FORGE_NEXT" });
    const intent = intention();
    const nextTool = TOOLS[state.toolTier + 1];
    const accessibleTool = nextTool && Object.keys(nextTool.oreCost).every((id) => ZONES.some((zone) => zone.minDepth <= state.depth && zone.orePool.some((ore) => ore.id === id)));
    const keep = accessibleTool ? { ...nextTool.oreCost } : {};
    let recipe;
    if (intent) {
      recipe = INDUSTRY_RECIPES.find((entry) => state.industryMaterials[entry.id] + state.productionQueue.filter((job) => job.recipeId === entry.id).length * entry.output < (intent.cost.materials[entry.id] ?? 0));
      if (recipe) for (const [id, amount] of Object.entries(recipe.inputs)) keep[id] = (keep[id] ?? 0) + amount;
    }
    const sell = ORE_ORDER.filter((id) => !keep[id] && state.inventory[id] > 0);
    if (sell.length) act({ type: "SELL_SELECTED", ids: sell, rates: {} });
    if (canForgeNext(state)) act({ type: "FORGE_NEXT" });
    for (const upgrade of UPGRADES) {
      const cost = upgradeCost(upgrade, state.upgrades[upgrade.id]);
      const fraction = upgrade.id === "power" ? .7 : .12;
      if (state.upgrades[upgrade.id] < upgrade.max && cost <= state[upgrade.currency] * fraction) act({ type: "BUY_UPGRADE", id: upgrade.id });
    }
    for (const machine of MACHINES) {
      const cost = machineCost(machine, state.machines[machine.id]);
      const fraction = machine.id === "drill" && !state.machines.drill ? 1 : .2;
      if (state.depth >= machine.unlockDepth && state.machines[machine.id] < machine.max && cost <= state.coins * fraction) act({ type: "BUY_MACHINE", id: machine.id });
    }
    for (const id of ORE_ORDER) if (oreStudyUnlocked(state, id) && state.oreStudies[id] < 3 && state.inventory[id] >= oreStudyCost(id, state.oreStudies[id]) + (keep[id] ?? 0)) act({ type: "ANALYZE_ORE", id });
    for (const definition of RESEARCH) if (state.research[definition.id] < definition.max && state.researchPoints >= researchCost(definition, state.research[definition.id])) act({ type: "BUY_RESEARCH", id: definition.id });
    if (intent) {
      if (recipe) {
        let guard = 0;
        while (industryRecipeReady(state, recipe) && state.productionQueue.length < industryQueueCapacity(state) && guard++ < 6) act({ type: "START_INDUSTRY_RECIPE", id: recipe.id });
      }
      if (intent.kind === "work") act({ type: "BUY_GRAND_WORK", id: intent.id });
      if (intent.kind === "rift") act({ type: "START_RIFT_EXPEDITION" });
      if (intent.kind === "origin") act({ type: "START_ORIGIN_EXPEDITION", id: intent.id });
      if (intent.kind === "dawn" && canStartDawnProject(state)) act({ type: "START_DAWN_PROJECT" });
    }
    // Forge inputs come first, then the currently needed industrial recipe.
    // Returning to an old gallery uses the same command as a real player.
    const missing = Object.entries(keep).filter(([id, amount]) => state.inventory[id] < amount)
      .sort((a, b) => (state.inventory[a[0]] / a[1]) - (state.inventory[b[0]] / b[1]))[0];
    let gallery = zoneForDepth(state.depth).id;
    if (missing) {
      const options = ZONES.filter((zone) => zone.minDepth <= state.depth && zone.orePool.some((ore) => ore.id === missing[0]));
      options.sort((a, b) => (b.orePool.find((ore) => ore.id === missing[0])?.weight ?? 0) - (a.orePool.find((ore) => ore.id === missing[0])?.weight ?? 0));
      gallery = options[0]?.id ?? gallery;
    }
    if (gallery !== state.selectedZoneId) act({ type: "SELECT_ZONE", id: gallery });
    if (state.durability < Math.min(20, getDerivedStats(state).maxDurability / 4)) act({ type: "REPAIR" });
  }

  try {
    const stop = profile.days * 86400;
    while (seconds < stop && !state.campaign.completed) {
      const active = seconds < profile.bootstrap || seconds % profile.period < profile.window;
      if (active) {
        manage();
        // Cycles deliberately reset machines. Even the automation benchmark
        // relaunches its first machine by hand after each of the three resets.
        const automated = state.machines.drill > 0 || state.machines.excavator > 0;
        const hits = seconds >= profile.bootstrap && automated ? profile.hitsAfterBootstrap ?? profile.hits : profile.hits;
        for (let i = 0; i < hits * 5; i++) {
          if (state.activeEvent) act({ type: "RESOLVE_EVENT", choice: "careful" });
          if (state.durability <= 0) act({ type: "REPAIR" });
          act({ type: "STRIKE" });
        }
        seconds += 5;
        state = advanceGameTime(state, Date.now());
      } else {
        seconds += Math.min(profile.period - seconds % profile.period, 3600);
        state = advanceGameTime(state, Date.now(), true);
        state = { ...state, offlineReport: null };
      }
      record("première machine", state.machines.drill > 0);
      record("première remontée", state.expeditions >= 1);
      record("troisième remontée", state.expeditions >= 3);
      record("huit travaux", grandWorkStages(state.grandWorks) >= 8);
      record("signal", state.originSignalFound);
      record("cœur", state.origin.visits.heart > 0);
      record("six reliques", state.origin.ownedRelics.length === 6);
      record("fin", state.campaign.completed);
      if (trace && Math.floor(seconds / 3600) !== lastCheckpoint) {
        lastCheckpoint = Math.floor(seconds / 3600);
        console.log(label, lastCheckpoint, "h", "depth", state.depth, "cycle", state.expeditions, "tool", state.toolTier, "works", grandWorkStages(state.grandWorks), "shards", Math.round(state.shards), "mats", state.industryMaterials);
      }
      assert.ok(Number.isFinite(state.shards) && state.shards >= 0 && state.coins >= 0);
      assert.ok(Object.values(state.inventory).every((value) => Number.isFinite(value) && value >= 0));
    }
    if (process.argv.includes("--fixture")) console.log(encodeSave({ ...state, lastSavedAt: originalNow(), lastSimulatedAt: originalNow(), activeEvent: null, offlineReport: null, soundOn: false }));
    return { profile: label, completed: state.campaign.completed, hours: +(seconds / 3600).toFixed(2), strikes: state.totalStrikes,
      depth: state.depth, cycles: state.expeditions, tool: state.toolTier, works: grandWorkStages(state.grandWorks), relics: state.origin.ownedRelics.length,
      milestones: Object.fromEntries(reached), shards: Math.round(state.shards) };
  } finally { Math.random = originalRandom; Date.now = originalNow; }
}

const results = Object.entries(profiles).filter(([label]) => !selected || label === selected).map(([label, profile]) => simulate(label, profile));
console.log(JSON.stringify(results, null, 2));
if (process.argv.includes("--assert")) assert.ok(results.length > 0 && results.every((result) => result.completed), "every selected profile must finish without free resources");
