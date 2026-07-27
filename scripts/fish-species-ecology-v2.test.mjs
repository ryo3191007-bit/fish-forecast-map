import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const schema = readJson("docs/schemas/fish-species-ecology.v1.4.0.schema.json");
const fixture = readJson("docs/examples/fish-species-ecology.v1.4.0.example.json");
const manifest = readJson("data/research/fish-species-v2/batch-manifest.json");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const isValid = (doc) => validate(doc);
const firstClaim = (doc) => doc.ecology.stableGeneral.seasonality;
const clone = () => structuredClone(fixture);

assert.equal(isValid(fixture), true, ajv.errorsText(validate.errors));
for (const [name, mutate] of Object.entries({
  "confirmed requires complete and support": (d) => Object.assign(firstClaim(d), { status: "confirmed", value: "value", confidence: "medium", researchState: "complete", unknownReason: null }),
  "inferred cannot be high": (d) => Object.assign(firstClaim(d), { status: "inferred", value: "value", confidence: "high", researchState: "complete", unknownReason: null, evidenceSources: { supportingSourceIds: ["source"], checkedSourceIds: [], contradictingSourceIds: [] } }),
  "not_researched reason requires matching state": (d) => Object.assign(firstClaim(d), { researchState: "complete" }),
  "researched unknown requires multiple searched tiers": (d) => Object.assign(firstClaim(d), { researchState: "complete", unknownReason: "source_not_found", searchedSourceTiers: ["official_primary"] }),
  "conflicting evidence requires blocked": (d) => Object.assign(firstClaim(d), { researchState: "complete", unknownReason: "conflicting_evidence", searchedSourceTiers: ["peer_reviewed"] }),
  "not applicable requires its state": (d) => Object.assign(firstClaim(d), { status: "not_applicable", researchState: "complete", unknownReason: null }),
})) {
  const invalid = clone(); mutate(invalid);
  assert.equal(isValid(invalid), false, `${name} must be rejected`);
}

const source = fs.readFileSync(path.join(root, "src/domain/fishing.ts"), "utf8");
const tuple = /\["([^"]+)",\s*"[^"]+",\s*"([^"]+)",\s*(?:null|"[^"]+"),\s*(?:null|"[^"]+")(?:,\s*(true|false))?(?:,\s*(true|false))?\]/g;
const activeTaxa = [];
const entityCounts = new Map();
for (const match of source.matchAll(tuple)) {
  if ((match[4] ?? "true") === "true" && match[2] !== "species_group") {
    activeTaxa.push(match[1]);
    entityCounts.set(match[2], (entityCounts.get(match[2]) ?? 0) + 1);
  }
}
const manifestTaxa = manifest.batches.flatMap(({ taxonIds }) => taxonIds);
assert.equal(activeTaxa.length, 67, "active non-group master must contain 67 taxa");
assert.deepEqual(Object.fromEntries(entityCounts), { exact_species: 61, squid_species: 5, cephalopod_species: 1 });
assert.equal(manifest.taxonCount, 67);
assert.equal(new Set(manifestTaxa).size, manifestTaxa.length, "manifest taxa must not be duplicated");
assert.deepEqual([...manifestTaxa].sort(), [...activeTaxa].sort(), "manifest must exactly cover active non-group master");
for (const batch of manifest.batches) {
  assert(batch.taxonIds.length >= 8 && batch.taxonIds.length <= 12, `${batch.batchId}: batch must contain 8-12 taxa`);
}
assert(!manifestTaxa.some((id) => source.includes(`["${id}"`) && new RegExp(`\\["${id}",\\s*"[^"]+",\\s*"species_group"`).test(source)), "species_group must not be included");

function claims(value, found = []) {
  if (value && typeof value === "object") {
    if ("researchState" in value) found.push(value);
    for (const child of Object.values(value)) claims(child, found);
  }
  return found;
}
function validateReviewState(doc) {
  if (doc.schemaVersion === "1.4.0" && ["ready_for_review", "approved"].includes(doc.review.reviewStatus)) {
    assert(!claims(doc).some(({ researchState }) => researchState === "not_researched"), "review-ready v1.4 documents cannot retain not_researched claims");
  }
}
const ready = clone(); ready.review.reviewStatus = "ready_for_review";
assert.throws(() => validateReviewState(ready), /cannot retain not_researched/);
validateReviewState(fixture);

const researchDir = path.join(root, "data/research/fish-species");
for (const name of fs.readdirSync(researchDir).filter((name) => name.endsWith(".json"))) {
  const doc = JSON.parse(fs.readFileSync(path.join(researchDir, name), "utf8"));
  if (doc.schemaVersion === "1.4.0") {
    assert.equal(isValid(doc), true, `${name}: ${ajv.errorsText(validate.errors)}`);
    validateReviewState(doc);
  } else assert(["1.2.0", "1.3.0"].includes(doc.schemaVersion), `${name}: unsupported legacy schema version`);
}
console.log("fish species ecology v2 schema and 67-taxon manifest tests passed");
