import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import { buildCatchRegistrationSpotOptions, buildFishingSpotMapEntries, filterFishingSpotOptions, selectFishingSpot, toEnvironmentPoint } from "../src/domain/fishingSpotPresentation";
import { getTideReferenceForSpot } from "../src/domain/environment";
import { JMA_AREA_BY_SPOT } from "../src/domain/jmaWarning";
import { fetchFishingEnvironment } from "../src/services/openMeteo";

const EXPECTED = new Map([
  ["tabira-port", { name: "田平港", lat: 33.362153, lon: 129.574114 }],
  ["hirado-port", { name: "平戸港", lat: 33.37096, lon: 129.553782 }],
  ["hirado-seto", { name: "平戸瀬戸周辺", lat: 33.363946, lon: 129.569344 }],
]);
const OLD_COORDINATES = ["33.365, 129.553", "33.354, 129.579"];
const UNKNOWN_KEYS = ["restriction_status", "fishable_area", "access", "parking", "toilet", "lighting", "shore_access", "depth", "bottom_material", "coastal_topography", "obstacles", "spot_features", "target_species", "recommended_methods"];
const GSI_SOURCE_ID = "src-gsi-hirado-seto-20260723";
const LEGACY_GSI_SOURCE_ID = "src-gsi-map";
type Candidate = { spotId: string; name: string; latitude: number; longitude: number; coordinatePrecision: string; publicFacilityType: string; previousCoordinates?: { latitude: number; longitude: number }; relationToExisting: { migrationPolicy: string } };
type Source = { id: string };
type Audit = { activeCandidates: Candidate[]; heldOrExcluded: { decision: string }[]; migrationPolicy: string[]; sources: Record<string, Source> };
type Details = { spots: { spotId: string; sources: Source[]; values: { itemKey: string; informationState: string; valueText: string | null; valueTextList: string[]; valueNumber: number | null; valueBoolean: boolean | null; confidence: string | null; sources: { supporting: string[]; checked: string[] } }[] }[] };
const audit = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-252-hirado-seto-implementation-input.json", "utf8")) as Audit;
const details = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-252-detail-curation.json", "utf8")) as Details;
const seed = fs.readFileSync("supabase/sql/003_master_data_seed.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260723010000_add_issue_252_hirado_seto_spots.sql", "utf8");
const issue250Migration = fs.readFileSync("supabase/migrations/20260722233000_add_issue_250_matsuura_spots.sql", "utf8");
const fallback = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");

