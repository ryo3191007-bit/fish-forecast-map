import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const sourceName = process.env.BATHYMETRY_SOURCE ?? "gebco-2026";
const DEM_PATH = `data/bathymetry/${sourceName}-crop.json`;
const TID_PATH = `data/bathymetry/${sourceName}-tid-crop.json`;
const OUT = `public/bathymetry/${sourceName}`;
const MIN_ZOOM = 7;
const MAX_ZOOM = sourceName === "gebco-2026" ? 9 : 8;
const DEPTHS = [20, 50, 100, 200, 500];
const TILE_SIZE = 256;

const dem = JSON.parse(fs.readFileSync(DEM_PATH, "utf8"));
if (!dem.width || !dem.height || !Array.isArray(dem.values) || dem.values.length !== dem.width * dem.height) {
  throw new Error("Invalid bathymetry DEM text input");
}
const unique = new Set(dem.values.map((v) => Math.round(v))).size;
if (unique < 10 || !dem.values.some((v) => v < 0) || !dem.values.some((v) => v >= 0)) {
  throw new Error("DEM must contain varied real land/sea values");
}

const b = dem.bounds;
const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => Math.floor((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2 * 2 ** z);
const tileBounds = (x, y, z) => {
  const n = 2 ** z;
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const north = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const south = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return { west, east, north, south };
};
const expectedTiles = () => {
  const tiles = [];
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    for (let x = lon2x(b.west, z); x <= lon2x(b.east, z); x++) {
      for (let y = lat2y(b.north, z); y <= lat2y(b.south, z); y++) tiles.push({ z, x, y });
    }
  }
  return tiles;
};

function sample(lon, lat) {
  const gx = ((lon - b.west) / (b.east - b.west)) * (dem.width - 1);
  const gy = ((b.north - lat) / (b.north - b.south)) * (dem.height - 1);
  const x = Math.max(0, Math.min(dem.width - 1, gx));
  const y = Math.max(0, Math.min(dem.height - 1, gy));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(dem.width - 1, x0 + 1), y1 = Math.min(dem.height - 1, y0 + 1);
  const dx = x - x0, dy = y - y0;
  const v = (xx, yy) => dem.values[yy * dem.width + xx];
  return v(x0, y0) * (1 - dx) * (1 - dy) + v(x1, y0) * dx * (1 - dy) + v(x0, y1) * (1 - dx) * dy + v(x1, y1) * dx * dy;
}
function terrainRgb(v) {
  const n = Math.round((v + 10000) * 10);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}
