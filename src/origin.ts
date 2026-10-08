/** v0.9.3 content and durable progress. No UI, clock or storage dependencies.
 * Each chamber offers two recoverable relics: revisiting gets the other one,
 * never a random duplicate. Nothing here grows an unbounded multiplier. */
import type { CrewId } from "./crew.ts";

export type OriginStageId = "threshold" | "archive" | "heart";
export type RelicId =
  | "hammer"
  | "engine"
  | "compass"
  | "lens"
  | "chisel"
  | "lantern";
export type TalentId = "field" | "study";
export interface ExpeditionBonuses {
  duration?: number;
  shards?: number;
  coins?: number;
  research?: number;
  survey?: number;
  xp?: number;
  fatigue?: number;
}
export interface OriginJob {
  stageId: OriginStageId;
  crewId: CrewId;
  duration: number;
  remaining: number;
  xp: number;
  fatigue: number;
}
export interface OriginProgress {
  visits: Record<OriginStageId, number>;
  activeJob: OriginJob | null;
  awaitingChoice: OriginStageId | null;
  ownedRelics: RelicId[];
  equippedRelics: RelicId[];
  variantDiscoveries: string[];
  talents: Record<CrewId, TalentId | null>;
}
export const TALENT_RESPEC_COST = 120_000;
export const RELIC_SLOTS = 2;
export const ORIGIN_STAGES = [
  {
    id: "threshold",
    name: "Le Seuil des voix",
    sector: "I · LE PASSAGE",
    image: "quartz-cathedral.png",
    survey: 32,
    discoveries: 0,
    duration: 1_200,
    shards: 300_000,
    materials: { gears: 12, alloy: 6, prism: 3 },
    xp: 120,
    description:
      "Sous les cartes, une porte répond à la cadence des pioches. Mica distingue deux vibrations derrière le quartz.",
    event:
      "La porte s'ouvre sur un atelier intact. Un marteau attend près d'un moteur encore tiède. Le convoi peut remonter une seule pièce à la fois.",
    relics: ["hammer", "engine"],
    research: 15,
    echoes: 3,
  },
  {
    id: "archive",
    name: "Les Archives inversées",
    sector: "II · LA MÉMOIRE",
    image: "glass-sea.png",
    survey: 44,
    discoveries: 2,
    duration: 2_700,
    shards: 650_000,
    materials: { gears: 16, alloy: 12, prism: 6 },
    xp: 260,
    description:
      "Les galeries dessinent le souvenir d'une autre mine. Les relevés singuliers du réseau permettent d'en lire les embranchements.",
    event:
      "Des cartes flottent dans le verre. Une boussole pointe vers les chemins oubliés ; une lentille révèle les annotations effacées. Quelle trace rapporter ?",
    relics: ["compass", "lens"],
    research: 30,
    echoes: 6,
  },
  {
    id: "heart",
    name: "Le Cœur de l'aube",
    sector: "III · LA RENCONTRE",
    image: "dawn-vault.png",
    survey: 60,
    discoveries: 4,
    duration: 5_400,
    shards: 1_200_000,
    materials: { gears: 20, alloy: 18, prism: 10 },
    xp: 500,
    description:
      "Le signal n'appelait pas au secours. Il attendait qu'une équipe sache l'écouter. Une lumière tranquille traverse la dernière paroi.",
    event:
      "Au cœur, aucune fortune endormie : les outils de celles qui ont creusé avant vous. Le burin porte leurs gestes, la lanterne veille sur leurs retours.",
    relics: ["chisel", "lantern"],
    research: 60,
    echoes: 12,
  },
] as const;

