import assert from "node:assert/strict";
import {
  CONTRACT_OFFER_COUNT,
  CONTRACT_UNLOCK_DEPTH,
  INDUSTRY_DOCTRINE_SWITCH_COST,
  INDUSTRY_MODULES,
  INDUSTRY_RECIPES,
  LEGACIES,
  MARKET_PERIOD_MS,
  ORE_ORDER,
  RESEARCH,
  RESEARCH_UNLOCK_DEPTH,
  TOOLS,
  activeZoneForState,
  canStartExpedition,
  contractRequirementsMet,
  createInitialState,
  decodeSave,
  expectedOreYield,
  ensureContractOffers,
  expeditionReward,
  expeditionTarget,
  gameReducer,
  getDerivedStats,
  inventoryCount,
  industryModuleCost,
  industryQueueCapacity,
  industryUnlocked,
  marketQuoteAt,
  oreStudyCost,
  oreStudyReward,
  researchCost,
  rockMaxHpFor,
  reputationRank,
  selectedInventoryValue,
  veinsPerMeterFor,
  zoneForDepth,
} from "../src/game.ts";
import {
  GRAND_WORKS,
  grandWorkCost,
  grandWorkStageTotal,
  stabilizationCost,
  stabilizationMultiplier,
} from "../src/grandWorks.ts";
import {
  RIFT_APPROACHES,
  RIFT_ROUTES,
  riftExpeditionCost,
  riftExpeditionDuration,
  riftExpeditionRewards,
  riftNetworkUnlocked,
  riftRouteUnlocked,
} from "../src/riftNetwork.ts";
import {
  CREW,
  crewAdjustedCost,
  crewAdjustedDuration,
  crewAdjustedRewards,
  crewLevel,
  crewUnlocked,
  recoverCrewFatigue,
} from "../src/crew.ts";

let state = createInitialState();
const startingDepth = state.depth;

for (let index = 0; index < 100 && state.depth === startingDepth; index += 1) {
  state = gameReducer(state, { type: "STRIKE" });
  if (state.durability === 0) {
    state = { ...state, shards: state.shards + 100 };
    state = gameReducer(state, { type: "REPAIR" });
  }
}

assert.equal(state.depth, startingDepth + 1, "a rock should eventually break");
assert.ok(inventoryCount(state) > 0, "breaking a rock should yield ore");

const valueBeforeSale = getDerivedStats(state).inventoryValue;
state = gameReducer(state, { type: "SELL_ALL" });
assert.equal(inventoryCount(state), 0, "selling should empty the inventory");
assert.equal(state.coins, valueBeforeSale, "selling should grant the computed value");
assert.equal(state.salesCompleted, 1, "selling should complete the contextual sales tutorial");

const quoteTime = 1_800_000;
const marketQuote = marketQuoteAt(quoteTime);
assert.deepEqual(marketQuoteAt(quoteTime), marketQuote, "a market window should keep stable prices");
assert.equal(marketQuote.endsAt, (marketQuote.slot + 1) * MARKET_PERIOD_MS);
Object.values(marketQuote.rates).forEach((rate) => {
  assert.ok(rate >= 0.72 && rate <= 1.4, "market prices should stay inside their designed range");
});

let selectiveSaleState = createInitialState();
selectiveSaleState = {
  ...selectiveSaleState,
  inventory: { ...selectiveSaleState.inventory, stone: 10, copper: 5 },
};
const selectiveValue = selectedInventoryValue(selectiveSaleState, ["stone"], { stone: 1.4 });
selectiveSaleState = gameReducer(selectiveSaleState, { type: "SELL_SELECTED", ids: ["stone"], rates: { stone: 1.4 } });
assert.equal(selectiveSaleState.coins, selectiveValue, "selective sales should use the displayed market rate");
assert.equal(selectiveSaleState.inventory.stone, 0, "a selected ore should be sold");
assert.equal(selectiveSaleState.inventory.copper, 5, "an unselected ore should remain in the cargo");
assert.equal(selectiveSaleState.tradeHistory[0].kind, "market", "market sales should enter the trade ledger");

