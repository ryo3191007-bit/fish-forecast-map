"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type LocalMemoMeta = {
  ownerIdByMemoId?: Record<string, string>;
  deletedDbMemoIdsByUserId?: Record<string, string[]>;
};

const LOCAL_MEMO_META_STORAGE_KEY = "fish-forecast-map.external-catch-memo-local-meta";

function browserStorage() {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function loadLocalMemoMeta(storage: Storage | undefined): LocalMemoMeta {
  if (!storage) return {};
  try {
    const rawValue = storage.getItem(LOCAL_MEMO_META_STORAGE_KEY);
    if (!rawValue) return {};
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object") return {};
    const meta = parsedValue as LocalMemoMeta;
    return {
      ownerIdByMemoId: meta.ownerIdByMemoId && typeof meta.ownerIdByMemoId === "object" ? meta.ownerIdByMemoId : {},
      deletedDbMemoIdsByUserId: meta.deletedDbMemoIdsByUserId && typeof meta.deletedDbMemoIdsByUserId === "object" ? meta.deletedDbMemoIdsByUserId : {},
    };
  } catch {
    return {};
  }
}

function saveLocalMemoMeta(storage: Storage | undefined, meta: LocalMemoMeta) {
  if (!storage) return;
  storage.setItem(LOCAL_MEMO_META_STORAGE_KEY, JSON.stringify(meta));
}

function saveLocalMemos(nextMemos: ExternalCatchMemo[]) {
  saveExternalCatchMemos(browserStorage(), nextMemos);
}

function canUseDb(authStatus: SupabaseAuthStatus, userId: string | null, dbAvailable: boolean) {
  return authStatus === "signed-in" && Boolean(userId) && dbAvailable;
}

function getScopedLocalMemos(userId: string | null) {
  const storage = browserStorage();
  const allLocalMemos = loadExternalCatchMemos(storage);
  if (!userId) return allLocalMemos.filter((memo) => !loadLocalMemoMeta(storage).ownerIdByMemoId?.[memo.id]);
  const ownerIdByMemoId = loadLocalMemoMeta(storage).ownerIdByMemoId ?? {};
  return allLocalMemos.filter((memo) => !ownerIdByMemoId[memo.id] || ownerIdByMemoId[memo.id] === userId);
}

function getDeletedDbMemoIds(userId: string | null) {
  if (!userId) return new Set<string>();
  return new Set(loadLocalMemoMeta(browserStorage()).deletedDbMemoIdsByUserId?.[userId] ?? []);
}

function pruneDeletedDbMemoIds(userId: string | null, existingDbMemoIds: Set<string>) {
  if (!userId) return new Set<string>();
  const storage = browserStorage();
  const meta = loadLocalMemoMeta(storage);
  const currentIds = meta.deletedDbMemoIdsByUserId?.[userId] ?? [];
  const nextIds = currentIds.filter((memoId) => existingDbMemoIds.has(memoId));
  if (nextIds.length !== currentIds.length) {
    saveLocalMemoMeta(storage, {
      ...meta,
      deletedDbMemoIdsByUserId: { ...(meta.deletedDbMemoIdsByUserId ?? {}), [userId]: nextIds },
    });
  }
  return new Set(nextIds);
}

function mergeExternalCatchMemos(dbMemos: ExternalCatchMemo[], localMemos: ExternalCatchMemo[], deletedDbMemoIds: Set<string>) {
  const merged = [...localMemos];
  const localIds = new Set(localMemos.map((memo) => memo.id));
  for (const dbMemo of dbMemos) {
    if (!localIds.has(dbMemo.id) && !deletedDbMemoIds.has(dbMemo.id)) merged.push(dbMemo);
  }
  return merged;
}

function markLocalOwner(memoId: string, userId: string | null) {
  if (!userId) return;
  const storage = browserStorage();
  const meta = loadLocalMemoMeta(storage);
  saveLocalMemoMeta(storage, { ...meta, ownerIdByMemoId: { ...(meta.ownerIdByMemoId ?? {}), [memoId]: userId } });
}

function addDeletedDbMemoId(memoId: string, userId: string | null) {
  if (!userId) return;
  const storage = browserStorage();
  const meta = loadLocalMemoMeta(storage);
  const currentIds = new Set(meta.deletedDbMemoIdsByUserId?.[userId] ?? []);
  currentIds.add(memoId);
  saveLocalMemoMeta(storage, { ...meta, deletedDbMemoIdsByUserId: { ...(meta.deletedDbMemoIdsByUserId ?? {}), [userId]: [...currentIds] } });
}

function saveLocalOriginMemos(visibleMemos: ExternalCatchMemo[], localMemoIds: Set<string>, currentUserId: string | null) {
  const storage = browserStorage();
  const ownerIdByMemoId = loadLocalMemoMeta(storage).ownerIdByMemoId ?? {};
  const otherUserMemos = loadExternalCatchMemos(storage).filter((memo) => {
    const ownerId = ownerIdByMemoId[memo.id];
    return ownerId && ownerId !== currentUserId;
  });
  const currentMemos = visibleMemos.filter((memo) => localMemoIds.has(memo.id));
  saveLocalMemos([...currentMemos, ...otherUserMemos.filter((memo) => !localMemoIds.has(memo.id))]);
}

export function useExternalCatchMemos(authStatus: SupabaseAuthStatus, user: User | null) {
  const [memos, setMemos] = useState<ExternalCatchMemo[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [status, setStatus] = useState<ExternalCatchMemoStorageStatus>({ source: "local-storage-fallback", isLoading: true, isMutating: false });
  const userId = user?.id ?? null;
  const authGenerationRef = useRef(0);
  const latestAuthRef = useRef({ authStatus, userId, generation: authGenerationRef.current });
  const localMemoIdsRef = useRef(new Set<string>());
  const dbMemoIdsRef = useRef(new Set<string>());
  const dbAvailableRef = useRef(false);

  useEffect(() => {
    authGenerationRef.current += 1;
    const generation = authGenerationRef.current;
    latestAuthRef.current = { authStatus, userId, generation };
    let isActive = true;
    setStorageError(null);

    if (authStatus === "loading") {
      setMemos([]);
      setStatus((current) => ({ ...current, isLoading: true }));
      return () => { isActive = false; };
    }

    if (authStatus !== "signed-in" || !userId) {
      const localMemos = getScopedLocalMemos(null);
      localMemoIdsRef.current = new Set(localMemos.map((memo) => memo.id));
      dbMemoIdsRef.current = new Set();
      dbAvailableRef.current = false;
      setMemos(localMemos);
      setStatus({ source: "local-storage-fallback", fallbackReason: authStatus === "unavailable" ? "supabase-not-configured" : "not-authenticated", isLoading: false, isMutating: false });
      return () => { isActive = false; };
    }

    setMemos([]);
    setStatus((current) => ({ ...current, isLoading: true }));
    fetchExternalCatchMemosFromSupabase(userId)
      .then((result) => {
        if (!isActive || latestAuthRef.current.generation !== generation || latestAuthRef.current.userId !== userId) return;
        const localMemos = getScopedLocalMemos(userId);
        if (result.meta.source === "supabase") {
          dbAvailableRef.current = true;
          const existingDbMemoIds = new Set(result.data.map((memo) => memo.id));
          const deletedDbMemoIds = pruneDeletedDbMemoIds(userId, existingDbMemoIds);
          const visibleDbMemos = result.data.filter((memo) => !deletedDbMemoIds.has(memo.id));
          localMemoIdsRef.current = new Set(localMemos.map((memo) => memo.id));
          dbMemoIdsRef.current = new Set(visibleDbMemos.map((memo) => memo.id));
          if (localMemos.length > 0 || deletedDbMemoIds.size > 0) {
            setMemos(mergeExternalCatchMemos(result.data, localMemos, deletedDbMemoIds));
            setStatus({ source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isLoading: false, isMutating: false });
            return;
          }
          setMemos(visibleDbMemos);
          setStatus({ source: "supabase", isLoading: false, isMutating: false });
          return;
        }
        localMemoIdsRef.current = new Set(localMemos.map((memo) => memo.id));
        dbMemoIdsRef.current = new Set();
        dbAvailableRef.current = false;
        setMemos(localMemos);
        setStatus({ ...result.meta, isLoading: false, isMutating: false });
      })
      .catch(() => {
        if (!isActive || latestAuthRef.current.generation !== generation || latestAuthRef.current.userId !== userId) return;
        const localMemos = getScopedLocalMemos(userId);
        localMemoIdsRef.current = new Set(localMemos.map((memo) => memo.id));
        dbMemoIdsRef.current = new Set();
        dbAvailableRef.current = false;
        setMemos(localMemos);
        setStatus({ source: "local-storage-fallback", fallbackReason: "supabase-error", isLoading: false, isMutating: false });
      });

    return () => { isActive = false; };
  }, [authStatus, userId]);

  const useDb = canUseDb(authStatus, userId, dbAvailableRef.current);

  const persistMemo = useCallback(async (memo: ExternalCatchMemo) => {
    const mutationUserId = userId;
    const mutationGeneration = latestAuthRef.current.generation;
    const nextLocalMemoIds = new Set(localMemoIdsRef.current);
    const isExistingDbMemo = dbMemoIdsRef.current.has(memo.id) && !localMemoIdsRef.current.has(memo.id);
    const shouldPersistToDb = useDb && Boolean(mutationUserId) && (isExistingDbMemo || status.source === "supabase");
    if (!shouldPersistToDb) nextLocalMemoIds.add(memo.id);
    setStatus((current) => ({ ...current, isMutating: true }));
    const optimisticMemos = memos.some((item) => item.id === memo.id)
      ? memos.map((item) => (item.id === memo.id ? memo : item))
      : [memo, ...memos];

    const isCurrentAuth = () => latestAuthRef.current.generation === mutationGeneration && latestAuthRef.current.userId === mutationUserId;

    try {
      if (!shouldPersistToDb || !mutationUserId) {
        nextLocalMemoIds.add(memo.id);
        saveLocalOriginMemos(optimisticMemos, nextLocalMemoIds, mutationUserId);
        markLocalOwner(memo.id, mutationUserId);
        if (!isCurrentAuth()) return false;
        localMemoIdsRef.current = nextLocalMemoIds;
        setMemos(optimisticMemos);
        setStorageError(null);
        setStatus({ source: "local-storage-fallback", fallbackReason: status.source === "local-storage-fallback" ? status.fallbackReason : mutationUserId ? "local-data-not-migrated" : "not-authenticated", isLoading: false, isMutating: false });
        return true;
      }

      const result = await saveExternalCatchMemoToSupabase(mutationUserId, memo, { mode: dbMemoIdsRef.current.has(memo.id) ? "update" : "insert" });
      if (!isCurrentAuth()) return false;
      if (result.meta.source === "supabase" && result.data) {
        const savedMemos = memos.some((item) => item.id === result.data?.id)
          ? memos.map((item) => (item.id === result.data?.id ? result.data : item))
          : [result.data, ...memos];
        dbMemoIdsRef.current = new Set([...dbMemoIdsRef.current, result.data.id]);
        setMemos(savedMemos);
        setStorageError(null);
        setStatus(localMemoIdsRef.current.size > 0 || getDeletedDbMemoIds(mutationUserId).size > 0
          ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isLoading: false, isMutating: false }
          : { source: "supabase", isLoading: false, isMutating: false });
        return true;
      }

      nextLocalMemoIds.add(memo.id);
      saveLocalOriginMemos(optimisticMemos, nextLocalMemoIds, mutationUserId);
      markLocalOwner(memo.id, mutationUserId);
      localMemoIdsRef.current = nextLocalMemoIds;
      setMemos(optimisticMemos);
      setStorageError("DB保存に失敗したため、入力した外部釣果メモをブラウザ保存へfallbackしました。");
      setStatus({ ...result.meta, isLoading: false, isMutating: false });
      return true;
    } catch {
      if (!isCurrentAuth()) return false;
      try {
        nextLocalMemoIds.add(memo.id);
        saveLocalOriginMemos(optimisticMemos, nextLocalMemoIds, mutationUserId);
        markLocalOwner(memo.id, mutationUserId);
        localMemoIdsRef.current = nextLocalMemoIds;
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
  }, [memos, status, useDb, userId]);

  const deleteMemo = useCallback(async (memoId: string) => {
    const mutationUserId = userId;
    const mutationGeneration = latestAuthRef.current.generation;
    const shouldDeleteFromDb = useDb && Boolean(mutationUserId) && dbMemoIdsRef.current.has(memoId) && !localMemoIdsRef.current.has(memoId);
    const nextLocalMemoIds = new Set(localMemoIdsRef.current);
    nextLocalMemoIds.delete(memoId);
    setStatus((current) => ({ ...current, isMutating: true }));
    const nextMemos = memos.filter((memo) => memo.id !== memoId);
    const isCurrentAuth = () => latestAuthRef.current.generation === mutationGeneration && latestAuthRef.current.userId === mutationUserId;

    try {
      if (!shouldDeleteFromDb || !mutationUserId) {
        if (dbMemoIdsRef.current.has(memoId)) addDeletedDbMemoId(memoId, mutationUserId);
        saveLocalOriginMemos(nextMemos, nextLocalMemoIds, mutationUserId);
        if (!isCurrentAuth()) return false;
        localMemoIdsRef.current = nextLocalMemoIds;
        setMemos(nextMemos);
        setStorageError(null);
        setStatus({ source: "local-storage-fallback", fallbackReason: status.source === "local-storage-fallback" ? status.fallbackReason : mutationUserId ? "local-data-not-migrated" : "not-authenticated", isLoading: false, isMutating: false });
        return true;
      }
      const result = await deleteExternalCatchMemoFromSupabase(mutationUserId, memoId);
      if (!isCurrentAuth()) return false;
      if (result.meta.source !== "supabase") {
        addDeletedDbMemoId(memoId, mutationUserId);
        saveLocalOriginMemos(nextMemos, nextLocalMemoIds, mutationUserId);
      }
      localMemoIdsRef.current = nextLocalMemoIds;
      dbMemoIdsRef.current = new Set([...dbMemoIdsRef.current].filter((id) => id !== memoId));
      setMemos(nextMemos);
      setStorageError(result.meta.source === "supabase" ? null : "DB削除に失敗したため、ブラウザ保存側で非表示にしました。");
      setStatus(result.meta.source === "supabase" && (nextLocalMemoIds.size > 0 || getDeletedDbMemoIds(mutationUserId).size > 0)
        ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isLoading: false, isMutating: false }
        : { ...result.meta, isLoading: false, isMutating: false });
      return true;
    } catch {
      if (!isCurrentAuth()) return false;
      try {
        addDeletedDbMemoId(memoId, mutationUserId);
        saveLocalOriginMemos(nextMemos, nextLocalMemoIds, mutationUserId);
      } catch { /* local fallback best effort */ }
      localMemoIdsRef.current = nextLocalMemoIds;
      setMemos(nextMemos);
      setStorageError("DB削除に失敗したため、ブラウザ保存側で非表示にしました。");
      setStatus({ source: "local-storage-fallback", fallbackReason: "supabase-error", isLoading: false, isMutating: false });
      return true;
    }
  }, [memos, status, useDb, userId]);

  return { memos, persistMemo, deleteMemo, storageError, memoStorageStatus: status };
}
