import assert from "node:assert/strict";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import { formatTerrainDetailForPresentation, scopeSpotDetails } from "../src/domain/spotEvaluationPresentation";
import { buildStaticFishingSpotDetailsFromSpots, staticFishingSpotDetailItemDefinitions } from "../src/lib/fishingSpotDetailFallback";
import { mapFishingSpotDetailRows } from "../src/lib/fishingSpotDetailMapper";

const details = buildStaticFishingSpotDetailsFromSpots(fishingSpots);
assert.equal(fishingSpots.length, 28);
for (const spot of fishingSpots) {
  const scoped = scopeSpotDetails(details, spot.id);
  const terrain = formatTerrainDetailForPresentation(scoped, "coastal_topography")?.text ?? "";
  const structure = formatTerrainDetailForPresentation(scoped, "spot_features")?.text ?? "";
  assert.doesNotMatch(terrain, /漁港|港湾|堤防|波止|岸壁|護岸|テトラ|橋/);
  assert.doesNotMatch(structure, /漁港|第\d種漁港/);
  assert.ok(!(structure.includes("波止") && structure.includes("堤防")));
}

const karatsuIds = ["ouka-port", "kodomo-port", "kabeshima-port", "hado-port", "haregi-port", "tobo-port", "minatohama-port", "nagoya-port", "yobuko-port", "takakushi-port"];
for (const id of karatsuIds) {
  const scoped = scopeSpotDetails(details, id);
  const presentation = formatTerrainDetailForPresentation(scoped, "spot_features") ?? formatTerrainDetailForPresentation(scoped, "coastal_topography");
  assert.ok(presentation, `${id} needs a short structure presentation`);
  assert.ok(presentation.text.length <= 12, `${id} presentation must be a short phrase`);
  assert.doesNotMatch(presentation.text, /文脈|民間情報|公式|内港|外向き|地区|港域/);
}
assert.equal(formatTerrainDetailForPresentation(scopeSpotDetails(details, "kodomo-port"), "coastal_topography")?.text, "砂浜");
assert.equal(formatTerrainDetailForPresentation(scopeSpotDetails(details, "tobo-port"), "coastal_topography")?.text, "河口");

const curation = JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-205-detail-curation.json", "utf8"));
for (const spot of curation.spots) {
  for (const original of spot.values) {
    const fallback = details.values.find((value) => value.id === original.id);
    assert.ok(fallback);
    assert.equal(fallback.informationState, original.informationState);
    assert.equal(fallback.confidence, original.confidence);
    assert.equal(fallback.note, original.note);
    assert.equal(fallback.sources.length, Object.values(original.sources).flat().length);
  }
}

const mapped = mapFishingSpotDetailRows(
  [{ item_key: "spot_features", category: "terrain", value_kind: "text_list", label_ja: "釣り場の構造・足場" }],
  [{ id: "value", spot_id: "spot", item_key: "spot_features", information_state: "weak_evidence", value_text_list: ["波止"], confidence: "low", contribution_origin: "curated_research", moderation_status: "not_required", review_status: "reviewed", adoption_status: "adopted", note: "内部note", fishing_spot_detail_value_sources: [{ relation: "supporting", note: "relation note", fishing_spot_detail_sources: { id: "source", source_type: "official", source_name: "source", source_url: "https://example.com", note: "source note" } }] }],
);
assert.equal(mapped.values[0]?.note, "内部note");
assert.equal(mapped.values[0]?.sources[0]?.note, "relation note");
assert.equal(mapped.values[0]?.sources[0]?.source.sourceUrl, "https://example.com");
assert.equal(mapped.values[0]?.sources[0]?.source.note, "source note");

const definition = staticFishingSpotDetailItemDefinitions.find(({ itemKey }) => itemKey === "spot_features");
assert.equal(definition?.labelJa, "釣り場の構造・足場");
const migration = fs.readFileSync("supabase/migrations/20260722180000_refine_terrain_structure_presentation.sql", "utf8");
assert.ok(migration.includes("label_ja = '釣り場の構造・足場'"));
assert.ok(migration.includes("where item_key = 'spot_features'"));
assert.doesNotMatch(migration, /update public\.fishing_spot_detail_values|delete from|drop /i);

console.log("Issue #237 terrain and structure presentation checks passed.");
