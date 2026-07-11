import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const expectedSoftDeleteBody = `declare
  caller_id uuid := auth.uid();
  updated_count integer := 0;
begin
  if caller_id is null then
    return false;
  end if;

  update public.external_catch_memos
  set
    is_deleted = true,
    updated_at = pg_catalog.now()
  where
    id = p_memo_id
    and owner_id = caller_id
    and created_by = 'authenticated_user'
    and is_deleted = false;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;`;

function normalizeText(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}

export function inspectBootstrapSchemaDiff(sql) {
  let normalized = normalizeText(sql);
  if (!normalized || normalized === '-- No schema drift found.') {
    return { ok: true, kind: 'empty' };
  }

  normalized = normalized.replace(/^set\s+check_function_bodies\s*=\s*off;\s*/i, '');

  const functionPattern = /^CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.soft_delete_external_catch_memo\(p_memo_id\s+text\)\s+RETURNS\s+boolean\s+LANGUAGE\s+plpgsql\s+SECURITY\s+DEFINER\s+SET\s+search_path\s+TO\s+''\s+AS\s+\$function\$\s*([\s\S]*?)\s*\$function\$\s*;$/i;
  const match = normalized.match(functionPattern);

  if (!match) {
    return {
      ok: false,
      kind: 'unexpected-diff',
      reason: 'Schema diff contains SQL other than the allowlisted soft-delete function formatting difference.',
    };
  }

  if (normalizeText(match[1]) !== normalizeText(expectedSoftDeleteBody)) {
    return {
      ok: false,
      kind: 'unexpected-function-change',
      reason: 'The soft-delete function body differs semantically from the reviewed implementation.',
    };
  }

  return { ok: true, kind: 'known-function-line-ending-diff' };
}

function runCli() {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node scripts/check-bootstrap-schema-diff.mjs <diff-file>');
    process.exit(2);
  }

  const result = inspectBootstrapSchemaDiff(readFileSync(path, 'utf8'));
  if (!result.ok) {
    console.error(result.reason);
    process.exit(1);
  }

  if (result.kind === 'empty') {
    console.log('Bootstrap schema diff is empty.');
  } else {
    console.log('Bootstrap schema diff contains only the reviewed soft-delete function line-ending difference.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
