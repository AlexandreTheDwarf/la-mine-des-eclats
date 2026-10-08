/** One manifest calculator is shared by the UI and reducer. Launches snapshot
 * the result: a later respec, relic swap or reload cannot alter paid missions. */
import {
  CREW,
  crewById,
  crewLevel,
  crewAdjustedCost,
  crewAdjustedDuration,
  crewAdjustedRewards,
  crewXpForRoute,
} from "./crew.ts";
import {
  RIFT_ROUTES,
  riftRouteById,
  riftApproachById,
  riftExpeditionCost,
  riftExpeditionDuration,
  riftExpeditionRewards,
  type RiftRouteId,
  type RiftApproachId,
} from "./riftNetwork.ts";
import {
  CREW_TALENTS,
  RELICS,
  originStageById,
  type ExpeditionBonuses,
  type OriginStageId,
} from "./origin.ts";
import type { GameState } from "./game.ts";

export function expeditionBonuses(state: GameState): ExpeditionBonuses {
  const id = state.selectedCrewId;
  const talent = state.origin.talents[id];
  const sources = RELICS.filter((relic) =>
    state.origin.equippedRelics.includes(relic.id),
  ).map((relic) => relic.bonuses);
  if (talent && crewLevel(state.crewXp[id]) >= 3)
    sources.push(CREW_TALENTS[id][talent].bonuses);
  const bonuses: ExpeditionBonuses = {};
  for (const source of sources) {
    for (const key of Object.keys(source) as Array<keyof ExpeditionBonuses>)
      bonuses[key] = (bonuses[key] ?? 0) + (source[key] ?? 0);
  }
  return bonuses;
}

/** Variants rotate after each return, never on a real-world deadline. The
 * standard mission is always available; the optional pairing grants a bonus. */
export function riftVariant(routeId: RiftRouteId, completions: number) {
  const route = riftRouteById(routeId);
  const index = Math.floor(completions) % 3;
  return {
    key: `${routeId}:${index}`,
    name: ["Échos dispersés", "Convoi oublié", "Passage instable"][index],
    crewId: CREW[(route.index + index + 1) % CREW.length].id,
    approachId: ["survey", "salvage", "swift"][index] as RiftApproachId,
  };
}
export const VARIANT_KEYS = new Set(
  RIFT_ROUTES.flatMap(({ id }) => [0, 1, 2].map((index) => `${id}:${index}`)),
);

export function planRiftExpedition(state: GameState) {
  const route = riftRouteById(state.selectedRiftRouteId);
  const approach = riftApproachById(state.selectedRiftApproachId);
  const member = crewById(state.selectedCrewId);
  const xp = state.crewXp[member.id];
  const fatigue = state.crewFatigue[member.id];
  const visits = state.riftRouteCompletions[route.id];
  const bonus = expeditionBonuses(state);
  const cost = crewAdjustedCost(
    riftExpeditionCost(route, visits),
    member,
    xp,
    fatigue,
  );
  const rewards = crewAdjustedRewards(
    riftExpeditionRewards(route, approach, visits),
    member,
    xp,
    fatigue,
  );
  const variant = riftVariant(route.id, visits);
  // No retrospective bonus for an already visited route, and no forced role.
  const matched =
    visits > 0 &&
    member.id === variant.crewId &&
    approach.id === variant.approachId;
  const extra = matched ? 0.2 : 0;
  return {
    cost: {
      ...cost,
      shards: Math.max(1, Math.ceil(cost.shards * (1 - (bonus.shards ?? 0)))),
    },
    duration: Math.max(
      1,
      Math.round(
        crewAdjustedDuration(
          riftExpeditionDuration(route, approach),
          member,
          xp,
          fatigue,
        ) *
          (1 - (bonus.duration ?? 0)),
      ),
    ),
    manifest: {
      rewards: {
        coins: Math.round(rewards.coins * (1 + (bonus.coins ?? 0) + extra)),
        research: Math.round(
          rewards.research * (1 + (bonus.research ?? 0) + extra),
        ),
        echoes: rewards.echoes,
        survey: rewards.survey + (bonus.survey ?? 0) + (matched ? 1 : 0),
      },
      xp: Math.round(crewXpForRoute(route) * (1 + (bonus.xp ?? 0))),
      fatigue: Math.max(0, 40 - (bonus.fatigue ?? 0)),
      variantKey: matched ? variant.key : null,
    },
    variant,
    matched,
  };
}

export function planOriginExpedition(state: GameState, id: OriginStageId) {
  const stage = originStageById(id);
  const member = crewById(state.selectedCrewId);
  const bonus = expeditionBonuses(state);
  const cost = crewAdjustedCost(
    { shards: stage.shards, materials: stage.materials },
    member,
    state.crewXp[member.id],
    state.crewFatigue[member.id],
  );
  return {
    cost: {
      ...cost,
      shards: Math.ceil(cost.shards * (1 - (bonus.shards ?? 0))),
    },
    duration: Math.max(
      1,
      Math.round(
        crewAdjustedDuration(
          stage.duration,
          member,
          state.crewXp[member.id],
          state.crewFatigue[member.id],
        ) *
          (1 - (bonus.duration ?? 0)),
      ),
    ),
    xp: Math.round(stage.xp * (1 + (bonus.xp ?? 0))),
    fatigue: Math.max(0, 40 - (bonus.fatigue ?? 0)),
  };
}
