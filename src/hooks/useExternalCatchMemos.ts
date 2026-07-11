"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseAuthStatus } from "@/hooks/useSupabaseAuth";
import {
  loadExternalCatchMemos,
  saveExternalCatchMemos,
  type ExternalCatchMemo,
} from "@/lib/externalCatchMemoStorage";
import {
  deleteExternalCatchMemoFromSupabase,
  fetchExternalCatchMemosFromSupabase,
  saveExternalCatchMemoToSupabase,
  type ExternalCatchMemoDbFallbackReason,
  type ExternalCatchMemoDbSource,
} from "@/lib/externalCatchMemoRepository";

export type ExternalCatchMemoStorageStatus = {
  source: ExternalCatchMemoDbSource;
  fallbackReason?: ExternalCatchMemoDbFallbackReason;
  isLoading: boolean;
  isMutating: boolean;
};

function browserStorage() {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function saveLocalMemos(nextMemos: ExternalCatchMemo[]) {
  saveExternalCatchMemos(browserStorage(), nextMemos);
}

export function useExternalCatchMemos(authStatus: SupabaseAuthStatus, user: User | null) {
  const [memos, setMemos] = useState<ExternalCatchMemo[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [status, setStatus] = useState<ExternalCatchMemoStorageStatus>({ source: "local-storage-fallback", isLoading: true, isMutating: false });
  const userId = user?.id ?? null;

  useEffect(() => {
    let isActive = true;
    setStorageError(null);

    if (authStatus === "loading") {
      setMemos([]);
      setStatus((current) => ({ ...current, isLoading: true }));
      return () => { isActive = false; };
    }

    if (authStatus !== "signed-in" || !userId) {
      setMemos(loadExternalCatchMemos(browserStorage()));
      setStatus({ source: "local-storage-fallback", fallbackReason: authStatus === "unavailable" ? "supabase-not-configured" : "not-authenticated", isLoading: false, isMutating: false });
      return () => { isActive = false; };
    }

    setMemos([]);
    setStatus((current) => ({ ...current, isLoading: true }));
    fetchExternalCatchMemosFromSupabase(userId)
      .then((result) => {
        if (!isActive) return;
        const localMemos = loadExternalCatchMemos(browserStorage());
        if (result.meta.source === "supabase" && result.data.length === 0 && localMemos.length > 0) {
          setMemos(localMemos);
          setStatus({ source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isLoading: false, isMutating: false });
          return;
        }
        setMemos(result.meta.source === "supabase" ? result.data : localMemos);
        setStatus({ ...result.meta, isLoading: false, isMutating: false });
      })
      .catch(() => {
        if (!isActive) return;
        setMemos(loadExternalCatchMemos(browserStorage()));
        setStatus({ source: "local-storage-fallback", fallbackReason: "supabase-error", isLoading: false, isMutating: false });
      });

    return () => { isActive = false; };
  }, [authStatus, userId]);

  const useDb = useMemo(() => authStatus === "signed-in" && Boolean(userId), [authStatus, userId]);

  const persistMemo = useCallback(async (memo: ExternalCatchMemo) => {
    setStatus((current) => ({ ...current, isMutating: true }));
    const optimisticMemos = memos.some((item) => item.id === memo.id)
      ? memos.map((item) => (item.id === memo.id ? memo : item))
      : [memo, ...memos];

    try {
      if (!useDb) {
        saveLocalMemos(optimisticMemos);
        setMemos(optimisticMemos);
        setStorageError(null);
        setStatus({ source: "local-storage-fallback", fallbackReason: userId ? "supabase-not-configured" : "not-authenticated", isLoading: false, isMutating: false });
        return true;
      }

      const result = await saveExternalCatchMemoToSupabase(userId, memo);
      if (result.meta.source === "supabase" && result.data) {
        const savedMemos = memos.some((item) => item.id === result.data?.id)
          ? memos.map((item) => (item.id === result.data?.id ? result.data : item))
          : [result.data, ...memos];
        setMemos(savedMemos);
        setStorageError(null);
        setStatus({ source: "supabase", isLoading: false, isMutating: false });
        return true;
      }

      saveLocalMemos(optimisticMemos);
      setMemos(optimisticMemos);
      setStorageError("DB保存に失敗したため、入力した外部釣果メモをブラウザ保存へfallbackしました。");
      setStatus({ ...result.meta, isLoading: false, isMutating: false });
      return true;
    } catch {
      try {
        saveLocalMemos(optimisticMemos);
        setMemos(optimisticMemos);
        setStorageError("DB保存に失敗したため、入力した外部釣果メモをブラウザ保存へfallbackしました。");
        setStatus({ source: "local-storage-fallback", fallbackReason: "supabase-error", isLoading: false, isMutating: false });
        return true;
      } catch {
        setStorageError("外部釣果メモを保存できませんでした。ブラウザの保存容量や設定を確認してください。");
        setStatus((current) => ({ ...current, isMutating: false }));
        return false;
      }
    }
  }, [memos, useDb, userId]);

  const deleteMemo = useCallback(async (memoId: string) => {
    setStatus((current) => ({ ...current, isMutating: true }));
    const nextMemos = memos.filter((memo) => memo.id !== memoId);
    try {
      if (!useDb) {
        saveLocalMemos(nextMemos);
        setMemos(nextMemos);
        setStorageError(null);
        setStatus({ source: "local-storage-fallback", fallbackReason: userId ? "supabase-not-configured" : "not-authenticated", isLoading: false, isMutating: false });
        return true;
      }
      const result = await deleteExternalCatchMemoFromSupabase(userId, memoId);
      if (result.meta.source !== "supabase") saveLocalMemos(nextMemos);
      setMemos(nextMemos);
      setStorageError(result.meta.source === "supabase" ? null : "DB削除に失敗したため、ブラウザ保存側で非表示にしました。");
      setStatus({ ...result.meta, isLoading: false, isMutating: false });
      return true;
    } catch {
      try { saveLocalMemos(nextMemos); } catch { /* local fallback best effort */ }
      setMemos(nextMemos);
      setStorageError("DB削除に失敗したため、ブラウザ保存側で非表示にしました。");
      setStatus({ source: "local-storage-fallback", fallbackReason: "supabase-error", isLoading: false, isMutating: false });
      return true;
    }
  }, [memos, useDb, userId]);

  return { memos, persistMemo, deleteMemo, storageError, memoStorageStatus: status };
}
