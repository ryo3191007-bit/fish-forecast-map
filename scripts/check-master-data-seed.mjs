import fs from "node:fs";
import vm from "node:vm";

const SPECIES_ID_BY_NAME = new Map([
  ["アジ", "aji"],
  ["サバ", "saba"],
  ["イワシ", "iwashi"],
  ["青物", "aomono"],
  ["シイラ", "shiira"],
  ["ヒラメ", "hirame"],
  ["マゴチ", "magochi"],
  ["シーバス", "seabass"],
  ["アオリイカ", "aoriika"],
  ["ヤリイカ", "yariika"],
  ["コウイカ", "kouika"],
  ["チヌ", "chinu"],
  ["真鯛", "madai"],
  ["キス", "kisu"],
  ["根魚", "rockfish"],
]);

function loadExportedConst(filePath, constName) {
  const source = fs.readFileSync(filePath, "utf8").replace(/^import[^;]+;\n/gm, "").replace(/ as const/g, "");
  const reviewedAt = source.match(/const REVIEWED_AT = .*?;\n/)?.[0] ?? "";
  const match = source.match(new RegExp(`export const ${constName}(?:[^=]*) = ([\\s\\S]*?);`));
  if (!match) throw new Error(`Could not find ${constName} in ${filePath}`);
  const code = `${reviewedAt}const ${constName} = ${match[1]};\nJSON.stringify(${constName})`;
  return JSON.parse(vm.runInNewContext(code, {}));
}

function parseSeedRows(sql, tableName, conflictColumn) {
  const regex = new RegExp(`insert into public\\.${tableName}[\\s\\S]*?values\\n([\\s\\S]*?)\\non conflict \\(${conflictColumn}\\)`, "m");
  const block = sql.match(regex)?.[1];
  if (!block) throw new Error(`Could not find seed block for ${tableName}`);
  return [...block.matchAll(/^\s*\('((?:''|[^'])*)',\s*'((?:''|[^'])*)'/gm)].map((match) => ({
    id: match[1].replaceAll("''", "'"),
    label: match[2].replaceAll("''", "'"),
  }));
}

function compareSet(label, expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((id) => !actualSet.has(id));
  const extra = actual.filter((id) => !expectedSet.has(id));
  if (missing.length || extra.length) {
    throw new Error(`${label} mismatch\nmissing: ${missing.join(", ") || "none"}\nextra: ${extra.join(", ") || "none"}`);
  }
  console.log(`OK ${label}: ${expected.length} entries`);
}

const fishSpeciesNames = loadExportedConst("src/domain/fishing.ts", "fishSpeciesNames");
const fishingSpots = loadExportedConst("src/data/fishingSpots.ts", "fishingSpots");
const externalSources = loadExportedConst("src/data/externalSources.ts", "externalSources");
const seedSql = fs.readFileSync("supabase/sql/003_master_data_seed.sql", "utf8");

const speciesRows = parseSeedRows(seedSql, "fish_species", "id");
const spotRows = parseSeedRows(seedSql, "fishing_spots", "id");
const sourceRows = parseSeedRows(seedSql, "source_registry", "source_id");

compareSet("fish_species ids", fishSpeciesNames.map((name) => SPECIES_ID_BY_NAME.get(name)), speciesRows.map((row) => row.id));
compareSet("fish_species names", fishSpeciesNames, speciesRows.map((row) => row.label));
compareSet("fishing_spots ids", fishingSpots.map((spot) => spot.id), spotRows.map((row) => row.id));
compareSet("source_registry source_ids", externalSources.map((source) => source.sourceId), sourceRows.map((row) => row.id));
