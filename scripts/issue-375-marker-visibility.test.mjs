import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const map = read("src/components/FishingMap.tsx");
const css = read("src/app/globals.css");

assert.match(map, /const \[isMarkerFilterSheetOpen, setIsMarkerFilterSheetOpen\] = useState\(false\)/, "filter sheet starts closed");
assert.match(map, /INITIAL_MARKER_FILTERS: Record<MapMarkerKind, boolean>[\s\S]*?port: true[\s\S]*?rock: true[\s\S]*?surf: true[\s\S]*?place: true[\s\S]*?catch: true[\s\S]*?shop: true/, "all six marker categories start enabled");
assert.match(map, /aria-expanded=\{isMarkerFilterSheetOpen\}/, "the filter control exposes its state accessibly");
assert.match(map, /setIsMarkerFilterSheetOpen\(true\)/, "one control opens the filter sheet");
assert.match(map, /markerKindHidden--\$\{kind\}/, "individual filter state is represented without destroying marker DOM");
assert.match(map, /\{isMarkerFilterSheetOpen \? \([\s\S]*?className="mapFilterOptions"/, "filter UI follows sheet visibility");
assert.match(map, /type="checkbox"[\s\S]*?role="switch"[\s\S]*?checked=\{markerFilters\[kind\]\}[\s\S]*?setMarkerFilters/, "filter entries are keyboard-operable controlled switches");
assert.match(map, /className="mapFilterSheet"/, "filters are rendered over the map only on demand");
assert.match(css, /\.mapFilterSheet \{ position:absolute;/, "filter sheet is an overlay");
assert.match(css, /\.mapViewport \.maplibregl-ctrl-bottom-right \{[^}]*bottom: 4px/, "standard attribution retains a separate bottom offset");
assert.match(css, /@media \(max-width: 520px\)\s*\{[\s\S]*?\.mapFilterSheet \{[^}]*max-height:68%/, "mobile filter sheet stays compact and on-screen");
assert.match(css, /markerKindHidden--port[\s\S]*?markerKindHidden--rock[\s\S]*?markerKindHidden--surf[\s\S]*?markerKindHidden--place[\s\S]*?markerKindHidden--catch[\s\S]*?markerKindHidden--shop/, "each category can hide independently");
assert.doesNotMatch(map + css, /markersHidden/, "legend visibility never hides every marker");
assert.match(map, /spotMarkersRef\.current\.get\(focusRequest\.spotId\)/, "existing focus registry remains wired");
assert.match(map, /createSpotPopupContent\(spot/, "spot popup and evaluation entry remain wired");

console.log("Issue #375 marker visibility checks passed");
