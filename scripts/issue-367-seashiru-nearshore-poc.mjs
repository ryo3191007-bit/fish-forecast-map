import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT = path.resolve(__dirname, "../data/research/shore-fishing-segments/karatsu-east-port.poc.json");
const DEFAULT_OUTPUT = path.resolve(__dirname, "../data/research/seashiru/karatsu-east-port-nearshore.poc.json");
const SEGMENT_ID = "east-port-green-revetment-reference-01";
const MAX_DISTANCE_M = 150;
const SEARCH_MARGIN_M = 175;
const PAGE_SIZE = 1000;
const EARTH_RADIUS_M = 6_371_000;

export const DATASETS = [
  { id: "bottom-shells", group: "bottomSediment", label: "貝殻", baseUrl: "https://api.msil.go.jp/shells/v2", layer: 1 },
  { id: "bottom-coral", group: "bottomSediment", label: "さんご", baseUrl: "https://api.msil.go.jp/coral/v2", layer: 1 },
  { id: "bottom-gravel", group: "bottomSediment", label: "礫", baseUrl: "https://api.msil.go.jp/gravel/v2", layer: 1 },
  { id: "bottom-stone-rock", group: "bottomSediment", label: "石・岩", baseUrl: "https://api.msil.go.jp/stone-rock/v2", layer: 1 },
  { id: "bottom-sand", group: "bottomSediment", label: "砂", baseUrl: "https://api.msil.go.jp/sand/v2", layer: 1 },
  { id: "bottom-mud-clay", group: "bottomSediment", label: "泥・粘土", baseUrl: "https://api.msil.go.jp/mud-caly/v2", layer: 1 },
  { id: "seabed-obstruction-point", group: "seabedObstruction", label: "海底障害物（Point）", baseUrl: "https://api.msil.go.jp/seabed-obstruction/v2", layer: 1 },
  { id: "seabed-obstruction-area", group: "seabedObstruction", label: "海底障害物（Polygon）", baseUrl: "https://api.msil.go.jp/seabed-obstruction/v2", layer: 3 },
  { id: "wrecks", group: "wrecks", label: "沈船", baseUrl: "https://api.msil.go.jp/wrecks/v2", layer: 1 },
  { id: "esi-coastline", group: "esi", label: "海岸線種類（ESI）", baseUrl: "https://api.msil.go.jp/coastline-type-ESI/v2", layer: 1 },
];

const toRad = (degrees) => (degrees * Math.PI) / 180;
const toDeg = (radians) => (radians * 180) / Math.PI;

const localOrigin = (coordinates) => ({
  longitude: coordinates.reduce((sum, [lon]) => sum + lon, 0) / coordinates.length,
  latitude: coordinates.reduce((sum, [, lat]) => sum + lat, 0) / coordinates.length,
});

export const projectLocalMeters = ([longitude, latitude], origin) => ({
  x: EARTH_RADIUS_M * toRad(longitude - origin.longitude) * Math.cos(toRad(origin.latitude)),
  y: EARTH_RADIUS_M * toRad(latitude - origin.latitude),
});

const pointToSegmentDistance = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
};

const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const onSegment = (a, b, p) =>
  Math.abs(cross(a, b, p)) < 1e-8 &&
  p.x >= Math.min(a.x, b.x) - 1e-8 && p.x <= Math.max(a.x, b.x) + 1e-8 &&
  p.y >= Math.min(a.y, b.y) - 1e-8 && p.y <= Math.max(a.y, b.y) + 1e-8;

const segmentsIntersect = (a, b, c, d) => {
  const c1 = cross(a, b, c);
  const c2 = cross(a, b, d);
  const c3 = cross(c, d, a);
  const c4 = cross(c, d, b);
  if (((c1 > 0 && c2 < 0) || (c1 < 0 && c2 > 0)) && ((c3 > 0 && c4 < 0) || (c3 < 0 && c4 > 0))) return true;
  return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
};

const segmentDistance = (a, b, c, d) => {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegmentDistance(a, c, d), pointToSegmentDistance(b, c, d),
    pointToSegmentDistance(c, a, b), pointToSegmentDistance(d, a, b),
  );
};

