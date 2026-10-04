import { Check, Factory, Flame, HardHat, Lock, Radio, Sparkles, Truck } from "lucide-react";
import type { Dispatch } from "react";
import {
  INDUSTRY_MATERIALS,
  formatNumber,
  type GameAction,
  type GameState,
  type IndustryMaterialId,
} from "./game";
import {
  GRAND_WORKS,
  GRAND_WORKS_UNLOCK_EXPEDITIONS,
  grandWorkCost,
  grandWorkStages,
  grandWorkStageTotal,
  grandWorksComplete,
  grandWorksUnlocked,
  industrySpeedMultiplier,
  productionQueueCapacity,
  stabilizationCost,
  stabilizationMultiplier,
  stewardshipSaleMultiplier,
  type GrandWorkId,
} from "./grandWorks";

const workIcons = {
  freight: Truck,
  furnace: Flame,
  bureau: Radio,
} satisfies Record<GrandWorkId, typeof HardHat>;

interface GrandWorksPanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/**
 * Late-game infrastructure is kept in its own panel because it has a different
 * rhythm from ordinary upgrades: every purchase is a visible milestone, not a
 * button meant to be tapped repeatedly.
 */
export function GrandWorksPanel({ state, dispatch }: GrandWorksPanelProps) {
  if (!grandWorksUnlocked(state.expeditions)) {
    const progress = Math.min(100, (state.expeditions / GRAND_WORKS_UNLOCK_EXPEDITIONS) * 100);
    return (
      <div className="works-lock">
        <Lock aria-hidden="true" />
        <small>ARCHIVES D'INFRASTRUCTURE SCELLÉES</small>
        <h3>Deux remontées sont nécessaires pour cartographier une mine assez stable.</h3>
        <div className="works-progress" role="progressbar" aria-label="Déblocage des Grands Travaux" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <strong>{state.expeditions} / {GRAND_WORKS_UNLOCK_EXPEDITIONS} expéditions</strong>
      </div>
    );
  }

  const stages = grandWorkStages(state.grandWorks);
  const totalStages = grandWorkStageTotal();
  const complete = grandWorksComplete(state.grandWorks);
  const nextStabilizationCost = stabilizationCost(state.stabilizations);
  const currentEfficiency = (stabilizationMultiplier(state.stabilizations) - 1) * 100;
  const nextEfficiency = (stabilizationMultiplier(state.stabilizations + 1) - 1) * 100;

  return (
    <div className="works-panel">
      {/* This summary lets a player understand all three systemic rewards
          without reopening the Industry or market panels. */}
      <section className="works-console">
        <span className="works-console__icon"><HardHat aria-hidden="true" /></span>
        <div className="works-console__title">
          <small>RÉSEAU DE PROFONDEUR</small>
          <h3>{complete ? "Infrastructure majeure achevée" : `${stages} paliers sur ${totalStages}`}</h3>
        </div>
        <div className="works-progress" role="progressbar" aria-label="Progression des Grands Travaux" aria-valuemin={0} aria-valuemax={totalStages} aria-valuenow={stages}>
          <span style={{ width: `${(stages / totalStages) * 100}%` }} />
        </div>
        <dl className="works-console__stats">
          <div><dt>File</dt><dd>{productionQueueCapacity(state.grandWorks)} ordres</dd></div>
          <div><dt>Industrie</dt><dd>+{Math.round((industrySpeedMultiplier(state.grandWorks) - 1) * 100)} %</dd></div>
          <div><dt>Ventes</dt><dd>+{Math.round((stewardshipSaleMultiplier(state.grandWorks) - 1) * 100)} %</dd></div>
        </dl>
      </section>

      <div className="works-heading">
        <span>PLANS DIRECTEURS</span>
        <small>Conservés entre les cycles</small>
      </div>

      <div className="work-list">
        {GRAND_WORKS.map((definition) => {
          const Icon = workIcons[definition.id];
          const level = state.grandWorks[definition.id];
          const maxed = level >= definition.max;
          const cost = grandWorkCost(definition, level);
          const hasMaterials = Object.entries(cost.materials)
            .every(([id, amount]) => state.industryMaterials[id as IndustryMaterialId] >= (amount ?? 0));
          const ready = !maxed && state.shards >= cost.shards && hasMaterials;

          return (
            <article className={`work-card work-card--${definition.id}${maxed ? " is-complete" : ""}`} key={definition.id}>
              <div className="work-card__heading">
                <span><Icon aria-hidden="true" /></span>
                <div>
                  <small>GRAND TRAVAIL {level + (maxed ? 0 : 1)}/{definition.max}</small>
                  <h3>{definition.name}</h3>
                </div>
                <b>{level}/{definition.max}</b>
              </div>
              <p>{definition.description}</p>
              <strong className="work-card__effect">{definition.effect}</strong>
              <div className="works-progress" role="progressbar" aria-label={`Progression de ${definition.name}`} aria-valuemin={0} aria-valuemax={definition.max} aria-valuenow={level}>
                <span style={{ width: `${(level / definition.max) * 100}%` }} />
              </div>
              {maxed ? (
                <div className="work-card__complete"><Check aria-hidden="true" /> OUVRAGE ACHEVÉ</div>
              ) : (
                <div className="work-card__purchase">
                  <div className="work-costs">
                    <span className={state.shards >= cost.shards ? "is-ready" : ""}>
                      <Sparkles aria-hidden="true" /> {formatNumber(cost.shards)}
                    </span>
                    {Object.entries(cost.materials).map(([id, amount]) => (
                      <span className={state.industryMaterials[id as IndustryMaterialId] >= (amount ?? 0) ? "is-ready" : ""} key={id}>
                        {INDUSTRY_MATERIALS[id as IndustryMaterialId].shortName} {state.industryMaterials[id as IndustryMaterialId]}/{amount}
                      </span>
                    ))}
                  </div>
                  <button type="button" disabled={!ready} onClick={() => dispatch({ type: "BUY_GRAND_WORK", id: definition.id })}>
                    <HardHat aria-hidden="true" /> CONSTRUIRE
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Stabilization appears early as a promise, but never accepts payment
          before the finite campaign has been completed. */}
      <section className={`stabilization-console${complete ? " is-unlocked" : ""}`}>
        <span><Factory aria-hidden="true" /></span>
        <div>
          <small>CHANTIER SANS FIN</small>
          <h3>Stabilisation du réseau</h3>
          <p>
            {complete
              ? `Palier ${state.stabilizations} · efficacité globale +${currentEfficiency.toFixed(1)} %. Le rendement se rapproche doucement de sa limite.`
              : "Achever les quinze paliers pour convertir les surplus d'éclats en efficacité durable."}
          </p>
        </div>
        <button
          type="button"
          disabled={!complete || state.shards < nextStabilizationCost}
          onClick={() => dispatch({ type: "STABILIZE_NETWORK" })}
        >
          {complete ? <><Sparkles aria-hidden="true" />STABILISER · {formatNumber(nextStabilizationCost)}<small>Prochain total : +{nextEfficiency.toFixed(1)} %</small></> : <><Lock aria-hidden="true" />VERROUILLÉ</>}
        </button>
      </section>
    </div>
  );
}
