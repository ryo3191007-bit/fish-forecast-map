import assert from "node:assert/strict";
import type { ExternalCatchRecord } from "@/domain/externalCatch";
import type { FishingSpotDetailSet } from "@/domain/fishingSpotDetail";
import { buildScoreV2SpeciesInput } from "@/domain/scoreV2Production";
import { filterByFishSpecies, resolveFishSpeciesName, staticFishSpecies, staticFishSpeciesAliases } from "@/lib/fishSpeciesResolver";
import { mapSuccessfulFishSpeciesAliasRows } from "@/lib/masterDataRepository";

const resolve = (name: string, aliases = staticFishSpeciesAliases) => resolveFishSpeciesName(name, staticFishSpecies, aliases);
const batch1Aliases = new Map([
  ["ミズイカ", "aoriika"], ["モイカ", "aoriika"], ["シロギス", "kisu"], ["キスゴ", "kisu"], ["スズキ", "seabass"],
] as const);
const batch2Aliases = new Map([
  ["アラカブ", "kasago"], ["ガシラ", "kasago"], ["イッサキ", "isaki"], ["アコウ", "kijihata"], ["オグシ", "oniokoze"],
  ["マチャ", "madai"], ["チャンイオ", "madai"], ["ヤズ", "buri"], ["ハマチ", "buri"], ["サゴシ", "sawara"],
] as const);
const regionalAliases = new Map([
  ["スズキ", "seabass"], ["シーバス", "seabass"], ["セイゴ", "seabass"], ["フッコ", "seabass"],
  ["ヤリイカ", "kensakiika"], ["ケンサキイカ", "kensakiika"], ["アカイカ", "kensakiika"], ["ササイカ", "kensakiika"],
  ["ヒラス", "hiramasa"], ["ネリゴ", "kanpachi"], ["クロ", "mejina"], ["メイタ", "chinu"],
  ["コハダ", "konoshiro"], ["ツナシ", "konoshiro"], ["イナ", "bora"], ["アラ", "kue"],
  ["オオクチ", "hirame"], ["豆アジ", "maaji"], ["ゼンゴ", "maaji"], ["ワカナ", "buri"],
  ["ホンダイ", "madai"], ["ジャミ", "madai"], ["タテコ", "madai"],
  ["ハゲ", "kawahagi"], ["ハギ", "kawahagi"],
  ["カマス", "kamasu"], ["アカカマス", "kamasu"], ["ヤマトカマス", "kamasu"],
  ["モンゴウイカ", "kouika"], ["カミナリイカ", "kouika"], ["コウイカ", "kouika"],
] as const);

for (const [name, speciesId] of batch1Aliases) {
  const result = resolve(name);
  assert.equal(result.status, "resolved");
  if (result.status === "resolved") assert.equal(result.speciesId, speciesId);
}
for (const [name, speciesId] of batch2Aliases) {
  const result = resolve(name);
  assert.equal(result.status, "resolved");
  if (result.status === "resolved") assert.equal(result.speciesId, speciesId);
}
for (const [name, speciesId] of regionalAliases) {
  const result = resolve(name);
  assert.equal(result.status, "resolved");
  if (result.status === "resolved") assert.equal(result.speciesId, speciesId);
}
for (const name of ["ハネ", "ヤズコ", "ワラサ", "シリヤケイカ"]) {
  assert.equal(resolve(name).status, "unresolved", `${name} remains intentionally unregistered`);
}
for (const [name, speciesId] of [["マアジ", "maaji"], ["マサバ", "masaba"], ["マイワシ", "maiwashi"], ["メバル", "mebaru"]] as const) {
  const result = resolve(name);
  assert.equal(result.status, "resolved");
  if (result.status === "resolved") assert.equal(result.speciesId, speciesId);
}
for (const name of ["チヌ", "黒鯛", "クロダイ"]) {
  const result = resolve(name);
  assert.equal(result.status, "resolved");
  if (result.status === "resolved") assert.equal(result.speciesId, "chinu");
}
assert.equal(resolve("未登録魚").status, "unresolved");
assert.equal(resolve("").status, "unresolved");
assert.equal(resolve("   ").status, "unresolved");
const asciiAlias = [...staticFishSpeciesAliases, { ...staticFishSpeciesAliases[0], id: "ascii", aliasName: "aji", matchKey: "aji" }];
assert.equal(resolve("  ＡＪＩ  ", asciiAlias).status, "resolved");

for (const approvalStatus of ["pending", "rejected"] as const) {
  assert.equal(resolve("黒鯛", staticFishSpeciesAliases.map((alias) => alias.aliasName === "黒鯛" ? { ...alias, approvalStatus } : alias)).status, "unresolved");
}
assert.equal(resolve("黒鯛", staticFishSpeciesAliases.map((alias) => alias.aliasName === "黒鯛" ? { ...alias, isActive: false } : alias)).status, "unresolved");
const conflictAliases = [...staticFishSpeciesAliases, { ...staticFishSpeciesAliases[0], id: "conflict", aliasName: "黒鯛", matchKey: "黒鯛", fishSpeciesId: "aji" as const }];
assert.equal(resolve("黒鯛", conflictAliases).status, "conflict");

