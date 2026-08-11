import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const appShell = read("src/components/AppShell.tsx");
const layout = read("src/app/layout.tsx");
const dashboard = read("src/components/FishingDashboard.tsx");
const map = read("src/components/FishingMap.tsx");
const spotInformation = read("src/components/SpotEvaluationCard.tsx");
const readme = read("README.md");

assert.match(appShell, /<h1>FishTrace<\/h1>/);
assert.match(layout, /title: "FishTrace"/);
assert.match(layout, /釣り場を探す・実地調査する・釣果を記録する・共有する/);
assert.match(dashboard, /<span>地点<\/span>/);
assert.match(map, /evaluationButton\.textContent = "地点情報"/);
assert.match(spotInformation, /SPOT INFOMATION[\s\S]*?<h2>地点情報<\/h2>/);
assert.deepEqual(
  [...spotInformation.matchAll(/const visibleTabs: SpotEvaluationTab\[\] = \[([^\]]+)\]/g)].map((match) => match[1]),
  ['"環境", "釣場", "地形", "魚種"'],
);
for (const source of [dashboard, spotInformation]) {
  assert.doesNotMatch(source, /calculateProductionScoreV2|AllSpeciesEvaluation|総合点|釣法評価/);
}
assert.match(readme, /# FishTrace/);
assert.match(readme, /釣り場を探す・現地調査する・釣果を記録する・共有する/);
assert.match(appShell, /風・波・潮位・水深などの環境情報は参考情報/);
assert.match(appShell, /公式情報と現地の状況を確認/);

console.log("Issue 393 FishTrace rebrand checks passed");
