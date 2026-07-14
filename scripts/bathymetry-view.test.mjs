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

function createMockMap(initialTerrain) {
  const calls = { terrain: [], easeTo: [], jumpTo: [], stop: 0, once: [], off: [], repaint: 0 };
  let terrain = initialTerrain;
  return {
    calls,
    map: {
      setTerrain: (nextTerrain) => { terrain = nextTerrain; calls.terrain.push(nextTerrain); },
      getTerrain: () => terrain,
      triggerRepaint: () => { calls.repaint += 1; },
      easeTo: (camera) => calls.easeTo.push(camera),
      jumpTo: (camera) => calls.jumpTo.push(camera),
      stop: () => { calls.stop += 1; },
      once: (type, listener) => calls.once.push({ type, listener }),
      off: (type, listener) => calls.off.push({ type, listener }),
    },
  };
}

let mock = createMockMap();
let terrainResult = bathyView.applyBathymetryTerrain(mock.map, { display: "gebco", exaggeration: 2.25 });
sameJson(mock.calls.terrain.at(-1), { source: bathy.BATHYMETRY_SOURCE_ID, exaggeration: 2.25 });
assert.equal(terrainResult.applied, true, "1.0x->別倍率は最新倍率を持つterrain commandを適用する");
assert.equal(mock.calls.easeTo.length + mock.calls.jumpTo.length, 0, "slider updates must not move camera");
terrainResult = bathyView.applyBathymetryTerrain(mock.map, { display: "gebco", exaggeration: 2.25 });
assert.equal(terrainResult.applied, false, "same source/exaggeration skips unnecessary reapply");
assert.equal(mock.calls.terrain.length, 1, "same source/exaggeration does not call setTerrain again");
terrainResult = bathyView.applyBathymetryTerrain(mock.map, { display: "gebco", exaggeration: 4 });
assert.equal(terrainResult.clearedBeforeApply, true, "same-source exaggeration changes refresh terrain geometry before applying final value");
sameJson(mock.calls.terrain.slice(-2), [null, { source: bathy.BATHYMETRY_SOURCE_ID, exaggeration: 4 }]);
sameJson(mock.map.getTerrain(), { source: bathy.BATHYMETRY_SOURCE_ID, exaggeration: 4 });
assert.equal(mock.calls.repaint > 0, true, "terrain changes request repaint");
bathyView.applyBathymetryTerrain(mock.map, { display: "etopo", exaggeration: 3.75 });
sameJson(mock.calls.terrain.at(-1), { source: bathy.BATHYMETRY_FALLBACK_SOURCE_ID, exaggeration: 3.75 });
assert.equal(mock.map.getTerrain().exaggeration, 3.75, "GEBCO→ETOPO keeps selected multiplier");
bathyView.applyBathymetryTerrain(mock.map, { display: "etopo", exaggeration: 3.75, terrainEnabled: false });
assert.equal(mock.calls.terrain.at(-1), null, "3D OFF clears terrain");
bathyView.applyBathymetryTerrain(mock.map, { display: "gebco", exaggeration: 3.75 });
sameJson(mock.calls.terrain.at(-1), { source: bathy.BATHYMETRY_SOURCE_ID, exaggeration: 3.75 }, "3D re-ON restores multiplier");
bathyView.applyBathymetryTerrain(mock.map, { display: "standard", exaggeration: 4 });
assert.equal(mock.calls.terrain.at(-1), null, "standard/aerial layer modes clear terrain");
assert.equal(bathyView.shouldApplyBathymetryTerrain({ current: undefined, requested: null }), true, "unsupported/unknown current clears only when needed");
assert.equal(bathyView.shouldApplyBathymetryTerrain({ current: null, requested: null }), false, "null terrain is not cleared repeatedly");

