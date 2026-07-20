import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appShell = readFileSync("src/components/AppShell.tsx", "utf8");
const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
const externalCatchMemoSection = readFileSync("src/components/ExternalCatchMemoSection.tsx", "utf8");
const fishingDomain = readFileSync("src/domain/fishing.ts", "utf8");
const page = readFileSync("src/app/page.tsx", "utf8");

const hookSource = readFileSync("src/hooks/useExternalCatchMemos.ts", "utf8");
const externalSources = readFileSync("src/data/externalSources.ts", "utf8");
const masterDataSeed = readFileSync(
  "supabase/sql/003_master_data_seed.sql",
  "utf8",
);
const userSelfReportMigration = readFileSync(
  "supabase/migrations/20260712000100_add_user_self_report_source.sql",
  "utf8",
);

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

assert.equal(
  countMatches(appShell, /useSupabaseAuth\s*\(/g),
  1,
  "AppShell must call useSupabaseAuth() exactly once",
);
assert.equal(
  countMatches(dashboard, /useSupabaseAuth\s*\(/g),
  0,
  "FishingDashboard must not call useSupabaseAuth()",
);
assert.match(
  dashboard,
  /type FishingDashboardProps = \{ auth: ReturnType<typeof useSupabaseAuth> \}/,
  "FishingDashboard receives auth from AppShell props",
);
assert.match(page, /<AppShell\s*\/?>/, "page renders AppShell");

assert.doesNotMatch(
  appShell,
  /<a\s+className="button"[\s\S]*?href="#map"[\s\S]*?>[\s\S]*?マップを見る[\s\S]*?<\/a>/,
  "hero must not render the redundant map CTA button",
);
assert.doesNotMatch(
  appShell,
  /マップを見る/,
  "AppShell user-facing text must not include マップを見る",
);
assert.match(
  appShell,
  /<a href="#map">地図<\/a>/,
  "header navigation map link remains available",
);
assert.doesNotMatch(
  dashboard,
  /<div className="panel filters">[\s\S]*?<\/div>/,
  "FishingDashboard must not leave the removed panel filters card/container",
);
assert.doesNotMatch(
  dashboard,
  /Post-MVP \/ 自分の釣果記録/,
  "FishingDashboard must not render the Post-MVP self-record eyebrow above the map",
);
assert.doesNotMatch(
  dashboard,
  /<h2>Map<\/h2>/,
  "FishingDashboard must not render the redundant Map heading above the map",
);
assert.doesNotMatch(
  dashboard,
  /MasterDataStatusChip|dataSourceStatus|データ: Supabase|データ: 静的fallback|データ読込中/,
  "master data status chip display code is removed from the map header area",
);
assert.match(
  dashboard,
  /fetchMasterData\(\)[\s\S]*?\.then\(\(result\) => \{[\s\S]*?setMasterData\(result\.data\)/,
  "master data fetch from Supabase/static repository remains active",
);
assert.match(
  dashboard,
  /\.catch\(\(\) => \{[\s\S]*?setMasterData\(getStaticMasterData\(\)\)/,
  "master data fallback to static data remains active",
);

assert.equal(
  countMatches(dashboard, /<AuthStatusPanel\b/g),
  0,
  "Dashboard must not contain persistent AuthStatusPanel",
);
assert.equal(
  countMatches(appShell, /<AuthStatusPanel\b/g),
  1,
  "AuthStatusPanel is only inside the header modal",
);
assert.match(
  appShell,
  /className="authNavButton"[\s\S]*?onClick=\{\(\) => setIsAuthOpen\(true\)\}/,
  "header button opens auth modal",
);
assert.match(appShell, /role="dialog"/, "auth modal has dialog role");
assert.match(appShell, /aria-modal="true"/, "auth modal is aria-modal");
assert.match(
  appShell,
  /aria-labelledby="auth-modal-heading"/,
  "auth modal is labelled",
);
assert.match(
  appShell,
  /className="authModalClose"[\s\S]*?setIsAuthOpen\(false\)/,
  "auth modal has close button",
);
assert.match(
  appShell,
  /event\.key === "Escape"[\s\S]*?setIsAuthOpen\(false\)/,
  "Escape closes auth modal",
);
assert.match(
  appShell,
  /className="authModalBackdrop"[\s\S]*?onClick=\{\(\) => setIsAuthOpen\(false\)\}/,
  "backdrop click closes auth modal",
);

const expectedLinks = [
  "https://www.chowari.jp/",
  "https://anglers.jp/catches",
  "https://marukin-net.co.jp/fishing-report/",
  "https://釣り場.com/",
];
for (const href of expectedLinks) {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    appShell,
    new RegExp(
      String.raw`<a[\s\S]*?href="${escaped}"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"`,
    ),
    `external link ${href} must open safely in a new tab`,
  );
}
assert.equal(
  countMatches(appShell, /target="_blank"/g),
  4,
  "exactly four external reference links are rendered",
);
assert.equal(
  countMatches(appShell, /rel="noopener noreferrer"/g),
  4,
  "all external reference links use noopener noreferrer",
);

assert.match(
  dashboard,
  /const filteredManualCatchMemos = useMemo\(\(\) => \{[\s\S]*?manualCatchMemos\.filter/,
  "catch list filters manual memos only",
);
assert.match(
  dashboard,
  /displayMemos=\{filteredManualCatchMemos\}/,
  "catch list passes filtered manual memos to the catch record section",
);
assert.doesNotMatch(
  dashboard,
  /mockFishingReports\.map\(\(report\) => <ExternalMemoCard/,
  "mock reports must not be rendered as catch list cards",
);
assert.doesNotMatch(
  dashboard,
  /reports\.map\(\(report\) => <ExternalMemoCard/,
  "filtered mock reports must not be rendered as catch list cards",
);

assert.doesNotMatch(
  dashboard,
  /manual memo|手入力釣果期間フィルタ/,
  "FishingDashboard user-facing labels do not use legacy manual memo wording",
);
assert.doesNotMatch(
  dashboard,
  /魚種、釣り方、日付、出典をカードごとに確認できます。/,
  "catch list description does not mention source display",
);
assert.match(
  dashboard,
  /自分の釣果期間フィルタ/,
  "catch date filter is labelled as self catch records",
);
assert.doesNotMatch(
  dashboard,
  /平均SCOREに使う既存地点SCORE|legacySpotEvaluations/,
  "legacy area evaluation UI is not rendered",
);
assert.doesNotMatch(
  hookSource,
  /外部釣果メモ/,
  "save and migration errors shown in the catch record UI do not mention external catch memos",
);

assert.match(
  fishingDomain,
  /species === "青物" \|\| species === "根魚" \? `\$\{species\}（旧分類）` : species/,
  "legacy 青物 and 根魚 records are labelled as old classifications while normal species remain unchanged",
);
assert.match(
  externalCatchMemoSection,
  /<h3>[\s\S]*?legacySpeciesLabel\(memo\.species as FishSpeciesName\)[\s\S]*?<\/h3>/,
  "catch cards use the legacy species display rule",
);
assert.match(
  externalCatchMemoSection,
  /aria-label=\{`\$\{memo\.caughtDate\} \$\{legacySpeciesLabel\(memo\.species as FishSpeciesName\)\} \$\{memo\.areaName\}の釣果を編集`\}/,
  "catch edit button accessibility labels use the legacy species display rule",
);
assert.match(dashboard, /groupSelectableFishSpecies\(activeSpecies, \{ includeLegacyAggregates: true \}\)/, "the dashboard uses shared species UI grouping with legacy aggregate filters");
assert.match(dashboard, /species === "青物" \|\| species === "根魚" \? `\$\{species\}系` : species/, "aggregate filters use group labels rather than legacy-record labels");
assert.doesNotMatch(dashboard, /legacySpeciesLabel/, "group filters must not reuse legacy record labels");

const staticUserSelfReportReviewedAt = externalSources.match(
  /sourceId: "user-self-report"[\s\S]*?reviewedAt: "(\d{4}-\d{2}-\d{2})"/,
)?.[1];
const seedUserSelfReportReviewedAt = masterDataSeed.match(
  /'user-self-report'[\s\S]*?'(\d{4}-\d{2}-\d{2})'::date/,
)?.[1];
const migrationUserSelfReportReviewedAt = userSelfReportMigration.match(
  /'user-self-report'[\s\S]*?date '(\d{4}-\d{2}-\d{2})'/,
)?.[1];
assert.equal(
  staticUserSelfReportReviewedAt,
  "2026-07-12",
  "static user-self-report reviewedAt is the current reviewed date",
);
assert.equal(
  staticUserSelfReportReviewedAt,
  seedUserSelfReportReviewedAt,
  "static user-self-report reviewedAt matches seed SQL",
);
assert.equal(
  staticUserSelfReportReviewedAt,
  migrationUserSelfReportReviewedAt,
  "static user-self-report reviewedAt matches migration SQL",
);

assert.match(
  dashboard,
  /useState<DashboardMode>\("catchReports"\)/,
  "initial dashboard mode is catch reports",
);
assert.match(
  dashboard,
  /className="dashboardModeSwitch"[\s\S]*?role="group"[\s\S]*?aria-label="メイン表示モードを選択"[\s\S]*?釣果情報[\s\S]*?地点評価/,
  "large catch report / spot evaluation button group exists",
);
assert.match(
  dashboard,
  /aria-pressed=\{dashboardMode === "catchReports"\}[\s\S]*?aria-pressed=\{dashboardMode === "spotEvaluation"\}/,
  "mode switch buttons expose selected state with aria-pressed",
);
assert.doesNotMatch(
  dashboard,
  /role="tablist"|role="tab"|role="tabpanel"|aria-controls=|aria-selected=|aria-labelledby="catch-reports-mode-tab"|aria-labelledby="spot-evaluation-mode-tab"/,
  "incomplete tab semantics are not used for the main mode switch",
);
assert.doesNotMatch(
  dashboard,
  /釣果一覧[\s\S]*?地点評価一覧/,
  "legacy small report / area list switch is removed",
);
assert.match(
  dashboard,
  /<FishingMap[\s\S]*?reports=\{adjustedMockFishingReports\}[\s\S]*?externalMemos=\{externalMemos\}[\s\S]*?spots=\{fishingSpots\}/,
  "map receives unfiltered reports, memos, and spots",
);
assert.doesNotMatch(
  dashboard,
  /filteredExternalMemosForMap|<FishingMap[\s\S]*?reports=\{reports\}/,
  "map inputs are independent from catch filters",
);
assert.match(
  dashboard,
  /dashboardMode === "catchReports"[\s\S]*?aria-label="釣果フィルタ"[\s\S]*?ExternalCatchMemoSection[\s\S]*?dashboardMode === "spotEvaluation"|dashboardMode === "catchReports"[\s\S]*?aria-label="釣果フィルタ"[\s\S]*?ExternalCatchMemoSection[\s\S]*?\) : \(/,
  "catch filters and catch memo CRUD remain inside catch report mode",
);
assert.match(
  dashboard,
  /const \[spotEvaluationTab, setSpotEvaluationTab\] = useState<SpotEvaluationTab>\("評価"\)/,
  "spot evaluation internal tab state is owned by FishingDashboard",
);
assert.doesNotMatch(
  dashboard,
  /内部タブ状態/,
  "spot evaluation internal tab state is not exposed in user-facing UI",
);
assert.match(
  dashboard,
  /selectedTime=\{selectedEnvironmentTime\}[\s\S]*?onSelectedTimeChange=\{changeSelectedEnvironmentTime\}/,
  "SpotEvaluationCard selected time is controlled by FishingDashboard",
);

const memoSection = readFileSync(
  "src/components/ExternalCatchMemoSection.tsx",
  "utf8",
);
assert.match(
  memoSection,
  /<h2 id="external-memos-heading">\{title\}<\/h2>/,
  "registration/edit modal uses dynamic create/edit heading",
);
assert.doesNotMatch(
  memoSection,
  /情報元URL\*|情報元\*|信頼度<select|出典URL/,
  "catch record form and cards do not expose external source fields",
);
assert.match(
  memoSection,
  /USER_SELF_REPORT_SOURCE_ID = "user-self-report"/,
  "new catch records use internal self-report source id",
);
assert.match(
  memoSection,
  /confidence: editingMemo\?\.confidence \?\? "high"/,
  "new catch records default to high confidence while edits keep existing confidence",
);
assert.match(
  memoSection,
  /sourceId: editingMemo\?\.sourceId \?\? USER_SELF_REPORT_SOURCE_ID/,
  "edits keep existing hidden source id",
);
assert.match(
  memoSection,
  /createdAt: editingMemo\?\.createdAt \?\? now/,
  "edits preserve createdAt",
);
assert.match(
  memoSection,
  /if \(!window\.confirm/,
  "delete requires confirmation",
);
assert.match(
  memoSection,
  /<details className="externalMemoMigration">/,
  "localStorage migration UI is outside the modal in compact details",
);
assert.match(
  memoSection,
  /aria-label=\{`\$\{memo\.caughtDate\} \$\{legacySpeciesLabel\(memo\.species as FishSpeciesName\)\} \$\{memo\.areaName\}の釣果を編集`\}/,
  "each catch card has an accessible edit button using the legacy display rule",
);

console.log("UI requirement static checks passed");
