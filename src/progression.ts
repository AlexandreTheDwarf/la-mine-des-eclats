/** A read-only campaign guide: every step is derived from the real save.
 * No parallel quest flags can drift after an import, reset or mining cycle. */
import { canForgeNext, canStartExpedition, expeditionTarget, machineCount, TOOLS, type GameState } from "./game.ts";
import { grandWorkStages } from "./grandWorks.ts";
import { riftNetworkUnlocked, RIFT_ROUTES } from "./riftNetwork.ts";
import { DAWN_PROJECTS, dawnRequirements } from "./campaign.ts";

export type PanelTab = "journal" | "upgrades" | "machines" | "forge" | "contracts" | "research" | "industry" | "works" | "rifts" | "goals" | "expedition";
export type Destination = PanelTab | "mine" | "inventory";
export interface CampaignStep {
  title: string; detail: string; current: number; target: number;
  destination: Destination; action: string;
}

export function campaignChapters(state: GameState) {
  return [
    { title: "Une pioche et une promesse", summary: "Les premiers filons, les premières pièces, un outil forgé de tes mains.", complete: state.toolTier > 0 || state.expeditions > 0 },
    { title: "Sous la surface", summary: "La première balise révèle ce qui survit à une remontée.", complete: state.expeditions >= 1 },
    { title: "Une compagnie se construit", summary: "L'atelier devient une industrie et la mine prend de l'ampleur.", complete: state.expeditions >= 2 && grandWorkStages(state.grandWorks) > 0 },
    { title: "Au-delà des cartes", summary: "Cinq routes, six spécialistes et un signal venu d'avant nous.", complete: state.originSignalFound },
    { title: "Celles qui creusaient avant nous", summary: "Les reliques racontent enfin ce que gardait le Cœur de l'aube.", complete: state.origin.visits.heart > 0 },
    { title: "L'Aube retrouvée", summary: "Rendre à la montagne son premier matin.", complete: state.campaign.completed },
  ];
}

export function nextCampaignStep(state: GameState): CampaignStep {
  const step = (title: string, detail: string, current: number, target: number, destination: Destination, action: string): CampaignStep =>
    ({ title, detail, current: Math.min(current, target), target, destination, action });
  if (state.campaign.completed) return step("La montagne a retrouvé son matin", "La mine reste ouverte. Les distinctions du carnet sont des aventures facultatives.", 1, 1, "journal", "LE CARNET");
  if (!state.expeditions && state.rocksBroken < 5) return step("Ouvrir la première galerie", "Cinq filons suffisent pour que l'atelier te confie ses premiers éclats.", state.rocksBroken, 5, "mine", "AU FILON");
  if (!state.expeditions && !state.salesCompleted) return step("Financer l'atelier", "Les minerais rapportent des pièces à la vente. Les éclats servent au tranchant et aux réparations.", state.salesCompleted, 1, "inventory", "LE CHARIOT");
  if (!state.expeditions && state.toolTier === 0) return step("Forger la pioche de cuivre", `L'atelier attend ${TOOLS[1].coinCost} pièces et 18 cuivres. Les Galeries d'Azur contiennent toujours du cuivre.`, state.inventory.copper, 18, "forge", canForgeNext(state) ? "FORGER" : "LA FORGE");
  if (state.expeditions === 0 && !machineCount(state)) return step("La première relève", "Une taupe mécanique prend le relais entre tes coups. Elle devient disponible à 8 mètres et coûte 180 pièces.", state.depth, 8, "machines", "LES MACHINES");
  if (state.expeditions < 3) {
    if (state.expeditions >= 2 && !grandWorkStages(state.grandWorks)) return step("Poser la première pierre", "Les Grands Travaux gardent leurs niveaux entre les cycles. L'industrie transforme les anciens minerais en composants.", 0, 1, "works", "LES TRAVAUX");
    if (canStartExpedition(state)) return step("La balise est prête", "Une remontée conserve les échos, la recherche, l'industrie et l'équipage. La pioche, les machines et les ressources du cycle repartent de zéro.", state.depth, expeditionTarget(state.expeditions), "expedition", "PRÉPARER LA REMONTÉE");
    return step(`Atteindre la balise des ${expeditionTarget(state.expeditions)} mètres`, "Les strates profondes demandent plusieurs filons par mètre. Une ancienne galerie fournit ses minerais sans faire descendre la mine.", state.depth, expeditionTarget(state.expeditions), "mine", "LA GALERIE");
  }
  if (!riftNetworkUnlocked(state.expeditions, state.grandWorks)) return step("Construire la station cartographique", "Trois remontées et huit paliers de Grands Travaux ouvrent le réseau. Les ateliers peuvent continuer à produire pendant la descente.", grandWorkStages(state.grandWorks), 8, "works", "LES TRAVAUX");
  if (!state.originSignalFound) {
    const visited = RIFT_ROUTES.filter((route) => state.riftRouteCompletions[route.id] > 0).length;
    return step("Retrouver le signal originel", `Les cinq routes doivent être explorées et 32 données réunies. Routes : ${visited}/5 · données : ${state.surveyData}/32.`, visited, 5, "rifts", "LES FAILLES");
  }
  if (!state.origin.visits.heart) return step("Rejoindre le Cœur de l'aube", state.origin.awaitingChoice
    ? "Un convoi est rentré : sa relique attend encore ton choix dans l'Origine."
    : "Le Seuil ouvre les Archives, puis le Cœur. Les variantes du réseau apportent les relevés nécessaires ; chaque lieu conserve deux reliques.", Object.values(state.origin.visits).filter(Boolean).length, 3, "rifts", "L'ORIGINE");
  const project = state.campaign.project;
  if (project) return step(DAWN_PROJECTS[project.stage].name, "L'équipage poursuit le chantier, même pendant ton absence. Les ateliers et la mine restent actifs.", project.duration - project.remaining, project.duration, "journal", "LE CHANTIER");
  const missing = dawnRequirements(state).find((requirement) => requirement.current < requirement.target);
  if (missing) return step(missing.label, `Pour ${DAWN_PROJECTS[state.campaign.stage].name.toLowerCase()}, il reste cette étape à franchir.`, missing.current, missing.target, missing.destination, "PRÉPARER LE CHANTIER");
  return step(DAWN_PROJECTS[state.campaign.stage].name, "Les découvertes sont réunies. Les ressources du chantier sont détaillées dans le carnet.", state.campaign.stage, DAWN_PROJECTS.length, "journal", "LE CHANTIER");
}