let visibility = bathyView.buildBathymetryLayerVisibility({ mode: "bathymetry", display: "gebco", hillshadeEnabled: true, contoursEnabled: true });
assert.equal(visibility[bathy.BATHYMETRY_COLOR_LAYER_ID], true);
assert.equal(visibility[bathy.BATHYMETRY_HILLSHADE_LAYER_ID], true);
assert.equal(visibility[bathy.BATHYMETRY_CONTOUR_LAYER_ID], true);
assert.equal(visibility[bathy.BATHYMETRY_CONTOUR_LABEL_LAYER_ID], true);
assert.equal(visibility[bathy.BATHYMETRY_FALLBACK_COLOR_LAYER_ID], false);
visibility = bathyView.buildBathymetryLayerVisibility({ mode: "bathymetry", display: "gebco", hillshadeEnabled: false, contoursEnabled: false });
assert.equal(visibility[bathy.BATHYMETRY_COLOR_LAYER_ID], true, "color remains visible for active source");
assert.equal(visibility[bathy.BATHYMETRY_HILLSHADE_LAYER_ID], false, "primary hillshade OFF hides hillshade only");
assert.equal(visibility[bathy.BATHYMETRY_CONTOUR_LAYER_ID], false, "primary contour OFF hides line");
assert.equal(visibility[bathy.BATHYMETRY_CONTOUR_LABEL_LAYER_ID], false, "primary contour OFF hides label");
visibility = bathyView.buildBathymetryLayerVisibility({ mode: "bathymetry", display: "etopo", hillshadeEnabled: false, contoursEnabled: true });
assert.equal(visibility[bathy.BATHYMETRY_COLOR_LAYER_ID], false, "fallback hides primary color");
assert.equal(visibility[bathy.BATHYMETRY_FALLBACK_COLOR_LAYER_ID], true, "fallback color is active");
assert.equal(visibility[bathy.BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID], false, "fallback uses preserved hillshade toggle state");
assert.equal(visibility[bathy.BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID], true, "fallback uses preserved contour toggle state for line");
assert.equal(visibility[bathy.BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID], true, "fallback uses preserved contour toggle state for label");
visibility = bathyView.buildBathymetryLayerVisibility({ mode: "standard", display: "etopo", hillshadeEnabled: true, contoursEnabled: true });
assert.ok(Object.values(visibility).every((value) => value === false), "mode exit hides all bathymetry layers");

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
const top = bathyView.getBathymetryTopViewPreset();
sameJson({ pitch: top.pitch, bearing: top.bearing }, { pitch: 0, bearing: 0 });
let manager;

mock = createMockMap();
manager = bathyView.createBathymetryCameraTransitionManager();
const checkboxOnDirectPreset = bathyView.getTerrainToggleCameraPreset({ nextEnabled: true });
assert.equal(checkboxOnDirectPreset, null, "3D ON checkbox handler does not directly move camera");
if (checkboxOnDirectPreset) {
  bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: checkboxOnDirectPreset, reducedMotion: false, duration: 320 });
}
if (bathyView.shouldApplyBathymetryObliqueView({ mode: "bathymetry", previousMode: "bathymetry", terrainEnabled: true, previousTerrainEnabled: false, initialBathymetryViewApplied: true })) {
  bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: oblique, reducedMotion: false, duration: 320 });
}
assert.equal(mock.calls.easeTo.length + mock.calls.jumpTo.length, 1, "checkbox 3D OFF->ON runs exactly one camera transition via effect");

mock = createMockMap();
manager = bathyView.createBathymetryCameraTransitionManager();
if (bathyView.shouldApplyBathymetryObliqueView({ mode: "bathymetry", previousMode: "standard", terrainEnabled: true, previousTerrainEnabled: true, initialBathymetryViewApplied: false })) {
  bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: oblique, reducedMotion: false, duration: 320 });
}
assert.equal(mock.calls.easeTo.length + mock.calls.jumpTo.length, 1, "initial bathymetry mode with initial 3D ON runs exactly one oblique transition");

