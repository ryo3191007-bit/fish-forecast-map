import fs from "node:fs";
import path from "node:path";
import { fishingSpots } from "../src/data/fishingSpots";
import { applyFishingSpotCoordinateOverrides } from "../src/data/fishingSpotCoordinateOverrides";

const excluded = new Set(["karatsu-east-port", "maetsuyoshi-fishing-port"]);
const evidenceRoots = [
  path.join("data", "research", "fishing-spots"),
  path.join("data", "curation", "fishing-spots"),
];

type Point = { latitude: number; longitude: number };
type Candidate = Point & {
  file: string;
  jsonPath: string;
  coordinatePrecision: string | null;
  coordinateMethod: string | null;
  coordinateScope: string | null;
  status: string | null;
  confidence: string | null;
  checkedAt: string | null;
  decision: string | null;
  reason: string | null;
  note: string | null;
  sources: Array<{
    sourceType: string | null;
    publisher: string | null;
    title: string | null;
    url: string | null;
    checkedAt: string | null;
  }>;
};

function haversineKm(a: Point, b: Point) {
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

function listJsonFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return listJsonFiles(target);
    return entry.isFile() && entry.name.endsWith(".json") ? [target] : [];
  });
}

function asFiniteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sourceList(root: any, sourceIds?: string[]) {
  const sources = Array.isArray(root?.sources)
    ? root.sources
    : root?.sources && typeof root.sources === "object"
      ? Object.entries(root.sources).map(([id, source]) => ({ id, ...(source as object) }))
      : [];
  const filtered = sourceIds && sourceIds.length > 0
    ? sources.filter((source: any) => sourceIds.includes(source.id))
    : sources;
  return filtered.map((source: any) => ({
    sourceType: source.sourceType ?? null,
    publisher: source.publisher ?? source.sourceName ?? null,
    title: source.title ?? source.sourceName ?? null,
    url: source.url ?? source.sourceUrl ?? null,
    checkedAt: source.checkedAt ?? source.checkedOn ?? null,
  }));
}

const candidatesBySpot = new Map<string, Candidate[]>();

function addCandidate(spotId: string, candidate: Candidate) {
  const candidates = candidatesBySpot.get(spotId) ?? [];
  const duplicate = candidates.some((existing) =>
    existing.file === candidate.file
      && existing.latitude === candidate.latitude
      && existing.longitude === candidate.longitude
  );
  if (!duplicate) candidates.push(candidate);
  candidatesBySpot.set(spotId, candidates);
}

function inspectJsonFile(file: string) {
  const root = JSON.parse(fs.readFileSync(file, "utf8"));
  const relativeFile = file.replaceAll("\\", "/");

  function walk(value: any, jsonPath: string) {
    if (!value || typeof value !== "object") return;

    if (typeof value.spotId === "string") {
      const coordinates = value.identity?.coordinates;
      const directLatitude = asFiniteNumber(value.latitude);
      const directLongitude = asFiniteNumber(value.longitude);
      const nestedLatitude = asFiniteNumber(coordinates?.latitude);
      const nestedLongitude = asFiniteNumber(coordinates?.longitude);

      if (nestedLatitude !== null && nestedLongitude !== null) {
        const supportingIds = coordinates?.evidenceSources?.supportingSourceIds ?? [];
        const checkedIds = coordinates?.evidenceSources?.checkedSourceIds ?? [];
        addCandidate(value.spotId, {
          file: relativeFile,
          jsonPath: `${jsonPath}.identity.coordinates`,
          latitude: nestedLatitude,
          longitude: nestedLongitude,
          coordinatePrecision: coordinates?.coordinatePrecision ?? null,
          coordinateMethod: coordinates?.coordinateMethod ?? null,
          coordinateScope: coordinates?.coordinateScope ?? null,
          status: coordinates?.status ?? null,
          confidence: coordinates?.confidence ?? null,
          checkedAt: coordinates?.checkedAt ?? root.researchedAt ?? null,
          decision: value.decision ?? null,
          reason: value.reason ?? null,
          note: coordinates?.note ?? null,
          sources: sourceList(root, [...new Set([...supportingIds, ...checkedIds])]),
        });
      } else if (directLatitude !== null && directLongitude !== null) {
        addCandidate(value.spotId, {
          file: relativeFile,
          jsonPath,
          latitude: directLatitude,
          longitude: directLongitude,
          coordinatePrecision: value.coordinatePrecision ?? null,
          coordinateMethod: value.coordinateMethod ?? null,
          coordinateScope: value.coordinateScope ?? null,
          status: value.status ?? null,
          confidence: value.confidence ?? null,
          checkedAt: value.checkedAt ?? root.researchedAt ?? null,
          decision: value.decision ?? null,
          reason: value.reason ?? null,
          note: value.note ?? null,
          sources: sourceList(root),
        });
      }
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${jsonPath}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      walk(child, `${jsonPath}.${key}`);
    }
  }

  walk(root, "$");
}

for (const file of evidenceRoots.flatMap(listJsonFiles)) {
  inspectJsonFile(file);
}

const runtimeById = new Map(
  applyFishingSpotCoordinateOverrides(fishingSpots).map((spot) => [spot.id, spot]),
);

const records = fishingSpots
  .filter((spot) => !excluded.has(spot.id))
  .map((spot) => {
    const current = runtimeById.get(spot.id) ?? spot;
    const candidates = (candidatesBySpot.get(spot.id) ?? [])
      .map((candidate) => ({
        ...candidate,
        distanceKm: Number(haversineKm(current, candidate).toFixed(3)),
      }))
      .sort((a, b) => a.file.localeCompare(b.file) || a.distanceKm - b.distanceKm);

    return {
      spotId: spot.id,
      name: spot.name,
      areaName: spot.areaName,
      current: {
        latitude: current.latitude,
        longitude: current.longitude,
        coordinatePrecision: current.coordinatePrecision,
      },
      candidates,
    };
  });

fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync(
  "artifacts/issue-296-coordinate-export.json",
  `${JSON.stringify({ count: records.length, records }, null, 2)}\n`,
);
console.log(`Exported ${records.length} coordinate audit records with ${[...candidatesBySpot.values()].flat().length} evidence candidates.`);
