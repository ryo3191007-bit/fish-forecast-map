import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { mapExternalCatchMemoRow, mapExternalCatchMemoToUpsertPayload, type ExternalCatchMemoRow } from "@/lib/externalCatchMemoMapper";

export type ExternalCatchMemoDbSource = "supabase" | "local-storage-fallback";
export type ExternalCatchMemoDbFallbackReason = "supabase-not-configured" | "supabase-error" | "write-disabled";
export type ExternalCatchMemoDbResult<T> = {
  data: T;
  meta: { source: ExternalCatchMemoDbSource; fallbackReason?: ExternalCatchMemoDbFallbackReason; message?: string };
};

const externalCatchMemoColumns = "id,species,caught_date,area_name,estimated_spot_name,spot_id,latitude,longitude,coordinate_precision,method,catch_count,size_cm,source_id,source_name,source_url,acquisition_method,confidence,environment_match_notes,user_memo,owner_id,created_by,is_deleted,created_at,updated_at";

function fallback<T>(data: T, fallbackReason: ExternalCatchMemoDbFallbackReason, message?: string): ExternalCatchMemoDbResult<T> {
  return { data, meta: { source: "local-storage-fallback", fallbackReason, message } };
}

export async function fetchExternalCatchMemosFromSupabase(): Promise<ExternalCatchMemoDbResult<ExternalCatchMemo[]>> {
  const status = getSupabaseClient();
  if (!status.isConfigured) {
    return fallback([], "supabase-not-configured", `Missing env vars: ${status.missingEnvVars.join(", ")}`);
  }

  const { data, error } = await status.client
    .from("external_catch_memos")
    .select(externalCatchMemoColumns)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) return fallback([], "supabase-error", error.message);

  const memos = ((data ?? []) as ExternalCatchMemoRow[])
    .map(mapExternalCatchMemoRow)
    .filter((memo): memo is ExternalCatchMemo => memo !== null);

  return { data: memos, meta: { source: "supabase" } };
}

export async function saveExternalCatchMemoToSupabase(memo: ExternalCatchMemo): Promise<ExternalCatchMemoDbResult<ExternalCatchMemo | null>> {
  void mapExternalCatchMemoToUpsertPayload(memo);
  return fallback(null, "write-disabled", "External catch memo DB writes are intentionally disabled until auth/RLS policy is approved.");
}

export async function deleteExternalCatchMemoFromSupabase(memoId: string): Promise<ExternalCatchMemoDbResult<null>> {
  void memoId;
  return fallback(null, "write-disabled", "External catch memo DB deletes are intentionally disabled until auth/RLS policy is approved.");
}
