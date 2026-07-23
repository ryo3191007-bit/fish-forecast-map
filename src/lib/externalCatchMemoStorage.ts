import type { CatchItem, ExternalCatchRecord } from "@/domain/externalCatch";

export const EXTERNAL_CATCH_MEMO_STORAGE_KEY = "fish-forecast-map.external-catch-memos";

export type ExternalCatchMemo = ExternalCatchRecord & { userMemo?: string };

function optionalNonNegativeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function normalizeCatchItems(value: unknown, legacy?: { species?: unknown; catchCount?: unknown; sizeCm?: unknown }): CatchItem[] {
  const items = Array.isArray(value) ? value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.species !== "string" || candidate.species.trim() === "") return [];
    return [{ species: candidate.species, catchCount: optionalNonNegativeNumber(candidate.catchCount), sizeCm: optionalNonNegativeNumber(candidate.sizeCm) }];
  }) : [];
  if (items.length > 0) return items;
  return typeof legacy?.species === "string" && legacy.species.trim() !== ""
    ? [{ species: legacy.species, catchCount: optionalNonNegativeNumber(legacy.catchCount), sizeCm: optionalNonNegativeNumber(legacy.sizeCm) }]
    : [];
}

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
    return Array.isArray(parsedValue) ? parsedValue.filter(isExternalCatchMemo).map((memo) => ({
      ...memo,
      catchItems: normalizeCatchItems(memo.catchItems, memo),
    })) : [];
  } catch {
    return [];
  }
}

export function saveExternalCatchMemos(storage: Storage | undefined, memos: ExternalCatchMemo[]) {
  if (!storage) return;
  storage.setItem(EXTERNAL_CATCH_MEMO_STORAGE_KEY, JSON.stringify(memos));
}
