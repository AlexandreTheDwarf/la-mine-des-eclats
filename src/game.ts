export type OreId =
  | "stone"
  | "copper"
  | "iron"
  | "azurite"
  | "gold"
  | "ember"
  | "star"
  | "quartz"
  | "glass"
  | "dawn";

export type UpgradeId = "power" | "sturdy" | "precision" | "geology" | "maintenance";
export type MachineId = "drill" | "cart" | "smelter" | "resonator" | "excavator";
export type LegacyId = "force" | "industry" | "fortune" | "endurance";
export type ResearchId = "impact" | "automation" | "extraction" | "metallurgy" | "resonance" | "commerce";
export type EventChoice = "bold" | "careful";

export interface OreDefinition {
  id: OreId;
  name: string;
  shortName: string;
  value: number;
  color: string;
  glow: string;
}

export interface ZoneDefinition {
  id: number;
  name: string;
  sector: string;
  description: string;
  image: string;
  accent: string;
  minDepth: number;
  rockNames: string[];
  orePool: Array<{ id: OreId; weight: number }>;
}

export interface ToolDefinition {
  name: string;
  epithet: string;
  damage: number;
  durability: number;
  coinCost: number;
  oreCost: Partial<Record<OreId, number>>;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  currency: "shards" | "coins";
  baseCost: number;
  scale: number;
  max: number;
}

export interface MachineDefinition {
  id: MachineId;
  name: string;
  description: string;
  baseCost: number;
  scale: number;
  unlockDepth: number;
  max: number;
}

export interface LegacyDefinition {
  id: LegacyId;
  name: string;
  description: string;
  baseCost: number;
  scale: number;
  max: number;
}

export interface ResearchDefinition {
  id: ResearchId;
  name: string;
  description: string;
  baseCost: number;
  scale: number;
  max: number;
}

export interface MineEvent {
  kind: "song" | "cache" | "fracture";
  title: string;
  description: string;
}

export interface OfflineReport {
  seconds: number;
  shards: number;
  ore: number;
}

export interface Impact {
  id: number;
  damage: number;
  crit: boolean;
  shards: number;
}

export interface JournalEntry {
  id: number;
  text: string;
  tone: "normal" | "good" | "rare";
}

export interface MarketQuote {
  slot: number;
  endsAt: number;
  rates: Record<OreId, number>;
  trends: Record<OreId, -1 | 0 | 1>;
}

export interface ContractOffer {
  id: string;
  buyer: string;
  title: string;
  requirements: Partial<Record<OreId, number>>;
  rewardCoins: number;
  rewardReputation: number;
  expiresAt: number;
}

export interface TradeRecord {
  id: number;
  kind: "market" | "contract";
  label: string;
  units: number;
  coins: number;
  timestamp: number;
}

export interface GameState {
  version: 7;
  shards: number;
  coins: number;
  echoes: number;
  depth: number;
  maxDepth: number;
  expeditions: number;
  selectedZoneId: number;
  strataProgress: number;
  rocksBroken: number;
  totalStrikes: number;
  totalMined: number;
  durability: number;
  rockHp: number;
  rockMaxHp: number;
  resonance: number;
  toolTier: number;
  inventory: Record<OreId, number>;
  upgrades: Record<UpgradeId, number>;
  machines: Record<MachineId, number>;
  legacy: Record<LegacyId, number>;
  salesCompleted: number;
  reputation: number;
  completedContracts: number;
  contractOffers: ContractOffer[];
  tradeHistory: TradeRecord[];
  researchPoints: number;
  analysesCompleted: number;
  oreStudies: Record<OreId, number>;
  research: Record<ResearchId, number>;
  claimedGoals: string[];
  journal: JournalEntry[];
  activeEvent: MineEvent | null;
  offlineReport: OfflineReport | null;
  impact: Impact;
  rockRevision: number;
  message: string;
  soundOn: boolean;
  lastSavedAt: number;
}

export type GameAction =
  | { type: "STRIKE" }
  | { type: "TICK"; seconds: number }
  | { type: "SELECT_ZONE"; id: number }
  | { type: "REPAIR" }
  | { type: "SELL_ALL" }
  | { type: "SELL_SELECTED"; ids: OreId[]; rates: Partial<Record<OreId, number>> }
  | { type: "FULFILL_CONTRACT"; id: string }
  | { type: "ANALYZE_ORE"; id: OreId }
  | { type: "BUY_RESEARCH"; id: ResearchId }
  | { type: "BUY_UPGRADE"; id: UpgradeId }
  | { type: "BUY_MACHINE"; id: MachineId }
  | { type: "BUY_LEGACY"; id: LegacyId }
  | { type: "FORGE_NEXT" }
  | { type: "START_EXPEDITION" }
  | { type: "CLAIM_GOAL"; id: string }
  | { type: "RESOLVE_EVENT"; choice: EventChoice }
  | { type: "TOGGLE_SOUND" }
  | { type: "DISMISS_OFFLINE" }
  | { type: "IMPORT"; state: GameState }
  | { type: "RESET" };

export const SAVE_KEY = "mine-des-eclats-save-v2";
const TEASER_SAVE_KEY = "mine-des-eclats-teaser-v1";

export const ORES: Record<OreId, OreDefinition> = {
  stone: { id: "stone", name: "Roche brute", shortName: "Roche", value: 1, color: "#9aa7a9", glow: "#dbe5e5" },
  copper: { id: "copper", name: "Cuivre natif", shortName: "Cuivre", value: 4, color: "#d87946", glow: "#ffb17c" },
  iron: { id: "iron", name: "Fer dense", shortName: "Fer", value: 9, color: "#a6bac1", glow: "#e8f6fa" },
  azurite: { id: "azurite", name: "Azurite vive", shortName: "Azurite", value: 22, color: "#51e4df", glow: "#9ffff8" },
  gold: { id: "gold", name: "Or solaire", shortName: "Or", value: 62, color: "#ffbd55", glow: "#ffe6a1" },
  ember: { id: "ember", name: "Braise minérale", shortName: "Braise", value: 145, color: "#ff674c", glow: "#ffb36b" },
  star: { id: "star", name: "Éclat stellaire", shortName: "Stellaire", value: 420, color: "#d9efff", glow: "#ffffff" },
  quartz: { id: "quartz", name: "Quartz mémoriel", shortName: "Quartz", value: 1_500, color: "#d9c4ff", glow: "#f4edff" },
  glass: { id: "glass", name: "Verre abyssal", shortName: "Verre", value: 12_000, color: "#4dd6ad", glow: "#a7ffe4" },
  dawn: { id: "dawn", name: "Métal d'aurore", shortName: "Aurore", value: 85_000, color: "#fff0a8", glow: "#ffffff" },
};

export const ORE_ORDER: OreId[] = ["stone", "copper", "iron", "azurite", "gold", "ember", "star", "quartz", "glass", "dawn"];
export const MARKET_UNLOCK_DEPTH = 25;
export const MARKET_PERIOD_MS = 45_000;
export const CONTRACT_UNLOCK_DEPTH = 40;
export const CONTRACT_OFFER_COUNT = 3;
export const RESEARCH_UNLOCK_DEPTH = 80;
export const MAX_ORE_STUDY_LEVEL = 3;

function marketRateForSlot(slot: number, oreIndex: number): number {
  const raw = Math.sin((slot + 11) * 12.9898 + (oreIndex + 1) * 78.233) * 43_758.5453;
  const unit = raw - Math.floor(raw);
  return Math.round((0.72 + unit * 0.68) * 100) / 100;
}

export function marketQuoteAt(timestamp: number): MarketQuote {
  const safeTimestamp = Math.max(0, Math.floor(timestamp));
  const slot = Math.floor(safeTimestamp / MARKET_PERIOD_MS);
  const rates = {} as Record<OreId, number>;
  const trends = {} as Record<OreId, -1 | 0 | 1>;

  ORE_ORDER.forEach((id, index) => {
    const rate = marketRateForSlot(slot, index);
    const previousRate = marketRateForSlot(slot - 1, index);
    rates[id] = rate;
    trends[id] = rate > previousRate + 0.03 ? 1 : rate < previousRate - 0.03 ? -1 : 0;
  });

  return {
    slot,
    endsAt: (slot + 1) * MARKET_PERIOD_MS,
    rates,
    trends,
  };
}

