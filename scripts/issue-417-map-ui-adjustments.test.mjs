import assert from "node:assert/strict";
import fs from "node:fs";

const map = fs.readFileSync("src/components/FishingMap.tsx", "utf8");
const css = fs.readFileSync("src/app/globals.css", "utf8");

assert.match(css, /\.mapShell \{[\s\S]*?padding: 0 8px 8px;/, "map frame has no top padding below the layer toggle");
assert.match(map, /className="mapLegendToggle"[\s\S]*?aria-label=\{isMarkerLegendVisible \? "ピン凡例を非表示" : "ピン凡例を表示"\}[\s\S]*?aria-pressed=\{isMarkerLegendVisible\}[\s\S]*?<svg/, "legend uses an accessible eye icon toggle");
assert.doesNotMatch(map, /凡例 \{isMarkerLegendVisible \? "OFF" : "ON"\}/, "the text legend toggle is removed");
assert.match(map, /className="mapBottomOverlays"[\s\S]*?isMarkerLegendVisible[\s\S]*?className="mapLegendOverlay"[\s\S]*?className="bathymetryPointCard"/, "legend and depth card remain in the shared overlay stack");
assert.match(css, /\.mapBottomOverlays \{ position:absolute;[^}]*bottom:50px;[^}]*pointer-events:none;/, "desktop overlays clear attribution while passing map interactions through");
assert.match(css, /\.mapLegendOverlay \{[^}]*pointer-events:auto;/, "legend controls remain interactive");
assert.match(css, /@media \(max-width: 520px\) \{ \.mapBottomOverlays \{[^}]*bottom:48px;/, "mobile overlays clear attribution");
assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.map \{\s*height: 580px;/, "mobile map is 38px taller than the 542px baseline");
assert.match(css, /@media \(max-width: 420px\)[\s\S]*?\.map \{\s*height: 580px;/, "narrow breakpoint does not shrink the map");
assert.doesNotMatch(map + css, /markersHidden/, "legend toggle never hides all pins");

console.log("Issue #417 map UI adjustment checks passed.");
