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
assert.match(map, /if \(!popup\?\.isOpen\(\)\) marker\.togglePopup\(\)/, "the location popup ends open even on repeated requests");
assert.match(map, /const reportMarkers = reports\.map/, "catch report markers remain rendered");
assert.match(map, /const memoMarkers = mappableExternalMemos\.map/, "external memo markers remain rendered");
assert.match(css, /\.showSpotOnMapButton:focus-visible/, "the action has a visible keyboard focus treatment");
assert.match(css, /\.showSpotOnMapButton \{ width:100%; \}/, "the action fits compact mobile layouts");
assert.match(css, /\.fishingSpotMarker:focus-visible/, "spot markers retain visible keyboard focus");

assert.match(map, /activePopupRef = useRef<maplibregl\.Popup \| null>\(null\)/, "one shared active popup reference covers every marker type");
assert.match(map, /popup\.on\("open", \(\) => \{[\s\S]*?activePopupRef\.current\?\.remove\(\)[\s\S]*?activePopupRef\.current = popup/, "opening B closes the previously active popup A");
assert.match(map, /popup\.on\("close", \(\) => \{[\s\S]*?activePopupRef\.current === popup[\s\S]*?activePopupRef\.current = null/, "manual popup close safely clears the active reference");
assert.equal((map.match(/registerPopup\(/g) ?? []).length, 3, "spot, report, and external memo popups all use the shared registration path");
assert.match(map, /fishingMapPopup fishingMapSpotPopup/, "spot popups receive a dedicated high-contrast class");
assert.match(map, /fishingMapPopup fishingMapReportPopup/, "report popups use the scoped high-contrast class");
assert.match(map, /fishingMapPopup fishingMapMemoPopup/, "external memo popups use the scoped high-contrast class");
assert.match(map, /if \(activePopupRef\.current !== popup\) activePopupRef\.current\?\.remove\(\);[\s\S]*?if \(!popup\?\.isOpen\(\)\) marker\.togglePopup\(\)/, "programmatic focus closes another popup while repeated focus leaves the requested popup open");
assert.match(map, /renderedPopups\.includes\(activePopupRef\.current\)[\s\S]*?activePopupRef\.current\.remove\(\);[\s\S]*?activePopupRef\.current = null/, "marker cleanup removes and clears its active popup");
assert.match(css, /\.map \.fishingMapPopup \.maplibregl-popup-content[^}]*background:#071426[^}]*color:#f8fafc/, "popup content has map-scoped explicit high-contrast colors");
assert.match(css, /\.map \.fishingMapPopup \.maplibregl-popup-close-button[^}]*color:#fff/, "popup close buttons have an explicit readable color");
for (const direction of ["top", "bottom", "left", "right"]) {
  assert.match(css, new RegExp(`fishingMapPopup\\.maplibregl-popup-anchor-${direction} \\.maplibregl-popup-tip`), `the ${direction} popup tip matches the popup background`);
}

assert.match(map, /activePopupRef = useRef<maplibregl\.Popup \| null>\(null\)/, "one shared active popup reference covers every marker type");
assert.match(map, /popup\.on\("open", \(\) => \{[\s\S]*?activePopupRef\.current\?\.remove\(\)[\s\S]*?activePopupRef\.current = popup/, "opening B closes the previously active popup A");
assert.match(map, /popup\.on\("close", \(\) => \{[\s\S]*?activePopupRef\.current === popup[\s\S]*?activePopupRef\.current = null/, "manual popup close safely clears the active reference");
assert.equal((map.match(/registerPopup\(/g) ?? []).length, 3, "spot, report, and external memo popups all use the shared registration path");
assert.match(map, /fishingMapPopup fishingMapSpotPopup/, "spot popups receive a dedicated high-contrast class");
assert.match(map, /fishingMapPopup fishingMapReportPopup/, "report popups use the scoped high-contrast class");
assert.match(map, /fishingMapPopup fishingMapMemoPopup/, "external memo popups use the scoped high-contrast class");
assert.match(map, /if \(activePopupRef\.current !== popup\) activePopupRef\.current\?\.remove\(\);[\s\S]*?if \(!popup\?\.isOpen\(\)\) marker\.togglePopup\(\)/, "programmatic focus closes another popup while repeated focus leaves the requested popup open");
assert.match(map, /renderedPopups\.includes\(activePopupRef\.current\)[\s\S]*?activePopupRef\.current\.remove\(\);[\s\S]*?activePopupRef\.current = null/, "marker cleanup removes and clears its active popup");
assert.match(css, /\.map \.fishingMapPopup \.maplibregl-popup-content[^}]*background:#071426[^}]*color:#f8fafc/, "popup content has map-scoped explicit high-contrast colors");
assert.match(css, /\.map \.fishingMapPopup \.maplibregl-popup-close-button[^}]*color:#fff/, "popup close buttons have an explicit readable color");
for (const direction of ["top", "bottom", "left", "right"]) {
  assert.match(css, new RegExp(`fishingMapPopup\\.maplibregl-popup-anchor-${direction} \\.maplibregl-popup-tip`), `the ${direction} popup tip matches the popup background`);
}

console.log("Issue #204 map focus checks passed");
