import assert from "node:assert/strict";
import fs from "node:fs";
import { projectEcologyForScore, type EcologyConfidence, type EcologyDecision, type EcologyProjectionDocument } from "../src/domain/fishSpeciesEcologyScoreProjection";

const read = (id: string) => JSON.parse(fs.readFileSync(`data/research/fish-species/${id}.json`, "utf8")) as EcologyProjectionDocument;
for (const id of ["aji", "maaji", "maruaji", "seabass", "chinu"]) assert.deepEqual(projectEcologyForScore(read(id)), [], `${id}: current research has no approved SCORE purpose`);

const fixture = read("maaji");
const withDecision = (path: string, purpose: string, value: unknown, decision: EcologyDecision = "adopt", confidence: EcologyConfidence = "high") => {
  const copy = structuredClone(fixture);
  const source = copy.sources[0];
  source.supports.push(path);
  const ecology = copy.ecology as { regionalCatchability: Record<string, unknown> };
  ecology.regionalCatchability[path.split("/").at(-1)!] = { note: "projection test claim", evidenceSources: { supportingSourceIds: [], checkedSourceIds: [], contradictingSourceIds: [] }, ...value };
  const claim = ecology.regionalCatchability[path.split("/").at(-1)!] as { confidence: EcologyConfidence; regionScope?: string; evidenceSources: { supportingSourceIds: string[] } };
  claim.confidence = confidence;
  claim.regionScope = source.regionScope;
  claim.evidenceSources.supportingSourceIds = [source.id];
  const attributeDecision = copy.review.attributeDecisions.find((item) => item.path === path)!;
  attributeDecision.decision = decision;
  attributeDecision.purposes = [purpose];
  attributeDecision.sourceIds = [source.id];
  attributeDecision.confidence = confidence;
  attributeDecision.regionScope = source.regionScope;
  if (!copy.review.productionAdoption.acceptedPaths.includes(path)) copy.review.productionAdoption.acceptedPaths.push(path);
  return copy;
};

const temperaturePath = "/ecology/regionalCatchability/waterTemperature";
const valid = withDecision(temperaturePath, "score_v2_water_temperature", { status: "confirmed", value: { min: 18, max: 22 } });
assert.equal(projectEcologyForScore(valid)[0].scoreSpecies, "マアジ");
assert.deepEqual(projectEcologyForScore(valid)[0].value, { min: 18, max: 22 }, "projection value must contain claim.value only");

const unknownSpecies = structuredClone(fixture); unknownSpecies.speciesId = "unknown-fish";
assert.throws(() => projectEcologyForScore(unknownSpecies), /unknown speciesId/);
for (const inheritedSpeciesId of ["toString", "constructor"]) {
  const inheritedSpecies = structuredClone(fixture);
  inheritedSpecies.speciesId = inheritedSpeciesId;
  assert.throws(() => projectEcologyForScore(inheritedSpecies), /unknown speciesId/, `${inheritedSpeciesId}: inherited object key must not be accepted as a speciesId`);
}
for (const id of ["aji", "maruaji"]) assert.deepEqual(projectEcologyForScore(read(id)), [], `${id} normally has an empty projection`);
for (const id of ["aji", "maruaji"]) { const unsupported = structuredClone(valid); unsupported.speciesId = id; assert.throws(() => projectEcologyForScore(unsupported), /unsupported species/); }
assert.throws(() => projectEcologyForScore(withDecision(temperaturePath, "score_v2_water_temperature", { status: "unknown", value: null })), /no usable value/);
assert.deepEqual(projectEcologyForScore(withDecision(temperaturePath, "score_v2_water_temperature", { status: "confirmed", value: 20 }, "hold")), []);
assert.deepEqual(projectEcologyForScore(withDecision(temperaturePath, "score_v2_water_temperature", { status: "confirmed", value: 20 }, "reject")), []);
assert.throws(() => projectEcologyForScore(withDecision("/ecology/stableGeneral/spawningOrConfusableInfo", "score_v2_water_temperature", { status: "confirmed", value: { min: 18, max: 22 } })), /path is not allowed/);
assert.throws(() => projectEcologyForScore(withDecision("/ecology/stableGeneral/depthRange", "score_v2_spot_affinity", { status: "confirmed", value: { min: 0, max: 20 } })), /path is not allowed/);
assert.throws(() => projectEcologyForScore(withDecision("/identity/canonicalNameJa", "score_v2_spot_affinity", { status: "confirmed", value: "マアジ" })), /path is not allowed/);

const checkedOnly = structuredClone(valid);
const checkedClaim = (checkedOnly.ecology as { regionalCatchability: Record<string, { evidenceSources: { supportingSourceIds: string[]; checkedSourceIds: string[] } }> }).regionalCatchability.waterTemperature;
checkedClaim.evidenceSources.supportingSourceIds = [];
checkedClaim.evidenceSources.checkedSourceIds = [checkedOnly.sources[0].id];
assert.throws(() => projectEcologyForScore(checkedOnly), /not supporting claim evidence/);
const contradictingOnly = structuredClone(valid);
const contradictingClaim = (contradictingOnly.ecology as { regionalCatchability: Record<string, { evidenceSources: { supportingSourceIds: string[]; contradictingSourceIds: string[] } }> }).regionalCatchability.waterTemperature;
contradictingClaim.evidenceSources.supportingSourceIds = [];
contradictingClaim.evidenceSources.contradictingSourceIds = [contradictingOnly.sources[0].id];
assert.throws(() => projectEcologyForScore(contradictingOnly), /not supporting claim evidence/);
const elevatedConfidence = structuredClone(valid);
elevatedConfidence.review.attributeDecisions.find(({ path }) => path === temperaturePath)!.confidence = "high";
(elevatedConfidence.ecology as { regionalCatchability: Record<string, { confidence: EcologyConfidence }> }).regionalCatchability.waterTemperature.confidence = "medium";
assert.throws(() => projectEcologyForScore(elevatedConfidence), /confidence must match/);
const mismatchedRegion = structuredClone(valid);
mismatchedRegion.review.attributeDecisions.find(({ path }) => path === temperaturePath)!.regionScope = "無関係な地域";
assert.throws(() => projectEcologyForScore(mismatchedRegion), /regionScope must match/);

console.log("fish species ecology SCORE projection tests passed");