export const RELICS: Array<{
  id: RelicId;
  name: string;
  effect: string;
  story: string;
  bonuses: ExpeditionBonuses;
  mining?: "click" | "auto" | "yield";
  amount?: number;
}> = [
  {
    id: "hammer",
    name: "Marteau des premières",
    effect: "+25 % de force manuelle",
    story: "Le manche garde la chaleur d'une main inconnue.",
    bonuses: {},
    mining: "click",
    amount: 0.25,
  },
  {
    id: "engine",
    name: "Moteur de poche",
    effect: "+15 % de puissance des machines",
    story: "Il repart dès qu'on lui confie un travail.",
    bonuses: {},
    mining: "auto",
    amount: 0.15,
  },
  {
    id: "compass",
    name: "Boussole impossible",
    effect: "−12 % de durée des missions",
    story: "Son nord est toujours un chemin praticable.",
    bonuses: { duration: 0.12 },
  },
  {
    id: "lens",
    name: "Lentille des mémoires",
    effect: "+15 % de données labo du réseau",
    story: "À travers elle, même la roche a des notes de bas de page.",
    bonuses: { research: 0.15 },
  },
  {
    id: "chisel",
    name: "Burin de l'aube",
    effect: "+12 % de rendement des filons",
    story: "Il trouve la fissure qui épargne le minerai.",
    bonuses: {},
    mining: "yield",
    amount: 0.12,
  },
  {
    id: "lantern",
    name: "Lanterne du retour",
    effect: "−10 de fatigue au retour",
    story: "Une petite lumière pour celles qui reviennent de loin.",
    bonuses: { fatigue: 10 },
  },
];

// Two specializations per member. Shared keys keep saves small, but each pair
// reinforces a distinct role. The first choice is free; subsequent swaps cost.
export const CREW_TALENTS: Record<
  CrewId,
  Record<TalentId, { name: string; effect: string; bonuses: ExpeditionBonuses }>
> = {
  mica: {
    field: {
      name: "Pas léger",
      effect: "−10 % de durée",
      bonuses: { duration: 0.1 },
    },
    study: {
      name: "Repérage patient",
      effect: "+1 cartographie du réseau",
      bonuses: { survey: 1 },
    },
  },
  braise: {
    field: {
      name: "Convoi sobre",
      effect: "−12 % d'éclats au départ",
      bonuses: { shards: 0.12 },
    },
    study: {
      name: "Apprentissage d'atelier",
      effect: "+25 % d'expérience",
      bonuses: { xp: 0.25 },
    },
  },
  nova: {
    field: {
      name: "Négociation fine",
      effect: "+20 % de pièces du réseau",
      bonuses: { coins: 0.2 },
    },
    study: {
      name: "Réseau de relais",
      effect: "−10 % de durée",
      bonuses: { duration: 0.1 },
    },
  },
  opale: {
    field: {
      name: "Relevé croisé",
      effect: "+1 cartographie du réseau",
      bonuses: { survey: 1 },
    },
    study: {
      name: "Mémoire des strates",
      effect: "+20 % de données labo du réseau",
      bonuses: { research: 0.2 },
    },
  },
  silex: {
    field: {
      name: "Budget serré",
      effect: "−12 % d'éclats au départ",
      bonuses: { shards: 0.12 },
    },
    study: {
      name: "Relève préparée",
      effect: "−10 de fatigue au retour",
      bonuses: { fatigue: 10 },
    },
  },
  aurore: {
    field: {
      name: "Balise reposante",
      effect: "−10 de fatigue au retour",
      bonuses: { fatigue: 10 },
    },
    study: {
      name: "Écoute profonde",
      effect: "+20 % de données labo du réseau",
      bonuses: { research: 0.2 },
    },
  },
};

export function emptyOriginProgress(): OriginProgress {
  return {
    visits: { threshold: 0, archive: 0, heart: 0 },
    activeJob: null,
    awaitingChoice: null,
    ownedRelics: [],
    equippedRelics: [],
    variantDiscoveries: [],
    talents: {
      mica: null,
      braise: null,
      nova: null,
      opale: null,
      silex: null,
      aurore: null,
    },
  };
}
export function originStageById(id: OriginStageId) {
  return ORIGIN_STAGES.find((stage) => stage.id === id)!;
}
export function originStageUnlocked(
  progress: OriginProgress,
  signal: boolean,
  survey: number,
  id: OriginStageId,
): boolean {
  const index = ORIGIN_STAGES.findIndex((stage) => stage.id === id);
  if (index < 0) return false;
  const stage = ORIGIN_STAGES[index];
  return (
    signal &&
    survey >= stage.survey &&
    progress.variantDiscoveries.length >= stage.discoveries &&
    (index === 0 || progress.visits[ORIGIN_STAGES[index - 1].id] > 0)
  );
}
export function relicMiningMultiplier(
  progress: OriginProgress,
  kind: "click" | "auto" | "yield",
): number {
  return (
    1 +
    RELICS.reduce(
      (sum, relic) =>
        sum +
        (relic.mining === kind && progress.equippedRelics.includes(relic.id)
          ? (relic.amount ?? 0)
          : 0),
      0,
    )
  );
}