export const ZONES: ZoneDefinition[] = [
  {
    id: 0,
    name: "Galeries d'Azur",
    sector: "SECTEUR 01",
    description: "Une ancienne carrière où la roche répond à chaque coup.",
    image: "assets/mine-cavern.png",
    accent: "#5ce8e0",
    minDepth: 1,
    rockNames: ["Monolithe azur", "Bloc de cuivre", "Veine ancienne", "Roche chantante"],
    orePool: [
      { id: "stone", weight: 46 },
      { id: "copper", weight: 28 },
      { id: "iron", weight: 14 },
      { id: "azurite", weight: 9 },
      { id: "gold", weight: 3 },
    ],
  },
  {
    id: 1,
    name: "Faille Incandescente",
    sector: "SECTEUR 02",
    description: "La forge naturelle de la montagne. Ici, même l'acier transpire.",
    image: "assets/ember-rift.png",
    accent: "#ff8b4b",
    minDepth: 25,
    rockNames: ["Cœur d'obsidienne", "Bloc volcanique", "Nodule ardent", "Veine écarlate"],
    orePool: [
      { id: "stone", weight: 26 },
      { id: "iron", weight: 25 },
      { id: "azurite", weight: 14 },
      { id: "gold", weight: 14 },
      { id: "ember", weight: 21 },
    ],
  },
  {
    id: 2,
    name: "Noyau Sans Étoile",
    sector: "SECTEUR 03",
    description: "La pierre ne tombe plus. Quelque chose, plus bas, attire le monde.",
    image: "assets/starless-core.png",
    accent: "#d5f1ff",
    minDepth: 60,
    rockNames: ["Noyau suspendu", "Masse sidérale", "Prisme du vide", "Pierre impossible"],
    orePool: [
      { id: "iron", weight: 20 },
      { id: "azurite", weight: 22 },
      { id: "gold", weight: 16 },
      { id: "ember", weight: 18 },
      { id: "star", weight: 24 },
    ],
  },
  {
    id: 3,
    name: "Cathédrale de Quartz",
    sector: "SECTEUR 04",
    description: "Des piliers de cristal gardent la mémoire de toutes les descentes.",
    image: "assets/quartz-cathedral.png",
    accent: "#d7c5ff",
    minDepth: 120,
    rockNames: ["Rosace minérale", "Pilier mémoriel", "Géode liturgique", "Nef cristalline"],
    orePool: [
      { id: "azurite", weight: 18 },
      { id: "gold", weight: 16 },
      { id: "ember", weight: 16 },
      { id: "star", weight: 24 },
      { id: "quartz", weight: 26 },
    ],
  },
  {
    id: 4,
    name: "Mer de Verre",
    sector: "SECTEUR 05",
    description: "Un océan minéral figé, fendu par une lumière venue d'en dessous.",
    image: "assets/glass-sea.png",
    accent: "#64e3bb",
    minDepth: 220,
    rockNames: ["Monolithe miroir", "Écueil vitrifié", "Lame tellurique", "Récif d'obsidienne"],
    orePool: [
      { id: "gold", weight: 12 },
      { id: "ember", weight: 16 },
      { id: "star", weight: 20 },
      { id: "quartz", weight: 25 },
      { id: "glass", weight: 27 },
    ],
  },
  {
    id: 5,
    name: "Chambre de l'Aube",
    sector: "SECTEUR 06",
    description: "Au fond du monde, une mécanique solaire attend d'être réveillée.",
    image: "assets/dawn-vault.png",
    accent: "#ffe59b",
    minDepth: 360,
    rockNames: ["Cœur héliarque", "Couronne fossile", "Masse aurorale", "Soleil enfoui"],
    orePool: [
      { id: "ember", weight: 12 },
      { id: "star", weight: 18 },
      { id: "quartz", weight: 21 },
      { id: "glass", weight: 24 },
      { id: "dawn", weight: 25 },
    ],
  },
];

export const TOOLS: ToolDefinition[] = [
  { name: "Pioche de fortune", epithet: "Elle a déjà une histoire.", damage: 2, durability: 100, coinCost: 0, oreCost: {} },
  { name: "Pioche de cuivre", epithet: "Souple, fiable et presque élégante.", damage: 4, durability: 145, coinCost: 150, oreCost: { copper: 18 } },
  { name: "Pioche d'acier", epithet: "Le bruit devient une promesse.", damage: 8, durability: 210, coinCost: 900, oreCost: { copper: 25, iron: 35 } },
  { name: "Marteau prismatique", epithet: "Chaque impact divise la lumière.", damage: 17, durability: 300, coinCost: 4_500, oreCost: { azurite: 60, gold: 8 } },
  { name: "Brise-Faille", epithet: "Forgé là où la montagne brûle.", damage: 36, durability: 430, coinCost: 28_000, oreCost: { ember: 75, gold: 30 } },
  { name: "Clé du Noyau", epithet: "Ce n'est plus vraiment un outil.", damage: 85, durability: 650, coinCost: 180_000, oreCost: { star: 60, ember: 80 } },
  { name: "Sceptre de Quartz", epithet: "Il se souvient de chaque roche déjà brisée.", damage: 190, durability: 900, coinCost: 1_200_000, oreCost: { star: 120, quartz: 90 } },
  { name: "Tranche-Verre", epithet: "Une arête assez fine pour ouvrir un reflet.", damage: 430, durability: 1_300, coinCost: 6_000_000, oreCost: { quartz: 180, glass: 75 } },
  { name: "Bélier d'Aurore", epithet: "Chaque coup annonce un matin qui n'existe pas encore.", damage: 980, durability: 1_900, coinCost: 80_000_000, oreCost: { glass: 160, dawn: 60 } },
  { name: "Atlas Tellurique", epithet: "La montagne paraît soudain beaucoup moins lourde.", damage: 2_300, durability: 2_800, coinCost: 650_000_000, oreCost: { dawn: 140, star: 300 } },
  { name: "Étoile de Siège", epithet: "Le dernier argument de l'atelier.", damage: 5_800, durability: 4_200, coinCost: 6_000_000_000, oreCost: { dawn: 320, glass: 500, quartz: 700 } },
];

export const UPGRADES: UpgradeDefinition[] = [
  { id: "power", name: "Tranchant", description: "+45 % de puissance manuelle", currency: "shards", baseCost: 14, scale: 1.72, max: 20 },
  { id: "sturdy", name: "Renfort", description: "+25 de durabilité maximale", currency: "shards", baseCost: 20, scale: 1.78, max: 16 },
  { id: "precision", name: "Précision", description: "+3 % de chance critique", currency: "coins", baseCost: 55, scale: 1.86, max: 14 },
  { id: "geology", name: "Instinct géologique", description: "Plus de minerai et de rareté", currency: "coins", baseCost: 85, scale: 1.9, max: 12 },
  { id: "maintenance", name: "Entretien", description: "Réparations moins coûteuses", currency: "shards", baseCost: 32, scale: 1.82, max: 8 },
];

export const MACHINES: MachineDefinition[] = [
  { id: "drill", name: "Taupe mécanique", description: "+1,6 dégât automatique par seconde", baseCost: 180, scale: 1.72, unlockDepth: 8, max: 24 },
  { id: "cart", name: "Wagon trieur", description: "+9 % de minerai à chaque filon", baseCost: 380, scale: 1.76, unlockDepth: 15, max: 18 },
  { id: "smelter", name: "Four à induction", description: "+14 % sur toutes les ventes", baseCost: 900, scale: 1.8, unlockDepth: 25, max: 18 },
  { id: "resonator", name: "Résonateur profond", description: "+2 points de résonance par frappe", baseCost: 8_000, scale: 1.85, unlockDepth: 70, max: 12 },
  { id: "excavator", name: "Foreuse cyclopéenne", description: "+180 dégâts automatiques par seconde", baseCost: 120_000, scale: 1.9, unlockDepth: 120, max: 14 },
];

export const LEGACIES: LegacyDefinition[] = [
  { id: "force", name: "Mémoire du geste", description: "+38 % de puissance manuelle par niveau", baseCost: 1, scale: 2.05, max: 10 },
  { id: "industry", name: "Plans persistants", description: "+45 % de puissance automatique par niveau", baseCost: 1, scale: 2.15, max: 10 },
  { id: "fortune", name: "Écho des filons", description: "+12 % de minerai et de valeur par niveau", baseCost: 2, scale: 2.25, max: 8 },
  { id: "endurance", name: "Métal souvenu", description: "+15 % de durabilité maximale par niveau", baseCost: 2, scale: 2.3, max: 8 },
];

