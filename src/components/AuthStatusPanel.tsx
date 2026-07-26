"use client";

import { useState, type FormEvent } from "react";
import type { SupabaseAuthStatus } from "@/hooks/useSupabaseAuth";
import type { User } from "@supabase/supabase-js";

type AuthResult = { ok: true; message?: string } | { ok: false; message: string };

function maskEmail(email?: string) {
  if (!email) return "メール未設定";
  const [localPart, domain] = email.split("@");
  if (!domain) return email;
  const visibleLocal = localPart.length <= 2 ? localPart : `${localPart.slice(0, 2)}…`;
  return `${visibleLocal}@${domain}`;
}

type AuthStatusPanelProps = {
  auth: {
    status: SupabaseAuthStatus;
    user: User | null;
    isPasswordRecovery: boolean;
    signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
    signUpWithPassword: (email: string, password: string) => Promise<AuthResult>;
    sendPasswordReset: (email: string) => Promise<AuthResult>;
    updatePassword: (password: string) => Promise<AuthResult>;
    signOut: () => Promise<AuthResult>;
  };
};

export function AuthStatusPanel({ auth }: AuthStatusPanelProps) {
  const {
    status,
    user,
    isPasswordRecovery,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
    signOut,
  } = auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setResultMessage = (result: AuthResult, fallbackSuccess: string) => {
    setMessageType(result.ok ? "success" : "error");
    setMessage(result.ok ? (result.message ?? fallbackSuccess) : result.message);
  };

  const validateCredentials = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessageType("error");
      setMessage("メールアドレスを入力してください。");
      return null;
    }
    if (!password) {
      setMessageType("error");
      setMessage("パスワードを入力してください。");
      return null;
    }
    return { email: trimmedEmail, password };
  };

  const submitPasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const credentials = validateCredentials();
    if (!credentials) return;

    setIsSubmitting(true);
    const result = await signInWithPassword(credentials.email, credentials.password);
    setIsSubmitting(false);
    setResultMessage(result, "ログインしました。");
  };

  const handleSignUp = async () => {
    const credentials = validateCredentials();
    if (!credentials) return;

    setIsSubmitting(true);
    const result = await signUpWithPassword(credentials.email, credentials.password);
    setIsSubmitting(false);
    setResultMessage(result, "登録しました。");
  };

  const handlePasswordReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessageType("error");
      setMessage("先にメールアドレスを入力してください。");
      return;
    }

    setIsSubmitting(true);
    const result = await sendPasswordReset(trimmedEmail);
    setIsSubmitting(false);
    setResultMessage(result, "パスワード設定・再設定メールを送信しました。");
  };

  const submitNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPassword) {
      setMessageType("error");
      setMessage("新しいパスワードを入力してください。");
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(newPassword);
    setIsSubmitting(false);
    setResultMessage(result, "パスワードを更新しました。");
    if (result.ok) setNewPassword("");
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    const result = await signOut();
    setIsSubmitting(false);
    setResultMessage(result, "ログアウトしました。");
  };

  return (
    <section className="authStatusPanel" aria-labelledby="auth-status-heading">
      <div>
        <p className="eyebrow">Supabase Auth</p>
        <h3 id="auth-status-heading">ログイン</h3>
        <p className="muted">メールアドレス＋パスワードでログインできます。docomoメールを含め、メールドメインによる制限はありません。</p>
      </div>

      {status === "unavailable" ? (
        <p className="authStatusNote" role="status">認証は未設定です。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY がある環境で利用できます。</p>
      ) : null}

      {status === "loading" ? <p className="authStatusNote" role="status">認証状態を確認中...</p> : null}

      {status === "signed-out" ? (
        <div className="externalMemoForm authForm">
          <form onSubmit={submitPasswordLogin}>
            <label htmlFor="auth-email">
              メールアドレス
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label htmlFor="auth-password">
              パスワード
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>

            <div className="externalMemoActions">
              <button type="submit" className="button" disabled={isSubmitting}>{isSubmitting ? "処理中..." : "ログイン"}</button>
              <button type="button" className="clearSearchButton" onClick={handleSignUp} disabled={isSubmitting}>新規登録</button>
            </div>
          </form>

          <button type="button" className="clearSearchButton" onClick={handlePasswordReset} disabled={isSubmitting}>
            パスワードを設定・忘れた方
          </button>
          <small className="muted">以前Magic Linkで登録した方は、メールアドレスを入力してこのボタンから一度だけパスワードを設定できます。</small>
        </div>
      ) : null}

      {status === "signed-in" && isPasswordRecovery ? (
        <form className="externalMemoForm authForm" onSubmit={submitNewPassword}>
          <p className="authStatusNote">新しいパスワードを設定してください。</p>
          <label htmlFor="auth-new-password">
            新しいパスワード
            <input
              id="auth-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="button" disabled={isSubmitting}>{isSubmitting ? "更新中..." : "パスワードを更新"}</button>
        </form>
      ) : null}

      {status === "signed-in" && !isPasswordRecovery ? (
        <div className="authSignedIn" role="status">
          <span>ログイン中: {maskEmail(user?.email)}</span>
          <button type="button" className="clearSearchButton" onClick={handleSignOut} disabled={isSubmitting}>{isSubmitting ? "処理中..." : "ログアウト"}</button>
        </div>
      ) : null}

      {message ? <p className={`authMessage ${messageType}`} role="status">{message}</p> : null}
    </section>
  );
}
