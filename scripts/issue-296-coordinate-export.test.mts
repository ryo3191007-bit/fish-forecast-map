import fs from "node:fs";
import path from "node:path";
import { fishingSpots } from "../src/data/fishingSpots";
import { applyFishingSpotCoordinateOverrides } from "../src/data/fishingSpotCoordinateOverrides";

const excluded = new Set(["karatsu-east-port", "maetsuyoshi-fishing-port"]);

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

const runtimeById = new Map(
  applyFishingSpotCoordinateOverrides(fishingSpots).map((spot) => [spot.id, spot]),
);

const records = fishingSpots
  .filter((spot) => !excluded.has(spot.id))
  .map((spot) => {
    const researchPath = path.join("data", "research", "fishing-spots", `${spot.id}.json`);
    if (!fs.existsSync(researchPath)) {
      return {
        spotId: spot.id,
        name: spot.name,
        areaName: spot.areaName,
        current: {
          latitude: runtimeById.get(spot.id)?.latitude ?? spot.latitude,
          longitude: runtimeById.get(spot.id)?.longitude ?? spot.longitude,
          coordinatePrecision: runtimeById.get(spot.id)?.coordinatePrecision ?? spot.coordinatePrecision,
        },
        missingResearch: true,
      };
    }

    const research = JSON.parse(fs.readFileSync(researchPath, "utf8"));
    const coordinates = research.identity?.coordinates;
    const current = runtimeById.get(spot.id) ?? spot;
    const researchPoint = {
      latitude: Number(coordinates?.latitude),
      longitude: Number(coordinates?.longitude),
    };
    const sourceById = new Map(
      (research.sources ?? []).map((source: { id: string }) => [source.id, source]),
    );
    const supportingIds = coordinates?.evidenceSources?.supportingSourceIds ?? [];
    const checkedIds = coordinates?.evidenceSources?.checkedSourceIds ?? [];
    const coordinateSources = [...new Set([...supportingIds, ...checkedIds])]
      .map((sourceId) => sourceById.get(sourceId))
      .filter(Boolean)
      .map((source: any) => ({
        id: source.id,
        sourceType: source.sourceType,
        publisher: source.publisher,
        title: source.title,
        url: source.url,
        checkedAt: source.checkedAt,
        relation: supportingIds.includes(source.id) ? "supporting" : "checked",
      }));

    return {
      spotId: spot.id,
      name: spot.name,
      areaName: spot.areaName,
      current: {
        latitude: current.latitude,
        longitude: current.longitude,
        coordinatePrecision: current.coordinatePrecision,
      },
      research: {
        ...researchPoint,
        coordinateMethod: coordinates?.coordinateMethod ?? null,
        coordinateScope: coordinates?.coordinateScope ?? null,
        status: coordinates?.status ?? null,
        confidence: coordinates?.confidence ?? null,
        checkedAt: coordinates?.checkedAt ?? null,
        note: coordinates?.note ?? null,
      },
      distanceKm: Number.isFinite(researchPoint.latitude) && Number.isFinite(researchPoint.longitude)
        ? Number(haversineKm(current, researchPoint).toFixed(3))
        : null,
      coordinateSources,
    };
  });

console.log("ISSUE296_COORDINATE_EXPORT_BEGIN");
console.log(JSON.stringify({ count: records.length, records }, null, 2));
console.log("ISSUE296_COORDINATE_EXPORT_END");
process.exitCode = 1;
