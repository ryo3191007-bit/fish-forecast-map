import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/components/FishingDashboard.tsx");
const map = read("src/components/FishingMap.tsx");

assert.equal(existsSync(new URL("../src/data/mockFishingReports.ts", import.meta.url)), false, "the production mock report module is deleted");
assert.ok(!dashboard.includes("mockFishingReports") && !map.includes("mockFishingReports"), "runtime components do not reference mock reports");
assert.ok(!dashboard.includes("adjustedMockFishingReports"), "the mock score adjustment pipeline is removed");
assert.ok(!map.includes("reports:") && !map.includes("reportMarkers") && !map.includes("createPopupContent(report"), "the map cannot create mock markers or mock popups");
assert.ok(!map.includes("SCORE ${report.forecast.score}") && !map.includes("scoreColor("), "the map cannot render a mock SCORE");
assert.ok(map.includes("const spotMarkers = spots.map") && map.includes("const memoMarkers = mappableExternalMemos.map"), "spot and registered catch markers remain");
assert.ok(map.includes("const markerPoints = [...spots, ...mappableExternalMemos]"), "map bounds include spots and registered catches");
assert.ok(map.includes("spots.length === 0 && mappableExternalMemos.length === 0"), "existing spots prevent the empty-map message");
assert.ok(dashboard.includes("focusRequest={mapFocusRequest}") && map.includes("spotMarkersRef.current.get(focusRequest.spotId)"), "map focus remains wired to spot markers");
console.log("mock fishing report removal checks passed");
