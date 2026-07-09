"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadExternalCatchMemos,
  saveExternalCatchMemos,
  type ExternalCatchMemo,
} from "@/lib/externalCatchMemoStorage";

function browserStorage() {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function useExternalCatchMemos() {
  const [memos, setMemos] = useState<ExternalCatchMemo[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    setMemos(loadExternalCatchMemos(browserStorage()));
  }, []);

  const persistMemos = useCallback((nextMemos: ExternalCatchMemo[]) => {
    try {
      saveExternalCatchMemos(browserStorage(), nextMemos);
      setMemos(nextMemos);
      setStorageError(null);
      return true;
    } catch {
      setStorageError("外部釣果メモを保存できませんでした。ブラウザの保存容量や設定を確認してください。");
      return false;
    }
  }, []);

  return { memos, persistMemos, storageError };
}
