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

const ISSUE_294_IDS = new Set(["karatsu-east-port", "maetsuyoshi-fishing-port"]);
const EXPECTED_CORRECTIONS = new Map([
  ["nokita-beach", [33.6048, 130.1552]],
  ["kishi-port", [33.56817019, 130.12709036]],
  ["fukuyoshi-port", [33.50788331, 130.0927193]],
  ["niji-matsubara", [33.4472, 130.0207]],
  ["karatsu-west-port", [33.4662, 129.9488]],
  ["hatazu-fishing-port", [33.37750645, 129.86504185]],
  ["nabegushi-fishing-port", [33.40073617, 129.81105386]],
  ["takashima-area", [33.4246, 129.7555]],
  ["kabeshima-port", [33.54630411, 129.88236479]],
  ["tobo-port", [33.48814255, 129.94840955]],
  ["usukawan-fishing-port", [33.372715, 129.541075]],
  ["hoki-fishing-port", [33.304112, 129.519135]],
  ["miyanoura-fishing-port", [33.18959444, 129.3560002]],
] as const);

const EXPECTED_ISSUE_294 = new Map([
  ["karatsu-east-port", [33.469823, 129.963189]],
  ["maetsuyoshi-fishing-port", [33.21062, 129.45292]],
] as const);

type AuditSpot = {
  id: string;
  name: string;
  area: string;
  previous: [number, number, string];
  adopted: [number, number, string];
  decision: "corrected" | "retained";
  displacementKm: number;
  basis: string;
  reasonCode: string;
  c09?: [string, string, number, number, number];
  evidence?: [string, number, number];
  sourceUrls?: string[];
};

type Audit = {
  issue: number;
  auditedAt: string;
  scope: {
    master: number;
    audited: number;
    excludedIssue294: string[];
    corrected: number;
    retained: number;
  };
  policy: { bounds: [number, number, number, number]; notGuaranteed: string[] };
  reasonCodes: Record<string, string>;
  sources: Record<string, { url?: string }>;
  spots: AuditSpot[];
};

const audit = JSON.parse(
  fs.readFileSync("data/curation/fishing-spots/issue-296-coordinate-audit.json", "utf8"),
) as Audit;
const migration = fs.readFileSync(
  "supabase/migrations/20260725110000_fix_issue_296_remaining_spot_coordinates.sql",
  "utf8",
);

assert.equal(audit.issue, 296);
assert.match(audit.auditedAt, /^2026-07-25$/);
assert.deepEqual(audit.scope, {
  master: 52,
  audited: 50,
  excludedIssue294: ["karatsu-east-port", "maetsuyoshi-fishing-port"],
  corrected: 13,
  retained: 37,
});
assert.equal(fishingSpots.length, 52);
assert.equal(new Set(fishingSpots.map((spot) => spot.id)).size, 52);
assert.equal(audit.spots.length, 50);
assert.equal(new Set(audit.spots.map((spot) => spot.id)).size, 50);
assert.deepEqual(
  new Set(audit.spots.map((spot) => spot.id)),
  new Set(fishingSpots.filter((spot) => !ISSUE_294_IDS.has(spot.id)).map((spot) => spot.id)),
);
assert.ok(audit.spots.every((spot) => !ISSUE_294_IDS.has(spot.id)));

const correctedAuditSpots = audit.spots.filter((spot) => spot.decision === "corrected");
const retainedAuditSpots = audit.spots.filter((spot) => spot.decision === "retained");
assert.deepEqual(new Set(correctedAuditSpots.map((spot) => spot.id)), new Set(EXPECTED_CORRECTIONS.keys()));
assert.equal(retainedAuditSpots.length, 37);

const expectedOverrideIds = new Set([
  ...EXPECTED_ISSUE_294.keys(),
  ...EXPECTED_CORRECTIONS.keys(),
]);
assert.deepEqual(new Set(Object.keys(fishingSpotCoordinateOverrides)), expectedOverrideIds);

const corrected = applyFishingSpotCoordinateOverrides(fishingSpots);
assert.equal(corrected.length, 52);
assert.equal(new Set(corrected.map((spot) => spot.id)).size, 52);

function withoutCoordinates<T extends { latitude: number; longitude: number; coordinatePrecision: string }>(spot: T) {
  const { latitude: _latitude, longitude: _longitude, coordinatePrecision: _precision, ...rest } = spot;
  return rest;
}

