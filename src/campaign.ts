/** Campaign content and save contract. Keep costs and narrative here so that
 * balancing a chapter never requires editing React or the persistence layer. */
import type { GameState, IndustryMaterialId } from "./game.ts";
import { grandWorkStages } from "./grandWorks.ts";
import { CREW, totalCrewLevels } from "./crew.ts";
import { RIFT_ROUTES } from "./riftNetwork.ts";

export type ChallengeId = "steady" | "workshop" | "voyager";
export interface ChallengeRun {
  id: ChallengeId;
  progress: number;
  seconds: number;
  routes: string[];
  crew: string[];
}
export interface CampaignProgress {
  stage: number;
  project: { stage: number; duration: number; remaining: number } | null;
  completed: boolean;
  challenge: ChallengeRun | null;
  records: Partial<Record<ChallengeId, number>>;
}

export const DAWN_PROJECTS = [
  {
    name: "Les fondations du matin", verb: "CONSOLIDER", duration: 300,
    shards: 1_500_000, materials: { gears: 40, alloy: 15, prism: 5 },
    works: 8, relics: 2, crewLevels: 6,
    story: "Sous le Cœur, les anciens rails dessinent une immense couronne. Braise reconnaît les attaches : ce n'est pas une arme, mais un chemin pour ramener la lumière à la surface.",
    result: "Les rails se rejoignent. Pour la première fois, la montagne ne tremble plus quand la foreuse passe.",
  },
  {
    name: "Les six voix", verb: "ACCORDER", duration: 600,
    shards: 3_000_000, materials: { gears: 30, alloy: 35, prism: 20 },
    works: 12, relics: 4, crewLevels: 10,
    story: "Les reliques ne sont pas des trésors isolés. Chacune garde un geste, une voix, un souvenir. L'équipage les accorde aux machines de la mine, une par une.",
    result: "Six notes traversent les galeries. La plus ancienne répond tout en haut, là où personne ne l'attendait.",
  },
  {
    name: "L'Aube retrouvée", verb: "RALLUMER L'AUBE", duration: 900,
    shards: 5_000_000, materials: { gears: 50, alloy: 40, prism: 30 },
    works: 15, relics: 6, crewLevels: 12,
    story: "Tout est relié : les ateliers, les routes, les outils retrouvés. Il ne reste plus à creuser davantage. Il reste à rendre à la montagne ce qu'elle a conservé pour nous.",
    result: "Le premier rayon traverse la pierre. La mine a retrouvé son matin.",
  },
] as const;

export const CHALLENGES: Array<{
  id: ChallengeId; name: string; rule: string; target: number; unit: string; distinction: string;
}> = [
  { id: "steady", name: "Le geste juste", target: 80, unit: "frappes",
    rule: "Réussir 80 frappes sans réparer, reforger ni changer de cycle. Une pioche brisée met fin à l'essai.", distinction: "Main de cristal" },
  { id: "workshop", name: "L'atelier autonome", target: 12, unit: "lots",
    rule: "Terminer 12 lots industriels sans vente ni livraison de contrat. Prépare tes réserves avant le départ.", distinction: "Maître des ateliers" },
  { id: "voyager", name: "Trois horizons", target: 3, unit: "routes",
    rule: "Rapporter trois routes différentes avec trois spécialistes différents. Les retours répétés ne comptent pas.", distinction: "Passeuse d'horizons" },
];

export function emptyCampaign(): CampaignProgress {
  return { stage: 0, project: null, completed: false, challenge: null, records: {} };
}

/** Prerequisites and resources are separate: the UI can explain both without
 * ever guessing why an action was rejected by the reducer. */
export function dawnRequirements(state: GameState) {
  const project = DAWN_PROJECTS[state.campaign.stage];
  if (!project) return [];
  return [
    { label: "Cœur de l'aube exploré", current: Math.min(1, state.origin.visits.heart), target: 1, destination: "rifts" as const },
    { label: "Paliers de Grands Travaux", current: grandWorkStages(state.grandWorks), target: project.works, destination: "works" as const },
    { label: "Reliques retrouvées", current: state.origin.ownedRelics.length, target: project.relics, destination: "rifts" as const },
    { label: "Niveaux d'équipage cumulés", current: totalCrewLevels(state.crewXp), target: project.crewLevels, destination: "rifts" as const },
  ];
}

export function canStartDawnProject(state: GameState): boolean {
  const project = DAWN_PROJECTS[state.campaign.stage];
  return !!project && !state.campaign.project && !state.campaign.completed
    && dawnRequirements(state).every((requirement) => requirement.current >= requirement.target)
    && state.shards >= project.shards
    && Object.entries(project.materials).every(([id, amount]) => state.industryMaterials[id as IndustryMaterialId] >= amount);
}

export function validateCampaign(value: unknown): asserts value is CampaignProgress {
  const fail = () => { throw new Error("Campagne endommagée"); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const entry = value as CampaignProgress;
  if (!Number.isInteger(entry.stage) || entry.stage < 0 || entry.stage > DAWN_PROJECTS.length
    || typeof entry.completed !== "boolean" || entry.completed !== (entry.stage === DAWN_PROJECTS.length)
    || !("project" in entry) || !("challenge" in entry)) return fail();
  const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (entry.project !== null) {
    const job = entry.project;
    if (!job || typeof job !== "object" || entry.completed || job.stage !== entry.stage
      || !finite(job.duration) || job.duration <= 0 || !finite(job.remaining) || job.remaining > job.duration) return fail();
  }
  if (!entry.records || typeof entry.records !== "object" || Array.isArray(entry.records)
    || Object.entries(entry.records).some(([id, seconds]) => !CHALLENGES.some((c) => c.id === id) || !finite(seconds))) return fail();
  if (entry.challenge !== null) {
    const run = entry.challenge;
    const definition = CHALLENGES.find((c) => c.id === run?.id);
    if (!entry.completed || !definition || !Number.isInteger(run.progress) || run.progress < 0
      || run.progress >= definition.target || !finite(run.seconds)
      || !Array.isArray(run.routes) || !Array.isArray(run.crew)
      || run.routes.length > 3 || run.crew.length > 3
      || run.routes.some((id) => !RIFT_ROUTES.some((route) => route.id === id))
      || run.crew.some((id) => !CREW.some((member) => member.id === id))
      || new Set(run.routes).size !== run.routes.length || new Set(run.crew).size !== run.crew.length
      || (run.id === "voyager" && (run.progress !== run.routes.length || run.progress !== run.crew.length))) return fail();
  }
}
