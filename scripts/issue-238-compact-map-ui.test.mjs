import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const map = read("src/components/FishingMap.tsx");
const toggle = read("src/components/MapLayerToggle.tsx");
const card = read("src/components/SpotEvaluationCard.tsx");
const presentation = read("src/domain/spotEvaluationPresentation.ts");
const layer = read("src/domain/mapLayer.ts");
const bathymetry = read("src/domain/bathymetry.ts");
const css = read("src/app/globals.css");

const spotPopup = map.slice(map.indexOf("function createSpotPopupContent"), map.indexOf("async function loadBathymetryTileImageData"));
assert.match(spotPopup, /title\.textContent = spot\.name/);
assert.doesNotMatch(spotPopup, /areaName|spotType|createElement\("p"\)/, "spot popup contains only its name");
assert.match(map, /maxWidth: "min\(220px, calc\(100vw - 24px\)\)"/);
const popupContentRule = css.match(/\.map \.maplibregl-popup-content\s*\{([^}]*)\}/)?.[1] ?? "";
const popupCloseRule = css.match(/\.map \.maplibregl-popup-close-button\s*\{([^}]*)\}/)?.[1] ?? "";
const closeWidth = Number(popupCloseRule.match(/width:\s*(\d+)px/)?.[1]);
const closeFontSize = Number(popupCloseRule.match(/font-size:\s*(\d+)px/)?.[1]);
const closeRight = Number(popupCloseRule.match(/right:\s*(\d+)px/)?.[1]);
const contentRightPadding = Number(popupContentRule.match(/padding:\s*\d+px\s+(\d+)px/)?.[1]);
assert.ok(closeWidth >= 26 && closeWidth <= 28 && closeWidth < 34, "popup close button is smaller than the former 34px size");
assert.ok(closeFontSize < 24, "popup close glyph is smaller than the former 24px size");
assert.ok(contentRightPadding > closeWidth + closeRight, "popup content reserves space to the right of a name such as 伊万里湾奥");

assert.match(map, /<div className="mapFrame">\s*<MapLayerToggle[\s\S]*?<div className="mapShell">\s*<div ref=\{containerRef\} className="map"/, "toggle precedes and is adjacent to the map viewport");
assert.doesNotMatch(map, /className="mapAttribution/, "large custom attribution cards are not rendered");
assert.match(map, /attributionControl: false/);
assert.match(map, /new maplibregl\.AttributionControl\(\{ compact: true \}\)/, "one compact standard attribution control is explicit");
assert.match(layer, /GSI_TILE_ATTRIBUTION|GSI_AERIAL_TILE_ATTRIBUTION/);
assert.match(bathymetry, /BATHYMETRY_ATTRIBUTION|BATHYMETRY_FALLBACK_ATTRIBUTION/);
assert.match(map, /attribution: GSI_TILE_ATTRIBUTION/);
assert.match(map, /attribution: BATHYMETRY_ATTRIBUTION/);

for (const label of ["通常地図", "航空写真", "水深・3D地形"]) assert.match(layer, new RegExp(label));
assert.match(toggle, /aria-pressed=\{value === option\.id\}/);
assert.match(css, /\.mapLayerToggle[\s\S]*?position: relative[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.mapLayerButton[\s\S]*?white-space: nowrap/);
assert.doesNotMatch(css, /\.mapLayerToggle \{\s*position: absolute/);
const mapLayerToggleRules = [...css.matchAll(/\.mapLayerToggle\s*\{([^}]*)\}/g)].map((match) => match[1]);
assert.ok(mapLayerToggleRules.length > 0, "map layer toggle CSS rules exist");
for (const rule of mapLayerToggleRules) {
  assert.doesNotMatch(rule, /(?:^|;)\s*(?:top|left)\s*:/, "map layer toggle has no positional offset at any viewport width");
}
assert.match(
  mapLayerToggleRules[0],
  /box-sizing: border-box[\s\S]*?position: relative[\s\S]*?width: 100%/,
  "the toggle stays within its normal-flow parent width around 360px",
);

assert.match(presentation, /toilet: \{ label: "トイレ", affirmativeValues:/);
assert.match(presentation, /parking: \{ label: "駐車", affirmativeValues:/);
assert.doesNotMatch(presentation, /item\.itemKey === "(?:toilet|parking)"\) return/, "facility keys alone never imply that a facility exists");
assert.match(card, /toilet: "🚻"/);
assert.match(card, /parking: "🚗"/);
assert.match(card, /className="detailIcon" aria-hidden="true"/);
assert.match(card, /信憑性: \{confidenceLabel\[confidence\]\}/, "confidence remains beside compact values");
assert.match(card, /status === "loading"[\s\S]*?status === "failed"[\s\S]*?cards\.length \? [\s\S]*?<EmptyState \/>/, "loading, error, and empty states remain distinct");
assert.match(card, /function EmptyState\(\) \{ return <p className="spotEvaluationState empty" role="status">情報なし<\/p>; \}/);
const evaluationTab = card.slice(card.indexOf("function EvaluationTab"), card.indexOf("function JmaWarningPanel"));
assert.match(evaluationTab, /className="scoreCards"[\s\S]*?\{!species\.length && <EmptyState \/>\}[\s\S]*?<h3>釣法評価<\/h3>/, "the species section owns its empty state");
assert.match(evaluationTab, /className="methodScores"[\s\S]*?\{!methods\.length && <EmptyState \/>\}/, "the method section owns its empty state");
assert.doesNotMatch(evaluationTab, /!species\.length && !methods\.length/, "empty sections are not coupled");
const emptyStateCount = ({ species, methods }) => Number(species === 0) + Number(methods === 0);
assert.equal(emptyStateCount({ species: 0, methods: 0 }), 2, "both empty sections render an empty state");
assert.equal(emptyStateCount({ species: 1, methods: 0 }), 1, "only an empty method section renders an empty state");
assert.equal(emptyStateCount({ species: 0, methods: 1 }), 1, "only an empty species section renders an empty state");
assert.match(css, /\.spotEvaluationState\.empty[\s\S]*?display:inline-block/);

console.log("Issue 238 compact map UI checks passed");
