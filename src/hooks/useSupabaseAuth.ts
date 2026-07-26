"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type SupabaseAuthStatus = "loading" | "signed-in" | "signed-out" | "unavailable";

type AuthResult = { ok: true; message?: string } | { ok: false; message: string };

type UseSupabaseAuthResult = {
  status: SupabaseAuthStatus;
  session: Session | null;
  user: User | null;
  isConfigured: boolean;
  missingEnvVars: string[];
  isPasswordRecovery: boolean;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

function getFriendlyAuthMessage(error: unknown) {
  const rawMessage = error instanceof Error && error.message ? error.message : "";
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません。";
  if (normalized.includes("email not confirmed")) return "メールアドレスの確認が完了していません。確認メールをご確認ください。";
  if (normalized.includes("user already registered")) return "このメールアドレスは登録済みです。ログインまたはパスワード再設定をお試しください。";
  if (normalized.includes("password") && normalized.includes("characters")) return "パスワードがSupabase側の最低要件を満たしていません。";
  if (normalized.includes("provider") && normalized.includes("not enabled")) return "GoogleログインがSupabase側で有効化されていません。";
  if (normalized.includes("email address not authorized")) return "このメールアドレスへ認証メールを送信できません。SupabaseのSMTP設定を確認してください。";
  if (rawMessage) return rawMessage;
  return "Supabase Authの処理に失敗しました。";
}

function getRedirectTo() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${window.location.pathname}`;
}

function isRecoveryEvent(event: AuthChangeEvent) {
  return event === "PASSWORD_RECOVERY";
}

export function useSupabaseAuth(): UseSupabaseAuthResult {
  const supabaseStatus = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SupabaseAuthStatus>(supabaseStatus.isConfigured ? "loading" : "unavailable");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabaseStatus.isConfigured) {
      setStatus("unavailable");
      setSession(null);
      return;
    }

    let isActive = true;
    const { client } = supabaseStatus;

    client.auth.getSession().then(({ data, error }) => {
      if (!isActive) return;
      if (error) {
        setSession(null);
        setStatus("signed-out");
        return;
      }
      setSession(data.session);
      setStatus(data.session ? "signed-in" : "signed-out");
    });

    const { data: subscription } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "signed-in" : "signed-out");
      if (isRecoveryEvent(event)) setIsPasswordRecovery(true);
      if (event === "SIGNED_OUT") setIsPasswordRecovery(false);
    });

    return () => {
      isActive = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabaseStatus]);

  const signInWithGoogle = useCallback<UseSupabaseAuthResult["signInWithGoogle"]>(async () => {
    if (!supabaseStatus.isConfigured) return { ok: false, message: "Supabaseが未設定のため認証を利用できません。" };
    try {
      const redirectTo = getRedirectTo();
      const { error } = await supabaseStatus.client.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (error) return { ok: false, message: getFriendlyAuthMessage(error) };
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getFriendlyAuthMessage(error) };
    }
  }, [supabaseStatus]);

  const signInWithPassword = useCallback<UseSupabaseAuthResult["signInWithPassword"]>(async (email, password) => {
    if (!supabaseStatus.isConfigured) return { ok: false, message: "Supabaseが未設定のため認証を利用できません。" };
    try {
      const { error } = await supabaseStatus.client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, message: getFriendlyAuthMessage(error) };
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getFriendlyAuthMessage(error) };
    }
  }, [supabaseStatus]);

  const signUpWithPassword = useCallback<UseSupabaseAuthResult["signUpWithPassword"]>(async (email, password) => {
    if (!supabaseStatus.isConfigured) return { ok: false, message: "Supabaseが未設定のため認証を利用できません。" };
    try {
      const redirectTo = getRedirectTo();
      const { data, error } = await supabaseStatus.client.auth.signUp({
        email,
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (error) return { ok: false, message: getFriendlyAuthMessage(error) };
      if (!data.session) return { ok: true, message: "登録を受け付けました。確認メールが届いた場合は、メール内の確認リンクを一度だけ開いてください。" };
      return { ok: true, message: "登録してログインしました。" };
    } catch (error) {
      return { ok: false, message: getFriendlyAuthMessage(error) };
    }
  }, [supabaseStatus]);

  const sendPasswordReset = useCallback<UseSupabaseAuthResult["sendPasswordReset"]>(async (email) => {
    if (!supabaseStatus.isConfigured) return { ok: false, message: "Supabaseが未設定のため認証を利用できません。" };
    try {
      const redirectTo = getRedirectTo();
      const { error } = await supabaseStatus.client.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
      if (error) return { ok: false, message: getFriendlyAuthMessage(error) };
      return { ok: true, message: "パスワード設定・再設定用メールを送信しました。メール内のリンクを開いて新しいパスワードを設定してください。" };
    } catch (error) {
      return { ok: false, message: getFriendlyAuthMessage(error) };
    }
  }, [supabaseStatus]);

  const updatePassword = useCallback<UseSupabaseAuthResult["updatePassword"]>(async (password) => {
    if (!supabaseStatus.isConfigured) return { ok: false, message: "Supabaseが未設定のため認証を利用できません。" };
    try {
      const { error } = await supabaseStatus.client.auth.updateUser({ password });
      if (error) return { ok: false, message: getFriendlyAuthMessage(error) };
      setIsPasswordRecovery(false);
      return { ok: true, message: "パスワードを更新しました。次回からメールアドレスとパスワードでログインできます。" };
    } catch (error) {
      return { ok: false, message: getFriendlyAuthMessage(error) };
    }
  }, [supabaseStatus]);

  const signOut = useCallback<UseSupabaseAuthResult["signOut"]>(async () => {
    if (!supabaseStatus.isConfigured) return { ok: false, message: "Supabaseが未設定のため認証を利用できません。" };
    try {
      const { error } = await supabaseStatus.client.auth.signOut();
      if (error) return { ok: false, message: getFriendlyAuthMessage(error) };
      setIsPasswordRecovery(false);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getFriendlyAuthMessage(error) };
    }
  }, [supabaseStatus]);

  return {
    status,
    session,
    user: session?.user ?? null,
    isConfigured: supabaseStatus.isConfigured,
    missingEnvVars: supabaseStatus.missingEnvVars,
    isPasswordRecovery,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
    signOut,
  };
}
