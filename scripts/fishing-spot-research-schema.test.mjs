import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(ROOT, "docs/schemas/fishing-spot-research.schema.json");
const schemaV1Path = path.join(ROOT, "docs/schemas/fishing-spot-research.v1.0.0.schema.json");
const examplePath = path.join(ROOT, "docs/examples/fishing-spot-research.example.json");
const karatsuPath = path.join(ROOT, "data/research/fishing-spots/karatsu-east-port.json");
const claudeRawPath = path.join(ROOT, "data/research/fishing-spots/ai-outputs/karatsu-east-port.claude.raw.json");
const geminiRawPath = path.join(ROOT, "data/research/fishing-spots/ai-outputs/karatsu-east-port.gemini.raw.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const schema = readJson(schemaPath);
const schemaV1 = readJson(schemaV1Path);
const example = readJson(examplePath);
const karatsu = readJson(karatsuPath);
const claudeRaw = readJson(claudeRawPath);
const geminiRaw = readJson(geminiRawPath);

function resolveRef(ref, rootSchema = schema) {
  assert.match(ref, /^#\//, `Only local JSON Schema refs are supported: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], rootSchema);
}

function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateNode(value, node, currentPath = "$", rootSchema = schema) {
  const errors = [];
  if (!node || typeof node !== "object") return errors;

  if (node.$ref) {
    const resolved = resolveRef(node.$ref, rootSchema);
    if (!resolved) return [`${currentPath}: unresolved ref ${node.$ref}`];
    return validateNode(value, resolved, currentPath, rootSchema);
  }

  if (Object.hasOwn(node, "const") && !sameJson(value, node.const)) {
    errors.push(`${currentPath}: expected const ${JSON.stringify(node.const)}`);
  }

  if (node.enum && !node.enum.some((candidate) => sameJson(value, candidate))) {
    errors.push(`${currentPath}: value ${JSON.stringify(value)} is outside enum`);
  }

  const allowedTypes = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
  if (allowedTypes.length > 0 && !allowedTypes.some((type) => matchesType(value, type))) {
    errors.push(`${currentPath}: expected type ${allowedTypes.join("|")}`);
    return errors;
  }

  if (typeof value === "string") {
    if (node.minLength !== undefined && value.length < node.minLength) {
      errors.push(`${currentPath}: shorter than minLength ${node.minLength}`);
    }
    if (node.maxLength !== undefined && value.length > node.maxLength) {
      errors.push(`${currentPath}: longer than maxLength ${node.maxLength}`);
    }
    if (node.pattern && !new RegExp(node.pattern).test(value)) {
      errors.push(`${currentPath}: does not match ${node.pattern}`);
    }
    if (node.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors.push(`${currentPath}: invalid date`);
    }
    if (node.format === "date-time" && Number.isNaN(Date.parse(value))) {
      errors.push(`${currentPath}: invalid date-time`);
    }
    if (node.format === "uri") {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) {
          errors.push(`${currentPath}: URI must use http or https`);
        }
      } catch {
        errors.push(`${currentPath}: invalid URI`);
      }
    }
  }

  if (typeof value === "number") {
    if (node.minimum !== undefined && value < node.minimum) {
      errors.push(`${currentPath}: below minimum ${node.minimum}`);
    }
    if (node.maximum !== undefined && value > node.maximum) {
      errors.push(`${currentPath}: above maximum ${node.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) {
      errors.push(`${currentPath}: fewer than minItems ${node.minItems}`);
    }
    if (node.maxItems !== undefined && value.length > node.maxItems) {
      errors.push(`${currentPath}: more than maxItems ${node.maxItems}`);
    }
    if (node.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) {
        errors.push(`${currentPath}: duplicate array items`);
      }
    }
    if (node.items) {
      value.forEach((item, index) => {
        errors.push(...validateNode(item, node.items, `${currentPath}[${index}]`, rootSchema));
      });
    }
    if (node.contains && !value.some((item, index) => validateNode(item, node.contains, `${currentPath}[${index}]`, rootSchema).length === 0)) {
      errors.push(`${currentPath}: no item satisfies contains`);
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const requiredKey of node.required ?? []) {
      if (!Object.hasOwn(value, requiredKey)) {
        errors.push(`${currentPath}: missing required property ${requiredKey}`);
      }
    }
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validateNode(value[key], child, `${currentPath}.${key}`, rootSchema));
      }
    }
    if (node.additionalProperties === false) {
      const allowedKeys = new Set(Object.keys(node.properties ?? {}));
      for (const key of Object.keys(value)) {
        if (!allowedKeys.has(key)) {
          errors.push(`${currentPath}: additional property ${key}`);
        }
      }
    }
  }

  for (const child of node.allOf ?? []) {
    errors.push(...validateNode(value, child, currentPath, rootSchema));
  }

  if (node.if && validateNode(value, node.if, currentPath, rootSchema).length === 0 && node.then) {
    errors.push(...validateNode(value, node.then, currentPath, rootSchema));
  }

  return errors;
}

function validateSourceReferences(record) {
  const errors = [];
  const sourceIds = (record.sources ?? []).map((source) => source.id);
  const known = new Set(sourceIds);

  if (known.size !== sourceIds.length) {
    errors.push("$.sources: source id must be unique");
  }

  function checkIds(ids, currentPath) {
    for (const sourceId of ids ?? []) {
      if (!known.has(sourceId)) errors.push(`${currentPath}: unknown source id ${sourceId}`);
    }
  }

  function visit(value, currentPath) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value.sourceIds)) checkIds(value.sourceIds, `${currentPath}.sourceIds`);
    if (value.evidenceSources) {
      const roles = ["supportingSourceIds", "checkedSourceIds", "contradictingSourceIds"];
      const seen = new Map();
      for (const role of roles) {
        checkIds(value.evidenceSources[role], `${currentPath}.evidenceSources.${role}`);
        for (const id of value.evidenceSources[role] ?? []) {
          if (seen.has(id)) errors.push(`${currentPath}.evidenceSources: duplicate source id ${id} in ${seen.get(id)} and ${role}`);
          seen.set(id, role);
        }
      }
      if (value.status === "unknown" && value.evidenceSources.supportingSourceIds.length !== 0) {
        errors.push(`${currentPath}.evidenceSources.supportingSourceIds: unknown status must not have supporting sources`);
      }
      if (["confirmed", "inferred"].includes(value.status) && value.evidenceSources.supportingSourceIds.length === 0) {
        errors.push(`${currentPath}.evidenceSources.supportingSourceIds: ${value.status} status requires supporting sources`);
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (key !== "sources") visit(child, `${currentPath}.${key}`);
    }
  }

  visit(record, "$");
  return errors;
}

function schemaForRecord(record) {
  if (record.schemaVersion === "1.0.0") return schemaV1;
  if (record.schemaVersion === "1.1.0") return schema;
  return schema;
}

function validateRecord(record) {
  const rootSchema = schemaForRecord(record);
  return [...validateNode(record, rootSchema, "$", rootSchema), ...validateSourceReferences(record)];
}

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.properties.schemaVersion.const, "1.1.0");
assert.equal(schemaV1.properties.schemaVersion.const, "1.0.0");
assert.deepEqual(validateRecord(example), [], "example must satisfy schema and source references");


assert.deepEqual(validateRecord(karatsu), [], "Karatsu pilot fixture must continue satisfying Schema v1.0.0");
assert.deepEqual(validateRecord(claudeRaw), [], "Claude raw fixture must continue satisfying Schema v1.0.0");
assert.notDeepEqual(validateRecord(geminiRaw), [], "Gemini raw fixture must remain intentionally non-compliant");

if (example.schemaVersion === "1.1.0") {
for (const validPath of ["attributes.spotType.value", "fishSpecies[0].name", "fishSpecies[0].basis", "facilities.toilet.value", "identity.coordinates.latitude"]) {
  assert.ok(new RegExp(schema.$defs.source.properties.supports.items.pattern).test(validPath), `${validPath} must be a valid supports path`);
}
for (const invalidPath of ["fishSpecies.expected", "fishSpecies[].name", "attributes", "attributes.spotType", "sources[0].url"]) {
  assert.ok(!new RegExp(schema.$defs.source.properties.supports.items.pattern).test(invalidPath), `${invalidPath} must be an invalid supports path`);
}

const unknownWithSupporting = structuredClone(example);
unknownWithSupporting.attributes.waterDepth.status = "unknown";
unknownWithSupporting.attributes.waterDepth.value = "unknown";
unknownWithSupporting.attributes.waterDepth.confidence = "low";
unknownWithSupporting.attributes.waterDepth.evidenceSources.supportingSourceIds = [example.sources[0].id];
assert.ok(validateRecord(unknownWithSupporting).some((error) => error.includes("unknown status must not have supporting sources")));

const duplicateEvidenceRole = structuredClone(example);
duplicateEvidenceRole.attributes.seabed.evidenceSources.checkedSourceIds = [duplicateEvidenceRole.attributes.seabed.evidenceSources.supportingSourceIds[0]];
assert.ok(validateRecord(duplicateEvidenceRole).some((error) => error.includes("duplicate source id")));
}

const invalidEnum = structuredClone(example);
invalidEnum.attributes.tidalFlow.value = "very_strong";
assert.ok(
  validateRecord(invalidEnum).some((error) => error.includes("outside enum")),
  "enum values outside the schema must be rejected",
);

const missingRequired = structuredClone(example);
delete missingRequired.identity.spotName;
assert.ok(
  validateRecord(missingRequired).some((error) => error.includes("missing required property spotName")),
  "missing required fields must be rejected",
);

const unknownSource = structuredClone(example);
if (unknownSource.attributes.seabed.evidenceSources) {
  unknownSource.attributes.seabed.evidenceSources.supportingSourceIds = ["src-does-not-exist"];
} else {
  unknownSource.attributes.seabed.sourceIds = ["src-does-not-exist"];
}
assert.ok(
  validateRecord(unknownSource).some((error) => error.includes("unknown source id")),
  "unregistered sourceIds must be rejected",
);

const inconsistentUnknown = structuredClone(example);
inconsistentUnknown.attributes.waterDepth.status = "unknown";
inconsistentUnknown.attributes.waterDepth.confidence = "high";
inconsistentUnknown.attributes.waterDepth.value = "deep";
assert.ok(
  validateRecord(inconsistentUnknown).length > 0,
  "unknown attributes must use low confidence and the unknown value",
);

console.log("Fishing spot research schema checks passed.");
