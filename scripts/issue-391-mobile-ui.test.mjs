import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const appShell = read("src/components/AppShell.tsx");
const dashboard = read("src/components/FishingDashboard.tsx");
const memoSection = read("src/components/ExternalCatchMemoSection.tsx");
const spotCard = read("src/components/SpotEvaluationCard.tsx");
const css = read("src/app/globals.css");

assert.doesNotMatch(appShell, /<a href="#map">地図<\/a>|<a href="#reports">一覧<\/a>/);
assert.match(appShell, /className="heroHeader"[\s\S]*?<h1>FishTrace<\/h1>[\s\S]*?className="authNavButton"/);
assert.match(appShell, /className="authNavButton"[\s\S]*?title=\{loginLabel\}[\s\S]*?aria-label=\{loginLabel\}[\s\S]*?setIsAuthOpen\(true\)/);
assert.match(css, /\.heroHeader\s*\{[^}]*display: flex;[^}]*flex-wrap: nowrap;[^}]*min-width: 0;/);
assert.match(css, /\.heroHeader h1\s*\{[^}]*min-width: 0;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
assert.match(css, /\.authNavButton\s*\{[^}]*flex: 0 0 180px;[^}]*width: 180px;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);

assert.doesNotMatch(dashboard, /登録・編集・一覧|環境データ・地点別SCORE/);
assert.match(dashboard, /className="sectionHeading reportSectionHeading"[\s\S]*?<h2>釣果情報一覧<\/h2>/);
assert.match(dashboard, />\+釣果登録<\/button>/);
assert.match(memoSection, /const title = editingMemo \? "釣果を編集" : "釣果登録";/);
assert.match(css, /\.reportSectionHeading\s*\{[^}]*border-bottom:/);
assert.match(css, /\.reportFilters\s*\{[^}]*padding-bottom:[^}]*border-bottom:/);

assert.match(css, /@media \(max-width: 620px\)\s*\{[\s\S]*?\.mapSection\s*\{\s*margin-inline: -16px;[\s\S]*?\.map\s*\{\s*height: 542px;/);
assert.match(css, /@media \(max-width: 420px\)\s*\{[\s\S]*?\.mapSection\s*\{\s*margin-inline: -12px;[\s\S]*?\.map\s*\{\s*height: 492px;/);

assert.match(spotCard, /const visibleTabs: SpotEvaluationTab\[\] = \["環境", "釣場", "地形", "魚種"\]/);
assert.doesNotMatch(spotCard, /function EvaluationTab\(|calculateProductionScoreV2/);
assert.match(spotCard, /className="button catchReportRegisterButton userSpotRegisterButton"/);
assert.match(css, /\.spotInternalTabs\s*\{[^}]*display:grid;[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.doesNotMatch(css, /\.spotInternalTabs\s*\{[^}]*overflow-x:/);

console.log("Issue 391 mobile UI checks passed");
