/**
 * Pure crew progression and specialization rules for v0.9.1.
 *
 * Crew members never block an expedition. Fatigue only softens their personal
 * bonus and recovers over time, so assigning a favourite character remains a
 * valid choice even during an active play session.
 */

import type { RiftExpeditionCost, RiftExpeditionRewards, RiftRouteDefinition } from "./riftNetwork.ts";

export type CrewId = "mica" | "braise" | "nova" | "opale" | "silex" | "aurore";
export type CrewXp = Record<CrewId, number>;
export type CrewFatigue = Record<CrewId, number>;

export interface CrewDefinition {
  id: CrewId;
  name: string;
  role: string;
  specialty: string;
  description: string;
  unlockDepth: number;
  accent: "cyan" | "ember" | "blue" | "violet" | "green" | "gold";
}

export const CREW: CrewDefinition[] = [
  {
    id: "mica",
    name: "Mica",
    role: "Éclaireuse",
    specialty: "Trajets plus courts",
    description: "Repère les appuis sûrs avant que l'équipe ne s'engage.",
    unlockDepth: 1,
    accent: "cyan",
  },
  {
    id: "braise",
    name: "Braise",
    role: "Forgeronne",
    specialty: "Moins de composants",
    description: "Allège le matériel sans sacrifier sa résistance.",
    unlockDepth: 25,
    accent: "ember",
  },
  {
    id: "nova",
    name: "Nova",
    role: "Négociatrice",
    specialty: "Davantage de pièces",
    description: "Transforme chaque découverte en cargaison négociable.",
    unlockDepth: 60,
    accent: "blue",
  },
  {
    id: "opale",
    name: "Opale",
    role: "Archiviste",
    specialty: "Cartographie renforcée",
    description: "Relie les traces nouvelles aux souvenirs des anciennes galeries.",
    unlockDepth: 120,
    accent: "violet",
  },
  {
    id: "silex",
    name: "Silex",
    role: "Intendant",
    specialty: "Moins d'éclats dépensés",
    description: "Élimine chaque dépense inutile du manifeste.",
    unlockDepth: 220,
    accent: "green",
  },
  {
    id: "aurore",
    name: "Aurore",
    role: "Porte-balise",
    specialty: "Échos et recherche",
    description: "Maintient un signal exploitable jusque dans les routes terminales.",
    unlockDepth: 360,
    accent: "gold",
  },
];

export const CREW_LEVEL_THRESHOLDS = [0, 100, 260, 520, 900] as const;
export const CREW_MAX_LEVEL = CREW_LEVEL_THRESHOLDS.length;
export const CREW_FATIGUE_PER_RETURN = 40;
export const CREW_REST_SECONDS_PER_POINT = 90;

export function emptyCrewXp(): CrewXp {
  return { mica: 0, braise: 0, nova: 0, opale: 0, silex: 0, aurore: 0 };
}

export function emptyCrewFatigue(): CrewFatigue {
  return { mica: 0, braise: 0, nova: 0, opale: 0, silex: 0, aurore: 0 };
}

export function crewById(id: CrewId): CrewDefinition {
  return CREW.find((member) => member.id === id) ?? CREW[0];
}

export function crewUnlocked(maxDepth: number, member: CrewDefinition): boolean {
  return maxDepth >= member.unlockDepth;
}

export function crewLevel(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return CREW_LEVEL_THRESHOLDS.filter((threshold) => safeXp >= threshold).length;
}

export function crewNextLevelXp(xp: number): number | null {
  const level = crewLevel(xp);
  return level >= CREW_MAX_LEVEL ? null : CREW_LEVEL_THRESHOLDS[level];
}

/** Long and dangerous routes teach more without making short routes worthless. */
export function crewXpForRoute(route: RiftRouteDefinition): number {
  // Roughly 7 to 3 XP/minute, instead of 7 to 0.75. Short missions retain a
  // benefit for active play, but long missions are now worthwhile training.
  return [35, 75, 155, 300, 550][route.index] ?? 35;
}

