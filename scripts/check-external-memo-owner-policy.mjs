import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sqlPath = resolve("supabase/sql/005_external_catch_memos_owner_policies.sql");
const sql = readFileSync(sqlPath, "utf8");
const normalized = sql.toLowerCase().replace(/\s+/g, " ");

const checks = [
  ["policy SQL exists for external_catch_memos", /public\.external_catch_memos/i.test(sql)],
  ["enables RLS", /alter table public\.external_catch_memos enable row level security/i.test(sql)],
  ["targets authenticated role", /\bto\s+authenticated\b/i.test(normalized)],
  ["scopes rows by owner_id = auth.uid()", /owner_id\s*=\s*auth\.uid\s*\(\s*\)/i.test(sql)],
  ["select hides soft-deleted rows", /for\s+select[\s\S]*owner_id\s*=\s*auth\.uid\s*\(\s*\)[\s\S]*is_deleted\s*=\s*false/i.test(sql)],
  ["insert requires authenticated_user rows", /for\s+insert[\s\S]*owner_id\s*=\s*auth\.uid\s*\(\s*\)[\s\S]*created_by\s*=\s*'authenticated_user'/i.test(sql)],
  ["update is owner scoped", /for\s+update[\s\S]*owner_id\s*=\s*auth\.uid\s*\(\s*\)/i.test(sql)],
  ["does not define a physical delete policy", !/for\s+delete/i.test(normalized)],
  ["does not grant anon writes", !/grant\s+[^;]*\b(insert|update|delete|all)\b[^;]*\bto\s+anon\b/i.test(normalized)],
  ["does not grant all", !/grant\s+all\b/i.test(normalized)],
  ["does not mention service role key", !/service[_ -]?role[_ -]?key/i.test(sql)],
  ["does not contain postgres connection URL", !/postgres(?:ql)?:\/\//i.test(sql)],
  ["does not contain password assignment", !/password\s*=|db_password|database_password/i.test(normalized)],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "ok" : "ng"}: ${label}`);
  if (!passed) failed = true;
}

if (failed) {
  console.error("External memo owner policy safety check failed.");
  process.exit(1);
}

console.log("External memo owner policy safety check passed without DB/network access.");
