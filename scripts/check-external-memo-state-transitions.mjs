import { readFileSync } from "node:fs";

const hook = readFileSync("src/hooks/useExternalCatchMemos.ts", "utf8");
const repository = readFileSync("src/lib/externalCatchMemoRepository.ts", "utf8");

const checks = [
  [
    "local-data-not-migrated disables DB mutations",
    /function shouldUseDb[\s\S]*!isLocalDataNotMigrated\(status\)/.test(hook) && /const useDb = useMemo\(\(\) => shouldUseDb\(authStatus, userId, status\)/.test(hook),
  ],
  [
    "local-data-not-migrated persist/delete keep localStorage fallback reason",
    (hook.match(/isLocalDataNotMigrated\(status\) \? "local-data-not-migrated"/g) ?? []).length >= 2,
  ],
  [
    "mutation results are ignored after auth generation or userId changes",
    /authGenerationRef/.test(hook) && /latestAuthRef/.test(hook) && (hook.match(/if \(!isCurrentAuth\(\)\) return false;/g) ?? []).length >= 4,
  ],
  [
    "DB update checks for a returned row instead of treating zero rows as success",
    /options\.mode === "update"[\s\S]*\.update\(payload\)[\s\S]*\.maybeSingle\(\)[\s\S]*if \(!data\) return fallback\(null, "supabase-error", "No matching external catch memo row was updated\."\)/.test(repository),
  ],
  [
    "DB logical delete checks for a returned row instead of treating zero rows as success",
    /\.update\(\{ is_deleted: true, updated_at: new Date\(\)\.toISOString\(\) \}\)[\s\S]*\.select\("id"\)[\s\S]*\.maybeSingle\(\)[\s\S]*if \(!data\) return fallback\(null, "supabase-error", "No matching external catch memo row was deleted\."\)/.test(repository),
  ],
  [
    "localStorage key is not changed or deleted by migration logic",
    !/removeItem\(.*external-catch-memos|manual_local_storage_migration|autoMigrate/i.test(hook + repository),
  ],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "ok" : "ng"}: ${label}`);
  if (!passed) failed = true;
}

if (failed) {
  console.error("External memo state transition check failed.");
  process.exit(1);
}

console.log("External memo state transition check passed without DB/network access.");
