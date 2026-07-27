import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = process.cwd();
const researchDir = path.join(root, "data/research/fish-species");
const schema = JSON.parse(fs.readFileSync(path.join(root, "docs/schemas/fish-species-ecology.v1.3.0.schema.json"), "utf8"));
const masterSource = fs.readFileSync(path.join(root, "src/domain/fishing.ts"), "utf8");

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const ecologyKeys = ["seasonality", "waterTemperature", "depthRange", "substrateHabitat", "salinityAndWaterBody", "dayNightTiming", "fishingMethods", "spawningOrConfusableInfo"];
const requiredDecisionPaths = [
  "/identity/canonicalNameJa",
  "/identity/scientificName",
  "/identity/aliases",
  ...["stableGeneral", "regionalCatchability"].flatMap((section) => ecologyKeys.map((key) => `/ecology/${section}/${key}`)),
];
const scoreV2SupportedNames = new Set(["マアジ", "スズキ", "チヌ"]);

function parseNullableToken(token) {
  return token === "null" ? null : token.slice(1, -1);
}

function parseMaster() {
  const rows = [];
  const tuple = /\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*(null|"[^"]+"),\s*(null|"[^"]+")(?:,\s*(true|false))?(?:,\s*(true|false))?\]/g;
  for (const match of masterSource.matchAll(tuple)) {
    rows.push({
      id: match[1],
      nameJa: match[2],
      entityType: match[3],
      parentGroupId: parseNullableToken(match[4]),
      uiSubgroup: parseNullableToken(match[5]),
      isSelectable: match[6] == null ? match[3] !== "species_group" : match[6] === "true",
      isActive: match[7] == null ? true : match[7] === "true",
    });
  }
  assert(rows.length >= 50, "fish master parser should discover the registered species rows");
  return rows;
}

function valueAtPointer(value, pointer) {
  if (!pointer.startsWith("/")) return undefined;
  return pointer.slice(1).split("/").reduce((current, token) => current?.[token.replaceAll("~1", "/").replaceAll("~0", "~")], value);
}

function collectClaims(value, pointer = "", claims = []) {
  if (value && typeof value === "object") {
    if ("status" in value && "evidenceSources" in value) claims.push([pointer, value]);
    for (const [key, child] of Object.entries(value)) collectClaims(child, `${pointer}/${key}`, claims);
  }
  return claims;
}

const master = parseMaster();
const masterById = new Map(master.map((row) => [row.id, row]));
const v13Docs = fs.readdirSync(researchDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => [name, JSON.parse(fs.readFileSync(path.join(researchDir, name), "utf8"))])
  .filter(([, doc]) => doc.schemaVersion === "1.3.0");

assert(v13Docs.length > 0, "v1.3.0 expansion research files should exist");

