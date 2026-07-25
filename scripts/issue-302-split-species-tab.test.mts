import assert from "node:assert/strict";
import fs from "node:fs";

const card = fs.readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");

assert.match(
  card,
  /export type SpotEvaluationTab = "評価" \| "環境" \| "釣場" \| "地形" \| "魚種";/,
  "the species tab is part of the spot evaluation tab type",
);
assert.match(
  card,
  /const orderedTabs: SpotEvaluationTab\[\] = \[\.\.\.tabs\.slice\(0, 3\), "魚種", \.\.\.tabs\.slice\(3\)\];/,
  "the species tab is inserted immediately after terrain and before evaluation",
);
assert.match(card, /\{orderedTabs\.map\(\(tab\) =>/, "the five-tab order drives the rendered tab list");

const fishingPanel = card.match(/props\.activeTab === "釣場"[^\n]+/)?.[0] ?? "";
assert.match(fishingPanel, /items=\{fishingDetailItems\}/);
assert.match(fishingPanel, /hiddenKeys=\{\["target_species", "recommended_methods"\]\}/, "the fishing tab hides species and recommended methods");

const speciesPanel = card.match(/props\.activeTab === "魚種"[^\n]+/)?.[0] ?? "";
assert.match(speciesPanel, /items=\{fishingDetailItems\}/);
assert.match(speciesPanel, /visibleKeys=\{\["target_species"\]\}/, "the species tab renders target species only");
assert.doesNotMatch(speciesPanel, /recommended_methods/, "recommended methods are not rendered in the species tab");

assert.match(
  card,
  /function DetailTab\([\s\S]*?hiddenKeys\.includes\(key\)[\s\S]*?visibleKeys\.includes\(key\)[\s\S]*?resolveSpotDetailUiPresentation\(details, key\)/,
  "tab-specific filtering still uses the shared unresolved and confidence presentation policy",
);

const evaluationTab = card.slice(card.indexOf("function EvaluationTab"), card.indexOf("function JmaWarningPanel"));
assert.match(evaluationTab, /calculateProductionScoreV2\(/, "SCORE v2 calculation remains in the evaluation tab");
assert.match(evaluationTab, /result\.speciesResults/, "species evaluation remains unchanged");
assert.match(evaluationTab, /result\.methodResults/, "method evaluation remains unchanged");

console.log("Issue #302 split species tab tests passed");
