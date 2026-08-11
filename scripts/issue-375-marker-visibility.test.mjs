import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const map = read("src/components/FishingMap.tsx");
const css = read("src/app/globals.css");

assert.match(map, /const \[isMarkerLegendVisible, setIsMarkerLegendVisible\] = useState\(true\)/, "marker legend starts visible");
assert.match(map, /INITIAL_MARKER_FILTERS: Record<MapMarkerKind, boolean>[\s\S]*?port: true[\s\S]*?rock: true[\s\S]*?surf: true[\s\S]*?place: true[\s\S]*?catch: true[\s\S]*?shop: true/, "all six marker categories start enabled");
assert.match(map, /aria-pressed=\{isMarkerLegendVisible\}/, "the legend control exposes its state accessibly");
assert.match(map, /setIsMarkerLegendVisible\(\(current\) => !current\)/, "one control toggles the legend visibility");
assert.match(map, /markerKindHidden--\$\{kind\}/, "individual filter state is represented without destroying marker DOM");
assert.match(map, /\{isMarkerLegendVisible \? \([\s\S]*?className="mapMarkerLegend"/, "filter UI follows legend visibility");
assert.match(map, /type="checkbox"[\s\S]*?checked=\{markerFilters\[kind\]\}[\s\S]*?setMarkerFilters/, "legend entries are keyboard-operable controlled checkboxes");
assert.match(map, /className="mapLegendOverlay"/, "legend is rendered over the map");
assert.match(css, /\.mapBottomOverlays \{ position:absolute;/, "legend stack is an overlay");
assert.match(css, /\.mapViewport \.maplibregl-ctrl-bottom-right \{[^}]*bottom: 4px/, "standard attribution retains a separate bottom offset");
assert.match(css, /@media \(max-width: 520px\)\s*\{[\s\S]*?\.mapLegendOverlay\s*\{[^}]*padding:7px 8px/, "mobile legend stays compact and on-screen");
assert.match(css, /markerKindHidden--port[\s\S]*?markerKindHidden--rock[\s\S]*?markerKindHidden--surf[\s\S]*?markerKindHidden--place[\s\S]*?markerKindHidden--catch[\s\S]*?markerKindHidden--shop/, "each category can hide independently");
assert.doesNotMatch(map + css, /markersHidden/, "legend visibility never hides every marker");
assert.match(map, /spotMarkersRef\.current\.get\(focusRequest\.spotId\)/, "existing focus registry remains wired");
assert.match(map, /createSpotPopupContent\(spot/, "spot popup and evaluation entry remain wired");

console.log("Issue #375 marker visibility checks passed");
