import {
  Bot,
  Cat,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ClipboardList,
  Compass,
  Copy,
  Crosshair,
  Database,
  Factory,
  Flame,
  FlaskConical,
  Gauge,
  Gem,
  Hammer,
  HardHat,
  Handshake,
  History,
  Lock,
  ListChecks,
  Map,
  Microscope,
  Minus,
  Package,
  Pickaxe,
  Radio,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Truck,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  GOALS,
  CONTRACT_UNLOCK_DEPTH,
  LEGACIES,
  MACHINES,
  MAX_ORE_STUDY_LEVEL,
  MARKET_UNLOCK_DEPTH,
  ORES,
  ORE_ORDER,
  RESEARCH,
  RESEARCH_UNLOCK_DEPTH,
  TOOLS,
  UPGRADES,
  ZONES,
  activeZoneForState,
  canStartExpedition,
  canForgeNext,
  contractRequirementsMet,
  decodeSave,
  encodeSave,
  formatDuration,
  formatNumber,
  gameReducer,
  getDerivedStats,
  inventoryCount,
  loadGame,
  legacyCost,
  machineCost,
  marketQuoteAt,
  oreStudyCost,
  oreStudyReward,
  oreStudyUnlockDepth,
  oreStudyUnlocked,
  expeditionReward,
  expeditionTarget,
  rockNameFor,
  reputationRank,
  researchCost,
  researchLevelCount,
  saveGame,
  selectedInventoryValue,
  upgradeCost,
  veinsPerMeterFor,
  zoneForDepth,
  type GameState,
  type LegacyId,
  type MachineId,
  type OreId,
  type ResearchId,
  type UpgradeId,
} from "./game";

type PanelTab = "upgrades" | "machines" | "forge" | "contracts" | "research" | "goals" | "expedition";

interface HitEffect {
  id: number;
  x: number;
  y: number;
  damage: number;
  crit: boolean;
  shards: number;
}

interface GameNotice {
  id: string;
  kind: "unlock" | "goal" | "contract" | "research";
  name: string;
  detail: string;
  machineId?: MachineId;
}

const upgradeIcons: Record<UpgradeId, LucideIcon> = {
  power: Pickaxe,
  sturdy: Shield,
  precision: Crosshair,
  geology: Gem,
  maintenance: Wrench,
};

const machineIcons: Record<MachineId, LucideIcon> = {
  drill: Bot,
  cart: Truck,
  smelter: Flame,
  resonator: Radio,
  excavator: Factory,
};

const legacyIcons: Record<LegacyId, LucideIcon> = {
  force: Pickaxe,
  industry: Bot,
  fortune: Gem,
  endurance: Shield,
};

const researchIcons: Record<ResearchId, LucideIcon> = {
  impact: Crosshair,
  automation: Bot,
  extraction: Gem,
  metallurgy: Shield,
  resonance: Radio,
  commerce: CircleDollarSign,
};

const tabDefinitions: Array<{ id: PanelTab; label: string; icon: LucideIcon }> = [
  { id: "upgrades", label: "Améliorer", icon: Zap },
  { id: "machines", label: "Machines", icon: Bot },
  { id: "forge", label: "Forge", icon: Hammer },
  { id: "contracts", label: "Contrats", icon: ClipboardList },
  { id: "research", label: "Labo", icon: FlaskConical },
  { id: "goals", label: "Objectifs", icon: Trophy },
  { id: "expedition", label: "Cycles", icon: Compass },
];

const zoneShortNames = ["Azur", "Faille", "Noyau", "Quartz", "Verre", "Aube"];

