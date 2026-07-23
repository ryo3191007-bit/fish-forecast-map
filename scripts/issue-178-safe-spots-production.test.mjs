import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

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

const targetIdSet = new Set(targetIds);

const expectedOverrides = new Map([
  ["nokita-port", { latitude: 33.611311, longitude: 130.161569, spotType: "漁港", coordinatePrecision: "exact" }],
  ["keya-port", { latitude: 33.58937974, longitude: 130.10658056, spotType: "漁港", coordinatePrecision: "exact" }],
  ["funakoshi-port", { latitude: 33.55389244, longitude: 130.13025931, spotType: "漁港", coordinatePrecision: "exact" }],
  ["keya-gate", { latitude: 33.5967, longitude: 130.1106, spotType: "その他", coordinatePrecision: "approximate" }],
  ["fukushima-area", { latitude: 33.332, longitude: 129.773, spotType: "その他", coordinatePrecision: "approximate" }],
  ["tabira-port", { latitude: 33.362153, longitude: 129.574114, spotType: "その他", coordinatePrecision: "approximate" }],
  ["hirado-seto", { latitude: 33.363946, longitude: 129.569344, spotType: "その他", coordinatePrecision: "approximate" }],
  ["ikitsuki-area", { latitude: 33.407104, longitude: 129.424733, spotType: "その他", coordinatePrecision: "approximate" }],
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
]);

const karatsuEastExpected = {
  id: "karatsu-east-port",
  latitude: 33.459,
  longitude: 129.993,
  spotType: "その他",
  shoreAccess: "不明",
  targetSpecies: ["アジ", "スズキ", "チヌ"],
  recommendedMethods: [],
  coordinatePrecision: "approximate",
};

function loadFishingSpots() {
  const source = fs.readFileSync(STATIC_PATH, "utf8").replace(/^import[^;]+;\n/gm, "");
  const match = source.match(/export const fishingSpots(?:[^=]*) = ([\s\S]*?);\n\nexport const fishingSpotById/);
  assert.ok(match, "Could not parse fishingSpots static master");
  return JSON.parse(vm.runInNewContext(`const fishingSpots = ${match[1]}; JSON.stringify(fishingSpots)`, {}));
}

