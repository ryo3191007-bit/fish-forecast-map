import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const STATIC_PATH = "src/data/fishingSpots.ts";
const SEED_PATH = "supabase/sql/003_master_data_seed.sql";
const MIGRATION_PATH = "supabase/migrations/20260718120000_update_issue_178_safe_fishing_spots.sql";
const CURATION_PATH = "data/curation/fishing-spots/issue-178-safe-minimum.production.json";

const targetIds = [
  "nokita-port",
  "nokita-beach",
  "keya-port",
  "keya-gate",
  "funakoshi-port",
  "kishi-port",
  "fukuyoshi-port",
  "hamasaki-beach",
  "niji-matsubara",
  "karatsu-west-port",
  "yobuko-area",
  "imari-inner-bay",
  "fukushima-area",
  "takashima-area",
  "tabira-port",
  "hirado-seto",
  "ikitsuki-area",
];

const expectedOverrides = new Map([
  ["nokita-port", { latitude: 33.611311, longitude: 130.161569, spotType: "漁港", coordinatePrecision: "exact" }],
  ["keya-port", { latitude: 33.58937974, longitude: 130.10658056, spotType: "漁港", coordinatePrecision: "exact" }],
  ["funakoshi-port", { latitude: 33.55389244, longitude: 130.13025931, spotType: "漁港", coordinatePrecision: "exact" }],
  ["keya-gate", { latitude: 33.5967, longitude: 130.1106, spotType: "その他", coordinatePrecision: "approximate" }],
  ["fukushima-area", { latitude: 33.332, longitude: 129.773, spotType: "その他", coordinatePrecision: "approximate" }],
  ["hirado-seto", { latitude: 33.354, longitude: 129.579, spotType: "その他", coordinatePrecision: "approximate" }],
  ["ikitsuki-area", { latitude: 33.39, longitude: 129.564, spotType: "その他", coordinatePrecision: "approximate" }],
]);

const issue165CoordinateHolds = new Map([
  ["nokita-beach", [33.625, 130.158, "サーフ"]],
  ["kishi-port", [33.568, 130.151, "漁港"]],
  ["fukuyoshi-port", [33.517, 130.058, "漁港"]],
  ["hamasaki-beach", [33.447, 130.039, "サーフ"]],
  ["niji-matsubara", [33.462, 130.016, "その他"]],
  ["karatsu-west-port", [33.468, 129.978, "その他"]],
  ["yobuko-area", [33.543, 129.892, "その他"]],
  ["imari-inner-bay", [33.281, 129.861, "その他"]],
  ["takashima-area", [33.448, 129.844, "その他"]],
  ["tabira-port", [33.365, 129.553, "その他"]],
]);

const karatsuEastExpected = {
  id: "karatsu-east-port",
  latitude: 33.459,
  longitude: 129.993,
  spotType: "その他",
  shoreAccess: "不明",
  targetSpecies: ["アジ", "シーバス", "チヌ"],
  recommendedMethods: [],
  coordinatePrecision: "approximate",
};

function loadFishingSpots() {
  const source = fs.readFileSync(STATIC_PATH, "utf8").replace(/^import[^;]+;\n/gm, "");
  const match = source.match(/export const fishingSpots(?:[^=]*) = ([\s\S]*?);\n\nexport const fishingSpotById/);
  assert.ok(match, "Could not parse fishingSpots static master");
  return JSON.parse(vm.runInNewContext(`const fishingSpots = ${match[1]}; JSON.stringify(fishingSpots)`, {}));
}

function rowFor(sql, id) {
  return sql.match(new RegExp(`^\\s*\\('${id.replaceAll("-", "\\-")}',[\\s\\S]*?true\\),?$`, "m"))?.[0];
}

const spots = loadFishingSpots();
assert.equal(spots.length, 18, "No fishing spots should be added or removed");
const byId = new Map(spots.map((spot) => [spot.id, spot]));

