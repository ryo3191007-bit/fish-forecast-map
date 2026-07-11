import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const defaultMigrationDir = 'supabase/migrations';

const checks = [
  ['DROP TABLE', /\bdrop\s+table\b/i],
  ['DROP COLUMN', /\bdrop\s+column\b/i],
  ['TRUNCATE', /\btruncate\b/i],
  ['type-changing ALTER COLUMN', /\balter\s+table\b[\s\S]*\balter\s+column\b[\s\S]*\b(?:set\s+data\s+type|type)\b/i],
  ['unconditional DELETE', /\bdelete\s+from\b(?:(?!;|\bwhere\b)[\s\S])*(?:;|$)/i],
  ['unconditional UPDATE', /\bupdate\s+[\w."-]+\s+set\b(?:(?!\bwhere\b)[\s\S])*(?:;|$)/i],
  ['RLS disabled', /\balter\s+table\b[\s\S]*\bdisable\s+row\s+level\s+security\b/i],
  ['anon write grant', /\bgrant\s+(?=[\s\S]*?\b(?:insert|update|delete|all|all\s+privileges)\b)[\s\S]*?\bon\b[\s\S]*?\bto\s+anon\b/i],
  ['GRANT ALL', /\bgrant\s+(?:all|all\s+privileges)\b/i],
];

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

function findSecurityDefinerIssues(sql) {
  const issues = [];
  const functionPattern = /\bcreate\s+(?:or\s+replace\s+)?function\b[\s\S]*?\bas\s+(\$[\w-]*\$)[\s\S]*?\1[\s\S]*?(?:;|$)/gi;
  const functionStatements = sql.matchAll(functionPattern);

  for (const match of functionStatements) {
    const statement = match[0];
    if (/\bsecurity\s+definer\b/i.test(statement) && !/\bset\s+search_path\s*=/i.test(statement)) {
      issues.push('SECURITY DEFINER without SET search_path');
    }
  }

  return issues;
}

export function findMigrationSafetyIssues(migrationDir = defaultMigrationDir) {
  const issues = [];

  for (const file of listSqlFiles(migrationDir)) {
    const sql = readFileSync(file, 'utf8');
    for (const [label, pattern] of checks) {
      if (pattern.test(sql)) issues.push(`${file}: detected ${label}`);
    }
    for (const label of findSecurityDefinerIssues(sql)) {
      issues.push(`${file}: detected ${label}`);
    }
  }

  return issues;
}

function runCli() {
  const issues = findMigrationSafetyIssues(process.env.MIGRATION_SAFETY_DIR ?? defaultMigrationDir);

  if (issues.length > 0) {
    console.error('Potentially destructive or privileged migration SQL was detected.');
    console.error('This regex-based gate is not a complete safety proof; human review is still required.');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log('Migration safety check passed. Human review is still required for DB changes.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
