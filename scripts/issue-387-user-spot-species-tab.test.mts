import assert from "node:assert/strict";
import fs from "node:fs";
import type { ExternalCatchRecord } from "../src/domain/externalCatch";
import { getRegisteredCatchSpeciesForSpot } from "../src/domain/spotSpeciesPresentation";

function catchRecord(id: string, species: string, spotId: string, acquisitionMethod: ExternalCatchRecord["acquisitionMethod"] = "manual"): ExternalCatchRecord {
  return {
    id, species, catchItems: [{ species }], caughtDate: "2026-07-31", areaName: "test-area", spotId,
    coordinatePrecision: "unknown", sourceId: "user-self-report", sourceName: "本人の釣果",
    sourceUrl: "https://example.test", acquisitionMethod, confidence: "high",
    createdAt: "2026-07-31T00:00:00.000Z", updatedAt: "2026-07-31T00:00:00.000Z",
  };
}

const userSpotId = "user:11111111-1111-4111-8111-111111111111";
const catches = [
  { ...catchRecord("1", "アジ", userSpotId), catchItems: [{ species: "アジ" }, { species: "チヌ" }, { species: " チヌ　" }] },
  catchRecord("2", "アジ", userSpotId),
  { ...catchRecord("3", "真鯛", userSpotId), catchItems: [] },
  catchRecord("4", "シーバス", "user:22222222-2222-4222-8222-222222222222"),
  catchRecord("5", "キス", userSpotId, "ai_assisted"),
  { ...catchRecord("6", "サバ", userSpotId, "auto"), catchItems: [{ species: "イワシ" }, { species: "サバ" }] },
];

assert.deepEqual(getRegisteredCatchSpeciesForSpot(catches, userSpotId), ["アジ", "チヌ", "真鯛"], "all catch-item species are deduplicated while legacy records fall back to their single species");
assert.deepEqual(getRegisteredCatchSpeciesForSpot(catches, "user:33333333-3333-4333-8333-333333333333"), [], "a user spot without catches keeps the empty state");

const card = fs.readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");
const speciesTab = card.slice(card.indexOf("function SpeciesTab"), card.indexOf("function DetailTab"));
assert.doesNotMatch(speciesTab, /if \(isUserSpot\) return/, "the user-spot species tab is not blocked");
assert.match(speciesTab, /getRegisteredCatchSpeciesForSpot\(catches, spotId\)/);
assert.match(speciesTab, />自分の釣果</);
assert.match(speciesTab, /この地点の釣果はまだありません/);
assert.match(speciesTab, /\{!isUserSpot && <SpotFieldObservationCard[\s\S]*?itemKey="target_species"/, "the master editor remains available but is omitted for user spots");
assert.match(speciesTab, /researchPresentation\(details, status, "target_species"\)/);
assert.match(speciesTab, /research=\{presentation\}/);
assert.match(speciesTab, /observation=\{observation\}/);

const fieldObservationHook = fs.readFileSync("src/hooks/useSpotFieldObservations.ts", "utf8");
assert.match(fieldObservationHook, /const enabled = !spotId\.startsWith\("user:"\)/);
assert.ok(fieldObservationHook.indexOf("if (!enabled)") < fieldObservationHook.indexOf("fetchMySpotFieldObservations(targetSpotId)"), "user spots return before the master observation repository can invoke its RPC");

console.log("Issue #387 user spot species tab tests passed");