/**
 * At maximum fatigue a member still contributes 60 % of their normal bonus.
 * This is a gentle efficiency choice, never a lockout or failed mission risk.
 */
export function crewReadiness(fatigue: number): number {
  return 1 - Math.min(100, Math.max(0, fatigue)) * 0.004;
}

function scaledSpecialty(level: number, fatigue: number, base: number, perLevel: number): number {
  return (base + Math.max(0, level - 1) * perLevel) * crewReadiness(fatigue);
}

/** Human-readable counterpart of the exact formulas used by the reducer. */
export function crewBonusLabel(member: CrewDefinition, xp: number, fatigue: number): string {
  const level = crewLevel(xp);
  const percent = (base: number, perLevel: number) =>
    Math.round(scaledSpecialty(level, fatigue, base, perLevel) * 100);

  switch (member.id) {
    case "mica": return `-${percent(0.1, 0.025)} % de durée`;
    case "braise": return `-${percent(0.12, 0.025)} % de composants`;
    case "nova": return `+${percent(0.15, 0.04)} % de pièces`;
    case "opale": return `+${Math.max(1, Math.floor((level + 1) / 2))} cartographie`;
    case "silex": return `-${percent(0.12, 0.03)} % d'éclats`;
    case "aurore": return `+${percent(0.2, 0.05)} % de signaux`;
  }
}

export function crewAdjustedDuration(baseDuration: number, member: CrewDefinition, xp: number, fatigue: number): number {
  if (member.id !== "mica") return baseDuration;
  const reduction = scaledSpecialty(crewLevel(xp), fatigue, 0.1, 0.025);
  return Math.max(1, Math.round(baseDuration * (1 - reduction)));
}

export function crewAdjustedCost(cost: RiftExpeditionCost, member: CrewDefinition, xp: number, fatigue: number): RiftExpeditionCost {
  const level = crewLevel(xp);
  const shardReduction = member.id === "silex" ? scaledSpecialty(level, fatigue, 0.12, 0.03) : 0;
  const materialReduction = member.id === "braise" ? scaledSpecialty(level, fatigue, 0.12, 0.025) : 0;
  return {
    shards: Math.max(1, Math.ceil(cost.shards * (1 - shardReduction))),
    materials: Object.fromEntries(
      // Components are indivisible. A positive discount saves at least one
      // component whenever the manifest asks for two or more, never the last.
      Object.entries(cost.materials).map(([id, amount]) => [id, Math.max(1,
        (amount ?? 0) - (materialReduction > 0 ? Math.max(1, Math.round((amount ?? 0) * materialReduction)) : 0),
      )]),
    ) as RiftExpeditionCost["materials"],
  };
}

export function crewAdjustedRewards(rewards: RiftExpeditionRewards, member: CrewDefinition, xp: number, fatigue: number): RiftExpeditionRewards {
  const level = crewLevel(xp);
  const coinBonus = member.id === "nova" ? scaledSpecialty(level, fatigue, 0.15, 0.04) : 0;
  const signalBonus = member.id === "aurore" ? scaledSpecialty(level, fatigue, 0.2, 0.05) : 0;
  const surveyBonus = member.id === "opale" ? Math.max(1, Math.floor((level + 1) / 2)) : 0;
  return {
    coins: Math.round(rewards.coins * (1 + coinBonus)),
    research: Math.round(rewards.research * (1 + signalBonus)),
    echoes: Math.round(rewards.echoes * (1 + signalBonus)),
    // Opale's map reading is a discrete reward. Readiness reduces other bonuses
    // but never makes a visible cartography point vanish unexpectedly.
    survey: rewards.survey + surveyBonus,
  };
}

export function addCrewFatigue(current: number): number {
  return Math.min(100, Math.max(0, current) + CREW_FATIGUE_PER_RETURN);
}

export function recoverCrewFatigue(current: number, seconds: number): number {
  return Math.max(0, current - Math.max(0, seconds) / CREW_REST_SECONDS_PER_POINT);
}

export function totalCrewLevels(xp: CrewXp): number {
  return CREW.reduce((sum, member) => sum + crewLevel(xp[member.id]), 0);
}
