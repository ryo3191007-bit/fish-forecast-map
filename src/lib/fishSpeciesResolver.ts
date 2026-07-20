import { createStaticFishSpecies, fishSpeciesIdByName, type FishSpecies, type FishSpeciesAlias, type FishSpeciesId, type FishSpeciesResolution } from "@/domain/fishing";

export function createFishSpeciesMatchKey(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase();
}

export const staticFishSpeciesAliases: readonly FishSpeciesAlias[] = [
  ...Object.entries(fishSpeciesIdByName).map(([aliasName, fishSpeciesId], index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    fishSpeciesId, aliasName, matchKey: createFishSpeciesMatchKey(aliasName), approvalStatus: "approved" as const, isActive: true,
  })),
  { id: "00000000-0000-4000-8000-000000000100", fishSpeciesId: "chinu", aliasName: "黒鯛", matchKey: "黒鯛", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000101", fishSpeciesId: "chinu", aliasName: "クロダイ", matchKey: "クロダイ", approvalStatus: "approved", isActive: true },
];

export const staticFishSpecies: readonly FishSpecies[] = createStaticFishSpecies();

export function resolveFishSpeciesName(input: string, species: readonly FishSpecies[], aliases: readonly FishSpeciesAlias[]): FishSpeciesResolution {
  const matchKey = createFishSpeciesMatchKey(input);
  if (!matchKey) return { status: "unresolved", input, matchKey: null, reason: "empty" };
  const matches = aliases.filter((alias) => alias.isActive && alias.approvalStatus === "approved" && alias.matchKey === matchKey);
  const candidateSpeciesIds = [...new Set(matches.map((alias) => alias.fishSpeciesId))];
  if (candidateSpeciesIds.length > 1) return { status: "conflict", input, matchKey, candidateSpeciesIds };
  const speciesId = candidateSpeciesIds[0];
  const canonical = species.find((item) => item.id === speciesId);
  if (!speciesId || !canonical) return { status: "unresolved", input, matchKey, reason: "not_registered" };
  return { status: "resolved", input, matchKey, speciesId, canonicalNameJa: canonical.nameJa, matchedAlias: matches[0].aliasName };
}

export function getCanonicalFishSpeciesName(speciesId: FishSpeciesId, species: readonly FishSpecies[]) {
  return species.find((item) => item.id === speciesId)?.nameJa ?? null;
}

export function resolveFishSpeciesId(input: string, species: readonly FishSpecies[], aliases: readonly FishSpeciesAlias[]) {
  const resolution = resolveFishSpeciesName(input, species, aliases);
  return resolution.status === "resolved" ? resolution.speciesId : null;
}

export function fishSpeciesNamesMatch(left: string, right: string, species: readonly FishSpecies[], aliases: readonly FishSpeciesAlias[]) {
  const leftId = resolveFishSpeciesId(left, species, aliases);
  const rightId = resolveFishSpeciesId(right, species, aliases);
  return leftId !== null && leftId === rightId;
}

export function filterByFishSpecies<T>(items: readonly T[], selectedName: string, getName: (item: T) => string, species: readonly FishSpecies[], aliases: readonly FishSpeciesAlias[]) {
  const selectedId = resolveFishSpeciesId(selectedName, species, aliases);
  const selected = species.find((item) => item.id === selectedId);
  return items.filter((item) => {
    const itemId = resolveFishSpeciesId(getName(item), species, aliases);
    return itemId !== null && (itemId === selectedId || (selected?.entityType === "species_group" && species.find((entry) => entry.id === itemId)?.parentGroupId === selectedId));
  });
}
