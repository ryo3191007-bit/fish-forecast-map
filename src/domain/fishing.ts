export const fishSpeciesDefinitions = [
  ["aji", "アジ", "species_group", null, null, true], ["saba", "サバ", "species_group", null, null, true],
  ["iwashi", "イワシ", "species_group", null, null, true], ["aomono", "青物", "species_group", null, null],
  ["shiira", "シイラ", "exact_species", null, null], ["hirame", "ヒラメ", "exact_species", null, null],
  ["magochi", "マゴチ", "exact_species", null, null], ["seabass", "スズキ", "exact_species", null, null],
  ["aoriika", "アオリイカ", "squid_species", null, null], ["yariika", "ヤリイカ（旧分類）", "squid_species", null, null, false, false],
  ["kouika", "コウイカ", "squid_species", null, null], ["chinu", "チヌ", "exact_species", null, null],
  ["madai", "真鯛", "exact_species", null, null], ["kisu", "キス", "exact_species", null, null],
  ["rockfish", "根魚", "species_group", null, null],
  ["buri", "ブリ", "exact_species", "aomono", null], ["hiramasa", "ヒラマサ", "exact_species", "aomono", null],
  ["kanpachi", "カンパチ", "exact_species", "aomono", null], ["sawara", "サワラ", "exact_species", "aomono", null],
  ["kasago", "カサゴ", "exact_species", "rockfish", null], ["oniokoze", "オニオコゼ", "exact_species", "rockfish", null],
  ["kijihata", "キジハタ", "exact_species", "rockfish", "ハタ類"], ["oomonhata", "オオモンハタ", "exact_species", "rockfish", "ハタ類"],
  ["akahata", "アカハタ", "exact_species", "rockfish", "ハタ類"], ["mahata", "マハタ", "exact_species", "rockfish", "ハタ類"],
  ["aohata", "アオハタ", "exact_species", "rockfish", "ハタ類"], ["kue", "クエ", "exact_species", "rockfish", "ハタ類"],
  ["kensakiika", "ヤリイカ", "squid_species", null, null], ["surumeika", "スルメイカ", "squid_species", null, null],
  ["madako", "マダコ", "cephalopod_species", null, null], ["isaki", "イサキ", "exact_species", null, null],
  ["mejina", "メジナ", "exact_species", null, null], ["tachiuo", "タチウオ", "exact_species", null, null],
  ["kawahagi", "カワハギ", "exact_species", null, null], ["umazurahagi", "ウマヅラハギ", "exact_species", null, null],
  ["konoshiro", "コノシロ", "exact_species", null, null], ["sayori", "サヨリ", "exact_species", null, null],
  ["bora", "ボラ", "exact_species", null, null], ["maanago", "マアナゴ", "exact_species", "anago", null],
  ["ishidai", "イシダイ", "exact_species", null, null], ["ishigakidai", "イシガキダイ", "exact_species", null, null],
  ["akakamasu", "アカカマス", "exact_species", "kamasu", null, false, true], ["yamatokamasu", "ヤマトカマス", "exact_species", "kamasu", null, false, true],
  ["maaji", "マアジ", "exact_species", "aji", null], ["maruaji", "マルアジ", "exact_species", "aji", null],
  ["masaba", "マサバ", "exact_species", "saba", null], ["gomasaba", "ゴマサバ", "exact_species", "saba", null],
  ["maiwashi", "マイワシ", "exact_species", "iwashi", null], ["katakuchiiwashi", "カタクチイワシ", "exact_species", "iwashi", null],
  ["urumeiwashi", "ウルメイワシ", "exact_species", "iwashi", null], ["mebaru", "メバル", "species_group", "rockfish", null, true],
  ["akamebaru", "アカメバル", "exact_species", "mebaru", null], ["kuromebaru", "クロメバル", "exact_species", "mebaru", null],
  ["shiromebaru", "シロメバル", "exact_species", "mebaru", null],
  ["kamasu", "カマス", "species_group", null, null, true],
  ["karei", "カレイ", "species_group", null, null, true], ["megochi", "メゴチ", "species_group", null, null, true],
  ["aigo", "アイゴ", "exact_species", null, null], ["haze", "ハゼ", "species_group", null, null, true],
  ["hirasuzuki", "ヒラスズキ", "exact_species", null, null], ["katsuo", "カツオ", "exact_species", null, null],
  ["eso", "エソ", "species_group", null, null, true], ["kyusen", "キュウセン", "exact_species", null, null],
  ["kichinu", "キチヌ", "exact_species", null, null], ["jindouika", "ジンドウイカ", "squid_species", null, null],
  ["mutsu", "ムツ", "exact_species", null, null], ["datsu", "ダツ", "exact_species", null, null],
  ["houbou", "ホウボウ", "exact_species", null, null], ["yagara", "ヤガラ", "species_group", null, null, true],
  ["yokofuedai", "ヨコフエダイ", "exact_species", null, null], ["fuedai", "フエダイ", "exact_species", null, null],
  ["anago", "アナゴ", "species_group", null, null, true],
  ["makogarei", "マコガレイ", "exact_species", "karei", null, false, true], ["nezumigochi", "ネズミゴチ", "exact_species", "megochi", null, false, true],
  ["mahaze", "マハゼ", "exact_species", "haze", null, false, true], ["urohaze", "ウロハゼ", "exact_species", "haze", null, false, true],
  ["maeso", "マエソ", "exact_species", "eso", null, false, true], ["wanieso", "ワニエソ", "exact_species", "eso", null, false, true],
  ["tokageeso", "トカゲエソ", "exact_species", "eso", null, false, true], ["akayagara", "アカヤガラ", "exact_species", "yagara", null, false, true],
  ["aoyagara", "アオヤガラ", "exact_species", "yagara", null, false, true],
] as const;

