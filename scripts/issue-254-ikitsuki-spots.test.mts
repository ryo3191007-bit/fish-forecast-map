import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import { buildCatchRegistrationSpotOptions, buildFishingSpotMapEntries, selectFishingSpot, toEnvironmentPoint } from "../src/domain/fishingSpotPresentation";
import { getTideReferenceForSpot } from "../src/domain/environment";
import { JMA_AREA_BY_SPOT } from "../src/domain/jmaWarning";
import { buildStaticFishingSpotDetailsFromSpots } from "../src/lib/fishingSpotDetailFallback";
import { fetchFishingEnvironment } from "../src/services/openMeteo";

const EXPECTED = new Map([
  ["ikitsuki-area", { name: "生月島方面", type: "その他", lat: 33.407104, lon: 129.424733 }],
  ["ikitsuki-fishing-port", { name: "生月漁港", type: "漁港", lat: 33.392334, lon: 129.43306 }],
  ["tachiura-fishing-port", { name: "館浦漁港", type: "漁港", lat: 33.361458, lon: 129.430984 }],
  ["misaki-fishing-port", { name: "御崎漁港", type: "漁港", lat: 33.431702, lon: 129.429291 }],
]);
const NEW_IDS = [...EXPECTED.keys()].slice(1);
const UNKNOWN_KEYS = ["restriction_status", "fishable_area", "access", "parking", "toilet", "lighting", "shore_access", "depth", "bottom_material", "coastal_topography", "obstacles", "spot_features", "target_species", "recommended_methods"];
const GSI = "src-gsi-ikitsuki-20260723";
const PORTS = "src-nagasaki-fishing-ports-issue254";
type Audit = { activeCandidates: { spotId: string; coordinatePrecision: string; previousCoordinates?: { latitude: number; longitude: number }; relationToExisting: { migrationPolicy: string } }[]; sources: Record<string, { id: string }>; migrationPolicy: string[] };
type Details = { spots: { spotId: string; sources: { id: string }[]; values: { itemKey: string; informationState: string; valueText: string | null; valueTextList: string[]; valueNumber: number | null; valueBoolean: boolean | null; confidence: string | null; sources: { supporting: string[]; checked: string[] } }[] }[] };
const audit = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-254-ikitsuki-implementation-input.json", "utf8")) as Audit;
const details = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-254-detail-curation.json", "utf8")) as Details;
const seed = fs.readFileSync("supabase/sql/003_master_data_seed.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260723050000_add_issue_254_ikitsuki_spots.sql", "utf8");
const previousArtifacts = [fs.readFileSync("supabase/migrations/20260722233000_add_issue_250_matsuura_spots.sql", "utf8"), fs.readFileSync("supabase/migrations/20260723010000_add_issue_252_hirado_seto_spots.sql", "utf8")];
function uuid(id: string) { const h = createHash("md5").update(id).digest("hex"); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; }
function coordinates(sql: string, id: string) {
  const inserted = sql.match(new RegExp(`\\('${id}', '[^']+', '[^']+', ([0-9.]+), ([0-9.]+),`));
  if (inserted) return { lat: Number(inserted[1]), lon: Number(inserted[2]) };
  const updated = [...sql.matchAll(/update public\.fishing_spots\s+set latitude = ([0-9.]+),\s+longitude = ([0-9.]+)[\s\S]*?where id = '([^']+)'/g)].find((m) => m[3] === id);
  assert.ok(updated); return { lat: Number(updated[1]), lon: Number(updated[2]) };
}
assert.equal(fishingSpots.length, 47, "Issue #253 adds eight spots after Issue #254");
assert.deepEqual(new Set(audit.activeCandidates.map(({ spotId }) => spotId)), new Set(EXPECTED.keys()));
for (const [id, expected] of EXPECTED) {
  const spot = fishingSpots.find((candidate) => candidate.id === id); assert.ok(spot);
  assert.deepEqual({ name: spot.name, type: spot.spotType, lat: spot.latitude, lon: spot.longitude }, expected);
  assert.equal(spot.coordinatePrecision, "approximate"); assert.deepEqual(spot.targetSpecies, []); assert.deepEqual(spot.recommendedMethods, []);
  assert.ok(spot.latitude >= 33.35 && spot.latitude <= 33.45 && spot.longitude >= 129.41 && spot.longitude <= 129.45, `${id} must stay within a reasonable Ikitsuki range`);
  assert.deepEqual(coordinates(seed, id), { lat: expected.lat, lon: expected.lon }); assert.deepEqual(coordinates(migration, id), { lat: expected.lat, lon: expected.lon });
  assert.deepEqual(JMA_AREA_BY_SPOT[id], { prefectureEntryCode: "420000", municipalityCode: "4220700", areaName: "長崎県平戸市" });
  assert.equal(getTideReferenceForSpot(id).referenceName, "平戸瀬戸"); assert.equal(selectFishingSpot(fishingSpots, id)?.id, id);
  assert.deepEqual(buildFishingSpotMapEntries(fishingSpots).find((entry) => entry.spot.id === id)?.coordinates, [expected.lon, expected.lat]);
  assert.ok(buildCatchRegistrationSpotOptions(fishingSpots).some((option) => option.id === id));
  const urls: string[] = []; await fetchFishingEnvironment(toEnvironmentPoint(spot), { storage: null, now: () => new Date("2026-07-23T00:00:00Z"), fetchImpl: async (input: string) => { urls.push(input); return { ok: true, status: 200, json: async () => ({ hourly: input.includes("marine-api") ? { time: ["2026-07-23T00:00"], wave_height: [0.5] } : { time: ["2026-07-23T00:00"], temperature_2m: [25] } }) }; } });
  for (const input of urls) { const url = new URL(input); assert.equal(url.searchParams.get("latitude"), String(expected.lat)); assert.equal(url.searchParams.get("longitude"), String(expected.lon)); }
}
assert.equal(fishingSpots.filter(({ id }) => EXPECTED.has(id)).length, 4); assert.equal(new Set(fishingSpots.map(({ id }) => id)).size, 47);
assert.deepEqual(audit.activeCandidates.find(({ spotId }) => spotId === "ikitsuki-area")?.previousCoordinates, { latitude: 33.39, longitude: 129.564 });
assert.match(migration, /where id = 'ikitsuki-area' and is_active = true/); assert.doesNotMatch(migration, /insert[^;]+\('ikitsuki-area'/is);
assert.match(migration, /on conflict \(id\) do nothing/); assert.doesNotMatch(migration, /delete\s+from|drop\s+(table|column)|update\s+(?:public\.)?(?:catch|fishing_report|environment|history)/i);
assert.ok(audit.migrationPolicy.some((policy) => /再割当しない/.test(policy)));
for (const id of NEW_IDS) {
  assert.equal(fishingSpots.filter((spot) => spot.id === id).length, 1);
  const curated = details.spots.find((spot) => spot.spotId === id); assert.ok(curated);
  for (const key of UNKNOWN_KEYS) { const value = curated.values.find((entry) => entry.itemKey === key); assert.ok(value); assert.equal(value.informationState, "researched_unknown"); assert.equal(value.valueText, null); assert.deepEqual(value.valueTextList, []); assert.equal(value.valueNumber, null); assert.equal(value.valueBoolean, null); assert.equal(value.confidence, null); assert.deepEqual(value.sources.supporting, []); assert.ok(value.sources.checked.includes(GSI) && value.sources.checked.includes(PORTS)); }
  const runtime = buildStaticFishingSpotDetailsFromSpots(fishingSpots).values.filter((value) => value.spotId === id); assert.ok(UNKNOWN_KEYS.every((key) => runtime.some((value) => value.itemKey === key && value.informationState === "researched_unknown")));
}
for (const sourceId of [GSI, PORTS]) { assert.equal(audit.sources[sourceId]?.id, sourceId); assert.ok(details.spots.every((spot) => spot.sources.some(({ id }) => id === sourceId))); assert.ok(previousArtifacts.every((text) => !text.includes(sourceId))); }
assert.notEqual(uuid(GSI), uuid("src-gsi-hirado-seto-20260723")); assert.notEqual(uuid(GSI), uuid("src-gsi-map"));
console.log("Issue #254 Ikitsuki spot tests passed");
