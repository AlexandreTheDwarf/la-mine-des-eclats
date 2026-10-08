import {
  BatteryMedium,
  Check,
  CircleDotDashed,
  Clock3,
  Coins,
  Database,
  FastForward,
  Gem,
  Lock,
  Map,
  PackageSearch,
  Radar,
  Route,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState, type Dispatch } from "react";
import { OriginPanel } from "./OriginPanel";
import "./origin.css";
import { CrewTalents, RelicCollection } from "./ExpeditionEquipment";
import { originStageById } from "./origin";
import { planRiftExpedition } from "./expeditionPlanning";
import {
  INDUSTRY_MATERIALS,
  formatDuration,
  formatNumber,
  type GameAction,
  type GameState,
  type IndustryMaterialId,
} from "./game";
import { grandWorkStages } from "./grandWorks";
import {
  CREW,
  CREW_LEVEL_THRESHOLDS,
  crewBonusLabel,
  crewById,
  crewLevel,
  crewNextLevelXp,
  crewUnlocked,
} from "./crew";
import {
  RIFT_APPROACHES,
  RIFT_ROUTES,
  RIFT_UNLOCK_EXPEDITIONS,
  RIFT_UNLOCK_WORK_STAGES,
  riftApproachById,
  riftNetworkUnlocked,
  riftRouteById,
  riftRouteUnlocked,
  type RiftApproachId,
} from "./riftNetwork";

const approachIcons = {
  swift: FastForward,
  survey: Radar,
  salvage: PackageSearch,
} satisfies Record<RiftApproachId, typeof Radar>;

interface RiftNetworkPanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/**
 * Main v0.9 surface. The panel intentionally shows the map, planning controls
 * and return reports together so launching an expedition never requires the
 * player to bounce between unrelated tabs.
 */