const contractNow = Date.now();
let contractState = {
  ...createInitialState(),
  depth: CONTRACT_UNLOCK_DEPTH,
  maxDepth: CONTRACT_UNLOCK_DEPTH,
};
contractState = ensureContractOffers(contractState, contractNow);
assert.equal(contractState.contractOffers.length, CONTRACT_OFFER_COUNT, "the Company should broadcast three offers");
assert.equal(reputationRank(0), "Prospecteur indépendant");
assert.equal(reputationRank(20), "Négociant de faille");

const firstContract = contractState.contractOffers[0];
const stockedInventory = { ...contractState.inventory };
Object.entries(firstContract.requirements).forEach(([id, amount]) => {
  stockedInventory[id] = amount;
});
contractState = { ...contractState, inventory: stockedInventory };
assert.ok(contractRequirementsMet(contractState, firstContract), "a fully stocked order should be deliverable");
contractState = gameReducer(contractState, { type: "FULFILL_CONTRACT", id: firstContract.id });
assert.equal(contractState.completedContracts, 1, "fulfilling an order should increment the contract record");
assert.equal(contractState.reputation, firstContract.rewardReputation, "fulfilling an order should grant reputation");
assert.equal(contractState.coins, firstContract.rewardCoins, "fulfilling an order should grant its advertised payment");
assert.equal(contractState.tradeHistory[0].kind, "contract", "contract deliveries should enter the trade ledger");
assert.ok(!contractState.contractOffers.some((offer) => offer.id === firstContract.id), "a delivered contract should leave the board");
contractState = ensureContractOffers(contractState, contractNow + 1_000);
assert.equal(contractState.contractOffers.length, CONTRACT_OFFER_COUNT, "a delivered contract should be replaced");

const studyCost = oreStudyCost("stone", 0);
let researchState = {
  ...createInitialState(),
  depth: RESEARCH_UNLOCK_DEPTH - 1,
  maxDepth: RESEARCH_UNLOCK_DEPTH - 1,
  inventory: { ...createInitialState().inventory, stone: studyCost },
};
researchState = gameReducer(researchState, { type: "ANALYZE_ORE", id: "stone" });
assert.equal(researchState.analysesCompleted, 0, "the laboratory should stay locked before 80 metres");

researchState = { ...researchState, depth: RESEARCH_UNLOCK_DEPTH, maxDepth: RESEARCH_UNLOCK_DEPTH };
researchState = gameReducer(researchState, { type: "ANALYZE_ORE", id: "stone" });
assert.equal(researchState.inventory.stone, 0, "an analysis should consume its displayed samples");
assert.equal(researchState.oreStudies.stone, 1, "an analysis should advance the mineral codex");
assert.equal(researchState.analysesCompleted, 1, "an analysis should increment the lifetime record");
assert.equal(researchState.researchPoints, oreStudyReward("stone", 0), "an analysis should grant its advertised data");

const impactProtocol = RESEARCH.find((definition) => definition.id === "impact");
assert.ok(impactProtocol, "the impact protocol should exist");
const researchDamage = getDerivedStats(researchState).clickDamage;
researchState = { ...researchState, researchPoints: researchCost(impactProtocol, 0) };
researchState = gameReducer(researchState, { type: "BUY_RESEARCH", id: "impact" });
assert.equal(researchState.research.impact, 1, "buying a protocol should advance its level");
assert.ok(getDerivedStats(researchState).clickDamage > researchDamage, "impact research should improve manual damage");

assert.equal(industryUnlocked(createInitialState()), false, "industry should stay locked before the first expedition");
let industryState = {
  ...createInitialState(),
  expeditions: 1,
  echoes: 10,
  inventory: { ...createInitialState().inventory, stone: 90, copper: 28 },
};
assert.equal(industryUnlocked(industryState), true, "the first expedition should unlock industry");
industryState = gameReducer(industryState, { type: "SELECT_INDUSTRY_DOCTRINE", id: "extraction" });
assert.equal(industryState.industryDoctrine, "extraction", "the first doctrine should be free");
assert.equal(industryState.echoes, 10, "choosing a first doctrine should not consume echoes");
industryState = gameReducer(industryState, { type: "SELECT_INDUSTRY_DOCTRINE", id: "commerce" });
assert.equal(industryState.industryDoctrine, "commerce", "a doctrine should remain changeable");
assert.equal(industryState.echoes, 10 - INDUSTRY_DOCTRINE_SWITCH_COST, "changing doctrine should consume echoes");

