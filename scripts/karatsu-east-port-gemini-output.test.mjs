import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validatorPath = path.join(ROOT, "scripts/fishing-spot-research-schema.test.mjs");
const rawOutputPath = path.join(
  ROOT,
  "data/research/fishing-spots/ai-outputs/karatsu-east-port.gemini.raw.json",
);
const temporaryValidatorPath = path.join(
  ROOT,
  "scripts",
  `.karatsu-east-port-gemini-validator-${process.pid}.mjs`,
);

const rawOutput = JSON.parse(fs.readFileSync(rawOutputPath, "utf8"));
assert.equal(rawOutput.spotName.value, "唐津東港");
assert.equal(rawOutput.openSeaExposure.value, "bay");
assert.deepEqual(rawOutput.fishSpecies, []);
assert.equal(rawOutput.latitude.status, "inferred");
assert.deepEqual(
  rawOutput.latitude.sourceIds,
  [],
  "Gemini原文では推定座標にsourceIdsが付いていない状態を保持する",
);

const validatorSource = fs.readFileSync(validatorPath, "utf8");
const originalExampleLine =
  'const examplePath = path.join(ROOT, "docs/examples/fishing-spot-research.example.json");';
const rawOutputLine =
  'const examplePath = path.join(ROOT, "data/research/fishing-spots/ai-outputs/karatsu-east-port.gemini.raw.json");';
const originalValidationLine =
  'assert.deepEqual(validateRecord(example), [], "example must satisfy schema and source references");';
const mutationTestsMarker = "if (example.schemaVersion === \"1.1.0\") {";

assert.ok(validatorSource.includes(originalExampleLine));
assert.ok(validatorSource.includes(originalValidationLine));
assert.ok(validatorSource.includes(mutationTestsMarker));

const beforeMutationTests = validatorSource.slice(
  0,
  validatorSource.indexOf(mutationTestsMarker),
);
const geminiValidation = `const geminiErrors = validateRecord(example);
assert.ok(geminiErrors.length > 0, "Gemini raw output must remain schema-invalid until explicitly transformed");
assert.ok(geminiErrors.length > 0, "Gemini raw output must report schema errors");
assert.ok(geminiErrors.some((error) => error.includes("required property 'publisher'") || error.includes("required property publisher")));
assert.ok(geminiErrors.some((error) => error.includes("required property 'sourceType'") || error.includes("required property sourceType")));
assert.ok(geminiErrors.some((error) => error.includes("required property 'checkedAt'") || error.includes("required property checkedAt")));
assert.ok(geminiErrors.some((error) => error.includes("must match pattern") || error.includes("does not match ^src-")));
assert.ok(geminiErrors.some((error) => error.includes("must NOT have additional properties") || error.includes("additional property spotName")));
console.log(\`Gemini raw output schema errors: \${geminiErrors.length}\`);`;

const patchedValidatorSource = beforeMutationTests
  .replace(originalExampleLine, rawOutputLine)
  .replace(originalValidationLine, geminiValidation);

fs.writeFileSync(temporaryValidatorPath, patchedValidatorSource, "utf8");

try {
  const result = spawnSync(process.execPath, [temporaryValidatorPath], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `Gemini output validation assertions failed:\n${result.stdout}\n${result.stderr}`,
  );
  process.stdout.write(result.stdout);
} finally {
  fs.rmSync(temporaryValidatorPath, { force: true });
}

console.log("Karatsu East Port Gemini raw output checks passed.");