mock = createMockMap();
manager = bathyView.createBathymetryCameraTransitionManager();
const presetOffToOnDirectPreset = bathy.BATHYMETRY_VIEW_PRESETS[2];
bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: presetOffToOnDirectPreset, reducedMotion: false, duration: 260 });
const suppressNextAutoOblique = true;
if (!suppressNextAutoOblique && bathyView.shouldApplyBathymetryObliqueView({ mode: "bathymetry", previousMode: "bathymetry", terrainEnabled: true, previousTerrainEnabled: false, initialBathymetryViewApplied: true })) {
  bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: oblique, reducedMotion: false, duration: 320 });
}
assert.equal(mock.calls.easeTo.length + mock.calls.jumpTo.length, 1, "preset OFF->ON applies only the requested preset and suppresses automatic oblique");
assert.equal(mock.calls.easeTo[0].pitch, presetOffToOnDirectPreset.pitch);

mock = createMockMap();
manager = bathyView.createBathymetryCameraTransitionManager();
const checkboxOffDirectPreset = bathyView.getTerrainToggleCameraPreset({ nextEnabled: false });
bathyView.applyBathymetryTerrain(mock.map, { display: "gebco", exaggeration: 2, terrainEnabled: false });
assert.equal(mock.calls.terrain.at(-1), null, "3D OFF clears terrain");
bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: checkboxOffDirectPreset, reducedMotion: false, duration: 180 });
assert.equal(mock.calls.easeTo.length + mock.calls.jumpTo.length, 1, "3D OFF runs exactly one camera transition");
assert.equal(mock.calls.easeTo[0].pitch, 0);
assert.equal(mock.calls.easeTo[0].bearing, 0);
assert.equal(mock.calls.easeTo[0].duration, 180);

mock = createMockMap();
manager = bathyView.createBathymetryCameraTransitionManager();
bathyView.runBathymetryCameraTransition({ map: mock.map, manager, preset: checkboxOffDirectPreset, reducedMotion: true, duration: 180 });
assert.equal(mock.calls.jumpTo.length, 1, "3D OFF reduced motion uses jumpTo");
assert.equal(mock.calls.jumpTo[0].pitch, 0);
assert.equal(mock.calls.jumpTo[0].bearing, 0);

mock = createMockMap();
manager = bathyView.createBathymetryCameraTransitionManager();
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


mock = createMockMap();
for (const value of [1, 1.25, 2, 3, 4]) {
  bathyView.applyBathymetryTerrain(mock.map, { display: "gebco", exaggeration: value });
}
assert.equal(mock.map.getTerrain().exaggeration, 4, "continuous slider operations leave the final multiplier applied");
const staleRequest = { display: "gebco", exaggeration: 1.25 };
const latestRequest = { display: "gebco", exaggeration: 3.5 };
bathyView.applyBathymetryTerrain(mock.map, staleRequest);
bathyView.applyBathymetryTerrain(mock.map, latestRequest);
assert.equal(mock.map.getTerrain().exaggeration, 3.5, "newer effect overwrites older terrain requests with the latest multiplier");

const mapSource = fs.readFileSync("src/components/FishingMap.tsx", "utf8");
assert.match(mapSource, /setSelectedViewPreset\(null\)/, "3D OFF clears selected preset");
assert.match(mapSource, /shouldApplyBathymetryObliqueView/);
assert.match(mapSource, /bathymetryControlsDisabled\(terrainStatus\)/, "unsupported state disables controls");
assert.doesNotMatch(mapSource, /BATHYMETRY_EXAGGERATION_NOTE/, "FishingMap does not render the removed exaggeration note constant");
assert.match(mapSource, /!isTerrainEnabled[\s\S]*3D OFF中の変更は次回3D表示時に適用されます。/, "3D OFF helper text remains tied to the terrain control state");
console.log("bathymetry view controls tests passed");
