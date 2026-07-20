import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data/curation/fishing-spots/issue-181-detail-initial-data.json", "utf8"));
const audit = JSON.parse(readFileSync("data/curation/fishing-spots/issue-203-detail-reassessment.json", "utf8"));
const policy = readFileSync("docs/FISHING_SPOT_DETAIL_EVIDENCE_POLICY.md", "utf8");
const states = new Set(["has_evidence", "weak_evidence", "researched_unknown", "unresearched", "rejected"]);
const confidence = new Set(["high", "medium", "low"]);

assert.equal(audit.issue, 203);
assert.equal(audit.newWebResearchPerformed, false);
assert.equal(audit.spots.length, 18, "all existing spots need a reassessment result");
assert.equal(data.lastReassessmentIssue, 203, "the reassessment must be reflected in production seed data");
assert.equal(data.lastReassessedAt, audit.reviewedAt);
assert.deepEqual(audit.spots.map((spot) => spot.spotId), data.spots.map((spot) => spot.spotId));
assert.match(policy, /安全・利用可否/);
assert.match(policy, /弱い情報は制限の存在を示す注意情報/);
assert.match(policy, /「調査済み・未確定」/);
assert.match(policy, /「未調査」/);

for (const spot of data.spots) {
  const sourceIds = new Set(spot.sources.map((source) => source.id));
  const spotAudit = audit.spots.find((entry) => entry.spotId === spot.spotId);
  assert.equal(spotAudit.itemResults.length, 14, `${spot.spotId}: every item needs an auditable decision`);
  assert.equal(spot.values.length, 14, `${spot.spotId}: every item was reassessed`);
  for (const source of spot.sources) {
    assert.ok(source.sourceName);
    assert.ok(source.checkedOn, `${source.id}: checkedOn is required`);
  }
  for (const value of spot.values) {
    assert.ok(states.has(value.informationState));
    assert.ok(value.checkedAt, `${value.id}: checkedAt is required`);
    assert.equal(value.reassessmentIssue, 203, `${value.id}: reassessment must be applied to real data`);
    assert.equal(value.reassessedAt, audit.reviewedAt);
    const itemAudit = spotAudit.itemResults.find((entry) => entry.valueId === value.id);
    assert.equal(itemAudit?.informationState, value.informationState, `${value.id}: audit and applied data must agree`);
    assert.equal(itemAudit?.confidence, value.confidence, `${value.id}: confidence decision must be recorded`);
    const concrete = [value.valueText, value.valueNumber, value.valueBoolean, value.valueJson].some((entry) => entry !== null) || value.valueTextList.length > 0;
    const adoptedValue = ["has_evidence", "weak_evidence"].includes(value.informationState);
    assert.equal(concrete, adoptedValue, `${value.id}: state and value must agree`);
    assert.equal(value.confidence === null, !adoptedValue, `${value.id}: confidence must exist only for evidence`);
    if (adoptedValue) {
      assert.ok(confidence.has(value.confidence));
      assert.ok(value.sources.supporting.length > 0, `${value.id}: adopted evidence needs a supporting source`);
    }
    if (value.itemKey === "restriction_status" && value.confidence === "low") {
      assert.notEqual(value.valueText, "利用可能", `${value.id}: weak evidence cannot affirm availability`);
    }
    for (const relation of ["supporting", "checked", "contradicting"]) {
      for (const id of value.sources[relation]) assert.ok(sourceIds.has(id), `${value.id}: missing ${relation} source ${id}`);
    }
  }
}
console.log("Issue #203 spot detail policy, 18-spot audit, and evidence consistency checks passed");
