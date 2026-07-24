import assert from "node:assert/strict";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import { formatTerrainDetailForPresentation, scopeSpotDetails } from "../src/domain/spotEvaluationPresentation";
import { buildStaticFishingSpotDetailsFromSpots, staticFishingSpotDetailItemDefinitions } from "../src/lib/fishingSpotDetailFallback";
import { mapFishingSpotDetailRows } from "../src/lib/fishingSpotDetailMapper";

const curation = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-205-detail-curation.json", "utf8"));
const details = buildStaticFishingSpotDetailsFromSpots(fishingSpots);
const structureTerms = /漁港|港湾|堤防|波止|岸壁|護岸|テトラ|砂浜|海水浴場|サーフ|磯|橋|経由|経路|陸路/;
const naturalTerms = /砂泥|砂地|岩礁|岩場|藻場|かけ上がり|浅場|深場|河口|湾奥/;
const laterReresearchedIssue205Spots = new Set([
  "ouka-port",
  "tobo-port",
  "minatohama-port",
  "yobuko-port",
  "kodomo-port",
  "kabeshima-port",
  "hado-port",
  "nagoya-port",
]);

assert.equal(fishingSpots.length, 52);

// Exercise the ordinary presentation boundary for every active spot, including
// legacy unresearched/fallback data as well as the ten Issue #205 spots.
for (const spot of fishingSpots) {
  const scoped = scopeSpotDetails(details, spot.id);
  const terrain = formatTerrainDetailForPresentation(scoped, "coastal_topography");
  const structure = formatTerrainDetailForPresentation(scoped, "spot_features");
  const terrainLabels = terrain?.text.split("、") ?? [];
  const structureLabels = structure?.text.split("、") ?? [];

  for (const label of terrainLabels) {
    assert.doesNotMatch(label, structureTerms, `${spot.id} ordinary terrain UI must not expose structures or access context`);
  }
  for (const label of structureLabels) {
    assert.notEqual(label, "漁港", `${spot.id} ordinary structure UI must not repeat a standalone fishing-port type`);
    assert.notEqual(label, "第3種漁港", `${spot.id} ordinary structure UI must not repeat a standalone fishing-port class`);
  }
  assert.deepEqual(
    terrainLabels.filter((label) => structureLabels.includes(label)),
    [],
    `${spot.id} ordinary UI must not duplicate labels across classifications`,
  );
}

// Keep the Issue #205 curation source-of-truth checks in addition to the
// all-spot presentation regression above. Later regional re-research may replace
// the runtime value, so only unchanged Issue #205 spots retain exact confidence checks.
for (const spot of curation.spots) {
  const terrainValues = spot.values.filter((value: { itemKey: string }) => value.itemKey === "coastal_topography");
  const structureValues = spot.values.filter((value: { itemKey: string }) => value.itemKey === "spot_features");
  for (const value of terrainValues.flatMap((entry: { valueTextList: string[] }) => entry.valueTextList)) {
    assert.match(value, naturalTerms, `${spot.spotId} terrain must use the natural taxonomy`);
    assert.doesNotMatch(value, structureTerms, `${spot.spotId} terrain must not contain structures or access context`);
  }
  for (const value of structureValues.flatMap((entry: { valueTextList: string[] }) => entry.valueTextList)) {
    assert.match(value, /島の漁港|波止|岸壁|護岸|テトラ|砂浜|海水浴場|サーフ|磯/);
    assert.notEqual(value, "漁港", `${spot.spotId} must not duplicate its master spot type`);
    assert.notEqual(value, "第3種漁港", `${spot.spotId} must not duplicate its master spot type`);
  }

  const scoped = scopeSpotDetails(details, spot.spotId);
  const terrain = formatTerrainDetailForPresentation(scoped, "coastal_topography");
  const structure = formatTerrainDetailForPresentation(scoped, "spot_features");
  const terrainLabels = new Set(terrain?.text.split("、") ?? []);
  const structureLabels = new Set(structure?.text.split("、") ?? []);
  assert.deepEqual([...terrainLabels].filter((label) => structureLabels.has(label)), [], `${spot.spotId} must not duplicate labels`);
  if (!laterReresearchedIssue205Spots.has(spot.spotId)) {
    assert.equal(terrain?.confidence ?? null, terrainValues[0]?.confidence ?? null, `${spot.spotId} terrain confidence must come from its own item`);
    assert.equal(structure?.confidence ?? null, structureValues[0]?.confidence ?? null, `${spot.spotId} structure confidence must come from its own item`);
  }
}

