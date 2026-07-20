import assert from "node:assert/strict";
import fs from "node:fs";

const curation = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-194-detail-split.json", "utf8"));
const migration = fs.readFileSync("supabase/migrations/20260720010000_split_fishable_area_and_hydrology.sql", "utf8");
const fallback = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");
const expectedKeys = ["fishable_area", "tidal_flow", "river_influence", "open_sea_bay_character"];

assert.equal(curation.issue, 194);
assert.equal(curation.spots.length, 18);
assert.deepEqual(curation.itemKeys, expectedKeys);
for (const spot of curation.spots) {
  assert.equal(spot.values.length, 4, `${spot.spotId} must have all split items`);
  assert.deepEqual(spot.values.map((value) => value.itemKey), expectedKeys);
  for (const value of spot.values) {
    assert.ok(["has_evidence", "weak_evidence", "researched_unknown"].includes(value.informationState));
    assert.equal(value.reviewStatus, "reviewed");
    assert.equal(value.adoptionStatus, "adopted");
    if (value.informationState === "researched_unknown") {
      assert.equal(value.confidence, null);
      assert.equal(value.valueText, null);
      assert.deepEqual(value.valueTextList, []);
    } else {
      assert.ok(["high", "medium", "low"].includes(value.confidence));
      assert.ok(value.valueText !== null || value.valueTextList.length > 0);
      assert.ok(value.sources.supporting.length > 0);
    }
    for (const relation of ["supporting", "checked", "contradicting"]) {
      for (const sourceId of value.sources[relation]) assert.ok(spot.sources.some((source) => source.id === sourceId), `${value.id} has a missing source`);
    }
  }
}
assert.doesNotMatch(JSON.stringify(curation.spots.flatMap((spot) => spot.values)), /water_flow_influences/);
for (const key of expectedKeys) {
  assert.match(migration, new RegExp(`'${key}'`));
  assert.match(fallback, new RegExp(`itemKey: "${key}"`));
}
assert.match(migration, /set is_active=false[\s\S]*item_key='water_flow_influences'/);
assert.doesNotMatch(migration, /delete from public\.fishing_spot_detail_values[\s\S]*water_flow_influences/i);
assert.match(migration, /not derived from water_flow_influences/);
console.log("Issue #194 split detail curation checks passed.");
