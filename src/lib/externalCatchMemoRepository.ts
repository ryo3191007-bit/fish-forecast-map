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
const diagnosticMaxLength = 180;

function sanitizeDiagnosticMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  const sanitized = message
    .replace(/https?:\/\/[^\s)\]"']+/gi, "[redacted-url]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-jwt]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[redacted-uuid]")
    .replace(/\bowner_id\b\s*(?:=|eq\.|:)?\s*['"]?[^\s,'")]+/gi, "owner_id=[redacted]")
    .replace(/\b(?:apikey|api_key|anon(?:_key)?|key|token|authorization)\b\s*(?:=|:)?\s*['"]?[A-Za-z0-9._-]{12,}/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted-token]")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized.length > diagnosticMaxLength ? `${sanitized.slice(0, diagnosticMaxLength)}…` : sanitized;
}

function getSupabaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{2,16}$/i.test(code) ? code : undefined;
}

function buildDiagnosticMessage(message: string | undefined, code?: string): string | undefined {
  const safeMessage = sanitizeDiagnosticMessage(message);
  if (code && safeMessage) return `${code}: ${safeMessage}`;
  return code ?? safeMessage;
}

function warnDeleteDiagnostic(message: string | undefined) {
  if (!message) return;
  console.warn(`[external-catch-memo] safe delete diagnostic: ${message}`);
}

function fallback<T>(data: T, fallbackReason: ExternalCatchMemoDbFallbackReason, message?: string): ExternalCatchMemoDbResult<T> {
  return { data, meta: { source: "local-storage-fallback", fallbackReason, message: sanitizeDiagnosticMessage(message) } };
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

  if (error) return fallback([], "supabase-error", buildDiagnosticMessage(error.message, getSupabaseErrorCode(error)));

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

  if (error) return fallback(null, "supabase-error", buildDiagnosticMessage(error.message, getSupabaseErrorCode(error)));
  if (!data) return fallback(null, "supabase-error", "No matching external catch memo row was updated.");
  const savedMemo = mapExternalCatchMemoRow(data as ExternalCatchMemoRow);
  return { data: savedMemo, meta: { source: "supabase" } };
}

export async function deleteExternalCatchMemoFromSupabase(userId: string | null, memoId: string): Promise<ExternalCatchMemoDbResult<null>> {
  const clientStatus = getClientForUser(userId, null);
  if (!clientStatus.ok) return clientStatus.result;

  const { data, error } = await clientStatus.client.rpc("soft_delete_external_catch_memo", { p_memo_id: memoId });

  if (error) {
    const diagnostic = buildDiagnosticMessage(error.message, getSupabaseErrorCode(error));
    warnDeleteDiagnostic(diagnostic);
    return fallback(null, "supabase-error", diagnostic);
  }
  if (data !== true) {
    const diagnostic = buildDiagnosticMessage("soft_delete_external_catch_memo returned false; no owner-scoped active row was deleted.");
    warnDeleteDiagnostic(diagnostic);
    return fallback(null, "supabase-error", diagnostic);
  }
  return { data: null, meta: { source: "supabase" } };
}
