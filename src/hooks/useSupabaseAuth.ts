"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type SupabaseAuthStatus = "loading" | "signed-in" | "signed-out" | "unavailable";

export type SupabaseAuthState = {
  status: SupabaseAuthStatus;
  session: Session | null;
  user: User | null;
  isConfigured: boolean;
  missingEnvVars: string[];
  signInWithEmail: (email: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => Promise<{ ok: true } | { ok: false; message: string }>;
};

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Supabase Authの処理に失敗しました。";
}

export function useSupabaseAuth(): SupabaseAuthState {
  const supabaseStatus = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SupabaseAuthStatus>(supabaseStatus.isConfigured ? "loading" : "unavailable");

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

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "signed-in" : "signed-out");
    });

    return () => {
      isActive = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabaseStatus]);

  const signInWithEmail = useCallback<SupabaseAuthState["signInWithEmail"]>(async (email) => {
    if (!supabaseStatus.isConfigured) return { ok: false, message: "Supabaseが未設定のため認証を利用できません。" };
    const redirectTo = typeof window === "undefined" ? undefined : window.location.origin;
    try {
      const { error } = await supabaseStatus.client.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getAuthErrorMessage(error) };
    }
  }, [supabaseStatus]);

  const signOut = useCallback<SupabaseAuthState["signOut"]>(async () => {
    if (!supabaseStatus.isConfigured) return { ok: false, message: "Supabaseが未設定のため認証を利用できません。" };
    try {
      const { error } = await supabaseStatus.client.auth.signOut();
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getAuthErrorMessage(error) };
    }
  }, [supabaseStatus]);

  return {
    status,
    session,
    user: session?.user ?? null,
    isConfigured: supabaseStatus.isConfigured,
    missingEnvVars: supabaseStatus.missingEnvVars,
    signInWithEmail,
    signOut,
  };
}