const list = [{ species: "黒鯛" }, { species: "チヌ" }, { species: "アジ" }, { species: "未登録魚" }];
assert.deepEqual(filterByFishSpecies(list, "クロダイ", (item) => item.species, staticFishSpecies, staticFishSpeciesAliases), list.slice(0, 2));
assert.deepEqual(filterByFishSpecies(list, "アジ", (item) => item.species, staticFishSpecies, staticFishSpeciesAliases), [list[2]]);

for (const [aliasName, speciesId] of batch1Aliases) {
  const canonicalName = staticFishSpecies.find((species) => species.id === speciesId)?.nameJa;
  assert.ok(canonicalName);
  const aliasList = [{ species: aliasName }, { species: canonicalName }, { species: "未登録魚" }];
  assert.deepEqual(filterByFishSpecies(aliasList, canonicalName, (item) => item.species, staticFishSpecies, staticFishSpeciesAliases), aliasList.slice(0, 2), `${aliasName} is included in canonical search and aggregation`);
}
for (const [aliasName, speciesId] of batch2Aliases) {
  const canonicalName = staticFishSpecies.find((species) => species.id === speciesId)?.nameJa;
  assert.ok(canonicalName);
  const aliasList = [{ species: aliasName }, { species: canonicalName }, { species: "未登録魚" }];
  assert.deepEqual(filterByFishSpecies(aliasList, canonicalName, (item) => item.species, staticFishSpecies, staticFishSpeciesAliases), aliasList.slice(0, 2), `${aliasName} is included in canonical search and aggregation`);
}

const memo = {
  id: "alias-memo", species: "黒鯛", caughtDate: new Date().toISOString().slice(0, 10), areaName: "テストエリア",
  spotId: "test-spot", coordinatePrecision: "approximate" as const, method: "コマセ" as const, sourceId: "manual",
  sourceName: "manual", sourceUrl: "https://example.test/alias", acquisitionMethod: "manual" as const, confidence: "high" as const,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};
const catchRecord: ExternalCatchRecord = { ...memo, species: "クロダイ", catchItems: [{ species: "クロダイ" }] };
const spot = { id: "test-spot", name: "テスト地点", areaName: "テストエリア", latitude: 0, longitude: 0, spotType: "漁港" as const, shoreAccess: "足場良い" as const, targetSpecies: ["チヌ" as const], recommendedMethods: ["コマセ" as const], notes: [], coordinatePrecision: "approximate" as const };
const aliasScore = buildScoreV2SpeciesInput({ species: "チヌ", spot, catches: [catchRecord], selectedDateTime: new Date().toISOString() });
assert.ok(aliasScore.spotEvidence?.catchHistory, "SCORE v2 uses alias catch history");
const canonicalScore = buildScoreV2SpeciesInput({ species: "チヌ", spot, catches: [{ ...catchRecord, species: "チヌ" }], selectedDateTime: new Date().toISOString() });
assert.ok(canonicalScore.spotEvidence?.catchHistory, "canonical SCORE v2 behavior is preserved");
const unresolvedScore = buildScoreV2SpeciesInput({ species: "チヌ", spot, catches: [{ ...catchRecord, species: "未登録魚" }], selectedDateTime: new Date().toISOString() });
assert.equal(unresolvedScore.spotEvidence?.catchHistory, null);

const directSpeciesDetails = (candidate: string) => ({
  itemDefinitions: [],
  values: [{
    id: `target-${candidate}`, spotId: spot.id, itemKey: "target_species", informationState: "has_evidence",
    valueText: null, valueTextList: [candidate], valueNumber: null, valueBoolean: null, valueJson: null, unit: null,
    confidence: "high", contributionOrigin: "curated_research", contributorId: null, submittedAt: null,
    moderationStatus: "not_required", reviewStatus: "reviewed", adoptionStatus: "adopted", note: null,
    checkedAt: "2026-07-20", sources: [{
      source: { id: "direct-species-test", sourceType: "official", sourceName: "test", sourceUrl: "https://example.test/direct", checkedOn: "2026-07-20", note: null },
      relation: "supporting", note: null,
    }],
  }],
}) as FishingSpotDetailSet;

for (const candidate of ["黒鯛", "クロダイ", "チヌ"]) {
  const directScore = buildScoreV2SpeciesInput({ species: "チヌ", spot, details: directSpeciesDetails(candidate), selectedDateTime: new Date().toISOString() });
  assert.ok(directScore.spotEvidence?.directSpecies, `SCORE v2 direct species resolves ${candidate} to chinu`);
}
const unresolvedDirectScore = buildScoreV2SpeciesInput({ species: "チヌ", spot, details: directSpeciesDetails("未登録魚"), selectedDateTime: new Date().toISOString() });
assert.equal(unresolvedDirectScore.spotEvidence?.directSpecies, null, "unresolved direct species fails closed");
const conflictedDirectScore = buildScoreV2SpeciesInput({
  species: "チヌ", spot, details: directSpeciesDetails("黒鯛"), selectedDateTime: new Date().toISOString(), fishSpeciesAliases: conflictAliases,
});
assert.equal(conflictedDirectScore.spotEvidence?.directSpecies, null, "conflicted direct species fails closed");

assert.deepEqual(mapSuccessfulFishSpeciesAliasRows([]), [], "a successful empty DB response remains empty and cannot reactivate static aliases");

console.log("OK executable fish species resolver and integrations");
