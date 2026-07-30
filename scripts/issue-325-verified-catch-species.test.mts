import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fishSpeciesNames } from "../src/domain/fishing";
import { resolveSpotDetailUiPresentation } from "../src/domain/spotDetailUiPresentation";
import { fishingSpots } from "../src/data/fishingSpots";
import { buildStaticFishingSpotDetailsFromSpots } from "../src/lib/fishingSpotDetailFallback";
import { buildVerifiedCatchSpeciesValues } from "../src/lib/verifiedCatchSpeciesCuration";

type VerifiedCatchSpeciesSpot = { spotId: string; species: string[] | null; note?: string };
type VerifiedCatchSpeciesData = { issue: number; spots: VerifiedCatchSpeciesSpot[] };

const data = JSON.parse(
  readFileSync("data/curation/fishing-spots/issue-325-verified-catch-species.json", "utf8"),
) as VerifiedCatchSpeciesData;

assert.equal(data.issue, 325);
assert.equal(data.spots.length, 52, "Issue #325 must cover all registered spots explicitly");
assert.equal(new Set(data.spots.map((spot) => spot.spotId)).size, 52, "spotId must be unique in Issue #325 data");
const masterSpotIds = new Set(fishingSpots.map((spot) => spot.id));
assert.ok(
  data.spots.every((spot) => masterSpotIds.has(spot.spotId)),
  "all 52 spots reviewed by Issue #325 must remain in the current master",
);

const holdIds = new Set(["nokita-beach", "imari-inner-bay", "himosashi-port"]);
const confirmed = data.spots.filter((spot) => spot.species !== null);
const holds = data.spots.filter((spot) => spot.species === null);
assert.equal(confirmed.length, 49, "49 spots have confirmed historical species");
assert.deepEqual(new Set(holds.map((spot) => spot.spotId)), holdIds, "only the three explicitly deferred spots remain unknown");
assert.equal(confirmed.reduce((sum, spot) => sum + (spot.species?.length ?? 0), 0), 521, "the curated lists retain the reviewed species set");

const canonicalNames = new Set<string>(fishSpeciesNames);
for (const spot of confirmed) {
  assert.ok(spot.species && spot.species.length > 0, `${spot.spotId} must have at least one species`);
  assert.equal(new Set(spot.species).size, spot.species.length, `${spot.spotId} must not contain duplicate species`);
  for (const species of spot.species) {
    assert.ok(canonicalNames.has(species), `${spot.spotId}: ${species} must be a canonical fish master name`);
  }
}
for (const alias of ["マダイ", "キビレ", "ヒイカ", "ササイカ", "ヒラス", "アラ", "モンゴウイカ"]) {
  assert.ok(!confirmed.some((spot) => spot.species?.includes(alias)), `${alias} must be normalized before curation storage`);
}

const issue325Values = buildVerifiedCatchSpeciesValues(new Set(fishingSpots.map((spot) => spot.id)));
assert.equal(issue325Values.length, 52);
assert.ok(issue325Values.every((value) => value.itemKey === "historical_target_species"), "Issue #325 never writes target_species");

const details = buildStaticFishingSpotDetailsFromSpots(fishingSpots);
const detailBySpotItem = new Map(details.values.map((value) => [`${value.spotId}:${value.itemKey}`, value]));
for (const row of data.spots) {
  const value = detailBySpotItem.get(`${row.spotId}:historical_target_species`);
  assert.ok(value, `${row.spotId} must expose historical_target_species in static details`);
  assert.equal(value?.id, `${row.spotId}:historical_target_species:issue325`, `${row.spotId} must use the newest Issue #325 override`);
  if (row.species) {
    assert.equal(value?.informationState, "weak_evidence");
    assert.equal(value?.confidence, "low");
    assert.deepEqual(value?.valueTextList, row.species);
    assert.equal(value?.sources[0]?.relation, "supporting");
  } else {
    assert.equal(value?.informationState, "researched_unknown");
    assert.equal(value?.confidence, null);
    assert.deepEqual(value?.valueTextList, []);
    assert.equal(value?.sources[0]?.relation, "checked");
  }
}

const karatsuEast = fishingSpots.find((spot) => spot.id === "karatsu-east-port");
assert.ok(karatsuEast);
const karatsuDetails = buildStaticFishingSpotDetailsFromSpots([karatsuEast]);
const rawHistoricalSpecies = karatsuDetails.values.find((value) => value.itemKey === "historical_target_species");
assert.deepEqual(rawHistoricalSpecies?.valueTextList, ["アジ", "チヌ", "メバル", "カレイ", "キス", "スズキ", "コノシロ", "コウイカ"]);
assert.equal(
  resolveSpotDetailUiPresentation(karatsuDetails, "target_species").text,
  "アジ、チヌ、メバル、カレイ、キス、スズキ、コノシロ、コウイカ",
  "the species-tab research presentation uses historical catches instead of SCORE target_species",
);

for (const holdId of holdIds) {
  const spot = fishingSpots.find((candidate) => candidate.id === holdId);
  assert.ok(spot);
  const holdDetails = buildStaticFishingSpotDetailsFromSpots([spot]);
  assert.equal(resolveSpotDetailUiPresentation(holdDetails, "target_species").state, "uncertain", `${holdId} remains 未確定 in the research UI`);
}

const scoreProduction = readFileSync("src/domain/scoreV2Production.ts", "utf8");
assert.doesNotMatch(scoreProduction, /historical_target_species/, "historical catch species must stay disconnected from SCORE v2");

console.log("Issue #325 verified catch species tests passed");
