// Synthetic test saves only. Never reads browser storage or a player's save.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInitialState, encodeSave, getDerivedStats, ORE_ORDER, rockMaxHpFor } from "../src/game.ts";
import { RELICS } from "../src/origin.ts";
import { RIFT_ROUTES } from "../src/riftNetwork.ts";
const directory = resolve("../../work/v1-fixtures");
mkdirSync(directory, { recursive: true });
const fresh = createInitialState();
const advanced = {
  ...fresh, depth: 600, maxDepth: 600, expeditions: 3, toolTier: 9, selectedZoneId: 5,
  shards: 40_000_000, coins: 12_000_000_000, echoes: 100, totalStrikes: 20000, rocksBroken: 2500, salesCompleted: 20,
  rockHp: rockMaxHpFor(600), rockMaxHp: rockMaxHpFor(600),
  inventory: Object.fromEntries(ORE_ORDER.map((id) => [id, 2000])),
  upgrades: { power: 15, sturdy: 12, precision: 10, geology: 8, maintenance: 7 },
  machines: { drill: 12, cart: 8, smelter: 8, resonator: 4, excavator: 6 },
  grandWorks: { freight: 5, furnace: 5, bureau: 5 },
  industryMaterials: { gears: 500, alloy: 500, prism: 500 },
  crewXp: Object.fromEntries(Object.keys(fresh.crewXp).map((id) => [id, 520])),
  originSignalFound: true, surveyData: 70,
  riftRouteCompletions: Object.fromEntries(RIFT_ROUTES.map((route) => [route.id, 1])),
  origin: { ...fresh.origin, visits: { threshold: 2, archive: 2, heart: 2 }, ownedRelics: RELICS.map((relic) => relic.id), equippedRelics: ["hammer", "engine"] },
  soundOn: false, reducedMotion: true,
};
advanced.durability = getDerivedStats(advanced).maxDurability;
const old = { ...advanced, version: 13 };
for (const key of ["campaign", "reducedMotion", "automaticOreRemainders", "passiveShardRemainder"]) delete old[key];
const ending = { ...advanced, campaign: { ...fresh.campaign, stage: 3, completed: true } };
const almost = { ...advanced, campaign: { ...fresh.campaign, stage: 2, project: { stage: 2, duration: 900, remaining: 2 } } };
for (const [name, state] of Object.entries({ fresh, advanced, old, ending, almost })) {
  const path = resolve(directory, `${name}.txt`);
  writeFileSync(path, encodeSave(state));
  console.log(path);
}