const gearsRecipe = INDUSTRY_RECIPES.find((recipe) => recipe.id === "gears");
assert.ok(gearsRecipe, "the gallery gear recipe should exist");
industryState = gameReducer(industryState, { type: "START_INDUSTRY_RECIPE", id: "gears" });
assert.equal(industryState.inventory.stone, 0, "starting a batch should consume its stone");
assert.equal(industryState.inventory.copper, 0, "starting a batch should consume its copper");
assert.equal(industryState.productionQueue[0]?.recipeId, "gears", "the selected recipe should enter production");
industryState = gameReducer(industryState, { type: "TICK", seconds: gearsRecipe.duration - 1 });
assert.equal(industryState.industryMaterials.gears, 0, "an unfinished batch should not grant components");
industryState = gameReducer(industryState, { type: "TICK", seconds: 1 });
assert.equal(industryState.industryMaterials.gears, gearsRecipe.output, "a completed batch should grant its components");
assert.equal(industryState.completedBatches, 1, "completed batches should feed industrial objectives");
assert.equal(industryState.productionQueue.length, 0, "the production line should become available after completion");

let queueState = {
  ...createInitialState(),
  expeditions: 2,
  grandWorks: { freight: 2, furnace: 0, bureau: 0 },
  inventory: { ...createInitialState().inventory, stone: 360, copper: 112 },
};
assert.equal(industryQueueCapacity(queueState), 3, "each logistics stage should add one queue slot");
for (let index = 0; index < 4; index += 1) {
  queueState = gameReducer(queueState, { type: "START_INDUSTRY_RECIPE", id: "gears" });
}
assert.equal(queueState.productionQueue.length, 3, "orders beyond queue capacity should be rejected");
assert.equal(queueState.inventory.stone, 90, "a rejected order should not consume its inputs");

let furnaceState = {
  ...createInitialState(),
  expeditions: 2,
  grandWorks: { freight: 0, furnace: 1, bureau: 0 },
  inventory: { ...createInitialState().inventory, stone: 90, copper: 28 },
};
furnaceState = gameReducer(furnaceState, { type: "START_INDUSTRY_RECIPE", id: "gears" });
furnaceState = gameReducer(furnaceState, { type: "TICK", seconds: 22 });
assert.equal(furnaceState.completedBatches, 1, "the thermal core should shorten effective production time");

let repeatState = {
  ...createInitialState(),
  expeditions: 2,
  grandWorks: { freight: 0, furnace: 0, bureau: 1 },
  inventory: { ...createInitialState().inventory, stone: 180, copper: 56 },
};
repeatState = gameReducer(repeatState, { type: "SET_AUTO_REPEAT", id: "gears" });
repeatState = gameReducer(repeatState, { type: "START_INDUSTRY_RECIPE", id: "gears" });
repeatState = gameReducer(repeatState, { type: "TICK", seconds: gearsRecipe.duration });
assert.equal(repeatState.completedBatches, 1, "auto-repeat should still count completed batches normally");
assert.equal(repeatState.productionQueue.length, 1, "auto-repeat should append the replacement order");
assert.equal(repeatState.inventory.stone, 0, "auto-repeat should commit the next batch inputs immediately");

const pressModule = INDUSTRY_MODULES.find((module) => module.id === "press");
assert.ok(pressModule, "the telluric press should exist");
const pressCost = industryModuleCost(pressModule, 0);
industryState = {
  ...industryState,
  machines: { ...industryState.machines, drill: 1 },
  industryMaterials: { gears: pressCost.gears ?? 0, alloy: pressCost.alloy ?? 0, prism: pressCost.prism ?? 0 },
};
const autoBeforePress = getDerivedStats(industryState).autoDamage;
industryState = gameReducer(industryState, { type: "BUY_INDUSTRY_MODULE", id: "press" });
assert.equal(industryState.industryModules.press, 1, "buying an industrial module should advance its level");
assert.ok(getDerivedStats(industryState).autoDamage > autoBeforePress, "the telluric press should boost automation");

