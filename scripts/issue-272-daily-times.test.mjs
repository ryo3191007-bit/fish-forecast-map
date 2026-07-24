import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const card = readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");
const shell = readFileSync("src/components/AppShell.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
const service = readFileSync("src/services/openMeteo.ts", "utf8");

assert.match(card, /environment\?\.point\.spotId === props\.selectedSpotId/, "a previous spot environment is excluded immediately");
assert.match(card, /dailySun\.find\(\(item\) => item\.date === date\)/, "sun times follow the selected date");
assert.match(card, /getTideEventsForDate\(environment\.hourly, date\)/, "tide events follow the selected spot environment and date");
for (const label of ["選択日の時刻情報", "日の出", "日の入", "満潮参考", "干潮参考", "※ 潮汐時刻は参考値"]) assert.ok(card.includes(label), `${label} is rendered`);
assert.match(card, /dailySun\?\.sunrise\.slice\(11, 16\)/);
assert.match(card, /events\.filter\(\(event\) => event\.type === type\).*join\(" \/ "\) \|\| "情報なし"/, "missing and multiple tide events are presented safely");
assert.match(css, /\.dailyTimeSummary dl \{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, "summary remains a compact two-column grid");
assert.match(service, /point\.spotId[\s\S]*point\.latitude[\s\S]*point\.longitude/, "environment cache identity includes spot and coordinates");
assert.match(dashboard, /setEnvironment\(null\)[\s\S]*setIsEnvironmentLoading\(true\)/, "uncached spot switches clear the previous result while loading");
assert.doesNotMatch(shell, /福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面まで/);
assert.match(shell, /className="authNavButton"[\s\S]*title=\{loginLabel\}[\s\S]*aria-label=\{loginLabel\}/);
assert.match(css, /\.nav \{[^}]*flex-wrap: nowrap/);
assert.match(css, /\.authNavButton \{[^}]*min-width: 0[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/);
assert.match(css, /\.catchReportRegisterButton \{[^}]*align-items: center[^}]*justify-content: center/);
console.log("Issue #272 daily time and compact UI checks passed");
