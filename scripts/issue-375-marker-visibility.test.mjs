import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const map = read("src/components/FishingMap.tsx");
const css = read("src/app/globals.css");

assert.match(map, /const \[markersVisible, setMarkersVisible\] = useState\(true\)/, "markers start visible");
assert.match(map, /map\.addControl\(new maplibregl\.NavigationControl[\s\S]*?map\.addControl\(markerVisibilityControl\)/, "visibility control follows zoom control");
assert.match(map, /button\.setAttribute\("aria-label"[\s\S]*?button\.setAttribute\("aria-pressed"/, "the control exposes its state accessibly");
assert.match(map, /setMarkersVisible\(\(current\) => !current\)/, "one control toggles all marker visibility");
assert.match(map, /className=\{`mapViewport\$\{markersVisible \? "" : " markersHidden"\}`\}/);
assert.match(map, /\{markersVisible \? \([\s\S]*?className="mapMarkerLegend"/, "legend follows marker visibility");
assert.match(css, /\.mapViewport\s*\{\s*position: relative;/, "legend is anchored to the map viewport, not the expanding 3D panel shell");
assert.match(css, /\.mapViewport\.markersHidden \.mapIconMarker\s*\{\s*display: none;/, "spot, catch, and shop marker elements hide without being destroyed");
assert.doesNotMatch(css, /\.mapViewport\.markersHidden \.bathymetryPointMarker/, "bathymetry selection remains independent");
assert.match(map, /spotMarkersRef\.current\.get\(focusRequest\.spotId\)/, "existing focus registry remains wired");
assert.match(map, /createSpotPopupContent\(spot/, "spot popup and evaluation entry remain wired");

console.log("Issue #375 marker visibility checks passed");
