import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const map = read("src/components/FishingMap.tsx");
const css = read("src/app/globals.css");

assert.match(map, /const \[markersVisible, setMarkersVisible\] = useState\(true\)/, "markers start visible");
assert.match(map, /INITIAL_MARKER_FILTERS: Record<MapMarkerKind, boolean>[\s\S]*?port: true[\s\S]*?rock: true[\s\S]*?surf: true[\s\S]*?place: true[\s\S]*?catch: true[\s\S]*?shop: true/, "all six marker categories start enabled");
assert.match(map, /map\.addControl\(new maplibregl\.NavigationControl[\s\S]*?map\.addControl\(markerVisibilityControl\)/, "visibility control follows zoom control");
assert.match(map, /button\.setAttribute\("aria-label"[\s\S]*?button\.setAttribute\("aria-pressed"/, "the control exposes its state accessibly");
assert.match(map, /setMarkersVisible\(\(current\) => !current\)/, "one control toggles all marker visibility");
assert.match(map, /markerKindHidden--\$\{kind\}/, "individual filter state is represented without destroying marker DOM");
assert.match(map, /\{markersVisible \? \([\s\S]*?className="mapMarkerLegend"/, "filter UI follows overall visibility");
assert.match(map, /type="checkbox"[\s\S]*?checked=\{markerFilters\[kind\]\}[\s\S]*?setMarkerFilters/, "legend entries are keyboard-operable controlled checkboxes");
assert.match(css, /\.mapViewport\s*\{\s*position: relative;/, "legend is anchored to the map viewport, not the expanding 3D panel shell");
assert.match(css, /\.mapMarkerLegend\s*\{[^}]*right: 16px;[^}]*bottom: 8px;/, "legend is fixed at the bottom of the map viewport");
assert.match(css, /\.mapViewport:not\(\.markersHidden\) \.maplibregl-ctrl-bottom-right\s*\{[^}]*bottom: var\(--map-marker-legend-offset/, "standard attribution is positioned immediately above the measured legend");
assert.match(css, /\.mapViewport\.markersHidden \.maplibregl-ctrl-bottom-right\s*\{[^}]*bottom: 8px;/, "attribution returns naturally to the map bottom when the legend is hidden");
assert.match(css, /@media \(max-width: 520px\)\s*\{\s*\.mapMarkerLegend\s*\{[^}]*right: 8px;[^}]*bottom: 6px;[^}]*max-width: calc\(100% - 16px\)/, "mobile filter stays compact and on-screen");
assert.match(css, /markerKindHidden--port[\s\S]*?markerKindHidden--rock[\s\S]*?markerKindHidden--surf[\s\S]*?markerKindHidden--place[\s\S]*?markerKindHidden--catch[\s\S]*?markerKindHidden--shop/, "each category can hide independently");
assert.match(css, /\.mapViewport\.markersHidden \.mapIconMarker\s*\{\s*display: none;/, "spot, catch, and shop marker elements hide without being destroyed");
assert.doesNotMatch(css, /\.mapViewport\.markersHidden \.bathymetryPointMarker/, "bathymetry selection remains independent");
assert.match(map, /spotMarkersRef\.current\.get\(focusRequest\.spotId\)/, "existing focus registry remains wired");
assert.match(map, /createSpotPopupContent\(spot/, "spot popup and evaluation entry remain wired");

console.log("Issue #375 marker visibility checks passed");