const grandWorkShardTotal = GRAND_WORKS.reduce((total, definition) => {
  let projectTotal = 0;
  for (let level = 0; level < definition.max; level += 1) {
    projectTotal += grandWorkCost(definition, level).shards;
  }
  return total + projectTotal;
}, 0);
assert.equal(grandWorkStageTotal(), 15, "the v0.8 campaign should contain fifteen infrastructure stages");
assert.ok(grandWorkShardTotal > 15_000_000, "Grand Works should remain meaningful beyond a 1.3 million shard stockpile");

const freightProject = GRAND_WORKS.find((definition) => definition.id === "freight");
assert.ok(freightProject, "the logistics shaft should exist");
const firstFreightCost = grandWorkCost(freightProject, 0);
let worksState = {
  ...createInitialState(),
  expeditions: 2,
  shards: firstFreightCost.shards,
  industryMaterials: {
    gears: firstFreightCost.materials.gears ?? 0,
    alloy: firstFreightCost.materials.alloy ?? 0,
    prism: firstFreightCost.materials.prism ?? 0,
  },
};
worksState = gameReducer(worksState, { type: "BUY_GRAND_WORK", id: "freight" });
assert.equal(worksState.grandWorks.freight, 1, "paying a project cost should complete exactly one stage");
assert.equal(worksState.shards, 0, "a Grand Work should consume its advertised shard cost");
assert.equal(worksState.industryMaterials.gears, 0, "a Grand Work should consume its advertised components");

const stabilizationBase = stabilizationMultiplier(0);
const firstStabilizationCost = stabilizationCost(0);
let stabilizationState = {
  ...createInitialState(),
  expeditions: 2,
  shards: firstStabilizationCost,
  grandWorks: { freight: 5, furnace: 5, bureau: 5 },
};
stabilizationState = gameReducer(stabilizationState, { type: "STABILIZE_NETWORK" });
assert.equal(stabilizationState.stabilizations, 1, "completed infrastructure should unlock repeatable stabilization");
assert.equal(stabilizationState.shards, 0, "stabilization should consume its escalating shard cost");
assert.ok(stabilizationMultiplier(1) > stabilizationBase, "stabilization should grant a permanent efficiency increase");
assert.ok(stabilizationMultiplier(10_000) < 1.161, "the repeatable sink should never recreate unbounded exponential growth");

const riftWorks = { freight: 3, furnace: 3, bureau: 2 };
assert.equal(riftNetworkUnlocked(2, riftWorks), false, "the rift network should require three mine expeditions");
assert.equal(riftNetworkUnlocked(3, { freight: 2, furnace: 2, bureau: 2 }), false, "the rift network should require eight completed work stages");
assert.equal(riftNetworkUnlocked(3, riftWorks), true, "the rift network should open once both campaign gates are met");

let cumulativeSurvey = 0;
for (const route of RIFT_ROUTES) {
  assert.ok(cumulativeSurvey >= route.requiredSurvey, "one first visit per route should reveal the next destination without repeat grinding");
  cumulativeSurvey += route.firstSurvey;
}
assert.equal(cumulativeSurvey, 32, "surveying every route once should reveal the terminal signal");
assert.ok(RIFT_ROUTES.reduce((total, route) => total + route.duration, 0) >= 5 * 60 * 60, "the first map traversal should add several hours of timed progression");

const lanternRoute = RIFT_ROUTES[0];
const surveyApproach = RIFT_APPROACHES.find((approach) => approach.id === "survey");
const swiftApproach = RIFT_APPROACHES.find((approach) => approach.id === "swift");
const salvageApproach = RIFT_APPROACHES.find((approach) => approach.id === "salvage");
assert.ok(surveyApproach && swiftApproach && salvageApproach, "all three expedition approaches should exist");
assert.ok(riftExpeditionDuration(lanternRoute, swiftApproach) < lanternRoute.duration, "scouting should shorten an expedition");
assert.ok(riftExpeditionDuration(lanternRoute, salvageApproach) > lanternRoute.duration, "salvage should trade time for loot");

