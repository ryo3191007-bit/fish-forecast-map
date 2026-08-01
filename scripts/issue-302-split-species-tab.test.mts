import assert from "node:assert/strict";
import fs from "node:fs";

const card = fs.readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");

assert.match(
  card,
  /export type SpotEvaluationTab = "環境" \| "釣場" \| "地形" \| "魚種";/,
  "the species tab is part of the spot evaluation tab type",
);
assert.match(card, /const visibleTabs: SpotEvaluationTab\[\] = \["環境", "釣場", "地形", "魚種"\];/, "the four information tabs are visible in order");
assert.match(card, /\{visibleTabs\.map\(\(tab\) =>/, "the visible tab order drives the rendered tab list");

const fishingPanel = card.match(/props\.activeTab === "釣場"[^\n]+/)?.[0] ?? "";
assert.match(fishingPanel, /items=\{fishingDetailItems\}/);
assert.match(fishingPanel, /hiddenKeys=\{\["target_species", "recommended_methods"\]\}/, "the fishing tab keeps species and recommended methods out of the fishing rows");

const speciesPanel = card.match(/props\.activeTab === "魚種"[^\n]+/)?.[0] ?? "";
assert.match(speciesPanel, /<SpeciesTab/);
assert.match(speciesPanel, /catches=\{props\.catches\}/, "the species tab receives the current user's catch records");
assert.match(speciesPanel, /spotId=\{props\.selectedSpotId\}/, "the species tab is scoped to the selected spot");
assert.match(speciesPanel, /fieldObservations=\{fieldObservations\}/, "field observations are added without returning species to the fishing tab");
assert.doesNotMatch(speciesPanel, /recommended_methods/, "recommended methods are not rendered in the species tab");

const speciesTab = card.slice(card.indexOf("function SpeciesTab"), card.indexOf("function DetailTab"));
assert.match(speciesTab, /itemKey="target_species"/);
assert.match(speciesTab, /researchPresentation\(details, status, "target_species"\)/, "target species still uses the shared pre-research presentation policy");
assert.doesNotMatch(speciesTab, /recommended_methods/);

assert.doesNotMatch(card, /function EvaluationTab\(|calculateProductionScoreV2/, "the former score evaluation path is not rendered");

console.log("Issue #302 split species tab tests passed");
