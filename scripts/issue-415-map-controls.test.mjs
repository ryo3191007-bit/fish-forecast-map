import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const map = readFileSync("src/components/FishingMap.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const mobileCss = readFileSync("src/app/bathymetry-mobile.css", "utf8");

assert.doesNotMatch(map + css + mobileCss, /bathymetryLegend|水深凡例/, "depth color legend is completely removed from the UI");
assert.match(map, /className="mapMenuButton"[\s\S]*aria-expanded=\{isMapMenuOpen\}/, "hamburger exposes its expanded state");
assert.match(map, /\{isMapMenuOpen \? \([\s\S]*className="mapMenuItems"[\s\S]*aria-label="ズームイン"[\s\S]*aria-label="ズームアウト"[\s\S]*className="mapLegendToggle"/, "zoom and legend actions only render in the open menu");
assert.match(map, /mapRef\.current\?\.zoomIn\(\)/);
assert.match(map, /mapRef\.current\?\.zoomOut\(\)/);
assert.match(map, /className="mapMenuItems"[\s\S]*?\) : null\}[\s\S]*?<button type="button" className=\{`currentLocationMapButton[\s\S]*?className="currentLocationStatus"/, "current location status follows the button inside the dynamically sized action column");
assert.match(map, /\{isMarkerLegendVisible \? \([\s\S]*className="mapLegendOverlay"[\s\S]*className="mapMarkerLegend"/, "marker legend is independently toggled inside the map");
assert.doesNotMatch(map + css, /markersHidden/, "legend toggle cannot hide map pins");
assert.match(map, /markerKindHidden--\$\{kind\}/, "existing per-kind pin filters remain wired");
assert.match(css, /\.mapActionControls \{ position:absolute;[^}]*top:10px; right:10px;/, "map actions occupy the upper-right overlay");
assert.match(map, /className="mapBottomOverlays"[\s\S]*?isMarkerLegendVisible[\s\S]*?className="mapLegendOverlay"[\s\S]*?mapLayerMode === "bathymetry"[\s\S]*?className="bathymetryPointCard"/, "legend and depth card share one ordered bottom stack");
assert.match(css, /\.mapBottomOverlays \{ position:absolute;[^}]*bottom:50px;[^}]*flex-direction:column;[^}]*gap:8px;/, "bottom stack follows wrapped legend height and stays above attribution");
assert.match(css, /\.mapBottomOverlays \{[^}]*pointer-events:\s*none;/, "bottom stack lets unused overlay space pass interactions through to the map");
assert.match(css, /\.bathymetryPointCard \{[^}]*align-self: flex-end;/, "desktop depth card aligns within the non-overlapping stack");
assert.match(css, /\.bathymetryPointCard \{[^}]*pointer-events:\s*auto;/, "depth card remains interactive inside the pointer-transparent bottom stack");
assert.match(css, /@media \(max-width: 520px\)[^{]*\{[^}]*\.mapBottomOverlays \{[^}]*gap:6px;[^}]*\}/, "mobile bottom stack retains a safe gap");
assert.doesNotMatch(css, /\.currentLocationStatus \{[^}]*position:\s*absolute/, "location status participates in the action column flow");
assert.match(css, /\.mapViewport \.maplibregl-ctrl-bottom-right \{[^}]*z-index:4;/, "MapLibre attribution remains above the legend overlay");

console.log("Issue #415 map control checks passed");
