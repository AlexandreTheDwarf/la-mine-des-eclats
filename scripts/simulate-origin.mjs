// Deterministic campaign walkthrough, not a promise of real player duration.
// Starts after the fifth route, with a funded warehouse; mining/fabrication
// times are intentionally excluded and reported as such.
import assert from "node:assert/strict";
import { createInitialState, gameReducer, encodeSave } from "../src/game.ts";
import { RIFT_ROUTES, RIFT_APPROACHES } from "../src/riftNetwork.ts";
import { CREW } from "../src/crew.ts";
import { ORIGIN_STAGES, originStageUnlocked } from "../src/origin.ts";
import {
  planRiftExpedition,
  planOriginExpedition,
  riftVariant,
} from "../src/expeditionPlanning.ts";

let state = {
  ...createInitialState(),
  maxDepth: 800,
  depth: 600,
  expeditions: 3,
  shards: 10_000_000,
  surveyData: 39,
  originSignalFound: true,
  grandWorks: { freight: 3, furnace: 3, bureau: 2 },
  riftRouteCompletions: Object.fromEntries(
    RIFT_ROUTES.map((route) => [route.id, 1]),
  ),
  industryMaterials: { gears: 500, alloy: 500, prism: 500 },
  soundOn: false,
};
// A fresh synthetic save can be imported through the normal UI for QA. This
// never reads, modifies or replaces a real browser's saved mine.
if (process.argv.includes("--fixture")) {
  console.log(encodeSave(state));
  process.exit(0);
}
const initial = structuredClone(state);
let elapsed = 0;
let missions = 0;
const finish = () => {
  const seconds = (state.activeRiftExpedition ?? state.origin.activeJob)
    .remaining;
  elapsed += seconds;
  missions++;
  state = gameReducer(state, { type: "TICK", seconds });
};
function surveyNext() {
  // Pick the best affordable survey rate, prioritizing a missing variant
  // until all four required discoveries have been recorded.
  const options = [];
  for (const route of RIFT_ROUTES) {
    const variant = riftVariant(route.id, state.riftRouteCompletions[route.id]);
    for (const member of CREW)
      for (const approach of RIFT_APPROACHES) {
        const candidate = {
          ...state,
          selectedRiftRouteId: route.id,
          selectedCrewId: member.id,
          selectedRiftApproachId: approach.id,
        };
        const plan = planRiftExpedition(candidate);
        const needsDiscovery = state.origin.variantDiscoveries.length < 4;
        if (
          needsDiscovery &&
          (!plan.matched ||
            state.origin.variantDiscoveries.includes(variant.key))
        )
          continue;
        options.push({
          candidate,
          plan,
          score: plan.duration / plan.manifest.rewards.survey,
        });
      }
  }
  options.sort((a, b) => a.score - b.score);
  assert.ok(options.length, "a route to progress must remain available");
  state = gameReducer(options[0].candidate, { type: "START_RIFT_EXPEDITION" });
  assert.ok(
    state.activeRiftExpedition,
    "simulation warehouse must fund selected route",
  );
  finish();
}
for (const stage of ORIGIN_STAGES) {
  let guard = 0;
  while (!originStageUnlocked(state.origin, true, state.surveyData, stage.id)) {
    assert.ok(guard++ < 40, "campaign progression must converge");
    surveyNext();
  }
  // Mica's speed and the recovered compass are a plausible focused loadout.
  state = gameReducer(state, { type: "SELECT_CREW", id: "mica" });
  state = gameReducer(state, {
    type: "SELECT_CREW_TALENT",
    crewId: "mica",
    id: "field",
  });
  const plan = planOriginExpedition(state, stage.id);
  state = gameReducer(state, { type: "START_ORIGIN_EXPEDITION", id: stage.id });
  assert.ok(state.origin.activeJob);
  finish();
  const relic = stage.id === "archive" ? "compass" : stage.relics[0];
  state = gameReducer(state, { type: "CLAIM_ORIGIN_RELIC", id: relic });
  state = gameReducer(state, { type: "TOGGLE_RELIC", id: relic });
  console.log(
    `${stage.name}: ${Math.round(elapsed / 60)} min cumulées, ${plan.cost.shards} éclats, ${state.surveyData} cartographie, ${state.origin.variantDiscoveries.length} variantes`,
  );
}
const storyTime = elapsed;
for (const stage of ORIGIN_STAGES) {
  state = gameReducer(state, { type: "START_ORIGIN_EXPEDITION", id: stage.id });
  finish();
  state = gameReducer(state, {
    type: "CLAIM_ORIGIN_RELIC",
    id: stage.relics.find((id) => !state.origin.ownedRelics.includes(id)),
  });
}
assert.equal(state.origin.ownedRelics.length, 6);
console.log(
  JSON.stringify(
    {
      campaignMinutes: Math.round(storyTime / 60),
      collectionMinutes: Math.round(elapsed / 60),
      missions,
      spentShards: initial.shards - state.shards,
      components: Object.fromEntries(
        Object.entries(initial.industryMaterials).map(([id, count]) => [
          id,
          count - state.industryMaterials[id],
        ]),
      ),
      note: "Trajets uniquement, sans le temps de minage, de fabrication ni les pauses du joueur.",
    },
    null,
    2,
  ),
);
