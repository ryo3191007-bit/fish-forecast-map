import type { FishingSpotDetailSet, SpotDetailItemDefinition, SpotDetailValue } from "@/domain/fishingSpotDetail";
import type { FishingSpot } from "@/domain/fishingSpot";
import { type FishingSpotType } from "@/domain/fishingSpot";
import {
  buildSaveSpotFieldObservationInput,
  spotFieldObservationConfigs,
  type SpotFieldObservationDraft,
} from "@/domain/spotFieldObservation";
import type { RecordVisibility } from "@/domain/recordVisibility";

export const USER_SPOT_ID_PREFIX = "user:";

export const userFishingSpotDetailItemKeys = [
  "shore_access", "toilet", "lighting", "parking", "access", "fishable_area", "restriction_status",
  "depth", "bottom_material", "coastal_topography", "obstacles", "spot_features", "tidal_flow",
  "river_influence", "open_sea_bay_character",
] as const;

export type UserFishingSpotDetailItemKey = (typeof userFishingSpotDetailItemKeys)[number];

export type UserFishingSpot = {
  id: string;
  runtimeId: `${typeof USER_SPOT_ID_PREFIX}${string}`;
  name: string;
  latitude: number;
  longitude: number;
  areaName: string | null;
  spotType: FishingSpotType | null;
  visibility: RecordVisibility;
  createdAt: string;
  updatedAt: string;
};

export type SaveUserFishingSpotInput = Pick<UserFishingSpot, "name" | "latitude" | "longitude" | "areaName" | "spotType"> & { visibility?: RecordVisibility };

export type UserFishingSpotDetailValue = {
  id: string;
  spotId: string;
  itemKey: UserFishingSpotDetailItemKey;
  valueText: string | null;
  valueTextList: string[];
  valueNumber: number | null;
  unit: string | null;
  checkedAt: string;
  note: string | null;
  updatedAt: string;
};

export type RuntimeFishingSpot =
  | { source: "master"; id: string; masterSpot: FishingSpot; name: string; latitude: number; longitude: number; areaName: string; spotType: string }
  | { source: "user"; id: `${typeof USER_SPOT_ID_PREFIX}${string}`; userSpot: UserFishingSpot; name: string; latitude: number; longitude: number; areaName: string | null; spotType: FishingSpotType | null };

export const userFishingSpotTypes = ["漁港", "堤防", "サーフ", "地磯", "磯場", "河口", "湾岸", "その他"] as const satisfies readonly FishingSpotType[];

export function isUserFishingSpotType(value: string): value is FishingSpotType {
  return (userFishingSpotTypes as readonly string[]).includes(value);
}

/** Resolve nullable persisted user data only at the marker/display boundary. */
export function userFishingSpotTypeForDisplay(spotType: FishingSpotType | null): FishingSpotType {
  return spotType ?? "その他";
}

export function userSpotRuntimeId(id: string): `${typeof USER_SPOT_ID_PREFIX}${string}` {
  return `${USER_SPOT_ID_PREFIX}${id}`;
}

export function validateUserFishingSpotInput(input: SaveUserFishingSpotInput): SaveUserFishingSpotInput | null {
  const name = input.name.trim();
  if (!name || name.length > 120 || !Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90 || !Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) return null;
  const optional = (value: string | null) => value === null ? null : value.trim() || null;
  const areaName = optional(input.areaName);
  const spotType = optional(input.spotType);
  const visibility = input.visibility ?? "private";
  if ((areaName?.length ?? 0) > 120 || (spotType !== null && !isUserFishingSpotType(spotType)) || !["private", "public"].includes(visibility)) return null;
  return { name, latitude: input.latitude, longitude: input.longitude, areaName, spotType, ...(input.visibility ? { visibility } : {}) };
}

export function mergeRuntimeFishingSpots(masterSpots: readonly FishingSpot[], userSpots: readonly UserFishingSpot[]): RuntimeFishingSpot[] {
  return [
    ...masterSpots.map((spot): RuntimeFishingSpot => ({ source: "master", id: spot.id, masterSpot: spot, name: spot.name, latitude: spot.latitude, longitude: spot.longitude, areaName: spot.areaName, spotType: spot.spotType })),
    ...userSpots.map((spot): RuntimeFishingSpot => ({ source: "user", id: spot.runtimeId, userSpot: spot, name: spot.name, latitude: spot.latitude, longitude: spot.longitude, areaName: spot.areaName, spotType: spot.spotType })),
  ];
}

/** Adapt an owner-scoped spot only at runtime; it is never written to the shared master. */
export function userFishingSpotToFishingSpot(spot: UserFishingSpot): FishingSpot {
  return {
    id: spot.runtimeId,
    name: spot.name,
    areaName: spot.areaName ?? "",
    latitude: spot.latitude,
    longitude: spot.longitude,
    spotType: userFishingSpotTypeForDisplay(spot.spotType),
    shoreAccess: "不明",
    targetSpecies: [],
    recommendedMethods: [],
    coordinatePrecision: "exact",
  };
}

export function buildUserSpotDetailInput(itemKey: UserFishingSpotDetailItemKey, draft: SpotFieldObservationDraft) {
  return buildSaveSpotFieldObservationInput("user-spot", itemKey, spotFieldObservationConfigs[itemKey], draft);
}

export function mapUserSpotDetailsForDisplay(
  values: readonly UserFishingSpotDetailValue[],
  itemDefinitions: readonly SpotDetailItemDefinition[],
): FishingSpotDetailSet {
  const mapped: SpotDetailValue[] = values.map((value) => ({
    ...value,
    spotId: userSpotRuntimeId(value.spotId),
    informationState: "weak_evidence",
    valueBoolean: null,
    valueJson: null,
    confidence: "low",
    contributionOrigin: "user_contribution",
    contributorId: null,
    submittedAt: value.updatedAt,
    moderationStatus: "pending",
    reviewStatus: "pending_review",
    adoptionStatus: "candidate",
    sources: [],
  }));
  const allowed = new Set(userFishingSpotDetailItemKeys);
  return { itemDefinitions: itemDefinitions.filter(({ itemKey }) => allowed.has(itemKey as UserFishingSpotDetailItemKey)), values: mapped };
}
