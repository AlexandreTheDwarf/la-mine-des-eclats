/**
 * Rules for the v0.8 infrastructure layer.
 *
 * This module deliberately contains no React code and no knowledge of the full
 * game state. Keeping the economy as pure functions makes it possible to tune
 * costs, run balance simulations and migrate saves without touching the UI.
 */

export type GrandWorkId = "freight" | "furnace" | "bureau";

export type GrandWorkLevels = Record<GrandWorkId, number>;

export type WorkMaterialId = "gears" | "alloy" | "prism";

export interface GrandWorkDefinition {
  id: GrandWorkId;
  name: string;
  description: string;
  effect: string;
  max: number;
  shardBase: number;
  shardScale: number;
  materialBase: Partial<Record<WorkMaterialId, number>>;
}

export interface GrandWorkCost {
  shards: number;
  materials: Partial<Record<WorkMaterialId, number>>;
}

export const GRAND_WORKS_UNLOCK_EXPEDITIONS = 2;

/**
 * Balance table for the finite part of the v0.8 campaign.
 *
 * The geometric shard scale is shared so a designer can compare projects at a
 * glance. Their different starting prices express how valuable each resulting
 * system is; component costs stay linear to keep the older mine galleries
 * relevant without turning the industrial layer into the main bottleneck.
 */
export const GRAND_WORKS: GrandWorkDefinition[] = [
  {
    id: "freight",
    name: "Puits logistique",
    description: "Des cages indépendantes relient les galeries aux ateliers.",
    effect: "+1 ordre dans la file industrielle par palier",
    max: 5,
    shardBase: 30_000,
    shardScale: 3,
    materialBase: { gears: 5, alloy: 2 },
  },
  {
    id: "furnace",
    name: "Cœur thermique",
    description: "La chaleur des failles alimente un four qui ne s'éteint jamais.",
    effect: "+12 % de vitesse industrielle par palier",
    max: 5,
    shardBase: 50_000,
    shardScale: 3,
    materialBase: { alloy: 4, prism: 1 },
  },
  {
    id: "bureau",
    name: "Bureau des intendants",
    description: "Des équipes planifient les convois et surveillent les chaînes.",
    effect: "Répétition automatique puis +4 % aux ventes par palier",
    max: 5,
    shardBase: 75_000,
    shardScale: 3,
    materialBase: { gears: 4, alloy: 3, prism: 2 },
  },
];

export function emptyGrandWorks(): GrandWorkLevels {
  return { freight: 0, furnace: 0, bureau: 0 };
}

/** Returns a stage cost without reading or mutating game state. */
export function grandWorkCost(definition: GrandWorkDefinition, level: number): GrandWorkCost {
  const safeLevel = Math.max(0, Math.min(definition.max - 1, Math.floor(level)));
  const materialScale = safeLevel + 1;
  return {
    shards: Math.ceil(definition.shardBase * Math.pow(definition.shardScale, safeLevel)),
    materials: Object.fromEntries(
      Object.entries(definition.materialBase).map(([id, amount]) => [id, Math.ceil((amount ?? 0) * materialScale)]),
    ) as Partial<Record<WorkMaterialId, number>>,
  };
}

export function grandWorkStages(levels: GrandWorkLevels): number {
  return GRAND_WORKS.reduce((sum, definition) => sum + levels[definition.id], 0);
}

/** Total finite milestones, used by both objectives and progress displays. */
export function grandWorkStageTotal(): number {
  return GRAND_WORKS.reduce((sum, definition) => sum + definition.max, 0);
}

/** The infinite shard sink stays unavailable until every finite project is done. */
export function grandWorksComplete(levels: GrandWorkLevels): boolean {
  return GRAND_WORKS.every((definition) => levels[definition.id] >= definition.max);
}

/** One base slot plus one slot for each logistics-shaft stage: 1 through 6. */
export function productionQueueCapacity(levels: GrandWorkLevels): number {
  return 1 + levels.freight;
}

/** Furnace stages improve elapsed production time rather than recipe outputs. */
export function industrySpeedMultiplier(levels: GrandWorkLevels): number {
  return 1 + levels.furnace * 0.12;
}

/** Stewardship affects income only, leaving mining and recipe costs predictable. */
export function stewardshipSaleMultiplier(levels: GrandWorkLevels): number {
  return 1 + levels.bureau * 0.04;
}

/** The first bureau stage grants the feature; later stages improve commerce. */
export function autoRepeatUnlocked(levels: GrandWorkLevels): boolean {
  return levels.bureau >= 1;
}

/**
 * The repeatable sink starts high and grows rapidly so even a late-game stock
 * remains meaningful. Unlike an uncapped multiplier, its reward approaches a
 * hard +16% ceiling and therefore cannot restart exponential runaway growth.
 */
export function stabilizationCost(level: number): number {
  return Math.ceil(500_000 * Math.pow(1.85, Math.max(0, Math.floor(level))));
}

export function stabilizationMultiplier(level: number): number {
  const safeLevel = Math.max(0, Math.floor(level));
  return 1 + 0.16 * (1 - Math.exp(-safeLevel / 6));
}

export function grandWorksUnlocked(expeditions: number): boolean {
  return expeditions >= GRAND_WORKS_UNLOCK_EXPEDITIONS;
}