const kodomo = scopeSpotDetails(details, "kodomo-port");
assert.equal(formatTerrainDetailForPresentation(kodomo, "coastal_topography")?.text, "砂地");
assert.equal(formatTerrainDetailForPresentation(kodomo, "spot_features")?.text, "砂浜、波止");
const kabeshima = scopeSpotDetails(details, "kabeshima-port");
assert.equal(formatTerrainDetailForPresentation(kabeshima, "coastal_topography"), null);
assert.equal(formatTerrainDetailForPresentation(kabeshima, "spot_features")?.text, "波止、岸壁");
assert.doesNotMatch(formatTerrainDetailForPresentation(kabeshima, "spot_features")?.text ?? "", /呼子大橋|経路|陸路/);
assert.equal(formatTerrainDetailForPresentation(scopeSpotDetails(details, "tobo-port"), "coastal_topography")?.text, "河口");

// Audit evidence remains in curation while the ordinary client DTO stays minimized.
assert.ok(curation.spots.some((spot: { sources: { sourceUrl: string; note: string }[] }) => spot.sources.some((source) => source.sourceUrl && source.note)));
assert.ok(curation.spots.some((spot: { values: { note: string }[] }) => spot.values.some((value) => value.note)));
assert.deepEqual(curation.auditEvidence.find((entry: { spotId: string }) => entry.spotId === "kabeshima-port")?.rawValueTextList, ["呼子大橋経由で陸路接続する地域文脈"]);
const mapped = mapFishingSpotDetailRows(
  [{ item_key: "spot_features", category: "terrain", value_kind: "text_list", label_ja: "釣り場の構造・足場" }],
  [{ id: "value", spot_id: "spot", item_key: "spot_features", information_state: "weak_evidence", value_text_list: ["波止"], confidence: "low", contribution_origin: "curated_research", moderation_status: "not_required", review_status: "reviewed", adoption_status: "adopted", note: "内部note", fishing_spot_detail_value_sources: [{ relation: "supporting", note: "relation note", fishing_spot_detail_sources: { id: "source", source_type: "official", source_name: "source", source_url: "https://example.com", note: "source note" } }] }],
);
assert.equal(mapped.values[0]?.note, null);
assert.equal(mapped.values[0]?.sources[0]?.note, null);
assert.equal(mapped.values[0]?.sources[0]?.source.sourceUrl, null);
assert.equal(mapped.values[0]?.sources[0]?.source.note, null);

const definition = staticFishingSpotDetailItemDefinitions.find(({ itemKey }) => itemKey === "spot_features");
assert.equal(definition?.labelJa, "釣り場の構造・足場");
assert.match(definition?.description ?? "", /単独の地点種別/);
assert.match(definition?.description ?? "", /島の漁港/);
assert.match(definition?.description ?? "", /長い経路説明は含めない/);
const migration = fs.readFileSync("supabase/migrations/20260722180000_refine_terrain_structure_presentation.sql", "utf8");
assert.ok(migration.includes("label_ja = '釣り場の構造・足場'"));
assert.match(migration, /description = '.*単独の地点種別.*島の漁港.*長い経路説明は含めない。'/);
assert.match(migration, /delete from public\.fishing_spot_detail_values[\s\S]*value_text_list && array\['漁港', '第3種漁港'\]/);
assert.match(migration, /set item_key = 'spot_features'[\s\S]*'kodomo-port', array\['砂浜', '波止'\]/);
assert.match(migration, /'kabeshima-port', array\['島の漁港'\]/);
assert.match(migration, /'coastal_topography'[\s\S]*array\['浦川河口'\]/);

console.log("Issue #237 terrain and structure presentation checks passed.");
