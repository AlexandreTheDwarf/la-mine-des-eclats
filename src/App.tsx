import {
  Bot,
  Cat,
  Check,
  CircleDollarSign,
  Copy,
  Crosshair,
  Database,
  Flame,
  Gauge,
  Gem,
  Hammer,
  HardHat,
  Lock,
  Package,
  Pickaxe,
  RotateCcw,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Target,
  Trophy,
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
  MACHINES,
  ORES,
  ORE_ORDER,
  TOOLS,
  UPGRADES,
  canForgeNext,
  decodeSave,
  encodeSave,
  formatDuration,
  formatNumber,
  gameReducer,
  getDerivedStats,
  inventoryCount,
  loadGame,
  machineCost,
  rockNameFor,
  saveGame,
  upgradeCost,
  zoneForDepth,
  type GameState,
  type MachineId,
  type OreId,
  type UpgradeId,
} from "./game";

type PanelTab = "upgrades" | "machines" | "forge" | "goals";

interface HitEffect {
  id: number;
  x: number;
  y: number;
  damage: number;
  crit: boolean;
  shards: number;
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
};

const tabDefinitions: Array<{ id: PanelTab; label: string; icon: LucideIcon }> = [
  { id: "upgrades", label: "Améliorer", icon: Zap },
  { id: "machines", label: "Machines", icon: Bot },
  { id: "forge", label: "Forge", icon: Hammer },
  { id: "goals", label: "Objectifs", icon: Trophy },
];

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

function InventoryPanel({ state, onSell }: { state: GameState; onSell: () => void }) {
  const stats = getDerivedStats(state);
  const zone = zoneForDepth(state.depth);
  const unlockedOreIndex = zone.id === 0 ? 4 : zone.id === 1 ? 5 : 6;

  const crew = [
    { name: "Mica", role: "Repérage", unlocked: true },
    { name: "Braise", role: "Forge", unlocked: state.depth >= 25 },
    { name: "Nova", role: "Noyau", unlocked: state.depth >= 60 },
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

      <div className="ore-list">
        {ORE_ORDER.map((id, index) => {
          const ore = ORES[id];
          const unlocked = index <= unlockedOreIndex;
          return (
            <div className={`ore-row${unlocked ? "" : " is-locked"}`} key={id}>
              <span className="ore-swatch" style={{ "--ore-color": ore.color, "--ore-glow": ore.glow } as CSSProperties} />
              <span className="ore-row__name">{unlocked ? ore.shortName : "Inconnu"}</span>
              <strong>{unlocked ? formatNumber(state.inventory[id]) : "?"}</strong>
              <small>{unlocked ? `${formatNumber(Math.round(ore.value * stats.saleMultiplier))} p` : "—"}</small>
            </div>
          );
        })}
      </div>

      <button className="sell-button" type="button" onClick={onSell} disabled={stats.inventoryValue <= 0}>
        <ShoppingCart aria-hidden="true" />
        <span>
          <strong>VENDRE LE CHARGEMENT</strong>
          <small>{formatNumber(stats.inventoryValue)} pièces</small>
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
  onStrike,
  onRepair,
}: {
  state: GameState;
  effects: HitEffect[];
  onStrike: (event: MouseEvent<HTMLButtonElement>) => void;
  onRepair: () => void;
}) {
  const stats = getDerivedStats(state);
  const zone = zoneForDepth(state.depth);
  const tool = TOOLS[state.toolTier];
  const rockHealth = (state.rockHp / state.rockMaxHp) * 100;
  const durability = (state.durability / stats.maxDurability) * 100;
  const canRepair = state.durability < stats.maxDurability && (state.shards >= stats.repairCost || state.durability <= 0);
  const backgroundUrl = `${import.meta.env.BASE_URL}${zone.image}`;

  return (
    <section className={`mine-stage mine-stage--zone-${zone.id}`} style={{ "--zone-accent": zone.accent } as CSSProperties}>
      <img className="mine-stage__backdrop" src={backgroundUrl} alt="" aria-hidden="true" key={zone.id} />
      <div className="mine-stage__shade" aria-hidden="true" />
      <div className="zone-title">
        <span>{zone.sector}</span>
        <strong>{zone.name}</strong>
        <small>{zone.description}</small>
      </div>

      <div className="rock-status">
        <div>
          <span>FILON {String(state.rocksBroken + 1).padStart(3, "0")}</span>
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
        const unlocked = state.depth >= machine.unlockDepth;
        const Icon = machineIcons[machine.id];
        return (
          <div className={`purchase-row${unlocked ? "" : " is-locked"}`} key={machine.id}>
            <span className="purchase-row__icon"><Icon aria-hidden="true" /></span>
            <span className="purchase-row__copy">
              <strong>{machine.name}<b>{unlocked ? `x${level}` : <Lock size={12} />}</b></strong>
              <small>{unlocked ? machine.description : `Disponible à ${machine.unlockDepth} m`}</small>
            </span>
            <button
              type="button"
              disabled={!unlocked || state.coins < cost}
              onClick={() => dispatch({ type: "BUY_MACHINE", id: machine.id })}
            >
              {formatNumber(cost)}<small>pièces</small>
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
          goal.reward.drill ? `${goal.reward.drill} taupe` : "",
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
            </button>
          );
        })}
      </nav>
      <div className="command-panel__body">
        <div className="panel-heading panel-heading--command">
          <div>
            <span>ATELIER MOBILE</span>
            <h2>{tabDefinitions.find((tab) => tab.id === activeTab)?.label}</h2>
          </div>
          <HardHat aria-hidden="true" />
        </div>
        {activeTab === "upgrades" && <UpgradeList state={state} dispatch={dispatch} />}
        {activeTab === "machines" && <MachineList state={state} dispatch={dispatch} />}
        {activeTab === "forge" && <ForgePanel state={state} dispatch={dispatch} />}
        {activeTab === "goals" && <GoalsPanel state={state} dispatch={dispatch} />}
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
          <div><small>LOCAL · VERSION 0.2</small><h2 id="settings-title">Sauvegarde</h2></div>
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
  const pointerRef = useRef({ x: 50, y: 46 });
  const lastEffectId = useRef(state.impact.id);
  const zone = zoneForDepth(state.depth);

  useGameAudio(state);

  useEffect(() => {
    const timer = window.setInterval(() => dispatch({ type: "TICK", seconds: 1 }), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => saveGame(state), 350);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state.impact.id === lastEffectId.current) return;
    lastEffectId.current = state.impact.id;
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

  const style = useMemo(() => ({ "--zone-accent": zone.accent } as CSSProperties), [zone.accent]);

  return (
    <div className={`app-shell zone-${zone.id}`} style={style}>
      <TopBar state={state} onSound={() => dispatch({ type: "TOGGLE_SOUND" })} onSettings={() => setSettingsOpen(true)} />
      <main className="game-grid">
        <InventoryPanel state={state} onSell={() => dispatch({ type: "SELL_ALL" })} />
        <MineStage
          state={state}
          effects={effects}
          onStrike={handleStrike}
          onRepair={() => dispatch({ type: "REPAIR" })}
        />
        <CommandPanel state={state} dispatch={dispatch} activeTab={activeTab} onTab={setActiveTab} />
      </main>
      <EventModal state={state} dispatch={dispatch} />
      <OfflineModal state={state} dispatch={dispatch} />
      {settingsOpen && <SettingsModal state={state} dispatch={dispatch} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
