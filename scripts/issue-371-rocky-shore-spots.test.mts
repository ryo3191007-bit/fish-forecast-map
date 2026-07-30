import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots.ts";
import { hiddenBroadFishingSpotIds, isSelectableFishingSpot } from "../src/data/fishingSpotVisibility.ts";

const research = JSON.parse(readFileSync(new URL("../docs/research/ISSUE_371_ROCKY_SHORE_CANDIDATES.json", import.meta.url), "utf8"));
assert.deepEqual(research.areas.map(({ area }: { area: string }) => area), ["糸島西岸", "唐津湾周辺", "呼子・鎮西", "伊万里湾", "松浦", "平戸", "生月"]);
for (const area of research.areas) {
  assert.ok(area.result && area.candidates.length > 0, `${area.area} has an auditable result`);
  for (const candidate of area.candidates) {
    assert.ok(candidate.physicalExistence && candidate.generalAccess && candidate.fishingUse);
    assert.ok(candidate.decision && candidate.reason && candidate.sources.length > 0);
    assert.ok(candidate.sources.every(({ url, checkedOn }: { url: string; checkedOn: string }) => url.startsWith("https://") && checkedOn === "2026-07-30"));
  }
}
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
