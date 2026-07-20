export const fishSpeciesNames = [
  "アジ",
  "サバ",
  "イワシ",
  "青物",
  "シイラ",
  "ヒラメ",
  "マゴチ",
  "シーバス",
  "アオリイカ",
  "ヤリイカ",
  "コウイカ",
  "チヌ",
  "真鯛",
  "キス",
  "根魚",
] as const;

export type FishSpeciesName = (typeof fishSpeciesNames)[number];
export const fishSpeciesIds = [
  "aji", "saba", "iwashi", "aomono", "shiira", "hirame", "magochi", "seabass",
  "aoriika", "yariika", "kouika", "chinu", "madai", "kisu", "rockfish",
] as const;
export type FishSpeciesId = (typeof fishSpeciesIds)[number];
export const fishSpeciesIdByName: Readonly<Record<FishSpeciesName, FishSpeciesId>> = {
  アジ: "aji", サバ: "saba", イワシ: "iwashi", 青物: "aomono", シイラ: "shiira", ヒラメ: "hirame",
  マゴチ: "magochi", シーバス: "seabass", アオリイカ: "aoriika", ヤリイカ: "yariika",
  コウイカ: "kouika", チヌ: "chinu", 真鯛: "madai", キス: "kisu", 根魚: "rockfish",
};
export type SpeciesCategory = "fish" | "category" | "squid";

export type FishSpecies = {
  id: FishSpeciesId;
  nameJa: FishSpeciesName;
  category: SpeciesCategory;
  seasonMonths: number[];
};

export type FishSpeciesAliasApprovalStatus = "pending" | "approved" | "rejected";
export type FishSpeciesAlias = { id: string; fishSpeciesId: FishSpeciesId; aliasName: string; matchKey: string; approvalStatus: FishSpeciesAliasApprovalStatus; isActive: boolean };
export type FishSpeciesResolution =
  | { status: "resolved"; input: string; matchKey: string; speciesId: FishSpeciesId; canonicalNameJa: FishSpeciesName; matchedAlias: string }
  | { status: "unresolved"; input: string; matchKey: string | null; reason: "empty" | "not_registered" }
  | { status: "conflict"; input: string; matchKey: string; candidateSpeciesIds: FishSpeciesId[] };

export type FishingMethod =
  | "ジギング"
  | "キャスティング"
  | "コマセ"
  | "泳がせ"
  | "サビキ"
  | "エギング"
  | "その他";

export type ForecastScore = {
  score: number;
  reasons: string[];
};

export type FishingReport = {
  id: string;
  reportDate: string;
  species: FishSpeciesName;
  spotId: string;
  spotName: string;
  areaName: string;
  latitude: number;
  longitude: number;
  catchCount: number;
  sizeCm: number;
  method: FishingMethod;
  sourceName: string;
  sourceUrl: string;
  forecast: ForecastScore;
};
