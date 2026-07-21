import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
const card = readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");
const map = readFileSync("src/components/FishingMap.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");

assert.match(card, /マップで場所を確認/, "the evaluation card shows the map action");
assert.match(card, /type="button" disabled=\{!props\.selectedSpot\} onClick=\{props\.onShowOnMap\}/, "the action is a native keyboard button and is unavailable without a spot");
assert.match(dashboard, /mapSectionRef\.current\?\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/, "the explicit action scrolls to the map section");
assert.match(dashboard, /focusRequestTokenRef\.current \+= 1/, "every action creates a fresh request, including repeated requests for one spot");
assert.match(dashboard, /spotId: environmentSpot\.id, requestToken: focusRequestTokenRef\.current/, "the currently selected spot and token form the focus request");
assert.match(dashboard, /focusRequest=\{mapSpotFocusRequest\}/, "the dashboard sends focus requests to the map");

const focusHandler = dashboard.slice(dashboard.indexOf("const showSelectedSpotOnMap"), dashboard.indexOf("const requestCloseAllSpecies"));
for (const forbidden of ["setEnvironmentSpotId", "changeSelectedEnvironmentTime", "setSpotEvaluationTab", "setDashboardMode"]) {
  assert.ok(!focusHandler.includes(forbidden), `map focus does not mutate evaluation state through ${forbidden}`);
}
assert.ok(!map.includes("onSelectedSpotIdChange"), "normal map interaction cannot change the evaluation spot");
assert.match(map, /spots\.map\(\(spot\) =>/, "spot markers are data-driven rather than tied to named locations");
assert.match(map, /new maplibregl\.Marker\(\{ element \}\)/, "existing report markers remain alongside dedicated spot markers");
assert.match(map, /setText\(spot\.name\)/, "spot marker popups identify the location");
assert.match(map, /classList\.add\("fishingSpotMarkerFocused"\)/, "the requested marker is highlighted");
assert.match(map, /map\.flyTo\(\{[\s\S]*?center: \[spot\.longitude, spot\.latitude\][\s\S]*?zoom: Math\.max\(map\.getZoom\(\), 13\)/, "focus pans and zooms to the selected coordinates");
assert.match(map, /if \(!marker\.getPopup\(\)\?\.isOpen\(\)\) marker\.togglePopup\(\)/, "the location popup ends open even on repeated requests");
assert.match(map, /const reportMarkers = reports\.map/, "catch report markers remain rendered");
assert.match(map, /const memoMarkers = mappableExternalMemos\.map/, "external memo markers remain rendered");
assert.match(css, /\.showSpotOnMapButton:focus-visible/, "the action has a visible keyboard focus treatment");
assert.match(css, /\.showSpotOnMapButton \{ width:100%; \}/, "the action fits compact mobile layouts");
assert.match(css, /\.fishingSpotMarker:focus-visible/, "spot markers retain visible keyboard focus");

console.log("Issue #204 map focus checks passed");