const pointInRing = (point, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (onSegment(a, b, point)) return true;
    const crosses = (a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

const pointInPolygon = (point, rings) => {
  if (rings.length === 0 || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole));
};

const lineDistance = (line, reference) => {
  if (line.length === 1) {
    let min = Infinity;
    for (let j = 1; j < reference.length; j += 1) min = Math.min(min, pointToSegmentDistance(line[0], reference[j - 1], reference[j]));
    return min;
  }
  let min = Infinity;
  for (let i = 1; i < line.length; i += 1) {
    for (let j = 1; j < reference.length; j += 1) min = Math.min(min, segmentDistance(line[i - 1], line[i], reference[j - 1], reference[j]));
  }
  return min;
};

export const minGeometryDistanceToReference = (geometry, referenceCoordinates) => {
  if (!geometry) return null;
  const origin = localOrigin(referenceCoordinates);
  const reference = referenceCoordinates.map((coordinate) => projectLocalMeters(coordinate, origin));
  const projectLine = (line) => line.map((coordinate) => projectLocalMeters(coordinate, origin));

  if (geometry.type === "Point") return lineDistance([projectLocalMeters(geometry.coordinates, origin)], reference);
  if (geometry.type === "MultiPoint") return Math.min(...geometry.coordinates.map((p) => lineDistance([projectLocalMeters(p, origin)], reference)));
  if (geometry.type === "LineString") return lineDistance(projectLine(geometry.coordinates), reference);
  if (geometry.type === "MultiLineString") return Math.min(...geometry.coordinates.map((line) => lineDistance(projectLine(line), reference)));

  const polygonDistance = (polygon) => {
    const rings = polygon.map(projectLine);
    if (reference.some((point) => pointInPolygon(point, rings))) return 0;
    return Math.min(...rings.map((ring) => lineDistance(ring, reference)));
  };
  if (geometry.type === "Polygon") return polygonDistance(geometry.coordinates);
  if (geometry.type === "MultiPolygon") return Math.min(...geometry.coordinates.map(polygonDistance));
  return null;
};

export const distanceBand = (distanceM) => {
  if (distanceM == null || distanceM < 0) return null;
  if (distanceM < 50) return "0-50";
  if (distanceM < 100) return "50-100";
  if (distanceM <= 150) return "100-150";
  return null;
};

export const buildSearchEnvelope = (coordinates, marginM = SEARCH_MARGIN_M) => {
  const lons = coordinates.map(([lon]) => lon);
  const lats = coordinates.map(([, lat]) => lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const latDelta = toDeg(marginM / EARTH_RADIUS_M);
  const lonDelta = toDeg(marginM / (EARTH_RADIUS_M * Math.cos(toRad(midLat))));
  return [Math.min(...lons) - lonDelta, Math.min(...lats) - latDelta, Math.max(...lons) + lonDelta, Math.max(...lats) + latDelta];
};

const fetchDatasetPage = async ({ dataset, key, envelope, offset }) => {
  const url = new URL(`${dataset.baseUrl}/MapServer/${dataset.layer}/query`);
  for (const [name, value] of Object.entries({
    f: "geojson", where: "1=1", geometry: envelope.join(","), geometryType: "esriGeometryEnvelope",
    inSR: "4326", spatialRel: "esriSpatialRelIntersects", returnGeometry: "true",
  })) url.searchParams.set(name, value);
  if (offset > 0) url.searchParams.set("resultOffset", String(offset));

  const response = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": key, Accept: "application/geo+json, application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const payload = JSON.parse(text);
  return { features: Array.isArray(payload.features) ? payload.features : [], exceededTransferLimit: payload.exceededTransferLimit === true };
};

const fetchAllFeatures = async ({ dataset, key, envelope }) => {
  const features = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchDatasetPage({ dataset, key, envelope, offset });
    features.push(...page.features);
    if (page.features.length === 0 || (!page.exceededTransferLimit && page.features.length < PAGE_SIZE)) break;
  }
  return features;
};

export const summarizeDataset = ({ dataset, features, referenceCoordinates }) => {
  const records = features.flatMap((feature) => {
    const distanceM = minGeometryDistanceToReference(feature.geometry, referenceCoordinates);
    if (distanceM == null || distanceM > MAX_DISTANCE_M) return [];
    return [{
      distanceFromShoreM: Math.round(distanceM * 10) / 10,
      distanceBand: distanceBand(distanceM),
      geometryType: feature.geometry?.type ?? "unknown",
      properties: feature.properties ?? {},
      geometry: feature.geometry ?? null,
    }];
  }).sort((a, b) => a.distanceFromShoreM - b.distanceFromShoreM);

  const bands = { "0-50": 0, "50-100": 0, "100-150": 0 };
  for (const record of records) bands[record.distanceBand] += 1;
  return {
    id: dataset.id, group: dataset.group, label: dataset.label, layer: dataset.layer, status: "ok",
    fetchedFeatureCount: features.length, nearshoreFeatureCount: records.length, distanceBands: bands,
    nearestDistanceM: records[0]?.distanceFromShoreM ?? null, records,
  };
};

const sanitizeError = (error) => ({ name: error instanceof Error ? error.name : "Error", message: String(error instanceof Error ? error.message : error).slice(0, 500) });
const parseArgs = () => {
  const args = process.argv.slice(2);
  const after = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  return { input: after("--input") ?? DEFAULT_INPUT, output: after("--output") ?? DEFAULT_OUTPUT };
};

export const run = async ({ input, output, key = process.env.SEASHIRU_SUBSCRIPTION_KEY }) => {
  if (!key) throw new Error("SEASHIRU_SUBSCRIPTION_KEY is required. Do not pass the key in command-line arguments or URLs.");
  const shoreData = JSON.parse(await readFile(input, "utf8"));
  const segment = shoreData.segments.find((item) => item.segmentId === SEGMENT_ID);
  if (!segment) throw new Error(`Reference segment ${SEGMENT_ID} was not found.`);
  if (segment.distanceReferenceStatus !== "eligible") throw new Error(`Reference segment ${SEGMENT_ID} is not eligible for nearshore distance calculations.`);

  const referenceCoordinates = segment.geometry.coordinates;
  const envelope = buildSearchEnvelope(referenceCoordinates);
  const datasets = [];
  for (const dataset of DATASETS) {
    try {
      datasets.push(summarizeDataset({ dataset, features: await fetchAllFeatures({ dataset, key, envelope }), referenceCoordinates }));
    } catch (error) {
      datasets.push({ id: dataset.id, group: dataset.group, label: dataset.label, layer: dataset.layer, status: "api_error", error: sanitizeError(error), fetchedFeatureCount: null, nearshoreFeatureCount: null, distanceBands: null, nearestDistanceM: null, records: [] });
    }
  }

  const result = {
    schemaVersion: "1.0.0", issue: 367, spotId: shoreData.spotId, checkedAt: new Date().toISOString(),
    reference: { segmentId: SEGMENT_ID, geometryStatus: segment.geometryStatus, distanceReferenceStatus: segment.distanceReferenceStatus, confidence: segment.confidence, geometry: segment.geometry },
    query: { maxDistanceFromShoreM: MAX_DISTANCE_M, searchEnvelopeWgs84: envelope, seaSidePolicy: "distance_only_first_poc", note: "This first PoC filters by distance to the adopted coastal reference segment. It does not claim a rigorous directional casting sector." },
    datasets,
    limitations: [
      "Sea-side directional casting-sector clipping is not implemented in this first PoC.",
      "The lava bottom-sediment API is not queried because its current v2 base URL was not independently confirmed in the official API documentation during Issue #367 implementation.",
      "Zero returned records and API errors are stored separately; missing data is never inferred as absence of seabed features.",
    ],
    sources: [
      { name: "海しるAPI 利用方法", url: "https://portal.msil.go.jp/howtouse" },
      { name: "海しるAPI 項目一覧", url: "https://portal.msil.go.jp/msil-api-list" },
    ],
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs();
  run(options).then((result) => {
    console.log(JSON.stringify({ output: options.output, summary: result.datasets.map(({ id, status, nearshoreFeatureCount, nearestDistanceM }) => ({ id, status, nearshoreFeatureCount, nearestDistanceM })) }, null, 2));
  }).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
