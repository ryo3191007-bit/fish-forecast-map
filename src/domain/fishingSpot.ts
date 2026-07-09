import type { FishSpeciesName, FishingMethod } from "@/domain/fishing";

export type FishingSpotType = "漁港" | "堤防" | "サーフ" | "地磯" | "磯場" | "河口" | "湾岸" | "その他";
export type ShoreAccess = "足場良い" | "注意必要" | "上級者向け" | "不明";
export type CoordinatePrecision = "exact" | "approximate" | "rounded";

export type FishingSpot = {
  id: string;
  name: string;
  areaName: string;
  latitude: number;
  longitude: number;
  spotType: FishingSpotType;
  shoreAccess: ShoreAccess;
  targetSpecies: FishSpeciesName[];
  recommendedMethods: FishingMethod[];
  notes?: string[];
  coordinatePrecision: CoordinatePrecision;
};
