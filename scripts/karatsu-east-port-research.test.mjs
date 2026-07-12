import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validatorPath = path.join(ROOT, "scripts/fishing-spot-research-schema.test.mjs");
const temporaryValidatorPath = path.join(
  ROOT,
  "scripts",
  `.karatsu-east-port-research-validator-${process.pid}.mjs`,
);

const originalExampleLine =
  'const examplePath = path.join(ROOT, "docs/examples/fishing-spot-research.example.json");';
const pilotExampleLine =
  'const examplePath = path.join(ROOT, "data/research/fishing-spots/karatsu-east-port.json");';

const validatorSource = fs.readFileSync(validatorPath, "utf8");
assert.ok(
  validatorSource.includes(originalExampleLine),
  "schema validator example path must remain replaceable for pilot validation",
);

const pilotValidatorSource = validatorSource.replace(originalExampleLine, pilotExampleLine);
fs.writeFileSync(temporaryValidatorPath, pilotValidatorSource, "utf8");

try {
  execFileSync(process.execPath, [temporaryValidatorPath], {
    cwd: ROOT,
    stdio: "inherit",
  });
} finally {
  fs.rmSync(temporaryValidatorPath, { force: true });
}

console.log("Karatsu East Port pilot research checks passed.");
