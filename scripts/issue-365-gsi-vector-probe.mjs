import { VectorTile } from "@mapbox/vector-tile";
import Protobuf from "pbf";

const CENTER = { latitude: 33.469823, longitude: 129.963189 };
const ZOOM = 16;
const TILE_RADIUS = 2;
const TARGET_CODES = new Set([5101, 5102, 5103]);

const toTile = ({ latitude, longitude }, zoom) => {
  const n = 2 ** zoom;
  return {
    x: Math.floor(((longitude + 180) / 360) * n),
    y: Math.floor(
      ((1 - Math.asinh(Math.tan((latitude * Math.PI) / 180)) / Math.PI) / 2) * n,
    ),
  };
};

const haversineMeters = (a, b) => {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
};

const flattenLineCoordinates = (geometry) => {
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
};

const lineLengthMeters = (lines) => {
  let total = 0;
  for (const line of lines) {
    for (let i = 1; i < line.length; i += 1) {
      total += haversineMeters(
        { longitude: line[i - 1][0], latitude: line[i - 1][1] },
        { longitude: line[i][0], latitude: line[i][1] },
      );
    }
  }
  return total;
};

const minVertexDistanceMeters = (lines) => {
  let min = Infinity;
  for (const line of lines) {
    for (const [longitude, latitude] of line) {
      min = Math.min(min, haversineMeters(CENTER, { longitude, latitude }));
    }
  }
  return min;
};

const centerTile = toTile(CENTER, ZOOM);
const found = [];

for (let dx = -TILE_RADIUS; dx <= TILE_RADIUS; dx += 1) {
  for (let dy = -TILE_RADIUS; dy <= TILE_RADIUS; dy += 1) {
    const x = centerTile.x + dx;
    const y = centerTile.y + dy;
    const url = `https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/${ZOOM}/${x}/${y}.pbf`;
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`tile ${x}/${y}: HTTP ${response.status}`);
      continue;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const tile = new VectorTile(new Protobuf(bytes));
    const layer = tile.layers.coastline;
    if (!layer) continue;

    for (let i = 0; i < layer.length; i += 1) {
      const feature = layer.feature(i);
      const ftCode = Number(feature.properties.ftCode);
      if (!TARGET_CODES.has(ftCode)) continue;

      const geojson = feature.toGeoJSON(x, y, ZOOM);
      const lines = flattenLineCoordinates(geojson.geometry);
      const minDistanceM = minVertexDistanceMeters(lines);
      if (minDistanceM > 1_500) continue;

      found.push({
        ftCode,
        tile: [x, y],
        featureIndex: i,
        lengthM: Math.round(lineLengthMeters(lines) * 10) / 10,
        minVertexDistanceM: Math.round(minDistanceM * 10) / 10,
        geometry: geojson.geometry,
      });
    }
  }
}

found.sort((a, b) => a.minVertexDistanceM - b.minVertexDistanceM);
console.log(`centerTile=${ZOOM}/${centerTile.x}/${centerTile.y}`);
console.log(`found=${found.length}`);
for (const item of found.slice(0, 40)) {
  console.log(JSON.stringify(item));
}