function splitSqlValues(rowBody) {
  const values = [];
  let current = "";
  let quote = false;
  let arrayDepth = 0;
  for (let index = 0; index < rowBody.length; index += 1) {
    const char = rowBody[index];
    const next = rowBody[index + 1];
    if (char === "'" && quote && next === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (char === "'") quote = !quote;
    if (!quote && rowBody.startsWith("array[", index)) arrayDepth += 1;
    if (!quote && char === "]" && arrayDepth > 0) arrayDepth -= 1;
    if (!quote && arrayDepth === 0 && char === ",") {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseSqlString(value) {
  assert.match(value, /^'.*'$/s, `Expected SQL string, got ${value}`);
  return value.slice(1, -1).replaceAll("''", "'");
}

function parseTextArray(value) {
  if (value === "array[]::text[]") return [];
  const match = value.match(/^array\[([\s\S]*)\]::text\[]$/);
  assert.ok(match, `Expected SQL text array, got ${value}`);
  if (match[1].trim() === "") return [];
  return splitSqlValues(match[1]).map(parseSqlString);
}

function parseFishingSpotRows(sql, { targetOnly }) {
  const rows = [];
  const valuesBlock = sql.match(/insert into public\.fishing_spots[\s\S]*?\nvalues\n([\s\S]*?)\non conflict \(id\) do update set/);
  assert.ok(valuesBlock, "Could not parse fishing_spots values block");
  for (const rowMatch of valuesBlock[1].matchAll(/^\s*\(([\s\S]*?)\),?$/gm)) {
    const values = splitSqlValues(rowMatch[1]);
    assert.equal(values.length, 12, `Unexpected fishing_spots column count in row: ${rowMatch[0]}`);
    const [id, name, areaName, latitude, longitude, spotType, shoreAccess, coordinatePrecision, targetSpecies, recommendedMethods, notes, isActive] = values;
    const parsed = {
      id: parseSqlString(id),
      name: parseSqlString(name),
      areaName: parseSqlString(areaName),
      latitude: Number(latitude),
      longitude: Number(longitude),
      spotType: parseSqlString(spotType),
      shoreAccess: parseSqlString(shoreAccess),
      targetSpecies: parseTextArray(targetSpecies),
      recommendedMethods: parseTextArray(recommendedMethods),
      notes: parseTextArray(notes),
      coordinatePrecision: parseSqlString(coordinatePrecision),
    };
    assert.equal(isActive, "true", `${parsed.id} SQL row must stay active`);
    if (!targetOnly || targetIdSet.has(parsed.id)) rows.push(parsed);
  }
  return rows;
}

function normalizeSpot(spot) {
  return {
    id: spot.id,
    name: spot.name,
    areaName: spot.areaName,
    latitude: spot.latitude,
    longitude: spot.longitude,
    spotType: spot.spotType,
    shoreAccess: spot.shoreAccess,
    targetSpecies: spot.targetSpecies,
    recommendedMethods: spot.recommendedMethods,
    notes: spot.notes,
    coordinatePrecision: spot.coordinatePrecision,
  };
}

function byIdFromRows(rows, label) {
  const byId = new Map();
  for (const row of rows) {
    assert.ok(!byId.has(row.id), `${label} must not contain duplicate row for ${row.id}`);
    byId.set(row.id, row);
  }
  return byId;
}

function loadMapFishingSpotRow() {
  const mapperSource = fs.readFileSync("src/lib/masterDataMapper.ts", "utf8");
  const compiled = ts.transpileModule(mapperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const mapperModule = { exports };
  const customRequire = (specifier) => {
    if (specifier === "@/domain/fishing") {
      const domainSource = fs.readFileSync("src/domain/fishing.ts", "utf8");
      const domainCompiled = ts.transpileModule(domainSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      const domainModule = { exports: {} };
      vm.runInNewContext(domainCompiled, { require, exports: domainModule.exports, module: domainModule }, { filename: "src/domain/fishing.ts" });
      return domainModule.exports;
    }
    return require(specifier);
  };
  vm.runInNewContext(compiled, { require: customRequire, exports, module: mapperModule }, { filename: "src/lib/masterDataMapper.ts" });
  return mapperModule.exports.mapFishingSpotRow;
}

const spots = loadFishingSpots();
for (const legacyId of ["nokita-port", "nokita-beach", "keya-port", "keya-gate", "funakoshi-port", "kishi-port", "fukuyoshi-port", "hamasaki-beach", "niji-matsubara", "karatsu-east-port", "karatsu-west-port", "yobuko-area", "imari-inner-bay", "fukushima-area", "takashima-area", "tabira-port", "hirado-seto", "ikitsuki-area"]) assert.ok(spots.some((spot) => spot.id === legacyId), `${legacyId} legacy spot must be preserved`);
const staticById = new Map(spots.map((spot) => [spot.id, normalizeSpot(spot)]));

for (const id of targetIds) {
  const spot = staticById.get(id);
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
  const spot = staticById.get(id);
  assert.equal(spot.latitude, latitude, `${id} Issue #165 latitude must stay at the existing production value`);
  assert.equal(spot.longitude, longitude, `${id} Issue #165 longitude must stay at the existing production value`);
  assert.equal(spot.spotType, spotType, `${id} spotType must follow Issue #178 projection table`);
  assert.equal(spot.coordinatePrecision, "approximate", `${id} Issue #165 coordinatePrecision must be approximate`);
  assert.match(spot.notes.join("\n"), /調査済みですが公的な本番代表座標は未確定/, `${id} notes must retain coordinate hold rationale`);
}

assert.deepEqual(
  (({ id, latitude, longitude, spotType, shoreAccess, targetSpecies, recommendedMethods, coordinatePrecision }) => ({ id, latitude, longitude, spotType, shoreAccess, targetSpecies, recommendedMethods, coordinatePrecision }))(staticById.get("karatsu-east-port")),
  karatsuEastExpected,
  "karatsu-east-port must retain its data with the current canonical species label",
);

const curation = JSON.parse(fs.readFileSync(CURATION_PATH, "utf8"));
assert.equal(curation.issue, "#178");
assert.deepEqual(curation.notChanged, ["karatsu-east-port"]);
assert.equal(curation.spots.length, targetIds.length);
const curationRows = curation.spots.map((spot) => normalizeSpot(spot.productionValue));

const seedSql = fs.readFileSync(SEED_PATH, "utf8");
const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");
assert.ok(!/\b(drop|delete|truncate|alter|grant|revoke|create\s+(?:or\s+replace\s+)?(?:function|procedure)|policy)\b/i.test(migrationSql), "migration must not contain destructive/schema/security changes");
assert.ok(!migrationSql.includes("'karatsu-east-port'"), "migration must not update karatsu-east-port");

const seedRows = parseFishingSpotRows(seedSql, { targetOnly: true });
const migrationRows = parseFishingSpotRows(migrationSql, { targetOnly: false });
assert.equal(seedRows.length, targetIds.length, "seed must contain all 17 target rows");
assert.equal(migrationRows.length, targetIds.length, "migration must contain exactly the 17 target rows and no extra rows");
const seedById = byIdFromRows(seedRows, "seed");
const migrationById = byIdFromRows(migrationRows, "migration");
const curationById = byIdFromRows(curationRows, "curation");
assert.deepEqual([...migrationById.keys()].sort(), [...targetIds].sort(), "migration must contain each target id exactly once and no non-target id");

const refinedByLaterMigration = new Set(["tabira-port", "hirado-seto", "ikitsuki-area"]);
for (const id of targetIds) {
  assert.deepEqual(seedById.get(id), staticById.get(id), `${id} seed and static master must match across all normalized columns`);
  if (!refinedByLaterMigration.has(id)) {
    assert.deepEqual(migrationById.get(id), staticById.get(id), `${id} migration and static master must match across all normalized columns`);
    assert.deepEqual(curationById.get(id), staticById.get(id), `${id} curation and static master must match across all normalized columns`);
  }
}

const mapFishingSpotRow = loadMapFishingSpotRow();
for (const id of targetIds) {
  const sqlRow = migrationById.get(id);
  const mapped = mapFishingSpotRow({
    id: sqlRow.id,
    name: sqlRow.name,
    area_name: sqlRow.areaName,
    latitude: sqlRow.latitude,
    longitude: sqlRow.longitude,
    spot_type: sqlRow.spotType,
    shore_access: sqlRow.shoreAccess,
    target_species: sqlRow.targetSpecies,
    recommended_methods: sqlRow.recommendedMethods,
    notes: sqlRow.notes,
    coordinate_precision: sqlRow.coordinatePrecision,
    is_active: true,
  });
  assert.ok(mapped, `${id} mapFishingSpotRow must not drop active rows with empty arrays and unknown shore access`);
  const expectedMapped = refinedByLaterMigration.has(id) ? migrationById.get(id) : staticById.get(id);
  assert.deepEqual(normalizeSpot(mapped), expectedMapped, `${id} mapFishingSpotRow output must preserve its input row`);
}

assert.equal(spots.filter((spot) => targetIdSet.has(spot.id)).length, targetIds.length, "static target rows must remain available for marker rendering");
assert.equal(new Set(spots.map((spot) => spot.areaName)).size, 11, "area filter option derivation must still include areas from empty-array target rows");
for (const id of targetIds) {
  const spot = staticById.get(id);
  assert.ok(Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude), `${id} marker coordinates must remain finite`);
  assert.ok(spot.areaName.length > 0, `${id} must stay selectable by area-derived filters/lists`);
}

console.log("OK Issue #178 safe spot master, seed, migration, curation, mapper, and empty-array UI data are synchronized");
