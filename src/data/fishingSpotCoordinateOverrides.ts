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
 * These are approximate facility, coast, island, or port-area representative
 * points. They do not identify an entrance, parking space, breakwater tip,
 * permitted fishing position, safe standing location, or accessible area.
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
  "nokita-beach": {
    latitude: 33.6048,
    longitude: 130.1552,
    coordinatePrecision: "approximate",
  },
  "kishi-port": {
    latitude: 33.56817019,
    longitude: 130.12709036,
    coordinatePrecision: "approximate",
  },
  "fukuyoshi-port": {
    latitude: 33.50788331,
    longitude: 130.0927193,
    coordinatePrecision: "approximate",
  },
  "niji-matsubara": {
    latitude: 33.4472,
    longitude: 130.0207,
    coordinatePrecision: "approximate",
  },
  "karatsu-west-port": {
    latitude: 33.4662,
    longitude: 129.9488,
    coordinatePrecision: "approximate",
  },
  "hatazu-fishing-port": {
    latitude: 33.37750645,
    longitude: 129.86504185,
    coordinatePrecision: "approximate",
  },
  "nabegushi-fishing-port": {
    latitude: 33.40073617,
    longitude: 129.81105386,
    coordinatePrecision: "approximate",
  },
  "takashima-area": {
    latitude: 33.4246,
    longitude: 129.7555,
    coordinatePrecision: "approximate",
  },
  "kabeshima-port": {
    latitude: 33.54630411,
    longitude: 129.88236479,
    coordinatePrecision: "approximate",
  },
  "tobo-port": {
    latitude: 33.48814255,
    longitude: 129.94840955,
    coordinatePrecision: "approximate",
  },
  "usukawan-fishing-port": {
    latitude: 33.372715,
    longitude: 129.541075,
    coordinatePrecision: "approximate",
  },
  "hoki-fishing-port": {
    latitude: 33.304112,
    longitude: 129.519135,
    coordinatePrecision: "approximate",
  },
  "miyanoura-fishing-port": {
    latitude: 33.18959444,
    longitude: 129.3560002,
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