export function RiftNetworkPanel({ state, dispatch }: RiftNetworkPanelProps) {
  const [view, setView] = useState<"routes" | "origin" | "relics">("routes");
  const job = state.origin.activeJob;
  const discovery = state.origin.awaitingChoice;
  const unlocked = riftNetworkUnlocked(state.expeditions, state.grandWorks);
  return <>
    {unlocked && <>
      <nav className="rift-views" aria-label="Exploration des failles">
        <button type="button" aria-pressed={view === "routes"} onClick={() => setView("routes")}><Map aria-hidden="true" />Réseau</button>
        <button type="button" aria-pressed={view === "origin"} onClick={() => setView("origin")}><Sparkles aria-hidden="true" />Origine{discovery && <i aria-label="Découverte à rapporter" />}</button>
        <button type="button" aria-pressed={view === "relics"} onClick={() => setView("relics")}><Gem aria-hidden="true" />Reliques</button>
      </nav>
      {(job || discovery) && <div className="origin-status" role="status">
        <div><strong>{job ? `${crewById(job.crewId).name} · ${originStageById(job.stageId).name}` : "Une découverte originelle attend"}</strong>
          <span>{job ? `Retour dans ${formatDuration(job.remaining)}` : originStageById(discovery!).name}</span></div>
        <button type="button" onClick={() => setView("origin")} aria-label="Voir le convoi originel"><Sparkles aria-hidden="true" /></button>
        {job && <div className="rift-progress" role="progressbar" aria-label="Convoi originel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(100 * (1 - job.remaining / job.duration))}><i style={{ width: `${100 * (1 - job.remaining / job.duration)}%` }} /></div>}
      </div>}
    </>}
    {!unlocked || view === "routes" ? <RiftRoutesPanel state={state} dispatch={dispatch} onOrigin={() => setView("origin")} />
      : view === "origin" ? <OriginPanel state={state} dispatch={dispatch} onRoutes={() => setView("routes")} onRelics={() => setView("relics")} />
      : <RelicCollection state={state} dispatch={dispatch} />}
  </>;
}

function RiftRoutesPanel({ state, dispatch, onOrigin }: RiftNetworkPanelProps & { onOrigin: () => void }) {
  const completedWorkStages = grandWorkStages(state.grandWorks);
  if (!riftNetworkUnlocked(state.expeditions, state.grandWorks)) {
    const expeditionProgress = Math.min(100, (state.expeditions / RIFT_UNLOCK_EXPEDITIONS) * 100);
    const worksProgress = Math.min(100, (completedWorkStages / RIFT_UNLOCK_WORK_STAGES) * 100);
    return (
      <div className="rift-lock">
        <Radar aria-hidden="true" />
        <small>RÉSEAU DE FAILLES INAUDIBLE</small>
        <h3>La mine doit d'abord apprendre à soutenir des équipes loin de la galerie centrale.</h3>
        <div className="rift-lock__requirement">
          <span><Route aria-hidden="true" /> Expéditions minières</span>
          <b>{state.expeditions}/{RIFT_UNLOCK_EXPEDITIONS}</b>
          <div className="rift-progress"><i style={{ width: `${expeditionProgress}%` }} /></div>
        </div>
        <div className="rift-lock__requirement">
          <span><CircleDotDashed aria-hidden="true" /> Paliers de Grands Travaux</span>
          <b>{completedWorkStages}/{RIFT_UNLOCK_WORK_STAGES}</b>
          <div className="rift-progress"><i style={{ width: `${worksProgress}%` }} /></div>
        </div>
      </div>
    );
  }

  const selectedRoute = riftRouteById(state.selectedRiftRouteId);
  const selectedApproach = riftApproachById(state.selectedRiftApproachId);
  const selectedCrew = crewById(state.selectedCrewId);
  const selectedCompletions = state.riftRouteCompletions[selectedRoute.id];
  const selectedUnlocked = riftRouteUnlocked(state.surveyData, selectedRoute);
  const plan = planRiftExpedition(state);
  const selectedCost = plan.cost;
  const selectedRewards = plan.manifest.rewards;
  const selectedDuration = plan.duration;
  const hasMaterials = Object.entries(selectedCost.materials)
    .every(([id, amount]) => state.industryMaterials[id as IndustryMaterialId] >= (amount ?? 0));
  const selectedCrewUnlocked = crewUnlocked(state.maxDepth, selectedCrew);
  const canLaunch = !state.activeRiftExpedition && !state.origin.activeJob && selectedUnlocked && selectedCrewUnlocked && state.shards >= selectedCost.shards && hasMaterials;

  const activeRoute = state.activeRiftExpedition ? riftRouteById(state.activeRiftExpedition.routeId) : null;
  const activeApproach = state.activeRiftExpedition ? riftApproachById(state.activeRiftExpedition.approachId) : null;
  const activeCrew = state.activeRiftExpedition ? crewById(state.activeRiftExpedition.crewId) : null;
  const activeProgress = state.activeRiftExpedition
    ? ((state.activeRiftExpedition.duration - state.activeRiftExpedition.remaining) / state.activeRiftExpedition.duration) * 100
    : 0;

  return (
    <div className="rift-panel">
      <section className={`rift-console${activeRoute ? " is-active" : ""}`}>
        <span><Radar aria-hidden="true" /></span>
        <div>
          <small>{activeRoute ? "ÉQUIPE EN TRANSIT" : "STATION CARTOGRAPHIQUE"}</small>
          <h3>{activeRoute ? activeRoute.name : "Réseau disponible"}</h3>
          <p>{activeRoute && activeApproach && activeCrew ? `${activeCrew.name} · ${activeApproach.name.toLowerCase()} · retour dans ${formatDuration(state.activeRiftExpedition?.remaining ?? 0)}` : "Choisis une destination et prépare son convoi."}</p>
        </div>
        <strong>{state.surveyData}<small>données</small></strong>
        <div className="rift-progress" role="progressbar" aria-label="Progression de l'expédition de faille" aria-valuemin={0} aria-valuemax={100} aria-valuenow={activeProgress}>
          <i style={{ width: `${activeProgress}%` }} />
        </div>
        <dl>
          <div><dt>Retours</dt><dd>{state.riftExpeditionsCompleted}</dd></div>
          <div><dt>Routes</dt><dd>{Object.values(state.riftRouteCompletions).filter((count) => count > 0).length}/5</dd></div>
          <div><dt>Horizon</dt><dd>{state.originSignalFound ? "SIGNAL" : "INCONNU"}</dd></div>
        </dl>
      </section>

      <div className="rift-heading">
        <span>CARTE DES FAILLES</span>
        <small>{state.surveyData} données cartographiques</small>
      </div>

      {/* Nodes stay in narrative order in the DOM; CSS only changes their map
          placement, preserving sensible keyboard and screen-reader navigation. */}
      <div className="rift-map" aria-label="Destinations du réseau de failles">
        {RIFT_ROUTES.map((route) => {
          const unlocked = riftRouteUnlocked(state.surveyData, route);
          const selected = selectedRoute.id === route.id;
          const completions = state.riftRouteCompletions[route.id];
          return (
            <button
              className={`rift-node rift-node--${route.tone}${selected ? " is-selected" : ""}${unlocked ? " is-unlocked" : " is-locked"}`}
              type="button"
              onClick={() => dispatch({ type: "SELECT_RIFT_ROUTE", id: route.id })}
              aria-pressed={selected}
              key={route.id}
            >
              <b>{String(route.index + 1).padStart(2, "0")}</b>
              <span>{route.name}</span>
              <small>{unlocked ? completions > 0 ? `${completions} retour${completions > 1 ? "s" : ""}` : "À EXPLORER" : `${route.requiredSurvey} DONNÉES`}</small>
              {unlocked ? completions > 0 ? <Check aria-hidden="true" /> : <CircleDotDashed aria-hidden="true" /> : <Lock aria-hidden="true" />}
            </button>
          );
        })}
        <button type="button" onClick={onOrigin} className={`rift-origin${state.originSignalFound ? " is-detected" : ""}`}>
          <Sparkles aria-hidden="true" />
          <span><small>SIGNAL TERMINAL</small><strong>Faille originelle</strong></span>
          <b>{state.originSignalFound ? "EXPLORER" : "???"}</b>
        </button>
      </div>
      {!state.originSignalFound && <p className="rift-origin-requirement">Signal originel : {Math.min(32, state.surveyData)}/32 données · {Object.values(state.riftRouteCompletions).filter((count) => count > 0).length}/5 routes explorées</p>}

      <section className={`rift-briefing rift-briefing--${selectedRoute.tone}`}>
        <div className="rift-briefing__heading">
          <span><Map aria-hidden="true" /></span>
          <div><small>{selectedRoute.sector}</small><h3>{selectedRoute.name}</h3></div>
          <b>{selectedCompletions} retour{selectedCompletions > 1 ? "s" : ""}</b>
        </div>
        <p>{selectedRoute.description}</p>

        {!selectedUnlocked ? (
          <div className="rift-briefing__locked"><Lock aria-hidden="true" /> Encore {selectedRoute.requiredSurvey - state.surveyData} données pour tracer cette route.</div>
        ) : (
          <>
            <div className="rift-heading"><span>CHEF D'EXPÉDITION</span><small>Bonus qui progresse à chaque retour</small></div>
            <div className="rift-crew-selector" role="group" aria-label="Chef d'expédition">
              {CREW.map((member) => {
                const unlocked = crewUnlocked(state.maxDepth, member);
                const selected = selectedCrew.id === member.id;
                const deployed = activeCrew?.id === member.id || state.origin.activeJob?.crewId === member.id;
                const xp = state.crewXp[member.id];
                const level = crewLevel(xp);
                const nextLevel = crewNextLevelXp(xp);
                const fatigue = state.crewFatigue[member.id];
                const levelStart = CREW_LEVEL_THRESHOLDS[level - 1];
                const xpProgress = nextLevel === null ? 100 : Math.min(100, ((xp - levelStart) / (nextLevel - levelStart)) * 100);
                return (
                  <button
                    className={`rift-crew-card rift-crew-card--${member.accent}${selected ? " is-selected" : ""}${deployed ? " is-deployed" : ""}`}
                    type="button"
                    disabled={!unlocked}
                    aria-pressed={selected}
                    onClick={() => dispatch({ type: "SELECT_CREW", id: member.id })}
                    key={member.id}
                  >
                    <span className="rift-crew-card__portrait">{unlocked ? <UserRound aria-hidden="true" /> : <Lock aria-hidden="true" />}</span>
                    <span className="rift-crew-card__identity">
                      <strong>{unlocked ? member.name : "Inconnu"}</strong>
                      <small>{unlocked ? `${member.role} · Niv. ${level}` : `Rejoint à ${member.unlockDepth} m`}</small>
                    </span>
                    {unlocked && (
                      <>
                        <span className="rift-crew-card__bonus">{crewBonusLabel(member, xp, fatigue)}</span>
                        <span className="rift-crew-card__meter" aria-hidden="true"><i style={{ width: `${xpProgress}%` }} /></span>
                        <span className="rift-crew-card__xp">{nextLevel === null ? "Niveau maximal" : `${xp}/${nextLevel} XP`}</span>
                        <span className="rift-crew-card__condition"><BatteryMedium aria-hidden="true" /> Forme {Math.round(100 - fatigue)} %</span>
                      </>
                    )}
                    {deployed && <em>EN MISSION</em>}
                  </button>
                );
              })}
            </div>
            <p className="rift-crew-note"><UserRound aria-hidden="true" /><span><strong>{selectedCrew.name} · {selectedCrew.specialty}</strong>{selectedCrew.description}</span></p>
            <CrewTalents state={state} dispatch={dispatch} />

            <div className="rift-heading"><span>PROTOCOLE DE MISSION</span><small>Modifie temps et butin</small></div>
            <div className="rift-approaches" role="group" aria-label="Protocole d'expédition">
              {RIFT_APPROACHES.map((approach) => {
                const Icon = approachIcons[approach.id];
                const active = selectedApproach.id === approach.id;
                return (
                  <button className={active ? "is-active" : ""} type="button" aria-pressed={active} onClick={() => dispatch({ type: "SELECT_RIFT_APPROACH", id: approach.id })} key={approach.id}>
                    <Icon aria-hidden="true" />
                    <strong>{approach.name}</strong>
                    <small>{approach.description}</small>
                  </button>
                );
              })}
            </div>

            {selectedCompletions > 0 && <div className={`rift-variant${plan.matched ? " is-ready" : ""}`}>
              <small>VARIANTE · {state.origin.variantDiscoveries.includes(plan.variant.key) ? "DÉJÀ ÉTUDIÉE" : "NOUVEAU RELEVÉ"}</small>
              <strong>{plan.variant.name}</strong>
              <p>{crewById(plan.variant.crewId).name} + {riftApproachById(plan.variant.approachId).name} : +20 % de pièces et de données labo, +1 cartographie.</p>
              <span>{plan.matched ? "Équipe adaptée · bonus inclus dans le manifeste" : "Mission classique possible sans cette association"}</span>
              {!plan.matched && <button type="button" className="origin-link" disabled={!crewUnlocked(state.maxDepth, crewById(plan.variant.crewId))}
                onClick={() => {
                  dispatch({ type: "SELECT_CREW", id: plan.variant.crewId });
                  dispatch({ type: "SELECT_RIFT_APPROACH", id: plan.variant.approachId });
                }}><UserRound aria-hidden="true" />Préparer cette variante</button>}
            </div>}

            <div className="rift-manifest">
              <div>
                <small>PRÉPARATION</small>
                <span className={state.shards >= selectedCost.shards ? "is-ready" : ""}><Sparkles aria-hidden="true" /> {formatNumber(selectedCost.shards)} éclats</span>
                {Object.entries(selectedCost.materials).map(([id, amount]) => (
                  <span className={state.industryMaterials[id as IndustryMaterialId] >= (amount ?? 0) ? "is-ready" : ""} key={id}>
                    {INDUSTRY_MATERIALS[id as IndustryMaterialId].shortName} {state.industryMaterials[id as IndustryMaterialId]}/{amount}
                  </span>
                ))}
              </div>
              <div>
                <small>RETOUR PRÉVU</small>
                <span><Coins aria-hidden="true" /> {formatNumber(selectedRewards.coins)} pièces</span>
                <span><Database aria-hidden="true" /> {selectedRewards.research} données labo</span>
                <span><Route aria-hidden="true" /> +{selectedRewards.survey} cartographie</span>
                <span><UserRound aria-hidden="true" /> +{plan.manifest.xp} XP · {selectedCrew.name}</span>
                {selectedRewards.echoes > 0 && <span><Sparkles aria-hidden="true" /> {selectedRewards.echoes} échos</span>}
              </div>
            </div>

            <button className="rift-launch" type="button" disabled={!canLaunch} onClick={() => dispatch({ type: "START_RIFT_EXPEDITION" })}>
              {state.activeRiftExpedition || state.origin.activeJob ? <><Clock3 aria-hidden="true" />UNE ÉQUIPE EST DÉJÀ PARTIE</> : <><Send aria-hidden="true" />LANCER AVEC {selectedCrew.name.toUpperCase()} · {formatDuration(selectedDuration)}</>}
            </button>
          </>
        )}
      </section>

      <div className="rift-heading"><span>RAPPORTS DE RETOUR</span><small>Les huit derniers trajets</small></div>
      <div className="rift-reports">
        {state.riftReports.length === 0 ? (
          <p>Aucun rapport reçu. Le réseau attend sa première équipe.</p>
        ) : state.riftReports.map((report) => {
          const route = riftRouteById(report.routeId);
          const approach = riftApproachById(report.approachId);
          const member = crewById(report.crewId);
          return (
            <div className="rift-report" key={report.id}>
              <span><Check aria-hidden="true" /></span>
              <div><strong>{route.name}{report.variantKey ? " · Variante étudiée" : ""}</strong><small>{member.name} · {approach.name} · +{report.crewXp} XP · +{report.rewards.survey} cartographie · {formatNumber(report.rewards.coins)} pièces</small></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