export const RESEARCH: ResearchDefinition[] = [
  { id: "impact", name: "Percussion calculée", description: "+25 % de puissance manuelle", baseCost: 2, scale: 1.85, max: 4 },
  { id: "automation", name: "Servomoteurs synchrones", description: "+22 % de puissance automatique", baseCost: 2, scale: 1.9, max: 4 },
  { id: "extraction", name: "Cartographie fractale", description: "+8 % de minerai extrait", baseCost: 3, scale: 1.9, max: 4 },
  { id: "metallurgy", name: "Alliages adaptatifs", description: "+10 % de durabilité maximale", baseCost: 3, scale: 1.95, max: 4 },
  { id: "resonance", name: "Analyse harmonique", description: "+2 résonance et +1 % critique", baseCost: 3, scale: 1.95, max: 4 },
  { id: "commerce", name: "Modèles de négociation", description: "+7 % sur les ventes et contrats", baseCost: 4, scale: 2, max: 4 },
];

export interface GoalDefinition {
  id: string;
  name: string;
  description: string;
  target: number;
  progress: (state: GameState) => number;
  reward: { shards?: number; coins?: number; echoes?: number; drill?: number; research?: number };
}

export const GOALS: GoalDefinition[] = [
  { id: "first-veins", name: "Ça commence", description: "Briser 5 filons", target: 5, progress: (s) => s.rocksBroken, reward: { shards: 50 } },
  { id: "prospector", name: "Les poches pleines", description: "Extraire 40 minerais", target: 40, progress: (s) => s.totalMined, reward: { coins: 120 } },
  { id: "machines", name: "Jamais seul", description: "Installer 3 machines", target: 3, progress: (s) => machineCount(s), reward: { drill: 1 } },
  { id: "ember", name: "Ça chauffe", description: "Atteindre 25 mètres", target: 25, progress: (s) => s.maxDepth, reward: { shards: 220 } },
  { id: "first-contract", name: "Poignée de main", description: "Honorer un contrat", target: 1, progress: (s) => s.completedContracts, reward: { coins: 1_500 } },
  { id: "core", name: "Sous le monde", description: "Atteindre 60 mètres", target: 60, progress: (s) => s.maxDepth, reward: { shards: 1_000, coins: 2_500 } },
  { id: "first-analysis", name: "Sous la loupe", description: "Analyser un minerai", target: 1, progress: (s) => s.analysesCompleted, reward: { research: 2 } },
  { id: "contractor", name: "Carnet de commandes", description: "Honorer 5 contrats", target: 5, progress: (s) => s.completedContracts, reward: { coins: 18_000 } },
  { id: "industry", name: "Petit empire", description: "Briser 150 filons", target: 150, progress: (s) => s.rocksBroken, reward: { coins: 8_000 } },
  { id: "cathedral", name: "La quatrième porte", description: "Atteindre 120 mètres", target: 120, progress: (s) => s.maxDepth, reward: { echoes: 1, coins: 25_000 } },
  { id: "mineralogist", name: "Table périodique", description: "Mener 10 analyses", target: 10, progress: (s) => s.analysesCompleted, reward: { research: 8, coins: 35_000 } },
  { id: "first-cycle", name: "Revenir autrement", description: "Lancer une expédition", target: 1, progress: (s) => s.expeditions, reward: { echoes: 3 } },
  { id: "deep-industry", name: "Quart de nuit", description: "Briser 500 filons", target: 500, progress: (s) => s.rocksBroken, reward: { coins: 180_000 } },
  { id: "glass-sea", name: "Marcher sur le vide", description: "Atteindre 220 mètres", target: 220, progress: (s) => s.maxDepth, reward: { shards: 8_000, coins: 500_000 } },
  { id: "trusted-name", name: "Nom qui circule", description: "Honorer 15 contrats", target: 15, progress: (s) => s.completedContracts, reward: { echoes: 4, coins: 750_000 } },
  { id: "research-network", name: "Théorie et pratique", description: "Développer 8 protocoles", target: 8, progress: (s) => Object.values(s.research).reduce((sum, level) => sum + level, 0), reward: { echoes: 3, research: 12 } },
  { id: "second-cycle", name: "La mine se souvient", description: "Lancer deux expéditions", target: 2, progress: (s) => s.expeditions, reward: { echoes: 6 } },
  { id: "dawn", name: "Avant le matin", description: "Atteindre 360 mètres", target: 360, progress: (s) => s.maxDepth, reward: { shards: 25_000, coins: 8_000_000 } },
  { id: "third-cycle", name: "Plus bas que la fin", description: "Lancer trois expéditions", target: 3, progress: (s) => s.expeditions, reward: { echoes: 10 } },
  { id: "foreman", name: "Contremaître du monde", description: "Briser 1 500 filons", target: 1_500, progress: (s) => s.rocksBroken, reward: { coins: 120_000_000 } },
  { id: "deepest", name: "Il reste encore du fond", description: "Atteindre 600 mètres", target: 600, progress: (s) => s.maxDepth, reward: { echoes: 20, coins: 1_000_000_000 } },
];

export interface DerivedStats {
  clickDamage: number;
  maxDurability: number;
  critChance: number;
  critMultiplier: number;
  autoDamage: number;
  yieldMultiplier: number;
  saleMultiplier: number;
  resonanceGain: number;
  repairCost: number;
  durabilityLoss: number;
  inventoryValue: number;
}

const emptyInventory = (): Record<OreId, number> => ({
  stone: 0,
  copper: 0,
  iron: 0,
  azurite: 0,
  gold: 0,
  ember: 0,
  star: 0,
  quartz: 0,
  glass: 0,
  dawn: 0,
});

const emptyUpgrades = (): Record<UpgradeId, number> => ({ power: 0, sturdy: 0, precision: 0, geology: 0, maintenance: 0 });
const emptyMachines = (): Record<MachineId, number> => ({ drill: 0, cart: 0, smelter: 0, resonator: 0, excavator: 0 });
const emptyLegacy = (): Record<LegacyId, number> => ({ force: 0, industry: 0, fortune: 0, endurance: 0 });
const emptyOreStudies = (): Record<OreId, number> => ({
  stone: 0,
  copper: 0,
  iron: 0,
  azurite: 0,
  gold: 0,
  ember: 0,
  star: 0,
  quartz: 0,
  glass: 0,
  dawn: 0,
});
const emptyResearch = (): Record<ResearchId, number> => ({ impact: 0, automation: 0, extraction: 0, metallurgy: 0, resonance: 0, commerce: 0 });

export function zoneForDepth(depth: number): ZoneDefinition {
  return [...ZONES].reverse().find((zone) => depth >= zone.minDepth) ?? ZONES[0];
}

export function activeZoneForState(state: Pick<GameState, "depth" | "selectedZoneId">): ZoneDefinition {
  const deepestZone = zoneForDepth(state.depth);
  const selectedZoneId = clamp(Math.floor(Number(state.selectedZoneId)), 0, deepestZone.id);
  return ZONES.find((zone) => zone.id === selectedZoneId) ?? deepestZone;
}

export function rockMaxHpFor(depth: number): number {
  const zone = zoneForDepth(depth);
  const zoneMultiplier = [1, 2.05, 4.4, 11, 25, 60][zone.id] ?? 60;
  const deepRockPressure = Math.pow(1.0065, Math.max(0, depth - 15));
  return Math.round((10 + depth * 2.35 + Math.pow(depth, 1.2) * 0.36) * zoneMultiplier * deepRockPressure);
}

export function veinsPerMeterFor(depth: number): number {
  return [1, 2, 3, 5, 7, 9][zoneForDepth(depth).id] ?? 9;
}

export function expeditionTarget(expeditions: number): number {
  const fixedTargets = [120, 240, 400, 600];
  return fixedTargets[expeditions] ?? 600 + (expeditions - 3) * 200;
}

export function expeditionReward(state: Pick<GameState, "depth" | "expeditions">): number {
  return Math.max(1, Math.floor(Math.pow(state.depth / 40, 1.18)) + state.expeditions * 3);
}