function NoticeStack({
  notices,
  onOpen,
  onDismiss,
}: {
  notices: GameNotice[];
  onOpen: (notice: GameNotice) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="notice-stack" aria-live="polite" aria-label="Nouveautés de la mine">
      {notices.slice(0, 2).map((notice) => {
        const Icon = notice.kind === "contract" ? Handshake : notice.kind === "research" ? FlaskConical : notice.machineId ? machineIcons[notice.machineId] : Trophy;
        const eyebrow = notice.kind === "unlock" ? "NOUVEAU PLAN DÉBLOQUÉ" : notice.kind === "contract" ? "NOUVEAU RÉSEAU" : notice.kind === "research" ? "NOUVELLE AILE" : "OBJECTIF ATTEINT";
        const actionLabel = notice.kind === "unlock" ? "ATELIER" : notice.kind === "contract" ? "CONTRATS" : notice.kind === "research" ? "LABO" : "OBJECTIFS";
        return (
          <article className={`game-notice game-notice--${notice.kind}`} key={notice.id}>
            <span className="game-notice__icon"><Icon aria-hidden="true" /></span>
            <div className="game-notice__copy">
              <small>{eyebrow}</small>
              <strong>{notice.name}</strong>
              <p>{notice.detail}</p>
            </div>
            <button className="game-notice__action" type="button" onClick={() => onOpen(notice)}>
              {actionLabel}<ChevronRight aria-hidden="true" />
            </button>
            <button className="game-notice__close" type="button" aria-label={`Fermer la notification ${notice.name}`} onClick={() => onDismiss(notice.id)}>
              <X aria-hidden="true" />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function ProgressBar({ value, label, tone = "cyan" }: { value: number; label: string; tone?: "cyan" | "amber" | "red" }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`progress progress--${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeValue)}
    >
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className={`icon-button${active ? " is-active" : ""}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TopBar({ state, onSound, onSettings }: { state: GameState; onSound: () => void; onSettings: () => void }) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-lockup__eyebrow">PROTOCOLE D'EXTRACTION</span>
        <h1>LA MINE DES <em>ÉCLATS</em></h1>
      </div>

      <div className="resource-strip" aria-label="Ressources principales">
        <div className="resource-pill resource-pill--shards">
          <Sparkles aria-hidden="true" />
          <span>ÉCLATS</span>
          <strong>{formatNumber(state.shards)}</strong>
        </div>
        <div className="resource-pill resource-pill--coins">
          <CircleDollarSign aria-hidden="true" />
          <span>PIÈCES</span>
          <strong>{formatNumber(state.coins)}</strong>
        </div>
        <div className="resource-pill resource-pill--depth">
          <Gauge aria-hidden="true" />
          <span>PROFONDEUR</span>
          <strong>{formatNumber(state.depth)} m</strong>
        </div>
        {(state.echoes > 0 || state.maxDepth >= 120) && (
          <div className="resource-pill resource-pill--echoes">
            <RefreshCw aria-hidden="true" />
            <span>ÉCHOS</span>
            <strong>{formatNumber(state.echoes)}</strong>
          </div>
        )}
        <IconButton label={state.soundOn ? "Couper le son" : "Activer le son"} onClick={onSound} active={state.soundOn}>
          {state.soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        </IconButton>
        <IconButton label="Sauvegarde et réglages" onClick={onSettings}>
          <Settings aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}

function InventoryPanel({
  state,
  onSellAll,
  onSellSelected,
}: {
  state: GameState;
  onSellAll: () => void;
  onSellSelected: (ids: OreId[], rates: Partial<Record<OreId, number>>) => void;
}) {
  const stats = getDerivedStats(state);
  const zone = zoneForDepth(state.maxDepth);
  const unlockedOreIndex = Math.min(ORE_ORDER.length - 1, 4 + zone.id);
  const unlockedOreIds = ORE_ORDER.slice(0, unlockedOreIndex + 1);
  const marketUnlocked = state.maxDepth >= MARKET_UNLOCK_DEPTH;
  const showSaleTutorial = state.salesCompleted === 0 && inventoryCount(state) > 0;
  const [selectedOres, setSelectedOres] = useState<Set<OreId>>(() => new Set(ORE_ORDER));
  const [marketNow, setMarketNow] = useState(() => Date.now());
  const marketQuote = useMemo(() => marketQuoteAt(marketNow), [marketNow]);
  const selectedIds = unlockedOreIds.filter((id) => selectedOres.has(id));
  const selectedUnits = selectedIds.reduce((sum, id) => sum + state.inventory[id], 0);
  const baseSelectedValue = selectedInventoryValue(state, selectedIds);
  const selectedValue = marketUnlocked
    ? selectedInventoryValue(state, selectedIds, marketQuote.rates)
    : stats.inventoryValue;
  const marketPremium = baseSelectedValue > 0 ? selectedValue / baseSelectedValue - 1 : 0;
  const marketSignal = baseSelectedValue <= 0
    ? (inventoryCount(state) > 0 ? "SÉLECTION VIDE" : "CHARGEMENT VIDE")
    : marketPremium >= 0.12
      ? "BON MOMENT"
      : marketPremium <= -0.1
        ? "COURS BAS"
        : "MARCHÉ CALME";
  const marketTone = marketPremium >= 0.12 ? "hot" : marketPremium <= -0.1 ? "low" : "steady";
  const secondsRemaining = Math.max(1, Math.ceil((marketQuote.endsAt - marketNow) / 1_000));

  useEffect(() => {
    if (!marketUnlocked) return undefined;
    setMarketNow(Date.now());
    const timer = window.setInterval(() => setMarketNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [marketUnlocked]);

  const toggleOre = (id: OreId) => {
    setSelectedOres((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const crew = [
    { name: "Mica", role: "Repérage", unlocked: true },
    { name: "Braise", role: "Forge", unlocked: state.maxDepth >= 25 },
    { name: "Nova", role: "Noyau", unlocked: state.maxDepth >= 60 },
    { name: "Opale", role: "Mémoire", unlocked: state.maxDepth >= 120 },
    { name: "Silex", role: "Verrier", unlocked: state.maxDepth >= 220 },
    { name: "Aurore", role: "Balise", unlocked: state.maxDepth >= 360 },
  ];

  return (
    <aside className="inventory-panel">
      <div className="panel-heading">
        <div>
          <span>CHARGEMENT</span>
          <h2>Minerais</h2>
        </div>
        <strong>{formatNumber(inventoryCount(state))}</strong>
      </div>

      {marketUnlocked && (
        <div className="market-console">
          <div className="market-console__status">
            <span>
              <small>BOURSE DES FILONS</small>
              <strong className={`market-signal market-signal--${marketTone}`}>{marketSignal}</strong>
            </span>
            <span className="market-clock"><Clock3 aria-hidden="true" />{secondsRemaining}s</span>
          </div>
          <div className="market-controls" aria-label="Sélection rapide des minerais">
            <button type="button" onClick={() => setSelectedOres(new Set(unlockedOreIds))} title="Tout sélectionner">
              <ListChecks aria-hidden="true" /> Tout
            </button>
            <button
              type="button"
              onClick={() => setSelectedOres(new Set(unlockedOreIds.filter((id) => marketQuote.rates[id] >= 1.08)))}
              title="Sélectionner les cours favorables"
            >
              <TrendingUp aria-hidden="true" /> En hausse
            </button>
            <button type="button" onClick={() => setSelectedOres(new Set())} title="Tout désélectionner">
              <X aria-hidden="true" /> Rien
            </button>
          </div>
        </div>
      )}

      <div className="ore-list">
        {ORE_ORDER.map((id, index) => {
          const ore = ORES[id];
          const unlocked = index <= unlockedOreIndex;
          const selected = selectedOres.has(id);
          const rate = marketQuote.rates[id];
          const rateDelta = Math.round((rate - 1) * 100);
          const trend = marketQuote.trends[id];
          const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
          const marketClass = rate >= 1.08 ? "is-up" : rate <= 0.92 ? "is-down" : "is-flat";
          const unitValue = Math.round(ore.value * stats.saleMultiplier * (marketUnlocked ? rate : 1));
          const contents = (
            <>
              {marketUnlocked && unlocked && <span className="ore-selector">{selected && <Check aria-hidden="true" />}</span>}
              <span className="ore-swatch" style={{ "--ore-color": ore.color, "--ore-glow": ore.glow } as CSSProperties} />
              <span className="ore-row__name">{unlocked ? ore.shortName : "Inconnu"}</span>
              <strong>{unlocked ? formatNumber(state.inventory[id]) : "?"}</strong>
              <span className="ore-row__price">
                <small>{unlocked ? `${formatNumber(unitValue)} p` : "—"}</small>
                {marketUnlocked && unlocked && (
                  <em className={marketClass}>
                    {rateDelta > 0 ? "+" : ""}{rateDelta}% <TrendIcon aria-hidden="true" />
                  </em>
                )}
              </span>
            </>
          );

          return marketUnlocked ? (
            <button
              className={`ore-row is-market${unlocked ? "" : " is-locked"}${selected && unlocked ? " is-selected" : ""}`}
              type="button"
              key={id}
              disabled={!unlocked}
              aria-pressed={selected && unlocked}
              aria-label={`${selected ? "Retirer" : "Inclure"} ${ore.shortName} de la vente, cours ${rateDelta >= 0 ? "+" : ""}${rateDelta} %`}
              onClick={() => toggleOre(id)}
            >
              {contents}
            </button>
          ) : (
            <div className={`ore-row${unlocked ? "" : " is-locked"}`} key={id}>{contents}</div>
          );
        })}
      </div>

      {showSaleTutorial && (
        <div className="sale-tutorial" role="status">
          <div className="sale-tutorial__heading">
            <CircleDollarSign aria-hidden="true" />
            <span><small>PREMIÈRE VENTE</small><strong>Le minerai finance l’atelier</strong></span>
          </div>
          <div className="sale-tutorial__flow" aria-label="Minerais, vente, pièces, machines">
            <span><Package aria-hidden="true" /> Minerais</span>
            <ChevronRight aria-hidden="true" />
            <span><ShoppingCart aria-hidden="true" /> Vente</span>
            <ChevronRight aria-hidden="true" />
            <span><Bot aria-hidden="true" /> Machines</span>
          </div>
          <p>Vends le chargement pour obtenir les pièces nécessaires aux machines et aux nouvelles pioches.</p>
          <small>{marketUnlocked ? "Coche seulement ce que tu veux céder : les meilleurs cours méritent parfois quelques secondes d’attente." : "La vente sélective et les cours variables se débloquent à 25 mètres."}</small>
        </div>
      )}

      <button
        className={`sell-button${showSaleTutorial ? " is-tutorial" : ""}${marketUnlocked && marketTone === "hot" ? " is-market-hot" : ""}`}
        type="button"
        onClick={() => marketUnlocked ? onSellSelected(selectedIds, marketQuote.rates) : onSellAll()}
        disabled={selectedValue <= 0}
      >
        <ShoppingCart aria-hidden="true" />
        <span>
          <strong>{marketUnlocked ? "VENDRE LA SÉLECTION" : "VENDRE LE CHARGEMENT"}</strong>
          <small>{formatNumber(selectedValue)} pièces{marketUnlocked ? ` · ${formatNumber(selectedUnits)} unités` : ""}</small>
        </span>
      </button>

      <div className="crew-block">
        <div className="subheading">
          <span>ÉQUIPE DE NUIT</span>
          <Cat aria-hidden="true" />
        </div>
        <div className="crew-list">
          {crew.map((member) => (
            <div className={`crew-member${member.unlocked ? " is-active" : ""}`} key={member.name}>
              <Cat aria-hidden="true" />
              <span>
                <strong>{member.unlocked ? member.name : "???"}</strong>
                <small>{member.unlocked ? member.role : "Plus profond"}</small>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="journal-block">
        <div className="subheading"><span>JOURNAL DE MINE</span></div>
        {state.journal.slice(0, 3).map((entry) => (
          <p className={`journal-entry journal-entry--${entry.tone}`} key={entry.id}>{entry.text}</p>
        ))}
      </div>
    </aside>
  );
}

function MineStage({
  state,
  effects,
  automationPulse,
  onStrike,
  onRepair,
  onSelectZone,
}: {
  state: GameState;
  effects: HitEffect[];
  automationPulse: number;
  onStrike: (event: MouseEvent<HTMLButtonElement>) => void;
  onRepair: () => void;
  onSelectZone: (id: number) => void;
}) {
  const stats = getDerivedStats(state);
  const zone = activeZoneForState(state);
  const deepestZone = zoneForDepth(state.depth);
  const isRevisiting = zone.id !== deepestZone.id;
  const cycleTarget = expeditionTarget(state.expeditions);
  const veinsNeeded = veinsPerMeterFor(state.depth);
  const atCycleCap = !isRevisiting && state.depth >= cycleTarget;
  const strataLabel = isRevisiting
    ? "PROSPECTION"
    : atCycleCap
      ? "BALISE SATURÉE"
      : `STRATE ${Math.min(state.strataProgress + 1, veinsNeeded)}/${veinsNeeded}`;
  const tool = TOOLS[state.toolTier];
  const rockHealth = (state.rockHp / state.rockMaxHp) * 100;
  const durability = (state.durability / stats.maxDurability) * 100;
  const canRepair = state.durability < stats.maxDurability && (state.shards >= stats.repairCost || state.durability <= 0);
  const backgroundUrl = `${import.meta.env.BASE_URL}${zone.image}`;
  const visibleMoles = Math.min(3, Math.max(1, Math.ceil(state.machines.drill / 8)));

  return (
    <section
      className={`mine-stage mine-stage--zone-${zone.id}`}
      style={{ "--zone-accent": zone.accent } as CSSProperties}
      onContextMenu={(event) => event.preventDefault()}
    >
      <img className="mine-stage__backdrop" src={backgroundUrl} alt="" aria-hidden="true" draggable={false} key={zone.id} />
      <div className="mine-stage__shade" aria-hidden="true" />
      <div className="zone-title">
        <span>{zone.sector}</span>
        <strong>{zone.name}</strong>
        <small>{zone.description}</small>
      </div>

      <div className="zone-switcher" aria-label="Choisir une galerie">
        <div className="zone-switcher__status">
          <Map aria-hidden="true" />
          <span>
            <strong>{isRevisiting ? "PROSPECTION" : "DESCENTE"}</strong>
            <small>{isRevisiting ? `${state.depth} m conservés` : `cycle ${state.expeditions + 1} · ${cycleTarget} m`}</small>
          </span>
        </div>
        <div className="zone-switcher__options" role="group" aria-label="Galeries découvertes">
          {ZONES.map((candidate) => {
            const unlocked = state.depth >= candidate.minDepth;
            const active = candidate.id === zone.id;
            return (
              <button
                className={active ? "is-active" : ""}
                type="button"
                key={candidate.id}
                aria-label={unlocked ? `Aller dans ${candidate.name}` : `${candidate.name}, disponible à ${candidate.minDepth} mètres`}
                aria-pressed={active}
                title={unlocked ? candidate.name : `Débloqué à ${candidate.minDepth} m`}
                disabled={!unlocked || Boolean(state.activeEvent)}
                onClick={() => onSelectZone(candidate.id)}
              >
                <span>{String(candidate.id + 1).padStart(2, "0")}</span>
                <strong>{zoneShortNames[candidate.id]}</strong>
                {!unlocked ? <Lock aria-hidden="true" /> : active ? <Check aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rock-status">
        <div>
          <span>FILON {String(state.rocksBroken + 1).padStart(3, "0")} · {strataLabel}</span>
          <strong>{rockNameFor(state)}</strong>
        </div>
        <b>{formatNumber(Math.max(0, state.rockHp))} / {formatNumber(state.rockMaxHp)}</b>
        <ProgressBar value={rockHealth} label="Solidité du filon" tone={zone.id === 1 ? "amber" : "cyan"} />
      </div>

      <button
        className={`rock-target${state.durability <= 0 ? " is-broken" : ""}`}
        type="button"
        aria-label={state.durability <= 0 ? "La pioche est brisée" : `Frapper ${rockNameFor(state)}`}
        onClick={onStrike}
        disabled={state.durability <= 0 || Boolean(state.activeEvent)}
      >
        <span className="target-reticle" aria-hidden="true"><Target /></span>
        <span className="strike-label">{state.durability <= 0 ? "PIOCHE BRISÉE" : "FRAPPER"}</span>
      </button>

      <div className="impact-layer" aria-hidden="true">
        {effects.map((effect) => (
          <span
            className={`impact-number${effect.crit ? " is-crit" : ""}`}
            key={effect.id}
            style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
          >
            {effect.crit ? "CRIT " : ""}-{formatNumber(effect.damage)}
            <small>+{formatNumber(effect.shards)} éclat{effect.shards > 1 ? "s" : ""}</small>
          </span>
        ))}
      </div>

      <p className="mine-message" aria-live="polite">{state.message}</p>

      <div className="tool-dock">
        <div className="tool-dock__identity">
          <span className="tool-icon"><Pickaxe aria-hidden="true" /></span>
          <span>
            <small>OUTIL ACTIF · NIVEAU {state.toolTier + 1}</small>
            <strong>{tool.name}</strong>
          </span>
        </div>
        <div className="tool-meter">
          <div className="meter-label">
            <span>DURABILITÉ</span>
            <strong>{formatNumber(state.durability)} / {formatNumber(stats.maxDurability)}</strong>
          </div>
          <ProgressBar value={durability} label="Durabilité de la pioche" tone={durability < 25 ? "red" : "amber"} />
          <small>{formatNumber(stats.clickDamage)} dégâts · {Math.round(stats.critChance * 100)} % critique</small>
        </div>
        <div className="tool-meter tool-meter--resonance">
          <div className="meter-label">
            <span>RÉSONANCE</span>
            <strong>{Math.round(state.resonance)} %</strong>
          </div>
          <ProgressBar value={state.resonance} label="Résonance du filon" />
          <small>À 100 %, le filon révèle un secret.</small>
        </div>
        <button className="repair-button" type="button" onClick={onRepair} disabled={!canRepair}>
          <Wrench aria-hidden="true" />
          <span>
            <strong>{state.durability <= 0 && state.shards < stats.repairCost ? "SECOURS" : "RÉPARER"}</strong>
            <small>{state.durability <= 0 && state.shards < stats.repairCost ? "gratuit" : `${formatNumber(stats.repairCost)} éclats`}</small>
          </span>
        </button>
      </div>

      {state.machines.drill > 0 && (
        <div className="mole-rig" aria-label={`${state.machines.drill} taupes mécaniques en activité`}>
          <div className="mole-rig__swarm" key={automationPulse} aria-hidden="true">
            {Array.from({ length: visibleMoles }, (_, index) => (
              <span className="mole-unit" style={{ "--mole-index": index } as CSSProperties} key={index}>
                <Bot className="mole-unit__body" />
                <Pickaxe className="mole-unit__pick" />
                <i />
              </span>
            ))}
          </div>
          <span className="mole-rig__readout"><strong>TAUPES ×{state.machines.drill}</strong><small>TIC AUTOMATIQUE</small></span>
        </div>
      )}

      {stats.autoDamage > 0 && (
        <div className="automation-badge">
          <Bot aria-hidden="true" />
          <span><strong>{formatNumber(stats.autoDamage)}</strong> dégâts/s</span>
        </div>
      )}
    </section>
  );
}

function UpgradeList({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  return (
    <div className="purchase-list">
      {UPGRADES.map((upgrade) => {
        const level = state.upgrades[upgrade.id];
        const cost = upgradeCost(upgrade, level);
        const available = upgrade.currency === "shards" ? state.shards : state.coins;
        const Icon = upgradeIcons[upgrade.id];
        const maxed = level >= upgrade.max;
        return (
          <div className="purchase-row" key={upgrade.id}>
            <span className="purchase-row__icon"><Icon aria-hidden="true" /></span>
            <span className="purchase-row__copy">
              <strong>{upgrade.name}<b>Niv. {level}</b></strong>
              <small>{maxed ? "Amélioration maximale" : upgrade.description}</small>
            </span>
            <button
              type="button"
              disabled={maxed || available < cost}
              onClick={() => dispatch({ type: "BUY_UPGRADE", id: upgrade.id })}
            >
              {maxed ? <Check aria-hidden="true" /> : formatNumber(cost)}
              {!maxed && <small>{upgrade.currency === "shards" ? "éclats" : "pièces"}</small>}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MachineList({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  const stats = getDerivedStats(state);
  return (
    <div className="purchase-list">
      <div className="production-summary">
        <span><Bot /> Extraction automatique</span>
        <strong>{formatNumber(stats.autoDamage)} dégâts/s</strong>
      </div>
      {MACHINES.map((machine) => {
        const level = state.machines[machine.id];
        const cost = machineCost(machine, level);
        const unlocked = state.maxDepth >= machine.unlockDepth;
        const maxed = level >= machine.max;
        const Icon = machineIcons[machine.id];
        return (
          <div className={`purchase-row${unlocked ? "" : " is-locked"}`} key={machine.id}>
            <span className="purchase-row__icon"><Icon aria-hidden="true" /></span>
            <span className="purchase-row__copy">
              <strong>{machine.name}<b>{unlocked ? `x${level} / ${machine.max}` : <Lock size={12} />}</b></strong>
              <small>{maxed ? "Installation maximale" : unlocked ? machine.description : `Disponible à ${machine.unlockDepth} m`}</small>
            </span>
            <button
              type="button"
              disabled={!unlocked || maxed || state.coins < cost}
              onClick={() => dispatch({ type: "BUY_MACHINE", id: machine.id })}
            >
              {maxed ? <Check aria-hidden="true" /> : formatNumber(cost)}{!maxed && <small>pièces</small>}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ForgePanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  const current = TOOLS[state.toolTier];
  const next = TOOLS[state.toolTier + 1];
  return (
    <div className="forge-panel">
      <div className="current-tool">
        <span><Pickaxe aria-hidden="true" /></span>
        <div>
          <small>ACTUELLEMENT ÉQUIPÉE</small>
          <h3>{current.name}</h3>
          <p>{current.epithet}</p>
        </div>
        <strong>{current.damage}<small>dégâts</small></strong>
      </div>

      {next ? (
        <div className="forge-blueprint">
          <div className="blueprint-heading">
            <span><Hammer aria-hidden="true" /></span>
            <div>
              <small>PROCHAIN PLAN</small>
              <h3>{next.name}</h3>
            </div>
          </div>
          <p>{next.epithet}</p>
          <div className="forge-comparison">
            <span>Puissance <strong>{current.damage} → {next.damage}</strong></span>
            <span>Durabilité <strong>{current.durability} → {next.durability}</strong></span>
          </div>
          <div className="material-list">
            <div className={state.coins >= next.coinCost ? "is-ready" : ""}>
              <CircleDollarSign />
              <span>Pièces</span>
              <strong>{formatNumber(state.coins)} / {formatNumber(next.coinCost)}</strong>
            </div>
            {Object.entries(next.oreCost).map(([id, amount]) => {
              const ore = ORES[id as OreId];
              const ready = state.inventory[id as OreId] >= (amount ?? 0);
              return (
                <div className={ready ? "is-ready" : ""} key={id}>
                  <span className="ore-swatch" style={{ "--ore-color": ore.color } as CSSProperties} />
                  <span>{ore.shortName}</span>
                  <strong>{formatNumber(state.inventory[id as OreId])} / {formatNumber(amount ?? 0)}</strong>
                </div>
              );
            })}
          </div>
          <button className="forge-action" type="button" disabled={!canForgeNext(state)} onClick={() => dispatch({ type: "FORGE_NEXT" })}>
            <Hammer aria-hidden="true" /> FORGER {next.name.toUpperCase()}
          </button>
        </div>
      ) : (
        <div className="forge-complete">
          <Sparkles aria-hidden="true" />
          <h3>L'outil impossible</h3>
          <p>La forge n'a plus rien à enseigner. Pour le moment.</p>
        </div>
      )}
    </div>
  );
}

function ResearchPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  if (state.maxDepth < RESEARCH_UNLOCK_DEPTH) {
    return (
      <div className="research-lock">
        <FlaskConical aria-hidden="true" />
        <small>LABORATOIRE HORS LIGNE</small>
        <h3>Les instruments exigent une pression plus profonde.</h3>
        <ProgressBar value={(state.maxDepth / RESEARCH_UNLOCK_DEPTH) * 100} label="Déblocage du laboratoire" />
        <strong>{formatNumber(state.maxDepth)} / {RESEARCH_UNLOCK_DEPTH} m</strong>
      </div>
    );
  }

  const completedStudies = Object.values(state.oreStudies).reduce((sum, level) => sum + level, 0);
  const protocolLevels = researchLevelCount(state);
  const totalProtocolLevels = RESEARCH.reduce((sum, definition) => sum + definition.max, 0);

  return (
    <div className="research-panel">
      <section className="research-console">
        <span><FlaskConical aria-hidden="true" /></span>
        <div>
          <small>DONNÉES DISPONIBLES</small>
          <h3>{formatNumber(state.researchPoints)}</h3>
        </div>
        <strong>{completedStudies}<small>/ {ORE_ORDER.length * MAX_ORE_STUDY_LEVEL} analyses</small></strong>
        <ProgressBar value={(completedStudies / (ORE_ORDER.length * MAX_ORE_STUDY_LEVEL)) * 100} label="Progression du codex minéral" />
      </section>

      <div className="research-heading">
        <span>CODEX MINÉRAL</span>
        <small>Les échantillons sont consommés</small>
      </div>
      <div className="ore-study-list">
        {ORE_ORDER.map((id) => {
          const unlocked = oreStudyUnlocked(state, id);
          const level = state.oreStudies[id];
          const maxed = level >= MAX_ORE_STUDY_LEVEL;
          const sampleCost = oreStudyCost(id, level);
          const reward = oreStudyReward(id, level);
          const ready = unlocked && !maxed && state.inventory[id] >= sampleCost;
          return (
            <article className={`ore-study-row${unlocked ? "" : " is-locked"}${maxed ? " is-complete" : ""}`} style={{ "--ore-color": ORES[id].color } as CSSProperties} key={id}>
              <span className="ore-swatch" style={{ "--ore-color": ORES[id].color, "--ore-glow": ORES[id].glow } as CSSProperties} />
              <div className="ore-study-copy">
                <strong>{unlocked ? ORES[id].shortName : "Échantillon inconnu"}</strong>
                <span className="study-level" aria-label={`Niveau d'analyse ${level} sur ${MAX_ORE_STUDY_LEVEL}`}>
                  {Array.from({ length: MAX_ORE_STUDY_LEVEL }, (_, index) => <i className={index < level ? "is-active" : ""} key={index} />)}
                </span>
                <small>
                  {!unlocked
                    ? `Identification à ${oreStudyUnlockDepth(id)} m`
                    : maxed
                      ? "Signature entièrement documentée"
                      : `${formatNumber(state.inventory[id])} / ${formatNumber(sampleCost)} · +${reward} donnée${reward > 1 ? "s" : ""}`}
                </small>
              </div>
              <button type="button" disabled={!ready} onClick={() => dispatch({ type: "ANALYZE_ORE", id })}>
                {maxed ? <Check aria-hidden="true" /> : unlocked ? <Microscope aria-hidden="true" /> : <Lock aria-hidden="true" />}
                <span>{maxed ? "COMPLET" : "ANALYSER"}</span>
              </button>
            </article>
          );
        })}
      </div>

      <div className="research-heading research-heading--protocols">
        <span>PROTOCOLES · {protocolLevels}/{totalProtocolLevels}</span>
        <small>Conservés entre les cycles</small>
      </div>
      <div className="protocol-list">
        {RESEARCH.map((definition) => {
          const level = state.research[definition.id];
          const maxed = level >= definition.max;
          const cost = researchCost(definition, level);
          const Icon = researchIcons[definition.id];
          return (
            <div className={`protocol-row${maxed ? " is-complete" : ""}`} key={definition.id}>
              <span><Icon aria-hidden="true" /></span>
              <div>
                <strong>{definition.name}<b>Niv. {level}/{definition.max}</b></strong>
                <small>{maxed ? "Protocole maîtrisé" : definition.description}</small>
              </div>
              <button type="button" disabled={maxed || state.researchPoints < cost} onClick={() => dispatch({ type: "BUY_RESEARCH", id: definition.id })}>
                {maxed ? <Check aria-hidden="true" /> : <><Database aria-hidden="true" />{cost}</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalsPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  return (
    <div className="goal-list">
      {GOALS.map((goal) => {
        const progress = Math.min(goal.target, goal.progress(state));
        const complete = progress >= goal.target;
        const claimed = state.claimedGoals.includes(goal.id);
        const reward = [
          goal.reward.shards ? `${formatNumber(goal.reward.shards)} éclats` : "",
          goal.reward.coins ? `${formatNumber(goal.reward.coins)} pièces` : "",
          goal.reward.echoes ? `${formatNumber(goal.reward.echoes)} échos` : "",
          goal.reward.drill ? `${goal.reward.drill} taupe` : "",
          goal.reward.research ? `${goal.reward.research} données` : "",
        ].filter(Boolean).join(" · ");
        return (
          <div className={`goal-row${complete ? " is-complete" : ""}${claimed ? " is-claimed" : ""}`} key={goal.id}>
            <span className="goal-row__icon">{claimed ? <Check /> : <Trophy />}</span>
            <div className="goal-row__copy">
              <strong>{goal.name}</strong>
              <small>{goal.description}</small>
              <ProgressBar value={(progress / goal.target) * 100} label={`Progression de ${goal.name}`} />
              <span>{formatNumber(progress)} / {formatNumber(goal.target)} · {reward}</span>
            </div>
            <button
              type="button"
              disabled={!complete || claimed}
              onClick={() => dispatch({ type: "CLAIM_GOAL", id: goal.id })}
            >
              {claimed ? "PRIS" : "RÉCUPÉRER"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ContractPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  if (state.maxDepth < CONTRACT_UNLOCK_DEPTH) {
    return (
      <div className="contract-lock">
        <Handshake aria-hidden="true" />
        <small>LIGNE COMMERCIALE FERMÉE</small>
        <h3>La Compagnie écoute plus bas.</h3>
        <ProgressBar value={(state.maxDepth / CONTRACT_UNLOCK_DEPTH) * 100} label="Déblocage des contrats" />
        <strong>{formatNumber(state.maxDepth)} / {CONTRACT_UNLOCK_DEPTH} m</strong>
      </div>
    );
  }

  const now = Date.now();
  const rankSteps = [
    { value: 0, label: "Prospecteur indépendant" },
    { value: 8, label: "Fournisseur agréé" },
    { value: 20, label: "Négociant de faille" },
    { value: 45, label: "Intendant du noyau" },
    { value: 80, label: "Maison de confiance" },
  ];
  const currentRankIndex = [...rankSteps].reverse().findIndex((step) => state.reputation >= step.value);
  const normalizedRankIndex = currentRankIndex < 0 ? 0 : rankSteps.length - 1 - currentRankIndex;
  const currentRank = rankSteps[normalizedRankIndex];
  const nextRank = rankSteps[normalizedRankIndex + 1];
  const rankProgress = nextRank
    ? ((state.reputation - currentRank.value) / (nextRank.value - currentRank.value)) * 100
    : 100;

  return (
    <div className="contract-panel">
      <section className="company-summary">
        <span><Handshake aria-hidden="true" /></span>
        <div>
          <small>RÉPUTATION DE LA COMPAGNIE</small>
          <h3>{reputationRank(state.reputation)}</h3>
        </div>
        <strong><Star aria-hidden="true" />{formatNumber(state.reputation)}</strong>
        <ProgressBar value={rankProgress} label="Progression de réputation" tone="amber" />
        <small>{nextRank ? `${nextRank.label} à ${nextRank.value} points` : `${state.completedContracts} contrats honorés`}</small>
      </section>

      <div className="contract-list">
        {state.contractOffers.length === 0 && (
          <div className="contract-search"><RefreshCw aria-hidden="true" /><span>Recherche de convois en cours...</span></div>
        )}
        {state.contractOffers.map((offer) => {
          const remainingMs = Math.max(0, offer.expiresAt - now);
          const remainingSeconds = Math.ceil(remainingMs / 1_000);
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = String(remainingSeconds % 60).padStart(2, "0");
          const ready = contractRequirementsMet(state, offer);
          const requirements = Object.entries(offer.requirements) as Array<[OreId, number]>;
          const fulfillment = requirements.reduce(
            (sum, [id, amount]) => sum + Math.min(1, state.inventory[id] / amount),
            0,
          ) / Math.max(1, requirements.length) * 100;

          return (
            <article className={`contract-card${ready ? " is-ready" : ""}${remainingSeconds <= 60 ? " is-urgent" : ""}`} key={offer.id}>
              <header>
                <span><small>{offer.buyer}</small><strong>{offer.title}</strong></span>
                <b><Clock3 aria-hidden="true" />{minutes}:{seconds}</b>
              </header>
              <div className="contract-materials">
                {requirements.map(([id, amount]) => (
                  <div className={state.inventory[id] >= amount ? "is-ready" : ""} key={id}>
                    <span className="ore-swatch" style={{ "--ore-color": ORES[id].color, "--ore-glow": ORES[id].glow } as CSSProperties} />
                    <span>{ORES[id].shortName}</span>
                    <strong>{formatNumber(state.inventory[id])} / {formatNumber(amount)}</strong>
                  </div>
                ))}
              </div>
              <ProgressBar value={fulfillment} label={`Préparation pour ${offer.buyer}`} tone={ready ? "amber" : "cyan"} />
              <footer>
                <span><CircleDollarSign aria-hidden="true" /><strong>{formatNumber(offer.rewardCoins)}</strong><small>+{offer.rewardReputation} réputation</small></span>
                <button type="button" disabled={!ready || remainingMs <= 0} onClick={() => dispatch({ type: "FULFILL_CONTRACT", id: offer.id })}>
                  <Truck aria-hidden="true" /> LIVRER
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      <div className="trade-history">
        <div className="legacy-heading"><span>DERNIÈRES TRANSACTIONS</span><History aria-hidden="true" /></div>
        {state.tradeHistory.length === 0 ? (
          <p>Aucun registre commercial.</p>
        ) : state.tradeHistory.slice(0, 5).map((entry) => (
          <div key={entry.id}>
            <span>{entry.kind === "contract" ? <Handshake aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}</span>
            <span><strong>{entry.label}</strong><small>{new Date(entry.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {formatNumber(entry.units)} unités</small></span>
            <b>+{formatNumber(entry.coins)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpeditionPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  const [launchArmed, setLaunchArmed] = useState(false);
  const target = expeditionTarget(state.expeditions);
  const reward = expeditionReward({ depth: target, expeditions: state.expeditions });
  const ready = canStartExpedition(state);
  const nextZone = ZONES.find((zone) => zone.minDepth > state.maxDepth);

  const launch = () => {
    if (!launchArmed) {
      setLaunchArmed(true);
      return;
    }
    dispatch({ type: "START_EXPEDITION" });
    setLaunchArmed(false);
  };

  return (
    <div className="expedition-panel">
      <section className={`cycle-console${ready ? " is-ready" : ""}`}>
        <div className="cycle-console__heading">
          <span><Compass aria-hidden="true" /></span>
          <div>
            <small>CYCLE D'EXPÉDITION {String(state.expeditions + 1).padStart(2, "0")}</small>
            <h3>Balise à {formatNumber(target)} m</h3>
          </div>
          <strong>{formatNumber(state.depth)}<small>m</small></strong>
        </div>
        <ProgressBar value={(Math.min(state.depth, target) / target) * 100} label="Progression du cycle" tone={ready ? "amber" : "cyan"} />
        <div className="cycle-readouts">
          <span>Record<strong>{formatNumber(state.maxDepth)} m</strong></span>
          <span>Remontée<strong>+{formatNumber(reward)} échos</strong></span>
          <span>Prochain secteur<strong>{nextZone ? `${nextZone.minDepth} m` : "Tous découverts"}</strong></span>
        </div>
        <p>
          {ready
            ? "La balise répond. La prochaine remontée peut inscrire cette descente dans la mémoire de la mine."
            : `Encore ${formatNumber(Math.max(0, target - state.depth))} m avant que la balise accepte une remontée.`}
        </p>
        {launchArmed && <small className="cycle-warning">La profondeur, les ressources, les machines, les améliorations et la pioche repartiront de zéro. Les échos, records et objectifs restent acquis.</small>}
        <button className={`expedition-action${launchArmed ? " is-armed" : ""}`} type="button" disabled={!ready} onClick={launch}>
          <RefreshCw aria-hidden="true" />
          {launchArmed ? `CONFIRMER · +${formatNumber(reward)} ÉCHOS` : "PRÉPARER LA REMONTÉE"}
        </button>
      </section>

      <div className="legacy-heading">
        <span>MÉMOIRE PERMANENTE</span>
        <strong>{formatNumber(state.echoes)} échos disponibles</strong>
      </div>
      <div className="purchase-list legacy-list">
        {LEGACIES.map((legacy) => {
          const level = state.legacy[legacy.id];
          const cost = legacyCost(legacy, level);
          const maxed = level >= legacy.max;
          const Icon = legacyIcons[legacy.id];
          return (
            <div className="purchase-row" key={legacy.id}>
              <span className="purchase-row__icon"><Icon aria-hidden="true" /></span>
              <span className="purchase-row__copy">
                <strong>{legacy.name}<b>Niv. {level}</b></strong>
                <small>{maxed ? "Mémoire complète" : legacy.description}</small>
              </span>
              <button type="button" disabled={maxed || state.echoes < cost} onClick={() => dispatch({ type: "BUY_LEGACY", id: legacy.id })}>
                {maxed ? <Check aria-hidden="true" /> : formatNumber(cost)}
                {!maxed && <small>échos</small>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommandPanel({
  state,
  dispatch,
  activeTab,
  onTab,
}: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]>;
  activeTab: PanelTab;
  onTab: (tab: PanelTab) => void;
}) {
  const readyGoals = GOALS.filter((goal) => goal.progress(state) >= goal.target && !state.claimedGoals.includes(goal.id)).length;
  const readyContracts = state.contractOffers.filter((offer) => offer.expiresAt > Date.now() && contractRequirementsMet(state, offer)).length;
  const readyAnalyses = state.maxDepth >= RESEARCH_UNLOCK_DEPTH
    ? ORE_ORDER.filter((id) => oreStudyUnlocked(state, id) && state.oreStudies[id] < MAX_ORE_STUDY_LEVEL && state.inventory[id] >= oreStudyCost(id, state.oreStudies[id])).length
    : 0;
  return (
    <aside className="command-panel">
      <nav className="panel-tabs" aria-label="Atelier">
        {tabDefinitions.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={activeTab === tab.id ? "is-active" : ""}
              type="button"
              key={tab.id}
              onClick={() => onTab(tab.id)}
              aria-pressed={activeTab === tab.id}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.id === "goals" && readyGoals > 0 && <b className="tab-badge" aria-label={`${readyGoals} objectif${readyGoals > 1 ? "s" : ""} à récupérer`}>{readyGoals}</b>}
              {tab.id === "contracts" && readyContracts > 0 && <b className="tab-badge tab-badge--contract" aria-label={`${readyContracts} contrat${readyContracts > 1 ? "s" : ""} prêt${readyContracts > 1 ? "s" : ""}`}>{readyContracts}</b>}
              {tab.id === "research" && readyAnalyses > 0 && <b className="tab-badge tab-badge--research" aria-label={`${readyAnalyses} analyse${readyAnalyses > 1 ? "s" : ""} prête${readyAnalyses > 1 ? "s" : ""}`}>{readyAnalyses}</b>}
            </button>
          );
        })}
      </nav>
      <div className="command-panel__body">
        <div className="panel-heading panel-heading--command">
          <div>
            <span>{activeTab === "contracts" ? "COMPAGNIE MINIÈRE" : activeTab === "research" ? "LABORATOIRE D'ÉCHOS" : "ATELIER MOBILE"}</span>
            <h2>{tabDefinitions.find((tab) => tab.id === activeTab)?.label}</h2>
          </div>
          {activeTab === "contracts" ? <Handshake aria-hidden="true" /> : activeTab === "research" ? <FlaskConical aria-hidden="true" /> : <HardHat aria-hidden="true" />}
        </div>
        {activeTab === "upgrades" && <UpgradeList state={state} dispatch={dispatch} />}
        {activeTab === "machines" && <MachineList state={state} dispatch={dispatch} />}
        {activeTab === "forge" && <ForgePanel state={state} dispatch={dispatch} />}
        {activeTab === "contracts" && <ContractPanel state={state} dispatch={dispatch} />}
        {activeTab === "research" && <ResearchPanel state={state} dispatch={dispatch} />}
        {activeTab === "goals" && <GoalsPanel state={state} dispatch={dispatch} />}
        {activeTab === "expedition" && <ExpeditionPanel state={state} dispatch={dispatch} />}
      </div>
    </aside>
  );
}

function EventModal({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  const event = state.activeEvent;
  if (!event) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-title">
        <span className="event-modal__sigil"><Sparkles aria-hidden="true" /></span>
        <small>ÉVÉNEMENT DE PROFONDEUR</small>
        <h2 id="event-title">{event.title}</h2>
        <p>{event.description}</p>
        <div className="event-options">
          <button type="button" onClick={() => dispatch({ type: "RESOLVE_EVENT", choice: "bold" })}>
            <Pickaxe aria-hidden="true" />
            <span><strong>Forcer le passage</strong><small>Minerai rare · use la pioche</small></span>
          </button>
          <button type="button" onClick={() => dispatch({ type: "RESOLVE_EVENT", choice: "careful" })}>
            <Sparkles aria-hidden="true" />
            <span><strong>Observer la veine</strong><small>Éclats · résonance</small></span>
          </button>
        </div>
      </section>
    </div>
  );
}

function OfflineModal({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]> }) {
  const report = state.offlineReport;
  if (!report) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="offline-modal" role="dialog" aria-modal="true" aria-labelledby="offline-title">
        <Bot aria-hidden="true" />
        <small>PENDANT TON ABSENCE</small>
        <h2 id="offline-title">La mine n'a pas dormi.</h2>
        <p>Les machines ont travaillé pendant {formatDuration(report.seconds)}.</p>
        <div className="offline-loot">
          <span><Sparkles /> <strong>+{formatNumber(report.shards)}</strong> éclats</span>
          <span><Package /> <strong>+{formatNumber(report.ore)}</strong> roches</span>
        </div>
        <button type="button" onClick={() => dispatch({ type: "DISMISS_OFFLINE" })}>REPRENDRE LA PIOCHE</button>
      </section>
    </div>
  );
}

function SettingsModal({
  state,
  dispatch,
  onClose,
}: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]>;
  onClose: () => void;
}) {
  const [importValue, setImportValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [resetArmed, setResetArmed] = useState(false);

  const copySave = async () => {
    try {
      await navigator.clipboard.writeText(encodeSave(state));
      setFeedback("Sauvegarde copiée.");
    } catch {
      setFeedback("Copie impossible dans ce navigateur.");
    }
  };

  const importSave = () => {
    try {
      dispatch({ type: "IMPORT", state: decodeSave(importValue) });
      setFeedback("Sauvegarde importée.");
      setImportValue("");
    } catch {
      setFeedback("Ce code de sauvegarde n'est pas valide.");
    }
  };

  const reset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      setFeedback("Appuie encore une fois pour confirmer.");
      return;
    }
    dispatch({ type: "RESET" });
    setFeedback("Nouvelle mine créée.");
    setResetArmed(false);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-modal__heading">
          <div><small>VERSION 0.6.0 · LE LABORATOIRE</small><h2 id="settings-title">Sauvegarde</h2></div>
          <IconButton label="Fermer" onClick={onClose}><X aria-hidden="true" /></IconButton>
        </div>
        <p>La progression reste sur cet appareil. Un code permet de la déplacer ou d'en garder une copie.</p>
        <button className="settings-action" type="button" onClick={copySave}><Copy /> COPIER LA SAUVEGARDE</button>
        <label htmlFor="save-import">Importer un code</label>
        <textarea
          id="save-import"
          value={importValue}
          onChange={(event) => setImportValue(event.target.value)}
          placeholder="Colle le code de sauvegarde ici…"
        />
        <button className="settings-action" type="button" onClick={importSave} disabled={!importValue.trim()}><Database /> IMPORTER</button>
        <button className={`reset-action${resetArmed ? " is-armed" : ""}`} type="button" onClick={reset}><RotateCcw /> {resetArmed ? "CONFIRMER LA NOUVELLE PARTIE" : "RECOMMENCER"}</button>
        {feedback && <p className="settings-feedback" aria-live="polite">{feedback}</p>}
      </section>
    </div>
  );
}

function useGameAudio(state: GameState) {
  const audioRef = useRef<AudioContext | null>(null);
  const previousImpact = useRef(state.impact.id);
  const previousRock = useRef(state.rockRevision);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0) => {
    if (!state.soundOn) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioRef.current) audioRef.current = new AudioContextClass();
    const audio = audioRef.current;
    if (audio.state === "suspended") void audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.55), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }, [state.soundOn]);

  useEffect(() => {
    if (state.impact.id === previousImpact.current) return;
    previousImpact.current = state.impact.id;
    if (state.impact.damage <= 0) return;
    playTone(state.impact.crit ? 460 : 170 + Math.random() * 50, 0.11, "square", state.impact.crit ? 0.045 : 0.026);
    playTone(74, 0.18, "triangle", 0.04, 0.015);
  }, [playTone, state.impact]);

  useEffect(() => {
    if (state.rockRevision === previousRock.current) return;
    previousRock.current = state.rockRevision;
    [220, 330, 440].forEach((frequency, index) => playTone(frequency, 0.32, "sine", 0.035, index * 0.07));
  }, [playTone, state.rockRevision]);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGame);
  const [activeTab, setActiveTab] = useState<PanelTab>("upgrades");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [notices, setNotices] = useState<GameNotice[]>([]);
  const [automationPulse, setAutomationPulse] = useState(0);
  const pointerRef = useRef({ x: 50, y: 46 });
  const lastEffectId = useRef(state.impact.id);
  const previousMaxDepth = useRef(state.maxDepth);
  const reachedGoals = useRef(new Set(
    GOALS
      .filter((goal) => goal.progress(state) >= goal.target || state.claimedGoals.includes(goal.id))
      .map((goal) => goal.id),
  ));
  const zone = activeZoneForState(state);
  const goalProgressKey = GOALS
    .map((goal) => `${goal.id}:${goal.progress(state) >= goal.target ? 1 : 0}:${state.claimedGoals.includes(goal.id) ? 1 : 0}`)
    .join("|");

  useGameAudio(state);

  const queueNotices = useCallback((incoming: GameNotice[]) => {
    if (!incoming.length) return;
    setNotices((current) => {
      const visible = new Set(current.map((notice) => notice.id));
      return [...current, ...incoming.filter((notice) => !visible.has(notice.id))].slice(-4);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      dispatch({ type: "TICK", seconds: 1 });
      setAutomationPulse((pulse) => pulse + 1);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => saveGame(state), 350);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const oldMaxDepth = previousMaxDepth.current;
    if (state.maxDepth < oldMaxDepth) {
      previousMaxDepth.current = state.maxDepth;
      return;
    }

    const unlocked = MACHINES
      .filter((machine) => oldMaxDepth < machine.unlockDepth && state.maxDepth >= machine.unlockDepth)
      .map<GameNotice>((machine) => ({
        id: `unlock-${machine.id}-${state.maxDepth}`,
        kind: "unlock",
        name: machine.name,
        detail: `${machine.description}. Disponible dans l’onglet Machines.`,
        machineId: machine.id,
      }));
    if (oldMaxDepth < CONTRACT_UNLOCK_DEPTH && state.maxDepth >= CONTRACT_UNLOCK_DEPTH) {
      unlocked.push({
        id: `unlock-contracts-${state.maxDepth}`,
        kind: "contract",
        name: "La Compagnie minière",
        detail: "Trois convois transmettent désormais leurs commandes et leurs échéances.",
      });
    }
    if (oldMaxDepth < RESEARCH_UNLOCK_DEPTH && state.maxDepth >= RESEARCH_UNLOCK_DEPTH) {
      unlocked.push({
        id: `unlock-research-${state.maxDepth}`,
        kind: "research",
        name: "Le Laboratoire d'échos",
        detail: "Les minerais peuvent désormais être analysés pour développer des protocoles permanents.",
      });
    }
    previousMaxDepth.current = state.maxDepth;
    queueNotices(unlocked);
  }, [queueNotices, state.maxDepth]);

  useEffect(() => {
    const newlyReached: GameNotice[] = [];
    GOALS.forEach((goal) => {
      const complete = goal.progress(state) >= goal.target;
      const claimed = state.claimedGoals.includes(goal.id);
      if (!complete) {
        reachedGoals.current.delete(goal.id);
        return;
      }
      if (!claimed && !reachedGoals.current.has(goal.id)) {
        newlyReached.push({
          id: `goal-${goal.id}-${state.rocksBroken}-${state.depth}`,
          kind: "goal",
          name: goal.name,
          detail: `${goal.description}. La récompense est prête.`,
        });
      }
      reachedGoals.current.add(goal.id);
    });
    queueNotices(newlyReached);
  }, [goalProgressKey, queueNotices, state]);

  useEffect(() => {
    if (!notices.length) return;
    const timer = window.setTimeout(() => setNotices((current) => current.slice(1)), 5_500);
    return () => window.clearTimeout(timer);
  }, [notices]);

  useEffect(() => {
    if (state.impact.id === lastEffectId.current) return;
    lastEffectId.current = state.impact.id;
    if (state.impact.damage <= 0) return;
    const effect: HitEffect = {
      id: state.impact.id,
      x: pointerRef.current.x,
      y: pointerRef.current.y,
      damage: state.impact.damage,
      crit: state.impact.crit,
      shards: state.impact.shards,
    };
    setEffects((current) => [...current.slice(-7), effect]);
    const timer = window.setTimeout(() => setEffects((current) => current.filter((item) => item.id !== effect.id)), 900);
    return () => window.clearTimeout(timer);
  }, [state.impact]);

  const handleStrike = (event: MouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
    dispatch({ type: "STRIKE" });
  };

  const openNotice = (notice: GameNotice) => {
    setActiveTab(notice.kind === "unlock" ? "machines" : notice.kind === "contract" ? "contracts" : notice.kind === "research" ? "research" : "goals");
    setNotices((current) => current.filter((item) => item.id !== notice.id));
    window.setTimeout(() => document.querySelector(".command-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const style = useMemo(() => ({ "--zone-accent": zone.accent } as CSSProperties), [zone.accent]);

  return (
    <div className={`app-shell zone-${zone.id}`} style={style}>
      <TopBar state={state} onSound={() => dispatch({ type: "TOGGLE_SOUND" })} onSettings={() => setSettingsOpen(true)} />
      <main className="game-grid">
        <InventoryPanel
          state={state}
          onSellAll={() => dispatch({ type: "SELL_ALL" })}
          onSellSelected={(ids, rates) => dispatch({ type: "SELL_SELECTED", ids, rates })}
        />
        <MineStage
          state={state}
          effects={effects}
          automationPulse={automationPulse}
          onStrike={handleStrike}
          onRepair={() => dispatch({ type: "REPAIR" })}
          onSelectZone={(id) => dispatch({ type: "SELECT_ZONE", id })}
        />
        <CommandPanel state={state} dispatch={dispatch} activeTab={activeTab} onTab={setActiveTab} />
      </main>
      <NoticeStack
        notices={notices}
        onOpen={openNotice}
        onDismiss={(id) => setNotices((current) => current.filter((notice) => notice.id !== id))}
      />
      <EventModal state={state} dispatch={dispatch} />
      <OfflineModal state={state} dispatch={dispatch} />
      {settingsOpen && <SettingsModal state={state} dispatch={dispatch} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
