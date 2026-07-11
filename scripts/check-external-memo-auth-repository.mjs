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
  ["delete is logical update", /\.update\(\{ is_deleted: true, updated_at: new Date\(\)\.toISOString\(\) \}, \{ count: "exact" \}\)/.test(repository)],
  ["delete scopes existence check by id owner and active row", /\.select\("id"\)[\s\S]*\.eq\("id", memoId\)[\s\S]*\.eq\("owner_id", clientStatus\.userId\)[\s\S]*\.eq\("is_deleted", false\)[\s\S]*\.maybeSingle\(\)/.test(repository)],
  ["delete update scopes by id owner and active row", /\.update\(\{ is_deleted: true, updated_at: new Date\(\)\.toISOString\(\) \}, \{ count: "exact" \}\)[\s\S]*\.eq\("id", memoId\)[\s\S]*\.eq\("owner_id", clientStatus\.userId\)[\s\S]*\.eq\("is_deleted", false\)/.test(repository)],
  ["delete success depends on exact update count", /if \(count !== 1\) return fallback\(null, "supabase-error", "No matching external catch memo row was deleted\."\)/.test(repository)],
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