const [mica, braise, nova, opale, silex, aurore] = CREW;
assert.equal(crewUnlocked(1, mica), true, "Mica should make crew assignment available immediately");
assert.equal(crewUnlocked(24, braise), false, "specialists should respect their depth milestones");
assert.equal(crewUnlocked(25, braise), true, "Braise should join at 25 metres");
assert.equal(crewLevel(0), 1, "crew progression should start at level one");
assert.equal(crewLevel(100), 2, "the first training threshold should grant level two");
assert.ok(crewAdjustedDuration(300, mica, 0, 0) < 300, "Mica should shorten rift travel");
assert.ok(crewAdjustedCost({ shards: 1_000, materials: { gears: 10 } }, braise, 0, 0).materials.gears < 10, "Braise should save industrial components");
assert.ok(crewAdjustedCost({ shards: 1_000, materials: { gears: 10 } }, silex, 0, 0).shards < 1_000, "Silex should save shards");
assert.ok(crewAdjustedRewards({ coins: 1_000, research: 10, echoes: 2, survey: 1 }, nova, 0, 0).coins > 1_000, "Nova should improve coin returns");
assert.ok(crewAdjustedRewards({ coins: 1_000, research: 10, echoes: 2, survey: 1 }, opale, 0, 0).survey > 1, "Opale should improve cartography");
assert.ok(crewAdjustedRewards({ coins: 1_000, research: 10, echoes: 2, survey: 1 }, aurore, 0, 0).research > 10, "Aurore should improve signal research");
assert.equal(recoverCrewFatigue(40, 90), 39, "one rest interval should recover one fatigue point");

const firstRiftCost = riftExpeditionCost(lanternRoute, 0);
const firstRiftRewards = riftExpeditionRewards(lanternRoute, surveyApproach, 0);
let riftState = {
  ...createInitialState(),
  expeditions: 3,
  grandWorks: riftWorks,
  shards: firstRiftCost.shards,
  industryMaterials: {
    gears: firstRiftCost.materials.gears ?? 0,
    alloy: firstRiftCost.materials.alloy ?? 0,
    prism: firstRiftCost.materials.prism ?? 0,
  },
};
riftState = gameReducer(riftState, { type: "START_RIFT_EXPEDITION" });
assert.equal(riftState.shards, 0, "launching a rift expedition should pay its shard manifest immediately");
assert.equal(riftState.industryMaterials.gears, 0, "launching should commit its industrial components");
assert.equal(riftState.activeRiftExpedition?.routeId, lanternRoute.id, "the selected route should become active");
assert.equal(riftState.activeRiftExpedition?.crewId, "mica", "the selected crew member should lead the expedition");
const launchedDuration = riftState.activeRiftExpedition.duration;
riftState = gameReducer(riftState, { type: "TICK", seconds: launchedDuration - 1 });
assert.ok(riftState.activeRiftExpedition, "an expedition should remain active until its last second");
riftState = gameReducer(riftState, { type: "TICK", seconds: 1 });
assert.equal(riftState.activeRiftExpedition, null, "a completed expedition should release the exploration team");
assert.equal(riftState.riftRouteCompletions.lanterns, 1, "a return should advance its route record");
assert.equal(riftState.riftExpeditionsCompleted, 1, "rift returns should feed lifetime objectives");
assert.equal(riftState.surveyData, firstRiftRewards.survey, "cartography rewards should match the chosen approach");
assert.equal(riftState.coins, firstRiftRewards.coins, "the returning team should grant its displayed coins");
assert.equal(riftState.riftReports.length, 1, "the latest expedition should create a readable report");
assert.equal(riftState.riftReports[0].crewId, "mica", "return reports should credit their expedition leader");
assert.equal(riftState.crewXp.mica, 35, "a first-route return should train its expedition leader");
assert.equal(riftState.crewFatigue.mica, 40, "a return should add soft crew fatigue");
assert.ok(riftRouteUnlocked(riftState.surveyData, RIFT_ROUTES[1]), "the first survey should reveal the second map node");
assert.ok(riftExpeditionCost(lanternRoute, 1).shards > firstRiftCost.shards, "repeat visits should become a growing shard sink");

assert.equal(
  expectedOreYield(22, 2),
  expectedOreYield(22, 1) * 2,
  "ore yield multipliers should be applied exactly once",
);

state = { ...state, shards: 1_000 };
const damageBeforeUpgrade = getDerivedStats(state).clickDamage;
state = gameReducer(state, { type: "BUY_UPGRADE", id: "power" });
assert.ok(getDerivedStats(state).clickDamage > damageBeforeUpgrade, "power upgrade should increase damage");

state = { ...state, depth: 8, maxDepth: 8, coins: 10_000 };
state = gameReducer(state, { type: "BUY_MACHINE", id: "drill" });
assert.ok(getDerivedStats(state).autoDamage > 0, "a drill should create automatic damage");

