import assert from "node:assert/strict";
import { createStaticFishSpecies, fishSpeciesDefinitions, fishSpeciesIds, fishSpeciesNames } from "@/domain/fishing";
import { filterByFishSpecies, resolveFishSpeciesName, staticFishSpeciesAliases } from "@/lib/fishSpeciesResolver";

const species = createStaticFishSpecies();
assert.equal(new Set(fishSpeciesIds).size, fishSpeciesIds.length);
assert.equal(new Set(fishSpeciesNames).size, fishSpeciesNames.length);
assert.equal(species.length, fishSpeciesDefinitions.length);
for (const aggregate of ["aomono", "rockfish"]) assert.equal(species.find((item) => item.id === aggregate)?.isSelectable, false);
for (const aggregate of ["aji", "saba", "iwashi", "mebaru"]) {
  assert.equal(species.find((item) => item.id === aggregate)?.entityType, "species_group");
  assert.equal(species.find((item) => item.id === aggregate)?.isSelectable, true);
}
const hatas = species.filter((item) => item.uiSubgroup === "ハタ類");
assert.deepEqual(hatas.map((item) => item.id), ["kijihata", "oomonhata", "akahata", "mahata", "aohata", "kue"]);
assert.ok(hatas.every((item) => item.parentGroupId === "rockfish" && item.isSelectable));
assert.equal(species.find((item) => item.id === "madako")?.category, "cephalopod");
const records = [{ species: "ブリ" }, { species: "青物" }, { species: "カサゴ" }];
assert.deepEqual(filterByFishSpecies(records, "青物", (item) => item.species, species, staticFishSpeciesAliases), records.slice(0, 2));
assert.deepEqual(filterByFishSpecies(records, "根魚", (item) => item.species, species, staticFishSpeciesAliases), records.slice(2));
const splitRecords = [{ species: "アジ" }, { species: "マアジ" }, { species: "マルアジ" }, { species: "メバル" }, { species: "アカメバル" }];
assert.deepEqual(filterByFishSpecies(splitRecords, "アジ", (item) => item.species, species, staticFishSpeciesAliases), splitRecords.slice(0, 3));
assert.deepEqual(filterByFishSpecies(splitRecords, "根魚", (item) => item.species, species, staticFishSpeciesAliases), splitRecords.slice(3), "nested group filtering includes descendants");
for (const [, name] of fishSpeciesDefinitions) assert.equal(resolveFishSpeciesName(name, species, staticFishSpeciesAliases).status, "resolved");
for (const forbidden of ["ハタ", "ササイカ", "未登録魚"]) assert.equal(resolveFishSpeciesName(forbidden, species, staticFishSpeciesAliases).status, "unresolved");
console.log("fish species group tests passed");
