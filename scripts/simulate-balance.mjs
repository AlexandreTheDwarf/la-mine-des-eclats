// Resource-rich comparisons isolate travel/training rules from mine production.
// This is a diagnostic, not a promise about total player campaign duration.
import { createInitialState, gameReducer } from "../src/game.ts";
import { RIFT_ROUTES } from "../src/riftNetwork.ts";
import { crewXpForRoute } from "../src/crew.ts";

function scenario(label, chooseRoute) {
  let state = {
    ...createInitialState(), expeditions: 3, maxDepth: 360,
    shards: 1e15, industryMaterials: { gears: 1e9, alloy: 1e9, prism: 1e9 },
    grandWorks: { freight: 3, furnace: 3, bureau: 2 }, selectedCrewId: "opale",
    selectedRiftApproachId: "swift",
  };
  let seconds = 0;
  let spent = 0;
  for (let trip = 0; trip < 20 && !state.originSignalFound; trip++) {
    state = gameReducer(state, { type: "SELECT_RIFT_ROUTE", id: chooseRoute(state, trip) });
    const before = state.shards;
    state = gameReducer(state, { type: "START_RIFT_EXPEDITION" });
    if (!state.activeRiftExpedition) throw new Error("Scenario cannot launch");
    spent += before - state.shards;
    seconds += state.activeRiftExpedition.duration;
    state = gameReducer(state, { type: "TICK", seconds: state.activeRiftExpedition.duration });
  }
  return { strategy: label, minutes: +(seconds / 60).toFixed(2), trips: state.riftExpeditionsCompleted,
    routes: Object.values(state.riftRouteCompletions).filter(Boolean).length,
    survey: state.surveyData, origin: state.originSignalFound, shardsSpent: spent };
}
console.table([
  scenario("Opale: nearby route repeated", () => "lanterns"),
  scenario("Opale: explore each route", (_state, trip) => RIFT_ROUTES[Math.min(trip, 4)].id),
]);
console.table(RIFT_ROUTES.map((route) => ({ route: route.id, minutes: route.duration / 60,
  xp: crewXpForRoute(route), xpPerMinute: +(crewXpForRoute(route) / (route.duration / 60)).toFixed(2) })));