assert.equal(zoneForDepth(1).id, 0);
assert.equal(zoneForDepth(25).id, 1);
assert.equal(zoneForDepth(60).id, 2);
assert.equal(zoneForDepth(120).id, 3);
assert.equal(zoneForDepth(220).id, 4);
assert.equal(zoneForDepth(360).id, 5);
assert.equal(veinsPerMeterFor(1), 1);
assert.equal(veinsPerMeterFor(25), 2);
assert.equal(veinsPerMeterFor(60), 3);
assert.equal(veinsPerMeterFor(120), 5);
assert.equal(veinsPerMeterFor(220), 7);
assert.equal(veinsPerMeterFor(360), 9);
assert.equal(ORE_ORDER.length, 10, "the extended campaign should expose ten ores");
assert.equal(TOOLS.length, 11, "the forge should contain eleven tool tiers");

let galleryState = {
  ...createInitialState(),
  depth: 25,
  selectedZoneId: 1,
  rockHp: rockMaxHpFor(25),
  rockMaxHp: rockMaxHpFor(25),
};
galleryState = gameReducer(galleryState, { type: "SELECT_ZONE", id: 0 });
assert.equal(activeZoneForState(galleryState).id, 0, "a discovered gallery should be selectable");
assert.equal(galleryState.depth, 25, "changing galleries should preserve the deepest depth");

const inventoryBeforeProspecting = { ...galleryState.inventory };
galleryState = gameReducer({ ...galleryState, rockHp: 1, durability: 100 }, { type: "STRIKE" });
assert.equal(galleryState.depth, 25, "prospecting an old gallery should not advance the main descent");
const prospectingDrops = Object.entries(galleryState.inventory)
  .filter(([id, amount]) => amount > inventoryBeforeProspecting[id])
  .map(([id]) => id);
assert.ok(prospectingDrops.length > 0, "prospecting should still yield ore");
assert.ok(
  prospectingDrops.every((id) => zoneForDepth(1).orePool.some((entry) => entry.id === id)),
  "an old gallery should use its own ore table",
);

const lockedAttempt = gameReducer({ ...galleryState, activeEvent: null }, { type: "SELECT_ZONE", id: 2 });
assert.equal(lockedAttempt.selectedZoneId, 0, "a gallery deeper than the player's record must stay locked");

galleryState = gameReducer({ ...galleryState, activeEvent: null }, { type: "SELECT_ZONE", id: 1 });
galleryState = gameReducer({ ...galleryState, rockHp: 1, durability: 100 }, { type: "STRIKE" });
assert.equal(galleryState.depth, 25, "deep sectors should require several strata per metre");
assert.equal(galleryState.strataProgress, 1, "breaking a deep vein should advance its strata counter");
galleryState = gameReducer({ ...galleryState, rockHp: 1, durability: 100 }, { type: "STRIKE" });
assert.equal(galleryState.depth, 26, "returning to the deepest gallery should resume progression");

let cappedState = {
  ...createInitialState(),
  depth: 120,
  maxDepth: 120,
  selectedZoneId: 3,
  rockHp: 1,
  rockMaxHp: rockMaxHpFor(120),
  durability: 100,
  reputation: 17,
  completedContracts: 4,
  tradeHistory: [{ id: 1, kind: "contract", label: "Comptoir test", units: 12, coins: 400, timestamp: 1 }],
  researchPoints: 19,
  analysesCompleted: 3,
  oreStudies: { ...createInitialState().oreStudies, stone: 2 },
  research: { ...createInitialState().research, impact: 1 },
  industryMaterials: { gears: 4, alloy: 2, prism: 1 },
  industryDoctrine: "resonance",
  industryModules: { press: 1, logistics: 1, stabilizer: 0 },
  productionQueue: [{ recipeId: "gears", remaining: 12, duration: 24 }],
  autoRepeatRecipeId: "gears",
  completedBatches: 7,
  grandWorks: { freight: 1, furnace: 1, bureau: 1 },
  stabilizations: 2,
  surveyData: 7,
  selectedRiftRouteId: "magnet",
  selectedRiftApproachId: "swift",
  activeRiftExpedition: { routeId: "lanterns", approachId: "swift", crewId: "nova", duration: 165, remaining: 90 },
  riftRouteCompletions: { lanterns: 2, magnet: 1, emberSpine: 0, whispers: 0, glassArc: 0 },
  riftExpeditionsCompleted: 3,
  riftReports: [],
  selectedCrewId: "nova",
  crewXp: { mica: 110, braise: 40, nova: 285, opale: 0, silex: 0, aurore: 0 },
  crewFatigue: { mica: 10, braise: 0, nova: 36, opale: 0, silex: 0, aurore: 0 },
};
cappedState = gameReducer(cappedState, { type: "STRIKE" });
assert.equal(cappedState.depth, 120, "the first expedition should stop at its 120 metre beacon");
assert.ok(cappedState.message.includes("balise saturée"), "the cycle cap should explain the next step");
assert.equal(expeditionTarget(0), 120);
assert.equal(expeditionTarget(1), 240);
assert.equal(expeditionTarget(2), 400);
assert.equal(expeditionTarget(3), 600);
assert.equal(expeditionTarget(4), 800);
assert.ok(canStartExpedition(cappedState), "a reached beacon should allow a new expedition");

