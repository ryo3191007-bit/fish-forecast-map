import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { PNG } from "pngjs";

const mapLayer = fs.readFileSync("src/domain/mapLayer.ts", "utf8");
const bathy = fs.readFileSync("src/domain/bathymetry.ts", "utf8");
const map = fs.readFileSync("src/components/FishingMap.tsx", "utf8");
const css = fs.readFileSync("src/app/globals.css", "utf8");
const appShell = fs.readFileSync("src/components/AppShell.tsx", "utf8");
const generator = fs.readFileSync(
  "scripts/generate-bathymetry-assets.mjs",
  "utf8",
);
const dem = JSON.parse(
  fs.readFileSync("data/bathymetry/gebco-2026-crop.json", "utf8"),
);
const metadata = JSON.parse(
  fs.readFileSync("public/bathymetry/gebco-2026/metadata.json", "utf8"),
);
const contours = JSON.parse(
  fs.readFileSync("public/bathymetry/gebco-2026/contours.geojson", "utf8"),
);

function parseDomainDepthStops(source) {
  const match = source.match(/export const BATHYMETRY_DEPTH_STOPS = \[([\s\S]*?)\] as const;/);
  assert.ok(match, "domain bathymetry depth stops must be exported");
  return [...match[1].matchAll(/\{ depthMeters: (\d+), label: "([^"]+)", color: "(#(?:[0-9a-f]{6}))", alpha: (\d+) \}/gi)].map(([, depthMeters, label, color, alpha]) => ({
    depthMeters: Number(depthMeters),
    label,
    color: color.toLowerCase(),
    alpha: Number(alpha),
  }));
}

function parseGeneratorColorStops(source) {
  const match = source.match(/const BATHYMETRY_COLOR_STOPS = \[([\s\S]*?)\];/);
  assert.ok(match, "generator bathymetry color stops must be declared");
  return [...match[1].matchAll(/\{ depthMeters: (\d+), rgba: \[(\d+), (\d+), (\d+), (\d+)\] \}/g)].map(([, depthMeters, r, g, b, a]) => ({
    depthMeters: Number(depthMeters),
    rgba: [Number(r), Number(g), Number(b), Number(a)],
  }));
}

function hexAlphaToRgba(color, alpha) {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
    alpha,
  ];
}

const domainDepthStops = parseDomainDepthStops(bathy);
const generatorColorStops = parseGeneratorColorStops(generator);
const expectedDepthStops = [0, 10, 20, 50, 100, 200, 500];
assert.equal(domainDepthStops.length, 7, "domain palette must keep all 7 stops");
assert.equal(generatorColorStops.length, 7, "generator palette must keep all 7 stops");
assert.deepEqual(domainDepthStops.map((stop) => stop.depthMeters), expectedDepthStops);
assert.deepEqual(generatorColorStops.map((stop) => stop.depthMeters), expectedDepthStops);
assert.deepEqual(
  generatorColorStops,
  domainDepthStops.map((stop) => ({
    depthMeters: stop.depthMeters,
    rgba: hexAlphaToRgba(stop.color, stop.alpha),
  })),
  "domain hex+alpha palette must exactly match generator RGBA palette",
);
for (const sourceName of ["gebco-2026", "etopo-2022"]) {
  const sourceMetadata = JSON.parse(
    fs.readFileSync(`public/bathymetry/${sourceName}/metadata.json`, "utf8"),
  );
  assert.deepEqual(sourceMetadata.depthStopsMeters, expectedDepthStops);
  assert.deepEqual(sourceMetadata.colorStops, generatorColorStops);
}

assert.match(mapLayer, /"bathymetry"/);
for (const label of ["通常地図", "航空写真", "水深・3D地形"])
  assert.match(mapLayer, new RegExp(label));
for (const token of [
  "bathymetry-color-relief",
  "bathymetry-hillshade",
  "bathymetry-contours",
  "setTerrain",
  "shouldEnableInitialTerrain",
])
  assert.match(map + bathy, new RegExp(token));
