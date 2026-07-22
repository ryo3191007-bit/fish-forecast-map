import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const LEGACY_IDS = ["nokita-port", "nokita-beach", "keya-port", "keya-gate", "funakoshi-port", "kishi-port", "fukuyoshi-port", "hamasaki-beach", "niji-matsubara", "karatsu-east-port", "karatsu-west-port", "yobuko-area", "imari-inner-bay", "fukushima-area", "takashima-area", "tabira-port", "hirado-seto", "ikitsuki-area"];
const EXPECTED_AREAS = {"ouka-port":"唐津湾沿岸","tobo-port":"唐津湾沿岸","minatohama-port":"唐津湾沿岸","kodomo-port":"呼子・鎮西","kabeshima-port":"呼子・鎮西","hado-port":"呼子・鎮西","nagoya-port":"呼子・鎮西","yobuko-port":"呼子・鎮西","haregi-port":"肥前・玄海沿岸","takakushi-port":"肥前・玄海沿岸"};
const input = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-205-karatsu-implementation-input.json", "utf8"));
const details = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-205-detail-curation.json", "utf8"));
const source = fs.readFileSync("src/data/fishingSpots.ts", "utf8").replace(/^import[^;]+;\n/gm, "");
const match = source.match(/export const fishingSpots(?:[^=]*) = ([\s\S]*?);\n\nexport const fishingSpotById/);
assert.ok(match);
const spots = JSON.parse(vm.runInNewContext(`JSON.stringify(${match[1]})`));
const activeIds = input.activeCandidates.map(({ id }) => id);
const allIds = spots.map(({ id }) => id);
assert.equal(new Set(allIds).size, allIds.length, "spot IDs must remain unique");
assert.deepEqual(new Set(activeIds), new Set(Object.keys(EXPECTED_AREAS)), "Issue #205 active IDs must be the exact ten reviewed IDs");
assert.equal(spots.length, 28, "master must contain legacy 18 plus Issue #205 active 10");
for (const id of LEGACY_IDS) assert.ok(allIds.includes(id), `${id} legacy spot must be preserved`);
for (const candidate of input.activeCandidates) {
  const spot = spots.find(({ id }) => id === candidate.id);
  assert.ok(spot, `${candidate.id} must be in the static master`);
  assert.equal(candidate.areaName, EXPECTED_AREAS[candidate.id]);
  assert.equal(spot.areaName, EXPECTED_AREAS[candidate.id]);
  assert.equal(spot.shoreAccess, "不明");
  assert.equal(spot.coordinatePrecision, "approximate");
  assert.deepEqual(spot.targetSpecies, []);
  assert.deepEqual(spot.recommendedMethods, []);
  assert.ok(spot.latitude >= 33.4 && spot.latitude <= 33.6 && spot.longitude >= 129.8 && spot.longitude <= 130.0);
}
assert.equal(input.pendingOrHeld.length, 6);
for (const { id } of input.pendingOrHeld) assert.ok(!allIds.includes(id), `${id} held candidate must not be active`);
assert.equal(input.deferredIslandPorts.length, 8);
for (const { proposedId } of input.deferredIslandPorts) {
  assert.match(proposedId, /^[a-z0-9-]+-port$/, "deferred candidate requires a stable proposedId");
  assert.ok(!allIds.includes(proposedId), `${proposedId} deferred candidate must not be active`);
}
assert.deepEqual(details.spots.map(({ spotId }) => spotId), activeIds);
const concreteStructure = /波止|テトラ|岸壁|内港|外向き|電線/;
for (const detail of details.spots) {
  assert.ok(detail.values.some(({ itemKey, informationState }) => itemKey === "restriction_status" && informationState === "researched_unknown"));
  assert.ok(detail.values.some(({ itemKey, informationState, confidence }) => itemKey === "historical_target_species" && informationState === "weak_evidence" && confidence === "low"));
  assert.ok(!detail.values.some(({ itemKey }) => itemKey === "facilities"), "generic facilities must not return");
  for (const key of ["toilet", "lighting", "parking", "access"]) assert.ok(detail.values.some(({ itemKey }) => itemKey === key), `${detail.spotId}:${key} missing`);
  for (const value of detail.values.filter((value) => value.valueTextList.some((text) => concreteStructure.test(text)))) {
    assert.equal(value.informationState, "weak_evidence", `${value.id} concrete private structure must be weak evidence`);
    assert.equal(value.confidence, "low", `${value.id} concrete private structure must have low confidence`);
  }
}
const seed = fs.readFileSync("supabase/sql/003_master_data_seed.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260722120000_add_issue_205_karatsu_spots.sql", "utf8");
const fallback = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");
const jma = fs.readFileSync("src/domain/jmaWarning.ts", "utf8");
for (const [id, area] of Object.entries(EXPECTED_AREAS)) {
  for (const [name, text] of [["bootstrap seed", seed], ["forward migration", migration]]) assert.ok(text.includes(`('${id}',`) && text.includes(`'${area}'`), `${id} / ${area} missing from ${name}`);
  assert.ok(jma.includes(`"${id}": KARATSU`), `${id} missing from JMA mapping`);
}
assert.ok(!migration.includes("('facilities','facility'"));
assert.ok(!fallback.includes('itemKey: "facilities"'));
assert.ok(migration.includes("on conflict (id) do nothing"), "migration must preserve existing records");
const dashboard = fs.readFileSync("src/components/FishingDashboard.tsx", "utf8");
for (const id of activeIds) assert.ok(!dashboard.includes(id), "UI must not hard-code Issue #205 IDs");
for (const usage of ["<FishingMap", "<SpotEvaluationCard", "<ExternalCatchMemoSection"]) assert.ok(dashboard.includes(usage));
assert.ok(dashboard.includes("spots={fishingSpots}"), "runtime consumers use repository spots");
console.log("Issue #205 Karatsu spot expansion checks passed.");
