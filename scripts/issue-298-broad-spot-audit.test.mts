import assert from "node:assert/strict";
import fs from "node:fs";
import { fishingSpotById, fishingSpots } from "../src/data/fishingSpots";
import {
  filterSelectableFishingSpots,
  hiddenBroadFishingSpotIds,
  isSelectableFishingSpot,
} from "../src/data/fishingSpotVisibility";
import {
  buildCatchRegistrationSpotOptions,
  buildFishingSpotMapEntries,
  filterFishingSpotOptions,
  selectFishingSpot,
} from "../src/domain/fishingSpotPresentation";

const audit = JSON.parse(
  fs.readFileSync(
    "data/curation/fishing-spots/issue-298-broad-spot-audit.json",
    "utf8",
  ),
) as {
  issue: number;
  auditedAt: string;
  scope: {
    masterSpotCount: number;
    broadCandidateCount: number;
    hiddenFromNewSelectionCount: number;
    retainedPendingReplacementCount: number;
    retainedAsSpecificLandmarkCount: number;
  };
  policy: {
    legacyDataHandling: string;
    databaseHandling: string;
    notGuaranteed: string[];
  };
  decisionCodes: Record<string, string>;
  candidates: Array<{
    spotId: string;
    name: string;
    areaName: string;
    decision: "hidden_from_new_selection" | "retained_pending_replacement" | "retained";
    reasonCode: string;
    replacementSpotIds: string[];
    relatedIssues: number[];
    note: string;
  }>;
};

const expectedHiddenIds = new Set([
  "yobuko-area",
  "fukushima-area",
  "takashima-area",
  "hirado-seto",
  "ikitsuki-area",
]);
const expectedRetainedPending = new Set(["niji-matsubara", "imari-inner-bay"]);
const expectedSpecificLandmark = new Set(["keya-gate"]);

assert.equal(audit.issue, 298);
assert.equal(audit.auditedAt, "2026-07-25");
assert.equal(fishingSpots.length, 52);
assert.equal(new Set(fishingSpots.map((spot) => spot.id)).size, 52);
assert.equal(audit.scope.masterSpotCount, fishingSpots.length);
assert.equal(audit.candidates.length, audit.scope.broadCandidateCount);
assert.equal(new Set(audit.candidates.map((candidate) => candidate.spotId)).size, audit.candidates.length);

const hiddenCandidates = audit.candidates.filter((candidate) => candidate.decision === "hidden_from_new_selection");
const retainedPendingCandidates = audit.candidates.filter((candidate) => candidate.decision === "retained_pending_replacement");
const retainedCandidates = audit.candidates.filter((candidate) => candidate.decision === "retained");

assert.deepEqual(new Set(hiddenCandidates.map((candidate) => candidate.spotId)), expectedHiddenIds);
assert.deepEqual(new Set(retainedPendingCandidates.map((candidate) => candidate.spotId)), expectedRetainedPending);
assert.deepEqual(new Set(retainedCandidates.map((candidate) => candidate.spotId)), expectedSpecificLandmark);
assert.deepEqual(new Set(hiddenBroadFishingSpotIds), expectedHiddenIds);
assert.equal(hiddenCandidates.length, audit.scope.hiddenFromNewSelectionCount);
assert.equal(retainedPendingCandidates.length, audit.scope.retainedPendingReplacementCount);
assert.equal(retainedCandidates.length, audit.scope.retainedAsSpecificLandmarkCount);

for (const candidate of audit.candidates) {
  const masterSpot = fishingSpotById.get(candidate.spotId);
  assert.ok(masterSpot, `${candidate.spotId} must remain in the raw master for legacy references`);
  assert.equal(masterSpot.name, candidate.name);
  assert.equal(masterSpot.areaName, candidate.areaName);
  assert.ok(audit.decisionCodes[candidate.reasonCode]);
  assert.ok(candidate.relatedIssues.length > 0);
  assert.ok(candidate.note.length > 0);

  for (const replacementSpotId of candidate.replacementSpotIds) {
    assert.ok(fishingSpotById.has(replacementSpotId), `${replacementSpotId} replacement must exist`);
    assert.notEqual(replacementSpotId, candidate.spotId);
  }

  if (candidate.decision === "hidden_from_new_selection") {
    assert.ok(candidate.replacementSpotIds.length > 0);
    assert.equal(isSelectableFishingSpot(masterSpot), false);
  } else {
    assert.equal(isSelectableFishingSpot(masterSpot), true);
  }
}

const selectableSpots = filterSelectableFishingSpots(fishingSpots);
assert.equal(selectableSpots.length, 47);
assert.ok(selectableSpots.every((spot) => !expectedHiddenIds.has(spot.id)));
assert.ok([...expectedHiddenIds].every((spotId) => fishingSpotById.has(spotId)));

const mapIds = new Set(buildFishingSpotMapEntries(selectableSpots).map((entry) => entry.spot.id));
const registrationIds = new Set(buildCatchRegistrationSpotOptions(fishingSpots).map((option) => option.id));
const blankQueryIds = new Set(filterFishingSpotOptions(fishingSpots, "").map((spot) => spot.id));

for (const hiddenId of expectedHiddenIds) {
  assert.equal(mapIds.has(hiddenId), false, `${hiddenId} must not appear on the map`);
  assert.equal(registrationIds.has(hiddenId), false, `${hiddenId} must not be a new catch destination`);
  assert.equal(blankQueryIds.has(hiddenId), false, `${hiddenId} must not be an evaluation option`);
}

assert.equal(filterFishingSpotOptions(fishingSpots, "呼子周辺").length, 0);
assert.equal(filterFishingSpotOptions(fishingSpots, "虹の松原")[0]?.id, "niji-matsubara");
assert.equal(filterFishingSpotOptions(fishingSpots, "芥屋大門")[0]?.id, "keya-gate");
assert.equal(selectFishingSpot(fishingSpots, "yobuko-area")?.id, selectableSpots[0]?.id);
assert.equal(selectFishingSpot(fishingSpots, "yobuko-port")?.id, "yobuko-port");

assert.match(audit.policy.legacyDataHandling, /自動再割当しない/);
assert.match(audit.policy.databaseHandling, /削除・更新せず/);
assert.ok(audit.policy.notGuaranteed.includes("実釣位置"));
assert.ok(audit.policy.notGuaranteed.includes("立入可能範囲"));

console.log("Issue #298 broad fishing spot audit tests passed");
