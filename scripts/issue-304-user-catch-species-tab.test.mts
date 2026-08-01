import assert from "node:assert/strict";
import fs from "node:fs";
import type { ExternalCatchRecord } from "../src/domain/externalCatch";
import { getRegisteredCatchSpeciesForSpot } from "../src/domain/spotSpeciesPresentation";

function catchRecord(
  id: string,
  species: string,
  spotId: string,
  acquisitionMethod: ExternalCatchRecord["acquisitionMethod"] = "manual",
): ExternalCatchRecord {
  return {
    id,
    species,
    catchItems: [{ species }],
    caughtDate: "2026-07-25",
    areaName: "test-area",
    spotId,
    coordinatePrecision: "unknown",
    sourceId: "user-self-report",
    sourceName: "本人の釣果",
    sourceUrl: "https://example.test",
    acquisitionMethod,
    confidence: "high",
    createdAt: "2026-07-25T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
  };
}

const catches = [
  catchRecord("1", "アジ", "spot-a"),
  catchRecord("2", "キス", "spot-a"),
  catchRecord("3", "アジ", "spot-a"),
  catchRecord("4", "チヌ", "spot-b"),
  catchRecord("5", "シーバス", "spot-a", "ai_assisted"),
  catchRecord("6", " アオリイカ ", "spot-a"),
];

assert.deepEqual(
  getRegisteredCatchSpeciesForSpot(catches, "spot-a"),
  ["アジ", "キス", "アオリイカ"],
  "the species tab should show unique manual catches for the selected spot only",
);
assert.deepEqual(getRegisteredCatchSpeciesForSpot(catches, "spot-b"), ["チヌ"]);
assert.deepEqual(getRegisteredCatchSpeciesForSpot(catches, "spot-c"), []);

const card = fs.readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");
assert.match(card, /props\.activeTab === "魚種" && <SpeciesTab/);
assert.match(card, />自分の釣果</);
assert.match(card, /この地点の釣果はまだありません/);
const speciesTab = card.slice(card.indexOf("function SpeciesTab"), card.indexOf("function DetailTab"));
assert.match(speciesTab, /itemKey="target_species"/);
assert.match(speciesTab, /label="対象魚種"/);
assert.match(speciesTab, /research=\{presentation\}/, "pre-research target species stays separate from the user's field observation");
assert.match(speciesTab, /observation=\{observation\}/, "field-observed species are a separate personal layer");
assert.doesNotMatch(speciesTab, /historical_target_species/);
assert.doesNotMatch(speciesTab, /recommended_methods/);

const dashboard = fs.readFileSync("src/components/FishingDashboard.tsx", "utf8");
assert.match(
  dashboard,
  /externalMemos\.flatMap\(\(memo\) => memo\.catchItems\.map\(\(item\) => \(\{[\s\S]*?species: item\.species/,
  "multi-species user catches must continue to be flattened into the records passed to the evaluation card",
);
assert.match(dashboard, /catches=\{scoreCatchRecords\}/);

assert.doesNotMatch(card, /function EvaluationTab\(|calculateProductionScoreV2/, "the score evaluation route is removed from the user-facing card");

console.log("Issue #304 user catch species tab tests passed");
