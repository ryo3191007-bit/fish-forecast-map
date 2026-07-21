import { createStaticFishSpecies, fishSpeciesIdByName, type FishSpecies, type FishSpeciesAlias, type FishSpeciesId, type FishSpeciesResolution } from "@/domain/fishing";

export function createFishSpeciesMatchKey(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase();
}

export const staticFishSpeciesAliases: readonly FishSpeciesAlias[] = [
  ...Object.entries(fishSpeciesIdByName).map(([aliasName, fishSpeciesId], index) => ({
    id: `00000000-0000-4000-8000-${String(index < 15 ? index + 1 : index + 85).padStart(12, "0")}`,
    fishSpeciesId, aliasName, matchKey: createFishSpeciesMatchKey(aliasName), approvalStatus: "approved" as const, isActive: true,
  })).filter((alias) => alias.fishSpeciesId !== "yariika"),
  { id: "00000000-0000-4000-8000-000000000016", fishSpeciesId: "chinu", aliasName: "黒鯛", matchKey: "黒鯛", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000017", fishSpeciesId: "chinu", aliasName: "クロダイ", matchKey: "クロダイ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000200", fishSpeciesId: "aoriika", aliasName: "ミズイカ", matchKey: "ミズイカ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000201", fishSpeciesId: "aoriika", aliasName: "モイカ", matchKey: "モイカ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000202", fishSpeciesId: "kisu", aliasName: "シロギス", matchKey: "シロギス", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000203", fishSpeciesId: "kisu", aliasName: "キスゴ", matchKey: "キスゴ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000204", fishSpeciesId: "seabass", aliasName: "スズキ", matchKey: "スズキ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000300", fishSpeciesId: "kasago", aliasName: "アラカブ", matchKey: "アラカブ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000301", fishSpeciesId: "kasago", aliasName: "ガシラ", matchKey: "ガシラ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000302", fishSpeciesId: "isaki", aliasName: "イッサキ", matchKey: "イッサキ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000303", fishSpeciesId: "kijihata", aliasName: "アコウ", matchKey: "アコウ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000304", fishSpeciesId: "oniokoze", aliasName: "オグシ", matchKey: "オグシ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000305", fishSpeciesId: "madai", aliasName: "マチャ", matchKey: "マチャ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000306", fishSpeciesId: "madai", aliasName: "チャンイオ", matchKey: "チャンイオ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000307", fishSpeciesId: "buri", aliasName: "ヤズ", matchKey: "ヤズ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000308", fishSpeciesId: "buri", aliasName: "ハマチ", matchKey: "ハマチ", approvalStatus: "approved", isActive: true },
  { id: "00000000-0000-4000-8000-000000000309", fishSpeciesId: "sawara", aliasName: "サゴシ", matchKey: "サゴシ", approvalStatus: "approved", isActive: true },
  ...([
    ["310", "seabass", "シーバス"], ["311", "seabass", "セイゴ"], ["312", "seabass", "フッコ"],
    ["313", "kensakiika", "ケンサキイカ"], ["314", "kensakiika", "アカイカ"], ["315", "kensakiika", "ササイカ"],
    ["316", "hiramasa", "ヒラス"], ["317", "kanpachi", "ネリゴ"], ["318", "mejina", "クロ"],
    ["319", "chinu", "メイタ"], ["320", "konoshiro", "コハダ"], ["321", "konoshiro", "ツナシ"],
    ["322", "bora", "イナ"], ["323", "kue", "アラ"], ["324", "hirame", "オオクチ"],
    ["325", "maaji", "豆アジ"], ["326", "maaji", "ゼンゴ"], ["327", "buri", "ワカナ"],
    ["328", "madai", "ホンダイ"], ["329", "madai", "ジャミ"], ["330", "madai", "タテコ"],
  ] as const).map(([suffix, fishSpeciesId, aliasName]) => ({ id: `00000000-0000-4000-8000-000000000${suffix}`, fishSpeciesId, aliasName, matchKey: createFishSpeciesMatchKey(aliasName), approvalStatus: "approved" as const, isActive: true })),
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
  const isDescendantOf = (candidateId: FishSpeciesId, ancestorId: FishSpeciesId) => {
    const visited = new Set<FishSpeciesId>();
    let current = species.find((entry) => entry.id === candidateId);
    while (current?.parentGroupId && !visited.has(current.id)) {
      if (current.parentGroupId === ancestorId) return true;
      visited.add(current.id);
      current = species.find((entry) => entry.id === current?.parentGroupId);
    }
    return false;
  };
  return items.filter((item) => {
    const itemId = resolveFishSpeciesId(getName(item), species, aliases);
    return itemId !== null && selectedId !== null && (itemId === selectedId || (selected?.entityType === "species_group" && isDescendantOf(itemId, selectedId)));
  });
}