const expectedEchoes = expeditionReward(cappedState);
const lifetimeRocks = cappedState.rocksBroken;
let cycledState = gameReducer(cappedState, { type: "START_EXPEDITION" });
assert.equal(cycledState.depth, 1, "a new expedition should restart the active descent");
assert.equal(cycledState.maxDepth, 120, "a new expedition should preserve the depth record");
assert.equal(cycledState.expeditions, 1, "a new expedition should increment the cycle counter");
assert.equal(cycledState.echoes, expectedEchoes, "a new expedition should award permanent echoes");
assert.equal(cycledState.rocksBroken, lifetimeRocks, "lifetime statistics should survive a new cycle");
assert.equal(inventoryCount(cycledState), 0, "a new cycle should reset the cargo");
assert.equal(cycledState.reputation, 17, "Company reputation should survive a new cycle");
assert.equal(cycledState.completedContracts, 4, "fulfilled contracts should survive a new cycle");
assert.equal(cycledState.tradeHistory.length, 1, "the trade ledger should survive a new cycle");
assert.equal(cycledState.researchPoints, 19, "unused research data should survive a new cycle");
assert.equal(cycledState.analysesCompleted, 3, "the analysis record should survive a new cycle");
assert.equal(cycledState.oreStudies.stone, 2, "the mineral codex should survive a new cycle");
assert.equal(cycledState.research.impact, 1, "research protocols should survive a new cycle");
assert.deepEqual(cycledState.industryMaterials, { gears: 4, alloy: 2, prism: 1 }, "industrial components should survive a new cycle");
assert.equal(cycledState.industryDoctrine, "resonance", "the industrial doctrine should survive a new cycle");
assert.equal(cycledState.industryModules.press, 1, "industrial modules should survive a new cycle");
assert.equal(cycledState.productionQueue[0]?.remaining, 12, "committed production orders should survive a new cycle");
assert.equal(cycledState.autoRepeatRecipeId, "gears", "industrial automation settings should survive a new cycle");
assert.equal(cycledState.completedBatches, 7, "industrial production records should survive a new cycle");
assert.deepEqual(cycledState.grandWorks, { freight: 1, furnace: 1, bureau: 1 }, "Grand Works should survive a new cycle");
assert.equal(cycledState.stabilizations, 2, "network stabilizations should survive a new cycle");
assert.equal(cycledState.surveyData, 7, "cartography data should survive a new cycle");
assert.equal(cycledState.activeRiftExpedition?.remaining, 90, "a team in transit should survive a new mine cycle");
assert.equal(cycledState.riftRouteCompletions.lanterns, 2, "rift route history should remain permanent");
assert.equal(cycledState.riftExpeditionsCompleted, 3, "the rift expedition record should remain permanent");
assert.equal(cycledState.selectedCrewId, "nova", "crew selection should survive a new mine cycle");
assert.equal(cycledState.crewXp.nova, 285, "crew experience should survive a new mine cycle");
assert.equal(cycledState.crewFatigue.nova, 36, "crew fatigue should survive a new mine cycle");

