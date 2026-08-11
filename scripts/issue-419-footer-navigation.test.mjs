import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/components/FishingDashboard.tsx");
const appShell = read("src/components/AppShell.tsx");
const spotCard = read("src/components/SpotEvaluationCard.tsx");
const css = read("src/app/globals.css");

assert.match(dashboard, /type DashboardMode = "map" \| "catchReports" \| "spotEvaluation"/);
assert.match(dashboard, /useState<DashboardMode>\("map"\)/, "MAP is the initial screen");
assert.doesNotMatch(dashboard, /dashboardModeSwitch|dashboardModeButton/);
assert.match(dashboard, /<p className="eyebrow">MAP<\/p>[\s\S]*?<h2>地図<\/h2>/);
assert.match(dashboard, /className="sectionHeading reportSectionHeading dashboardScreenHeader"[\s\S]*?<p className="eyebrow">CATCH REPORTS<\/p>[\s\S]*?<h2>釣果情報<\/h2>[\s\S]*?＋釣果登録/);
assert.match(spotCard, /<p className="eyebrow">SPOT INFOMATION<\/p>[\s\S]*?<h2>地点情報<\/h2>[\s\S]*?＋ 地点登録/);
assert.match(spotCard, /spotEvaluationHeader sectionHeading reportSectionHeading dashboardScreenHeader/);
assert.match(css, /\.spotEvaluationCard \{[^}]*padding:0;[^}]*border:0;[^}]*background:transparent/);
assert.match(css, /\.spotInternalTabs, \.spotSelectionRow, \.sharedTimeControls \{[^}]*var\(--control-border\)[^}]*var\(--control-radius\)[^}]*var\(--control-background\)/);
assert.match(dashboard, /<nav className="appFooterNav" aria-label="アプリ内メインナビゲーション">[\s\S]*?<span>マップ<\/span>[\s\S]*?<span>釣果<\/span>[\s\S]*?<span>地点<\/span>[\s\S]*?<\/nav>/);
assert.equal((dashboard.match(/aria-current=\{/g) ?? []).length, 3);
assert.match(dashboard, /openSpotEvaluationFromMap[\s\S]*?setEnvironmentSpotId\(spotId\);[\s\S]*?setDashboardMode\("spotEvaluation"\)/);
assert.match(dashboard, /focusSelectedSpotOnMap[\s\S]*?setDashboardMode\("map"\);[\s\S]*?setMapFocusRequest/);
assert.match(css, /\.appFooterNav \{[^}]*position:fixed;[^}]*env\(safe-area-inset-bottom\)/);
assert.match(appShell, /<main className="appShell">[\s\S]*className="externalLinksFooter"[\s\S]*className="appNotice"/);
assert.match(css, /\.appShell \{[^}]*padding-bottom:\s*calc\(88px \+ env\(safe-area-inset-bottom\)\)/, "content outside the dashboard clears the fixed footer and safe area");
assert.doesNotMatch(css, /\.dashboard \{[^}]*env\(safe-area-inset-bottom\)/, "footer clearance is not limited to the dashboard");
assert.match(css, /\.appFooterNav button\.active[^}]*color:/);

console.log("Issue 419 footer navigation checks passed");
