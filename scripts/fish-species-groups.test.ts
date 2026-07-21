import assert from "node:assert/strict";
import { createStaticFishSpecies, fishSpeciesDefinitions, fishSpeciesIds, fishSpeciesNames } from "@/domain/fishing";
import { filterByFishSpecies, resolveFishSpeciesName, staticFishSpeciesAliases } from "@/lib/fishSpeciesResolver";
import { groupSelectableFishSpecies } from "@/lib/fishSpeciesUiGroups";

const species = createStaticFishSpecies();
assert.equal(new Set(fishSpeciesIds).size, fishSpeciesIds.length);
assert.equal(new Set(fishSpeciesNames).size, fishSpeciesNames.length);
assert.equal(species.length, fishSpeciesDefinitions.length);
for (const aggregate of ["aomono", "rockfish"]) assert.equal(species.find((item) => item.id === aggregate)?.isSelectable, false);
for (const aggregate of ["aji", "saba", "iwashi", "mebaru", "kamasu"]) {
  assert.equal(species.find((item) => item.id === aggregate)?.entityType, "species_group");
  assert.equal(species.find((item) => item.id === aggregate)?.isSelectable, true);
}
const hatas = species.filter((item) => item.uiSubgroup === "ハタ類");
assert.deepEqual(hatas.map((item) => item.id), ["kijihata", "oomonhata", "akahata", "mahata", "aohata", "kue"]);
assert.ok(hatas.every((item) => item.parentGroupId === "rockfish" && item.isSelectable));
assert.equal(species.find((item) => item.id === "madako")?.category, "cephalopod");
assert.deepEqual(species.find((item) => item.id === "yariika"), {
  ...species.find((item) => item.id === "yariika"), isSelectable: false, isActive: false,
}, "the legacy yariika ID remains in static data but cannot be selected");
for (const legacyId of ["akakamasu", "yamatokamasu"] as const) {
  const legacy = species.find((item) => item.id === legacyId);
  assert.equal(legacy?.parentGroupId, "kamasu");
  assert.equal(legacy?.isSelectable, false);
  assert.equal(legacy?.isActive, false);
}
const selectableIds = species.filter((item) => item.isSelectable).map((item) => item.id).sort();
for (const includeLegacyAggregates of [false, true]) {
  const groupedIds = groupSelectableFishSpecies(species, { includeLegacyAggregates }).flatMap((group) => group.items.map((item) => item.id));
  const groupedSelectableIds = groupedIds.filter((id) => species.find((item) => item.id === id)?.isSelectable).sort();
  assert.deepEqual(groupedSelectableIds, selectableIds, "every selectable species appears in UI groups exactly once");
  assert.equal(new Set(groupedIds).size, groupedIds.length, "UI groups do not contain duplicate species");
  assert.ok(!groupedIds.includes("yariika"), "legacy yariika never appears in normal UI groups");
  assert.ok(!groupedIds.includes("akakamasu") && !groupedIds.includes("yamatokamasu"), "legacy kamasu classifications never appear in normal UI groups");
  assert.equal(groupedIds.filter((id) => id === "kamasu").length, 1, "the selectable kamasu group appears exactly once");
  const displayedNames = groupedIds.map((id) => species.find((item) => item.id === id)?.nameJa);
  assert.equal(new Set(displayedNames).size, displayedNames.length, "selectable UI names are unique");
}
const uiGroups = groupSelectableFishSpecies(species);
for (const [label, expectedIds] of [
  ["アジ", ["maaji", "maruaji"]],
  ["サバ", ["masaba", "gomasaba"]],
  ["イワシ", ["maiwashi", "katakuchiiwashi", "urumeiwashi"]],
  ["メバル", ["akamebaru", "kuromebaru", "shiromebaru"]],
] as const) assert.deepEqual(uiGroups.find((group) => group.label === label)?.items.map((item) => item.id), expectedIds);
const records = [{ species: "ブリ" }, { species: "青物" }, { species: "カサゴ" }];
assert.deepEqual(filterByFishSpecies(records, "青物", (item) => item.species, species, staticFishSpeciesAliases), records.slice(0, 2));
assert.deepEqual(filterByFishSpecies(records, "根魚", (item) => item.species, species, staticFishSpeciesAliases), records.slice(2));
const splitRecords = [{ species: "アジ" }, { species: "マアジ" }, { species: "マルアジ" }, { species: "メバル" }, { species: "アカメバル" }];
assert.deepEqual(filterByFishSpecies(splitRecords, "アジ", (item) => item.species, species, staticFishSpeciesAliases), splitRecords.slice(0, 3));
assert.deepEqual(filterByFishSpecies(splitRecords, "根魚", (item) => item.species, species, staticFishSpeciesAliases), splitRecords.slice(3), "nested group filtering includes descendants");
for (const definition of fishSpeciesDefinitions) {
  if (definition[0] !== "yariika") assert.equal(resolveFishSpeciesName(definition[1], species, staticFishSpeciesAliases).status, "resolved");
}
for (const [name, expectedId] of [["ハゲ", "kawahagi"], ["ハギ", "kawahagi"], ["カマス", "kamasu"], ["アカカマス", "kamasu"], ["ヤマトカマス", "kamasu"], ["モンゴウイカ", "kouika"], ["カミナリイカ", "kouika"], ["コウイカ", "kouika"]] as const) {
  const resolution = resolveFishSpeciesName(name, species, staticFishSpeciesAliases);
  assert.equal(resolution.status, "resolved");
  if (resolution.status === "resolved") assert.equal(resolution.speciesId, expectedId);
}
for (const forbidden of ["ハタ", "シリヤケイカ", "ヤリイカ（旧分類）", "未登録魚"]) assert.equal(resolveFishSpeciesName(forbidden, species, staticFishSpeciesAliases).status, "unresolved");
console.log("fish species group tests passed");
