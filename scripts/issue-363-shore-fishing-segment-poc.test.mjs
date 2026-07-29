import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pocUrl = new URL("../data/research/shore-fishing-segments/karatsu-east-port.poc.json", import.meta.url);
const schemaUrl = new URL("../data/research/shore-fishing-segments/schema.v1.json", import.meta.url);
const data = JSON.parse(await readFile(pocUrl, "utf8"));
const schema = JSON.parse(await readFile(schemaUrl, "utf8"));

const CURRENT_KARATSU_EAST_PORT = {
  latitude: 33.469823,
  longitude: 129.963189,
};

const haversineMeters = (a, b) => {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
};

const polylineLengthMeters = (coordinates) => {
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    total += haversineMeters(
      { longitude: coordinates[index - 1][0], latitude: coordinates[index - 1][1] },
      { longitude: coordinates[index][0], latitude: coordinates[index][1] },
    );
  }
  return total;
};

test("Issue #363 PoC keeps physical shore, access, and fishing use separate", () => {
  assert.equal(data.schemaVersion, "1.0.0");
  assert.equal(data.spotId, "karatsu-east-port");
  assert.ok(Array.isArray(data.segments) && data.segments.length >= 1);
  assert.ok(Array.isArray(data.sources) && data.sources.length >= 1);

  const sourceIds = new Set(data.sources.map((source) => source.id));

  for (const segment of data.segments) {
    assert.equal(segment.geometry.type, "LineString");
    assert.ok(segment.geometry.coordinates.length >= 2);
    assert.ok(["confirmed", "likely", "candidate", "unknown"].includes(segment.physicalState));
    assert.ok(["confirmed", "likely", "prohibited", "unknown"].includes(segment.publicAccessStatus));
    assert.ok(["confirmed", "observed", "prohibited", "unknown"].includes(segment.fishingUseStatus));
    assert.ok(["eligible", "not_eligible", "unknown"].includes(segment.distanceReferenceStatus));
    assert.ok(["high", "medium", "low"].includes(segment.confidence));
    assert.ok(segment.sourceIds.length >= 1);
    assert.ok(segment.sourceIds.every((sourceId) => sourceIds.has(sourceId)));

    for (const coordinate of segment.geometry.coordinates) {
      assert.equal(coordinate.length, 2);
      const [longitude, latitude] = coordinate;
      assert.ok(longitude >= 122 && longitude <= 154, "longitude must be first and within Japan bounds");
      assert.ok(latitude >= 20 && latitude <= 46, "latitude must be second and within Japan bounds");
    }

    const [first, last] = segment.geometry.coordinates;
    const midpoint = {
      longitude: (first[0] + last[0]) / 2,
      latitude: (first[1] + last[1]) / 2,
    };
    assert.ok(
      haversineMeters(CURRENT_KARATSU_EAST_PORT, midpoint) < 500,
      "PoC segment must stay near the current main representative coordinate, not the obsolete SeaShiru PoC center",
    );
  }
});

test("Issue #365 does not couple coastal distance eligibility to fishing permission", () => {
  const segmentProperties = schema.$defs.segment.properties;

  assert.ok(segmentProperties.fishingUseStatus.enum.includes("unknown"));
  assert.ok(segmentProperties.distanceReferenceStatus.enum.includes("eligible"));
  assert.equal(schema.$defs.segment.if, undefined);
  assert.equal(schema.$defs.segment.then, undefined);
  assert.equal(schema.$defs.segment.dependentSchemas, undefined);

  const coastalReference = data.segments.find(
    (segment) => segment.segmentId === "east-port-green-revetment-reference-01",
  );
  assert.ok(coastalReference, "Issue #365 must retain the adopted coastal reference segment");
  assert.equal(coastalReference.geometryStatus, "approximate");
  assert.equal(coastalReference.distanceReferenceStatus, "eligible");
  assert.equal(coastalReference.physicalType, "revetment");
  assert.equal(coastalReference.physicalState, "confirmed");
  assert.equal(coastalReference.publicAccessStatus, "unknown");
  assert.equal(coastalReference.fishingUseStatus, "unknown");
  assert.equal(coastalReference.confidence, "medium");

  const lengthM = polylineLengthMeters(coastalReference.geometry.coordinates);
  assert.ok(lengthM >= 139 && lengthM <= 142, `expected coastal reference length near 140m, got ${lengthM}`);
});

await import("./issue-367-seashiru-nearshore-poc.test.mjs");
