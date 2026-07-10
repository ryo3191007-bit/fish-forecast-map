import type { CoordinatePrecision, ExternalCatchAcquisitionMethod, ExternalCatchConfidence } from "@/domain/externalCatch";
import type { FishingMethod } from "@/domain/fishing";
import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";

export type ExternalCatchMemoRow = {
  id: string;
  species: string;
  caught_date: string;
  area_name: string;
  estimated_spot_name: string | null;
  spot_id: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  coordinate_precision: string;
  method: string | null;
  catch_count: number | null;
  size_cm: number | string | null;
  source_id: string;
  source_name: string;
  source_url: string;
  acquisition_method: string;
  confidence: string;
  environment_match_notes: unknown;
  user_memo: string | null;
  owner_id: string | null;
  created_by: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type ExternalCatchMemoUpsertPayload = Omit<
  ExternalCatchMemoRow,
  "owner_id" | "created_by" | "is_deleted" | "created_at" | "updated_at"
> & {
  owner_id?: string | null;
  created_by?: "manual_local_storage_migration" | "authenticated_user" | "admin_import";
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
};

const coordinatePrecisions = new Set<CoordinatePrecision>(["exact", "approximate", "rounded", "unknown"]);
const acquisitionMethods = new Set<ExternalCatchAcquisitionMethod>(["manual", "ai_assisted", "auto"]);
const confidences = new Set<ExternalCatchConfidence>(["high", "medium", "low"]);

function optionalNumber(value: number | string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalString(value: string | null): string | undefined {
  return value ?? undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((item): item is string => typeof item === "string");
  return values.length > 0 ? values : undefined;
}

function enumValue<T extends string>(value: string, allowed: Set<T>, fallback: T): T {
  return allowed.has(value as T) ? (value as T) : fallback;
}

export function mapExternalCatchMemoRow(row: ExternalCatchMemoRow): ExternalCatchMemo | null {
  if (row.is_deleted) return null;

  return {
    id: row.id,
    species: row.species,
    caughtDate: row.caught_date,
    areaName: row.area_name,
    estimatedSpotName: optionalString(row.estimated_spot_name),
    spotId: optionalString(row.spot_id),
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    coordinatePrecision: enumValue(row.coordinate_precision, coordinatePrecisions, "unknown"),
    method: optionalString(row.method) as FishingMethod | string | undefined,
    catchCount: optionalNumber(row.catch_count),
    sizeCm: optionalNumber(row.size_cm),
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    acquisitionMethod: enumValue(row.acquisition_method, acquisitionMethods, "manual"),
    confidence: enumValue(row.confidence, confidences, "medium"),
    environmentMatchNotes: stringArray(row.environment_match_notes),
    userMemo: optionalString(row.user_memo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExternalCatchMemoToUpsertPayload(memo: ExternalCatchMemo): ExternalCatchMemoUpsertPayload {
  return {
    id: memo.id,
    species: memo.species,
    caught_date: memo.caughtDate,
    area_name: memo.areaName,
    estimated_spot_name: memo.estimatedSpotName ?? null,
    spot_id: memo.spotId ?? null,
    latitude: memo.latitude ?? null,
    longitude: memo.longitude ?? null,
    coordinate_precision: memo.coordinatePrecision,
    method: memo.method ?? null,
    catch_count: memo.catchCount ?? null,
    size_cm: memo.sizeCm ?? null,
    source_id: memo.sourceId,
    source_name: memo.sourceName,
    source_url: memo.sourceUrl,
    acquisition_method: memo.acquisitionMethod,
    confidence: memo.confidence,
    environment_match_notes: memo.environmentMatchNotes ?? [],
    user_memo: memo.userMemo ?? null,
    is_deleted: false,
    created_at: memo.createdAt,
    updated_at: memo.updatedAt,
  };
}
