import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const EXPECTED = new Map([
  ["hatazu-fishing-port", { name: "波多津漁港", area: "伊万里湾東岸", type: "漁港", lat: 33.3908, lon: 129.8723 }],
  ["imarin-beach", { name: "イマリンビーチ", area: "伊万里湾東岸", type: "サーフ", lat: 33.353857, lon: 129.846813 }],
]);
const UNKNOWN_KEYS = ["restriction_status", "fishable_area", "access", "parking", "toilet", "lighting"];
const audit = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-248-imari-implementation-input.json", "utf8"));
const details = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-248-detail-curation.json", "utf8"));
const masterSource = fs.readFileSync("src/data/fishingSpots.ts", "utf8");
const masterLiteral = masterSource.match(/export const fishingSpots[^=]*= ([\s\S]*?);\n/);
assert.ok(masterLiteral, "static master must be parseable");
const master = JSON.parse(JSON.stringify(vm.runInNewContext(masterLiteral[1])));
const seed = fs.readFileSync("supabase/sql/003_master_data_seed.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260722230000_add_issue_248_imari_spots.sql", "utf8");
const payloadMatch = migration.match(/declare payload jsonb := '([^']+)'::jsonb;/);
assert.ok(payloadMatch, "forward migration must include the detail payload");
const migrationDetails = JSON.parse(payloadMatch[1]);
const jma = fs.readFileSync("src/domain/jmaWarning.ts", "utf8");
const fallback = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");
const dashboard = fs.readFileSync("src/components/FishingDashboard.tsx", "utf8");
const map = fs.readFileSync("src/components/FishingMap.tsx", "utf8");
const evaluation = fs.readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");
const catchRegistration = fs.readFileSync("src/components/ExternalCatchMemoSection.tsx", "utf8");

function sqlSpot(sql, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = sql.match(new RegExp(`\\('${escaped}', '([^']+)', '([^']+)', ([0-9.]+), ([0-9.]+), '([^']+)'`));
  assert.ok(match, `${id} must have a complete SQL master row`);
  return { name: match[1], area: match[2], lat: Number(match[3]), lon: Number(match[4]), type: match[5] };
}

assert.equal(audit.activeCandidates.length, EXPECTED.size);
assert.deepEqual(new Set(audit.activeCandidates.map(({ spotId }) => spotId)), new Set(EXPECTED.keys()));
assert.ok(audit.heldOrExcluded.every(({ decision }) => decision === "hold" || decision === "exclude"));
assert.notEqual(audit.researchStatePolicy.unresearched, audit.researchStatePolicy.researched_unknown);
assert.deepEqual(details, migrationDetails, "curation and forward migration payload must stay identical");
for (const candidate of audit.activeCandidates) {
  const expected = EXPECTED.get(candidate.spotId);
  assert.ok(expected);
  const staticSpot = master.find(({ id }) => id === candidate.spotId);
  assert.ok(staticSpot, `${candidate.spotId} must be in the static master`);
  const canonical = { name: expected.name, area: expected.area, type: expected.type, lat: expected.lat, lon: expected.lon };
  assert.deepEqual({ name: candidate.name, area: candidate.areaName, type: candidate.spotType, lat: candidate.latitude, lon: candidate.longitude }, canonical);
  assert.deepEqual({ name: staticSpot.name, area: staticSpot.areaName, type: staticSpot.spotType, lat: staticSpot.latitude, lon: staticSpot.longitude }, canonical);
  assert.deepEqual(sqlSpot(seed, candidate.spotId), canonical, `${candidate.spotId} bootstrap row must match static master`);
  assert.deepEqual(sqlSpot(migration, candidate.spotId), canonical, `${candidate.spotId} migration row must match static master`);
  assert.equal(staticSpot.coordinatePrecision, "approximate");
  assert.equal(staticSpot.shoreAccess, "不明");
  assert.deepEqual(staticSpot.targetSpecies, []);
  assert.deepEqual(staticSpot.recommendedMethods, []);
  assert.equal(candidate.relationToExisting.existingSpotId, "imari-inner-bay");
  assert.match(jma, new RegExp(`"${candidate.spotId}": IMARI`));

  const detail = details.spots.find(({ spotId }) => spotId === candidate.spotId);
  assert.ok(detail, `${candidate.spotId} requires curated unknown-state records`);
  assert.ok(!detail.values.some(({ itemKey }) => itemKey === "spot_features"), "spotType must not be duplicated as a structure/footing feature");
  for (const key of UNKNOWN_KEYS) {
    const value = detail.values.find(({ itemKey }) => itemKey === key);
    assert.ok(value, `${candidate.spotId}:${key} must be recorded`);
    assert.equal(value.informationState, "researched_unknown", `${candidate.spotId}:${key} must remain unknown`);
    assert.equal(value.confidence, null, `${candidate.spotId}:${key} must not claim confidence without evidence`);
    assert.deepEqual(value.sources.supporting, [], `${candidate.spotId}:${key} must not have unsupported evidence`);
    assert.ok(value.sources.checked.length > 0, `${candidate.spotId}:${key} must retain checked sources`);
  }
  assert.ok(!detail.values.some((value) => value.informationState === "has_evidence"), `${candidate.spotId} must not infer structures or footing`);
}

const imarinSource = audit.sources["src-imari-imarin-beach"];
assert.equal(imarinSource.sourceUrl, "https://www.city.imari.lg.jp/9622.htm");
assert.notEqual(new URL(imarinSource.sourceUrl).pathname, "/", "site top must not be a supporting source");
assert.match(imarinSource.note, /釣り可否.*裏付けない/);
assert.match(audit.sources["src-gsi-address-search"].note, /地点種別.*裏付けない/);
assert.ok(master.some(({ id }) => id === "imari-inner-bay"), "legacy broad spot must remain active in the static master");
assert.match(seed, /\('imari-inner-bay',[\s\S]*?, true\)/, "legacy broad spot must remain active in bootstrap");
assert.doesNotMatch(migration, /delete\s+from|drop\s+(table|column)|update\s+public\.fishing_spots/i);
assert.match(migration, /on conflict \(id\) do nothing/, "migration must preserve existing records and catches");
assert.ok(fallback.includes("issue-248-detail-curation.json"), "runtime fallback must load Issue #248 details generically");
for (const id of EXPECTED.keys()) {
  assert.ok(!dashboard.includes(id) && !map.includes(id) && !evaluation.includes(id) && !catchRegistration.includes(id), "UI must not hard-code Issue #248 IDs");
}
assert.match(dashboard, /spots=\{fishingSpots\}/, "map, evaluation, and registration receive repository master spots");
assert.match(map, /spots\.map\(/, "map markers must be derived from supplied master spots");
assert.match(evaluation, /SpotCombobox spots=\{props\.spots\}/, "spot evaluation must use supplied master spots");
assert.match(catchRegistration, /spots=\{spots\}/, "catch registration must use supplied master spots");
assert.match(dashboard, /fetchFishingEnvironment\(point/, "environment lookup must use the selected master spot point");
assert.match(dashboard, /fetchJmaWarningDecision\(environmentSpot\.id/, "JMA lookup must use the selected master spot ID");
for (const excluded of ["福島", "鷹島", "平戸", "田平", "生月島", "糸島"]) assert.ok(!audit.activeCandidates.some(({ name }) => name.includes(excluded)));
console.log("Issue #248 Imari spot tests passed");
