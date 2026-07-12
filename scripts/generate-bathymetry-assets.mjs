import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PNG } from "pngjs";
import {
  encodeTerrainRgb,
  gridCellCentre,
  samplePixelCentreGrid,
} from "./bathymetry-grid.mjs";

const requestedSource = process.env.BATHYMETRY_SOURCE;
if (!requestedSource) {
  for (const source of ["gebco-2026", "etopo-2022"]) {
    const result = spawnSync(process.execPath, [process.argv[1]], {
      env: { ...process.env, BATHYMETRY_SOURCE: source },
      stdio: "inherit",
    });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
  process.exit(0);
}

const sourceName = requestedSource;
const DEM_PATH = `data/bathymetry/${sourceName}-crop.json`;
const TID_PATH = `data/bathymetry/${sourceName}-tid-crop.json`;
const OUT = `public/bathymetry/${sourceName}`;
const MIN_ZOOM = 7;
const MAX_ZOOM = sourceName === "gebco-2026" ? 9 : 8;
const DEPTHS = [20, 50, 100, 200, 500];
const TILE_SIZE = 256;

const dem = JSON.parse(fs.readFileSync(DEM_PATH, "utf8"));
if (
  !dem.width ||
  !dem.height ||
  !Array.isArray(dem.values) ||
  dem.values.length !== dem.width * dem.height
) {
  throw new Error("Invalid bathymetry DEM text input");
}
const unique = new Set(dem.values.map((value) => Math.round(value))).size;
if (
  unique < 10 ||
  !dem.values.some((value) => value < 0) ||
  !dem.values.some((value) => value >= 0)
) {
  throw new Error("DEM must contain varied real land/sea values");
}

const bounds = dem.bounds;
const lon2x = (lon, zoom) =>
  Math.floor(((lon + 180) / 360) * 2 ** zoom);
const lat2y = (lat, zoom) =>
  Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) +
          1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
      2 ** zoom,
  );
const tileBounds = (x, y, zoom) => {
  const count = 2 ** zoom;
  return {
    west: (x / count) * 360 - 180,
    east: ((x + 1) / count) * 360 - 180,
    north:
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / count))) * 180) /
      Math.PI,
    south:
      (Math.atan(
        Math.sinh(Math.PI * (1 - (2 * (y + 1)) / count)),
      ) *
        180) /
      Math.PI,
  };
};
const expectedTiles = () => {
  const tiles = [];
  for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom++) {
    for (
      let x = lon2x(bounds.west, zoom);
      x <= lon2x(bounds.east, zoom);
      x++
    ) {
      for (
        let y = lat2y(bounds.north, zoom);
        y <= lat2y(bounds.south, zoom);
        y++
      ) {
        tiles.push({ z: zoom, x, y });
      }
    }
  }
  return tiles;
};

function color(elevationMeters) {
  if (elevationMeters >= 0) return [180, 166, 130, 55];
  const depth = -elevationMeters;
  if (depth < 20) return [191, 244, 255, 180];
  if (depth < 50) return [109, 215, 243, 195];
  if (depth < 100) return [45, 169, 225, 210];
  if (depth < 200) return [20, 121, 201, 225];
  if (depth < 500) return [15, 79, 159, 235];
  return [8, 39, 95, 245];
}

