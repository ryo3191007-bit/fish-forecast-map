import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots.ts";
import { buildStaticFishingSpotDetailsFromSpots } from "../src/lib/fishingSpotDetailFallback.ts";

const expectedSpecies = new Map([
  ["hado-cape-rocky-shore", ["アオリイカ", "ヤリイカ", "コウイカ", "ブリ", "キジハタ"]],
  ["nanatsugama-rocky-shore", ["アオリイカ", "アジ"]],
  ["doya-terraces-front-rocky-shore", ["アオリイカ", "コウイカ", "キス", "メゴチ"]],
]);
const unchangedEmptySpeciesIds = [
  "tateishiyama-west-rocky-shore",
  "tategami-rock-rocky-shore",
  "hoshika-peninsula-north-rocky-shore",
  "takashima-north-rocky-shore",
  "hitotsuku-coast-rocky-ends",
  "kasuga-settlement-front-rocky-shore",
];

for (const [id, species] of expectedSpecies) {
  const spot = fishingSpots.find((candidate) => candidate.id === id);
  assert.ok(spot, `${id} exists`);
  assert.deepEqual(spot.targetSpecies, species, `${id} has the manually researched species`);
  assert.deepEqual(spot.recommendedMethods, [], `${id} recommended methods remain unchanged`);
  assert.ok(spot.notes?.every((note) => !note.startsWith("魚種・釣法・SCORE情報")), `${id} notes no longer say species are absent`);
}

const staticDetails = buildStaticFishingSpotDetailsFromSpots(fishingSpots);
for (const [id, species] of expectedSpecies) {
  const targetSpeciesDetail = staticDetails.values.find(
    (value) => value.spotId === id && value.itemKey === "target_species",
  );
  assert.ok(targetSpeciesDetail, `${id} exposes target_species through the static detail path`);
  assert.deepEqual(
    targetSpeciesDetail.valueTextList,
    species,
    `${id} target_species reaches the detail consumed by the species tab`,
  );
}

for (const id of unchangedEmptySpeciesIds) {
  const spot = fishingSpots.find((candidate) => candidate.id === id);
  assert.ok(spot, `${id} exists`);
  assert.deepEqual(spot.targetSpecies, [], `${id} target species remain empty`);
  assert.deepEqual(spot.recommendedMethods, [], `${id} recommended methods remain unchanged`);
}

const audit = JSON.parse(readFileSync(new URL("../docs/research/ISSUE_378_ROCKY_SHORE_TARGET_SPECIES.json", import.meta.url), "utf8"));
assert.deepEqual(
  audit.spots.map(({ spotId, targetSpecies }: { spotId: string; targetSpecies: string[] }) => [spotId, targetSpecies]),
  [...expectedSpecies],
  "the audit record matches the production target species",
);
assert.deepEqual(audit.spots[0].normalizations, [
  { sourceName: "ササイカ", masterName: "ヤリイカ" },
  { sourceName: "ヤズ", masterName: "ブリ" },
]);
for (const spot of audit.spots as Array<{
  targetSpecies: string[];
  evidence: Array<{ sourceSpecies: string; masterSpecies: string; sourceUrl: string }>;
}>) {
  assert.deepEqual(
    spot.evidence.map(({ masterSpecies }) => masterSpecies),
    spot.targetSpecies,
    "every target species has a corresponding evidence entry",
  );
  assert.ok(spot.evidence.every(({ sourceSpecies }) => sourceSpecies.length > 0));
  assert.ok(spot.evidence.every(({ sourceUrl }) => sourceUrl.startsWith("https://")));
}

console.log("Issue #378 rocky-shore target-species checks passed");
