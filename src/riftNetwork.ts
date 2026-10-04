/**
 * Pure rules for the v0.9 rift-expedition layer.
 *
 * No React or full GameState dependency belongs here. Keeping the route table
 * and its formulas isolated makes balance changes easy to review and allows
 * the smoke tests to simulate hours of expeditions in a few milliseconds.
 */

import { grandWorkStages, type GrandWorkLevels } from "./grandWorks.ts";
import type { CrewId } from "./crew.ts";

export type RiftRouteId = "lanterns" | "magnet" | "emberSpine" | "whispers" | "glassArc";
export type RiftApproachId = "swift" | "survey" | "salvage";
export type RiftMaterialId = "gears" | "alloy" | "prism";
export type RiftRouteCompletions = Record<RiftRouteId, number>;

export interface RiftRouteDefinition {
  id: RiftRouteId;
  index: number;
  name: string;
  sector: string;
  description: string;
  duration: number;
  requiredSurvey: number;
  shardCost: number;
  materialCost: Partial<Record<RiftMaterialId, number>>;
  firstSurvey: number;
  rewards: {
    coins: number;
    research: number;
    echoes: number;
  };
  tone: "cyan" | "green" | "ember" | "violet" | "glass";
}

export interface RiftApproachDefinition {
  id: RiftApproachId;
  name: string;
  description: string;
  durationMultiplier: number;
  lootMultiplier: number;
  surveyBonus: number;
}

export interface RiftExpeditionCost {
  shards: number;
  materials: Partial<Record<RiftMaterialId, number>>;
}

export interface RiftExpeditionRewards {
  coins: number;
  research: number;
  echoes: number;
  survey: number;
}

export interface RiftExpeditionJob {
  routeId: RiftRouteId;
  approachId: RiftApproachId;
  crewId: CrewId;
  duration: number;
  remaining: number;
}

export interface RiftReport {
  id: number;
  routeId: RiftRouteId;
  approachId: RiftApproachId;
  crewId: CrewId;
  crewXp: number;
  rewards: RiftExpeditionRewards;
  completedAt: number;
}

export const RIFT_UNLOCK_EXPEDITIONS = 3;
export const RIFT_UNLOCK_WORK_STAGES = 8;

/**
 * First-completion survey rewards deliberately match the next route threshold.
 * A player can therefore reveal the whole map by visiting every destination
 * once, while repeat expeditions remain a slower alternative path.
 */
export const RIFT_ROUTES: RiftRouteDefinition[] = [
  {
    id: "lanterns",
    index: 0,
    name: "Passage des Lanternes",
    sector: "NŒUD 01 · LISIÈRE",
    description: "Une ancienne voie de maintenance où les balises répondent encore.",
    duration: 5 * 60,
    requiredSurvey: 0,
    shardCost: 40_000,
    materialCost: { gears: 4 },
    firstSurvey: 2,
    rewards: { coins: 2_000_000, research: 3, echoes: 0 },
    tone: "cyan",
  },
  {
    id: "magnet",
    index: 1,
    name: "Veine Magnétique",
    sector: "NŒUD 02 · DÉVIATION",
    description: "Les parois attirent les outils et dévoilent des galeries impossibles.",
    duration: 12 * 60,
    requiredSurvey: 2,
    shardCost: 90_000,
    materialCost: { gears: 6, alloy: 3 },
    firstSurvey: 4,
    rewards: { coins: 8_000_000, research: 6, echoes: 1 },
    tone: "green",
  },
  {
    id: "emberSpine",
    index: 2,
    name: "Dorsale Incandescente",
    sector: "NŒUD 03 · PRESSION",
    description: "Une crête brûlante traverse la faille comme la colonne d'une bête fossile.",
    duration: 30 * 60,
    requiredSurvey: 6,
    shardCost: 180_000,
    materialCost: { alloy: 8, prism: 2 },
    firstSurvey: 6,
    rewards: { coins: 30_000_000, research: 10, echoes: 2 },
    tone: "ember",
  },
  {
    id: "whispers",
    index: 3,
    name: "Nappe des Murmures",
    sector: "NŒUD 04 · ÉCHO",
    description: "Le réseau y répète des voix qui n'ont jamais appartenu aux mineurs.",
    duration: 75 * 60,
    requiredSurvey: 12,
    shardCost: 350_000,
    materialCost: { gears: 8, prism: 5 },
    firstSurvey: 8,
    rewards: { coins: 100_000_000, research: 18, echoes: 4 },
    tone: "violet",
  },
  {
    id: "glassArc",
    index: 4,
    name: "Arc de Verre",
    sector: "NŒUD 05 · HORIZON",
    description: "Un pont translucide suspendu au-dessus d'un vide sans fond mesurable.",
    duration: 3 * 60 * 60,
    requiredSurvey: 20,
    shardCost: 750_000,
    materialCost: { alloy: 12, prism: 8 },
    firstSurvey: 12,
    rewards: { coins: 400_000_000, research: 30, echoes: 7 },
    tone: "glass",
  },
];