export function canStartExpedition(state: Pick<GameState, "depth" | "expeditions">): boolean {
  return state.depth >= expeditionTarget(state.expeditions);
}

export function rockNameFor(state: GameState): string {
  const zone = activeZoneForState(state);
  return zone.rockNames[state.rockRevision % zone.rockNames.length];
}

export function createInitialState(): GameState {
  const rockMaxHp = rockMaxHpFor(1);
  return {
    version: 7,
    shards: 0,
    coins: 0,
    echoes: 0,
    depth: 1,
    maxDepth: 1,
    expeditions: 0,
    selectedZoneId: 0,
    strataProgress: 0,
    rocksBroken: 0,
    totalStrikes: 0,
    totalMined: 0,
    durability: 100,
    rockHp: rockMaxHp,
    rockMaxHp,
    resonance: 0,
    toolTier: 0,
    inventory: emptyInventory(),
    upgrades: emptyUpgrades(),
    machines: emptyMachines(),
    legacy: emptyLegacy(),
    salesCompleted: 0,
    reputation: 0,
    completedContracts: 0,
    contractOffers: [],
    tradeHistory: [],
    researchPoints: 0,
    analysesCompleted: 0,
    oreStudies: emptyOreStudies(),
    research: emptyResearch(),
    claimedGoals: [],
    journal: [{ id: 1, text: "La première galerie attend. Trois silhouettes observent depuis les poutres.", tone: "normal" }],
    activeEvent: null,
    offlineReport: null,
    impact: { id: 0, damage: 0, crit: false, shards: 0 },
    rockRevision: 0,
    message: "Le filon répond à ton premier coup.",
    soundOn: true,
    lastSavedAt: Date.now(),
  };
}

function normalizeState(candidate: Partial<GameState>): GameState {
  const base = createInitialState();
  const toolTier = clamp(Math.floor(candidate.toolTier ?? 0), 0, TOOLS.length - 1);
  const candidateMachines = { ...base.machines, ...(candidate.machines ?? {}) };
  const candidateUpgrades = { ...base.upgrades, ...(candidate.upgrades ?? {}) };
  const candidateLegacy = { ...base.legacy, ...(candidate.legacy ?? {}) };
  const candidateOreStudies = { ...base.oreStudies, ...(candidate.oreStudies ?? {}) };
  const candidateResearch = { ...base.research, ...(candidate.research ?? {}) };
  const inferredPreviousSale =
    Number(candidate.coins ?? 0) > 0
    || Object.values(candidateMachines).some((level) => level > 0)
    || candidateUpgrades.precision > 0
    || candidateUpgrades.geology > 0
    || toolTier > 0;
  const merged: GameState = {
    ...base,
    ...candidate,
    version: 7,
    toolTier,
    inventory: { ...base.inventory, ...(candidate.inventory ?? {}) },
    upgrades: candidateUpgrades,
    machines: candidateMachines,
    legacy: candidateLegacy,
    echoes: Math.max(0, Math.floor(Number(candidate.echoes) || 0)),
    expeditions: Math.max(0, Math.floor(Number(candidate.expeditions) || 0)),
    salesCompleted: Math.max(0, Math.floor(candidate.salesCompleted ?? (inferredPreviousSale ? 1 : 0))),
    reputation: Math.max(0, Math.floor(Number(candidate.reputation) || 0)),
    completedContracts: Math.max(0, Math.floor(Number(candidate.completedContracts) || 0)),
    contractOffers: Array.isArray(candidate.contractOffers) ? candidate.contractOffers.slice(0, CONTRACT_OFFER_COUNT) : [],
    tradeHistory: Array.isArray(candidate.tradeHistory) ? candidate.tradeHistory.slice(0, 12) : [],
    researchPoints: Math.max(0, Math.floor(Number(candidate.researchPoints) || 0)),
    analysesCompleted: Math.max(0, Math.floor(Number(candidate.analysesCompleted) || 0)),
    oreStudies: Object.fromEntries(ORE_ORDER.map((id) => [id, clamp(Math.floor(Number(candidateOreStudies[id]) || 0), 0, MAX_ORE_STUDY_LEVEL)])) as Record<OreId, number>,
    research: Object.fromEntries(RESEARCH.map((definition) => [definition.id, clamp(Math.floor(Number(candidateResearch[definition.id]) || 0), 0, definition.max)])) as Record<ResearchId, number>,
    claimedGoals: Array.isArray(candidate.claimedGoals) ? candidate.claimedGoals : [],
    journal: Array.isArray(candidate.journal) && candidate.journal.length ? candidate.journal.slice(0, 12) : base.journal,
    activeEvent: null,
    offlineReport: null,
    impact: { ...base.impact, ...(candidate.impact ?? {}) },
    lastSavedAt: Number(candidate.lastSavedAt) || Date.now(),
  };
  const maxDurability = getDerivedStats(merged).maxDurability;
  merged.durability = clamp(Number(merged.durability) || 0, 0, maxDurability);
  merged.depth = Math.max(1, Math.floor(Number(merged.depth) || 1));
  merged.maxDepth = Math.max(merged.depth, Math.floor(Number(candidate.maxDepth) || merged.depth));
  merged.strataProgress = clamp(
    Math.floor(Number(candidate.strataProgress) || 0),
    0,
    veinsPerMeterFor(merged.depth) - 1,
  );
  const deepestZoneId = zoneForDepth(merged.depth).id;
  const requestedZoneId = Number(candidate.selectedZoneId);
  merged.selectedZoneId = Number.isFinite(requestedZoneId)
    ? clamp(Math.floor(requestedZoneId), 0, deepestZoneId)
    : deepestZoneId;
  merged.rockMaxHp = Math.max(1, Number(merged.rockMaxHp) || rockMaxHpFor(merged.depth));
  merged.rockHp = clamp(Number(merged.rockHp) || merged.rockMaxHp, 0, merged.rockMaxHp);
  return merged;
}

export function loadGame(): GameState {
  const fresh = createInitialState();
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (stored) return applyOfflineProgress(normalizeState(JSON.parse(stored)));

    const teaser = localStorage.getItem(TEASER_SAVE_KEY);
    if (teaser) {
      const old = JSON.parse(teaser) as { shards?: number; durability?: number; resonance?: number; depth?: number; strikes?: number; soundOn?: boolean };
      const migrated = normalizeState({
        ...fresh,
        shards: Math.max(0, old.shards ?? 0),
        durability: clamp(old.durability ?? 100, 0, 100),
        resonance: clamp(old.resonance ?? 0, 0, 99),
        depth: Math.max(1, old.depth ?? 1),
        totalStrikes: Math.max(0, old.strikes ?? 0),
        soundOn: old.soundOn ?? true,
        message: "L'ancien filon a laissé une trace. La mine se souvient.",
        journal: [{ id: 1, text: "La progression du premier prototype a été récupérée.", tone: "good" }],
      });
      const hp = rockMaxHpFor(migrated.depth);
      return { ...migrated, rockHp: hp, rockMaxHp: hp };
    }
  } catch {
    return fresh;
  }
  return fresh;
}

function applyOfflineProgress(state: GameState): GameState {
  const elapsed = Math.min(28_800, Math.max(0, Math.floor((Date.now() - state.lastSavedAt) / 1_000)));
  const stats = getDerivedStats(state);
  if (elapsed < 60 || stats.autoDamage <= 0) return state;

  const work = stats.autoDamage * elapsed;
  const shards = Math.floor(work / 18);
  const ore = Math.floor(work / 34);
  const offlineOre = activeZoneForState(state).orePool[0].id;
  return {
    ...state,
    shards: state.shards + shards,
    totalMined: state.totalMined + ore,
    inventory: { ...state.inventory, [offlineOre]: state.inventory[offlineOre] + ore },
    offlineReport: { seconds: elapsed, shards, ore },
    message: "Les machines ont continué à gratter la montagne.",
    lastSavedAt: Date.now(),
  };
}

