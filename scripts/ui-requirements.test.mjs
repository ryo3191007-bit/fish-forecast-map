import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appShell = readFileSync('src/components/AppShell.tsx', 'utf8');
const dashboard = readFileSync('src/components/FishingDashboard.tsx', 'utf8');
const page = readFileSync('src/app/page.tsx', 'utf8');

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

assert.equal(countMatches(appShell, /useSupabaseAuth\s*\(/g), 1, 'AppShell must call useSupabaseAuth() exactly once');
assert.equal(countMatches(dashboard, /useSupabaseAuth\s*\(/g), 0, 'FishingDashboard must not call useSupabaseAuth()');
assert.match(dashboard, /type FishingDashboardProps = \{ auth: ReturnType<typeof useSupabaseAuth> \}/, 'FishingDashboard receives auth from AppShell props');
assert.match(page, /<AppShell\s*\/?>/, 'page renders AppShell');

assert.equal(countMatches(dashboard, /<AuthStatusPanel\b/g), 0, 'Dashboard must not contain persistent AuthStatusPanel');
assert.equal(countMatches(appShell, /<AuthStatusPanel\b/g), 1, 'AuthStatusPanel is only inside the header modal');
assert.match(appShell, /className="authNavButton"[\s\S]*?onClick=\{\(\) => setIsAuthOpen\(true\)\}/, 'header button opens auth modal');
assert.match(appShell, /role="dialog"/, 'auth modal has dialog role');
assert.match(appShell, /aria-modal="true"/, 'auth modal is aria-modal');
assert.match(appShell, /aria-labelledby="auth-modal-heading"/, 'auth modal is labelled');
assert.match(appShell, /className="authModalClose"[\s\S]*?setIsAuthOpen\(false\)/, 'auth modal has close button');
assert.match(appShell, /event\.key === "Escape"[\s\S]*?setIsAuthOpen\(false\)/, 'Escape closes auth modal');
assert.match(appShell, /className="authModalBackdrop"[\s\S]*?onClick=\{\(\) => setIsAuthOpen\(false\)\}/, 'backdrop click closes auth modal');

const expectedLinks = [
  'https://www.chowari.jp/',
  'https://anglers.jp/catches',
  'https://marukin-net.co.jp/fishing-report/',
  'https://釣り場.com/',
];
for (const href of expectedLinks) {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(appShell, new RegExp(`<a href="${escaped}" target="_blank" rel="noopener noreferrer"`), `external link ${href} must open safely in a new tab`);
}
assert.equal(countMatches(appShell, /target="_blank" rel="noopener noreferrer"/g), 4, 'exactly four external reference links are rendered');

assert.match(dashboard, /const filteredManualCatchMemos = useMemo\(\(\) => \{[\s\S]*?manualCatchMemos\.filter/, 'catch list filters manual memos only');
assert.match(dashboard, /displayMemos=\{filteredManualCatchMemos\}/, 'catch list passes filtered manual memos to the catch record section');
assert.doesNotMatch(dashboard, /mockFishingReports\.map\(\(report\) => <ExternalMemoCard/, 'mock reports must not be rendered as catch list cards');
assert.doesNotMatch(dashboard, /reports\.map\(\(report\) => <ExternalMemoCard/, 'filtered mock reports must not be rendered as catch list cards');

assert.match(dashboard, /const filteredExternalMemosForMap = useMemo\(\(\) => \{[\s\S]*?externalMemos\.filter/, 'map filters from all external memos');
assert.match(dashboard, /<FishingMap reports=\{reports\} externalMemos=\{filteredExternalMemosForMap\}/, 'map receives the all-acquisition-method memo candidates');
assert.doesNotMatch(dashboard, /<FishingMap reports=\{reports\} externalMemos=\{filteredManualCatchMemos\}/, 'map must not receive manual-only list candidates');

const memoSection = readFileSync('src/components/ExternalCatchMemoSection.tsx', 'utf8');
assert.match(memoSection, /<h2 id="external-memos-heading">\{title\}<\/h2>/, 'registration/edit modal uses dynamic create/edit heading');
assert.doesNotMatch(memoSection, /情報元URL\*|情報元\*|信頼度<select|出典URL/, 'catch record form and cards do not expose external source fields');
assert.match(memoSection, /USER_SELF_REPORT_SOURCE_ID = "user-self-report"/, 'new catch records use internal self-report source id');
assert.match(memoSection, /confidence: editingMemo\?\.confidence \?\? "high"/, 'new catch records default to high confidence while edits keep existing confidence');
assert.match(memoSection, /sourceId: editingMemo\?\.sourceId \?\? USER_SELF_REPORT_SOURCE_ID/, 'edits keep existing hidden source id');
assert.match(memoSection, /createdAt: editingMemo\?\.createdAt \?\? now/, 'edits preserve createdAt');
assert.match(memoSection, /if \(!window\.confirm/, 'delete requires confirmation');
assert.match(memoSection, /<details className="externalMemoMigration">/, 'localStorage migration UI is outside the modal in compact details');
assert.match(memoSection, /aria-label=\{`\$\{memo\.caughtDate\} \$\{memo\.species\} \$\{memo\.areaName\}の釣果を編集`\}/, 'each catch card has an accessible edit button');

console.log('UI requirement static checks passed');
