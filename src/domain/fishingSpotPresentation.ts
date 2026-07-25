import type { EnvironmentPoint } from "@/domain/environment";
import type { FishingSpot } from "@/domain/fishingSpot";

export function selectFishingSpot(spots: readonly FishingSpot[], spotId: string) {
  return spots.find((spot) => spot.id === spotId) ?? spots[0];
}

export function toEnvironmentPoint(spot: FishingSpot): EnvironmentPoint {
  return { spotId: spot.id, spotName: spot.name, latitude: spot.latitude, longitude: spot.longitude };
}

export function filterFishingSpotOptions(spots: readonly FishingSpot[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("ja");
  return spots.filter((spot) => !normalized || `${spot.name} ${spot.areaName}`.toLocaleLowerCase("ja").includes(normalized));
}

export function buildFishingSpotMapEntries(spots: readonly FishingSpot[]) {
  return spots.map(toFishingSpotMapEntry);
}

export function toFishingSpotMapEntry(spot: FishingSpot) {
  return { spot, coordinates: [spot.longitude, spot.latitude] as [number, number] };
}

export function buildCatchRegistrationSpotOptions(spots: readonly FishingSpot[]) {
  return spots.map((spot) => ({ id: spot.id, label: `${spot.name} / ${spot.areaName}`, spotType: spot.spotType }));
}
