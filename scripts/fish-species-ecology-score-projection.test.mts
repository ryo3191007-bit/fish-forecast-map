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
  ecology.regionalCatchability[path.split("/").at(-1)!] = value;
  copy.review.attributeDecisions.find((item) => item.path === path)!.decision = decision;
  copy.review.attributeDecisions.find((item) => item.path === path)!.purposes = [purpose];
  copy.review.attributeDecisions.find((item) => item.path === path)!.sourceIds = [source.id];
  copy.review.attributeDecisions.find((item) => item.path === path)!.confidence = confidence;
  if (!copy.review.productionAdoption.acceptedPaths.includes(path)) copy.review.productionAdoption.acceptedPaths.push(path);
  return copy;
};

const temperaturePath = "/ecology/regionalCatchability/waterTemperature";
const valid = withDecision(temperaturePath, "score_v2_water_temperature", { status: "confirmed", value: { min: 18, max: 22 } });
assert.equal(projectEcologyForScore(valid)[0].scoreSpecies, "マアジ");

for (const id of ["aji", "maruaji"]) {
  const unsupported = structuredClone(valid); unsupported.speciesId = id;
  assert.deepEqual(projectEcologyForScore(unsupported), [], `${id} must not inherit maaji projection`);
}
assert.throws(() => projectEcologyForScore(withDecision(temperaturePath, "score_v2_water_temperature", { status: "unknown", value: null })), /no usable value/);
assert.deepEqual(projectEcologyForScore(withDecision(temperaturePath, "score_v2_water_temperature", { status: "confirmed", value: 20 }, "hold")), []);
assert.deepEqual(projectEcologyForScore(withDecision(temperaturePath, "score_v2_water_temperature", { status: "confirmed", value: 20 }, "reject")), []);
assert.throws(() => projectEcologyForScore(withDecision("/ecology/stableGeneral/spawningOrConfusableInfo", "score_v2_water_temperature", { status: "confirmed", value: { min: 18, max: 22 } })), /path is not allowed/);
assert.throws(() => projectEcologyForScore(withDecision("/ecology/stableGeneral/depthRange", "score_v2_spot_affinity", { status: "confirmed", value: { min: 0, max: 20 } })), /path is not allowed/);
assert.throws(() => projectEcologyForScore(withDecision("/identity/canonicalNameJa", "score_v2_spot_affinity", { status: "confirmed", value: "マアジ" })), /path is not allowed/);

console.log("fish species ecology SCORE projection tests passed");
