import type { ExternalCatchRecord } from "@/domain/externalCatch";

export const EXTERNAL_CATCH_MEMO_STORAGE_KEY = "fish-forecast-map.external-catch-memos";

export type ExternalCatchMemo = ExternalCatchRecord & { userMemo?: string };

export function isExternalCatchMemo(value: unknown): value is ExternalCatchMemo {
  if (!value || typeof value !== "object") return false;
  const memo = value as Partial<ExternalCatchMemo>;
  return Boolean(
    typeof memo.id === "string" &&
      typeof memo.sourceUrl === "string" &&
      typeof memo.sourceId === "string" &&
      typeof memo.sourceName === "string" &&
      typeof memo.species === "string" &&
      typeof memo.caughtDate === "string" &&
      typeof memo.areaName === "string" &&
      memo.acquisitionMethod === "manual" &&
      typeof memo.createdAt === "string" &&
      typeof memo.updatedAt === "string",
  );
}

export function loadExternalCatchMemos(storage: Storage | undefined): ExternalCatchMemo[] {
  if (!storage) return [];
  try {
    const rawValue = storage.getItem(EXTERNAL_CATCH_MEMO_STORAGE_KEY);
    if (!rawValue) return [];
    const parsedValue: unknown = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue.filter(isExternalCatchMemo) : [];
  } catch {
    return [];
  }
}

export function saveExternalCatchMemos(storage: Storage | undefined, memos: ExternalCatchMemo[]) {
  if (!storage) return;
  storage.setItem(EXTERNAL_CATCH_MEMO_STORAGE_KEY, JSON.stringify(memos));
}
