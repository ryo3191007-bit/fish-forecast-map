import crypto from "node:crypto";
import fs from "node:fs";
import { PNG } from "pngjs";
import {
  decodeTerrainRgb,
  gridCellCentre,
  samplePixelCentreGrid,
} from "./bathymetry-grid.mjs";

const dem = JSON.parse(
  fs.readFileSync("data/bathymetry/gebco-2026-crop.json", "utf8"),
);
const tid = JSON.parse(
  fs.readFileSync("data/bathymetry/gebco-2026-tid-crop.json", "utf8"),
);
const metadata = JSON.parse(
  fs.readFileSync("public/bathymetry/gebco-2026/metadata.json", "utf8"),
);
const expectedBounds = {
  west: 128.5,
  south: 32.5,
  east: 130.8,
  north: 34.0,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function digest(record) {
  const copy = { ...record };
  delete copy.textSha256;
  return crypto.createHash("sha256").update(JSON.stringify(copy)).digest("hex");
}
function valuesDigest(values) {
  return crypto.createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

assert(dem.dataset === "GEBCO_2026 Grid", "primary bathymetry must be GEBCO_2026 Grid");
assert(dem.width === 552 && dem.height === 360, "GEBCO official crop shape must be 552 x 360");
assert(dem.nodata === -32767, "GEBCO DEM nodata must match official NetCDF");
assert(dem.min === -277 && dem.max === 1346, "GEBCO DEM min/max must match official NetCDF");
assert(
  dem.sourceSha256 ===
    "6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151",
  "DEM source SHA-256 must match Post-MVP-037 official NetCDF",
);
assert(/^[a-f0-9]{64}$/.test(dem.sourceSha256), "DEM source SHA-256 must be real 64-char hex");
assert(dem.values.length === dem.width * dem.height, "DEM values length must match shape");
assert(
  dem.valuesSha256 ===
    "59f02c67f79aa3edb61548ddd0dcb669880f6164ccc97eb8dd1a9fbfb0fd244b",
  "DEM value-array checksum must match official NetCDF row-major crop",
);
assert(valuesDigest(dem.values) === dem.valuesSha256, "DEM value-array checksum must validate");
assert(
  dem.values.slice(0, 6).join("/") === "-104/-103/-103/-102/-103/-103",
  "DEM values must start with the official north-west NetCDF row",
);
assert(
  tid.values.length === dem.values.length &&
    tid.width === dem.width &&
    tid.height === dem.height,
  "TID shape must match DEM",
);
assert(tid.nodata === 127, "GEBCO TID nodata must be 127");
assert(
  tid.valuesSha256 ===
    "f39a3d090f387d124c1b5a10ecfff113f186b5f916ad2cc4001d5bebf2a70688",
  "TID value-array checksum must match official NetCDF row-major crop",
);
assert(valuesDigest(tid.values) === tid.valuesSha256, "TID value-array checksum must validate");
assert(
  tid.values.slice(0, 6).join("/") === "40/40/40/17/17/17",
  "TID values must start with the official north-west NetCDF row",
);
assert(
  tid.sourceSha256 ===
    "04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84",
  "TID source SHA-256 must match Post-MVP-037 official NetCDF",
);
assert(/^[a-f0-9]{64}$/.test(tid.sourceSha256), "TID source SHA-256 must be real 64-char hex");
assert(JSON.stringify(dem.bounds) === JSON.stringify(expectedBounds), "DEM bounds must match Issue #113 crop");
assert(JSON.stringify(tid.bounds) === JSON.stringify(dem.bounds), "TID bounds must match DEM bounds");
assert(
  dem.cellSizeDegrees.longitude > 0 && dem.cellSizeDegrees.latitude > 0,
  "cell size must be positive",
);
assert(dem.values.some((value) => value < 0) && dem.values.some((value) => value >= 0), "DEM must include sea and land values");
assert(digest(dem) === dem.textSha256, "DEM text checksum must match");
assert(digest(tid) === tid.textSha256, "TID text checksum must match");
const observed = [...new Set(tid.values)].sort((a, b) => a - b).join("/");
assert(observed === "0/11/17/40/43/44", "TID observed codes must match official crop record");
const allowed = new Set([
  ...tid.classification.direct,
  ...tid.classification.predictedInterpolated,
  ...tid.classification.mixedUnknownLand,
  ...tid.classification.nodata,
]);
assert(tid.values.every((code) => allowed.has(code)), "TID codes must be known classification codes");

// Pixel-centre registration: sampling the exact centre of a source cell must
// return the source value without stretching it to the crop edges.
for (const [column, row] of [
  [0, 0],
  [Math.floor(dem.width / 2), Math.floor(dem.height / 2)],
  [dem.width - 1, dem.height - 1],
]) {
  const [lon, lat] = gridCellCentre(dem, column, row);
  const sampled = samplePixelCentreGrid(dem, lon, lat);
  assert(
    sampled === dem.values[row * dem.width + column],
    `cell-centre sample mismatch at ${column},${row}`,
  );
}

function tileBounds(x, y, zoom) {
  const count = 2 ** zoom;
  return {
    west: (x / count) * 360 - 180,
    east: ((x + 1) / count) * 360 - 180,
    north:
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / count))) * 180) /
      Math.PI,
    south:
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / count))) * 180) /
      Math.PI,
  };
}

// Decode an actual generated Terrain-RGB pixel and compare it with the source
// DEM sampled at the same tile-pixel centre.
const tile = metadata.tiles[Math.floor(metadata.tiles.length / 2)];
const pixelX = 127;
const pixelY = 129;
const currentBounds = tileBounds(tile.x, tile.y, tile.z);
const lon =
  currentBounds.west +
  ((pixelX + 0.5) / metadata.tileSize) *
    (currentBounds.east - currentBounds.west);
const lat =
  currentBounds.north -
  ((pixelY + 0.5) / metadata.tileSize) *
    (currentBounds.north - currentBounds.south);
const expectedElevation = samplePixelCentreGrid(dem, lon, lat);
const terrainPath = `public/bathymetry/gebco-2026/terrain/${tile.z}/${tile.x}/${tile.y}.png`;
const png = PNG.sync.read(fs.readFileSync(terrainPath));
const index = (pixelY * png.width + pixelX) * 4;
const decodedElevation = decodeTerrainRgb(
  png.data[index],
  png.data[index + 1],
  png.data[index + 2],
);
assert(
  Math.abs(decodedElevation - expectedElevation) <= 0.11,
  `Terrain-RGB must match the source DEM sample: expected=${expectedElevation}, actual=${decodedElevation}`,
);

const generator = fs.readFileSync("scripts/generate-bathymetry-assets.mjs", "utf8");
assert(!/Math\.sin\s*\(/.test(generator), "artificial sinusoidal bathymetry must not be reintroduced");
assert(/samplePixelCentreGrid/.test(generator), "generator must use pixel-centre sampling helper");
assert(/gridCellCentre/.test(generator), "contours must use pixel-centre coordinates");

console.log("bathymetry data and generated Terrain-RGB checks passed");