export const fishSpeciesIds = fishSpeciesDefinitions.map((row) => row[0]);
export type FishSpeciesId = (typeof fishSpeciesDefinitions)[number][0];
export const fishSpeciesNames = fishSpeciesDefinitions.map((row) => row[1]);
export type FishSpeciesName = (typeof fishSpeciesDefinitions)[number][1];
export type FishSpeciesEntityType = "exact_species" | "species_group" | "squid_species" | "cephalopod_species";
export type SpeciesCategory = "fish" | "category" | "squid" | "cephalopod";
export const fishSpeciesIdByName = Object.fromEntries(fishSpeciesDefinitions.map(([id, name]) => [name, id])) as Readonly<Record<FishSpeciesName, FishSpeciesId>>;

export type FishSpecies = { id: FishSpeciesId; nameJa: FishSpeciesName; category: SpeciesCategory; entityType: FishSpeciesEntityType; isSelectable: boolean; isActive: boolean; parentGroupId: FishSpeciesId | null; uiSubgroup: string | null; displayOrder: number; seasonMonths: number[] };
export const createStaticFishSpecies = (): FishSpecies[] => fishSpeciesDefinitions.map(([id, nameJa, entityType, parentGroupId, uiSubgroup, isSelectable, isActive], index) => ({ id, nameJa, entityType, parentGroupId, uiSubgroup, isSelectable: isSelectable ?? entityType !== "species_group", isActive: isActive ?? true, displayOrder: index + 1, category: entityType === "species_group" ? "category" : entityType === "squid_species" ? "squid" : entityType === "cephalopod_species" ? "cephalopod" : "fish", seasonMonths: [] }));
export const legacySpeciesLabel = (species: FishSpeciesName) => species === "青物" || species === "根魚" ? `${species}（旧分類）` : species;

export type FishSpeciesAliasApprovalStatus = "pending" | "approved" | "rejected";
export type FishSpeciesAlias = { id: string; fishSpeciesId: FishSpeciesId; aliasName: string; matchKey: string; approvalStatus: FishSpeciesAliasApprovalStatus; isActive: boolean };
export type FishSpeciesResolution = { status: "resolved"; input: string; matchKey: string; speciesId: FishSpeciesId; canonicalNameJa: FishSpeciesName; matchedAlias: string } | { status: "unresolved"; input: string; matchKey: string | null; reason: "empty" | "not_registered" } | { status: "conflict"; input: string; matchKey: string; candidateSpeciesIds: FishSpeciesId[] };
export type FishingMethod = "ジギング" | "キャスティング" | "コマセ" | "泳がせ" | "サビキ" | "エギング" | "その他";
export type ForecastScore = { score: number; reasons: string[] };
export type FishingReport = { id: string; reportDate: string; species: FishSpeciesName; spotId: string; spotName: string; areaName: string; latitude: number; longitude: number; catchCount: number; sizeCm: number; method: FishingMethod; sourceName: string; sourceUrl: string; forecast: ForecastScore };