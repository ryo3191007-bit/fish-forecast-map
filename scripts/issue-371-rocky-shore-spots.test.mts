import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots.ts";
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
const adopted = research.areas.flatMap(({ candidates }: { candidates: Array<{ decision: string; spotId?: string }> }) => candidates.filter(({ decision }) => decision === "adopted").map(({ spotId }) => spotId));
assert.deepEqual(adopted, ["hado-cape-rocky-shore"]);
const spot = fishingSpots.find(({ id }) => id === adopted[0]);
assert.ok(spot);
assert.equal(spot.spotType, "磯場");
assert.equal(spot.coordinatePrecision, "approximate");
assert.equal(spot.shoreAccess, "不明");
assert.deepEqual(spot.targetSpecies, []);
assert.deepEqual(spot.recommendedMethods, []);
assert.ok(isSelectableFishingSpot(spot));
assert.deepEqual(hiddenBroadFishingSpotIds, ["yobuko-area", "fukushima-area", "takashima-area", "hirado-seto", "ikitsuki-area"]);
assert.equal(new Set(fishingSpots.map(({ id }) => id)).size, fishingSpots.length);
assert.equal(fishingSpots.length, 53);
console.log("Issue #371 rocky-shore candidate checks passed");
