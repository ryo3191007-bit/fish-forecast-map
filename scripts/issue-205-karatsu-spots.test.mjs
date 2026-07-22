import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const input = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-205-karatsu-implementation-input.json", "utf8"));
const details = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-205-detail-curation.json", "utf8"));
const source = fs.readFileSync("src/data/fishingSpots.ts", "utf8").replace(/^import[^;]+;\n/gm, "");
const match = source.match(/export const fishingSpots(?:[^=]*) = ([\s\S]*?);\n\nexport const fishingSpotById/);
assert.ok(match);
const spots = JSON.parse(vm.runInNewContext(`JSON.stringify(${match[1]})`));
const activeIds = input.activeCandidates.map(({ id }) => id);
const allIds = spots.map(({ id }) => id);
assert.equal(new Set(allIds).size, allIds.length, "spot IDs must remain unique");
assert.equal(activeIds.length, 10, "exactly ten Issue #205 candidates are active");
for (const candidate of input.activeCandidates) {
  const spot = spots.find(({ id }) => id === candidate.id);
  assert.ok(spot, `${candidate.id} must be in the static master`);
  assert.equal(spot.shoreAccess, "不明");
  assert.equal(spot.coordinatePrecision, "approximate");
  assert.deepEqual(spot.targetSpecies, []);
  assert.deepEqual(spot.recommendedMethods, []);
  assert.ok(spot.latitude >= 33.4 && spot.latitude <= 33.6 && spot.longitude >= 129.8 && spot.longitude <= 130.0);
}
const inactiveIds = [...input.pendingOrHeld.map(({ id }) => id), ...input.deferredIslandPorts.map(({ officialCode }) => officialCode).filter(Boolean)];
assert.equal(input.pendingOrHeld.length, 6);
assert.equal(input.deferredIslandPorts.length, 8);
for (const id of inactiveIds) assert.ok(!allIds.includes(id), `${id} must not be active`);
for (const legacy of ["hamasaki-beach", "niji-matsubara", "karatsu-east-port", "karatsu-west-port", "yobuko-area"]) assert.ok(allIds.includes(legacy), `${legacy} must be preserved`);
assert.deepEqual(details.spots.map(({ spotId }) => spotId), activeIds);
for (const detail of details.spots) {
  assert.ok(detail.values.some(({ itemKey, informationState }) => itemKey === "restriction_status" && informationState === "researched_unknown"));
  assert.ok(detail.values.some(({ itemKey, informationState, confidence }) => itemKey === "historical_target_species" && informationState === "weak_evidence" && confidence === "low"));
}
const seed = fs.readFileSync("supabase/sql/003_master_data_seed.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260722120000_add_issue_205_karatsu_spots.sql", "utf8");
const jma = fs.readFileSync("src/domain/jmaWarning.ts", "utf8");
for (const id of activeIds) {
  assert.ok(seed.includes(`('${id}'`), `${id} missing from bootstrap seed`);
  assert.ok(migration.includes(`('${id}'`), `${id} missing from forward migration`);
  assert.ok(jma.includes(`"${id}": KARATSU`), `${id} missing from JMA mapping`);
}
assert.ok(migration.includes("on conflict (id) do nothing"), "migration must preserve existing records");
const dashboard = fs.readFileSync("src/components/FishingDashboard.tsx", "utf8");
for (const id of activeIds) assert.ok(!dashboard.includes(id), "UI must not hard-code Issue #205 IDs");
for (const usage of ["<FishingMap", "<SpotEvaluationCard", "<ExternalCatchMemoSection"]) assert.ok(dashboard.includes(usage));
assert.ok(dashboard.includes("spots={fishingSpots}"), "map, evaluation, environment and catch registration use repository spots");
console.log("Issue #205 Karatsu spot expansion checks passed.");
