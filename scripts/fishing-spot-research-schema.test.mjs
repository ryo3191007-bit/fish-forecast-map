import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPaths = {
  "1.0.0": path.join(ROOT, "docs/schemas/fishing-spot-research.v1.0.0.schema.json"),
  "1.1.0": path.join(ROOT, "docs/schemas/fishing-spot-research.schema.json"),
};
const examplePath = path.join(ROOT, "docs/examples/fishing-spot-research.example.json");
const commonPromptPath = path.join(ROOT, "docs/research/FISHING_SPOT_RESEARCH_COMMON_PROMPT.md");
const pilotPath = path.join(ROOT, "data/research/fishing-spots/karatsu-east-port.json");
const claudePath = path.join(ROOT, "data/research/fishing-spots/ai-outputs/karatsu-east-port.claude.raw.json");
const geminiPath = path.join(ROOT, "data/research/fishing-spots/ai-outputs/karatsu-east-port.gemini.raw.json");
const schemas = Object.fromEntries(Object.entries(schemaPaths).map(([version, file]) => [version, readJson(file)]));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const standardValidators = Object.fromEntries(Object.entries(schemas).map(([version, schema]) => [version, ajv.compile(schema)]));

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function formatAjvErrors(errors) { return (errors ?? []).map((error) => `${error.instancePath || "$"}: ${error.message}`); }
function validateStandard(record) {
  const validator = standardValidators[record.schemaVersion] ?? standardValidators["1.0.0"];
  const errors = record.schemaVersion && !standardValidators[record.schemaVersion] ? [`$.schemaVersion: unsupported ${record.schemaVersion}`] : [];
  if (!validator(record)) errors.push(...formatAjvErrors(validator.errors));
  return errors;
}
function sourceMap(record) { return new Map((record.sources ?? []).map((source) => [source.id, source])); }
function hasAnySupport(source, paths) { return paths.some((support) => source?.supports?.includes(support)); }
function compareNullableDates(from, to, pathLabel, errors) {
  if (from !== null && to !== null && from > to) errors.push(`${pathLabel}: from must be <= to`);
}
function supportPathsForEvidence(currentPath) {
  const normalized = currentPath.replace(/^\$\./, "");
  const fish = normalized.match(/^fishSpecies\[(\d+)\]$/);
  if (fish) return [`fishSpecies[${fish[1]}].name`, `fishSpecies[${fish[1]}].basis`, `fishSpecies[${fish[1]}].observedAt`, `fishSpecies[${fish[1]}].observedPeriod`];
  if (normalized === "identity.coordinates") return ["identity.coordinates.latitude", "identity.coordinates.longitude"];
  const attribute = normalized.match(/^attributes\.(\w+)$/);
  if (attribute) return [`attributes.${attribute[1]}.value`];
  const facility = normalized.match(/^facilities\.(\w+)$/);
  if (facility) return [`facilities.${facility[1]}.value`];
  const restriction = normalized.match(/^restrictions\.(\w+)$/);
  if (restriction) return [`restrictions.${restriction[1]}.value`];
  if (normalized === "restrictions.officialContact") return ["restrictions.officialContact.name", "restrictions.officialContact.url", "restrictions.officialContact.validFrom", "restrictions.officialContact.validUntil", "restrictions.officialContact.officiallyConfirmed"];
  return [];
}
function supportPathExists(record, support) {
  if (["identity.spotName", "identity.aliases", "identity.prefecture", "identity.municipality", "identity.coordinates.latitude", "identity.coordinates.longitude"].includes(support)) return true;
  const fish = support.match(/^fishSpecies\[(\d+)\]\.(name|basis|observedAt|observedPeriod)$/);
  if (fish) return Number(fish[1]) < (record.fishSpecies ?? []).length;
  const attribute = support.match(/^attributes\.(\w+)\.value$/);
  if (attribute) return Object.hasOwn(record.attributes ?? {}, attribute[1]);
  const facility = support.match(/^facilities\.(\w+)\.(value|validFrom|validUntil|officiallyConfirmed)$/);
  if (facility) return Object.hasOwn(record.facilities ?? {}, facility[1]);
  const restriction = support.match(/^restrictions\.(\w+)\.(value|validFrom|validUntil|officiallyConfirmed)$/);
  if (restriction) return Object.hasOwn(record.restrictions ?? {}, restriction[1]) && restriction[1] !== "officialContact";
  return /^restrictions\.officialContact\.(name|url|validFrom|validUntil|officiallyConfirmed)$/.test(support);
}
function validateCustom(record) {
  const errors = [];
  const sources = sourceMap(record);
  const ids = [...sources.keys()];
  if (ids.length !== (record.sources ?? []).length) errors.push("$.sources: source id must be unique");
  for (const source of record.sources ?? []) {
    if (record.schemaVersion === "1.1.0") for (const support of source.supports ?? []) if (!supportPathExists(record, support)) errors.push(`$.sources.${source.id}.supports: ${support} does not point to an existing record`);
    if (source.originalSourceId !== null && source.originalSourceId !== undefined) {
      if (!sources.has(source.originalSourceId)) errors.push(`$.sources.${source.id}.originalSourceId: unknown source id ${source.originalSourceId}`);
      if (source.originalSourceId === source.id) errors.push(`$.sources.${source.id}.originalSourceId: self reference is not allowed`);
    }
    if (source.independenceStatus === "related" && !source.sourceGroup && !source.originalSourceId) errors.push(`$.sources.${source.id}: related source requires sourceGroup or originalSourceId`);
    if (source.independenceStatus === "independent" && source.originalSourceId) errors.push(`$.sources.${source.id}: independent source cannot have originalSourceId`);
  }
  function visit(value, currentPath) {
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value.sourceIds)) for (const id of value.sourceIds) if (!sources.has(id)) errors.push(`${currentPath}.sourceIds: unknown source id ${id}`);
    if (value.evidenceSources) {
      const buckets = ["supportingSourceIds", "checkedSourceIds", "contradictingSourceIds"];
      const seen = new Map();
      for (const bucket of buckets) for (const id of value.evidenceSources[bucket] ?? []) {
        if (!sources.has(id)) errors.push(`${currentPath}.evidenceSources.${bucket}: unknown source id ${id}`);
        if (seen.has(id)) errors.push(`${currentPath}.evidenceSources: duplicate source id ${id} across ${seen.get(id)} and ${bucket}`);
        seen.set(id, bucket);
      }
      if (["confirmed", "inferred"].includes(value.status) && (value.evidenceSources.supportingSourceIds ?? []).length === 0) errors.push(`${currentPath}.evidenceSources.supportingSourceIds: required for ${value.status}`);
      if (value.status === "unknown" && (value.evidenceSources.supportingSourceIds ?? []).length !== 0) errors.push(`${currentPath}.evidenceSources.supportingSourceIds: must be empty for unknown`);
      const expectedSupports = supportPathsForEvidence(currentPath);
      if (record.schemaVersion === "1.1.0" && expectedSupports.length > 0) {
        const supportingSources = (value.evidenceSources.supportingSourceIds ?? []).map((id) => sources.get(id)).filter(Boolean);
        if (currentPath === "$.identity.coordinates") {
          const covered = new Set(supportingSources.flatMap((source) => source.supports ?? []).filter((support) => expectedSupports.includes(support)));
          for (const requiredPath of expectedSupports) if (!covered.has(requiredPath)) errors.push(`${currentPath}.evidenceSources.supportingSourceIds: supporting sources must collectively support ${requiredPath}`);
        } else {
          for (const id of value.evidenceSources.supportingSourceIds ?? []) if (sources.has(id) && !hasAnySupport(sources.get(id), expectedSupports)) errors.push(`${currentPath}.evidenceSources.supportingSourceIds: ${id} must support one of ${expectedSupports.join(", ")}`);
        }
      }
    }
    if (record.schemaVersion === "1.1.0" && value.basis === "observed" && value.observedAt === null && (!value.observedPeriod || (value.observedPeriod.from === null && value.observedPeriod.to === null))) errors.push(`${currentPath}: observed fish species requires observedAt or observedPeriod.from/to`);
    if (value.observedPeriod) compareNullableDates(value.observedPeriod.from, value.observedPeriod.to, `${currentPath}.observedPeriod`, errors);
    if (Object.hasOwn(value, "validFrom") && Object.hasOwn(value, "validUntil")) compareNullableDates(value.validFrom, value.validUntil, `${currentPath}.validFrom/validUntil`, errors);
    for (const [key, child] of Object.entries(value)) if (key !== "sources") visit(child, `${currentPath}.${key}`);
  }
  visit(record, "$");
  return errors;
}
function validateRecord(record) { return [...validateStandard(record), ...validateCustom(record)]; }
function extractPromptSkeleton() {
  const markdown = fs.readFileSync(commonPromptPath, "utf8");
  const marker = "## 完全なJSON skeleton";
  const start = markdown.indexOf("{", markdown.indexOf(marker));
  assert.notEqual(start, -1, "common prompt must include a JSON skeleton");
  let depth = 0;
  for (let index = start; index < markdown.length; index += 1) {
    if (markdown[index] === "{") depth += 1;
    if (markdown[index] === "}") depth -= 1;
    if (depth === 0) return JSON.parse(markdown.slice(start, index + 1));
  }
  throw new Error("common prompt JSON skeleton is not closed");
}

