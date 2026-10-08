/** Validate paid jobs before migration; never silently discard an investment. */
import { CREW } from "./crew.ts";
import {
  ORIGIN_STAGES,
  RELICS,
  RELIC_SLOTS,
  type OriginProgress,
} from "./origin.ts";
import { VARIANT_KEYS } from "./expeditionPlanning.ts";
import type { RiftExpeditionJob } from "./riftNetwork.ts";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Archive originelle invalide");
  return value as Record<string, unknown>;
}
function number(value: unknown, max = Number.MAX_VALUE): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw new Error("Valeur originelle invalide");
}
function list(
  value: unknown,
  allowed: ReadonlySet<string>,
  max: number,
): string[] {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    new Set(value).size !== value.length ||
    value.some((id) => typeof id !== "string" || !allowed.has(id))
  )
    throw new Error("Collection originelle invalide");
  return value;
}
export function validateOriginProgress(
  value: unknown,
): asserts value is OriginProgress {
  const data = object(value);
  const stages = new Set(ORIGIN_STAGES.map((stage) => stage.id as string));
  const relicIds = new Set(RELICS.map((relic) => relic.id as string));
  const owned = list(data.ownedRelics, relicIds, RELICS.length);
  const equipped = list(data.equippedRelics, relicIds, RELIC_SLOTS);
  if (equipped.some((id) => !owned.includes(id)))
    throw new Error("Relique non possédée");
  list(data.variantDiscoveries, VARIANT_KEYS, VARIANT_KEYS.size);
  const visits = object(data.visits);
  for (const stage of ORIGIN_STAGES) {
    number(visits[stage.id], 2);
    if (!Number.isInteger(visits[stage.id])) throw new Error("Visite invalide");
  }
  const talents = object(data.talents);
  for (const member of CREW) {
    if (![null, "field", "study"].includes(talents[member.id] as string | null))
      throw new Error("Talent inconnu");
  }
  if (
    data.awaitingChoice !== null &&
    !stages.has(data.awaitingChoice as string)
  )
    throw new Error("Découverte inconnue");
  if (data.activeJob !== null) {
    const job = object(data.activeJob);
    if (
      !stages.has(job.stageId as string) ||
      !CREW.some((member) => member.id === job.crewId) ||
      data.awaitingChoice !== null
    )
      throw new Error("Convoi originel invalide");
    number(job.duration);
    number(job.remaining);
    number(job.xp);
    number(job.fatigue, 40);
    if (
      (job.duration as number) < 1 ||
      (job.remaining as number) > (job.duration as number)
    )
      throw new Error("Durée originelle invalide");
  }
}
export function validateRiftManifest(
  value: unknown,
): asserts value is NonNullable<RiftExpeditionJob["manifest"]> {
  const manifest = object(value);
  const rewards = object(manifest.rewards);
  for (const key of ["coins", "research", "echoes", "survey"])
    number(rewards[key]);
  number(manifest.xp);
  number(manifest.fatigue, 40);
  if (
    manifest.variantKey !== null &&
    !VARIANT_KEYS.has(manifest.variantKey as string)
  )
    throw new Error("Variante inconnue");
}
