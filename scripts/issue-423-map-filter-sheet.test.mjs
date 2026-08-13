import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const map = readFileSync("src/components/FishingMap.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");

assert.doesNotMatch(map + css, /mapLegendOverlay|mapMarkerLegend/, "the persistent legend panel is removed");
assert.match(map, /const enabledMarkerFilterCount = MAP_MARKER_LEGEND\.filter/);
assert.match(map, /className="mapFilterButton"[\s\S]*表示 \{enabledMarkerFilterCount\}\/\{MAP_MARKER_LEGEND\.length\}/, "the compact control reports enabled and total filters");
assert.match(map, /className="mapFilterButtonIcon"[\s\S]*aria-hidden="true"/, "the compact control has a decorative filter icon");
assert.match(map, /onClick=\{\(\) => setIsMarkerFilterSheetOpen\(true\)\}/, "the compact control opens the sheet");
assert.match(map, /id="map-filter-sheet"[\s\S]*role="dialog"[\s\S]*<h3 id="map-filter-sheet-title">表示フィルター<\/h3>[\s\S]*地図に表示する項目を選択/, "the accessible bottom sheet has its approved copy");
assert.match(map, /MAP_MARKER_LEGEND\.map\(\(\{ kind, label \}\)[\s\S]*role="switch"[\s\S]*checked=\{markerFilters\[kind\]\}[\s\S]*setMarkerFilters/, "existing filter definitions and marker state drive the switches");
assert.match(map, /setMarkerFilters\(INITIAL_MARKER_FILTERS\)[\s\S]*すべて表示/, "all filters can be restored");
assert.match(map, /className="mapFilterClose"[\s\S]*setIsMarkerFilterSheetOpen\(false\)[\s\S]*閉じる/, "the sheet has a close action");
assert.match(map, /className="mapFilterActions"[\s\S]*className="mapFilterShowAll"[\s\S]*すべて表示[\s\S]*className="mapFilterClose"[\s\S]*閉じる/, "show-all and close share the bottom action container");
assert.doesNotMatch(map, /mapLegendToggle|ピン凡例を非表示|ピン凡例を表示/, "the hamburger no longer contains the eye legend control");
assert.match(map, /<MapLayerToggle value=\{mapLayerMode\}/, "map modes remain available");
assert.match(map, /aria-label="現在地を表示"/, "current location remains available");
assert.match(dashboard, /<span>マップ<\/span>[\s\S]*<span>釣果<\/span>[\s\S]*<span>地点<\/span>/, "footer navigation remains available");
assert.match(css, /\.mapFilterSheet \{[^}]*max-height:min\(72%,520px\)/, "the sheet leaves the map visible");
assert.match(css, /@media \(max-width: 520px\)[^{]*\{[\s\S]*?\.mapFilterOptions \{ grid-template-columns:1fr;/, "360–420px mobile layouts use one filter column");
assert.match(css, /\.mapFilterActions \{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, "the two bottom actions have equal widths");

console.log("Issue #423 map filter sheet checks passed.");
