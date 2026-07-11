import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const migrationDir = 'supabase/migrations';
const issues = [];

function listSqlFiles(dir) {
  try {
    return readdirSync(dir)
      .flatMap((entry) => {
        const path = join(dir, entry);
        const stat = statSync(path);
        return stat.isDirectory() ? listSqlFiles(path) : [path];
      })
      .filter((path) => path.endsWith('.sql'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

const checks = [
  ['DROP TABLE', /\bdrop\s+table\b/i],
  ['DROP COLUMN', /\bdrop\s+column\b/i],
  ['TRUNCATE', /\btruncate\b/i],
  ['unconditional DELETE', /\bdelete\s+from\s+[\w."-]+\s*(?:;|$)/im],
  ['unconditional UPDATE', /\bupdate\s+[\w."-]+\s+set\b(?:(?!\bwhere\b)[\s\S])*(?:;|$)/i],
  ['RLS disabled', /\balter\s+table\b[\s\S]*\bdisable\s+row\s+level\s+security\b/i],
  ['anon write grant', /\bgrant\s+(?:insert|update|delete|all|all\s+privileges)\b[\s\S]*\bto\s+anon\b/i],
  ['GRANT ALL', /\bgrant\s+(?:all|all\s+privileges)\b/i],
  ['SECURITY DEFINER without SET search_path', /\bsecurity\s+definer\b(?![\s\S]*\bset\s+search_path\s*=)/i],
];

for (const file of listSqlFiles(migrationDir)) {
  const sql = readFileSync(file, 'utf8');
  for (const [label, pattern] of checks) {
    if (pattern.test(sql)) issues.push(`${file}: detected ${label}`);
  }
}

if (issues.length > 0) {
  console.error('Potentially destructive or privileged migration SQL was detected.');
  console.error('This regex-based gate is not a complete safety proof; human review is still required.');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Migration safety check passed. Human review is still required for DB changes.');
