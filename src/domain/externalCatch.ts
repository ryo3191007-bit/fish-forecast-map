import type { FishSpeciesName, FishingMethod } from "./fishing";

export type CoordinatePrecision = "exact" | "approximate" | "rounded" | "unknown";
export type ExternalCatchAcquisitionMethod = "manual" | "ai_assisted" | "auto";
export type ExternalCatchConfidence = "high" | "medium" | "low";
export type CatchItem = {
  species: FishSpeciesName | string;
  catchCount?: number;
  sizeCm?: number;
};

export type ExternalCatchRecord = {
  id: string;
  species: FishSpeciesName | string;
  catchItems: CatchItem[];
  caughtDate: string;
  caughtTime?: string;
  areaName: string;
  estimatedSpotName?: string;
  spotId?: string;
  latitude?: number;
  longitude?: number;
  coordinatePrecision: CoordinatePrecision;
  method?: FishingMethod | string;
  catchCount?: number;
  sizeCm?: number;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  acquisitionMethod: ExternalCatchAcquisitionMethod;
  confidence: ExternalCatchConfidence;
  environmentMatchNotes?: string[];
  createdAt: string;
  updatedAt: string;
};
