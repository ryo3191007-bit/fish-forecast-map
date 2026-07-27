import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const targetIds = [
  "saba", "masaba", "gomasaba",
  "iwashi", "maiwashi", "katakuchiiwashi", "urumeiwashi",
  "aomono", "buri", "hiramasa", "kanpachi", "sawara", "shiira",
];

for (const id of targetIds) {
  const file = path.join(root, `data/research/fish-species/${id}.json`);
  assert(fs.existsSync(file), `${id}: Issue #308 research file is required`);
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  assert(["1.3.0", "1.4.0"].includes(doc.schemaVersion), `${id}: Issue #308 research must remain on v1.3 or migrate to ecology v2`);
  assert.equal(doc.speciesId, id);
  assert.equal(doc.review.comparisonWithCurrentImplementation.scoreV2Status, "unsupported");
  for (const key of ["seasonality", "waterTemperature", "depthRange", "substrateHabitat", "salinityAndWaterBody", "dayNightTiming", "fishingMethods", "spawningOrConfusableInfo"]) {
    assert(key in doc.ecology.stableGeneral, `${id}: stableGeneral.${key} required`);
    assert(key in doc.ecology.regionalCatchability, `${id}: regionalCatchability.${key} required`);
  }
  assert(
    Object.values(doc.ecology.regionalCatchability).every((claim) => claim.status === "unknown" && claim.value === null),
    `${id}: Issue #308 must not invent target-area catchability values`,
  );
}

for (const id of ["saba", "iwashi", "aomono"]) {
  const doc = JSON.parse(fs.readFileSync(path.join(root, `data/research/fish-species/${id}.json`), "utf8"));
  assert.equal(doc.identity.entityType, "species_group");
  assert.equal(doc.identity.canonicalNameJa.value, null);
  assert.equal(doc.identity.scientificName.value, null);
  assert(!doc.review.productionAdoption.acceptedPaths.some((decisionPath) => decisionPath.startsWith("/ecology/")));
}

const expectedMembers = {
  saba: ["masaba", "gomasaba"],
  iwashi: ["maiwashi", "katakuchiiwashi", "urumeiwashi"],
  aomono: ["buri", "hiramasa", "kanpachi", "sawara"],
};
for (const [id, members] of Object.entries(expectedMembers)) {
  const doc = JSON.parse(fs.readFileSync(path.join(root, `data/research/fish-species/${id}.json`), "utf8"));
  assert.deepEqual(doc.identity.memberSpeciesIds, members);
}

// akakamasu / yamatokamasu were reactivated as non-selectable exact species in Issue #333
// and are valid ecology-v2 research targets. Only the old yariika compatibility entry remains inactive.
const legacyInactive = ["yariika"];
for (const id of legacyInactive) {
  assert.equal(fs.existsSync(path.join(root, `data/research/fish-species/${id}.json`)), false, `${id}: inactive/legacy species must not be added`);
}

const production = fs.readFileSync(path.join(root, "src/domain/scoreV2Production.ts"), "utf8");
assert.match(production, /SCORE_V2_SUPPORTED_SPECIES/);
assert.doesNotMatch(production, /"マサバ"|"ゴマサバ"|"マイワシ"|"カタクチイワシ"|"ウルメイワシ"|"ブリ"|"ヒラマサ"|"カンパチ"|"サワラ"|"シイラ"/, "Issue #308 must not add new SCORE v2 species constants");

console.log("Issue #308 fish ecology A checks passed");
