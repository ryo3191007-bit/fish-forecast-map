import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-memo-tests-'));
const source = fs.readFileSync('src/domain/manualCatchMemos.ts', 'utf8');
const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
fs.writeFileSync(path.join(tmp, 'manualCatchMemos.mjs'), out);
const { getManualCatchMemos } = await import(path.join(tmp, 'manualCatchMemos.mjs'));

const memos = [
  { id: 'manual-1', species: 'アジ', caughtDate: '2026-07-01', areaName: '唐津湾', acquisitionMethod: 'manual' },
  { id: 'ai-1', species: 'サバ', caughtDate: '2026-07-02', areaName: '唐津湾', acquisitionMethod: 'ai_assisted' },
  { id: 'auto-1', species: 'チヌ', caughtDate: '2026-07-03', areaName: '伊万里湾', acquisitionMethod: 'auto' },
  { id: 'manual-2', species: 'アジ', caughtDate: '2026-07-04', areaName: '平戸', acquisitionMethod: 'manual' },
];
const manual = getManualCatchMemos(memos);
assert.deepEqual(manual.map((memo) => memo.id), ['manual-1', 'manual-2']);
assert.equal(manual.filter((memo) => memo.species === 'アジ').length, 2);
assert.equal(manual.some((memo) => memo.acquisitionMethod === 'ai_assisted' || memo.acquisitionMethod === 'auto'), false);
console.log('3 manual catch memo cases passed');