for (const token of ["GEBCO_2026", "高解像度水深を読み込めなかったため"])
  assert.match(map + bathy, new RegExp(token));
assert.doesNotMatch(bathy + map, /bathymetry-coastline/);
assert.doesNotMatch(bathy + map, /bathymetry-land-mask/);
assert.doesNotMatch(map, /海岸線表示/);

assert.doesNotMatch(
  map,
  /BATHYMETRY_EXAGGERATION_NOTE/,
  "FishingMap must not render the consolidated exaggeration note",
);
assert.match(
  map,
  /!isTerrainEnabled[\s\S]*<small>3D OFF中の変更は次回3D表示時に適用されます。<\/small>/,
  "3D OFF operation helper remains in the height slider control",
);
const appNoticeSections = appShell.match(/<section className="appNotice"/g) ?? [];
assert.equal(appNoticeSections.length, 1, "AppShell renders a single appNotice section");
assert.match(
  appShell,
  /<section className="appNotice"[^>]*aria-label="注意事項">[\s\S]*高さ誇張は表示上の演出であり、データ精度は変わりません。[\s\S]*<\/section>/,
  "the consolidated appNotice includes the height exaggeration accuracy disclaimer",
);
assert.doesNotMatch(map, /hideBaseLandLayersForBathymetryCoastline/);
assert.doesNotMatch(map, /isBaseMapLandColorLayer/);
assert.doesNotMatch(map, /hasBeigeYellowOrangeColor/);
assert.doesNotMatch(map, /HIDDEN_BASE_LAND_LAYER_VISIBILITY/);
assert.doesNotMatch(bathy, /xyz\/(?:std|blank)\//);
assert.match(generator, /elevationMeters >= 0\) return \[0, 0, 0, 0\]/);
assert.match(map, /陰影/);
assert.match(map, /等深線/);
assert.match(map, /setHillshadeEnabled\(event\.target\.checked\)/);
assert.match(map, /setContoursEnabled\(event\.target\.checked\)/);
assert.match(map, /BATHYMETRY_SEA_COMPARE_QUERY = "bathymetrySeaCompare"/);
assert.match(map, /seaSurfaceComparisonAvailable \? \(/);
assert.match(map, /実潮位・実海面高度ではありません/);
assert.match(map, /seaSurfaceComparisonAvailable && seaSurfaceComparisonEnabled/);
assert.match(map, /buildBathymetryLayerVisibility/);
assert.match(metadata.license, /GEBCO/);
assert.match(metadata.dataset, /GEBCO_2026/);
assert.equal(metadata.tileSize, 256);
assert.equal(metadata.sourceResolution, "15 arc-second");
assert.ok(
  dem.cellSizeDegrees.longitude > 0 && dem.cellSizeDegrees.latitude > 0,
);
assert.match(bathy, /BATHYMETRY_SOURCE_RESOLUTION = "15 arc-second"/);
assert.match(bathy, /BATHYMETRY_BOUNDS = \[128\.5, 32\.5, 130\.8, 34\.0\]/);
assert.deepEqual(metadata.cropBounds, dem.bounds);
assert.match(map, /bounds: \[\.\.\.BATHYMETRY_BOUNDS\]/);
assert.ok(dem.width > 10 && dem.height > 10);
assert.equal(dem.values.length, dem.width * dem.height);
assert.ok(new Set(dem.values.map((v) => Math.round(v))).size > 10);
assert.ok(dem.values.some((v) => v < 0));
assert.ok(dem.values.some((v) => v >= 0));
assert.ok(dem.textSha256);

function expectedTiles(bounds, minZoom, maxZoom) {
  const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
  const lat2y = (lat, z) =>
    Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
        ) /
          Math.PI) /
        2) *
        2 ** z,
    );
  const tiles = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    for (let x = lon2x(bounds.west, z); x <= lon2x(bounds.east, z); x++) {
      for (let y = lat2y(bounds.north, z); y <= lat2y(bounds.south, z); y++)
        tiles.push({ z, x, y });
    }
  }
  return tiles;
}

