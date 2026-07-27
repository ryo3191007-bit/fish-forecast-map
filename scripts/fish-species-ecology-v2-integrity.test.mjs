import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const researchDir = path.join(root, "data/research/fish-species");
const masterSource = fs.readFileSync(path.join(root, "src/domain/fishing.ts"), "utf8");
const fixture = JSON.parse(fs.readFileSync(path.join(root, "docs/examples/fish-species-ecology.v1.4.0.example.json"), "utf8"));

const ecologyKeys = [
  "seasonality",
  "waterTemperature",
  "depthRange",
  "substrateHabitat",
  "salinityAndWaterBody",
  "dayNightTiming",
  "fishingMethods",
  "spawningOrConfusableInfo",
];
const claimPointers = [
  "/identity/canonicalNameJa",
  "/identity/scientificName",
  ...["stableGeneral", "regionalCatchability"].flatMap((section) => ecologyKeys.map((key) => `/ecology/${section}/${key}`)),
];
const requiredDecisionPaths = [
  "/identity/canonicalNameJa",
  "/identity/scientificName",
  "/identity/aliases",
  ...["stableGeneral", "regionalCatchability"].flatMap((section) => ecologyKeys.map((key) => `/ecology/${section}/${key}`)),
];
const scoreV2SupportedNames = new Set(["マアジ", "スズキ", "チヌ"]);
const upperSourceTiers = new Set(["official_primary", "peer_reviewed", "authoritative_database", "institutional_reference"]);
const researchedUnknownReasons = new Set(["source_not_found", "insufficient_evidence", "scope_mismatch"]);

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
      isActive: match[7] == null ? true : match[7] === "true",
    });
  }
  assert(rows.length >= 50, "fish master parser should discover the registered species rows");
  return rows;
}

function valueAtPointer(document, pointer) {
  if (!pointer.startsWith("/")) return undefined;
  return pointer.slice(1).split("/").reduce((value, token) => {
    if (value === null || typeof value !== "object") return undefined;
    return value[token.replaceAll("~1", "/").replaceAll("~0", "~")];
  }, document);
}

function evidenceIds(claim) {
  return [
    ...claim.evidenceSources.supportingSourceIds,
    ...claim.evidenceSources.checkedSourceIds,
    ...claim.evidenceSources.contradictingSourceIds,
  ];
}

function validateResearchMetadata(id, pointer, claim, sourceById) {
  assert.equal(typeof claim.researchNote, "string", `${id}:${pointer}: researchNote must be a string`);
  assert(claim.researchNote.trim().length > 0, `${id}:${pointer}: researchNote must not be empty`);

  const ids = evidenceIds(claim);
  const usedTiers = new Set();
  for (const sourceId of ids) {
    const source = sourceById.get(sourceId);
    assert(source, `${id}:${pointer}: missing source ${sourceId}`);
    usedTiers.add(source.sourceTier);
    assert(claim.searchedSourceTiers.includes(source.sourceTier), `${id}:${pointer}: evidence source tier ${source.sourceTier} must be recorded in searchedSourceTiers`);
  }

  if (researchedUnknownReasons.has(claim.unknownReason)) {
    const upperTierCount = new Set(claim.searchedSourceTiers.filter((tier) => upperSourceTiers.has(tier))).size;
    assert(upperTierCount >= 2, `${id}:${pointer}: ${claim.unknownReason} requires at least two distinct upper source tiers`);
  }

  if (claim.unknownReason === "conflicting_evidence") {
    assert(claim.evidenceSources.contradictingSourceIds.length > 0, `${id}:${pointer}: conflicting_evidence requires contradicting evidence`);
    assert(ids.length >= 2, `${id}:${pointer}: conflicting_evidence requires at least two evidence sources`);
    const derivationGroups = new Set(ids.map((sourceId) => sourceById.get(sourceId)?.derivationGroup).filter(Boolean));
    assert(derivationGroups.size >= 2, `${id}:${pointer}: conflicting_evidence requires independent derivation groups`);
  }

  if (claim.unknownReason === "taxonomy_uncertain") {
    assert(ids.length > 0, `${id}:${pointer}: taxonomy_uncertain requires evidence explaining the taxonomy issue`);
  }

  return usedTiers;
}

