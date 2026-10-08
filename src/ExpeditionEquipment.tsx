import {
  Check,
  Compass,
  Gem,
  Hammer,
  Lamp,
  Lock,
  Pickaxe,
  ScanEye,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { Dispatch } from "react";
import { crewById, crewLevel } from "./crew";
import {
  CREW_TALENTS,
  RELICS,
  RELIC_SLOTS,
  TALENT_RESPEC_COST,
  ORIGIN_STAGES,
  type RelicId,
  type TalentId,
} from "./origin";
import { formatNumber, type GameState, type GameAction } from "./game";

export const relicIcons = {
  hammer: Hammer,
  engine: Settings2,
  compass: Compass,
  lens: ScanEye,
  chisel: Pickaxe,
  lantern: Lamp,
};
type Props = { state: GameState; dispatch: Dispatch<GameAction> };

export function CrewTalents({ state, dispatch }: Props) {
  const member = crewById(state.selectedCrewId);
  const selected = state.origin.talents[member.id];
  const unlocked = crewLevel(state.crewXp[member.id]) >= 3;
  return (
    <section className="crew-talents" aria-label={`Talents de ${member.name}`}>
      <div className="rift-heading">
        <span>TALENT · {member.name}</span>
        <small>
          {!unlocked
            ? "Niveau 3 requis"
            : selected
              ? `Changement : ${formatNumber(TALENT_RESPEC_COST)} éclats`
              : "Premier choix gratuit"}
        </small>
      </div>
      <div className="talent-options">
        {(["field", "study"] as TalentId[]).map((id) => {
          const talent = CREW_TALENTS[member.id][id];
          const active = selected === id;
          const cost = selected && !active ? TALENT_RESPEC_COST : 0;
          return (
            <button
              type="button"
              key={id}
              aria-pressed={active}
              className={active ? "is-selected" : ""}
              disabled={!unlocked || state.shards < cost}
              onClick={() =>
                dispatch({ type: "SELECT_CREW_TALENT", crewId: member.id, id })
              }
            >
              {!unlocked ? (
                <Lock aria-hidden="true" />
              ) : active ? (
                <Check aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              <span>
                <strong>{talent.name}</strong>
                <small>{talent.effect}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function RelicCollection({ state, dispatch }: Props) {
  const { ownedRelics, equippedRelics } = state.origin;
  return (
    <section className="relic-collection" aria-label="Collection de reliques">
      <div className="origin-section-heading">
        <Gem aria-hidden="true" />
        <div>
          <small>HÉRITAGE ORIGINEL</small>
          <h3>Les outils des premières</h3>
        </div>
        <b>{ownedRelics.length}/6</b>
      </div>
      <div className="relic-slots" aria-label="Reliques équipées">
        {Array.from({ length: RELIC_SLOTS }, (_, slot) => {
          const relic = RELICS.find((item) => item.id === equippedRelics[slot]);
          const Icon = relic ? relicIcons[relic.id] : Gem;
          return (
            <div key={slot}>
              <Icon aria-hidden="true" />
              <span>
                <small>EMPLACEMENT {slot + 1}</small>
                <strong>{relic?.name ?? "Libre"}</strong>
              </span>
            </div>
          );
        })}
      </div>
      <p className="origin-hint">
        {equippedRelics.length === RELIC_SLOTS
          ? "Deux reliques équipées. Retire-en une pour changer la combinaison."
          : "Deux emplacements. Les reliques conservées traversent les cycles."}{" "}
        Les convois déjà partis gardent leurs bonus de départ.
      </p>
      <div className="relic-grid">
        {RELICS.map((relic) => {
          const owned = ownedRelics.includes(relic.id);
          const equipped = equippedRelics.includes(relic.id);
          const Icon = relicIcons[relic.id];
          const stage = ORIGIN_STAGES.find((entry) =>
            (entry.relics as readonly RelicId[]).includes(relic.id),
          )!;
          return (
            <article
              className={`relic-item${owned ? " is-owned" : ""}${equipped ? " is-equipped" : ""}`}
              key={relic.id}
            >
              <Icon aria-hidden="true" />
              <small>{stage.name}</small>
              <h4>{relic.name}</h4>
              <b>{relic.effect}</b>
              <p>{relic.story}</p>
              <button
                type="button"
                disabled={
                  !owned || (!equipped && equippedRelics.length >= RELIC_SLOTS)
                }
                aria-pressed={equipped}
                onClick={() => dispatch({ type: "TOGGLE_RELIC", id: relic.id })}
              >
                {!owned ? (
                  <Lock aria-hidden="true" />
                ) : equipped ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Gem aria-hidden="true" />
                )}
                {!owned ? "À retrouver" : equipped ? "Retirer" : "Équiper"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
