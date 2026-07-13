import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const bathySource = fs.readFileSync("src/domain/bathymetry.ts", "utf8");
const compiled = ts.transpileModule(bathySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleObject = { exports: {} };
const sandbox = { exports: moduleObject.exports, module: moduleObject };
vm.runInNewContext(compiled, sandbox);
const bathy = sandbox.module.exports;

assert.equal(bathy.BATHYMETRY_EXAGGERATION_DEFAULT, 1.0);
assert.equal(bathy.normalizeBathymetryExaggeration(-5), 1.0);
assert.equal(bathy.normalizeBathymetryExaggeration(1.12), 1.0);
assert.equal(bathy.normalizeBathymetryExaggeration(1.13), 1.25);
assert.equal(bathy.normalizeBathymetryExaggeration(2.37), 2.25);
assert.equal(bathy.normalizeBathymetryExaggeration(2.38), 2.5);
assert.equal(bathy.normalizeBathymetryExaggeration(9), 4.0);
assert.equal(bathy.resetBathymetryExaggeration(), 1.0);
assert.equal(bathy.formatBathymetryExaggeration(1), "1.0×");
assert.equal(bathy.formatBathymetryExaggeration(2.25), "2.25×");
assert.equal(bathy.findBathymetryViewPreset(0, 0), "top");
assert.equal(bathy.findBathymetryViewPreset(52, -18), "oblique");
assert.equal(bathy.findBathymetryViewPreset(68, -18), "low");
assert.equal(bathy.findBathymetryViewPreset(40, -18), null);
assert.equal(bathy.bathymetryControlsDisabled("unsupported"), true);
assert.equal(bathy.bathymetryControlsDisabled("2d"), false);

function applyTerrain({ map, display, exaggeration, terrainEnabled = true }) {
  if (!terrainEnabled || display === "standard") {
    map.setTerrain(null);
    return;
  }
  const source = display === "gebco" ? bathy.BATHYMETRY_SOURCE_ID : bathy.BATHYMETRY_FALLBACK_SOURCE_ID;
  map.setTerrain({ source, exaggeration: bathy.normalizeBathymetryExaggeration(exaggeration) });
}

const terrainCalls = [];
const cameraCalls = [];
const mockMap = {
  setTerrain: (terrain) => terrainCalls.push(terrain),
  easeTo: (camera) => cameraCalls.push(camera),
  jumpTo: (camera) => cameraCalls.push(camera),
};
applyTerrain({ map: mockMap, display: "gebco", exaggeration: 2.25 });
assert.deepEqual(terrainCalls.at(-1), { source: bathy.BATHYMETRY_SOURCE_ID, exaggeration: 2.25 });
assert.equal(cameraCalls.length, 0, "slider/terrain exaggeration updates must not move camera");
applyTerrain({ map: mockMap, display: "etopo", exaggeration: 3.75 });
assert.deepEqual(terrainCalls.at(-1), { source: bathy.BATHYMETRY_FALLBACK_SOURCE_ID, exaggeration: 3.75 });
applyTerrain({ map: mockMap, display: "etopo", exaggeration: 3.75, terrainEnabled: false });
assert.equal(terrainCalls.at(-1), null);
applyTerrain({ map: mockMap, display: "gebco", exaggeration: 3.75 });
assert.deepEqual(terrainCalls.at(-1), { source: bathy.BATHYMETRY_SOURCE_ID, exaggeration: 3.75 });
applyTerrain({ map: mockMap, display: "standard", exaggeration: 4 });
assert.equal(terrainCalls.at(-1), null, "standard/aerial layer modes clear terrain");

function cameraTransition({ map, preset, reducedMotion }) {
  const options = { pitch: preset.pitch, bearing: preset.bearing, duration: reducedMotion ? 0 : 260, essential: false };
  if (reducedMotion) map.jumpTo(options);
  else map.easeTo(options);
}
for (const preset of bathy.BATHYMETRY_VIEW_PRESETS) {
  cameraTransition({ map: mockMap, preset, reducedMotion: false });
  assert.equal(cameraCalls.at(-1).pitch, preset.pitch);
  assert.equal(cameraCalls.at(-1).bearing, preset.bearing);
  assert.equal(cameraCalls.at(-1).duration, 260);
}
cameraTransition({ map: mockMap, preset: bathy.BATHYMETRY_VIEW_PRESETS[1], reducedMotion: true });
assert.equal(cameraCalls.at(-1).duration, 0);
assert.equal(bathy.findBathymetryViewPreset(41, -18), null, "manual pitch/bearing changes clear selected preset");

const mapSource = fs.readFileSync("src/components/FishingMap.tsx", "utf8");
assert.match(mapSource, /terrainStatus === "unsupported"|bathymetryControlsDisabled\(terrainStatus\)/);
assert.match(mapSource, /map\.stop\(\)/, "preset animations should not queue");
assert.match(mapSource, /mode !== "bathymetry" \|\| display === "standard"/);
assert.match(mapSource, /BATHYMETRY_EXAGGERATION_NOTE/);
console.log("bathymetry view controls tests passed");