function sourceUuid(id: string) {
  const hash = createHash("md5").update(id).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function sqlCoordinates(sql: string, id: string) {
  const insert = sql.match(new RegExp(`\\('${id}', '[^']+', '[^']+', ([0-9.]+), ([0-9.]+),`));
  if (insert) return { lat: Number(insert[1]), lon: Number(insert[2]) };
  const update = [...sql.matchAll(/update public\.fishing_spots\s+set latitude = ([0-9.]+),\s+longitude = ([0-9.]+),[\s\S]*?where id = '([^']+)'/g)].find((match) => match[3] === id);
  assert.ok(update, `${id} must have an explicit targeted update`);
  return { lat: Number(update[1]), lon: Number(update[2]) };
}

assert.deepEqual(new Set(audit.activeCandidates.map(({ spotId }) => spotId)), new Set(EXPECTED.keys()));
assert.ok(audit.heldOrExcluded.every(({ decision }) => decision === "hold" || decision === "exclude"));
for (const [id, expected] of EXPECTED) {
  const spot = fishingSpots.find((candidate) => candidate.id === id);
  assert.ok(spot, `${id} must remain in the static master`);
  assert.deepEqual({ name: spot.name, lat: spot.latitude, lon: spot.longitude }, expected);
  assert.equal(spot.coordinatePrecision, "approximate");
  assert.equal(spot.shoreAccess, "不明");
  assert.deepEqual(spot.targetSpecies, []);
  assert.deepEqual(spot.recommendedMethods, []);
  assert.deepEqual(sqlCoordinates(seed, id), { lat: expected.lat, lon: expected.lon });
  assert.deepEqual(sqlCoordinates(migration, id), { lat: expected.lat, lon: expected.lon });
  assert.deepEqual(JMA_AREA_BY_SPOT[id], { prefectureEntryCode: "420000", municipalityCode: "4220700", areaName: "長崎県平戸市" });
  assert.equal(getTideReferenceForSpot(id).referenceName, "平戸瀬戸");
  assert.ok(spot.latitude >= 33.35 && spot.latitude <= 33.38 && spot.longitude >= 129.54 && spot.longitude <= 129.59, `${id} must stay around Hirado Seto`);

  assert.equal(selectFishingSpot(fishingSpots, id)?.id, id);
  assert.equal(filterFishingSpotOptions(fishingSpots, spot.name)[0]?.id, id);
  assert.deepEqual(buildFishingSpotMapEntries(fishingSpots).find((entry) => entry.spot.id === id)?.coordinates, [expected.lon, expected.lat]);
  assert.deepEqual(buildCatchRegistrationSpotOptions(fishingSpots).find((option) => option.id === id), { id, label: `${spot.name} / ${spot.areaName}`, spotType: spot.spotType });

  const point = toEnvironmentPoint(spot);
  const urls: string[] = [];
  const fetchImpl = async (input: string) => {
    urls.push(input);
    const hourly = input.includes("marine-api") ? { time: ["2026-07-23T00:00"], wave_height: [0.5] } : { time: ["2026-07-23T00:00"], temperature_2m: [25] };
    return { ok: true, status: 200, json: async () => ({ hourly }) };
  };
  await fetchFishingEnvironment(point, { fetchImpl, storage: null, now: () => new Date("2026-07-23T00:00:00Z") });
  assert.equal(urls.length, 2);
  for (const input of urls) {
    const url = new URL(input);
    assert.equal(url.searchParams.get("latitude"), String(expected.lat));
    assert.equal(url.searchParams.get("longitude"), String(expected.lon));
  }
}

assert.equal(fishingSpots.filter(({ id }) => id === "hirado-port").length, 1);
assert.match(migration, /where id = 'tabira-port' and is_active = true/);
assert.match(migration, /where id = 'hirado-seto' and is_active = true/);
assert.match(migration, /on conflict \(id\) do nothing/);
assert.doesNotMatch(migration, /delete\s+from|drop\s+(table|column)|update\s+(?:public\.)?(?:catch|fishing_report|environment|history)/i);
assert.ok(audit.migrationPolicy.some((policy) => /再割当しない/.test(policy)));
for (const old of OLD_COORDINATES) assert.ok(!seed.includes(old) && !migration.includes(old), `${old} must not remain in active SQL`);
assert.equal(audit.activeCandidates.find(({ spotId }) => spotId === "tabira-port")?.previousCoordinates?.longitude, 129.553);
assert.equal(audit.activeCandidates.find(({ spotId }) => spotId === "hirado-seto")?.previousCoordinates?.latitude, 33.354);
assert.equal(audit.activeCandidates.find(({ spotId }) => spotId === "hirado-port")?.publicFacilityType, "港湾");
assert.ok(audit.activeCandidates.every(({ relationToExisting }) => /再割当|移動/.test(relationToExisting.migrationPolicy)));
assert.ok(fallback.includes("issue-252-detail-curation.json"));
assert.ok(fallback.includes("issue288SetoDetails"), "later re-research may supersede Issue #252 runtime values");
const hiradoDetails = details.spots.find(({ spotId }) => spotId === "hirado-port");
assert.ok(hiradoDetails);
assert.equal(audit.sources[GSI_SOURCE_ID]?.id, GSI_SOURCE_ID);
assert.equal(hiradoDetails.sources.find(({ id }) => id === GSI_SOURCE_ID)?.id, GSI_SOURCE_ID);
assert.ok(issue250Migration.includes(LEGACY_GSI_SOURCE_ID));
assert.notEqual(sourceUuid(GSI_SOURCE_ID), sourceUuid(LEGACY_GSI_SOURCE_ID));
for (const issue252Artifact of [JSON.stringify(audit), JSON.stringify(details), migration]) {
  assert.ok(issue252Artifact.includes(GSI_SOURCE_ID));
  assert.ok(!issue252Artifact.includes(LEGACY_GSI_SOURCE_ID));
}
for (const key of UNKNOWN_KEYS) {
  const value = hiradoDetails.values.find(({ itemKey }) => itemKey === key);
  assert.ok(value, `${key} must be explicitly curated`);
  assert.equal(value.informationState, "researched_unknown");
  assert.equal(value.valueText, null);
  assert.deepEqual(value.valueTextList, []);
  assert.equal(value.valueNumber, null);
  assert.equal(value.valueBoolean, null);
  assert.equal(value.confidence, null);
  assert.deepEqual(value.sources.supporting, []);
  assert.ok(value.sources.checked.includes(GSI_SOURCE_ID));
}
console.log("Issue #252 Hirado Seto spot tests passed");