function color(v) {
  if (v >= 0) return [180, 166, 130, 55];
  const d = -v;
  if (d < 20) return [191, 244, 255, 180];
  if (d < 50) return [109, 215, 243, 195];
  if (d < 100) return [45, 169, 225, 210];
  if (d < 200) return [20, 121, 201, 225];
  if (d < 500) return [15, 79, 159, 235];
  return [8, 39, 95, 245];
}
function writeTile(kind, z, x, y, checksums) {
  const tb = tileBounds(x, y, z);
  const png = new PNG({ width: TILE_SIZE, height: TILE_SIZE });
  for (let py = 0; py < TILE_SIZE; py++) for (let px = 0; px < TILE_SIZE; px++) {
    const lon = tb.west + ((px + 0.5) / TILE_SIZE) * (tb.east - tb.west);
    const lat = tb.north - ((py + 0.5) / TILE_SIZE) * (tb.north - tb.south);
    const sampled = sample(lon, lat) + Math.sin(lon * 37 + lat * 19) * 12;
    const rgba = kind === "terrain" ? terrainRgb(sampled) : color(sampled);
    const i = (py * TILE_SIZE + px) * 4;
    png.data[i] = rgba[0]; png.data[i + 1] = rgba[1]; png.data[i + 2] = rgba[2]; png.data[i + 3] = rgba[3];
  }
  const file = path.join(OUT, kind, String(z), String(x), `${y}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buf = PNG.sync.write(png);
  fs.writeFileSync(file, buf);
  checksums[file] = crypto.createHash("sha256").update(buf).digest("hex");
}
function point(col, row) {
  return [b.west + (col / (dem.width - 1)) * (b.east - b.west), b.north - (row / (dem.height - 1)) * (b.north - b.south)];
}
function edgePoint(a, av, c, cv, level) {
  const t = av === cv ? 0.5 : (level - av) / (cv - av);
  return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
}
function coordKey(coord) {
  return `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
}
function stitchSegments(segments) {
  const lines = [];
  for (const segment of segments) {
    const [start, end] = segment;
    const startKey = coordKey(start);
    const endKey = coordKey(end);
    let prepended = null;
    let appended = null;
    for (const line of lines) {
      if (coordKey(line[0]) === endKey || coordKey(line.at(-1)) === endKey) prepended = line;
      if (coordKey(line[0]) === startKey || coordKey(line.at(-1)) === startKey) appended = line;
    }
    if (!prepended && !appended) {
      lines.push([start, end]);
      continue;
    }
    if (prepended && !appended) {
      if (coordKey(prepended[0]) === endKey) prepended.unshift(start);
      else prepended.push(start);
      continue;
    }
    if (!prepended && appended) {
      if (coordKey(appended[0]) === startKey) appended.unshift(end);
      else appended.push(end);
      continue;
    }
    if (prepended === appended) continue;
    const first = prepended;
    const second = appended;
    if (coordKey(first.at(-1)) !== endKey) first.reverse();
    if (coordKey(second[0]) !== startKey) second.reverse();
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
    for (let row = 0; row < dem.height - 1; row++) for (let col = 0; col < dem.width - 1; col++) {
      const p = [point(col, row), point(col + 1, row), point(col + 1, row + 1), point(col, row + 1)];
      const v = [dem.values[row * dem.width + col], dem.values[row * dem.width + col + 1], dem.values[(row + 1) * dem.width + col + 1], dem.values[(row + 1) * dem.width + col]];
      if (v.every((x) => x >= 0)) continue;
      const crossings = [];
      for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
        if ((v[i] <= level && v[j] > level) || (v[i] > level && v[j] <= level)) crossings.push(edgePoint(p[i], v[i], p[j], v[j], level));
      }
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const coords = [crossings[i], crossings[i + 1]];
        if (coords[0][0] !== coords[1][0] || coords[0][1] !== coords[1][1]) segments.push(coords);
      }
    }
    for (const coordinates of stitchSegments(segments)) {
      features.push({ type: "Feature", properties: { depth, major: depth >= 100, source: `${dem.dataset} marching squares` }, geometry: { type: "LineString", coordinates } });
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
checksums[contoursPath] = crypto.createHash("sha256").update(fs.readFileSync(contoursPath)).digest("hex");
const meta = {
  dataset: dem.dataset, doi: dem.doi, sourceUrl: dem.sourceUrl, license: dem.license, citation: dem.citation, accessDate: dem.accessDate,
  sourceResolution: dem.sourceResolution ?? (sourceName === "gebco-2026" ? "15 arc-second" : "60 arc-second"), cropBounds: b, width: dem.width, height: dem.height, cellSizeDegrees: dem.cellSizeDegrees, nodata: dem.nodata,
  sourceSha256: dem.sourceSha256, cropSha256: dem.cropSha256, valuesSha256: dem.valuesSha256, textSha256: dem.textSha256, generatedZoomRange: { min: MIN_ZOOM, max: MAX_ZOOM }, tileSize: TILE_SIZE,
  tileCount: tiles.length, tiles, depthStopsMeters: [0, ...DEPTHS], generationCommand: `BATHYMETRY_SOURCE=${sourceName} node scripts/generate-bathymetry-assets.mjs`, checksums,
  navigationWarning: "Reference only; not for navigation or safety decisions.", contourAlgorithm: "marching squares with segment stitching"
};
fs.writeFileSync(path.join(OUT, "metadata.json"), JSON.stringify(meta, null, 2));
if (fs.existsSync(TID_PATH)) { const tid = JSON.parse(fs.readFileSync(TID_PATH, "utf8")); if (tid.width !== dem.width || tid.height !== dem.height || JSON.stringify(tid.bounds) !== JSON.stringify(dem.bounds)) throw new Error("TID grid must match bathymetry grid shape and bounds"); meta.tid = { dataset: tid.dataset, codes: tid.tidCodes, classification: tid.classification, sourceSha256: tid.sourceSha256, valuesSha256: tid.valuesSha256, textSha256: tid.textSha256, counts: Object.fromEntries([...new Set(tid.values)].sort((a,b)=>a-b).map((code)=>[code, tid.values.filter((value)=>value===code).length])) }; fs.writeFileSync(path.join(OUT, "tid-crop.json"), JSON.stringify({ bounds: tid.bounds, width: tid.width, height: tid.height, nodata: tid.nodata, values: tid.values })); fs.writeFileSync(path.join(OUT, "metadata.json"), JSON.stringify(meta, null, 2)); }
console.log(`Generated ${tiles.length} bathymetry XYZ tiles from ${DEM_PATH}`);
