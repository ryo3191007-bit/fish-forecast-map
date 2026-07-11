import { inspectBootstrapSchemaDiff } from './check-bootstrap-schema-diff.mjs';

function assertAccepted(name, sql, expectedKind) {
  const result = inspectBootstrapSchemaDiff(sql);
  if (!result.ok || result.kind !== expectedKind) {
    console.error(`${name}: expected ${expectedKind}`);
    console.error(result);
    process.exit(1);
  }
}

function assertRejected(name, sql) {
  const result = inspectBootstrapSchemaDiff(sql);
  if (result.ok) {
    console.error(`${name}: expected rejection`);
    console.error(result);
    process.exit(1);
  }
}

const reviewedFunction = `set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.soft_delete_external_catch_memo(p_memo_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
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
end;
$function$
;
`;

assertAccepted('empty diff', '', 'empty');
assertAccepted('explicit no-drift marker', '-- No schema drift found.\n', 'empty');
assertAccepted('reviewed LF function diff', reviewedFunction, 'known-function-line-ending-diff');
assertAccepted('reviewed CRLF function diff', reviewedFunction.replace(/\n/g, '\r\n'), 'known-function-line-ending-diff');

assertRejected('changed owner predicate', reviewedFunction.replace('and owner_id = caller_id', 'or owner_id = caller_id'));
assertRejected('missing SECURITY DEFINER', reviewedFunction.replace(' SECURITY DEFINER\n', ' SECURITY INVOKER\n'));
assertRejected('widened created_by scope', reviewedFunction.replace("and created_by = 'authenticated_user'", "and created_by <> 'admin_import'"));
assertRejected('extra destructive statement', `${reviewedFunction}\ndrop table public.external_catch_memos;`);
assertRejected('different function', reviewedFunction.replace('soft_delete_external_catch_memo', 'other_function'));

console.log('Bootstrap schema diff tests passed (4 accepted, 5 rejected).');
