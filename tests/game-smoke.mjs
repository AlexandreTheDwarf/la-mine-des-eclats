import assert from "node:assert/strict";
import {
  LEGACIES,
  MARKET_PERIOD_MS,
  ORE_ORDER,
  TOOLS,
  activeZoneForState,
  canStartExpedition,
  createInitialState,
  decodeSave,
  expectedOreYield,
  expeditionReward,
  expeditionTarget,
  gameReducer,
  getDerivedStats,
  inventoryCount,
  marketQuoteAt,
  rockMaxHpFor,
  selectedInventoryValue,
  veinsPerMeterFor,
  zoneForDepth,
} from "../src/game.ts";

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

const legacyDamage = getDerivedStats(cycledState).clickDamage;
cycledState = { ...cycledState, echoes: 100 };
cycledState = gameReducer(cycledState, { type: "BUY_LEGACY", id: LEGACIES[0].id });
assert.ok(getDerivedStats(cycledState).clickDamage > legacyDamage, "a permanent force memory should boost later cycles");

const oldSave = Buffer.from(JSON.stringify({ version: 4, depth: 60, selectedZoneId: 2, rockHp: 10, rockMaxHp: 10 }), "utf8").toString("base64");
const migratedSave = decodeSave(oldSave);
assert.equal(migratedSave.version, 5, "old saves should migrate to the extended campaign");
assert.equal(migratedSave.maxDepth, 60, "old saves should preserve their depth as a permanent record");
assert.equal(migratedSave.inventory.dawn, 0, "old saves should receive the new ore slots");

console.log("OK: mining, selective market sales, galleries, legacies and expedition cycles.");
