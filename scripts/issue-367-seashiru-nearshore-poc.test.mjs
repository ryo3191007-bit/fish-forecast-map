import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DATASETS,
  buildSearchEnvelope,
  distanceBand,
  minGeometryDistanceToReference,
  summarizeDataset,
} from "./issue-367-seashiru-nearshore-poc.mjs";

const shoreData = JSON.parse(
  await readFile(new URL("../data/research/shore-fishing-segments/karatsu-east-port.poc.json", import.meta.url), "utf8"),
);
const reference = shoreData.segments.find((segment) => segment.segmentId === "east-port-green-revetment-reference-01");

test("Issue #367 uses the eligible Issue #365 coastal reference segment", () => {
  assert.ok(reference);
  assert.equal(reference.distanceReferenceStatus, "eligible");
  assert.equal(reference.geometry.type, "LineString");
  assert.ok(reference.geometry.coordinates.length >= 2);
  assert.notDeepEqual(reference.geometry.coordinates, [
    [129.965, 33.468967],
    [129.965, 33.471033],
  ]);
});

test("Issue #367 SeaShiru configuration never contains a subscription key", () => {
  assert.ok(DATASETS.length >= 9);
  for (const dataset of DATASETS) {
    assert.match(dataset.baseUrl, /^https:\/\/api\.msil\.go\.jp\//);
    assert.equal(dataset.layer, 1);
    assert.equal("subscriptionKey" in dataset, false);
    assert.equal("key" in dataset, false);
  }
});

test("nearshore distance bands use 0-50, 50-100, and 100-150m", () => {
  assert.equal(distanceBand(0), "0-50");
  assert.equal(distanceBand(49.9), "0-50");
  assert.equal(distanceBand(50), "50-100");
  assert.equal(distanceBand(99.9), "50-100");
  assert.equal(distanceBand(100), "100-150");
  assert.equal(distanceBand(150), "100-150");
  assert.equal(distanceBand(150.1), null);
});

test("geometry distance is measured against the LineString rather than the representative point", () => {
  const line = [
    [129.0, 33.0],
    [129.001, 33.0],
  ];
  const onLine = { type: "Point", coordinates: [129.0005, 33.0] };
  const north = { type: "Point", coordinates: [129.0005, 33.00045] };
  assert.ok(minGeometryDistanceToReference(onLine, line) < 0.1);
  const distance = minGeometryDistanceToReference(north, line);
  assert.ok(distance > 49 && distance < 51.5, `expected about 50m, got ${distance}`);
});

test("dataset summary keeps over-150m features out and counts exact distance bands", () => {
  const line = [
    [129.0, 33.0],
    [129.001, 33.0],
  ];
  const features = [
    { type: "Feature", properties: { name: "near" }, geometry: { type: "Point", coordinates: [129.0005, 33.000225] } },
    { type: "Feature", properties: { name: "mid" }, geometry: { type: "Point", coordinates: [129.0005, 33.000675] } },
    { type: "Feature", properties: { name: "far" }, geometry: { type: "Point", coordinates: [129.0005, 33.001125] } },
    { type: "Feature", properties: { name: "outside" }, geometry: { type: "Point", coordinates: [129.0005, 33.0018] } },
  ];
  const summary = summarizeDataset({
    dataset: { id: "synthetic", group: "test", label: "synthetic" },
    features,
    referenceCoordinates: line,
  });
  assert.equal(summary.nearshoreFeatureCount, 3);
  assert.deepEqual(summary.distanceBands, { "0-50": 1, "50-100": 1, "100-150": 1 });
  assert.equal(summary.records.some((record) => record.properties.name === "outside"), false);
});

test("search envelope expands beyond every reference-segment vertex", () => {
  const envelope = buildSearchEnvelope(reference.geometry.coordinates, 175);
  const [minLon, minLat, maxLon, maxLat] = envelope;
  for (const [lon, lat] of reference.geometry.coordinates) {
    assert.ok(lon > minLon && lon < maxLon);
    assert.ok(lat > minLat && lat < maxLat);
  }
});
