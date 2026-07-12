import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validatorPath = path.join(ROOT, "scripts/fishing-spot-research-schema.test.mjs");
const rawOutputPath = path.join(
  ROOT,
  "data/research/fishing-spots/ai-outputs/karatsu-east-port.claude.raw.json",
);
const temporaryValidatorPath = path.join(
  ROOT,
  "scripts",
  `.karatsu-east-port-claude-validator-${process.pid}.mjs`,
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

const validatorSource = fs.readFileSync(validatorPath, "utf8");
const originalExampleLine =
  'const examplePath = path.join(ROOT, "docs/examples/fishing-spot-research.example.json");';
const rawOutputLine =
  'const examplePath = path.join(ROOT, "data/research/fishing-spots/ai-outputs/karatsu-east-port.claude.raw.json");';

assert.ok(validatorSource.includes(originalExampleLine));

const patchedValidatorSource = validatorSource.replace(originalExampleLine, rawOutputLine);
fs.writeFileSync(temporaryValidatorPath, patchedValidatorSource, "utf8");

try {
  const result = spawnSync(process.execPath, [temporaryValidatorPath], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `Claude output schema validation failed:\n${result.stdout}\n${result.stderr}`,
  );
  process.stdout.write(result.stdout);
} finally {
  fs.rmSync(temporaryValidatorPath, { force: true });
}

console.log("Karatsu East Port Claude raw output checks passed.");
