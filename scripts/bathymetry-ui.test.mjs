import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { PNG } from "pngjs";

const mapLayer = fs.readFileSync("src/domain/mapLayer.ts", "utf8");
const bathy = fs.readFileSync("src/domain/bathymetry.ts", "utf8");
const map = fs.readFileSync("src/components/FishingMap.tsx", "utf8");
const css = fs.readFileSync("src/app/globals.css", "utf8");
const dem = JSON.parse(fs.readFileSync("data/bathymetry/etopo-2022-crop.json", "utf8"));
const metadata = JSON.parse(fs.readFileSync("public/bathymetry/etopo-2022/metadata.json", "utf8"));
const contours = JSON.parse(fs.readFileSync("public/bathymetry/etopo-2022/contours.geojson", "utf8"));

assert.match(mapLayer, /"bathymetry"/);
for (const label of ["通常地図", "航空写真", "水深・3D地形"]) assert.match(mapLayer, new RegExp(label));
for (const token of ["bathymetry-color-relief", "bathymetry-hillshade", "bathymetry-contours", "setTerrain", "shouldEnableInitialTerrain"]) assert.match(map + bathy, new RegExp(token));
for (const token of ["NOAA NCEI ETOPO 2022", "航海・安全判断には使用不可", "CC0-1.0", "水深データを読み込めませんでした"]) assert.match(map + bathy, new RegExp(token));
assert.equal(metadata.license, "CC0-1.0");
assert.match(metadata.doi, /10\.25921\/fd45-gt74/);
assert.equal(metadata.tileSize, 256);
assert.ok(dem.width > 10 && dem.height > 10);
assert.equal(dem.values.length, dem.width * dem.height);
assert.ok(new Set(dem.values.map((v) => Math.round(v))).size > 10);
assert.ok(dem.values.some((v) => v < 0));
assert.ok(dem.values.some((v) => v >= 0));
assert.equal(crypto.createHash("sha256").update(JSON.stringify(dem.values)).digest("hex"), dem.cropSha256);

function decodeTerrain(png) {
  const vals = new Set();
  for (let i = 0; i < png.data.length; i += 4096) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    vals.add(Math.round(-10000 + ((r * 256 * 256 + g * 256 + b) * 0.1)));
  }
  return vals;
}
for (const { z, x, y } of metadata.tiles) {
  const terrainPath = `public/bathymetry/etopo-2022/terrain/${z}/${x}/${y}.png`;
  const colorPath = `public/bathymetry/etopo-2022/color/${z}/${x}/${y}.png`;
  for (const file of [terrainPath, colorPath]) {
    const buf = fs.readFileSync(file);
    const png = PNG.sync.read(buf);
    assert.equal(png.width, 256);
    assert.equal(png.height, 256);
    assert.equal(crypto.createHash("sha256").update(buf).digest("hex"), metadata.checksums[file]);
  }
  assert.notEqual(fs.readFileSync(terrainPath, "hex"), fs.readFileSync(colorPath, "hex"));
  assert.ok(decodeTerrain(PNG.sync.read(fs.readFileSync(terrainPath))).size > 3);
}
assert.ok(metadata.tiles.length > 1);
assert.equal(metadata.tileCount, metadata.tiles.length);
assert.deepEqual(metadata.depthStopsMeters, [0, 20, 50, 100, 200, 500]);
assert.ok(contours.features.length > 5);
assert.ok(new Set(contours.features.map((f) => f.properties.depth)).size > 2);
for (const f of contours.features) for (const [lon, lat] of f.geometry.coordinates) {
  assert.ok(lon >= metadata.cropBounds.west && lon <= metadata.cropBounds.east);
  assert.ok(lat >= metadata.cropBounds.south && lat <= metadata.cropBounds.north);
}
assert.doesNotMatch(map, /外部メモ \/ 手動メモ|信頼度:|出典URLを開く/);
assert.match(css, /bathymetryLegend/);
assert.match(css, /@media \(max-width: 620px\).*mapLayerToggle/s);
console.log("bathymetry UI requirements passed");
