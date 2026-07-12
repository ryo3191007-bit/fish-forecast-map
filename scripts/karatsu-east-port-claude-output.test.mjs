import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawOutputPath = path.join(
  ROOT,
  "data/research/fishing-spots/ai-outputs/karatsu-east-port.claude.raw.json",
);
const rawOutput = JSON.parse(fs.readFileSync(rawOutputPath, "utf8"));

assert.equal(rawOutput.schemaVersion, "1.0.0");
assert.equal(rawOutput.spotId, "karatsu-east-port");
assert.equal(rawOutput.identity.spotName, "唐津東港");
assert.deepEqual(rawOutput.attributes.spotType.value, ["port"]);
assert.equal(rawOutput.attributes.openSeaExposure.value, "bay");
assert.equal(rawOutput.identity.coordinates.status, "inferred");
assert.equal(rawOutput.identity.coordinates.confidence, "low");
assert.equal(rawOutput.fishSpecies.length, 6);
assert.equal(
  rawOutput.fishSpecies.filter((species) => species.confidence === "medium").length,
  4,
);
assert.equal(
  rawOutput.fishSpecies.filter((species) => species.confidence === "low").length,
  2,
);
assert.equal(rawOutput.restrictions.fishingProhibited.value, "partial");
assert.equal(rawOutput.restrictions.fishingProhibited.confidence, "low");
assert.equal(rawOutput.sources.length, 12);
assert.equal(rawOutput.reviewStatus, "draft");

// Claude raw output is retained as a schemaVersion 1.0.0 comparison record and is not migrated to schema 1.1.0 in Issue #125.

console.log("Karatsu East Port Claude raw output checks passed.");
