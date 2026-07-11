import { readFileSync } from "node:fs";

const repository = readFileSync("src/lib/externalCatchMemoRepository.ts", "utf8");
const hook = readFileSync("src/hooks/useExternalCatchMemos.ts", "utf8");
const mapper = readFileSync("src/lib/externalCatchMemoMapper.ts", "utf8");
const rpcSql = readFileSync("supabase/sql/006_soft_delete_external_catch_memo_rpc.sql", "utf8");
const hardenedRpcSql = readFileSync("supabase/sql/007_harden_soft_delete_external_catch_memo_rpc.sql", "utf8");
const combined = `${repository}\n${hook}\n${mapper}\n${rpcSql}\n${hardenedRpcSql}`;
const normalized = combined.toLowerCase().replace(/\s+/g, " ");

const checks = [
  ["read requires caller user id", /fetchExternalCatchMemosFromSupabase\(userId: string \| null\)/.test(repository)],
  ["read filters owner_id and is_deleted=false", /\.eq\("owner_id", clientStatus\.userId\)[\s\S]*\.eq\("is_deleted", false\)/.test(repository)],
  ["save sets owner_id from auth user", /owner_id: clientStatus\.userId/.test(repository)],
  ["save sets created_by authenticated_user", /created_by: "authenticated_user"/.test(repository)],
  ["save sets is_deleted false", /is_deleted: false/.test(repository)],
  ["delete calls owner-scoped soft delete RPC", /\.rpc\("soft_delete_external_catch_memo", \{ p_memo_id: memoId \}\)/.test(repository)],
  ["delete success depends on RPC data true", /if \(data !== true\)/.test(repository)],
  ["RPC SQL is logical update", /update public\.external_catch_memos[\s\S]*is_deleted = true/.test(hardenedRpcSql)],
  ["hardened RPC SQL is security definer", /security definer/i.test(hardenedRpcSql)],
  ["hardened RPC SQL has empty search_path", /set search_path = ''/i.test(hardenedRpcSql)],
  ["hardened RPC SQL returns false when auth uid is null", /caller_id uuid := auth\.uid\(\);[\s\S]*if caller_id is null then[\s\S]*return false;/i.test(hardenedRpcSql)],
  ["hardened RPC SQL scopes by id owner authenticated_user and active row", /id = p_memo_id[\s\S]*owner_id = caller_id[\s\S]*created_by = 'authenticated_user'[\s\S]*is_deleted = false/.test(hardenedRpcSql)],
  ["hardened RPC SQL uses fully qualified update and now", /update public\.external_catch_memos[\s\S]*updated_at = pg_catalog\.now\(\)/.test(hardenedRpcSql)],
  ["hardened RPC SQL returns true only for one updated row", /get diagnostics updated_count = row_count;[\s\S]*return updated_count = 1;/.test(hardenedRpcSql)],
  ["hardened RPC SQL grants authenticated only", /revoke all[\s\S]*from public;[\s\S]*revoke all[\s\S]*from anon;[\s\S]*grant execute[\s\S]*to authenticated;/.test(hardenedRpcSql)],
  ["diagnostic logging is not disabled in production", /console\.warn/.test(repository) && !/NODE_ENV\s*={2,3}\s*["']production/.test(repository)],
  ["diagnostics are sanitized before fallback/logging", /sanitizeDiagnosticMessage/.test(repository) && /warnDeleteDiagnostic\(diagnostic\)/.test(repository)],
  ["delete does not select updated deleted row", !/update\(\{ is_deleted: true[\s\S]*?\.select\("id"\)/.test(repository)],
  ["does not call Supabase physical delete", !/\.delete\s*\(/.test(repository)],
  ["fallback handles unauthenticated", /not-authenticated/.test(combined)],
  ["fallback handles Supabase errors", /supabase-error/.test(combined)],
  ["DB write failure saves local memo", /DB保存に失敗したため/.test(hook) && /saveLocalOriginMemos\(optimisticMemos, nextLocalMemoIds, mutationUserId\)/.test(hook)],
  ["localStorage key is unchanged", /fish-forecast-map\.external-catch-memos/.test(readFileSync("src/lib/externalCatchMemoStorage.ts", "utf8"))],
  ["does not auto migrate localStorage to DB", !/manual_local_storage_migration|migrateLocal|autoMigrate/i.test(repository + hook)],
  ["does not grant all", !/grant\s+all\b/i.test(normalized)],
  ["does not mention service role key", !/service[_ -]?role[_ -]?key/i.test(combined)],
  ["does not contain postgres connection URL", !/postgres(?:ql)?:\/\//i.test(combined)],
  ["does not contain DB password", !/db_password|database_password|password\s*=/i.test(normalized)],
  ["does not mention .env.local", !/\.env\.local/i.test(combined)],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "ok" : "ng"}: ${label}`);
  if (!passed) failed = true;
}

if (failed) {
  console.error("External memo auth repository safety check failed.");
  process.exit(1);
}

console.log("External memo auth repository safety check passed without DB/network access.");
