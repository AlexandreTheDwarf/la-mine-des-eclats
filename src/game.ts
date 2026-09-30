export type OreId =
  | "stone"
  | "copper"
  | "iron"
  | "azurite"
  | "gold"
  | "ember"
  | "star";

export type UpgradeId = "power" | "sturdy" | "precision" | "geology" | "maintenance";
export type MachineId = "drill" | "cart" | "smelter";
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

export interface GameState {
  version: 2;
  shards: number;
  coins: number;
  depth: number;
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
  | { type: "REPAIR" }
  | { type: "SELL_ALL" }
  | { type: "BUY_UPGRADE"; id: UpgradeId }
  | { type: "BUY_MACHINE"; id: MachineId }
  | { type: "FORGE_NEXT" }
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
};

export const ORE_ORDER: OreId[] = ["stone", "copper", "iron", "azurite", "gold", "ember", "star"];

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
];

export const TOOLS: ToolDefinition[] = [
  { name: "Pioche de fortune", epithet: "Elle a déjà une histoire.", damage: 2, durability: 100, coinCost: 0, oreCost: {} },
  { name: "Pioche de cuivre", epithet: "Souple, fiable et presque élégante.", damage: 4, durability: 145, coinCost: 150, oreCost: { copper: 18 } },
  { name: "Pioche d'acier", epithet: "Le bruit devient une promesse.", damage: 8, durability: 210, coinCost: 900, oreCost: { copper: 25, iron: 35 } },
  { name: "Marteau prismatique", epithet: "Chaque impact divise la lumière.", damage: 17, durability: 300, coinCost: 4_500, oreCost: { azurite: 60, gold: 8 } },
  { name: "Brise-Faille", epithet: "Forgé là où la montagne brûle.", damage: 36, durability: 430, coinCost: 28_000, oreCost: { ember: 75, gold: 30 } },
  { name: "Clé du Noyau", epithet: "Ce n'est plus vraiment un outil.", damage: 85, durability: 650, coinCost: 180_000, oreCost: { star: 60, ember: 80 } },
];

export const UPGRADES: UpgradeDefinition[] = [
  { id: "power", name: "Tranchant", description: "+45 % de puissance manuelle", currency: "shards", baseCost: 14, scale: 1.72, max: 20 },
  { id: "sturdy", name: "Renfort", description: "+25 de durabilité maximale", currency: "shards", baseCost: 20, scale: 1.78, max: 16 },
  { id: "precision", name: "Précision", description: "+3 % de chance critique", currency: "coins", baseCost: 55, scale: 1.86, max: 14 },
  { id: "geology", name: "Instinct géologique", description: "Plus de minerai et de rareté", currency: "coins", baseCost: 85, scale: 1.9, max: 12 },
  { id: "maintenance", name: "Entretien", description: "Réparations moins coûteuses", currency: "shards", baseCost: 32, scale: 1.82, max: 8 },
];

export const MACHINES: MachineDefinition[] = [
  { id: "drill", name: "Taupe mécanique", description: "+2 dégâts automatiques par seconde", baseCost: 140, scale: 1.62, unlockDepth: 8 },
  { id: "cart", name: "Wagon trieur", description: "+12 % de minerai à chaque filon", baseCost: 260, scale: 1.68, unlockDepth: 15 },
  { id: "smelter", name: "Four à induction", description: "+18 % sur toutes les ventes", baseCost: 520, scale: 1.72, unlockDepth: 25 },
];

export interface GoalDefinition {
  id: string;
  name: string;
  description: string;
  target: number;
  progress: (state: GameState) => number;
  reward: { shards?: number; coins?: number; drill?: number };
}

export const GOALS: GoalDefinition[] = [
  { id: "first-veins", name: "Ça commence", description: "Briser 5 filons", target: 5, progress: (s) => s.rocksBroken, reward: { shards: 50 } },
  { id: "prospector", name: "Les poches pleines", description: "Extraire 40 minerais", target: 40, progress: (s) => s.totalMined, reward: { coins: 120 } },
  { id: "machines", name: "Jamais seul", description: "Installer 3 machines", target: 3, progress: (s) => machineCount(s), reward: { drill: 1 } },
  { id: "ember", name: "Ça chauffe", description: "Atteindre 25 mètres", target: 25, progress: (s) => s.depth, reward: { shards: 220 } },
  { id: "core", name: "Sous le monde", description: "Atteindre 60 mètres", target: 60, progress: (s) => s.depth, reward: { shards: 1_000, coins: 2_500 } },
  { id: "industry", name: "Petit empire", description: "Briser 150 filons", target: 150, progress: (s) => s.rocksBroken, reward: { coins: 8_000 } },
];

