import { readFileSync } from "node:fs";

const repository = readFileSync("src/lib/externalCatchMemoRepository.ts", "utf8");
const hook = readFileSync("src/hooks/useExternalCatchMemos.ts", "utf8");
const mapper = readFileSync("src/lib/externalCatchMemoMapper.ts", "utf8");
const combined = `${repository}\n${hook}\n${mapper}`;
const normalized = combined.toLowerCase().replace(/\s+/g, " ");

const checks = [
  ["read requires caller user id", /fetchExternalCatchMemosFromSupabase\(userId: string \| null\)/.test(repository)],
  ["read filters owner_id and is_deleted=false", /\.eq\("owner_id", clientStatus\.userId\)[\s\S]*\.eq\("is_deleted", false\)/.test(repository)],
  ["save sets owner_id from auth user", /owner_id: clientStatus\.userId/.test(repository)],
  ["save sets created_by authenticated_user", /created_by: "authenticated_user"/.test(repository)],
  ["save sets is_deleted false", /is_deleted: false/.test(repository)],
  ["delete uses RLS-compatible RPC", /\.rpc\("soft_delete_external_catch_memo", \{ p_memo_id: memoId \}\)/.test(repository)],
  ["delete success depends on RPC true", /if \(data !== true\) return fallback\(null, "supabase-error", "No matching external catch memo row was deleted\."\)/.test(repository)],
  ["delete does not select updated deleted row", !/update\(\{ is_deleted: true[\s\S]*?\.select\("id"\)/.test(repository)],
  ["repository sanitizes diagnostic messages", /sanitizeDiagnosticMessage/.test(repository)],
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


const rpcSql = readFileSync("supabase/sql/006_soft_delete_external_catch_memo_rpc.sql", "utf8");
checks.push(
  ["RPC SQL defines soft_delete_external_catch_memo", /create or replace function public\.soft_delete_external_catch_memo\(p_memo_id text\)/i.test(rpcSql)],
  ["RPC SQL updates id owner active row only", /where id = p_memo_id[\s\S]*and owner_id = auth\.uid\(\)[\s\S]*and is_deleted = false/i.test(rpcSql)],
  ["RPC SQL sets is_deleted true and updated_at now", /is_deleted = true[\s\S]*updated_at = now\(\)/i.test(rpcSql)],
  ["RPC SQL returns boolean from row_count", /get diagnostics updated_count = row_count;[\s\S]*return updated_count = 1;/i.test(rpcSql)],
  ["RPC SQL sets search_path", /set search_path = public, auth/i.test(rpcSql)],
  ["RPC SQL grants execute only to authenticated", /grant execute on function public\.soft_delete_external_catch_memo\(text\) to authenticated/i.test(rpcSql) && /revoke all on function public\.soft_delete_external_catch_memo\(text\) from anon/i.test(rpcSql)],
  ["RPC SQL does not return updated rows", !/returning\b/i.test(rpcSql)]
);

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
