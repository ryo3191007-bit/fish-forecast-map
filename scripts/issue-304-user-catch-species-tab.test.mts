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
assert.match(card, />調査上の対象魚種</);
assert.match(card, /targetPresentation\?\.state === "displayable"/);
assert.doesNotMatch(card.slice(card.indexOf("function SpeciesTab"), card.indexOf("function DetailTab")), /historical_target_species/);

const dashboard = fs.readFileSync("src/components/FishingDashboard.tsx", "utf8");
assert.match(
  dashboard,
  /externalMemos\.flatMap\(\(memo\) => memo\.catchItems\.map\(\(item\) => \(\{[\s\S]*?species: item\.species/,
  "multi-species user catches must continue to be flattened into the records passed to the evaluation card",
);
assert.match(dashboard, /catches=\{scoreCatchRecords\}/);

const evaluationTab = card.slice(card.indexOf("function EvaluationTab"), card.indexOf("function JmaWarningPanel"));
assert.match(evaluationTab, /calculateProductionScoreV2\(/, "SCORE v2 calculation must remain unchanged");
assert.match(evaluationTab, /result\.speciesResults/);
assert.match(evaluationTab, /result\.methodResults/);

console.log("Issue #304 user catch species tab tests passed");
