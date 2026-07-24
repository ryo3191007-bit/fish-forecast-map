import assert from "node:assert/strict";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import { buildCatchRegistrationSpotOptions, buildFishingSpotMapEntries, filterFishingSpotOptions, selectFishingSpot, toEnvironmentPoint } from "../src/domain/fishingSpotPresentation";
import { buildStaticFishingSpotDetailsFromSpots } from "../src/lib/fishingSpotDetailFallback";
import { getTideReferenceForSpot } from "../src/domain/environment";
import { JMA_AREA_BY_SPOT } from "../src/domain/jmaWarning";
import { fetchFishingEnvironment } from "../src/services/openMeteo";

const EXPECTED = new Map([
  ["kafuri-port", ["加布里漁港", "漁港", 33.55108074, 130.16319421, "exact"]],
  ["fukae-port", ["深江漁港", "漁港", 33.52054429, 130.13213826, "exact"]],
  ["dainyu-port", ["大入漁港", "漁港", 33.511599, 130.104355, "exact"]],
  ["shikaka-port", ["鹿家漁港", "漁港", 33.48896959, 130.04777541, "exact"]],
  ["fukunoura-port", ["福ノ浦漁港", "その他", 33.5746, 130.0941, "approximate"]],
] as const);
const LEGACY = ["nokita-port", "nokita-beach", "keya-port", "keya-gate", "funakoshi-port", "kishi-port", "fukuyoshi-port"];
const UNKNOWN = ["toilet", "lighting", "parking", "access", "restriction_status", "fishable_area", "shore_access", "depth", "bottom_material", "coastal_topography", "obstacles", "spot_features", "target_species", "recommended_methods"];
const audit = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-258-itoshima-implementation-input.json", "utf8"));
const details = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-258-detail-curation.json", "utf8"));
const reResearchFiles = [
  "data/curation/fishing-spots/issue-278-itoshima-detail-reresearch.json",
  "data/curation/fishing-spots/issue-278-itoshima-detail-reresearch-central.json",
  "data/curation/fishing-spots/issue-278-itoshima-detail-reresearch-south.json",
];
const reResearchSpots = reResearchFiles.flatMap((path) => JSON.parse(fs.readFileSync(path, "utf8")).spots as Array<{ spotId: string; values: Array<{ itemKey: string; informationState: string }> }>);
const reResearchStateBySpotItem = new Map(reResearchSpots.flatMap((spot) =>
  spot.values.map((value) => [`${spot.spotId}:${value.itemKey}`, value.informationState] as const),
));
const seed = fs.readFileSync("supabase/sql/003_master_data_seed.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260723130000_add_issue_258_itoshima_west_spots.sql", "utf8");
assert.equal(new Set(fishingSpots.map((spot) => spot.id)).size, fishingSpots.length, "all master IDs must remain unique");
assert.deepEqual(new Set(audit.activeCandidates.map((spot: { spotId: string }) => spot.spotId)), new Set(EXPECTED.keys()));
assert.ok(audit.heldOrExcluded.every((candidate: { decision: string }) => candidate.decision === "hold"), "beach candidates stay out of this implementation");
assert.notEqual(audit.researchStatePolicy.unresearched, audit.researchStatePolicy.researched_unknown);
for (const id of LEGACY) {
  assert.ok(fishingSpots.some((spot) => spot.id === id), `${id} must remain in static master`);
  assert.match(seed, new RegExp(`\\('${id}',[\\s\\S]*?, true\\)`), `${id} must remain active in bootstrap`);
}
for (const [id, expected] of EXPECTED) {
  const spot = fishingSpots.find((candidate) => candidate.id === id);
  assert.ok(spot);
  assert.deepEqual([spot.name, spot.spotType, spot.latitude, spot.longitude, spot.coordinatePrecision], expected);
  assert.equal(spot.areaName, "糸島西岸");
  assert.equal(spot.shoreAccess, "不明");
  assert.deepEqual(spot.targetSpecies, []);
  assert.deepEqual(spot.recommendedMethods, []);
  assert.ok(spot.latitude >= 33.48 && spot.latitude <= 33.59 && spot.longitude >= 130.04 && spot.longitude <= 130.17, `${id} must stay on the researched Itoshima coast envelope`);
  for (const sql of [seed, migration]) assert.match(sql, new RegExp(`\\('${id}', '${spot.name}', '糸島西岸', ${spot.latitude}, ${spot.longitude}, '${spot.spotType}'`));
  assert.deepEqual(JMA_AREA_BY_SPOT[id], { prefectureEntryCode: "400000", municipalityCode: "4023000", areaName: "福岡県糸島市" });
  assert.equal(getTideReferenceForSpot(id).referenceName, "唐津");
  assert.equal(selectFishingSpot(fishingSpots, id)?.id, id);
  assert.equal(filterFishingSpotOptions(fishingSpots, spot.name)[0]?.id, id);
  assert.deepEqual(buildFishingSpotMapEntries(fishingSpots).find((entry) => entry.spot.id === id)?.coordinates, [spot.longitude, spot.latitude]);
  assert.ok(buildCatchRegistrationSpotOptions(fishingSpots).some((option) => option.id === id));
  const curated = details.spots.find((candidate: { spotId: string }) => candidate.spotId === id);
  assert.ok(curated);
  for (const key of UNKNOWN) {
    const value = curated.values.find((candidate: { itemKey: string }) => candidate.itemKey === key);
    assert.equal(value?.informationState, "researched_unknown");
    assert.equal(value?.confidence, null);
    assert.deepEqual(value?.sources.supporting, []);
    assert.ok(value?.sources.checked.length > 0);
  }
  const runtime = buildStaticFishingSpotDetailsFromSpots(fishingSpots).values.filter((value) => value.spotId === id);
  for (const key of UNKNOWN) {
    const reResearchState = reResearchStateBySpotItem.get(`${id}:${key}`);
    const runtimeValue = runtime.find((value) => value.itemKey === key);
    assert.equal(runtimeValue?.informationState, reResearchState ?? "researched_unknown", `${id}:${key}: runtime must use the latest curation state`);
    if (reResearchState) assert.ok(runtimeValue?.id.endsWith(":issue278"), `${id}:${key}: re-research value must override Issue #258 runtime value`);
  }
  const urls: string[] = [];
  await fetchFishingEnvironment(toEnvironmentPoint(spot), { storage: null, now: () => new Date("2026-07-23T00:00:00Z"), fetchImpl: async (input: string) => { urls.push(input); return { ok: true, status: 200, json: async () => ({ hourly: { time: ["2026-07-23T00:00"], temperature_2m: [25], wave_height: [0.5] } }) }; } });
  assert.equal(urls.length, 2);
  assert.ok(urls.every((input) => new URL(input).searchParams.get("latitude") === String(spot.latitude) && new URL(input).searchParams.get("longitude") === String(spot.longitude)));
}
const fukunoura = audit.activeCandidates.find((spot: { spotId: string }) => spot.spotId === "fukunoura-port");
assert.equal(fukunoura.decision, "conditional_adopt");
assert.match(fukunoura.reason, /独立法定漁港とは断定せず/);
assert.match(fishingSpots.find((spot) => spot.id === "fukunoura-port")!.notes.join(" "), /district概略代表点/);
assert.doesNotMatch(migration, /delete\s+from|drop\s+(table|column)|update\s+public\.fishing_spots/i);
assert.match(migration, /on conflict \(id\) do nothing/);
assert.match(migration, /"issue":258/);
console.log("Issue #258 Itoshima west spot tests passed");
