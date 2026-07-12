import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPaths = {
  "1.0.0": path.join(ROOT, "docs/schemas/fishing-spot-research.v1.0.0.schema.json"),
  "1.1.0": path.join(ROOT, "docs/schemas/fishing-spot-research.schema.json"),
};
const examplePath = path.join(ROOT, "docs/examples/fishing-spot-research.example.json");
const pilotPath = path.join(ROOT, "data/research/fishing-spots/karatsu-east-port.json");
const claudePath = path.join(ROOT, "data/research/fishing-spots/ai-outputs/karatsu-east-port.claude.raw.json");
const geminiPath = path.join(ROOT, "data/research/fishing-spots/ai-outputs/karatsu-east-port.gemini.raw.json");
const schemas = Object.fromEntries(Object.entries(schemaPaths).map(([version, file]) => [version, readJson(file)]));

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}
function resolveRef(ref, schema) {
  assert.match(ref, /^#\//, `Only local JSON Schema refs are supported: ${ref}`);
  return ref.slice(2).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~")).reduce((current, part) => current?.[part], schema);
}
function validateNode(value, node, schema, currentPath = "$") {
  const errors = [];
  if (!node || typeof node !== "object") return errors;
  if (node.$ref) return validateNode(value, resolveRef(node.$ref, schema), schema, currentPath);
  if (Object.hasOwn(node, "const") && !sameJson(value, node.const)) errors.push(`${currentPath}: expected const ${JSON.stringify(node.const)}`);
  if (node.enum && !node.enum.some((candidate) => sameJson(value, candidate))) errors.push(`${currentPath}: value ${JSON.stringify(value)} is outside enum`);
  const allowedTypes = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
  if (allowedTypes.length > 0 && !allowedTypes.some((type) => matchesType(value, type))) { errors.push(`${currentPath}: expected type ${allowedTypes.join("|")}`); return errors; }
  if (typeof value === "string") {
    if (node.minLength !== undefined && value.length < node.minLength) errors.push(`${currentPath}: shorter than minLength ${node.minLength}`);
    if (node.maxLength !== undefined && value.length > node.maxLength) errors.push(`${currentPath}: longer than maxLength ${node.maxLength}`);
    if (node.pattern && !new RegExp(node.pattern).test(value)) errors.push(`${currentPath}: does not match ${node.pattern}`);
    if (node.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`${currentPath}: invalid date`);
    if (node.format === "date-time" && Number.isNaN(Date.parse(value))) errors.push(`${currentPath}: invalid date-time`);
    if (node.format === "uri") { try { const url = new URL(value); if (!["http:", "https:"].includes(url.protocol)) errors.push(`${currentPath}: URI must use http or https`); } catch { errors.push(`${currentPath}: invalid URI`); } }
  }
  if (typeof value === "number") {
    if (node.minimum !== undefined && value < node.minimum) errors.push(`${currentPath}: below minimum ${node.minimum}`);
    if (node.maximum !== undefined && value > node.maximum) errors.push(`${currentPath}: above maximum ${node.maximum}`);
  }
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) errors.push(`${currentPath}: fewer than minItems ${node.minItems}`);
    if (node.maxItems !== undefined && value.length > node.maxItems) errors.push(`${currentPath}: more than maxItems ${node.maxItems}`);
    if (node.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${currentPath}: duplicate array items`);
    if (node.items) value.forEach((item, index) => errors.push(...validateNode(item, node.items, schema, `${currentPath}[${index}]`)));
    if (node.contains && !value.some((item, index) => validateNode(item, node.contains, schema, `${currentPath}[${index}]`).length === 0)) errors.push(`${currentPath}: no item satisfies contains`);
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const requiredKey of node.required ?? []) if (!Object.hasOwn(value, requiredKey)) errors.push(`${currentPath}: missing required property ${requiredKey}`);
    for (const [key, child] of Object.entries(node.properties ?? {})) if (Object.hasOwn(value, key)) errors.push(...validateNode(value[key], child, schema, `${currentPath}.${key}`));
    if (node.additionalProperties === false) {
      const allowedKeys = new Set(Object.keys(node.properties ?? {}));
      for (const key of Object.keys(value)) if (!allowedKeys.has(key)) errors.push(`${currentPath}: additional property ${key}`);
    }
  }
  for (const child of node.allOf ?? []) errors.push(...validateNode(value, child, schema, currentPath));
  if (node.if && validateNode(value, node.if, schema, currentPath).length === 0 && node.then) errors.push(...validateNode(value, node.then, schema, currentPath));
  return errors;
}
function validateReferences(record) {
  const errors = [];
  const sourceIds = (record.sources ?? []).map((source) => source.id);
  const known = new Set(sourceIds);
  if (known.size !== sourceIds.length) errors.push("$.sources: source id must be unique");
  function visit(value, currentPath) {
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value.sourceIds)) for (const id of value.sourceIds) if (!known.has(id)) errors.push(`${currentPath}.sourceIds: unknown source id ${id}`);
    if (value.evidenceSources) {
      const buckets = ["supportingSourceIds", "checkedSourceIds", "contradictingSourceIds"];
      const seen = new Map();
      for (const bucket of buckets) for (const id of value.evidenceSources[bucket] ?? []) {
        if (!known.has(id)) errors.push(`${currentPath}.evidenceSources.${bucket}: unknown source id ${id}`);
        if (seen.has(id)) errors.push(`${currentPath}.evidenceSources: duplicate source id ${id} across ${seen.get(id)} and ${bucket}`);
        seen.set(id, bucket);
      }
      if (["confirmed", "inferred"].includes(value.status) && (value.evidenceSources.supportingSourceIds ?? []).length === 0) errors.push(`${currentPath}.evidenceSources.supportingSourceIds: required for ${value.status}`);
      if (value.status === "unknown" && (value.evidenceSources.supportingSourceIds ?? []).length !== 0) errors.push(`${currentPath}.evidenceSources.supportingSourceIds: must be empty for unknown`);
    }
    for (const [key, child] of Object.entries(value)) if (key !== "sources") visit(child, `${currentPath}.${key}`);
  }
  visit(record, "$");
  return errors;
}
function validateRecord(record) {
  const schema = schemas[record.schemaVersion] ?? schemas["1.0.0"];
  const versionErrors = record.schemaVersion && !schemas[record.schemaVersion] ? [`$.schemaVersion: unsupported ${record.schemaVersion}`] : [];
  return [...versionErrors, ...validateNode(record, schema, schema), ...validateReferences(record)];
}

assert.equal(schemas["1.0.0"].$id, "https://fish-forecast-map.example/schemas/fishing-spot-research.v1.0.0.schema.json");
assert.equal(schemas["1.1.0"].$id, "https://fish-forecast-map.example/schemas/fishing-spot-research.v1.1.0.schema.json");
assert.notEqual(schemas["1.0.0"].$id, schemas["1.1.0"].$id);

const example = readJson(examplePath);
assert.deepEqual(validateRecord(example), [], "example must satisfy schema and source references");
assert.deepEqual(validateRecord(readJson(pilotPath)), [], "ChatGPT pilot JSON must remain valid against Schema v1.0.0");
assert.deepEqual(validateRecord(readJson(claudePath)), [], "Claude raw JSON must remain valid against Schema v1.0.0");
assert.ok(validateRecord(readJson(geminiPath)).length > 0, "Gemini raw JSON must remain intentionally non-compliant");

// const invalidEnum = structuredClone(example);
if (example.schemaVersion === "1.1.0") {
const invalidEnum = structuredClone(example); invalidEnum.attributes.tidalFlow.value = "very_strong";
  assert.ok(validateRecord(invalidEnum).some((error) => error.includes("outside enum")), "enum values outside the schema must be rejected");
  const missingRequired = structuredClone(example); delete missingRequired.identity.spotName;
  assert.ok(validateRecord(missingRequired).some((error) => error.includes("missing required property spotName")), "missing required fields must be rejected");
  const unknownSource = structuredClone(example); unknownSource.attributes.seabed.evidenceSources.supportingSourceIds = ["src-does-not-exist"];
  assert.ok(validateRecord(unknownSource).some((error) => error.includes("unknown source id")), "unregistered evidence source IDs must be rejected");
  const inconsistentUnknown = structuredClone(example); inconsistentUnknown.attributes.waterDepth.status = "unknown"; inconsistentUnknown.attributes.waterDepth.confidence = "high"; inconsistentUnknown.attributes.waterDepth.value = "deep"; inconsistentUnknown.attributes.waterDepth.evidenceSources.supportingSourceIds = ["src-public-map"];
  assert.ok(validateRecord(inconsistentUnknown).length > 0, "unknown attributes must use low confidence, unknown value, and no supporting sources");
  const duplicateEvidence = structuredClone(example); duplicateEvidence.attributes.seabed.evidenceSources.checkedSourceIds = ["src-public-map"];
  assert.ok(validateRecord(duplicateEvidence).some((error) => error.includes("duplicate source id")), "evidence role arrays must not duplicate IDs across roles");
  const noSupport = structuredClone(example); noSupport.attributes.seabed.evidenceSources.supportingSourceIds = [];
  assert.ok(validateRecord(noSupport).some((error) => error.includes("fewer than minItems") || error.includes("required for inferred")), "confirmed/inferred evidence must have supporting sources");
  
  const validSupports = ["fishSpecies[0].name", "attributes.spotType.value", "identity.coordinates.latitude", "identity.coordinates.longitude", "facilities.toilet.value", "restrictions.officialContact.url"];
  for (const support of validSupports) { const record = structuredClone(example); record.sources[0].supports = [support]; assert.deepEqual(validateRecord(record), [], `${support} must be valid`); }
  const invalidSupports = ["fishSpecies[0].value", "fishSpecies[].name", "fishSpecies.expected", "attributes.foo.value", "attributes.spotType", "facilities.foo.value", "restrictions.foo.value", "sources[0].url"];
  for (const support of invalidSupports) { const record = structuredClone(example); record.sources[0].supports = [support]; assert.ok(validateRecord(record).some((error) => error.includes("does not match")), `${support} must be invalid`); }
  
}

console.log("Fishing spot research schema checks passed.");
