import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const CURATION_PATH = "data/curation/fishing-spots/karatsu-east-port.production.json";
const STATIC_PATH = "src/data/fishingSpots.ts";
const SEED_PATH = "supabase/sql/003_master_data_seed.sql";
const MIGRATION_PATH = "supabase/migrations/20260717133500_update_karatsu_east_port_master.sql";
const MAPPER_PATH = "src/lib/masterDataMapper.ts";
const UI_PATH = "src/components/EnvironmentPanel.tsx";

const expected = {
  id: "karatsu-east-port",
  name: "唐津東港",
  areaName: "唐津湾",
  latitude: 33.459,
  longitude: 129.993,
  spotType: "その他",
  shoreAccess: "不明",
  targetSpecies: ["アジ", "シーバス", "チヌ"],
  recommendedMethods: [],
  notes: [
    "唐津港東港地区の代表点です。一般利用可能な釣り位置や入口を示すものではありません。",
    "立入・釣り可否は、現地表示と港湾管理者の最新案内を確認してください。",
    "魚種は過去の公開情報に基づく参考情報で、現在の釣果や時期を保証しません。",
  ],
  coordinatePrecision: "approximate",
};

function loadFishingSpots() {
  const source = fs
    .readFileSync(STATIC_PATH, "utf8")
    .replace(/^import[^;]+;\n/gm, "");
  const match = source.match(
    /export const fishingSpots(?:[^=]*) = ([\s\S]*?);\n\nexport const fishingSpotById/,
  );
  assert.ok(match, "Could not parse fishingSpots static master");
  return JSON.parse(
    vm.runInNewContext(
      `const fishingSpots = ${match[1]}; JSON.stringify(fishingSpots)`,
      {},
    ),
  );
}

function assertSqlValue(sql, value, label) {
  const escaped = String(value).replaceAll("'", "''");
  assert.ok(sql.includes(`'${escaped}'`), `${label} is missing from SQL`);
}

const curation = JSON.parse(fs.readFileSync(CURATION_PATH, "utf8"));
assert.equal(curation.curationVersion, "1.0.0");
assert.equal(curation.status, "approved");
assert.equal(curation.approvedBy, "repository-owner");
assert.equal(curation.approvedAt, "2026-07-17");
assert.deepEqual(curation.productionValue, expected);
assert.ok(
  curation.fields.some(
    (field) =>
      field.path === "targetSpecies" &&
      field.decision === "adopt_with_warning",
  ),
  "targetSpecies must remain an adopt_with_warning decision",
);
assert.ok(
  curation.fields.some(
    (field) =>
      field.path === "shoreAccess" && field.productionValue === "不明",
  ),
  "shoreAccess curation is missing",
);

const spots = loadFishingSpots();
const staticSpot = spots.find((spot) => spot.id === expected.id);
assert.ok(staticSpot, "Karatsu East Port is missing from static master");
assert.deepEqual(staticSpot, expected);
assert.equal(spots.length, 18, "Other fishing spots must not be added or removed");

const seedSql = fs.readFileSync(SEED_PATH, "utf8");
const seedRow = seedSql.match(
  /^\s*\('karatsu-east-port',[\s\S]*?true\),?$/m,
)?.[0];
assert.ok(seedRow, "Karatsu East Port seed row is missing");
for (const value of [
  expected.name,
  expected.areaName,
  expected.spotType,
  expected.shoreAccess,
  expected.coordinatePrecision,
  ...expected.targetSpecies,
  ...expected.notes,
]) {
  assertSqlValue(seedRow, value, `seed value ${value}`);
}
assert.ok(
  seedRow.includes("array[]::text[]"),
  "seed recommended_methods must be an empty text array",
);
for (const removedValue of ["青物", "真鯛", "サバ", "ジギング", "コマセ", "サビキ"]) {
  assert.ok(!seedRow.includes(`'${removedValue}'`), `${removedValue} must not remain in the seed row`);
}

const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");
assert.match(migrationSql, /insert into public\.fishing_spots/i);
assert.match(migrationSql, /on conflict \(id\) do update set/i);
assert.ok(!/\bdelete\b|\bdrop\b|\btruncate\b|\bgrant\b/i.test(migrationSql));
for (const value of [
  expected.id,
  expected.name,
  expected.areaName,
  expected.spotType,
  expected.shoreAccess,
  expected.coordinatePrecision,
  ...expected.targetSpecies,
  ...expected.notes,
]) {
  assertSqlValue(migrationSql, value, `migration value ${value}`);
}
assert.ok(
  migrationSql.includes("array[]::text[]"),
  "migration recommended_methods must be an empty text array",
);

const mapperSource = fs.readFileSync(MAPPER_PATH, "utf8");
assert.ok(
  mapperSource.includes("recommendedMethods") &&
    mapperSource.includes("notes: stringArray(row.notes)") &&
    mapperSource.includes('"不明"'),
  "mapFishingSpotRow must preserve empty methods, notes and the unknown access value",
);

const uiSource = fs.readFileSync(UI_PATH, "utf8");
assert.ok(
  uiSource.includes("selectedSpot.notes") &&
    uiSource.includes("地点の注意事項") &&
    uiSource.includes("spotNote"),
  "EnvironmentPanel must render selected fishing spot notes",
);

console.log("OK Karatsu East Port production curation, static master, SQL and UI are synchronized");
