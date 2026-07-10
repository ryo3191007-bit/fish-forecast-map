import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sqlPath = resolve("supabase/sql/004_external_catch_memos.sql");
const sql = readFileSync(sqlPath, "utf8");
const normalized = sql.toLowerCase().replace(/\s+/g, " ");

const checks = [
  ["defines external_catch_memos", /create table if not exists public\.external_catch_memos/i.test(sql)],
  ["enables RLS", /alter table public\.external_catch_memos enable row level security/i.test(sql)],
  ["has no anon insert policy", !/\b(to|for)\s+anon\b[^;]*\b(insert|update|delete|all)\b/i.test(normalized) && !/\b(insert|update|delete|all)\b[^;]*\b(to|for)\s+anon\b/i.test(normalized)],
  ["does not grant anon writes", !/grant\s+(insert|update|delete|all)[^;]*\bto\s+anon\b/i.test(normalized)],
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
  console.error("External memo DB design safety check failed.");
  process.exit(1);
}

console.log("External memo DB design safety check passed without DB/network access.");
