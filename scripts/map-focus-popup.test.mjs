import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/components/FishingDashboard.tsx");
const map = read("src/components/FishingMap.tsx");
const card = read("src/components/SpotEvaluationCard.tsx");
const css = read("src/app/globals.css");

assert.match(card, /className="spotSelectionRow"[\s\S]*?<SpotCombobox[\s\S]*?aria-label="選択地点をマップで確認"[\s\S]*?>\s*Map\s*</, "the combobox and compact Map action share a dedicated row");
assert.match(card, /aria-label="選択地点をマップで確認" disabled=\{!props\.selectedSpot\} onClick=\{props\.onFocusMap\}/, "the Map action retains its accessible name, disabled condition, and focus callback");
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
assert.ok(map.includes("onOpenSpotEvaluation: (spotId: string) => void"), "FishingMap accepts a spot evaluation navigation callback");
assert.equal((map.match(/evaluationButton\.textContent = "地点評価"/g) ?? []).length, 1, "the regular spot popup has one compact evaluation action");
assert.match(map, /createSpotPopupContent\(spot,[\s\S]*?onOpenSpotEvaluation\(spot\.id\);[\s\S]*?popup\.remove\(\)/, "the popup action sends its spot id and closes the active popup");
const openEvaluationHandler = dashboard.slice(dashboard.indexOf("const openSpotEvaluationFromMap"), dashboard.indexOf("const openSpotEvaluationFromMap") + 700);
for (const expected of ['setEnvironmentSpotId(spotId)', 'setDashboardMode("spotEvaluation")', 'setSpotEvaluationTab("環境")', "setSpotEvaluationScrollRequest"]) {
  assert.ok(openEvaluationHandler.includes(expected), `map navigation performs ${expected}`);
}
assert.ok(!openEvaluationHandler.includes("setSelectedEnvironmentTime"), "map navigation does not reset the selected forecast time");
assert.match(dashboard, /spotEvaluationScrollRequest[\s\S]*?dashboardMode !== "spotEvaluation"[\s\S]*?spotEvaluationSectionRef\.current\?\.scrollIntoView/, "the evaluation card scroll runs in an effect after the requested view is rendered");
assert.ok(dashboard.includes("onOpenSpotEvaluation={openSpotEvaluationFromMap}"), "the dashboard wires map popup navigation to its state handler");
assert.equal((css.match(/\.map \.maplibregl-popup-content\s*\{/g) ?? []).length, 2, "popup styling has one base rule and one mobile override");
assert.ok(css.includes("maplibregl-popup-close-button") && css.includes("max-width:calc(100vw - 72px)"), "popup close affordance and compact mobile width are explicit");
assert.match(css, /\.map \.maplibregl-popup-close-button[\s\S]*?width: 28px;[\s\S]*?height: 28px;[\s\S]*?font-size: 18px;/, "popup close affordance remains compact");
const selectionRowRule = css.match(/\.spotSelectionRow\s*\{[^}]+\}/)?.[0] ?? "";
assert.match(selectionRowRule, /display:flex/);
assert.match(selectionRowRule, /align-items:flex-end/, "the Map action aligns with the input bottom edge");
assert.doesNotMatch(selectionRowRule, /flex-wrap|overflow-x/, "the selection row neither wraps nor creates horizontal scrolling");
assert.match(css.match(/\.spotCombobox\s*\{[^}]+\}/)?.[0] ?? "", /min-width:0/, "the search input can shrink near 360px");
assert.match(css.match(/\.focusMapButton\s*\{[^}]+\}/)?.[0] ?? "", /min-width:44px/, "the Map action retains a mobile tap target");
console.log("map focus and single-popup checks passed");