function writeTile(kind, zoom, x, y, checksums) {
  const currentBounds = tileBounds(x, y, zoom);
  const png = new PNG({ width: TILE_SIZE, height: TILE_SIZE });

  for (let pixelY = 0; pixelY < TILE_SIZE; pixelY++) {
    for (let pixelX = 0; pixelX < TILE_SIZE; pixelX++) {
      const lon =
        currentBounds.west +
        ((pixelX + 0.5) / TILE_SIZE) *
          (currentBounds.east - currentBounds.west);
      const lat =
        currentBounds.north -
        ((pixelY + 0.5) / TILE_SIZE) *
          (currentBounds.north - currentBounds.south);
      const sampled = samplePixelCentreGrid(dem, lon, lat);
      const rgba = kind === "terrain" ? encodeTerrainRgb(sampled) : color(sampled);
      const index = (pixelY * TILE_SIZE + pixelX) * 4;
      png.data[index] = rgba[0];
      png.data[index + 1] = rgba[1];
      png.data[index + 2] = rgba[2];
      png.data[index + 3] = rgba[3];
    }
  }

  const file = path.join(OUT, kind, String(zoom), String(x), `${y}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(file, buffer);
  checksums[file] = crypto.createHash("sha256").update(buffer).digest("hex");
}

function edgePoint(start, startValue, end, endValue, level) {
  const ratio =
    startValue === endValue ? 0.5 : (level - startValue) / (endValue - startValue);
  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
}

function coordinateKey(coordinate) {
  return `${coordinate[0].toFixed(6)},${coordinate[1].toFixed(6)}`;
}

function stitchSegments(segments) {
  const lines = [];
  for (const [start, end] of segments) {
    const startKey = coordinateKey(start);
    const endKey = coordinateKey(end);
    let prependTarget = null;
    let appendTarget = null;

    for (const line of lines) {
      if (
        coordinateKey(line[0]) === endKey ||
        coordinateKey(line.at(-1)) === endKey
      ) {
        prependTarget = line;
      }
      if (
        coordinateKey(line[0]) === startKey ||
        coordinateKey(line.at(-1)) === startKey
      ) {
        appendTarget = line;
      }
    }

    if (!prependTarget && !appendTarget) {
      lines.push([start, end]);
      continue;
    }
    if (prependTarget && !appendTarget) {
      if (coordinateKey(prependTarget[0]) === endKey) prependTarget.unshift(start);
      else prependTarget.push(start);
      continue;
    }
    if (!prependTarget && appendTarget) {
      if (coordinateKey(appendTarget[0]) === startKey) appendTarget.unshift(end);
      else appendTarget.push(end);
      continue;
    }
    if (prependTarget === appendTarget) continue;

    const first = prependTarget;
    const second = appendTarget;
    if (coordinateKey(first.at(-1)) !== endKey) first.reverse();
    if (coordinateKey(second[0]) !== startKey) second.reverse();
    first.push(...second.slice(1));
    lines.splice(lines.indexOf(second), 1);
  }
  return lines.filter((line) => line.length >= 2);
}

function generateContours() {
  const features = [];
  for (const depth of DEPTHS) {
    const level = -depth;
    const segments = [];
    for (let row = 0; row < dem.height - 1; row++) {
      for (let column = 0; column < dem.width - 1; column++) {
        const points = [
          gridCellCentre(dem, column, row),
          gridCellCentre(dem, column + 1, row),
          gridCellCentre(dem, column + 1, row + 1),
          gridCellCentre(dem, column, row + 1),
        ];
        const values = [
          dem.values[row * dem.width + column],
          dem.values[row * dem.width + column + 1],
          dem.values[(row + 1) * dem.width + column + 1],
          dem.values[(row + 1) * dem.width + column],
        ];
        if (values.every((value) => value >= 0)) continue;

        const crossings = [];
        for (const [from, to] of [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ]) {
          if (
            (values[from] <= level && values[to] > level) ||
            (values[from] > level && values[to] <= level)
          ) {
            crossings.push(
              edgePoint(
                points[from],
                values[from],
                points[to],
                values[to],
                level,
              ),
            );
          }
        }
        for (let index = 0; index + 1 < crossings.length; index += 2) {
          const coordinates = [crossings[index], crossings[index + 1]];
          if (
            coordinates[0][0] !== coordinates[1][0] ||
            coordinates[0][1] !== coordinates[1][1]
          ) {
            segments.push(coordinates);
          }
        }
      }
    }

    for (const coordinates of stitchSegments(segments)) {
      features.push({
        type: "Feature",
        properties: {
          depth,
          major: depth >= 100,
          source: `${dem.dataset} marching squares`,
        },
        geometry: { type: "LineString", coordinates },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

fs.rmSync(path.join(OUT, "terrain"), { recursive: true, force: true });
fs.rmSync(path.join(OUT, "color"), { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const checksums = {};
const tiles = expectedTiles();
for (const { z, x, y } of tiles) {
  writeTile("terrain", z, x, y, checksums);
  writeTile("color", z, x, y, checksums);
}

const contours = generateContours();
const contoursPath = path.join(OUT, "contours.geojson");
fs.writeFileSync(contoursPath, JSON.stringify(contours, null, 2));
checksums[contoursPath] = crypto
  .createHash("sha256")
  .update(fs.readFileSync(contoursPath))
  .digest("hex");

const metadata = {
  dataset: dem.dataset,
  doi: dem.doi,
  sourceUrl: dem.sourceUrl,
  license: dem.license,
  citation: dem.citation,
  accessDate: dem.accessDate,
  sourceResolution:
    dem.sourceResolution ??
    (sourceName === "gebco-2026" ? "15 arc-second" : "60 arc-second"),
  cropBounds: bounds,
  width: dem.width,
  height: dem.height,
  cellSizeDegrees: dem.cellSizeDegrees,
  nodata: dem.nodata,
  sourceSha256: dem.sourceSha256,
  cropSha256: dem.cropSha256,
  valuesSha256: dem.valuesSha256,
  textSha256: dem.textSha256,
  generatedZoomRange: { min: MIN_ZOOM, max: MAX_ZOOM },
  tileSize: TILE_SIZE,
  tileCount: tiles.length,
  tiles,
  depthStopsMeters: [0, ...DEPTHS],
  generationCommand: `BATHYMETRY_SOURCE=${sourceName} node scripts/generate-bathymetry-assets.mjs`,
  checksums,
  navigationWarning: "Reference only; not for navigation or safety decisions.",
  contourAlgorithm:
    "marching squares with segment stitching on pixel-centre registered cells",
};

if (fs.existsSync(TID_PATH)) {
  const tid = JSON.parse(fs.readFileSync(TID_PATH, "utf8"));
  if (
    tid.width !== dem.width ||
    tid.height !== dem.height ||
    JSON.stringify(tid.bounds) !== JSON.stringify(dem.bounds)
  ) {
    throw new Error("TID grid must match bathymetry grid shape and bounds");
  }
  metadata.tid = {
    dataset: tid.dataset,
    codes: tid.tidCodes,
    classification: tid.classification,
    sourceSha256: tid.sourceSha256,
    valuesSha256: tid.valuesSha256,
    textSha256: tid.textSha256,
    counts: Object.fromEntries(
      [...new Set(tid.values)]
        .sort((left, right) => left - right)
        .map((code) => [
          code,
          tid.values.filter((value) => value === code).length,
        ]),
    ),
  };
  fs.writeFileSync(
    path.join(OUT, "tid-crop.json"),
    JSON.stringify({
      bounds: tid.bounds,
      width: tid.width,
      height: tid.height,
      nodata: tid.nodata,
      values: tid.values,
    }),
  );
}

fs.writeFileSync(
  path.join(OUT, "metadata.json"),
  JSON.stringify(metadata, null, 2),
);
console.log(`Generated ${tiles.length} bathymetry XYZ tiles from ${DEM_PATH}`);
