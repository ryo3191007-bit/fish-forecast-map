import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const defaultMigrationDir = 'supabase/migrations';

const statementChecks = [
  ['DROP TABLE', /\bdrop\s+table\b/i],
  ['DROP COLUMN', /\bdrop\s+column\b/i],
  ['TRUNCATE', /\btruncate\b/i],
  ['type-changing ALTER COLUMN', /\balter\s+table\b[\s\S]*\balter\s+column\b[\s\S]*\b(?:set\s+data\s+type|type)\b/i],
  ['RLS disabled', /\balter\s+table\b[\s\S]*\bdisable\s+row\s+level\s+security\b/i],
  ['anon write grant', /\bgrant\s+[\s\S]*\b(?:insert|update|delete|all(?:\s+privileges)?)\b[\s\S]*\bon\b[\s\S]*\bto\s+anon\b/i],
  ['GRANT ALL', /\bgrant\s+(?:all|all\s+privileges)\b/i],
];

function listSqlFiles(dir) {
  try {
    return readdirSync(dir)
      .sort()
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

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let dollarTag = null;
  let inLineComment = false;
  let blockCommentDepth = 0;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      current += char === '\n' ? '\n' : ' ';
      if (char === '\n') inLineComment = false;
      index += 1;
      continue;
    }

    if (blockCommentDepth > 0) {
      if (char === '/' && next === '*') {
        blockCommentDepth += 1;
        current += '  ';
        index += 2;
        continue;
      }
      if (char === '*' && next === '/') {
        blockCommentDepth -= 1;
        current += '  ';
        index += 2;
        continue;
      }
      current += char === '\n' ? '\n' : ' ';
      index += 1;
      continue;
    }

    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length;
        dollarTag = null;
      } else {
        current += char;
        index += 1;
      }
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === '\\' && next) {
        current += next;
        index += 2;
        continue;
      }
      if (char === "'" && next === "'") {
        current += next;
        index += 2;
        continue;
      }
      if (char === "'") inSingleQuote = false;
      index += 1;
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"' && next === '"') {
        current += next;
        index += 2;
        continue;
      }
      if (char === '"') inDoubleQuote = false;
      index += 1;
      continue;
    }

    if (char === '-' && next === '-') {
      inLineComment = true;
      current += '  ';
      index += 2;
      continue;
    }
    if (char === '/' && next === '*') {
      blockCommentDepth = 1;
      current += '  ';
      index += 2;
      continue;
    }
    if (char === "'") {
      inSingleQuote = true;
      current += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      index += 1;
      continue;
    }
    if (char === '$') {
      const match = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length;
        continue;
      }
    }
    if (char === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

function extractDollarQuotedBodies(statement) {
  const bodies = [];
  const pattern = /(\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$)([\s\S]*?)\1/g;
  for (const match of statement.matchAll(pattern)) bodies.push(match[2]);
  return bodies;
}

function maskDollarQuotedBodies(statement) {
  return statement.replace(/(\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$)[\s\S]*?\1/g, '$1 $1');
}

function maskSingleQuotedStrings(statement) {
  return statement.replace(/'(?:''|[^'])*'/g, "''");
}

function hasUnconditionalMutation(statement, pattern) {
  const match = pattern.exec(statement);
  if (!match) return false;
  return !/\bwhere\b/i.test(statement.slice(match.index));
}

function findStatementIssues(statement, { inspectSecurityDefiner = true } = {}) {
  const issues = [];
  const withoutBodies = maskDollarQuotedBodies(statement);
  const checkableSql = maskSingleQuotedStrings(withoutBodies);

  for (const [label, pattern] of statementChecks) {
    if (pattern.test(checkableSql)) issues.push(label);
  }

  if (hasUnconditionalMutation(checkableSql, /\bdelete\s+from\b/i)) {
    issues.push('unconditional DELETE');
  }
  if (hasUnconditionalMutation(checkableSql, /\bupdate\s+[\w."-]+\s+set\b/i)) {
    issues.push('unconditional UPDATE');
  }

  if (
    inspectSecurityDefiner
    && /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\b/i.test(withoutBodies)
    && /\bsecurity\s+definer\b/i.test(withoutBodies)
    && !/\bset\s+search_path\s*(?:=|to)\s*(?:''|pg_catalog\b)/i.test(withoutBodies)
  ) {
    issues.push('SECURITY DEFINER without safe SET search_path');
  }

  for (const body of extractDollarQuotedBodies(statement)) {
    for (const bodyStatement of splitSqlStatements(body)) {
      issues.push(...findStatementIssues(bodyStatement, { inspectSecurityDefiner: false }));
    }
  }

  return [...new Set(issues)];
}

export function findMigrationSafetyIssues(migrationDir = defaultMigrationDir) {
  const issues = [];

  for (const file of listSqlFiles(migrationDir)) {
    const sql = readFileSync(file, 'utf8');
    for (const statement of splitSqlStatements(sql)) {
      for (const label of findStatementIssues(statement)) {
        issues.push(`${file}: detected ${label}`);
      }
    }
  }

  return issues;
}

function runCli() {
  const issues = findMigrationSafetyIssues(process.env.MIGRATION_SAFETY_DIR ?? defaultMigrationDir);

  if (issues.length > 0) {
    console.error('Potentially destructive or privileged migration SQL was detected.');
    console.error('This heuristic gate is not a complete safety proof; human review is still required.');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log('Migration safety check passed. Human review is still required for DB changes.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
