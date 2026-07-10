"use client";

import { useState, type FormEvent } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

function maskEmail(email?: string) {
  if (!email) return "メール未設定";
  const [localPart, domain] = email.split("@");
  if (!domain) return email;
  const visibleLocal = localPart.length <= 2 ? localPart : `${localPart.slice(0, 2)}…`;
  return `${visibleLocal}@${domain}`;
}

export function AuthStatusPanel() {
  const { status, user, signInWithEmail, signOut } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessageType("error");
      setMessage("メールアドレスを入力してください。");
      return;
    }
    setIsSubmitting(true);
    const result = await signInWithEmail(trimmedEmail);
    setIsSubmitting(false);
    if (result.ok) {
      setMessageType("success");
      setMessage("ログインリンクを送信しました。メールを確認してください。");
      return;
    }
    setMessageType("error");
    setMessage(result.message);
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    const result = await signOut();
    setIsSubmitting(false);
    setMessageType(result.ok ? "success" : "error");
    setMessage(result.ok ? "ログアウトしました。" : result.message);
  };

  return (
    <section className="authStatusPanel" aria-labelledby="auth-status-heading">
      <div>
        <p className="eyebrow">Supabase Auth</p>
        <h3 id="auth-status-heading">外部メモDB保存の認証準備</h3>
        <p className="muted">ログイン状態だけを確認します。外部メモの保存先はまだブラウザ内localStorageです。</p>
      </div>

      {status === "unavailable" ? (
        <p className="authStatusNote" role="status">認証は未設定です。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY がある環境で利用できます。</p>
      ) : null}

      {status === "loading" ? <p className="authStatusNote" role="status">認証状態を確認中...</p> : null}

      {status === "signed-out" ? (
        <form className="authForm" onSubmit={submitEmail}>
          <label htmlFor="auth-email">メールアドレス</label>
          <div className="authFormRow">
            <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
            <button type="submit" className="clearSearchButton" disabled={isSubmitting}>{isSubmitting ? "送信中..." : "ログインリンク送信"}</button>
          </div>
        </form>
      ) : null}

      {status === "signed-in" ? (
        <div className="authSignedIn" role="status">
          <span>ログイン中: {maskEmail(user?.email)}</span>
          <button type="button" className="clearSearchButton" onClick={handleSignOut} disabled={isSubmitting}>{isSubmitting ? "処理中..." : "ログアウト"}</button>
        </div>
      ) : null}

      {message ? <p className={`authMessage ${messageType}`} role="status">{message}</p> : null}
    </section>
  );
}
