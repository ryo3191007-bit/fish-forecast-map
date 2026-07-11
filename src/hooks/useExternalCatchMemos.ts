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
  isDbAvailable: boolean;
  isLoading: boolean;
  isMutating: boolean;
};

export type ExternalCatchMemoMigrationResult = {
  attempted: number;
  succeeded: string[];
  skipped: { id: string; reason: "duplicate-id" | "not-local-origin" | "not-manual" | "not-found" | "updated-during-migration" }[];
  failed: { id: string; reason: "save-failed" | "verification-failed" }[];
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

function serializeMemoForMigrationComparison(memo: ExternalCatchMemo) {
  return JSON.stringify(memo);
}

function removeUnchangedSucceededLocalOriginMemos(
  succeededIds: Set<string>,
  startSnapshotsByMemoId: Map<string, string>,
  currentUserId: string | null,
) {
  const removedIds = new Set<string>();
  const conflictedIds = new Set<string>();
  if (succeededIds.size === 0) return { removedIds, conflictedIds };
  const storage = browserStorage();
  const meta = loadLocalMemoMeta(storage);
  const ownerIdByMemoId = meta.ownerIdByMemoId ?? {};
  const nextMemos = loadExternalCatchMemos(storage).filter((memo) => {
    if (!succeededIds.has(memo.id)) return true;
    const ownerId = ownerIdByMemoId[memo.id];
    const isCurrentUserMemo = currentUserId ? !ownerId || ownerId === currentUserId : !ownerId;
    if (!isCurrentUserMemo) return true;
    if (serializeMemoForMigrationComparison(memo) !== startSnapshotsByMemoId.get(memo.id)) {
      conflictedIds.add(memo.id);
      return true;
    }
    removedIds.add(memo.id);
    return false;
  });
  saveExternalCatchMemos(storage, nextMemos);
  const nextOwnerIdByMemoId = Object.fromEntries(
    Object.entries(ownerIdByMemoId).filter(([memoId, ownerId]) => !removedIds.has(memoId) || ownerId !== currentUserId),
  );
  saveLocalMemoMeta(storage, { ...meta, ownerIdByMemoId: nextOwnerIdByMemoId });
  return { removedIds, conflictedIds };
}

function isMigrationAllowed(authStatus: SupabaseAuthStatus, userId: string | null, dbAvailable: boolean) {
  return canUseDb(authStatus, userId, dbAvailable);
}

export function useExternalCatchMemos(authStatus: SupabaseAuthStatus, user: User | null) {
  const [memos, setMemos] = useState<ExternalCatchMemo[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [status, setStatus] = useState<ExternalCatchMemoStorageStatus>({ source: "local-storage-fallback", isDbAvailable: false, isLoading: true, isMutating: false });
  const userId = user?.id ?? null;
  const authGenerationRef = useRef(0);
  const latestAuthRef = useRef({ authStatus, userId, generation: authGenerationRef.current });
  const localMemoIdsRef = useRef(new Set<string>());
  const dbMemoIdsRef = useRef(new Set<string>());
  const dbAvailableRef = useRef(false);
  const latestDbMemosRef = useRef<ExternalCatchMemo[]>([]);

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
      latestDbMemosRef.current = [];
      dbAvailableRef.current = false;
      setMemos(localMemos);
      setStatus({ source: "local-storage-fallback", fallbackReason: authStatus === "unavailable" ? "supabase-not-configured" : "not-authenticated", isDbAvailable: false, isLoading: false, isMutating: false });
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
          latestDbMemosRef.current = visibleDbMemos;
          if (localMemos.length > 0 || deletedDbMemoIds.size > 0) {
            setMemos(mergeExternalCatchMemos(result.data, localMemos, deletedDbMemoIds));
            setStatus({ source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isDbAvailable: true, isLoading: false, isMutating: false });
            return;
          }
          setMemos(visibleDbMemos);
          setStatus({ source: "supabase", isDbAvailable: true, isLoading: false, isMutating: false });
          return;
        }
        localMemoIdsRef.current = new Set(localMemos.map((memo) => memo.id));
        dbMemoIdsRef.current = new Set();
        latestDbMemosRef.current = [];
        dbAvailableRef.current = false;
        setMemos(localMemos);
        setStatus({ ...result.meta, isDbAvailable: false, isLoading: false, isMutating: false });
      })
      .catch(() => {
        if (!isActive || latestAuthRef.current.generation !== generation || latestAuthRef.current.userId !== userId) return;
        const localMemos = getScopedLocalMemos(userId);
        localMemoIdsRef.current = new Set(localMemos.map((memo) => memo.id));
        dbMemoIdsRef.current = new Set();
        latestDbMemosRef.current = [];
        dbAvailableRef.current = false;
        setMemos(localMemos);
        setStatus({ source: "local-storage-fallback", fallbackReason: "supabase-error", isDbAvailable: false, isLoading: false, isMutating: false });
      });

    return () => { isActive = false; };
  }, [authStatus, userId]);

  const useDb = canUseDb(authStatus, userId, dbAvailableRef.current);

  const persistMemo = useCallback(async (memo: ExternalCatchMemo) => {
    const mutationUserId = userId;
    const mutationGeneration = latestAuthRef.current.generation;
    const nextLocalMemoIds = new Set(localMemoIdsRef.current);
    const shouldPersistToDb = useDb && Boolean(mutationUserId) && !localMemoIdsRef.current.has(memo.id);
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
        setStatus({ source: "local-storage-fallback", fallbackReason: status.source === "local-storage-fallback" ? status.fallbackReason : mutationUserId ? "local-data-not-migrated" : "not-authenticated", isDbAvailable: dbAvailableRef.current, isLoading: false, isMutating: false });
        return true;
      }

      const result = await saveExternalCatchMemoToSupabase(mutationUserId, memo, { mode: dbMemoIdsRef.current.has(memo.id) ? "update" : "insert" });
      if (!isCurrentAuth()) return false;
      if (result.meta.source === "supabase" && result.data) {
        const savedMemos = memos.some((item) => item.id === result.data?.id)
          ? memos.map((item) => (item.id === result.data?.id ? result.data : item))
          : [result.data, ...memos];
        dbMemoIdsRef.current = new Set([...dbMemoIdsRef.current, result.data.id]);
        latestDbMemosRef.current = [...latestDbMemosRef.current.filter((item) => item.id !== result.data?.id), result.data];
        setMemos(savedMemos);
        setStorageError(null);
        setStatus(localMemoIdsRef.current.size > 0 || getDeletedDbMemoIds(mutationUserId).size > 0
          ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isDbAvailable: true, isLoading: false, isMutating: false }
          : { source: "supabase", isDbAvailable: true, isLoading: false, isMutating: false });
        return true;
      }

      nextLocalMemoIds.add(memo.id);
      saveLocalOriginMemos(optimisticMemos, nextLocalMemoIds, mutationUserId);
      markLocalOwner(memo.id, mutationUserId);
      localMemoIdsRef.current = nextLocalMemoIds;
      setMemos(optimisticMemos);
      setStorageError("DB保存に失敗したため、入力した外部釣果メモをブラウザ保存へfallbackしました。");
      setStatus({ ...result.meta, isDbAvailable: false, isLoading: false, isMutating: false });
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
        setStatus({ source: "local-storage-fallback", fallbackReason: "supabase-error", isDbAvailable: false, isLoading: false, isMutating: false });
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
        setStatus({ source: "local-storage-fallback", fallbackReason: status.source === "local-storage-fallback" ? status.fallbackReason : mutationUserId ? "local-data-not-migrated" : "not-authenticated", isDbAvailable: dbAvailableRef.current, isLoading: false, isMutating: false });
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
      latestDbMemosRef.current = latestDbMemosRef.current.filter((memo) => memo.id !== memoId);
      setMemos(nextMemos);
      setStorageError(result.meta.source === "supabase" ? null : "DB削除に失敗したため、ブラウザ保存側で非表示にしました。");
      setStatus(result.meta.source === "supabase" && (nextLocalMemoIds.size > 0 || getDeletedDbMemoIds(mutationUserId).size > 0)
        ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isDbAvailable: true, isLoading: false, isMutating: false }
        : { ...result.meta, isDbAvailable: result.meta.source === "supabase", isLoading: false, isMutating: false });
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
      setStatus({ source: "local-storage-fallback", fallbackReason: "supabase-error", isDbAvailable: false, isLoading: false, isMutating: false });
      return true;
    }
  }, [memos, status, useDb, userId]);


  const migrateLocalMemosToSupabase = useCallback(async (memoIds: string[]): Promise<ExternalCatchMemoMigrationResult> => {
    const mutationUserId = userId;
    const mutationGeneration = latestAuthRef.current.generation;
    const uniqueIds = [...new Set(memoIds)];
    const result: ExternalCatchMemoMigrationResult = { attempted: uniqueIds.length, succeeded: [], skipped: [], failed: [] };
    const isCurrentAuth = () => latestAuthRef.current.generation === mutationGeneration && latestAuthRef.current.userId === mutationUserId;

    if (!isMigrationAllowed(authStatus, mutationUserId, dbAvailableRef.current)) {
      uniqueIds.forEach((id) => result.skipped.push({ id, reason: "not-local-origin" }));
      return result;
    }

    setStatus((current) => ({ ...current, isMutating: true }));
    const localIdsAtStart = new Set(localMemoIdsRef.current);
    const dbIdsAtStart = new Set(dbMemoIdsRef.current);
    const memoById = new Map(memos.map((memo) => [memo.id, memo]));
    const startSnapshotsByMemoId = new Map(
      uniqueIds.flatMap((memoId) => {
        const memo = memoById.get(memoId);
        return memo ? [[memoId, serializeMemoForMigrationComparison(memo)] as const] : [];
      }),
    );
    const succeededIds = new Set<string>();
    const verifiedDbMemoIds = new Set<string>();

    try {
      for (const memoId of uniqueIds) {
        const memo = memoById.get(memoId);
        if (!memo) { result.skipped.push({ id: memoId, reason: "not-found" }); continue; }
        if (!localIdsAtStart.has(memoId)) { result.skipped.push({ id: memoId, reason: "not-local-origin" }); continue; }
        if (memo.acquisitionMethod !== "manual") { result.skipped.push({ id: memoId, reason: "not-manual" }); continue; }
        if (dbIdsAtStart.has(memoId)) { result.skipped.push({ id: memoId, reason: "duplicate-id" }); continue; }

        let saveResult: Awaited<ReturnType<typeof saveExternalCatchMemoToSupabase>>;
        try {
          saveResult = await saveExternalCatchMemoToSupabase(mutationUserId, memo, { mode: "insert" });
        } catch {
          result.failed.push({ id: memoId, reason: "save-failed" });
          continue;
        }
        if (!isCurrentAuth()) return result;
        if (saveResult.meta.source !== "supabase" || !saveResult.data) {
          result.failed.push({ id: memoId, reason: "save-failed" });
          continue;
        }

        let verifyResult: Awaited<ReturnType<typeof fetchExternalCatchMemosFromSupabase>>;
        try {
          verifyResult = await fetchExternalCatchMemosFromSupabase(mutationUserId);
        } catch {
          result.failed.push({ id: memoId, reason: "verification-failed" });
          continue;
        }
        if (!isCurrentAuth()) return result;
        if (verifyResult.meta.source !== "supabase" || !verifyResult.data.some((item) => item.id === memoId)) {
          result.failed.push({ id: memoId, reason: "verification-failed" });
          continue;
        }

        result.succeeded.push(memoId);
        succeededIds.add(memoId);
        verifiedDbMemoIds.add(memoId);
        dbIdsAtStart.add(memoId);
        latestDbMemosRef.current = verifyResult.data;
      }

      if (!isCurrentAuth()) return result;
      let didCleanupFail = false;
      try {
        const cleanupResult = removeUnchangedSucceededLocalOriginMemos(succeededIds, startSnapshotsByMemoId, mutationUserId);
        for (const memoId of cleanupResult.conflictedIds) {
          result.skipped.push({ id: memoId, reason: "updated-during-migration" });
          succeededIds.delete(memoId);
        }
        result.succeeded = result.succeeded.filter((memoId) => !cleanupResult.conflictedIds.has(memoId));
      } catch {
        didCleanupFail = true;
        for (const memoId of result.succeeded) result.failed.push({ id: memoId, reason: "verification-failed" });
        result.succeeded = [];
        succeededIds.clear();
      }

      if (!isCurrentAuth()) return result;
      const latestLocalMemos = getScopedLocalMemos(mutationUserId);
      const nextLocalMemoIds = new Set(latestLocalMemos.map((memo) => memo.id));
      localMemoIdsRef.current = nextLocalMemoIds;
      dbMemoIdsRef.current = new Set([...dbMemoIdsRef.current, ...verifiedDbMemoIds]);
      const deletedDbMemoIds = getDeletedDbMemoIds(mutationUserId);
      const visibleDbMemos = latestDbMemosRef.current.filter((memo) => !deletedDbMemoIds.has(memo.id));
      latestDbMemosRef.current = visibleDbMemos;
      const nextMemos = mergeExternalCatchMemos(visibleDbMemos, latestLocalMemos, deletedDbMemoIds);
      setMemos(nextMemos);
      setStorageError(didCleanupFail ? "移行後のブラウザ保存整理に失敗したため、外部釣果メモをブラウザ保存に残しました。" : result.failed.length > 0 ? "一部の外部釣果メモは移行できなかったため、ブラウザ保存に残しました。" : null);
      setStatus(nextLocalMemoIds.size > 0 || deletedDbMemoIds.size > 0
        ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isDbAvailable: true, isLoading: false, isMutating: false }
        : { source: "supabase", isDbAvailable: true, isLoading: false, isMutating: false });
      return result;
    } catch {
      if (isCurrentAuth()) setStorageError("一部の外部釣果メモは移行できなかったため、ブラウザ保存に残しました。");
      return result;
    } finally {
      if (isCurrentAuth()) setStatus((current) => ({ ...current, isMutating: false }));
    }
  }, [authStatus, memos, userId]);

  return { memos, persistMemo, deleteMemo, migrateLocalMemosToSupabase, localMemoIds: localMemoIdsRef.current, storageError, memoStorageStatus: status };
}
