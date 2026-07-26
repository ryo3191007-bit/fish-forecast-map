import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const trackedFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith(".next/") && !file.startsWith("node_modules/"));

const authFiles = [
  "src/hooks/useSupabaseAuth.ts",
  "src/components/AuthStatusPanel.tsx",
  "src/lib/supabaseClient.ts",
].filter((file) => trackedFiles.includes(file));

const secretValuePatterns = [
  ["Supabase service-role JWT-like value", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ["Postgres connection URL with concrete credentials", /postgres(?:ql)?:\/\/(?![<[{]|example-)[^\s:@)"'`<]+:(?![<[{]|example-)[^\s:@)"'`<]+@[^\s)"'`]+/i],
  ["DB password assignment", /(?:db_password|database_password|SUPABASE_DB_PASSWORD)\s*[:=]\s*[^\s]+/i],
];

const authForbiddenPatterns = [
  ["service role env usage", /process\.env\.(?:(?:SUPABASE_)?SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY)/],
  ["DB URL env usage", /process\.env\.(?:SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL)/],
  ["DB password env usage", /process\.env\.(?:SUPABASE_DB_PASSWORD|DB_PASSWORD|DATABASE_PASSWORD)/],
];

const checks = [];

for (const file of trackedFiles) {
  const content = readFileSync(file, "utf8");
  for (const [label, pattern] of secretValuePatterns) {
    checks.push([`${file}: no ${label}`, !pattern.test(content)]);
  }
}

for (const file of authFiles) {
  const content = readFileSync(file, "utf8");
  for (const [label, pattern] of authForbiddenPatterns) {
    checks.push([`${file}: no ${label}`, !pattern.test(content)]);
  }
}

const authHook = readFileSync("src/hooks/useSupabaseAuth.ts", "utf8");
checks.push(["auth hook uses shared safe Supabase client", /getSupabaseClient/.test(authHook)]);
checks.push(["auth hook supports unavailable status", /unavailable/.test(authHook)]);
checks.push(["auth hook supports password sign in", /signInWithPassword/.test(authHook)]);
checks.push(["auth hook supports password sign up", /\.auth\.signUp\(/.test(authHook)]);
checks.push(["auth hook supports password recovery email", /resetPasswordForEmail/.test(authHook)]);
checks.push(["auth hook supports password update", /updateUser\(\{\s*password/.test(authHook)]);
checks.push(["auth hook no longer depends on magic-link sign in", !/signInWithOtp/.test(authHook)]);
checks.push(["auth hook does not include social OAuth", !/signInWithOAuth/.test(authHook)]);

const authPanel = readFileSync("src/components/AuthStatusPanel.tsx", "utf8");
checks.push(["auth panel exposes password login", /type="password"/.test(authPanel) && /ログイン/.test(authPanel)]);
checks.push(["auth panel exposes registration", /新規登録/.test(authPanel)]);
checks.push(["auth panel exposes password reset", /パスワードを設定・忘れた方/.test(authPanel)]);
checks.push(["auth panel has no Google login", !/Googleで続ける/.test(authPanel)]);
checks.push(["auth panel does not restrict docomo email", !/@docomo\.ne\.jp.*(?:拒否|禁止|invalid|deny)/i.test(authPanel)]);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "ok" : "ng"}: ${label}`);
  if (!passed) failed = true;
}

if (failed) {
  console.error("Auth safety check failed without DB/network access.");
  process.exit(1);
}

console.log("Auth safety check passed without DB/network access.");
