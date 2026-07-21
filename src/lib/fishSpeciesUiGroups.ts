import type { FishSpecies, FishSpeciesId } from "@/domain/fishing";

export type FishSpeciesUiGroup = {
  label: string;
  items: FishSpecies[];
};

const parentGroupLabels: Partial<Record<FishSpeciesId, string>> = {
  aji: "アジ",
  saba: "サバ",
  iwashi: "イワシ",
  mebaru: "メバル",
  kamasu: "カマス",
};

const legacyAggregateIds = new Set<FishSpeciesId>(["aomono", "rockfish"]);
const cephalopodTypes = new Set(["squid_species", "cephalopod_species"]);

export function groupSelectableFishSpecies(
  species: FishSpecies[],
  options: { includeLegacyAggregates?: boolean } = {},
): FishSpeciesUiGroup[] {
  const groups = new Map<string, FishSpecies[]>();
  const add = (label: string, item: FishSpecies) => {
    const items = groups.get(label) ?? [];
    items.push(item);
    groups.set(label, items);
  };

  for (const item of species) {
    if (!item.isActive || !item.isSelectable) {
      if (options.includeLegacyAggregates && legacyAggregateIds.has(item.id)) add("グループ", item);
      continue;
    }

    if (item.entityType === "species_group") add("グループ", item);
    else if (item.parentGroupId && parentGroupLabels[item.parentGroupId]) add(parentGroupLabels[item.parentGroupId]!, item);
    else if (item.parentGroupId === "aomono") add("青物系", item);
    else if (item.uiSubgroup === "ハタ類") add("根魚 > ハタ類", item);
    else if (item.parentGroupId === "rockfish") add("根魚（その他）", item);
    else if (cephalopodTypes.has(item.entityType)) add("イカ・頭足類", item);
    else add("その他", item);
  }

  return Array.from(groups, ([label, items]) => ({ label, items }));
}
