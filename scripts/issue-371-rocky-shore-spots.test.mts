import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fishingSpots, getFishingSpotPopupCaution } from "../src/data/fishingSpots.ts";
import { getStaticMasterData, resolveSuccessfulFishingSpotsMaster } from "../src/lib/masterDataRepository.ts";
import { hiddenBroadFishingSpotIds, isSelectableFishingSpot } from "../src/data/fishingSpotVisibility.ts";

const research = JSON.parse(readFileSync(new URL("../docs/research/ISSUE_371_ROCKY_SHORE_CANDIDATES.json", import.meta.url), "utf8"));
assert.deepEqual(research.areas.map(({ area }: { area: string }) => area), ["糸島西岸", "唐津湾周辺", "呼子・鎮西", "伊万里湾", "松浦", "平戸", "生月"]);
for (const area of research.areas) {
  assert.ok(area.result && area.candidates.length > 0, `${area.area} has an auditable result`);
  assert.ok(area.searchSummary, `${area.area} records how candidate discovery was performed`);
  assert.ok(area.sourceFamiliesChecked.length >= 2, `${area.area} records multiple source families checked`);
  for (const candidate of area.candidates) {
    assert.ok(candidate.physicalExistence && candidate.generalAccess && candidate.fishingUse);
    assert.ok(candidate.decision && candidate.reason && candidate.sources.length > 0);
    assert.ok(candidate.sources.every(({ url, checkedOn }: { url: string; checkedOn: string }) => url.startsWith("https://") && checkedOn === "2026-07-30"));
  }
}
const candidateNames = research.areas.flatMap(({ candidates }: { candidates: Array<{ name: string }> }) => candidates.map(({ name }) => name));
assert.ok(candidateNames.includes("七ツ釜"));
assert.ok(candidateNames.includes("塩俵の断崖"));
assert.ok(candidateNames.includes("長瀬八洞・はなぐり洞門"));
const nagase = research.areas.flatMap(({ candidates }: { candidates: Array<{ name: string; decision: string }> }) => candidates).find(({ name }: { name: string }) => name === "長瀬八洞・はなぐり洞門");
assert.equal(nagase?.decision, "rejected_access_mismatch");
const adoptedCandidates = research.areas.flatMap(({ candidates }: { candidates: Array<{ decision: string; spotId?: string; representativeCoordinate?: { latitude: number; longitude: number; precision: string } }> }) => candidates.filter(({ decision }) => decision === "adopted"));
const adoptedIds = adoptedCandidates.map(({ spotId }) => spotId);
assert.equal(new Set(adoptedIds).size, 9);
for (const candidate of adoptedCandidates) {
  const adoptedSpots = fishingSpots.filter(({ id }) => id === candidate.spotId);
  assert.equal(adoptedSpots.length, 1, `${candidate.spotId} exists exactly once in the growing master`);
  const [spot] = adoptedSpots;
  assert.equal(spot.spotType, "磯場");
  assert.equal(spot.coordinatePrecision, candidate.representativeCoordinate?.precision);
  assert.equal(spot.latitude, candidate.representativeCoordinate?.latitude);
  assert.equal(spot.longitude, candidate.representativeCoordinate?.longitude);
  assert.equal(spot.shoreAccess, "不明");
  assert.deepEqual(spot.recommendedMethods, []);
  assert.ok(spot.notes?.some((note) => note.includes("実釣位置")));
  assert.ok(spot.notes?.some((note) => note.includes("釣り可否は未確認")));
  assert.ok(spot.notes?.some((note) => note.includes("最新案内")));
  assert.ok(isSelectableFishingSpot(spot));
}
const emptyRemoteMaster = resolveSuccessfulFishingSpotsMaster([]);
assert.equal(emptyRemoteMaster.meta.source, "static-fallback");
assert.equal(emptyRemoteMaster.meta.fallbackReason, "empty-supabase-result");
assert.deepEqual(emptyRemoteMaster.data, getStaticMasterData().fishingSpots, "an empty remote result falls back to the complete selectable static master");
const existingRemoteSpots = fishingSpots.filter(({ id }) => !adoptedIds.includes(id));
const mergedRemoteMaster = resolveSuccessfulFishingSpotsMaster(existingRemoteSpots);
assert.equal(mergedRemoteMaster.meta.source, "supabase");
assert.ok(adoptedIds.every((id) => mergedRemoteMaster.data.some((spot) => spot.id === id)), "static additions supplement a non-empty remote master");

const normalSpot = fishingSpots.find(({ id }) => id === "miyanoura-fishing-port");
assert.ok(normalSpot);
assert.equal(getFishingSpotPopupCaution(normalSpot), null, "an existing normal spot keeps its compact popup");
for (const id of adoptedIds) {
  const spot = fishingSpots.find((candidate) => candidate.id === id);
  assert.ok(spot);
  const caution = getFishingSpotPopupCaution(spot);
  assert.match(caution ?? "", /代表点/);
  assert.match(caution ?? "", /進入路・足場・規制・釣り可否は未確認/);
  assert.match(caution ?? "", /最新案内/);
}
const mapSource = readFileSync(new URL("../src/components/FishingMap.tsx", import.meta.url), "utf8");
const spotPopup = mapSource.slice(mapSource.indexOf("function createSpotPopupContent"), mapSource.indexOf("async function loadBathymetryTileImageData"));
assert.match(spotPopup, /getFishingSpotPopupCaution\(spot\)/);
assert.match(spotPopup, /if \(cautionText\) popup\.append\(caution\)/);
assert.match(spotPopup, /evaluationButton\.textContent = "地点情報"/);
const historicalBroadSpotIds = ["yobuko-area", "fukushima-area", "takashima-area", "hirado-seto", "ikitsuki-area"];
for (const id of historicalBroadSpotIds) {
  assert.ok(hiddenBroadFishingSpotIds.includes(id), `${id} remains hidden after the additive master update`);
  assert.ok(fishingSpots.some((candidate) => candidate.id === id), `${id} remains in the fishing-spot master`);
}
assert.equal(new Set(fishingSpots.map(({ id }) => id)).size, fishingSpots.length);
assert.ok(fishingSpots.length >= 61, "the fishing-spot master retains the audited spots and may grow");
console.log("Issue #371 rocky-shore candidate checks passed");
