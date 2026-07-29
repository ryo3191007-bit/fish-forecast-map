import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT = path.resolve(__dirname, "../data/research/shore-fishing-segments/karatsu-east-port.poc.json");
const DEFAULT_OUTPUT = path.resolve(__dirname, "../data/research/seashiru/karatsu-east-port-nearshore.poc.json");
const SEGMENT_ID = "east-port-green-revetment-reference-01";
const MAX_NEARSHORE_DISTANCE_M = 150;
const SEARCH_MARGIN_M = 175;
const PAGE_SIZE = 1000;

export const DATASETS = [
  { id: "bottom-shells", group: "bottomSediment", label: "貝殻", baseUrl: "https://api.msil.go.jp/shells/v2", layer: 1 },
  { id: "bottom-coral", group: "bottomSediment", label: "さんご", baseUrl: "https://api.msil.go.jp/coral/v2", layer: 1 },
  { id: "bottom-gravel", group: "bottomSediment", label: "礫", baseUrl: "https://api.msil.go.jp/gravel/v2", layer: 1 },
  { id: "bottom-stone-rock", group: "bottomSediment", label: "石・岩", baseUrl: "https://api.msil.go.jp/stone-rock/v2", layer: 1 },
  { id: "bottom-sand", group: "bottomSediment", label: "砂", baseUrl: "https://api.msil.go.jp/sand/v2", layer: 1 },
  { id: "bottom-mud-clay", group: "bottomSediment", label: "泥・粘土", baseUrl: "https://api.msil.go.jp/mud-caly/v2", layer: 1 },
  { id: "seabed-obstruction", group: "seabedObstruction", label: "海底障害物", baseUrl: "https://api.msil.go.jp/seabed-obstruction/v2", layer: 1 },
  { id: "wrecks", group: "wrecks", label: "沈船", baseUrl: "https://api.msil.go.jp/wrecks/v2", layer: 1 },
  { id: "esi-coastline", group: "esi", label: "海岸線種類（ESI）", baseUrl: "https://api.msil.go.jp/coastline-type-ESI/v2", layer: 1 },
];

const toRad = (degrees) => (degrees * Math.PI) / 180;
const toDeg = (radians) => (radians * 180) / Math.PI;
const EARTH_RADIUS_M = 6_371_000;

export const projectLocalMeters = ([longitude, latitude], origin) => {
  const originLatRad = toRad(origin.latitude);
  return {
    x: EARTH_RADIUS_M * toRad(longitude - origin.longitude) * Math.cos(originLatRad),
    y: EARTH_RADIUS_M * toRad(latitude - origin.latitude),
  };
};

const pointToSegmentDistance = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projected = { x: start.x + t * dx, y: start.y + t * dy };
  return Math.hypot(point.x - projected.x, point.y - projected.y);
};

const orientation = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
const onSegment = (a, b, p) =>
  p.x >= Math.min(a.x, b.x) - 1e-9 &&
  p.x <= Math.max(a.x, b.x) + 1e-9 &&
  p.y >= Math.min(a.y, b.y) - 1e-9 &&
  p.y <= Math.max(a.y, b.y) + 1e-9;

const segmentsIntersect = (a, b, c, d) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;
  return false;
};

const segmentToSegmentDistance = (a, b, c, d) => {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegmentDistance(a, c, d),
    pointToSegmentDistance(b, c, d),
    pointToSegmentDistance(c, a, b),
    pointToSegmentDistance(d, a, b),
  );
};

const flattenCoordinates = (geometry) => {
  if (!geometry) return [];
  switch (geometry.type) {
    case "Point": return [[geometry.coordinates]];
    case "MultiPoint": return geometry.coordinates.map((coordinate) => [coordinate]);
    case "LineString": return [geometry.coordinates];
    case "MultiLineString": return geometry.coordinates;
    case "Polygon": return geometry.coordinates;
    case "MultiPolygon": return geometry.coordinates.flat();
    default: return [];
  }
};

export const minGeometryDistanceToReference = (geometry, referenceCoordinates) => {
  const origin = {
    longitude: referenceCoordinates.reduce((sum, [longitude]) => sum + longitude, 0) / referenceCoordinates.length,
    latitude: referenceCoordinates.reduce((sum, [, latitude]) => sum + latitude, 0) / referenceCoordinates.length,
  };
  const reference = referenceCoordinates.map((coordinate) => projectLocalMeters(coordinate, origin));
  const parts = flattenCoordinates(geometry).map((part) => part.map((coordinate) => projectLocalMeters(coordinate, origin)));
  let min = Infinity;
  for (const part of parts) {
    if (part.length === 1) {
      for (let i = 1; i < reference.length; i += 1) {
        min = Math.min(min, pointToSegmentDistance(part[0], reference[i - 1], reference[i]));
      }
      continue;
    }
    for (let i = 1; i < part.length; i += 1) {
      for (let j = 1; j < reference.length; j += 1) {
        min = Math.min(min, segmentToSegmentDistance(part[i - 1], part[i], reference[j - 1], reference[j]));
      }
    }
  }
  return Number.isFinite(min) ? min : null;
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
  return [
    Math.min(...lons) - lonDelta,
    Math.min(...lats) - latDelta,
    Math.max(...lons) + lonDelta,
    Math.max(...lats) + latDelta,
  ];
};

