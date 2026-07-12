import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";

export function getManualCatchMemos(memos: ExternalCatchMemo[]): ExternalCatchMemo[] {
  return memos.filter((memo) => memo.acquisitionMethod === "manual");
}