export const RIFT_APPROACHES: RiftApproachDefinition[] = [
  {
    id: "swift",
    name: "Éclaireur",
    description: "45 % plus rapide, mais 25 % de ressources en moins",
    durationMultiplier: 0.55,
    lootMultiplier: 0.75,
    surveyBonus: 0,
  },
  {
    id: "survey",
    name: "Cartographe",
    description: "Durée normale et +1 donnée cartographique",
    durationMultiplier: 1,
    lootMultiplier: 1,
    surveyBonus: 1,
  },
  {
    id: "salvage",
    name: "Récupération",
    description: "45 % plus long, mais 50 % de ressources en plus",
    durationMultiplier: 1.45,
    lootMultiplier: 1.5,
    surveyBonus: 0,
  },
];

export function emptyRiftRouteCompletions(): RiftRouteCompletions {
  return { lanterns: 0, magnet: 0, emberSpine: 0, whispers: 0, glassArc: 0 };
}

/** Both campaign conditions are permanent, so the network stays unlocked forever. */
export function riftNetworkUnlocked(expeditions: number, works: GrandWorkLevels): boolean {
  return expeditions >= RIFT_UNLOCK_EXPEDITIONS && grandWorkStages(works) >= RIFT_UNLOCK_WORK_STAGES;
}

export function riftRouteUnlocked(surveyData: number, route: RiftRouteDefinition): boolean {
  return surveyData >= route.requiredSurvey;
}

/**
 * Repeated visits become a growing resource sink. The shallow 18 % curve lets
 * a favourite route stay usable without making its first launch insignificant.
 */
export function riftExpeditionCost(route: RiftRouteDefinition, completions: number): RiftExpeditionCost {
  const safeCompletions = Math.max(0, Math.floor(completions));
  const shardScale = Math.pow(1.18, safeCompletions);
  const materialScale = 1 + safeCompletions * 0.2;
  return {
    shards: Math.ceil(route.shardCost * shardScale),
    materials: Object.fromEntries(
      Object.entries(route.materialCost).map(([id, amount]) => [id, Math.ceil((amount ?? 0) * materialScale)]),
    ) as Partial<Record<RiftMaterialId, number>>,
  };
}

export function riftExpeditionDuration(route: RiftRouteDefinition, approach: RiftApproachDefinition): number {
  return Math.max(1, Math.round(route.duration * approach.durationMultiplier));
}

/** Rewards are derived at launch/completion time and never stored as editable promises. */
export function riftExpeditionRewards(
  route: RiftRouteDefinition,
  approach: RiftApproachDefinition,
  previousCompletions: number,
): RiftExpeditionRewards {
  const repeatScale = Math.pow(1.08, Math.max(0, Math.floor(previousCompletions)));
  const lootScale = approach.lootMultiplier * repeatScale;
  return {
    coins: Math.round(route.rewards.coins * lootScale),
    research: Math.round(route.rewards.research * lootScale),
    echoes: Math.round(route.rewards.echoes * lootScale),
    survey: (previousCompletions === 0 ? route.firstSurvey : 1) + approach.surveyBonus,
  };
}

export function riftRouteById(id: RiftRouteId): RiftRouteDefinition {
  return RIFT_ROUTES.find((route) => route.id === id) ?? RIFT_ROUTES[0];
}

export function riftApproachById(id: RiftApproachId): RiftApproachDefinition {
  return RIFT_APPROACHES.find((approach) => approach.id === id) ?? RIFT_APPROACHES[1];
}
