import assert from "node:assert/strict";
import fs from "node:fs";

const mapLayer = fs.readFileSync("src/domain/mapLayer.ts", "utf8");
const bathy = fs.readFileSync("src/domain/bathymetry.ts", "utf8");
const map = fs.readFileSync("src/components/FishingMap.tsx", "utf8");
const css = fs.readFileSync("src/app/globals.css", "utf8");
const metadata = JSON.parse(
  fs.readFileSync("public/bathymetry/etopo-2022/metadata.json", "utf8"),
);

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
for (const token of [
  "NOAA NCEI ETOPO 2022",
  "航海・安全判断には使用不可",
  "CC0-1.0",
])
  assert.match(map + bathy, new RegExp(token));
assert.equal(
  metadata.dataset,
  "NOAA NCEI ETOPO 2022 15 Arc-Second Global Relief Model",
);
assert.equal(metadata.license, "CC0-1.0");
assert.match(metadata.doi, /10\.25921\/fd45-gt74/);
assert.equal(metadata.sourceResolution, "15 arc-second");
assert.ok(fs.existsSync("public/bathymetry/etopo-2022/terrain/7/110/50.png"));
assert.ok(fs.existsSync("public/bathymetry/etopo-2022/color/7/110/50.png"));
const fixture = JSON.parse(
  fs.readFileSync("data/bathymetry/etopo-2022-sample-tiles.json", "utf8"),
);
assert.equal(fixture.files.length, 2);
for (const file of fixture.files)
  assert.match(file.content, /^[A-Za-z0-9+/=]+$/);
assert.doesNotMatch(map, /外部メモ \/ 手動メモ|信頼度:|出典URLを開く/);
assert.match(css, /bathymetryLegend/);
assert.match(css, /@media \(max-width: 620px\).*mapLayerToggle/s);
console.log("bathymetry UI requirements passed");
