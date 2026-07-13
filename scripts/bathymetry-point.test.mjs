import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadTsModule(file, requireMap = {}) {
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleObject = { exports: {} };
  const sandbox = {
    exports: moduleObject.exports,
    module: moduleObject,
    require: (id) => {
      if (id in requireMap) return requireMap[id];
      throw new Error(`unexpected require: ${id}`);
    },
  };
  vm.runInNewContext(compiled, sandbox, { filename: file });
  return sandbox.module.exports;
}

const bathy = loadTsModule("src/domain/bathymetry.ts");
const point = loadTsModule("src/domain/bathymetryPoint.ts", {
  "./bathymetry": bathy,
  "./bathymetryFallback": {},
  "./mapLayer": {},
});

assert.equal(point.BATHYMETRY_POINT_TILE_CONFIGS.gebco.zoom, 9);
assert.equal(point.BATHYMETRY_POINT_TILE_CONFIGS.etopo.zoom, 8);
assert.equal(point.BATHYMETRY_POINT_TILE_CONFIGS.gebco.label, "GEBCO_2026");
assert.equal(point.BATHYMETRY_POINT_TILE_CONFIGS.etopo.label, "ETOPO 2022 fallback");
assert.equal(point.buildBathymetryTileUrl("/t/{z}/{x}/{y}.png", 9, 440, 205), "/t/9/440/205.png");
assert.equal(point.getBathymetryPointTileConfig("gebco").template, "/bathymetry/gebco-2026/terrain/{z}/{x}/{y}.png");
assert.equal(point.getBathymetryPointTileConfig("etopo").template, "/bathymetry/etopo-2022/terrain/{z}/{x}/{y}.png");

const gebcoTile = point.lonLatToBathymetryTilePixel(129.95, 33.48, "gebco");
assert.equal(gebcoTile.zoom, 9);
assert.equal(gebcoTile.source, "gebco");
assert.equal(gebcoTile.x, 440);
assert.equal(gebcoTile.y, 205);
assert.equal(gebcoTile.pixelX, 209);
assert.equal(gebcoTile.pixelY, 106);
assert.equal(gebcoTile.url, "/bathymetry/gebco-2026/terrain/9/440/205.png");
const etopoTile = point.lonLatToBathymetryTilePixel(129.95, 33.48, "etopo");
assert.equal(etopoTile.zoom, 8);
assert.equal(etopoTile.url, "/bathymetry/etopo-2022/terrain/8/220/102.png");
assert.equal(point.lonLatToBathymetryTilePixel(128.49, 33, "gebco"), null);
assert.equal(point.lonLatToBathymetryTilePixel(129, 32.49, "gebco"), null);
assert.ok(point.lonLatToBathymetryTilePixel(128.5, 32.5, "gebco"));
assert.ok(point.lonLatToBathymetryTilePixel(130.8, 34.0, "gebco"));

assert.equal(point.decodeTerrainRgb(1, 134, 160), 0);
assert.equal(point.decodeTerrainRgb(1, 130, 184), -100);
assert.equal(JSON.stringify(point.bathymetryElevationToPointResult(-123.4)), JSON.stringify({
  status: "success",
  depthMeters: 123,
  displayDepth: "約123m",
  elevationMeters: -123.4,
}));
assert.equal(point.bathymetryElevationToPointResult(0).status, "land");
assert.equal(point.bathymetryElevationToPointResult(8).displayDepth, "陸地または0m以上");

assert.equal(point.shouldLookupBathymetryPoint("bathymetry", "gebco"), true);
assert.equal(point.shouldLookupBathymetryPoint("bathymetry", "etopo"), true);
assert.equal(point.shouldLookupBathymetryPoint("standard", "gebco"), false);
assert.equal(point.shouldLookupBathymetryPoint("aerial", "etopo"), false);
assert.equal(point.shouldLookupBathymetryPoint("bathymetry", "standard"), false);
assert.equal(point.shouldAcceptBathymetryPointResult(2, 2), true);
assert.equal(point.shouldAcceptBathymetryPointResult(1, 2), false);
assert.equal(point.shouldIgnoreBathymetryPointEvent({ mode: "bathymetry", display: "gebco" }), false);
assert.equal(point.shouldIgnoreBathymetryPointEvent({ mode: "bathymetry", display: "gebco", dragging: true }), true);
assert.equal(point.shouldIgnoreBathymetryPointEvent({ mode: "bathymetry", display: "gebco", targetClasses: ["maplibregl-marker"] }), true);
assert.equal(point.shouldIgnoreBathymetryPointEvent({ mode: "standard", display: "gebco" }), true);

const cache = new point.BathymetryTileCache(2);
cache.set("a", 1);
cache.set("b", 2);
assert.equal(cache.get("a"), 1);
cache.set("c", 3);
assert.equal(cache.size, 2);
assert.equal(cache.get("b"), undefined);
assert.equal(cache.get("a"), 1);
assert.equal(cache.get("c"), 3);

console.log("bathymetry point tests passed");
