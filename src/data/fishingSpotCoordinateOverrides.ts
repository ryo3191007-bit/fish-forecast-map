import type { FishingSpot } from "@/domain/fishingSpot";

export type FishingSpotCoordinateOverride = Pick<
  FishingSpot,
  "latitude" | "longitude" | "coordinatePrecision"
>;

/**
 * Reviewed coordinate corrections that must supersede both the bundled legacy
 * master rows and an older remote Supabase row until the forward migration has
 * been applied there.
 *
 * These are approximate port-area representative points. They do not identify
 * an entrance, parking space, breakwater tip, permitted fishing position, or
 * safe standing location.
 */
export const fishingSpotCoordinateOverrides: Readonly<
  Record<string, FishingSpotCoordinateOverride>
> = {
  "karatsu-east-port": {
    latitude: 33.469823,
    longitude: 129.963189,
    coordinatePrecision: "approximate",
  },
  "maetsuyoshi-fishing-port": {
    latitude: 33.21062,
    longitude: 129.45292,
    coordinatePrecision: "approximate",
  },
};

export function applyFishingSpotCoordinateOverrides(
  spots: readonly FishingSpot[],
): FishingSpot[] {
  return spots.map((spot) => {
    const override = fishingSpotCoordinateOverrides[spot.id];
    return override ? { ...spot, ...override } : spot;
  });
}