cycledState = { ...cycledState, toolTier: 1 };
const legacyDamage = getDerivedStats(cycledState).clickDamage;
cycledState = { ...cycledState, echoes: 100 };
cycledState = gameReducer(cycledState, { type: "BUY_LEGACY", id: LEGACIES[0].id });
assert.ok(getDerivedStats(cycledState).clickDamage > legacyDamage, "a permanent force memory should boost later cycles");

const oldSave = Buffer.from(JSON.stringify({ version: 4, depth: 60, selectedZoneId: 2, rockHp: 10, rockMaxHp: 10 }), "utf8").toString("base64");
const migratedSave = decodeSave(oldSave);
assert.equal(migratedSave.version, 11, "old saves should migrate to the crew campaign");
assert.equal(migratedSave.maxDepth, 60, "old saves should preserve their depth as a permanent record");
assert.equal(migratedSave.inventory.dawn, 0, "old saves should receive the new ore slots");
assert.equal(migratedSave.researchPoints, 0, "old saves should receive the research resource");
assert.equal(migratedSave.research.impact, 0, "old saves should receive empty research protocols");
assert.deepEqual(migratedSave.industryMaterials, { gears: 0, alloy: 0, prism: 0 }, "old saves should receive empty industrial stores");
assert.equal(migratedSave.productionQueue.length, 0, "old saves should start without industrial orders");
assert.deepEqual(migratedSave.grandWorks, { freight: 0, furnace: 0, bureau: 0 }, "old saves should receive empty infrastructure plans");
assert.equal(migratedSave.surveyData, 0, "old saves should receive an empty cartography record");
assert.equal(migratedSave.activeRiftExpedition, null, "old saves should start without an exploration team in transit");
assert.equal(migratedSave.selectedCrewId, "mica", "old saves should receive a safe crew selection");
assert.deepEqual(migratedSave.crewXp, { mica: 0, braise: 0, nova: 0, opale: 0, silex: 0, aurore: 0 }, "old saves should receive empty crew training records");

const v7Save = Buffer.from(JSON.stringify({
  version: 8,
  expeditions: 1,
  productionJob: { recipeId: "alloy", remaining: 17, duration: 42 },
}), "utf8").toString("base64");
const migratedV7Save = decodeSave(v7Save);
assert.equal(migratedV7Save.productionQueue[0]?.recipeId, "alloy", "v0.7 active production should migrate into the queue");
assert.equal(migratedV7Save.productionQueue[0]?.remaining, 17, "migration should preserve already earned production time");

const v8Save = Buffer.from(JSON.stringify({
  version: 9,
  expeditions: 3,
  grandWorks: { freight: 3, furnace: 3, bureau: 2 },
  stabilizations: 1,
}), "utf8").toString("base64");
const migratedV8Save = decodeSave(v8Save);
assert.equal(migratedV8Save.version, 11, "v0.8 saves should migrate to the crew schema");
assert.deepEqual(migratedV8Save.grandWorks, { freight: 3, furnace: 3, bureau: 2 }, "migration should preserve Grand Works progression");
assert.equal(migratedV8Save.selectedRiftRouteId, "lanterns", "new cartography settings should receive a safe default");
assert.deepEqual(migratedV8Save.riftRouteCompletions, { lanterns: 0, magnet: 0, emberSpine: 0, whispers: 0, glassArc: 0 }, "v0.8 saves should receive an empty route record");

const v9Save = Buffer.from(JSON.stringify({
  version: 10,
  maxDepth: 360,
  activeRiftExpedition: { routeId: "lanterns", approachId: "survey", duration: 300, remaining: 47 },
  riftReports: [{ id: 2, routeId: "lanterns", approachId: "survey", rewards: firstRiftRewards, completedAt: 1 }],
}), "utf8").toString("base64");
const migratedV9Save = decodeSave(v9Save);
assert.equal(migratedV9Save.activeRiftExpedition?.crewId, "mica", "v0.9 in-flight expeditions should migrate without losing their timer");
assert.equal(migratedV9Save.activeRiftExpedition?.remaining, 47, "v0.9 migration should preserve remaining expedition time");
assert.equal(migratedV9Save.riftReports[0]?.crewId, "mica", "v0.9 reports should receive a compatible crew attribution");

console.log("OK: mining, trade, industry, Grand Works, Rift Network, crew progression, save migration and expedition cycles.");