function decodeTerrain(png) {
  const vals = new Set();
  for (let i = 0; i < png.data.length; i += 4096) {
    const r = png.data[i],
      g = png.data[i + 1],
      b = png.data[i + 2];
    vals.add(Math.round(-10000 + (r * 256 * 256 + g * 256 + b) * 0.1));
  }
  return vals;
}

let transparentColorPixels = 0;
let visibleColorPixels = 0;
for (const { z, x, y } of metadata.tiles) {
  const terrainPath = `public/bathymetry/gebco-2026/terrain/${z}/${x}/${y}.png`;
  const colorPath = `public/bathymetry/gebco-2026/color/${z}/${x}/${y}.png`;
  for (const file of [terrainPath, colorPath]) {
    const buf = fs.readFileSync(file);
    const png = PNG.sync.read(buf);
    assert.equal(png.width, 256);
    assert.equal(png.height, 256);
    assert.equal(
      crypto.createHash("sha256").update(buf).digest("hex"),
      metadata.checksums[file],
    );
  }
  const colorPng = PNG.sync.read(fs.readFileSync(colorPath));
  for (let index = 3; index < colorPng.data.length; index += 4) {
    if (colorPng.data[index] === 0) transparentColorPixels++;
    else visibleColorPixels++;
  }
  assert.notEqual(
    fs.readFileSync(terrainPath, "hex"),
    fs.readFileSync(colorPath, "hex"),
  );
  assert.ok(
    decodeTerrain(PNG.sync.read(fs.readFileSync(terrainPath))).size > 3,
  );
}
assert.ok(transparentColorPixels > 0, "land pixels must be fully transparent");
assert.ok(visibleColorPixels > 0, "sea depth pixels must remain visible");
const computedTiles = expectedTiles(
  metadata.cropBounds,
  metadata.generatedZoomRange.min,
  metadata.generatedZoomRange.max,
);
assert.deepEqual(metadata.tiles, computedTiles);
assert.ok(metadata.tiles.length > 1);
assert.equal(metadata.tileCount, metadata.tiles.length);
assert.ok(generator.includes("BATHYMETRY_COLOR_STOPS"));
assert.ok(generator.includes("sourceName === \"gebco-2026\" ? \"15 arc-second\" : \"60 arc-second\""));
assert.doesNotMatch(generator, /coastlineOverlay|land-mask|kind: "coastline"/);
assert.ok(contours.features.length > 5);
assert.ok(new Set(contours.features.map((f) => f.properties.depth)).size > 2);
assert.ok(
  contours.features.every(
    (f) =>
      typeof f.properties.depth === "number" &&
      typeof f.properties.major === "boolean",
  ),
);
assert.ok(contours.features.some((f) => f.geometry.coordinates.length > 10));
assert.ok(
  contours.features.some((f) => {
    const lons = f.geometry.coordinates.map(([lon]) => lon);
    const lats = f.geometry.coordinates.map(([, lat]) => lat);
    return (
      f.properties.depth === 50 &&
      Math.max(...lons) - Math.min(...lons) > 0.01 &&
      Math.max(...lats) - Math.min(...lats) > 0.01
    );
  }),
);
for (const f of contours.features)
  for (const [lon, lat] of f.geometry.coordinates) {
    assert.ok(
      lon >= metadata.cropBounds.west && lon <= metadata.cropBounds.east,
    );
    assert.ok(
      lat >= metadata.cropBounds.south && lat <= metadata.cropBounds.north,
    );
  }
assert.doesNotMatch(map, /外部メモ \/ 手動メモ|信頼度:|出典URLを開く/);
assert.match(css, /bathymetryLegend/);
assert.match(css, /@media \(max-width: 620px\).*mapLayerToggle/s);
assert.doesNotMatch(
  fs.readFileSync("README.md", "utf8"),
  /現在やらないこと[\s\S]*3D海底地形表示/,
);

await import("./bathymetry-data.test.mjs");
await import("./bathymetry-fallback.test.mjs");
await import("./bathymetry-tid.test.mjs");
await import("./gebco-converter.test.mjs");

console.log("bathymetry UI requirements passed");