export function saveGame(state: GameState): void {
  try {
    const toSave = { ...state, offlineReport: null, activeEvent: null, lastSavedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch {
    // The game stays playable when storage is temporarily unavailable.
  }
}

export function getDerivedStats(state: GameState): DerivedStats {
  const tool = TOOLS[state.toolTier];
  const manualLegacy = Math.pow(1.38, state.legacy.force);
  const industryLegacy = Math.pow(1.45, state.legacy.industry);
  const fortuneLegacy = Math.pow(1.12, state.legacy.fortune);
  const enduranceLegacy = Math.pow(1.15, state.legacy.endurance);
  const research = state.research ?? emptyResearch();
  const clickDamage = Math.max(1, Math.round(tool.damage * (1 + state.upgrades.power * 0.45) * manualLegacy * (1 + research.impact * 0.25)));
  const maxDurability = Math.round((tool.durability + state.upgrades.sturdy * 25) * enduranceLegacy * (1 + research.metallurgy * 0.1));
  const critChance = Math.min(0.56, 0.06 + state.upgrades.precision * 0.03 + research.resonance * 0.01 + (state.maxDepth >= 60 ? 0.04 : 0));
  const critMultiplier = 2 + Math.floor(state.upgrades.precision / 5) * 0.25;
  const autoDamage = (state.machines.drill * 1.6 + state.machines.excavator * 180) * (1 + state.toolTier * 0.18) * industryLegacy * (1 + research.automation * 0.22);
  const yieldMultiplier = (1 + state.machines.cart * 0.09 + state.upgrades.geology * 0.07) * fortuneLegacy * (1 + research.extraction * 0.08);
  const saleMultiplier = (1 + state.machines.smelter * 0.14 + (state.maxDepth >= 25 ? 0.05 : 0)) * fortuneLegacy * (1 + research.commerce * 0.07);
  const resonanceGain = 6 + state.machines.resonator * 2 + research.resonance * 2;
  const missing = Math.max(0, maxDurability - state.durability);
  const discount = Math.max(0.28, 1 - state.upgrades.maintenance * 0.09);
  const repairCost = Math.max(2, Math.ceil((missing * 0.1 + state.toolTier * 3) * discount));
  const durabilityLoss = Math.max(1, 2 - Math.floor(state.upgrades.maintenance / 5));
  const inventoryValue = Math.round(
    ORE_ORDER.reduce((sum, id) => sum + state.inventory[id] * ORES[id].value, 0) * saleMultiplier,
  );
  return { clickDamage, maxDurability, critChance, critMultiplier, autoDamage, yieldMultiplier, saleMultiplier, resonanceGain, repairCost, durabilityLoss, inventoryValue };
}

export function upgradeCost(definition: UpgradeDefinition, level: number): number {
  return Math.ceil(definition.baseCost * Math.pow(definition.scale, level));
}

export function machineCost(definition: MachineDefinition, level: number): number {
  return Math.ceil(definition.baseCost * Math.pow(definition.scale, level));
}

export function legacyCost(definition: LegacyDefinition, level: number): number {
  return Math.ceil(definition.baseCost * Math.pow(definition.scale, level));
}

export function researchCost(definition: ResearchDefinition, level: number): number {
  return Math.ceil(definition.baseCost * Math.pow(definition.scale, level));
}

const ORE_STUDY_BASE_COST: Record<OreId, number> = {
  stone: 120,
  copper: 80,
  iron: 65,
  azurite: 40,
  gold: 25,
  ember: 16,
  star: 10,
  quartz: 7,
  glass: 4,
  dawn: 2,
};

const ORE_STUDY_VALUE: Record<OreId, number> = {
  stone: 1,
  copper: 1,
  iron: 2,
  azurite: 2,
  gold: 3,
  ember: 4,
  star: 5,
  quartz: 7,
  glass: 9,
  dawn: 12,
};

const ORE_STUDY_UNLOCK_DEPTH: Record<OreId, number> = {
  stone: RESEARCH_UNLOCK_DEPTH,
  copper: RESEARCH_UNLOCK_DEPTH,
  iron: RESEARCH_UNLOCK_DEPTH,
  azurite: RESEARCH_UNLOCK_DEPTH,
  gold: RESEARCH_UNLOCK_DEPTH,
  ember: RESEARCH_UNLOCK_DEPTH,
  star: RESEARCH_UNLOCK_DEPTH,
  quartz: 120,
  glass: 220,
  dawn: 360,
};

export function oreStudyCost(id: OreId, level: number): number {
  return Math.ceil(ORE_STUDY_BASE_COST[id] * Math.pow(2.25, level));
}

export function oreStudyReward(id: OreId, level: number): number {
  return ORE_STUDY_VALUE[id] * (level + 1);
}

export function oreStudyUnlocked(state: Pick<GameState, "maxDepth">, id: OreId): boolean {
  return state.maxDepth >= ORE_STUDY_UNLOCK_DEPTH[id];
}

export function oreStudyUnlockDepth(id: OreId): number {
  return ORE_STUDY_UNLOCK_DEPTH[id];
}

export function researchLevelCount(state: Pick<GameState, "research">): number {
  return Object.values(state.research).reduce((sum, level) => sum + level, 0);
}

export function machineCount(state: GameState): number {
  return Object.values(state.machines).reduce((sum, value) => sum + value, 0);
}

export function inventoryCount(state: GameState): number {
  return ORE_ORDER.reduce((sum, id) => sum + state.inventory[id], 0);
}

export function selectedInventoryValue(
  state: GameState,
  ids: OreId[],
  rates: Partial<Record<OreId, number>> = {},
): number {
  const selected = new Set(ids);
  const saleMultiplier = getDerivedStats(state).saleMultiplier;
  const rawValue = ORE_ORDER.reduce((sum, id) => {
    if (!selected.has(id)) return sum;
    const candidateRate = Number(rates[id] ?? 1);
    const marketRate = Number.isFinite(candidateRate) ? clamp(candidateRate, 0.72, 1.4) : 1;
    return sum + state.inventory[id] * ORES[id].value * marketRate;
  }, 0);
  return Math.round(rawValue * saleMultiplier);
}

const CONTRACT_BUYERS = [
  "Maison Ferrance",
  "Atelier des Brumes",
  "Comptoir Héliarque",
  "Ligue des Verriers",
  "Convoi Sainte-Braise",
  "Archives du Quartz",
];

const CONTRACT_TITLES = [
  "Approvisionnement urgent",
  "Commande d'atelier",
  "Cargaison sous scellés",
  "Lot de recherche",
  "Réserve de chantier",
  "Livraison confidentielle",
];

function contractUnit(seed: number): number {
  const raw = Math.sin(seed * 12.9898 + 41.153) * 43_758.5453;
  return raw - Math.floor(raw);
}

function createContractOffer(state: GameState, now: number, index: number): ContractOffer {
  const difficulty = index % CONTRACT_OFFER_COUNT;
  const seed = Math.floor(now / 1_000) + state.completedContracts * 131 + index * 977 + state.expeditions * 59;
  const activeZone = zoneForDepth(state.depth);
  const accessibleOres = ORE_ORDER.slice(0, Math.min(ORE_ORDER.length, 5 + activeZone.id));
  const commonLimit = Math.max(2, Math.ceil(accessibleOres.length * 0.65));
  const primaryPool = difficulty === 0 ? accessibleOres.slice(0, commonLimit) : accessibleOres;
  const primaryIndex = Math.min(primaryPool.length - 1, Math.floor(contractUnit(seed + 1) * primaryPool.length));
  const primary = primaryPool[primaryIndex];
  const requirements: Partial<Record<OreId, number>> = {};
  const baseUnits = (16 + Math.sqrt(Math.max(1, state.depth)) * 3) * (1 + difficulty * 0.52);
  const primaryShare = difficulty === 0 ? 1 : 0.68;
  requirements[primary] = clamp(Math.round((baseUnits * primaryShare) / Math.pow(ORES[primary].value, 0.42)), 1, 2_500);

  if (difficulty > 0 && accessibleOres.length > 1) {
    let secondaryIndex = Math.floor(contractUnit(seed + 2) * accessibleOres.length);
    if (accessibleOres[secondaryIndex] === primary) secondaryIndex = (secondaryIndex + 1) % accessibleOres.length;
    const secondary = accessibleOres[secondaryIndex];
    requirements[secondary] = clamp(Math.round((baseUnits * 0.48) / Math.pow(ORES[secondary].value, 0.42)), 1, 2_500);
  }

  const rawValue = Object.entries(requirements).reduce(
    (sum, [id, amount]) => sum + ORES[id as OreId].value * (amount ?? 0),
    0,
  );
  const reputationPremium = Math.min(0.2, state.reputation * 0.004);
  const premium = 1.35 + difficulty * 0.2 + reputationPremium;
  const rewardCoins = Math.max(100, Math.round(rawValue * getDerivedStats(state).saleMultiplier * premium));
  const durations = [180_000, 300_000, 420_000];
  const buyerIndex = Math.floor(contractUnit(seed + 3) * CONTRACT_BUYERS.length);
  const titleIndex = Math.floor(contractUnit(seed + 4) * CONTRACT_TITLES.length);

  return {
    id: `contract-${now}-${state.completedContracts}-${index}`,
    buyer: CONTRACT_BUYERS[buyerIndex],
    title: CONTRACT_TITLES[titleIndex],
    requirements,
    rewardCoins,
    rewardReputation: difficulty + 1,
    expiresAt: now + durations[difficulty],
  };
}

export function contractRequirementsMet(state: GameState, offer: ContractOffer): boolean {
  return Object.entries(offer.requirements).every(
    ([id, amount]) => state.inventory[id as OreId] >= (amount ?? 0),
  );
}

export function ensureContractOffers(state: GameState, now = Date.now()): GameState {
  if (state.maxDepth < CONTRACT_UNLOCK_DEPTH) return state;
  const offers = state.contractOffers.filter((offer) => offer.expiresAt > now);
  const changed = offers.length !== state.contractOffers.length;

  while (offers.length < CONTRACT_OFFER_COUNT) {
    offers.push(createContractOffer({ ...state, contractOffers: offers }, now, offers.length));
  }

  return changed || offers.length !== state.contractOffers.length ? { ...state, contractOffers: offers } : state;
}

export function reputationRank(reputation: number): string {
  if (reputation >= 80) return "Maison de confiance";
  if (reputation >= 45) return "Intendant du noyau";
  if (reputation >= 20) return "Négociant de faille";
  if (reputation >= 8) return "Fournisseur agréé";
  return "Prospecteur indépendant";
}

export function expectedOreYield(depth: number, yieldMultiplier: number): number {
  return (2 + depth / 22) * yieldMultiplier;
}

function addJournal(state: GameState, text: string, tone: JournalEntry["tone"] = "normal"): GameState {
  const entry = { id: Date.now() + Math.random(), text, tone };
  return { ...state, journal: [entry, ...state.journal].slice(0, 10) };
}

function rollOre(zone: ZoneDefinition, geologyLevel: number): OreId {
  const boosted = zone.orePool.map((entry, index) => ({
    ...entry,
    weight: entry.weight * (1 + index * geologyLevel * 0.025),
  }));
  const total = boosted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of boosted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return boosted[0].id;
}

function randomEvent(zone: ZoneDefinition): MineEvent {
  const events: MineEvent[] = [
    { kind: "song", title: "La veine chantante", description: "Une vibration régulière traverse le filon, presque comme une mélodie." },
    { kind: "cache", title: "La caisse oubliée", description: "Une vieille caisse de prospecteur apparaît derrière la roche fendue." },
    { kind: "fracture", title: "La faille fragile", description: "Le mur pourrait céder. Il cache quelque chose, mais il faudra choisir comment l'ouvrir." },
  ];
  if (zone.id >= 3) events.push({ kind: "song", title: "La mémoire du cristal", description: "Le filon rejoue le bruit d'une ancienne expédition. Cette fois, le choix peut changer l'écho." });
  if (zone.id >= 4) events.push({ kind: "fracture", title: "Le reflet sans mineur", description: "Dans le verre noir, une pioche frappe avec une seconde d'avance sur la tienne." });
  if (zone.id >= 5) events.push({ kind: "cache", title: "Le mécanisme solaire", description: "Une roue de métal clair tourne encore sous la roche, alimentée par une chaleur impossible." });
  return events[Math.floor(Math.random() * events.length)];
}

function breakRock(state: GameState, automatic = false): GameState {
  const activeZone = activeZoneForState(state);
  const deepestZone = zoneForDepth(state.depth);
  const progressesDepth = activeZone.id === deepestZone.id;
  const targetDepth = expeditionTarget(state.expeditions);
  const canDescend = progressesDepth && state.depth < targetDepth;
  const veinsNeeded = veinsPerMeterFor(state.depth);
  const stats = getDerivedStats(state);
  const inventory = { ...state.inventory };
  const expectedRolls = expectedOreYield(state.depth, stats.yieldMultiplier);
  const baseRolls = Math.floor(expectedRolls);
  const rolls = Math.max(2, baseRolls + (Math.random() < expectedRolls - baseRolls ? 1 : 0));
  let mined = 0;

  for (let index = 0; index < rolls; index += 1) {
    const ore = rollOre(activeZone, state.upgrades.geology);
    inventory[ore] += 1;
    mined += 1;
  }

  const advancedStrata = canDescend ? state.strataProgress + 1 : state.strataProgress;
  const advancesDepth = canDescend && advancedStrata >= veinsNeeded;
  const nextDepth = advancesDepth ? state.depth + 1 : state.depth;
  const nextStrataProgress = !progressesDepth
    ? state.strataProgress
    : advancesDepth || !canDescend
      ? 0
      : advancedStrata;
  const nextZone = advancesDepth ? zoneForDepth(nextDepth) : activeZone;
  const rockMaxHp = rockMaxHpFor(nextDepth);
  const bonusShards = Math.max(2, Math.round(Math.sqrt(state.depth) * (automatic ? 0.7 : 1.1)));
  let next: GameState = {
    ...state,
    shards: state.shards + bonusShards,
    depth: nextDepth,
    maxDepth: Math.max(state.maxDepth, nextDepth),
    selectedZoneId: nextZone.id,
    strataProgress: nextStrataProgress,
    rocksBroken: state.rocksBroken + 1,
    totalMined: state.totalMined + mined,
    inventory,
    rockHp: rockMaxHp,
    rockMaxHp,
    rockRevision: state.rockRevision + 1,
    message: !progressesDepth
      ? `${mined} minerais récupérés · profondeur conservée à ${state.depth} m.`
      : !canDescend
        ? `${mined} minerais récupérés · balise saturée à ${targetDepth} m, un nouveau cycle est prêt.`
        : advancesDepth
      ? `${mined} minerais libérés · le prochain filon est plus profond.`
      : `${mined} minerais libérés · strate ${nextStrataProgress}/${veinsNeeded} stabilisée.`,
  };

  if (advancesDepth && nextZone.id !== activeZone.id) {
    next = addJournal(next, `${nextZone.name} découverte. La mine vient de changer de visage.`, "rare");
    next.message = `${nextZone.name.toUpperCase()} · nouveau secteur découvert.`;
  } else if (next.rocksBroken === 1) {
    next = addJournal(next, "Premier filon brisé. La montagne a répondu.", "good");
  } else if (next.rocksBroken % 10 === 0) {
    next = addJournal(next, `${next.rocksBroken} filons brisés. Les galeries prennent forme.`, "good");
  }

  if (!next.activeEvent && next.rocksBroken > 2 && Math.random() < 0.11) {
    next.activeEvent = randomEvent(activeZone);
  }

  return next;
}

function applyResonance(state: GameState): GameState {
  if (state.resonance < 100) return state;
  const zone = activeZoneForState(state);
  const rareOre = zone.orePool[zone.orePool.length - 1].id;
  const inventory = { ...state.inventory, [rareOre]: state.inventory[rareOre] + 3 };
  return addJournal(
    {
      ...state,
      resonance: state.resonance - 100,
      shards: state.shards + 20 + zone.id * 15,
      inventory,
      message: `RÉSONANCE PARFAITE · 3 ${ORES[rareOre].shortName.toLowerCase()} découverts.`,
    },
    `Le filon a résonné et révélé une poche de ${ORES[rareOre].name.toLowerCase()}.`,
    "rare",
  );
}

function strike(state: GameState): GameState {
  const stats = getDerivedStats(state);
  if (state.durability <= 0) return { ...state, message: "La pioche est brisée. L'atelier peut encore la sauver." };

  const crit = Math.random() < stats.critChance;
  const damage = Math.max(1, Math.round(stats.clickDamage * (crit ? stats.critMultiplier : 1)));
  const shardGain = Math.max(1, Math.ceil(damage * 0.22));
  let next: GameState = {
    ...state,
    shards: state.shards + shardGain,
    totalStrikes: state.totalStrikes + 1,
    durability: Math.max(0, state.durability - stats.durabilityLoss),
    rockHp: state.rockHp - damage,
    resonance: state.resonance + (crit ? stats.resonanceGain + 4 : stats.resonanceGain),
    impact: { id: state.impact.id + 1, damage, crit, shards: shardGain },
    message: crit ? "IMPACT PARFAIT · la pierre se fend net." : "La roche cède, morceau après morceau.",
  };

  next = applyResonance(next);
  if (next.rockHp <= 0) next = breakRock(next);
  return next;
}

function tick(state: GameState, seconds: number): GameState {
  let next = ensureContractOffers(state);
  const stats = getDerivedStats(next);
  if (stats.autoDamage <= 0 || next.activeEvent) return next;

  next = { ...next, rockHp: next.rockHp - stats.autoDamage * seconds };
  let guard = 0;
  while (next.rockHp <= 0 && guard < 12) {
    const overflow = Math.abs(next.rockHp);
    next = breakRock(next, true);
    next.rockHp -= overflow;
    guard += 1;
  }
  const passiveShards = Math.floor((stats.autoDamage * seconds) / 15);
  if (passiveShards > 0) next.shards += passiveShards;
  return next;
}

function resolveEvent(state: GameState, choice: EventChoice): GameState {
  if (!state.activeEvent) return state;
  const event = state.activeEvent;
  const zone = activeZoneForState(state);
  const rareOre = zone.orePool[zone.orePool.length - 1].id;
  let next = { ...state, activeEvent: null };

  if (choice === "bold") {
    const amount = 4 + zone.id * 2;
    next.inventory = { ...next.inventory, [rareOre]: next.inventory[rareOre] + amount };
    next.totalMined += amount;
    next.durability = Math.max(0, next.durability - 16);
    next.message = `${amount} ${ORES[rareOre].shortName.toLowerCase()} arrachés à la roche.`;
    return addJournal(next, `${event.title} : l'audace a payé, mais la pioche s'en souviendra.`, "rare");
  }

  next.shards += 45 + zone.id * 20;
  next.resonance = Math.min(99, next.resonance + 35);
  next.message = "La patience révèle parfois plus que la force.";
  return addJournal(next, `${event.title} : la mine a livré son secret sans violence.`, "good");
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "STRIKE":
      return strike(state);
    case "TICK":
      return tick(state, action.seconds);
    case "SELECT_ZONE": {
      if (state.activeEvent) return state;
      const selectedZone = ZONES.find((zone) => zone.id === action.id);
      const deepestZone = zoneForDepth(state.depth);
      if (!selectedZone || selectedZone.minDepth > state.depth || selectedZone.id > deepestZone.id) return state;
      if (selectedZone.id === activeZoneForState(state).id) return state;
      const rockMaxHp = rockMaxHpFor(state.depth);
      return {
        ...state,
        selectedZoneId: selectedZone.id,
        rockHp: rockMaxHp,
        rockMaxHp,
        rockRevision: state.rockRevision + 1,
        message: selectedZone.id === deepestZone.id
          ? `${selectedZone.name.toUpperCase()} · la descente reprend.`
          : `${selectedZone.name.toUpperCase()} · anciens minerais accessibles, profondeur conservée.`,
      };
    }
    case "REPAIR": {
      const stats = getDerivedStats(state);
      if (state.durability >= stats.maxDurability) return state;
      const emergency = state.durability <= 0 && state.shards < stats.repairCost;
      if (!emergency && state.shards < stats.repairCost) return { ...state, message: "Pas assez d'éclats pour cette réparation." };
      return {
        ...state,
        shards: emergency ? state.shards : state.shards - stats.repairCost,
        durability: emergency ? Math.ceil(stats.maxDurability * 0.28) : stats.maxDurability,
        message: emergency ? "Réparation de secours. Juste assez pour repartir." : "La pioche est prête. Le filon aussi.",
      };
    }
    case "SELL_ALL": {
      const value = getDerivedStats(state).inventoryValue;
      const soldUnits = inventoryCount(state);
      if (value <= 0) return { ...state, message: "Le chariot est vide." };
      const timestamp = Date.now();
      return {
        ...state,
        coins: state.coins + value,
        inventory: emptyInventory(),
        salesCompleted: state.salesCompleted + 1,
        tradeHistory: [{ id: timestamp + Math.random(), kind: "market" as const, label: "Marché · chargement complet", units: soldUnits, coins: value, timestamp }, ...state.tradeHistory].slice(0, 12),
        message: `Vente terminée · ${formatNumber(value)} pièces ajoutées à l'atelier.`,
      };
    }
    case "SELL_SELECTED": {
      const selectedIds = ORE_ORDER.filter((id) => action.ids.includes(id));
      const soldUnits = selectedIds.reduce((sum, id) => sum + state.inventory[id], 0);
      const value = selectedInventoryValue(state, selectedIds, action.rates);
      if (soldUnits <= 0 || value <= 0) return { ...state, message: "Aucun minerai sélectionné à vendre." };

      const inventory = { ...state.inventory };
      selectedIds.forEach((id) => {
        inventory[id] = 0;
      });
      const timestamp = Date.now();

      return {
        ...state,
        coins: state.coins + value,
        inventory,
        salesCompleted: state.salesCompleted + 1,
        tradeHistory: [{ id: timestamp + Math.random(), kind: "market" as const, label: `Marché · ${selectedIds.length} lots`, units: soldUnits, coins: value, timestamp }, ...state.tradeHistory].slice(0, 12),
        message: `Marché conclu · ${formatNumber(soldUnits)} minerais vendus pour ${formatNumber(value)} pièces.`,
      };
    }
    case "FULFILL_CONTRACT": {
      const offer = state.contractOffers.find((candidate) => candidate.id === action.id);
      const now = Date.now();
      if (!offer) return state;
      if (offer.expiresAt <= now) {
        return {
          ...state,
          contractOffers: state.contractOffers.filter((candidate) => candidate.id !== action.id),
          message: "Le convoi est parti. Une nouvelle offre arrivera sous peu.",
        };
      }
      if (!contractRequirementsMet(state, offer)) {
        return { ...state, message: "Le chargement ne couvre pas encore cette commande." };
      }

      const inventory = { ...state.inventory };
      let units = 0;
      Object.entries(offer.requirements).forEach(([id, amount]) => {
        const required = amount ?? 0;
        inventory[id as OreId] -= required;
        units += required;
      });

      return addJournal(
        {
          ...state,
          coins: state.coins + offer.rewardCoins,
          reputation: state.reputation + offer.rewardReputation,
          completedContracts: state.completedContracts + 1,
          contractOffers: state.contractOffers.filter((candidate) => candidate.id !== action.id),
          inventory,
          tradeHistory: [{ id: now + Math.random(), kind: "contract" as const, label: offer.buyer, units, coins: offer.rewardCoins, timestamp: now }, ...state.tradeHistory].slice(0, 12),
          message: `CONTRAT HONORÉ · ${formatNumber(offer.rewardCoins)} pièces et +${offer.rewardReputation} réputation.`,
        },
        `${offer.buyer} a reçu sa commande. La Compagnie commence à retenir ton nom.`,
        "good",
      );
    }
    case "ANALYZE_ORE": {
      if (state.maxDepth < RESEARCH_UNLOCK_DEPTH || !oreStudyUnlocked(state, action.id)) return state;
      const level = state.oreStudies[action.id];
      if (level >= MAX_ORE_STUDY_LEVEL) return state;
      const sampleCost = oreStudyCost(action.id, level);
      if (state.inventory[action.id] < sampleCost) {
        return { ...state, message: `L'analyse exige encore ${formatNumber(sampleCost)} ${ORES[action.id].shortName.toLowerCase()}.` };
      }
      const reward = oreStudyReward(action.id, level);
      return addJournal(
        {
          ...state,
          inventory: { ...state.inventory, [action.id]: state.inventory[action.id] - sampleCost },
          researchPoints: state.researchPoints + reward,
          analysesCompleted: state.analysesCompleted + 1,
          oreStudies: { ...state.oreStudies, [action.id]: level + 1 },
          message: `ANALYSE TERMINÉE · +${reward} donnée${reward > 1 ? "s" : ""} de recherche.`,
        },
        `${ORES[action.id].name} documenté au niveau ${level + 1}. Le laboratoire comprend un peu mieux la mine.`,
        level + 1 === MAX_ORE_STUDY_LEVEL ? "rare" : "good",
      );
    }
    case "BUY_RESEARCH": {
      if (state.maxDepth < RESEARCH_UNLOCK_DEPTH) return state;
      const definition = RESEARCH.find((candidate) => candidate.id === action.id);
      if (!definition) return state;
      const level = state.research[action.id];
      if (level >= definition.max) return state;
      const cost = researchCost(definition, level);
      if (state.researchPoints < cost) return { ...state, message: "Le laboratoire manque encore de données exploitables." };
      const oldStats = getDerivedStats(state);
      const next: GameState = {
        ...state,
        researchPoints: state.researchPoints - cost,
        research: { ...state.research, [action.id]: level + 1 },
        message: `${definition.name} validé au niveau ${level + 1}.`,
      };
      if (action.id === "metallurgy") {
        next.durability += getDerivedStats(next).maxDurability - oldStats.maxDurability;
      }
      return addJournal(next, `PROTOCOLE VALIDÉ · ${definition.name}.`, "rare");
    }
    case "BUY_UPGRADE": {
      const definition = UPGRADES.find((upgrade) => upgrade.id === action.id);
      if (!definition) return state;
      const level = state.upgrades[action.id];
      if (level >= definition.max) return state;
      const cost = upgradeCost(definition, level);
      const available = definition.currency === "shards" ? state.shards : state.coins;
      if (available < cost) return { ...state, message: "Il manque encore quelques ressources." };
      const oldStats = getDerivedStats(state);
      let next: GameState = {
        ...state,
        shards: definition.currency === "shards" ? state.shards - cost : state.shards,
        coins: definition.currency === "coins" ? state.coins - cost : state.coins,
        upgrades: { ...state.upgrades, [action.id]: level + 1 },
        message: `${definition.name} amélioré au niveau ${level + 1}.`,
      };
      if (action.id === "sturdy") {
        const gained = getDerivedStats(next).maxDurability - oldStats.maxDurability;
        next.durability += gained;
      }
      return next;
    }
    case "BUY_MACHINE": {
      const definition = MACHINES.find((machine) => machine.id === action.id);
      if (!definition || state.maxDepth < definition.unlockDepth) return state;
      const level = state.machines[action.id];
      if (level >= definition.max) return state;
      const cost = machineCost(definition, level);
      if (state.coins < cost) return { ...state, message: "L'atelier n'a pas encore les moyens." };
      return addJournal(
        {
          ...state,
          coins: state.coins - cost,
          machines: { ...state.machines, [action.id]: level + 1 },
          message: `${definition.name} rejoint l'atelier. La mine travaille un peu plus seule.`,
        },
        `${definition.name} rejoint l'atelier.`,
        "good",
      );
    }
    case "BUY_LEGACY": {
      const definition = LEGACIES.find((legacy) => legacy.id === action.id);
      if (!definition) return state;
      const level = state.legacy[action.id];
      if (level >= definition.max) return state;
      const cost = legacyCost(definition, level);
      if (state.echoes < cost) return { ...state, message: "Il manque des échos de profondeur." };
      const oldStats = getDerivedStats(state);
      const next: GameState = {
        ...state,
        echoes: state.echoes - cost,
        legacy: { ...state.legacy, [action.id]: level + 1 },
        message: `${definition.name} gravée au niveau ${level + 1}.`,
      };
      if (action.id === "endurance") {
        next.durability += getDerivedStats(next).maxDurability - oldStats.maxDurability;
      }
      return next;
    }
    case "FORGE_NEXT": {
      const nextTool = TOOLS[state.toolTier + 1];
      if (!nextTool) return state;
      const hasOres = Object.entries(nextTool.oreCost).every(([id, amount]) => state.inventory[id as OreId] >= (amount ?? 0));
      if (state.coins < nextTool.coinCost || !hasOres) return { ...state, message: "La forge attend encore ses matériaux." };
      const inventory = { ...state.inventory };
      Object.entries(nextTool.oreCost).forEach(([id, amount]) => {
        inventory[id as OreId] -= amount ?? 0;
      });
      const next: GameState = {
        ...state,
        coins: state.coins - nextTool.coinCost,
        toolTier: state.toolTier + 1,
        inventory,
        durability: state.durability,
        message: `${nextTool.name.toUpperCase()} · une nouvelle époque commence.`,
      };
      next.durability = getDerivedStats(next).maxDurability;
      return addJournal(next, `${nextTool.name} forgée. ${nextTool.epithet}`, "rare");
    }
    case "START_EXPEDITION": {
      if (!canStartExpedition(state)) return { ...state, message: `La balise exige ${expeditionTarget(state.expeditions)} mètres.` };
      const reward = expeditionReward(state);
      const fresh = createInitialState();
      return {
        ...fresh,
        version: 7,
        echoes: state.echoes + reward,
        maxDepth: Math.max(state.maxDepth, state.depth),
        expeditions: state.expeditions + 1,
        legacy: state.legacy,
        rocksBroken: state.rocksBroken,
        totalStrikes: state.totalStrikes,
        totalMined: state.totalMined,
        salesCompleted: state.salesCompleted,
        reputation: state.reputation,
        completedContracts: state.completedContracts,
        tradeHistory: state.tradeHistory,
        researchPoints: state.researchPoints,
        analysesCompleted: state.analysesCompleted,
        oreStudies: state.oreStudies,
        research: state.research,
        claimedGoals: state.claimedGoals,
        soundOn: state.soundOn,
        impact: { ...fresh.impact, id: state.impact.id + 1 },
        journal: [
          { id: Date.now(), text: `Cycle ${state.expeditions + 2} engagé. ${reward} échos ont survécu à la remontée.`, tone: "rare" as const },
          ...state.journal,
        ].slice(0, 10),
        message: `NOUVEAU CYCLE · ${reward} échos conservés, prochaine balise à ${expeditionTarget(state.expeditions + 1)} m.`,
      };
    }
    case "CLAIM_GOAL": {
      const goal = GOALS.find((candidate) => candidate.id === action.id);
      if (!goal || state.claimedGoals.includes(goal.id) || goal.progress(state) < goal.target) return state;
      return {
        ...state,
        shards: state.shards + (goal.reward.shards ?? 0),
        coins: state.coins + (goal.reward.coins ?? 0),
        echoes: state.echoes + (goal.reward.echoes ?? 0),
        researchPoints: state.researchPoints + (goal.reward.research ?? 0),
        machines: { ...state.machines, drill: state.machines.drill + (goal.reward.drill ?? 0) },
        claimedGoals: [...state.claimedGoals, goal.id],
        message: `Objectif accompli · ${goal.name}.`,
      };
    }
    case "RESOLVE_EVENT":
      return resolveEvent(state, action.choice);
    case "TOGGLE_SOUND":
      return { ...state, soundOn: !state.soundOn };
    case "DISMISS_OFFLINE":
      return { ...state, offlineReport: null };
    case "IMPORT":
      return { ...normalizeState(action.state), message: "Sauvegarde importée. La mine reconnaît son propriétaire." };
    case "RESET":
      return createInitialState();
    default:
      return state;
  }
}

export function canForgeNext(state: GameState): boolean {
  const nextTool = TOOLS[state.toolTier + 1];
  if (!nextTool || state.coins < nextTool.coinCost) return false;
  return Object.entries(nextTool.oreCost).every(([id, amount]) => state.inventory[id as OreId] >= (amount ?? 0));
}

export function encodeSave(state: GameState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ ...state, activeEvent: null, offlineReport: null }))));
}

export function decodeSave(value: string): GameState {
  const parsed = JSON.parse(decodeURIComponent(escape(atob(value.trim()))));
  if (!parsed || typeof parsed !== "object") throw new Error("Sauvegarde invalide");
  return normalizeState(parsed);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const absolute = Math.abs(value);
  const units = [
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "Md" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "k" },
  ];
  const unit = units.find((candidate) => absolute >= candidate.value);
  if (unit) return `${(value / unit.value).toFixed(absolute >= unit.value * 100 ? 0 : 1)}${unit.suffix}`;
  return Math.floor(value).toLocaleString("fr-FR");
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (hours) return `${hours} h ${minutes} min`;
  return `${Math.max(1, minutes)} min`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
