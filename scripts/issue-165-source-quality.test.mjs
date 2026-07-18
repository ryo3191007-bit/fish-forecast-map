import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spotIds = [
  "fukushima-area",
  "hirado-seto",
  "ikitsuki-area",
  "keya-gate",
  "nokita-beach",
  "kishi-port",
  "fukuyoshi-port",
  "hamasaki-beach",
  "niji-matsubara",
  "karatsu-west-port",
  "yobuko-area",
  "imari-inner-bay",
  "takashima-area",
  "tabira-port",
];
const placeholderHosts = new Set(["example.com", "example.org", "example.net"]);
const gsiAllowedSupports = new Set([
  "identity.coordinates.latitude",
  "identity.coordinates.longitude",
]);
const resolvedAttributes = new Map([
  ["nokita-beach", { spotType: { value: ["sandy_beach"], status: "confirmed", confidence: "medium" } }],
  ["kishi-port", { spotType: { value: ["fishing_port"], status: "confirmed", confidence: "medium" } }],
  ["fukuyoshi-port", { spotType: { value: ["fishing_port"], status: "confirmed", confidence: "medium" } }],
  ["hamasaki-beach", { spotType: { value: ["sandy_beach"], status: "confirmed", confidence: "medium" } }],
  ["karatsu-west-port", { spotType: { value: ["port"], status: "confirmed", confidence: "medium" } }],
  ["imari-inner-bay", { openSeaExposure: { value: "inner_bay", status: "confirmed", confidence: "medium" } }],
  ["tabira-port", { spotType: { value: ["port"], status: "confirmed", confidence: "medium" } }],
]);

function readRecord(spotId) {
  const filePath = path.join(ROOT, "data/research/fishing-spots", `${spotId}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isDisallowedListingUrl(url) {
  return /\/topics\/topics_[^/]+\.html$/i.test(url.pathname);
}

for (const spotId of spotIds) {
  const record = readRecord(spotId);
  const expectedResolved = resolvedAttributes.get(spotId) ?? {};

  assert.equal(record.reviewStatus, "draft", `${spotId} must remain draft after official-source review`);
  assert.equal(record.researchStages.officialResearch, "completed", `${spotId} official research must be completed`);
  assert.equal(record.researchStages.secondaryResearch, "incomplete", `${spotId} secondary research must remain incomplete`);
  assert.equal(record.researchStages.schemaValidation, "passed", `${spotId} schema validation status must record the successful CI result`);
  assert.ok(record.sources.some((source) => source.sourceType === "government"), `${spotId} needs at least one official government source`);

  if (["fukushima-area", "hirado-seto", "ikitsuki-area"].includes(spotId)) {
    for (const source of record.sources) {
      assert.ok(!source.supports.includes("identity.spotName"), `${spotId}/${source.id} must not support internal canonical spotName unless the source directly states it`);
    }
  }

  if (spotId === "keya-gate") {
    const culturalMonumentsSource = record.sources.find((source) => source.id === "src-keya-gate-cultural-monuments");
    assert.ok(culturalMonumentsSource, "keya-gate must keep the cultural-monuments source as checked official context");
    assert.ok(!culturalMonumentsSource.supports.includes("identity.spotName"), "keya-gate cultural-monuments source must not support internal canonical spotName");
  }

  for (const source of record.sources) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:", `${spotId}/${source.id} must use HTTPS`);
    assert.ok(!placeholderHosts.has(url.hostname), `${spotId}/${source.id} must not use a placeholder host`);
    assert.ok(!url.hostname.endsWith(".example.com"), `${spotId}/${source.id} must not use an example.com subdomain`);
    assert.ok(!isDisallowedListingUrl(url), `${spotId}/${source.id} must not register a topics listing page`);

    if (source.publisher === "国土地理院" && source.sourceType === "public_map") {
      for (const support of source.supports) {
        assert.ok(gsiAllowedSupports.has(support), `${spotId}/${source.id} overclaims GSI map support: ${support}`);
      }
    }
  }

  for (const [attributeName, attribute] of Object.entries(record.attributes)) {
    const expected = expectedResolved[attributeName];
    if (expected) {
      assert.deepEqual(attribute.value, expected.value, `${spotId}/${attributeName} resolved value mismatch`);
      assert.equal(attribute.status, expected.status, `${spotId}/${attributeName} resolved status mismatch`);
      assert.equal(attribute.confidence, expected.confidence, `${spotId}/${attributeName} resolved confidence mismatch`);
      assert.ok(attribute.evidenceSources.supportingSourceIds.length > 0, `${spotId}/${attributeName} resolved value needs supporting sources`);
      continue;
    }
    assert.equal(attribute.status, "unknown", `${spotId} must keep unresolved ${attributeName} unknown`);
    assert.equal(attribute.confidence, "low", `${spotId}/${attributeName} unknown value must be low confidence`);
    assert.deepEqual(attribute.evidenceSources.supportingSourceIds, [], `${spotId}/${attributeName} unknown value must have no supporting source`);
  }

  for (const [facilityName, facility] of Object.entries(record.facilities)) {
    assert.equal(facility.status, "unknown", `${spotId} must not infer facility ${facilityName}`);
    assert.deepEqual(facility.evidenceSources.supportingSourceIds, [], `${spotId}/${facilityName} unknown facility must have no supporting source`);
  }

  for (const [restrictionName, restriction] of Object.entries(record.restrictions)) {
    if (restrictionName === "officialContact") continue;
    assert.equal(restriction.status, "unknown", `${spotId} must not infer restriction ${restrictionName}`);
    assert.deepEqual(restriction.evidenceSources.supportingSourceIds, [], `${spotId}/${restrictionName} unknown restriction must have no supporting source`);
  }

  assert.deepEqual(record.fishSpecies, [], `${spotId} must not add fish species without dated, spot-specific evidence`);
}

console.log("Issue #165/#172 source quality checks passed.");
