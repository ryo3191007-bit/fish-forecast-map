import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const appShell = read("src/components/AppShell.tsx");
const dashboard = read("src/components/FishingDashboard.tsx");
const spotCard = read("src/components/SpotEvaluationCard.tsx");
const css = read("src/app/globals.css");

assert.ok(
  appShell.indexOf('<h1>Fish Forecast Map</h1>') < appShell.indexOf('<nav className="nav"'),
  "the product name precedes navigation in the hero",
);
assert.match(appShell, /<a href="#map">地図<\/a>[\s\S]*?<a href="#reports">一覧<\/a>/);
assert.match(appShell, /className="authNavButton"[\s\S]*?setIsAuthOpen\(true\)/);

assert.doesNotMatch(dashboard, /登録・編集・一覧|環境データ・地点別SCORE/);
assert.match(dashboard, /className="sectionHeading reportSectionHeading"[\s\S]*?<h2>釣果情報一覧<\/h2>/);
assert.match(css, /\.reportSectionHeading\s*\{[^}]*border-bottom:/);
assert.match(css, /\.reportFilters\s*\{[^}]*padding-bottom:[^}]*border-bottom:/);

assert.match(css, /@media \(max-width: 620px\)\s*\{[\s\S]*?\.mapSection\s*\{\s*margin-inline: -16px;[\s\S]*?\.map\s*\{\s*height: 466px;/);
assert.match(css, /@media \(max-width: 420px\)\s*\{[\s\S]*?\.mapSection\s*\{\s*margin-inline: -12px;[\s\S]*?\.map\s*\{\s*height: 416px;/);

assert.match(spotCard, /const orderedTabs: SpotEvaluationTab\[\] = \[\.\.\.tabs\.slice\(0, 3\), "魚種", \.\.\.tabs\.slice\(3\)\]/);
assert.match(spotCard, /const visibleTabs = orderedTabs\.filter\(\(tab\) => tab !== "評価"\)/);
assert.match(spotCard, /props\.activeTab === "評価" && <EvaluationTab/);
assert.match(spotCard, /function EvaluationTab\(/);
assert.match(spotCard, /className="button catchReportRegisterButton userSpotRegisterButton"/);
assert.match(css, /\.spotInternalTabs\s*\{[^}]*display:grid;[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.doesNotMatch(css, /\.spotInternalTabs\s*\{[^}]*overflow-x:/);

console.log("Issue 391 mobile UI checks passed");
