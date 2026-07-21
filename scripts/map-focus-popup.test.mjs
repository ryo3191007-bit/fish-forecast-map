import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/components/FishingDashboard.tsx");
const map = read("src/components/FishingMap.tsx");
const card = read("src/components/SpotEvaluationCard.tsx");
const css = read("src/app/globals.css");

assert.ok(card.includes("マップで場所を確認") && card.includes("onFocusMap"), "the evaluation card exposes an explicit map action");
assert.ok(dashboard.includes("scrollIntoView") && dashboard.includes("mapFocusRequestIdRef.current += 1"), "every click scrolls and receives a new request token");
assert.ok(dashboard.includes("spotId: environmentSpotId") && dashboard.includes("focusRequest={mapFocusRequest}"), "the selected spot drives the request without changing evaluation state");
for (const forbidden of ["setDashboardMode(\"catchReports\")", "setSpotEvaluationTab(\"評価\")", "setSelectedEnvironmentTime(null)"]) {
  const handler = dashboard.slice(dashboard.indexOf("const focusSelectedSpotOnMap"), dashboard.indexOf("const focusSelectedSpotOnMap") + 500);
  assert.ok(!handler.includes(forbidden), `focus handler must not perform ${forbidden}`);
}
assert.ok(map.includes("spotMarkersRef.current.get(focusRequest.spotId)") && map.includes("map.easeTo"), "focus pans and zooms through the data-driven spot marker registry");
assert.ok(map.includes('classList.add("focused")') && map.includes("marker.togglePopup()"), "focus highlights its marker and opens the spot popup");
assert.equal((map.match(/const activePopupRef\b/g) ?? []).length, 1, "single popup state is declared once");
assert.ok(map.includes('popup.on("open"') && map.includes("activePopupRef.current?.remove()"), "all popup types close the previously active popup");
assert.ok(map.includes("spotMarkerRegistry.clear()") && map.includes("activePopupRef.current = null"), "marker cleanup clears stale marker and popup references");
assert.equal((css.match(/\.map \.maplibregl-popup-content\s*\{/g) ?? []).length, 2, "popup styling has one base rule and one mobile override");
assert.ok(css.includes("maplibregl-popup-close-button") && css.includes("max-width:calc(100vw - 88px)"), "popup close affordance and mobile width are explicit");
console.log("map focus and single-popup checks passed");
