import assert from "node:assert/strict";
import fs from "node:fs";

const EXPECTED = new Map([
  ["hatazu-fishing-port", { name: "波多津漁港", area: "伊万里湾東岸", type: "漁港", lat: 33.3908, lon: 129.8723 }],
  ["imarin-beach", { name: "イマリンビーチ", area: "伊万里湾東岸", type: "サーフ", lat: 33.353857, lon: 129.846813 }],
]);
const audit = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-248-imari-implementation-input.json", "utf8"));
const details = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-248-detail-curation.json", "utf8"));
const master = fs.readFileSync("src/data/fishingSpots.ts", "utf8");
const seed = fs.readFileSync("supabase/sql/003_master_data_seed.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260722230000_add_issue_248_imari_spots.sql", "utf8");
const jma = fs.readFileSync("src/domain/jmaWarning.ts", "utf8");
const fallback = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");
const dashboard = fs.readFileSync("src/components/FishingDashboard.tsx", "utf8");
const map = fs.readFileSync("src/components/FishingMap.tsx", "utf8");

assert.equal(audit.activeCandidates.length, EXPECTED.size);
assert.ok(audit.heldOrExcluded.every((candidate) => candidate.decision === "hold" || candidate.decision === "exclude"));
assert.ok(audit.migrationPolicy.some((line) => line.includes("imari-inner-bay")));
assert.notEqual(audit.researchStatePolicy.unresearched, audit.researchStatePolicy.researched_unknown);
assert.equal(new Set(audit.activeCandidates.map((spot) => spot.spotId)).size, EXPECTED.size);
for (const spot of audit.activeCandidates) {
  const expected = EXPECTED.get(spot.spotId);
  assert.ok(expected);
  assert.equal(spot.name, expected.name); assert.equal(spot.areaName, expected.area); assert.equal(spot.spotType, expected.type);
  assert.equal(spot.coordinatePrecision, "approximate"); assert.equal(spot.municipality, "伊万里市");
  assert.ok(spot.latitude >= 33.25 && spot.latitude <= 33.45 && spot.longitude >= 129.80 && spot.longitude <= 129.91);
  assert.equal(spot.relationToExisting.existingSpotId, "imari-inner-bay");
  for (const text of [master, seed, migration]) {
    assert.ok(text.includes(spot.spotId)); assert.ok(text.includes(spot.name)); assert.ok(text.includes(String(spot.latitude))); assert.ok(text.includes(String(spot.longitude)));
  }
  assert.match(jma, new RegExp(`"${spot.spotId}": IMARI`));
  const detail = details.spots.find((item) => item.spotId === spot.spotId);
  assert.ok(detail); assert.ok(detail.sources.length >= 2);
  assert.ok(detail.values.some((value) => value.itemKey === "spot_features" && value.informationState === "has_evidence"));
  assert.ok(detail.values.some((value) => value.itemKey === "restriction_status" && value.informationState === "researched_unknown"));
}
assert.ok(fallback.includes("issue-248-detail-curation.json"));
assert.ok(master.includes('id: "imari-inner-bay"')); assert.ok(seed.includes("('imari-inner-bay'"));
assert.doesNotMatch(migration, /delete\s+from|drop\s+(table|column)|update\s+public\.fishing_spots/i);
for (const excluded of ["福島", "鷹島", "平戸", "生月島", "糸島"]) assert.ok(!audit.activeCandidates.some((spot) => spot.name.includes(excluded)));
assert.ok(dashboard.includes("fishingSpots") || dashboard.includes("spots"));
assert.ok(map.includes("spots"));
console.log("Issue #248 Imari spot tests passed");
