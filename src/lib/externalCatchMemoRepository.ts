import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { mapExternalCatchMemoRow, mapExternalCatchMemoToUpsertPayload, type ExternalCatchMemoRow } from "@/lib/externalCatchMemoMapper";

export type ExternalCatchMemoDbSource = "supabase" | "local-storage-fallback";
export type ExternalCatchMemoDbFallbackReason = "not-authenticated" | "supabase-not-configured" | "supabase-error" | "local-data-not-migrated";
export type ExternalCatchMemoDbResult<T> = {
  data: T;
  meta: { source: ExternalCatchMemoDbSource; fallbackReason?: ExternalCatchMemoDbFallbackReason; message?: string };
};

const externalCatchMemoColumns = "id,species,caught_date,area_name,estimated_spot_name,spot_id,latitude,longitude,coordinate_precision,method,catch_count,size_cm,source_id,source_name,source_url,acquisition_method,confidence,environment_match_notes,user_memo,owner_id,created_by,is_deleted,created_at,updated_at";

function sanitizeDiagnosticMessage(message: string) {
  return message
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted-token]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[redacted-id]")
    .replace(/owner_id\s*=\s*[^\s,)]+/gi, "owner_id=[redacted]");
}

function fallback<T>(data: T, fallbackReason: ExternalCatchMemoDbFallbackReason, message?: string): ExternalCatchMemoDbResult<T> {
  return { data, meta: { source: "local-storage-fallback", fallbackReason, message: message ? sanitizeDiagnosticMessage(message) : undefined } };
}

function getClientForUser<T>(userId: string | null, fallbackData: T): { ok: true; userId: string; client: SupabaseClient } | { ok: false; result: ExternalCatchMemoDbResult<T> } {
  if (!userId) return { ok: false, result: fallback(fallbackData, "not-authenticated") };
  const status = getSupabaseClient();
  if (!status.isConfigured) {
    return { ok: false, result: fallback(fallbackData, "supabase-not-configured", `Missing env vars: ${status.missingEnvVars.join(", ")}`) };
  }
  return { ok: true, userId, client: status.client };
}

export async function fetchExternalCatchMemosFromSupabase(userId: string | null): Promise<ExternalCatchMemoDbResult<ExternalCatchMemo[]>> {
  const clientStatus = getClientForUser(userId, []);
  if (!clientStatus.ok) return clientStatus.result;

  const { data, error } = await clientStatus.client
    .from("external_catch_memos")
    .select(externalCatchMemoColumns)
    .eq("owner_id", clientStatus.userId)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) return fallback([], "supabase-error", error.message);

  const memos = ((data ?? []) as ExternalCatchMemoRow[])
    .map(mapExternalCatchMemoRow)
    .filter((memo): memo is ExternalCatchMemo => memo !== null);

  return { data: memos, meta: { source: "supabase" } };
}

export async function saveExternalCatchMemoToSupabase(userId: string | null, memo: ExternalCatchMemo, options: { mode?: "insert" | "update" } = {}): Promise<ExternalCatchMemoDbResult<ExternalCatchMemo | null>> {
  const clientStatus = getClientForUser(userId, null);
  if (!clientStatus.ok) return clientStatus.result;

  const payload = {
    ...mapExternalCatchMemoToUpsertPayload(memo),
    owner_id: clientStatus.userId,
    created_by: "authenticated_user" as const,
    is_deleted: false,
  };

  const mutation = options.mode === "update"
    ? clientStatus.client
        .from("external_catch_memos")
        .update(payload)
        .eq("id", memo.id)
        .eq("owner_id", clientStatus.userId)
        .select(externalCatchMemoColumns)
        .maybeSingle()
    : clientStatus.client
        .from("external_catch_memos")
        .insert(payload)
        .select(externalCatchMemoColumns)
        .single();

  const { data, error } = await mutation;

  if (error) return fallback(null, "supabase-error", error.message);
  if (!data) return fallback(null, "supabase-error", "No matching external catch memo row was updated.");
  const savedMemo = mapExternalCatchMemoRow(data as ExternalCatchMemoRow);
  return { data: savedMemo, meta: { source: "supabase" } };
}

export async function deleteExternalCatchMemoFromSupabase(userId: string | null, memoId: string): Promise<ExternalCatchMemoDbResult<null>> {
  const clientStatus = getClientForUser(userId, null);
  if (!clientStatus.ok) return clientStatus.result;

  const { data, error } = await clientStatus.client.rpc("soft_delete_external_catch_memo", { p_memo_id: memoId });

  if (error) return fallback(null, "supabase-error", error.message);
  if (data !== true) return fallback(null, "supabase-error", "No matching external catch memo row was deleted.");
  return { data: null, meta: { source: "supabase" } };
}