for (const auditSpot of audit.spots) {
  const original = fishingSpots.find((spot) => spot.id === auditSpot.id);
  const current = corrected.find((spot) => spot.id === auditSpot.id);
  assert.ok(original, `${auditSpot.id} must exist in bundled master`);
  assert.ok(current, `${auditSpot.id} must exist after coordinate overrides`);
  assert.deepEqual(
    [original.latitude, original.longitude, original.coordinatePrecision],
    auditSpot.previous,
    `${auditSpot.id} audit previous coordinates must match the bundled row`,
  );
  assert.deepEqual(
    [current.latitude, current.longitude, current.coordinatePrecision],
    auditSpot.adopted,
    `${auditSpot.id} runtime coordinates must match the audit adoption`,
  );
  assert.deepEqual(withoutCoordinates(current), withoutCoordinates(original), `${auditSpot.id} non-coordinate fields must not change`);

  if (auditSpot.decision === "corrected") {
    const expected = EXPECTED_CORRECTIONS.get(auditSpot.id as keyof typeof fishingSpotCoordinateOverrides);
    assert.ok(expected);
    assert.deepEqual(auditSpot.adopted, [expected[0], expected[1], "approximate"]);
    assert.ok(auditSpot.displacementKm >= 1, `${auditSpot.id} correction must address a material displacement`);
  } else {
    assert.deepEqual(auditSpot.adopted, auditSpot.previous, `${auditSpot.id} retained coordinates must stay unchanged`);
    assert.equal(auditSpot.displacementKm, 0);
  }

  assert.ok(audit.reasonCodes[auditSpot.reasonCode], `${auditSpot.id} must use a documented reason code`);
  if (auditSpot.sourceUrls) {
    assert.ok(auditSpot.sourceUrls.length > 0);
    assert.ok(auditSpot.sourceUrls.every((url) => url.startsWith("https://")));
  }

  if (auditSpot.c09) {
    const [, , c09Latitude, c09Longitude, c09Distance] = auditSpot.c09;
    assert.ok(c09Latitude >= 30 && c09Latitude <= 36);
    assert.ok(c09Longitude >= 127 && c09Longitude <= 132);
    if (auditSpot.reasonCode === "C09_CORRECTED_OVER_1KM") {
      assert.ok(c09Distance > 1);
      assert.deepEqual(auditSpot.adopted.slice(0, 2), [c09Latitude, c09Longitude]);
    }
    if (auditSpot.reasonCode === "C09_WITHIN_1KM") assert.ok(c09Distance <= 1);
    if (auditSpot.reasonCode === "C09_EXACT") assert.equal(c09Distance, 0);
  }
}

for (const [spotId, expected] of EXPECTED_ISSUE_294) {
  const spot = corrected.find((candidate) => candidate.id === spotId);
  assert.ok(spot);
  assert.deepEqual([spot.latitude, spot.longitude, spot.coordinatePrecision], [expected[0], expected[1], "approximate"]);
}

const runtimeSpots = getStaticMasterData().fishingSpots;
assert.equal(runtimeSpots.length, 52);
const [minLatitude, maxLatitude, minLongitude, maxLongitude] = audit.policy.bounds;
for (const spot of runtimeSpots) {
  assert.ok(spot.latitude >= minLatitude && spot.latitude <= maxLatitude, `${spot.id} latitude outside audit bounds`);
  assert.ok(spot.longitude >= minLongitude && spot.longitude <= maxLongitude, `${spot.id} longitude outside audit bounds`);
  assert.ok(spot.latitude < spot.longitude, `${spot.id} coordinates appear reversed`);
}

for (const [spotId, expected] of EXPECTED_CORRECTIONS) {
  const spot = runtimeSpots.find((candidate) => candidate.id === spotId);
  assert.ok(spot);
  const mapEntry = buildFishingSpotMapEntries(runtimeSpots).find((entry) => entry.spot.id === spotId);
  assert.ok(mapEntry);
  assert.deepEqual(mapEntry.coordinates, [expected[1], expected[0]]);
  assert.deepEqual(toEnvironmentPoint(spot), {
    spotId,
    spotName: spot.name,
    latitude: expected[0],
    longitude: expected[1],
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
    assert.equal(params.get("latitude"), String(expected[0]));
    assert.equal(params.get("longitude"), String(expected[1]));
  }
}

const migrationIds = [...migration.matchAll(/\('([a-z0-9-]+)'::text/g)].map((match) => match[1]);
assert.deepEqual(new Set(migrationIds), new Set(EXPECTED_CORRECTIONS.keys()));
assert.equal(migrationIds.length, EXPECTED_CORRECTIONS.size);
assert.match(migration, /matched_count <> 13/i);
assert.match(migration, /where spot\.id = corrected\.id/i);
assert.match(migration, /coordinate_precision = 'approximate'/i);
assert.doesNotMatch(migration, /delete\s+from|drop\s+(?:table|column)|truncate\s+/i);
for (const [spotId, expected] of EXPECTED_CORRECTIONS) {
  assert.match(migration, new RegExp(`'${spotId}'`));
  assert.match(migration, new RegExp(String(expected[0]).replace(".", "\\.")));
  assert.match(migration, new RegExp(String(expected[1]).replace(".", "\\.")));
}

assert.ok(audit.policy.notGuaranteed.includes("実釣位置"));
assert.ok(audit.policy.notGuaranteed.includes("立入可能範囲"));
assert.ok(audit.sources["mlit-c09"]?.url?.startsWith("https://"));
assert.ok(audit.sources.gsi?.url?.startsWith("https://"));

console.log("Issue #296 remaining coordinate audit tests passed");
