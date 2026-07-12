import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/app/page.tsx', 'utf8');
const appShell = fs.readFileSync('src/components/AppShell.tsx', 'utf8');
const dashboard = fs.readFileSync('src/components/FishingDashboard.tsx', 'utf8');

assert(page.includes('<AppShell />'));
assert(appShell.includes('useSupabaseAuth()'));
assert(appShell.includes('role="dialog"'));
assert(appShell.includes('aria-modal="true"'));
assert(appShell.includes('aria-labelledby="auth-status-heading"'));
assert(appShell.includes('Escape'));
assert(!dashboard.includes('<AuthStatusPanel'));

const reportsBranch = dashboard.slice(dashboard.indexOf('{reportView === "reports"'), dashboard.indexOf(') : (', dashboard.indexOf('{reportView === "reports"')));
assert(!reportsBranch.includes('reports.map((report)'));
assert(reportsBranch.includes('filteredExternalMemos.map'));
assert(dashboard.includes('手入力釣果 全{externalMemos.length}件中 {filteredExternalMemos.length}件を表示中'));

for (const href of ['https://www.chowari.jp/', 'https://anglers.jp/catches', 'https://marukin-net.co.jp/fishing-report/', 'https://釣り場.com/']) {
  assert(appShell.includes(`href={href}`) || appShell.includes(href));
}
assert(appShell.includes('target="_blank"'));
assert(appShell.includes('rel="noopener noreferrer"'));
assert(appShell.includes('自動取得しているわけではありません'));

console.log('UI requirements static checks passed');