for (const [fileName, doc] of v13Docs) {
  const id = doc.speciesId;
  assert.equal(validate(doc), true, `${fileName}: ${ajv.errorsText(validate.errors)}`);

  const masterRow = masterById.get(id);
  assert(masterRow, `${id}: research id must exist in src/domain/fishing.ts`);
  assert.equal(masterRow.isActive, true, `${id}: inactive/legacy master entries must not receive v1.3 research`);
  assert.equal(doc.identity.displayNameJa, masterRow.nameJa, `${id}: display name must match master`);
  assert.equal(doc.identity.entityType, masterRow.entityType, `${id}: entity type must match master`);
  if (doc.identity.parentGroupId !== null) {
    assert.equal(doc.identity.parentGroupId, masterRow.parentGroupId, `${id}: a parent group declared by the research record must still match the current master`);
  }

  const activeMasterMembers = new Set(master.filter((row) => row.isActive && row.parentGroupId === id).map((row) => row.id));
  const actualMembers = [...doc.identity.memberSpeciesIds];
  for (const memberId of actualMembers) {
    assert(activeMasterMembers.has(memberId), `${id}: declared research member ${memberId} must be an active child in the current master`);
  }
  if (masterRow.entityType !== "species_group") assert.deepEqual(actualMembers, [], `${id}: exact species must not declare member species`);

  const expectedScoreStatus = scoreV2SupportedNames.has(masterRow.nameJa) ? "supported" : "unsupported";
  assert.equal(doc.review.comparisonWithCurrentImplementation.scoreV2Status, expectedScoreStatus, `${id}: score support must reflect current implementation`);
  assert.equal(doc.review.comparisonWithCurrentImplementation.inheritancePolicy, "do_not_inherit_between_species_or_group");
  const comparisonPath = doc.review.comparisonWithCurrentImplementation.authoritativeComparisonDocument;
  assert(fs.existsSync(path.join(root, comparisonPath)), `${id}: comparison document must exist`);

  const sourceIds = new Set(doc.sources.map((source) => source.id));
  assert.equal(sourceIds.size, doc.sources.length, `${id}: source ids must be unique`);
  const sourceById = new Map(doc.sources.map((source) => [source.id, source]));
  const derivationGroups = new Set();
  for (const source of doc.sources) {
    assert(!derivationGroups.has(source.derivationGroup), `${id}: duplicate derivation group`);
    derivationGroups.add(source.derivationGroup);
    assert(source.checkedAt, `${id}: checkedAt is required`);
    assert(source.regionScope, `${id}: regionScope is required`);
    for (const supportedPath of source.supports) {
      assert.notEqual(valueAtPointer(doc, supportedPath), undefined, `${id}: source supports missing path ${supportedPath}`);
    }
  }

  for (const [pointer, claim] of collectClaims(doc)) {
    const lists = ["supportingSourceIds", "checkedSourceIds", "contradictingSourceIds"].map((key) => claim.evidenceSources[key]);
    const all = lists.flat();
    assert.equal(new Set(all).size, all.length, `${id}:${pointer}: evidence ids must not overlap`);
    for (const sourceId of all) {
      assert(sourceIds.has(sourceId), `${id}:${pointer}: missing source ${sourceId}`);
      assert(sourceById.get(sourceId).supports.includes(pointer), `${id}:${pointer}: source ${sourceId} must point back to claim`);
    }
    if (["confirmed", "inferred"].includes(claim.status)) {
      assert(claim.evidenceSources.supportingSourceIds.length > 0, `${id}:${pointer}: concrete claim requires support`);
    }
    if (claim.status === "unknown") assert.equal(claim.value, null, `${id}:${pointer}: unknown must remain null`);
    if (pointer.includes("/regionalCatchability/") && claim.status !== "unknown") {
      assert(claim.regionScope, `${id}:${pointer}: regional concrete value needs a region scope`);
    }
    if (claim.unit === "celsius" && claim.value) {
      for (const key of ["min", "max", "point"]) {
        if (claim.value[key] !== undefined) assert(claim.value[key] >= -2 && claim.value[key] <= 35, `${id}:${pointer}: invalid temperature`);
      }
    }
    if (claim.unit === "m" && claim.value) {
      if (claim.rangeType === "maximum_only") assert(claim.value.min === undefined && claim.value.max >= 0 && claim.value.max <= 1000, `${id}:${pointer}: invalid maximum-only depth`);
      if (claim.rangeType === "bounded_range") assert(claim.value.min >= 0 && claim.value.max >= claim.value.min && claim.value.max <= 1000, `${id}:${pointer}: invalid bounded depth`);
    }
    if (claim.value?.months) for (const month of claim.value.months) assert(month >= 1 && month <= 12, `${id}:${pointer}: invalid month`);
  }

  const decisionPaths = doc.review.attributeDecisions.map(({ path: decisionPath }) => decisionPath);
  assert.deepEqual([...decisionPaths].sort(), [...requiredDecisionPaths].sort(), `${id}: every identity/ecology attribute must be classified exactly once`);
  assert.equal(new Set(decisionPaths).size, decisionPaths.length, `${id}: duplicate decision path`);

  for (const decision of doc.review.attributeDecisions) {
    assert.notEqual(valueAtPointer(doc, decision.path), undefined, `${id}: decision points to missing path ${decision.path}`);
    for (const sourceId of decision.sourceIds) assert(sourceIds.has(sourceId), `${id}: decision references missing source ${sourceId}`);
    if (["adopt", "adopt_with_warning"].includes(decision.decision)) {
      assert(decision.sourceIds.length > 0, `${id}:${decision.path}: adopted decision needs support`);
      for (const sourceId of decision.sourceIds) {
        assert(sourceById.get(sourceId).supports.includes(decision.path), `${id}:${decision.path}: adopted source must support path`);
      }
    } else {
      assert.deepEqual(decision.purposes, ["score_excluded"], `${id}:${decision.path}: hold/reject must be score-excluded`);
    }
  }

  const acceptedPaths = doc.review.attributeDecisions
    .filter(({ decision }) => ["adopt", "adopt_with_warning"].includes(decision))
    .map(({ path: decisionPath }) => decisionPath);
  assert.deepEqual(doc.review.productionAdoption.acceptedPaths, acceptedPaths, `${id}: acceptedPaths must exactly match adopted decisions`);

  if (masterRow.entityType === "species_group") {
    assert.equal(doc.identity.canonicalNameJa.value, null, `${id}: group cannot have a single canonical species name`);
    assert.equal(doc.identity.scientificName.value, null, `${id}: group cannot have a single scientific species name`);
    assert(!acceptedPaths.some((decisionPath) => decisionPath.startsWith("/ecology/")), `${id}: group cannot inherit child ecology`);
  }
}

const inactiveIds = new Set(master.filter((row) => !row.isActive).map((row) => row.id));
for (const [, doc] of v13Docs) assert(!inactiveIds.has(doc.speciesId), `${doc.speciesId}: inactive entry must stay out of expansion research`);

console.log(`fish species ecology v1.3 expansion tests passed (${v13Docs.length} files)`);