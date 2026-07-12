import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pilotPath = path.join(ROOT, "data/research/fishing-spots/karatsu-east-port.json");

const pilot = JSON.parse(fs.readFileSync(pilotPath, "utf8"));

assert.equal(
  pilot.schemaVersion,
  "1.0.0",
  "existing Karatsu East Port record intentionally remains on schema 1.0.0 for compatibility",
);

assert.equal(pilot.sources.length, 7, "pilot must retain five official/public and two secondary sources");
assert.equal(
  pilot.sources.filter((source) => ["private_reference", "personal_blog"].includes(source.sourceType)).length,
  2,
  "secondary research must remain limited to the two reviewed sources",
);

assert.deepEqual(pilot.attributes.seabed.value, ["sand", "mud"]);
assert.equal(pilot.attributes.seabed.status, "inferred");
assert.equal(pilot.attributes.seabed.confidence, "low");
assert.equal(pilot.attributes.waterDepth.value, "moderate");
assert.equal(pilot.attributes.waterDepth.status, "inferred");
assert.equal(pilot.attributes.waterDepth.confidence, "low");
assert.equal(pilot.attributes.riverInfluence.value, "weak");
assert.equal(pilot.attributes.riverInfluence.status, "inferred");
assert.equal(pilot.attributes.riverInfluence.confidence, "low");
assert.deepEqual(pilot.attributes.fishingRange.value, ["foot", "near"]);
assert.equal(pilot.attributes.fishingRange.status, "inferred");
assert.equal(pilot.attributes.fishingRange.confidence, "low");

assert.equal(pilot.restrictions.fishingProhibited.value, "partial");
assert.equal(pilot.restrictions.fishingProhibited.status, "confirmed");
assert.equal(pilot.restrictions.fishingProhibited.confidence, "low");

const observedFish = new Map(pilot.fishSpecies.map((fish) => [fish.name, fish]));
assert.deepEqual(
  [...observedFish.keys()],
  ["アジ", "コノシロ", "スズキ", "クロダイ", "キビレ", "シログチ"],
  "only independently corroborated or date-specific fish observations may be stored",
);
for (const fishName of ["アジ", "コノシロ", "スズキ", "クロダイ"]) {
  assert.equal(observedFish.get(fishName)?.confidence, "medium");
}
for (const fishName of ["キビレ", "シログチ"]) {
  assert.equal(observedFish.get(fishName)?.confidence, "low");
}

for (const attributeName of ["tidalFlow", "streetLights", "obstacles"]) {
  assert.equal(pilot.attributes[attributeName].status, "unknown");
  assert.equal(pilot.attributes[attributeName].confidence, "low");
}
for (const facilityName of ["parking", "toilet"]) {
  assert.equal(pilot.facilities[facilityName].status, "unknown");
}
for (const restrictionName of ["entryProhibited", "constructionOrClosure"]) {
  assert.equal(pilot.restrictions[restrictionName].status, "unknown");
}

console.log("Karatsu East Port pilot research checks passed.");