for (const id of targetIds) {
  const spot = byId.get(id);
  assert.ok(spot, `${id} missing from static master`);
  assert.equal(spot.shoreAccess, "不明", `${id} shoreAccess must be unknown`);
  assert.deepEqual(spot.targetSpecies, [], `${id} targetSpecies must be empty`);
  assert.deepEqual(spot.recommendedMethods, [], `${id} recommendedMethods must be empty`);
  assert.equal(spot.notes.length, 3, `${id} must have three notes`);
  assert.match(spot.notes.join("\n"), /代表点|暫定保持|概略代表点/, `${id} notes must explain representative coordinate limits`);
  assert.match(spot.notes.join("\n"), /立入・釣り可否は未確認/, `${id} notes must explain access uncertainty`);
  assert.match(spot.notes.join("\n"), /魚種・釣法.*掲載していません/, `${id} notes must explain omitted species and methods`);
  const expected = expectedOverrides.get(id);
  if (expected) assert.deepEqual({ latitude: spot.latitude, longitude: spot.longitude, spotType: spot.spotType, coordinatePrecision: spot.coordinatePrecision }, expected);
}

for (const [id, [latitude, longitude, spotType]] of issue165CoordinateHolds) {
  const spot = byId.get(id);
  assert.equal(spot.latitude, latitude, `${id} Issue #165 latitude must stay at the existing production value`);
  assert.equal(spot.longitude, longitude, `${id} Issue #165 longitude must stay at the existing production value`);
  assert.equal(spot.spotType, spotType, `${id} spotType must follow Issue #178 projection table`);
  assert.equal(spot.coordinatePrecision, "approximate", `${id} Issue #165 coordinatePrecision must be approximate`);
  assert.match(spot.notes.join("\n"), /調査済みですが公的な本番代表座標は未確定/, `${id} notes must retain coordinate hold rationale`);
}

assert.deepEqual(
  (({ id, latitude, longitude, spotType, shoreAccess, targetSpecies, recommendedMethods, coordinatePrecision }) => ({ id, latitude, longitude, spotType, shoreAccess, targetSpecies, recommendedMethods, coordinatePrecision }))(byId.get("karatsu-east-port")),
  karatsuEastExpected,
  "karatsu-east-port must remain unchanged",
);

const curation = JSON.parse(fs.readFileSync(CURATION_PATH, "utf8"));
assert.equal(curation.issue, "#178");
assert.deepEqual(curation.notChanged, ["karatsu-east-port"]);
assert.equal(curation.spots.length, targetIds.length);
for (const id of targetIds) {
  const curated = curation.spots.find((spot) => spot.spotId === id)?.productionValue;
  assert.ok(curated, `${id} missing from curation`);
  assert.deepEqual(curated, byId.get(id), `${id} curation and static master must match`);
}

const seedSql = fs.readFileSync(SEED_PATH, "utf8");
const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");
assert.ok(!/\b(drop|delete|truncate|alter|grant|revoke|create\s+(?:or\s+replace\s+)?(?:function|procedure)|policy)\b/i.test(migrationSql), "migration must not contain destructive/schema/security changes");
assert.ok(!migrationSql.includes("'karatsu-east-port'"), "migration must not update karatsu-east-port");
for (const id of targetIds) {
  const seedRow = rowFor(seedSql, id);
  const migrationRow = rowFor(migrationSql, id);
  assert.ok(seedRow, `${id} seed row missing`);
  assert.ok(migrationRow, `${id} migration row missing`);
  for (const token of ["'不明'", "array[]::text[]", "代表点", "魚種・釣法"]) {
    assert.ok(seedRow.includes(token), `${id} seed row missing ${token}`);
    assert.ok(migrationRow.includes(token), `${id} migration row missing ${token}`);
  }
}

console.log("OK Issue #178 safe spot master, seed, migration, curation, and empty-array UI data are synchronized");