const master = parseMaster();
const masterById = new Map(master.map((row) => [row.id, row]));

function validateDocumentIntegrity(doc, label) {
  const id = doc.speciesId;
  const masterRow = masterById.get(id);
  assert(masterRow, `${label}: ${id} must exist in src/domain/fishing.ts`);
  assert.equal(masterRow.isActive, true, `${label}: ${id} must be active`);
  assert.notEqual(masterRow.entityType, "species_group", `${label}: species_group must not use v1.4 batch research`);
  assert.equal(doc.identity.displayNameJa, masterRow.nameJa, `${label}: ${id} display name must match master`);
  assert.equal(doc.identity.entityType, masterRow.entityType, `${label}: ${id} entity type must match master`);
  assert.equal(doc.identity.parentGroupId, masterRow.parentGroupId, `${label}: ${id} parent group must match master`);
  assert.deepEqual(doc.identity.memberSpeciesIds, [], `${label}: ${id} non-group taxon must not declare member species`);

  const expectedScoreStatus = scoreV2SupportedNames.has(masterRow.nameJa) ? "supported" : "unsupported";
  assert.equal(doc.review.comparisonWithCurrentImplementation.scoreV2Status, expectedScoreStatus, `${label}: ${id} SCORE support must reflect current implementation`);
  assert.equal(doc.review.comparisonWithCurrentImplementation.inheritancePolicy, "do_not_inherit_between_species_or_group");
  const comparisonPath = doc.review.comparisonWithCurrentImplementation.authoritativeComparisonDocument;
  assert(fs.existsSync(path.join(root, comparisonPath)), `${label}: ${id} comparison document must exist`);

  const sourceIds = new Set(doc.sources.map((source) => source.id));
  assert.equal(sourceIds.size, doc.sources.length, `${label}: ${id} source ids must be unique`);
  const sourceById = new Map(doc.sources.map((source) => [source.id, source]));
  const derivationGroups = new Set();
  for (const source of doc.sources) {
    assert(!derivationGroups.has(source.derivationGroup), `${label}: ${id} duplicate derivation group ${source.derivationGroup}`);
    derivationGroups.add(source.derivationGroup);
    assert(source.checkedAt, `${label}: ${id} source checkedAt is required`);
    assert(source.regionScope, `${label}: ${id} source regionScope is required`);
    for (const supportedPath of source.supports) {
      assert.notEqual(valueAtPointer(doc, supportedPath), undefined, `${label}: ${id} source supports missing path ${supportedPath}`);
    }
  }

  for (const pointer of claimPointers) {
    const claim = valueAtPointer(doc, pointer);
    assert(claim && typeof claim === "object", `${label}: ${id}:${pointer}: claim is missing`);
    const lists = ["supportingSourceIds", "checkedSourceIds", "contradictingSourceIds"].map((key) => claim.evidenceSources[key]);
    const all = lists.flat();
    assert.equal(new Set(all).size, all.length, `${label}: ${id}:${pointer}: evidence ids must not overlap`);
    for (const sourceId of all) {
      assert(sourceIds.has(sourceId), `${label}: ${id}:${pointer}: missing source ${sourceId}`);
      assert(sourceById.get(sourceId).supports.includes(pointer), `${label}: ${id}:${pointer}: source ${sourceId} must point back to claim`);
    }
    if (["confirmed", "inferred"].includes(claim.status)) {
      assert(claim.evidenceSources.supportingSourceIds.length > 0, `${label}: ${id}:${pointer}: concrete claim requires support`);
    }
    if (claim.status === "unknown") assert.equal(claim.value, null, `${label}: ${id}:${pointer}: unknown must remain null`);
    if (pointer.includes("/regionalCatchability/") && claim.status !== "unknown" && claim.status !== "not_applicable") {
      assert(claim.regionScope, `${label}: ${id}:${pointer}: regional concrete value needs regionScope`);
    }
    if (claim.unit === "celsius" && claim.value) {
      for (const key of ["min", "max", "point"]) {
        if (claim.value[key] !== undefined) assert(claim.value[key] >= -2 && claim.value[key] <= 35, `${label}: ${id}:${pointer}: invalid temperature`);
      }
    }
    if (claim.unit === "m" && claim.value) {
      if (claim.rangeType === "maximum_only") assert(claim.value.min === undefined && claim.value.max >= 0 && claim.value.max <= 1000, `${label}: ${id}:${pointer}: invalid maximum-only depth`);
      if (claim.rangeType === "bounded_range") assert(claim.value.min >= 0 && claim.value.max >= claim.value.min && claim.value.max <= 1000, `${label}: ${id}:${pointer}: invalid bounded depth`);
    }
    if (claim.value?.months) {
      for (const month of claim.value.months) assert(month >= 1 && month <= 12, `${label}: ${id}:${pointer}: invalid month`);
    }
    validateResearchMetadata(id, pointer, claim, sourceById);
  }

  const decisionPaths = doc.review.attributeDecisions.map(({ path: decisionPath }) => decisionPath);
  assert.deepEqual([...decisionPaths].sort(), [...requiredDecisionPaths].sort(), `${label}: ${id} every identity/ecology attribute must be classified exactly once`);
  assert.equal(new Set(decisionPaths).size, decisionPaths.length, `${label}: ${id} duplicate decision path`);

  for (const decision of doc.review.attributeDecisions) {
    assert.notEqual(valueAtPointer(doc, decision.path), undefined, `${label}: ${id} decision points to missing path ${decision.path}`);
    for (const sourceId of decision.sourceIds) assert(sourceIds.has(sourceId), `${label}: ${id} decision references missing source ${sourceId}`);
    if (["adopt", "adopt_with_warning"].includes(decision.decision)) {
      assert(decision.sourceIds.length > 0, `${label}: ${id}:${decision.path}: adopted decision needs support`);
      for (const sourceId of decision.sourceIds) {
        assert(sourceById.get(sourceId).supports.includes(decision.path), `${label}: ${id}:${decision.path}: adopted source must support path`);
      }
    } else {
      assert.deepEqual(decision.purposes, ["score_excluded"], `${label}: ${id}:${decision.path}: hold/reject must be score-excluded`);
    }
  }

  const acceptedPaths = doc.review.attributeDecisions
    .filter(({ decision }) => ["adopt", "adopt_with_warning"].includes(decision))
    .map(({ path: decisionPath }) => decisionPath);
  assert.deepEqual(doc.review.productionAdoption.acceptedPaths, acceptedPaths, `${label}: ${id} acceptedPaths must exactly match adopted decisions`);
}

