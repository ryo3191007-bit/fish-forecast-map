import type { FishingSpot } from "@/domain/fishingSpot";

/**
 * Broad legacy locations that remain in the master for historical references,
 * but must not be offered as a new destination, map marker, or evaluation target.
 */
export const hiddenBroadFishingSpotIds = [
  "yobuko-area",
  "fukushima-area",
  "takashima-area",
  "hirado-seto",
  "ikitsuki-area",
] as const;

export type HiddenBroadFishingSpotId = (typeof hiddenBroadFishingSpotIds)[number];

const hiddenBroadFishingSpotIdSet = new Set<string>(hiddenBroadFishingSpotIds);

export function isSelectableFishingSpot(spot: Pick<FishingSpot, "id">): boolean {
  return !hiddenBroadFishingSpotIdSet.has(spot.id);
}

export function filterSelectableFishingSpots<T extends Pick<FishingSpot, "id">>(spots: readonly T[]): T[] {
  return spots.filter(isSelectableFishingSpot);
}
