import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spotIds = [
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
  "attributes.spotType.value",
]);

function readRecord(spotId) {
  const filePath = path.join(ROOT, "data/research/fishing-spots", `${spotId}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

for (const spotId of spotIds) {
  const record = readRecord(spotId);

  assert.equal(record.reviewStatus, "needs_revision", `${spotId} must remain needs_revision during source re-audit`);
  assert.equal(record.researchStages.officialResearch, "incomplete", `${spotId} official research must not be marked complete before source replacement`);

  for (const source of record.sources) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:", `${spotId}/${source.id} must use HTTPS`);
    assert.ok(!placeholderHosts.has(url.hostname), `${spotId}/${source.id} must not use a placeholder host`);
    assert.ok(!url.hostname.endsWith(".example.com"), `${spotId}/${source.id} must not use an example.com subdomain`);

    if (source.publisher === "国土地理院" && source.sourceType === "public_map") {
      for (const support of source.supports) {
        assert.ok(gsiAllowedSupports.has(support), `${spotId}/${source.id} overclaims GSI map support: ${support}`);
      }
    }
  }

  for (const [attributeName, attribute] of Object.entries(record.attributes)) {
    if (attributeName === "spotType") continue;
    assert.equal(attribute.status, "unknown", `${spotId} must not infer ${attributeName} from the map-only audit`);
    assert.deepEqual(attribute.evidenceSources.supportingSourceIds, [], `${spotId}/${attributeName} unknown value must have no supporting source`);
  }

  for (const [facilityName, facility] of Object.entries(record.facilities)) {
    assert.equal(facility.status, "unknown", `${spotId} must not infer facility ${facilityName}`);
  }

  for (const [restrictionName, restriction] of Object.entries(record.restrictions)) {
    if (restrictionName === "officialContact") continue;
    assert.equal(restriction.status, "unknown", `${spotId} must not infer restriction ${restrictionName}`);
  }
}

console.log("Issue #165 source quality checks passed.");