assert.equal(schemas["1.0.0"].$id, "https://fish-forecast-map.example/schemas/fishing-spot-research.v1.0.0.schema.json");
assert.equal(schemas["1.1.0"].$id, "https://fish-forecast-map.example/schemas/fishing-spot-research.v1.1.0.schema.json");
assert.notEqual(schemas["1.0.0"].$id, schemas["1.1.0"].$id);

const example = readJson(examplePath);
assert.deepEqual(validateRecord(example), [], "example must satisfy schema and source references");
assert.deepEqual(validateRecord(extractPromptSkeleton()), [], "common prompt JSON skeleton must validate as-is");
assert.deepEqual(validateRecord(readJson(pilotPath)), [], "ChatGPT pilot JSON must remain valid against Schema v1.0.0");
assert.deepEqual(validateRecord(readJson(claudePath)), [], "Claude raw JSON must remain valid against Schema v1.0.0");
assert.ok(validateRecord(readJson(geminiPath)).length > 0, "Gemini raw JSON must remain intentionally non-compliant");

if (example.schemaVersion === "1.1.0") {
const invalidEnum = structuredClone(example); invalidEnum.attributes.tidalFlow.value = "very_strong";
  assert.ok(validateStandard(invalidEnum).some((error) => error.includes("must be equal to one of the allowed values")), "standard validator must reject invalid enum values");
  const invalidFormat = structuredClone(example); invalidFormat.researchedAt = "2026-07-12";
  assert.ok(validateStandard(invalidFormat).some((error) => error.includes("must match format")), "standard validator must enforce date-time formats");
  const noSupport = structuredClone(example); noSupport.attributes.seabed.evidenceSources.supportingSourceIds = [];
  assert.ok(validateStandard(noSupport).some((error) => error.includes("must NOT have fewer than 1 items")), "standard validator must enforce if/then minItems");
  const observedWithoutTime = structuredClone(example); observedWithoutTime.fishSpecies[0].basis = "observed"; observedWithoutTime.fishSpecies[0].status = "confirmed"; observedWithoutTime.fishSpecies[0].observedAt = null; observedWithoutTime.fishSpecies[0].observedPeriod = { from: null, to: null };
  assert.ok(validateStandard(observedWithoutTime).length > 0 && validateCustom(observedWithoutTime).some((error) => error.includes("observed fish species requires")), "observed fish species must require observedAt or observedPeriod");
  const observedWithPeriod = structuredClone(observedWithoutTime); observedWithPeriod.fishSpecies[0].observedPeriod = { from: "2026-07-01", to: null }; observedWithPeriod.sources[2].supports.push("fishSpecies[0].observedPeriod");
  assert.deepEqual(validateRecord(observedWithPeriod), [], "observed fish species may use a one-sided observedPeriod");
  const unknownSource = structuredClone(example); unknownSource.attributes.seabed.evidenceSources.supportingSourceIds = ["src-does-not-exist"];
  assert.ok(validateCustom(unknownSource).some((error) => error.includes("unknown source id")), "unregistered evidence source IDs must be rejected");
  const duplicateEvidence = structuredClone(example); duplicateEvidence.attributes.seabed.evidenceSources.checkedSourceIds = ["src-public-map"];
  assert.ok(validateCustom(duplicateEvidence).some((error) => error.includes("duplicate source id")), "evidence role arrays must not duplicate IDs across roles");
  const invalidSupportIndex = structuredClone(example); invalidSupportIndex.sources[0].supports = ["fishSpecies[99].name"];
  assert.ok(validateCustom(invalidSupportIndex).some((error) => error.includes("does not point to an existing record")), "support indexes must refer to existing array items");
  const mismatchedSupport = structuredClone(example); mismatchedSupport.attributes.seabed.evidenceSources.supportingSourceIds = ["src-port-manager"];
  assert.ok(validateCustom(mismatchedSupport).some((error) => error.includes("must support one of attributes.seabed.value")), "supporting sources must support the target evidence path");
  const checkedOnlyNoSupport = structuredClone(example); checkedOnlyNoSupport.attributes.seabed.evidenceSources.checkedSourceIds = ["src-port-manager"];
  assert.deepEqual(validateRecord(checkedOnlyNoSupport), [], "checked-only sources do not need direct support for the target path");
  const facilityOnlyValidFrom = structuredClone(example); facilityOnlyValidFrom.sources[0].supports = facilityOnlyValidFrom.sources[0].supports.filter((support) => support !== "facilities.toilet.value"); facilityOnlyValidFrom.sources[0].supports.push("facilities.toilet.validFrom");
  assert.ok(validateCustom(facilityOnlyValidFrom).some((error) => error.includes("must support one of facilities.toilet.value")), "facility supporting evidence must directly support the value path");
  const restrictionOnlyValidFrom = structuredClone(example); restrictionOnlyValidFrom.sources[0].supports = restrictionOnlyValidFrom.sources[0].supports.filter((support) => support !== "restrictions.entryProhibited.value"); restrictionOnlyValidFrom.sources[0].supports.push("restrictions.entryProhibited.validFrom");
  assert.ok(validateCustom(restrictionOnlyValidFrom).some((error) => error.includes("must support one of restrictions.entryProhibited.value")), "restriction supporting evidence must directly support the value path");
  const latitudeOnlyCoordinates = structuredClone(example); latitudeOnlyCoordinates.sources[1].supports = latitudeOnlyCoordinates.sources[1].supports.filter((support) => support !== "identity.coordinates.longitude");
  assert.ok(validateCustom(latitudeOnlyCoordinates).some((error) => error.includes("supporting sources must collectively support identity.coordinates.longitude")), "coordinate evidence must cover both latitude and longitude");
  const splitCoordinateSources = structuredClone(example); splitCoordinateSources.identity.coordinates.evidenceSources.supportingSourceIds = ["src-port-manager", "src-public-map"]; splitCoordinateSources.sources[0].supports.push("identity.coordinates.latitude"); splitCoordinateSources.sources[1].supports = splitCoordinateSources.sources[1].supports.filter((support) => support !== "identity.coordinates.latitude");
  assert.deepEqual(validateRecord(splitCoordinateSources), [], "coordinate latitude and longitude may be supported by separate sources");
  const selfSource = structuredClone(example); selfSource.sources[0].originalSourceId = selfSource.sources[0].id;
  assert.ok(validateCustom(selfSource).some((error) => error.includes("self reference")), "source originalSourceId must reject self references");
  const missingRelated = structuredClone(example); missingRelated.sources[0].independenceStatus = "related"; missingRelated.sources[0].sourceGroup = null;
  assert.ok(validateCustom(missingRelated).some((error) => error.includes("related source requires")), "related sources require a group or original source");
  const independentOriginal = structuredClone(example); independentOriginal.sources[0].originalSourceId = "src-public-map";
  assert.ok(validateCustom(independentOriginal).some((error) => error.includes("independent source cannot")), "independent sources cannot point to an original source");
  const reversedObserved = structuredClone(observedWithPeriod); reversedObserved.fishSpecies[0].observedPeriod = { from: "2026-07-02", to: "2026-07-01" };
  assert.ok(validateCustom(reversedObserved).some((error) => error.includes("from must be <= to")), "observed periods must be chronological");
  const sameDayValid = structuredClone(observedWithPeriod); sameDayValid.fishSpecies[0].observedPeriod = { from: "2026-07-01", to: "2026-07-01" };
  assert.deepEqual(validateRecord(sameDayValid), [], "same-day periods are valid");
  const reversedRestriction = structuredClone(example); reversedRestriction.restrictions.constructionOrClosure.validFrom = "2026-07-02"; reversedRestriction.restrictions.constructionOrClosure.validUntil = "2026-07-01";
  assert.ok(validateCustom(reversedRestriction).some((error) => error.includes("from must be <= to")), "validFrom must not be after validUntil");
  
}

console.log("Fishing spot research schema checks passed.");