export interface DerivedStats {
  clickDamage: number;
  maxDurability: number;
  critChance: number;
  critMultiplier: number;
  autoDamage: number;
  yieldMultiplier: number;
  saleMultiplier: number;
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
});

const emptyUpgrades = (): Record<UpgradeId, number> => ({ power: 0, sturdy: 0, precision: 0, geology: 0, maintenance: 0 });
const emptyMachines = (): Record<MachineId, number> => ({ drill: 0, cart: 0, smelter: 0 });

export function zoneForDepth(depth: number): ZoneDefinition {
  return [...ZONES].reverse().find((zone) => depth >= zone.minDepth) ?? ZONES[0];
}

export function rockMaxHpFor(depth: number): number {
  const zone = zoneForDepth(depth);
  const zoneMultiplier = [1, 1.85, 3.6][zone.id] ?? 1;
  return Math.round((10 + depth * 2.35 + Math.pow(depth, 1.2) * 0.36) * zoneMultiplier);
}

export function rockNameFor(state: GameState): string {
  const zone = zoneForDepth(state.depth);
  return zone.rockNames[state.rockRevision % zone.rockNames.length];
}

export function createInitialState(): GameState {
  const rockMaxHp = rockMaxHpFor(1);
  return {
    version: 2,
    shards: 0,
    coins: 0,
    depth: 1,
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
  const merged: GameState = {
    ...base,
    ...candidate,
    version: 2,
    toolTier,
    inventory: { ...base.inventory, ...(candidate.inventory ?? {}) },
    upgrades: { ...base.upgrades, ...(candidate.upgrades ?? {}) },
    machines: { ...base.machines, ...(candidate.machines ?? {}) },
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
  const shards = Math.floor(work / 14);
  const ore = Math.floor(work / 26);
  return {
    ...state,
    shards: state.shards + shards,
    totalMined: state.totalMined + ore,
    inventory: { ...state.inventory, stone: state.inventory.stone + ore },
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
  const clickDamage = Math.max(1, Math.round(tool.damage * (1 + state.upgrades.power * 0.45)));
  const maxDurability = tool.durability + state.upgrades.sturdy * 25;
  const critChance = Math.min(0.52, 0.06 + state.upgrades.precision * 0.03 + (state.depth >= 60 ? 0.04 : 0));
  const critMultiplier = 2 + Math.floor(state.upgrades.precision / 5) * 0.25;
  const autoDamage = state.machines.drill * 2 * (1 + state.toolTier * 0.22);
  const yieldMultiplier = 1 + state.machines.cart * 0.12 + state.upgrades.geology * 0.08;
  const saleMultiplier = 1 + state.machines.smelter * 0.18 + (state.depth >= 25 ? 0.05 : 0);
  const missing = Math.max(0, maxDurability - state.durability);
  const discount = Math.max(0.28, 1 - state.upgrades.maintenance * 0.09);
  const repairCost = Math.max(2, Math.ceil((missing * 0.1 + state.toolTier * 3) * discount));
  const durabilityLoss = Math.max(1, 2 - Math.floor(state.upgrades.maintenance / 5));
  const inventoryValue = Math.round(
    ORE_ORDER.reduce((sum, id) => sum + state.inventory[id] * ORES[id].value, 0) * saleMultiplier,
  );
  return { clickDamage, maxDurability, critChance, critMultiplier, autoDamage, yieldMultiplier, saleMultiplier, repairCost, durabilityLoss, inventoryValue };
}

export function upgradeCost(definition: UpgradeDefinition, level: number): number {
  return Math.ceil(definition.baseCost * Math.pow(definition.scale, level));
}

export function machineCost(definition: MachineDefinition, level: number): number {
  return Math.ceil(definition.baseCost * Math.pow(definition.scale, level));
}

export function machineCount(state: GameState): number {
  return Object.values(state.machines).reduce((sum, value) => sum + value, 0);
}

export function inventoryCount(state: GameState): number {
  return ORE_ORDER.reduce((sum, id) => sum + state.inventory[id], 0);
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

function randomEvent(): MineEvent {
  const events: MineEvent[] = [
    { kind: "song", title: "La veine chantante", description: "Une vibration régulière traverse le filon, presque comme une mélodie." },
    { kind: "cache", title: "La caisse oubliée", description: "Une vieille caisse de prospecteur apparaît derrière la roche fendue." },
    { kind: "fracture", title: "La faille fragile", description: "Le mur pourrait céder. Il cache quelque chose, mais il faudra choisir comment l'ouvrir." },
  ];
  return events[Math.floor(Math.random() * events.length)];
}

function breakRock(state: GameState, automatic = false): GameState {
  const oldZone = zoneForDepth(state.depth);
  const stats = getDerivedStats(state);
  const inventory = { ...state.inventory };
  const rolls = Math.max(2, Math.floor((2 + state.depth / 18) * stats.yieldMultiplier));
  let mined = 0;

  for (let index = 0; index < rolls; index += 1) {
    const ore = rollOre(oldZone, state.upgrades.geology);
    const amount = 1 + (Math.random() < stats.yieldMultiplier - Math.floor(stats.yieldMultiplier) ? 1 : 0);
    inventory[ore] += amount;
    mined += amount;
  }

  const nextDepth = state.depth + 1;
  const nextZone = zoneForDepth(nextDepth);
  const rockMaxHp = rockMaxHpFor(nextDepth);
  const bonusShards = Math.max(2, Math.round(Math.sqrt(state.depth) * (automatic ? 0.7 : 1.1)));
  let next: GameState = {
    ...state,
    shards: state.shards + bonusShards,
    depth: nextDepth,
    rocksBroken: state.rocksBroken + 1,
    totalMined: state.totalMined + mined,
    inventory,
    rockHp: rockMaxHp,
    rockMaxHp,
    rockRevision: state.rockRevision + 1,
    message: `${mined} minerais libérés · le prochain filon est plus profond.`,
  };

  if (nextZone.id !== oldZone.id) {
    next = addJournal(next, `${nextZone.name} découverte. La mine vient de changer de visage.`, "rare");
    next.message = `${nextZone.name.toUpperCase()} · nouveau secteur découvert.`;
  } else if (next.rocksBroken === 1) {
    next = addJournal(next, "Premier filon brisé. La montagne a répondu.", "good");
  } else if (next.rocksBroken % 10 === 0) {
    next = addJournal(next, `${next.rocksBroken} filons brisés. Les galeries prennent forme.`, "good");
  }

  if (!next.activeEvent && next.rocksBroken > 2 && Math.random() < 0.11) {
    next.activeEvent = randomEvent();
  }

  return next;
}

function applyResonance(state: GameState): GameState {
  if (state.resonance < 100) return state;
  const zone = zoneForDepth(state.depth);
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
    resonance: state.resonance + (crit ? 10 : 6),
    impact: { id: state.impact.id + 1, damage, crit, shards: shardGain },
    message: crit ? "IMPACT PARFAIT · la pierre se fend net." : "La roche cède, morceau après morceau.",
  };

  next = applyResonance(next);
  if (next.rockHp <= 0) next = breakRock(next);
  return next;
}

function tick(state: GameState, seconds: number): GameState {
  const stats = getDerivedStats(state);
  if (stats.autoDamage <= 0 || state.activeEvent) return state;

  let next = { ...state, rockHp: state.rockHp - stats.autoDamage * seconds };
  let guard = 0;
  while (next.rockHp <= 0 && guard < 12) {
    const overflow = Math.abs(next.rockHp);
    next = breakRock(next, true);
    next.rockHp -= overflow;
    guard += 1;
  }
  const passiveShards = Math.floor((stats.autoDamage * seconds) / 9);
  if (passiveShards > 0) next.shards += passiveShards;
  return next;
}

function resolveEvent(state: GameState, choice: EventChoice): GameState {
  if (!state.activeEvent) return state;
  const event = state.activeEvent;
  const zone = zoneForDepth(state.depth);
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
      if (value <= 0) return { ...state, message: "Le chariot est vide." };
      return {
        ...state,
        coins: state.coins + value,
        inventory: emptyInventory(),
        message: `Vente terminée · ${formatNumber(value)} pièces ajoutées à l'atelier.`,
      };
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
      if (!definition || state.depth < definition.unlockDepth) return state;
      const level = state.machines[action.id];
      const cost = machineCost(definition, level);
      if (state.coins < cost) return { ...state, message: "L'atelier n'a pas encore les moyens." };
      return addJournal(
        {
          ...state,
          coins: state.coins - cost,
          machines: { ...state.machines, [action.id]: level + 1 },
          message: `${definition.name} installée. La mine travaille un peu plus seule.`,
        },
        `${definition.name} rejoint l'atelier.`,
        "good",
      );
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
        durability: nextTool.durability + state.upgrades.sturdy * 25,
        message: `${nextTool.name.toUpperCase()} · une nouvelle époque commence.`,
      };
      return addJournal(next, `${nextTool.name} forgée. ${nextTool.epithet}`, "rare");
    }
    case "CLAIM_GOAL": {
      const goal = GOALS.find((candidate) => candidate.id === action.id);
      if (!goal || state.claimedGoals.includes(goal.id) || goal.progress(state) < goal.target) return state;
      return {
        ...state,
        shards: state.shards + (goal.reward.shards ?? 0),
        coins: state.coins + (goal.reward.coins ?? 0),
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
