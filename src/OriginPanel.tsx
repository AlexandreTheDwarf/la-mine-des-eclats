import { useState, type Dispatch } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Gem,
  Lock,
  Send,
  Sparkles,
} from "lucide-react";
import { CREW, crewById, crewLevel, crewUnlocked } from "./crew";
import {
  ORIGIN_STAGES,
  RELICS,
  originStageById,
  originStageUnlocked,
  type OriginStageId,
} from "./origin";
import { planOriginExpedition } from "./expeditionPlanning";
import {
  INDUSTRY_MATERIALS,
  formatDuration,
  formatNumber,
  type GameState,
  type GameAction,
  type IndustryMaterialId,
} from "./game";
import { CrewTalents, relicIcons } from "./ExpeditionEquipment";

export function OriginPanel({
  state,
  dispatch,
  onRoutes,
  onRelics,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onRoutes: () => void;
  onRelics: () => void;
}) {
  const [selected, setSelected] = useState<OriginStageId>(
    state.origin.awaitingChoice ??
      state.origin.activeJob?.stageId ??
      ORIGIN_STAGES.find((stage) => !state.origin.visits[stage.id])?.id ??
      "heart",
  );
  const stage = originStageById(selected);
  const plan = planOriginExpedition(state, selected);
  const unlocked = originStageUnlocked(
    state.origin,
    state.originSignalFound,
    state.surveyData,
    selected,
  );
  const collected = stage.relics.filter((id) =>
    state.origin.ownedRelics.includes(id),
  ).length;
  const enough =
    state.shards >= plan.cost.shards &&
    Object.entries(plan.cost.materials).every(
      ([id, amount]) =>
        state.industryMaterials[id as IndustryMaterialId] >= (amount ?? 0),
    );
  const busy = !!state.activeRiftExpedition || !!state.origin.activeJob;
  const discovery = state.origin.awaitingChoice
    ? originStageById(state.origin.awaitingChoice)
    : null;
  const previous =
    ORIGIN_STAGES[
      ORIGIN_STAGES.findIndex((entry) => entry.id === selected) - 1
    ];

  return (
    <div className="origin-panel">
      {discovery && (
        <section
          className="origin-discovery"
          aria-label="Découverte originelle"
        >
          <div className="origin-section-heading">
            <Sparkles aria-hidden="true" />
            <div>
              <small>DÉCOUVERTE À RAPPORTER</small>
              <h3>{discovery.name}</h3>
            </div>
          </div>
          <p>{discovery.event}</p>
          <div className="origin-choices">
            {discovery.relics.map((id) => {
              const relic = RELICS.find((entry) => entry.id === id)!;
              const Icon = relicIcons[id];
              const owned = state.origin.ownedRelics.includes(id);
              return (
                <button
                  type="button"
                  key={id}
                  disabled={owned}
                  onClick={() => dispatch({ type: "CLAIM_ORIGIN_RELIC", id })}
                >
                  <Icon aria-hidden="true" />
                  <strong>{relic.name}</strong>
                  <span>{relic.effect}</span>
                  <small>
                    {owned
                      ? "Déjà dans la collection"
                      : "Rapporter cette relique"}
                  </small>
                </button>
              );
            })}
          </div>
          <p className="origin-hint">
            +{discovery.research} données labo · +{discovery.echoes} échos.
            L'autre relique reste ici pour une prochaine visite.
          </p>
        </section>
      )}

      <div
        className="origin-chapters"
        role="group"
        aria-label="Chapitres de la Faille originelle"
      >
        {ORIGIN_STAGES.map((entry, index) => (
          <button
            type="button"
            key={entry.id}
            aria-pressed={selected === entry.id}
            className={selected === entry.id ? "is-selected" : ""}
            onClick={() => setSelected(entry.id)}
          >
            <span>
              {state.origin.visits[entry.id] > 0 ? (
                <Check aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <strong>{entry.name}</strong>
            <small>{state.origin.visits[entry.id]}/2 reliques</small>
          </button>
        ))}
      </div>
      <section className="origin-scene" aria-label={stage.name}>
        <img src={`${import.meta.env.BASE_URL}assets/${stage.image}`} alt="" />
        <div>
          <small>{stage.sector}</small>
          <h3>{stage.name}</h3>
          <p>{stage.description}</p>
        </div>
      </section>
      <div className="origin-requirements">
        <span className={state.originSignalFound ? "is-ready" : ""}>
          {state.originSignalFound ? <Check /> : <Lock />} Signal originel
        </span>
        <span className={state.surveyData >= stage.survey ? "is-ready" : ""}>
          {Math.min(state.surveyData, stage.survey)}/{stage.survey} cartographie
        </span>
        <span
          className={
            state.origin.variantDiscoveries.length >= stage.discoveries
              ? "is-ready"
              : ""
          }
        >
          {Math.min(state.origin.variantDiscoveries.length, stage.discoveries)}/
          {stage.discoveries} variantes étudiées
        </span>
        {previous && (
          <span
            className={state.origin.visits[previous.id] > 0 ? "is-ready" : ""}
          >
            {state.origin.visits[previous.id] > 0 ? <Check /> : <Lock />}{" "}
            {previous.name}
          </span>
        )}
      </div>
      {!unlocked && (
        <button type="button" className="origin-link" onClick={onRoutes}>
          <ArrowLeft aria-hidden="true" /> Retour au réseau et aux relevés
        </button>
      )}

      {collected < 2 && (
        <>
          <label className="origin-crew-select">
            Chef du convoi
            <select
              value={state.selectedCrewId}
              onChange={(event) =>
                dispatch({
                  type: "SELECT_CREW",
                  id: event.target.value as GameState["selectedCrewId"],
                })
              }
            >
              {CREW.filter((member) =>
                crewUnlocked(state.maxDepth, member),
              ).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · Niveau {crewLevel(state.crewXp[member.id])} ·
                  Forme {Math.round(100 - state.crewFatigue[member.id])} %
                </option>
              ))}
            </select>
          </label>
          <CrewTalents state={state} dispatch={dispatch} />
          <div className="rift-manifest">
            <div>
              <small>CONVOI ORIGINEL</small>
              <span
                className={state.shards >= plan.cost.shards ? "is-ready" : ""}
              >
                {formatNumber(plan.cost.shards)} éclats
              </span>
              {Object.entries(plan.cost.materials).map(([id, amount]) => (
                <span
                  key={id}
                  className={
                    state.industryMaterials[id as IndustryMaterialId] >=
                    (amount ?? 0)
                      ? "is-ready"
                      : ""
                  }
                >
                  {INDUSTRY_MATERIALS[id as IndustryMaterialId].shortName}{" "}
                  {state.industryMaterials[id as IndustryMaterialId]}/{amount}
                </span>
              ))}
            </div>
            <div>
              <small>DÉCOUVERTE GARANTIE</small>
              <span>1 relique au choix</span>
              <span>
                +{stage.research} données labo · +{stage.echoes} échos
              </span>
              <span>
                +{plan.xp} XP · {crewById(state.selectedCrewId).name}
              </span>
              <span>Fatigue au retour : +{plan.fatigue}</span>
            </div>
          </div>
          <button
            type="button"
            className="rift-launch"
            disabled={!unlocked || !enough || busy || !!discovery}
            onClick={() =>
              dispatch({ type: "START_ORIGIN_EXPEDITION", id: selected })
            }
          >
            {busy ? <Clock3 aria-hidden="true" /> : <Send aria-hidden="true" />}
            {busy
              ? "CONVOI DÉJÀ EN ROUTE"
              : discovery
                ? "UNE DÉCOUVERTE ATTEND"
                : collected
                  ? `REVENIR · ${formatDuration(plan.duration)}`
                  : `EXPLORER · ${formatDuration(plan.duration)}`}
          </button>
        </>
      )}
      {collected === 2 && (
        <p className="origin-complete">
          <Check aria-hidden="true" /> Les deux reliques de ce lieu ont rejoint
          la mine.
        </p>
      )}
      {state.origin.visits.heart > 0 && (
        <div className="origin-epilogue">
          <h3>La mine ne creuse plus seule.</h3>
          <p>
            À la surface, les balises cessent de grésiller. Dans l'atelier, six
            places ont été préparées pour les outils retrouvés. Ce n'était pas
            la fin d'une galerie. C'était le retour d'une histoire.
          </p>
        </div>
      )}
      <button type="button" className="origin-link" onClick={onRelics}>
        <Gem aria-hidden="true" /> Collection ·{" "}
        {state.origin.ownedRelics.length}/6 reliques
      </button>
    </div>
  );
}
