import { ArrowRight, BookOpen, Check, Clock3, Flag, Hammer, Sparkles, Sunrise, Trophy, X } from "lucide-react";
import type { Dispatch } from "react";
import { INDUSTRY_MATERIALS, formatDuration, formatNumber, type GameAction, type GameState, type IndustryMaterialId } from "./game";
import { CHALLENGES, DAWN_PROJECTS, canStartDawnProject, dawnRequirements } from "./campaign";
import { campaignChapters, nextCampaignStep, type Destination } from "./progression";

interface Props { state: GameState; dispatch: Dispatch<GameAction>; onNavigate: (destination: Destination) => void }

export function CampaignCompass({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  const step = nextCampaignStep(state);
  return <button className="campaign-compass" type="button" onClick={onOpen} aria-label={`Carnet : ${step.title}`}>
    <BookOpen aria-hidden="true" /><span><small>{state.campaign.completed ? "AVENTURE ACCOMPLIE" : "CAP SUR LA PROCHAINE ÉTAPE"}</small><strong>{step.title}</strong></span>
    <span className="campaign-compass__count">{formatNumber(step.current)} / {formatNumber(step.target)}</span><ArrowRight aria-hidden="true" />
  </button>;
}

export function CampaignPanel({ state, dispatch, onNavigate }: Props) {
  const chapters = campaignChapters(state);
  const step = nextCampaignStep(state);
  const stage = state.campaign.stage;
  const project = DAWN_PROJECTS[stage];
  const job = state.campaign.project;
  const ready = canStartDawnProject(state);
  const requirements = dawnRequirements(state);
  const originReached = state.origin.visits.heart > 0;
  const challenge = state.campaign.challenge;
  return <div className="campaign-panel">
    {!state.campaign.completed && <section className="campaign-next" aria-label="Prochaine étape">
      <small>PROCHAINE ÉTAPE</small><h3>{step.title}</h3><p>{step.detail}</p>
      <progress aria-label={step.title} value={step.current} max={step.target} />
      <div className="campaign-action-row"><span>{formatNumber(step.current)} / {formatNumber(step.target)}</span>
        {step.destination !== "journal" && <button type="button" onClick={() => onNavigate(step.destination)}>{step.action}<ArrowRight aria-hidden="true" /></button>}
      </div>
    </section>}
    <details className="campaign-history" open={!originReached}>
    <summary>L'aventure · {chapters.filter((chapter) => chapter.complete).length} / {chapters.length} chapitres</summary>
    <ol className="chapter-list" aria-label="Chapitres de l'aventure">
      {chapters.map((chapter, index) => <li key={chapter.title} className={chapter.complete ? "is-complete" : index === chapters.findIndex((entry) => !entry.complete) ? "is-current" : ""}>
        <span className="chapter-index">{chapter.complete ? <Check aria-label="Accompli" /> : String(index + 1).padStart(2, "0")}</span>
        <div><h3>{chapter.title}</h3><p>{chapter.summary}</p></div>
      </li>)}
    </ol>
    </details>
    {originReached && !state.campaign.completed && project && <section className="dawn-project" aria-label="Chantier de l'Aube">
      <div className="dawn-art" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}assets/dawn-vault.png)` }}>
        <span>CHANTIER {stage + 1} / {DAWN_PROJECTS.length}</span><h3>{project.name}</h3>
      </div>
      <p>{project.story}</p>
      <ul className="campaign-requirements">{requirements.map((requirement) => <li key={requirement.label}>
        <span>{requirement.current >= requirement.target ? <Check aria-hidden="true" /> : <Flag aria-hidden="true" />}{requirement.label}</span>
        <button type="button" onClick={() => onNavigate(requirement.destination)} aria-label={`${requirement.label} : ${requirement.current} sur ${requirement.target}`}>{requirement.current}/{requirement.target}<ArrowRight aria-hidden="true" /></button>
      </li>)}</ul>
      {job ? <div className="project-running" role="status"><Clock3 aria-hidden="true" /><strong>Chantier en cours · {formatDuration(job.remaining)}</strong><progress aria-label="Chantier" value={job.duration - job.remaining} max={job.duration} /><small>Matériaux déjà engagés · conservé entre les cycles</small></div>
        : <>
          <div className="project-costs"><span className={state.shards >= project.shards ? "is-ready" : ""}><Sparkles aria-hidden="true" />{formatNumber(project.shards)} éclats <small>/{formatNumber(state.shards)} disponibles</small></span>
            {Object.entries(project.materials).map(([id, amount]) => <span key={id} className={state.industryMaterials[id as IndustryMaterialId] >= amount ? "is-ready" : ""}>{amount} {INDUSTRY_MATERIALS[id as IndustryMaterialId].shortName.toLowerCase()}<small>/{formatNumber(state.industryMaterials[id as IndustryMaterialId])} en réserve</small></span>)}
          </div>
          <button type="button" className="campaign-primary" disabled={!ready} onClick={() => dispatch({ type: "START_DAWN_PROJECT" })}><Hammer aria-hidden="true" />{project.verb}<span>{formatDuration(project.duration)}</span></button>
        </>}
      {stage > 0 && <p className="project-memory">{DAWN_PROJECTS[stage - 1].result}</p>}
    </section>}
    {state.campaign.completed && <>
      <section className="campaign-ending" aria-label="Fin de l'aventure">
        <img src={`${import.meta.env.BASE_URL}assets/dawn-vault.png`} alt="Le cœur lumineux de la montagne" />
        <div><Sunrise aria-hidden="true" /><small>LA MINE DES ÉCLATS · ÉPILOGUE</small><h3>L'Aube retrouvée</h3></div>
        <p>Le premier rayon remonte les rails. Il traverse les ateliers, effleure les outils et s'arrête un instant sur les mains de celles qui les ont portés.</p>
        <p>Mica ouvre la porte de la galerie. Braise pose enfin son marteau. Nova ne compte plus rien. Opale retrouve la dernière page ; Silex et Aurore la lisent avec elle.</p>
        <p>La montagne ne cachait pas une fortune. Elle gardait un matin pour les personnes qui prendraient le temps de le retrouver.</p>
        <p className="ending-last">Il y a encore de la roche à creuser. Mais désormais, il y a aussi un endroit où revenir.</p>
        <dl className="campaign-stats"><div><dt>Filons ouverts</dt><dd>{formatNumber(state.rocksBroken)}</dd></div><div><dt>Profondeur record</dt><dd>{formatNumber(state.maxDepth)} m</dd></div><div><dt>Remontées</dt><dd>{state.expeditions}</dd></div><div><dt>Reliques</dt><dd>{state.origin.ownedRelics.length} / 6</dd></div></dl>
        <button className="campaign-primary" type="button" onClick={() => onNavigate("mine")}><Sparkles aria-hidden="true" />RETOURNER À LA MINE</button>
      </section>
      <section className="campaign-challenges" aria-label="Défis facultatifs"><h3><Trophy aria-hidden="true" /> Après l'aube</h3>
        <p>Trois distinctions, aucune obligation. La campagne reste accomplie, quel que soit le résultat.</p>
        {CHALLENGES.map((definition) => {
          const active = challenge?.id === definition.id;
          const record = state.campaign.records[definition.id];
          const busy = definition.id === "voyager" && !!(state.activeRiftExpedition || state.origin.activeJob);
          return <article className="challenge-entry" key={definition.id}>
            <h4>{definition.name}{record !== undefined && <Check aria-label="Distinction obtenue" />}</h4><p>{definition.rule}</p>
            <small>{definition.distinction}{record !== undefined ? ` · meilleur temps ${formatDuration(record)}` : ""}</small>
            {active ? <>
              <progress value={challenge.progress} max={definition.target} aria-label={definition.name} /><span>{challenge.progress}/{definition.target} {definition.unit} · {formatDuration(challenge.seconds)}</span>
              <button type="button" onClick={() => dispatch({ type: "ABANDON_CHALLENGE" })}><X aria-hidden="true" /> ARRÊTER L'ESSAI</button>
            </> : <button type="button" disabled={!!challenge || busy || definition.id === "steady" && state.durability <= 0} onClick={() => dispatch({ type: "START_CHALLENGE", id: definition.id })}><Flag aria-hidden="true" />{busy ? "CONVOI EN ROUTE" : record !== undefined ? "REJOUER" : "ENTREPRENDRE"}</button>}
          </article>;
        })}
      </section>
    </>}
    <details className="campaign-log"><summary>Dernières nouvelles de la mine</summary>{state.journal.map((entry) => <p key={entry.id}>{entry.text}</p>)}</details>
  </div>;
}