// Exercise the cross-document invariants even before the first real v1.4 batch lands.
const synthetic = structuredClone(fixture);
synthetic.speciesId = "shiira";
synthetic.identity.displayNameJa = "シイラ";
synthetic.identity.entityType = "exact_species";
synthetic.identity.parentGroupId = null;
synthetic.review.comparisonWithCurrentImplementation.scoreV2Status = "unsupported";
validateDocumentIntegrity(synthetic, "v1.4 fixture smoke test");

// The schema allows two searched tiers as long as one is upper-tier; v2 policy requires two distinct upper tiers.
const weakUnknownClaim = structuredClone(synthetic.ecology.stableGeneral.seasonality);
weakUnknownClaim.researchState = "complete";
weakUnknownClaim.unknownReason = "source_not_found";
weakUnknownClaim.searchedSourceTiers = ["official_primary", "trusted_secondary"];
assert.throws(() => validateResearchMetadata("fixture", "/claim", weakUnknownClaim, new Map()), /two distinct upper source tiers/);

const researchDocs = fs.readdirSync(researchDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => [name, JSON.parse(fs.readFileSync(path.join(researchDir, name), "utf8"))])
  .filter(([, doc]) => doc.schemaVersion === "1.4.0");

for (const [fileName, doc] of researchDocs) validateDocumentIntegrity(doc, fileName);

console.log("fish species ecology v2 integrity tests passed");
