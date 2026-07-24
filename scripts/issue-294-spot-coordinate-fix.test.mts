import assert from "node:assert/strict";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import {
  applyFishingSpotCoordinateOverrides,
  fishingSpotCoordinateOverrides,
} from "../src/data/fishingSpotCoordinateOverrides";
import { getStaticMasterData } from "../src/lib/masterDataRepository";
import {
  buildFishingSpotMapEntries,
  toEnvironmentPoint,
} from "../src/domain/fishingSpotPresentation";
import { fetchFishingEnvironment } from "../src/services/openMeteo";

const TARGET_SPOT_IDS = ["karatsu-east-port", "maetsuyoshi-fishing-port"] as const;
type TargetSpotId = (typeof TARGET_SPOT_IDS)[number];
type ExpectedCoordinate = { latitude: number; longitude: number };

const EXPECTED = new Map<TargetSpotId, ExpectedCoordinate>([
  ["karatsu-east-port", { latitude: 33.469823, longitude: 129.963189 }],
  ["maetsuyoshi-fishing-port", { latitude: 33.21062, longitude: 129.45292 }],
]);

function getExpectedCoordinate(spotId: string): ExpectedCoordinate | undefined {
  return TARGET_SPOT_IDS.includes(spotId as TargetSpotId)
    ? EXPECTED.get(spotId as TargetSpotId)
    : undefined;
}

type AuditSpot = {
  spotId: string;
  previousCoordinates: { latitude: number; longitude: number };
  adoptedCoordinates: { latitude: number; longitude: number };
  coordinatePrecision: string;
  validationBounds: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
  };
  sources: Array<{ sourceType: string; relation: string; sourceUrl: string }>;
};

type Audit = {
  issue: number;
  researchedAt: string;
  spots: AuditSpot[];
};

const audit = JSON.parse(
  fs.readFileSync(
    "data/curation/fishing-spots/issue-294-coordinate-audit.json",
    "utf8",
  ),
) as Audit;
const migration = fs.readFileSync(
  "supabase/migrations/20260725090000_fix_issue_294_spot_coordinates.sql",
  "utf8",
);

assert.equal(fishingSpots.length, 52);
assert.equal(new Set(fishingSpots.map((spot) => spot.id)).size, 52);
for (const spotId of EXPECTED.keys()) {
  assert.ok(fishingSpotCoordinateOverrides[spotId], `${spotId} override must remain defined`);
}

const corrected = applyFishingSpotCoordinateOverrides(fishingSpots);
assert.equal(corrected.length, fishingSpots.length);
assert.equal(new Set(corrected.map((spot) => spot.id)).size, fishingSpots.length);
for (const [spotId, expected] of EXPECTED) {
  const current = corrected.find((spot) => spot.id === spotId);
  assert.ok(current);
  assert.deepEqual(
    [current.latitude, current.longitude, current.coordinatePrecision],
    [expected.latitude, expected.longitude, "approximate"],
  );
}

const runtimeSpots = getStaticMasterData().fishingSpots;
assert.equal(runtimeSpots.length, 52);

for (const [spotId, expected] of EXPECTED) {
  const spot = runtimeSpots.find((candidate) => candidate.id === spotId);
  assert.ok(spot, `${spotId} must remain in the runtime master`);
  assert.deepEqual(
    [spot.latitude, spot.longitude, spot.coordinatePrecision],
    [expected.latitude, expected.longitude, "approximate"],
  );

  const mapEntry = buildFishingSpotMapEntries(runtimeSpots).find(
    (entry) => entry.spot.id === spotId,
  );
  assert.ok(mapEntry);
  assert.deepEqual(mapEntry.coordinates, [expected.longitude, expected.latitude]);
  assert.deepEqual(toEnvironmentPoint(spot), {
    spotId,
    spotName: spot.name,
    latitude: expected.latitude,
    longitude: expected.longitude,
  });

  const requestedUrls: string[] = [];
  await fetchFishingEnvironment(toEnvironmentPoint(spot), {
    storage: null,
    now: () => new Date("2026-07-25T00:00:00Z"),
    fetchImpl: async (input: string) => {
      requestedUrls.push(input);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          hourly: {
            time: ["2026-07-25T00:00"],
            temperature_2m: [25],
            wave_height: [0.5],
          },
        }),
      };
    },
  });
  assert.ok(requestedUrls.length > 0);
  for (const url of requestedUrls) {
    const params = new URL(url).searchParams;
    assert.equal(params.get("latitude"), String(expected.latitude));
    assert.equal(params.get("longitude"), String(expected.longitude));
  }
}

assert.equal(audit.issue, 294);
assert.match(audit.researchedAt, /^2026-07-25$/);
assert.deepEqual(new Set(audit.spots.map((spot) => spot.spotId)), new Set(EXPECTED.keys()));

for (const auditSpot of audit.spots) {
  const expected = getExpectedCoordinate(auditSpot.spotId);
  assert.ok(expected);
  assert.deepEqual(auditSpot.adoptedCoordinates, expected);
  assert.equal(auditSpot.coordinatePrecision, "approximate");
  assert.ok(
    expected.latitude >= auditSpot.validationBounds.minLatitude
      && expected.latitude <= auditSpot.validationBounds.maxLatitude,
  );
  assert.ok(
    expected.longitude >= auditSpot.validationBounds.minLongitude
      && expected.longitude <= auditSpot.validationBounds.maxLongitude,
  );
  assert.ok(
    auditSpot.previousCoordinates.latitude < auditSpot.validationBounds.minLatitude
      || auditSpot.previousCoordinates.latitude > auditSpot.validationBounds.maxLatitude
      || auditSpot.previousCoordinates.longitude < auditSpot.validationBounds.minLongitude
      || auditSpot.previousCoordinates.longitude > auditSpot.validationBounds.maxLongitude,
    `${auditSpot.spotId} previous coordinates should be outside the validated port-area bounds`,
  );
  assert.ok(auditSpot.sources.some((source) => source.sourceType === "official" && source.relation === "supporting"));
  assert.ok(auditSpot.sources.some((source) => source.sourceType === "public_map" && source.relation === "checked"));
  assert.ok(auditSpot.sources.every((source) => source.sourceUrl.startsWith("https://")));
}

for (const [spotId, expected] of EXPECTED) {
  assert.match(migration, new RegExp(`'${spotId}'`));
  assert.match(migration, new RegExp(String(expected.latitude).replace(".", "\\.")));
  assert.match(migration, new RegExp(String(expected.longitude).replace(".", "\\.")));
}
assert.match(migration, /where spot\.id = corrected\.id/i);
assert.match(migration, /coordinate_precision = 'approximate'/i);
assert.doesNotMatch(migration, /delete\s+from|drop\s+(?:table|column)|truncate\s+/i);

const migrationIds = [...migration.matchAll(/'([a-z0-9-]+)'/g)]
  .map((match) => match[1])
  .filter((id) => id.endsWith("port"));
assert.deepEqual(new Set(migrationIds), new Set(EXPECTED.keys()));

console.log("Issue #294 spot coordinate correction tests passed");