const fetchDatasetPage = async ({ dataset, key, envelope, offset }) => {
  const url = new URL(`${dataset.baseUrl}/MapServer/${dataset.layer}/query`);
  url.searchParams.set("f", "geojson");
  url.searchParams.set("where", "1=1");
  url.searchParams.set("geometry", envelope.join(","));
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("returnGeometry", "true");
  if (offset > 0) url.searchParams.set("resultOffset", String(offset));

  const response = await fetch(url, {
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      Accept: "application/geo+json, application/json",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const payload = JSON.parse(text);
  return {
    features: Array.isArray(payload.features) ? payload.features : [],
    exceededTransferLimit: payload.exceededTransferLimit === true,
  };
};

const fetchAllFeatures = async ({ dataset, key, envelope }) => {
  const features = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchDatasetPage({ dataset, key, envelope, offset });
    features.push(...page.features);
    if (!page.exceededTransferLimit && page.features.length < PAGE_SIZE) break;
    if (page.features.length === 0) break;
  }
  return features;
};

export const summarizeDataset = ({ dataset, features, referenceCoordinates }) => {
  const records = [];
  for (const feature of features) {
    const distanceM = minGeometryDistanceToReference(feature.geometry, referenceCoordinates);
    if (distanceM == null || distanceM > MAX_NEARSHORE_DISTANCE_M) continue;
    records.push({
      distanceFromShoreM: Math.round(distanceM * 10) / 10,
      distanceBand: distanceBand(distanceM),
      geometryType: feature.geometry?.type ?? "unknown",
      properties: feature.properties ?? {},
      geometry: feature.geometry ?? null,
    });
  }
  records.sort((a, b) => a.distanceFromShoreM - b.distanceFromShoreM);
  const bands = { "0-50": 0, "50-100": 0, "100-150": 0 };
  for (const record of records) bands[record.distanceBand] += 1;
  return {
    id: dataset.id,
    group: dataset.group,
    label: dataset.label,
    status: "ok",
    fetchedFeatureCount: features.length,
    nearshoreFeatureCount: records.length,
    distanceBands: bands,
    nearestDistanceM: records[0]?.distanceFromShoreM ?? null,
    records,
  };
};

const sanitizeError = (error) => ({
  name: error instanceof Error ? error.name : "Error",
  message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
});

const parseArgs = () => {
  const args = process.argv.slice(2);
  const valueAfter = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    input: valueAfter("--input") ?? DEFAULT_INPUT,
    output: valueAfter("--output") ?? DEFAULT_OUTPUT,
  };
};

export const run = async ({ input, output, key = process.env.SEASHIRU_SUBSCRIPTION_KEY }) => {
  if (!key) {
    throw new Error("SEASHIRU_SUBSCRIPTION_KEY is required. Do not pass the key in command-line arguments or URLs.");
  }
  const shoreData = JSON.parse(await readFile(input, "utf8"));
  const segment = shoreData.segments.find((item) => item.segmentId === SEGMENT_ID);
  if (!segment) throw new Error(`Reference segment ${SEGMENT_ID} was not found.`);
  if (segment.distanceReferenceStatus !== "eligible") {
    throw new Error(`Reference segment ${SEGMENT_ID} is not eligible for nearshore distance calculations.`);
  }

  const referenceCoordinates = segment.geometry.coordinates;
  const envelope = buildSearchEnvelope(referenceCoordinates);
  const datasets = [];
  for (const dataset of DATASETS) {
    try {
      const features = await fetchAllFeatures({ dataset, key, envelope });
      datasets.push(summarizeDataset({ dataset, features, referenceCoordinates }));
    } catch (error) {
      datasets.push({
        id: dataset.id,
        group: dataset.group,
        label: dataset.label,
        status: "api_error",
        error: sanitizeError(error),
        fetchedFeatureCount: null,
        nearshoreFeatureCount: null,
        distanceBands: null,
        nearestDistanceM: null,
        records: [],
      });
    }
  }

  const checkedAt = new Date().toISOString();
  const result = {
    schemaVersion: "1.0.0",
    issue: 367,
    spotId: shoreData.spotId,
    checkedAt,
    reference: {
      segmentId: SEGMENT_ID,
      geometryStatus: segment.geometryStatus,
      distanceReferenceStatus: segment.distanceReferenceStatus,
      confidence: segment.confidence,
      geometry: segment.geometry,
    },
    query: {
      maxDistanceFromShoreM: MAX_NEARSHORE_DISTANCE_M,
      searchEnvelopeWgs84: envelope,
      seaSidePolicy: "distance_only_first_poc",
      note: "This first PoC filters by distance to the adopted coastal reference segment. It does not claim a rigorous directional casting sector.",
    },
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
  run(options)
    .then((result) => {
      const summary = result.datasets.map((dataset) => ({
        id: dataset.id,
        status: dataset.status,
        nearshoreFeatureCount: dataset.nearshoreFeatureCount,
        nearestDistanceM: dataset.nearestDistanceM,
      }));
      console.log(JSON.stringify({ output: options.output, summary }, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
