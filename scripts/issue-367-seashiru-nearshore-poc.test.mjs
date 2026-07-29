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
const livePocUrl = new URL("../data/research/seashiru/karatsu-east-port-nearshore.poc.json", import.meta.url);
const livePocText = await readFile(livePocUrl, "utf8");
const livePoc = JSON.parse(livePocText);

test("Issue #367 uses the eligible Issue #365 coastal reference segment", () => {
  assert.ok(reference);
  assert.equal(reference.distanceReferenceStatus, "eligible");
  assert.equal(reference.geometry.type, "LineString");
  assert.ok(reference.geometry.coordinates.length >= 2);
  assert.notDeepEqual(reference.geometry.coordinates, [[129.965, 33.468967], [129.965, 33.471033]]);
});

test("Issue #367 SeaShiru configuration contains no key and covers point/polygon seabed obstructions", () => {
  assert.ok(DATASETS.length >= 10);
  for (const dataset of DATASETS) {
    assert.match(dataset.baseUrl, /^https:\/\/api\.msil\.go\.jp\//);
    assert.ok([1, 3].includes(dataset.layer));
    assert.equal("subscriptionKey" in dataset, false);
    assert.equal("key" in dataset, false);
  }
  assert.ok(DATASETS.some((dataset) => dataset.id === "seabed-obstruction-point" && dataset.layer === 1));
  assert.ok(DATASETS.some((dataset) => dataset.id === "seabed-obstruction-area" && dataset.layer === 3));
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
  const line = [[129.0, 33.0], [129.001, 33.0]];
  const onLine = { type: "Point", coordinates: [129.0005, 33.0] };
  const north = { type: "Point", coordinates: [129.0005, 33.00045] };
  assert.ok(minGeometryDistanceToReference(onLine, line) < 0.1);
  const distance = minGeometryDistanceToReference(north, line);
  assert.ok(distance > 49 && distance < 51.5, `expected about 50m, got ${distance}`);
});

test("polygon containing the reference segment has zero nearshore distance", () => {
  const line = [[129.0, 33.0], [129.001, 33.0]];
  const polygon = {
    type: "Polygon",
    coordinates: [[
      [128.9995, 32.9995], [129.0015, 32.9995], [129.0015, 33.0005],
      [128.9995, 33.0005], [128.9995, 32.9995],
    ]],
  };
  assert.equal(minGeometryDistanceToReference(polygon, line), 0);
});

test("dataset summary keeps over-150m features out and counts exact distance bands", () => {
  const line = [[129.0, 33.0], [129.001, 33.0]];
  const features = [
    { type: "Feature", properties: { name: "near" }, geometry: { type: "Point", coordinates: [129.0005, 33.000225] } },
    { type: "Feature", properties: { name: "mid" }, geometry: { type: "Point", coordinates: [129.0005, 33.000675] } },
    { type: "Feature", properties: { name: "far" }, geometry: { type: "Point", coordinates: [129.0005, 33.001125] } },
    { type: "Feature", properties: { name: "outside" }, geometry: { type: "Point", coordinates: [129.0005, 33.0018] } },
  ];
  const summary = summarizeDataset({ dataset: { id: "synthetic", group: "test", label: "synthetic", layer: 1 }, features, referenceCoordinates: line });
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

test("Issue #367 live PoC snapshot is secret-free and records successful API results", () => {
  assert.equal(livePoc.issue, 367);
  assert.equal(livePoc.spotId, "karatsu-east-port");
  assert.equal(livePoc.reference.segmentId, "east-port-green-revetment-reference-01");
  assert.equal(livePoc.query.maxDistanceFromShoreM, 150);
  assert.ok(livePoc.datasets.length >= 10);
  assert.ok(livePoc.datasets.every((dataset) => dataset.status === "ok"));
  assert.equal(livePocText.includes("SEASHIRU_SUBSCRIPTION_KEY"), false);
  assert.equal(livePocText.includes("Ocp-Apim-Subscription-Key"), false);
  assert.equal(/\b[a-fA-F0-9]{24,}\b/.test(livePocText), false);
});

test("Issue #367 live PoC records one nearshore stone point and two ESI lines", () => {
  const stone = livePoc.datasets.find((dataset) => dataset.id === "bottom-stone-rock");
  assert.ok(stone);
  assert.equal(stone.fetchedFeatureCount, 1);
  assert.equal(stone.nearshoreFeatureCount, 1);
  assert.deepEqual(stone.distanceBands, { "0-50": 1, "50-100": 0, "100-150": 0 });
  assert.equal(stone.nearestDistanceM, 10.3);
  assert.equal(stone.records[0].properties.nature, "石");

  const obstructionArea = livePoc.datasets.find((dataset) => dataset.id === "seabed-obstruction-area");
  assert.ok(obstructionArea);
  assert.equal(obstructionArea.fetchedFeatureCount, 1);
  assert.equal(obstructionArea.nearshoreFeatureCount, 0);

  const esi = livePoc.datasets.find((dataset) => dataset.id === "esi-coastline");
  assert.ok(esi);
  assert.equal(esi.fetchedFeatureCount, 2);
  assert.equal(esi.nearshoreFeatureCount, 2);
  assert.deepEqual(esi.distanceBands, { "0-50": 1, "50-100": 0, "100-150": 1 });
  assert.equal(esi.records[0].properties["海岸地形"], "人工海岸(防波堤・護岸・埠頭等)");
});
