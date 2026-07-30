import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots.ts";

const expectedSpecies = new Map([
  ["hado-cape-rocky-shore", ["アオリイカ", "ヤリイカ", "コウイカ", "ブリ", "キジハタ"]],
  ["nanatsugama-rocky-shore", ["アオリイカ", "アジ", "メジナ", "チヌ", "サワラ", "ヒラスズキ"]],
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
assert.ok(audit.spots.every(({ sourceUrl }: { sourceUrl: string }) => sourceUrl.startsWith("https://")));

console.log("Issue #378 rocky-shore target-species checks passed");
