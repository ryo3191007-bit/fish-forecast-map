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
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(compiled, sandbox, { filename: file });
  return sandbox.module.exports;
}

const bathy = loadTsModule("src/domain/bathymetry.ts");
const bathyView = loadTsModule("src/domain/bathymetryView.ts", {
  "./bathymetry": bathy,
  "./bathymetryFallback": {},
  "./mapLayer": {},
});

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

function sameJson(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

function createMockMap() {
  const calls = { terrain: [], easeTo: [], jumpTo: [], stop: 0, once: [], off: [] };
  return {
    calls,
    map: {
      setTerrain: (terrain) => calls.terrain.push(terrain),
      easeTo: (camera) => calls.easeTo.push(camera),
      jumpTo: (camera) => calls.jumpTo.push(camera),
      stop: () => { calls.stop += 1; },
      once: (type, listener) => calls.once.push({ type, listener }),
      off: (type, listener) => calls.off.push({ type, listener }),
    },
  };
}

let mock = createMockMap();
bathyView.applyBathymetryTerrain(mock.map, { display: "gebco", exaggeration: 2.25 });
sameJson(mock.calls.terrain.at(-1), { source: bathy.BATHYMETRY_SOURCE_ID, exaggeration: 2.25 });
assert.equal(mock.calls.easeTo.length + mock.calls.jumpTo.length, 0, "slider updates must not move camera");
bathyView.applyBathymetryTerrain(mock.map, { display: "etopo", exaggeration: 3.75 });
sameJson(mock.calls.terrain.at(-1), { source: bathy.BATHYMETRY_FALLBACK_SOURCE_ID, exaggeration: 3.75 });
bathyView.applyBathymetryTerrain(mock.map, { display: "etopo", exaggeration: 3.75, terrainEnabled: false });
assert.equal(mock.calls.terrain.at(-1), null, "3D OFF clears terrain");
bathyView.applyBathymetryTerrain(mock.map, { display: "gebco", exaggeration: 3.75 });
sameJson(mock.calls.terrain.at(-1), { source: bathy.BATHYMETRY_SOURCE_ID, exaggeration: 3.75 }, "3D re-ON restores multiplier");
bathyView.applyBathymetryTerrain(mock.map, { display: "standard", exaggeration: 4 });
assert.equal(mock.calls.terrain.at(-1), null, "standard/aerial layer modes clear terrain");

assert.equal(bathyView.shouldApplyBathymetryObliqueView({ mode: "bathymetry", previousMode: "standard", terrainEnabled: true, previousTerrainEnabled: true, initialBathymetryViewApplied: false }), true);
assert.equal(bathyView.shouldApplyBathymetryObliqueView({ mode: "bathymetry", previousMode: "bathymetry", terrainEnabled: true, previousTerrainEnabled: true, initialBathymetryViewApplied: true }), false, "same-mode slider/coastline/fallback updates do not reapply camera");
assert.equal(bathyView.shouldApplyBathymetryObliqueView({ mode: "bathymetry", previousMode: "bathymetry", terrainEnabled: true, previousTerrainEnabled: false, initialBathymetryViewApplied: true }), true, "3D OFF->ON applies oblique view");
assert.equal(bathyView.shouldApplyBathymetryObliqueView({ mode: "bathymetry", previousMode: "standard", terrainEnabled: false, previousTerrainEnabled: true, initialBathymetryViewApplied: false }), false);

for (const preset of bathy.BATHYMETRY_VIEW_PRESETS) {
  const options = bathyView.buildBathymetryCameraOptions({ preset, reducedMotion: false });
  assert.equal(options.pitch, preset.pitch);
  assert.equal(options.bearing, preset.bearing);
  assert.equal(options.duration, 260);
}
const oblique = bathyView.getDefaultBathymetryViewPreset();
sameJson({ pitch: oblique.pitch, bearing: oblique.bearing }, { pitch: 52, bearing: -18 });
assert.equal(bathyView.buildBathymetryCameraOptions({ preset: oblique, reducedMotion: true }).duration, 0);

mock = createMockMap();
let manager = bathyView.createBathymetryCameraTransitionManager();
bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: oblique, reducedMotion: true });
assert.equal(mock.calls.jumpTo.length, 1, "reduced motion uses jumpTo");
assert.equal(mock.calls.easeTo.length, 0);
assert.equal(manager.active, false);

mock = createMockMap();
manager = bathyView.createBathymetryCameraTransitionManager();
bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: oblique, reducedMotion: false, duration: 260 });
assert.equal(mock.calls.stop, 1);
assert.equal(mock.calls.easeTo.length, 1, "normal motion uses easeTo");
assert.equal(mock.calls.easeTo[0].duration, 260);
const firstListener = mock.calls.once[0].listener;
bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: bathy.BATHYMETRY_VIEW_PRESETS[2], reducedMotion: false, duration: 260 });
assert.equal(mock.calls.stop, 2, "repeated presets stop previous animation");
assert.equal(mock.calls.off.length >= 1, true, "old transition listener is removed");
firstListener();
assert.equal(manager.active, true, "old transition callback cannot finish the new transition");
mock.calls.once.at(-1).listener();
assert.equal(manager.active, false);

manager = bathyView.createBathymetryCameraTransitionManager();
mock = createMockMap();
bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: oblique, reducedMotion: false });
assert.equal(bathyView.shouldClearPresetForCameraInteraction({ originalEvent: { type: "pointerdown" } }), true, "user pitch/rotate start clears selected preset");
bathyView.clearBathymetryCameraTransition(manager, mock.map);
assert.equal(manager.active, false, "user interruption clears programmatic transition");
assert.equal(bathyView.shouldClearPresetForCameraInteraction({}), false);

const mapSource = fs.readFileSync("src/components/FishingMap.tsx", "utf8");
assert.match(mapSource, /setSelectedViewPreset\(null\)/, "3D OFF clears selected preset");
assert.match(mapSource, /shouldApplyBathymetryObliqueView/);
assert.match(mapSource, /bathymetryControlsDisabled\(terrainStatus\)/, "unsupported state disables controls");
assert.match(mapSource, /BATHYMETRY_EXAGGERATION_NOTE/);
console.log("bathymetry view controls tests passed");
