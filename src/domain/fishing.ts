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
export type SpeciesCategory = "fish" | "category" | "squid";

export type FishSpecies = {
  id: string;
  nameJa: FishSpeciesName;
  category: SpeciesCategory;
  seasonMonths: number[];
};

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
