import { readFileSync } from "node:fs";

const authHook = readFileSync("src/hooks/useSupabaseAuth.ts", "utf8");
const authPanel = readFileSync("src/components/AuthStatusPanel.tsx", "utf8");
const authStyles = readFileSync("src/components/AuthStatusPanel.module.css", "utf8");
const setupDoc = readFileSync("docs/AUTH_SETUP.md", "utf8");

const checks = [
  ["password sign in is implemented", authHook.includes("signInWithPassword")],
  ["password sign up is implemented", authHook.includes("auth.signUp")],
  ["social OAuth is not implemented", !authHook.includes("signInWithOAuth")],
  ["password reset mail is implemented", authHook.includes("resetPasswordForEmail")],
  ["password update is implemented", authHook.includes("updateUser({ password })")],
  ["password recovery event is handled", authHook.includes('event === "PASSWORD_RECOVERY"')],
  ["legacy magic-link sign in is removed", !authHook.includes("signInWithOtp")],
  ["Google login is not visible", !authPanel.includes("Googleで続ける")],
  ["email/password login is visible", authPanel.includes("メールアドレス") && authPanel.includes("パスワード") && authPanel.includes("ログイン")],
  ["registration is visible", authPanel.includes("新規登録")],
  ["existing magic-link users have password migration guidance", authPanel.includes("以前Magic Linkで登録した方")],
  ["password reset entry point is visible", authPanel.includes("パスワードを設定・忘れた方")],
  ["redundant login description is removed", !authPanel.includes("メールアドレス＋パスワードでログインできます")],
  ["auth UI uses dedicated responsive styles", authPanel.includes("AuthStatusPanel.module.css") && authStyles.includes("@media (max-width: 480px)")],
  ["login and registration stay side by side on narrow screens", authStyles.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") && !authStyles.includes("grid-template-columns: 1fr;")],
  ["auth button labels are vertically centered", authStyles.includes("display: flex") && authStyles.includes("align-items: center") && authStyles.includes("justify-content: center")],
  ["password reset button keeps readable width", authStyles.includes(".resetButton") && authStyles.includes("width: 100%") && authStyles.includes("word-break: keep-all")],
  ["docomo is explicitly supported", setupDoc.includes("@docomo.ne.jp")],
  ["Google provider setup is not required", !setupDoc.includes("Google provider") && !setupDoc.includes("Authorized redirect URI")],
  ["custom SMTP is documented", setupDoc.includes("Custom SMTP")],
  ["service role is not introduced in auth hook", !/SERVICE_ROLE|service_role/.test(authHook)],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "ok" : "ng"}: ${label}`);
  if (!passed) failed = true;
}

if (failed) {
  console.error("Issue #318 auth refresh test failed.");
  process.exit(1);
}

console.log("Issue #318 auth refresh test passed.");
