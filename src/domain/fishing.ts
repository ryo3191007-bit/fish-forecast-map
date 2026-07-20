export const fishSpeciesDefinitions = [
  ["aji", "アジ", "exact_species", null, null], ["saba", "サバ", "exact_species", null, null],
  ["iwashi", "イワシ", "exact_species", null, null], ["aomono", "青物", "species_group", null, null],
  ["shiira", "シイラ", "exact_species", null, null], ["hirame", "ヒラメ", "exact_species", null, null],
  ["magochi", "マゴチ", "exact_species", null, null], ["seabass", "シーバス", "exact_species", null, null],
  ["aoriika", "アオリイカ", "squid_species", null, null], ["yariika", "ヤリイカ", "squid_species", null, null],
  ["kouika", "コウイカ", "squid_species", null, null], ["chinu", "チヌ", "exact_species", null, null],
  ["madai", "真鯛", "exact_species", null, null], ["kisu", "キス", "exact_species", null, null],
  ["rockfish", "根魚", "species_group", null, null],
  ["buri", "ブリ", "exact_species", "aomono", null], ["hiramasa", "ヒラマサ", "exact_species", "aomono", null],
  ["kanpachi", "カンパチ", "exact_species", "aomono", null], ["sawara", "サワラ", "exact_species", "aomono", null],
  ["kasago", "カサゴ", "exact_species", "rockfish", null], ["oniokoze", "オニオコゼ", "exact_species", "rockfish", null],
  ["kijihata", "キジハタ", "exact_species", "rockfish", "ハタ類"], ["oomonhata", "オオモンハタ", "exact_species", "rockfish", "ハタ類"],
  ["akahata", "アカハタ", "exact_species", "rockfish", "ハタ類"], ["mahata", "マハタ", "exact_species", "rockfish", "ハタ類"],
  ["aohata", "アオハタ", "exact_species", "rockfish", "ハタ類"], ["kue", "クエ", "exact_species", "rockfish", "ハタ類"],
  ["kensakiika", "ケンサキイカ", "squid_species", null, null], ["surumeika", "スルメイカ", "squid_species", null, null],
  ["madako", "マダコ", "cephalopod_species", null, null], ["isaki", "イサキ", "exact_species", null, null],
  ["mejina", "メジナ", "exact_species", null, null], ["tachiuo", "タチウオ", "exact_species", null, null],
  ["kawahagi", "カワハギ", "exact_species", null, null], ["umazurahagi", "ウマヅラハギ", "exact_species", null, null],
  ["konoshiro", "コノシロ", "exact_species", null, null], ["sayori", "サヨリ", "exact_species", null, null],
  ["bora", "ボラ", "exact_species", null, null], ["maanago", "マアナゴ", "exact_species", null, null],
  ["ishidai", "イシダイ", "exact_species", null, null], ["ishigakidai", "イシガキダイ", "exact_species", null, null],
  ["akakamasu", "アカカマス", "exact_species", null, null], ["yamatokamasu", "ヤマトカマス", "exact_species", null, null],
] as const;

export const fishSpeciesIds = fishSpeciesDefinitions.map((row) => row[0]);
export type FishSpeciesId = (typeof fishSpeciesDefinitions)[number][0];
export const fishSpeciesNames = fishSpeciesDefinitions.map((row) => row[1]);
export type FishSpeciesName = (typeof fishSpeciesDefinitions)[number][1];
export type FishSpeciesEntityType = "exact_species" | "species_group" | "squid_species" | "cephalopod_species";
export type SpeciesCategory = "fish" | "category" | "squid" | "cephalopod";
export const fishSpeciesIdByName = Object.fromEntries(fishSpeciesDefinitions.map(([id, name]) => [name, id])) as Readonly<Record<FishSpeciesName, FishSpeciesId>>;

export type FishSpecies = { id: FishSpeciesId; nameJa: FishSpeciesName; category: SpeciesCategory; entityType: FishSpeciesEntityType; isSelectable: boolean; parentGroupId: FishSpeciesId | null; uiSubgroup: string | null; displayOrder: number; seasonMonths: number[] };
export const createStaticFishSpecies = (): FishSpecies[] => fishSpeciesDefinitions.map(([id, nameJa, entityType, parentGroupId, uiSubgroup], index) => ({ id, nameJa, entityType, parentGroupId, uiSubgroup, isSelectable: entityType !== "species_group", displayOrder: index + 1, category: entityType === "species_group" ? "category" : entityType === "squid_species" ? "squid" : entityType === "cephalopod_species" ? "cephalopod" : "fish", seasonMonths: [] }));
export const legacySpeciesLabel = (species: FishSpeciesName) => species === "青物" || species === "根魚" ? `${species}（旧分類）` : species;

export type FishSpeciesAliasApprovalStatus = "pending" | "approved" | "rejected";
export type FishSpeciesAlias = { id: string; fishSpeciesId: FishSpeciesId; aliasName: string; matchKey: string; approvalStatus: FishSpeciesAliasApprovalStatus; isActive: boolean };
export type FishSpeciesResolution = { status: "resolved"; input: string; matchKey: string; speciesId: FishSpeciesId; canonicalNameJa: FishSpeciesName; matchedAlias: string } | { status: "unresolved"; input: string; matchKey: string | null; reason: "empty" | "not_registered" } | { status: "conflict"; input: string; matchKey: string; candidateSpeciesIds: FishSpeciesId[] };
export type FishingMethod = "ジギング" | "キャスティング" | "コマセ" | "泳がせ" | "サビキ" | "エギング" | "その他";
export type ForecastScore = { score: number; reasons: string[] };
export type FishingReport = { id: string; reportDate: string; species: FishSpeciesName; spotId: string; spotName: string; areaName: string; latitude: number; longitude: number; catchCount: number; sizeCm: number; method: FishingMethod; sourceName: string; sourceUrl: string; forecast: ForecastScore };
