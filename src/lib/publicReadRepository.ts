import type { ExternalCatchRecord } from "@/domain/externalCatch";
import type { SpotFieldReport, SpotFieldReportTargetType } from "@/domain/spotFieldObservation";
import { userSpotRuntimeId, type UserFishingSpot } from "@/domain/userFishingSpot";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { isMissingSupabaseObject } from "@/lib/supabaseObjectError";

type PublicSpotRow = { id: string; name: string; latitude: number | string; longitude: number | string; area_name: string | null; spot_type: UserFishingSpot["spotType"]; created_at: string; updated_at: string };
type PublicReportRow = { id: string; target_type: SpotFieldReportTargetType; spot_id: string | null; user_spot_id: string | null; observed_on: string; summary_note: string | null; origin: SpotFieldReport["origin"]; created_at: string };
type PublicValueRow = { id: string; report_id: string; item_key: string; information_state: "weak_evidence" | "researched_unknown"; value_text: string | null; value_text_list: string[] | null; value_number: number | string | null; unit: string | null; note: string | null; created_at: string };
type PublicCatchRow = { id: string; species: string; caught_date: string; caught_time: string | null; area_name: string; estimated_spot_name: string | null; spot_id: string | null; user_spot_id: string | null; latitude: number | string | null; longitude: number | string | null; coordinate_precision: ExternalCatchRecord["coordinatePrecision"] | null; method: string | null; catch_count: number | null; size_cm: number | null; catch_items: ExternalCatchRecord["catchItems"] | null; acquisition_method: "manual"; confidence: ExternalCatchRecord["confidence"]; environment_match_notes: string[] | null; created_at: string; updated_at: string };

function configuredClient() { const status = getSupabaseClient(); return status.isConfigured ? status.client : null; }
function missing(error: unknown, view: string) { return isMissingSupabaseObject(error, view); }

export function mergeOwnerAndPublicSpots(owner: readonly UserFishingSpot[], published: readonly UserFishingSpot[]) {
  const ownedIds = new Set(owner.map(({ id }) => id));
  return [...owner, ...published.filter(({ id }) => !ownedIds.has(id))];
}

export async function fetchPublicUserFishingSpots(): Promise<UserFishingSpot[]> {
  const client = configuredClient(); if (!client) return [];
  const { data, error } = await client.from("public_user_fishing_spots").select("id,name,latitude,longitude,area_name,spot_type,created_at,updated_at").order("updated_at", { ascending: false });
  if (error) { if (missing(error, "public_user_fishing_spots")) return []; throw error; }
  return ((data ?? []) as PublicSpotRow[]).map((row) => ({ id: row.id, runtimeId: userSpotRuntimeId(row.id), name: row.name, latitude: Number(row.latitude), longitude: Number(row.longitude), areaName: row.area_name, spotType: row.spot_type, visibility: "public", createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function fetchPublicSpotFieldReports(targetType: SpotFieldReportTargetType, spotId: string): Promise<SpotFieldReport[]> {
  const client = configuredClient(); if (!client) return [];
  let query = client.from("public_spot_field_reports").select("id,target_type,spot_id,user_spot_id,observed_on,summary_note,origin,created_at").eq("target_type", targetType);
  query = targetType === "master" ? query.eq("spot_id", spotId) : query.eq("user_spot_id", spotId);
  const reportsResult = await query.order("observed_on", { ascending: false });
  if (reportsResult.error) { if (missing(reportsResult.error, "public_spot_field_reports")) return []; throw reportsResult.error; }
  const reports = (reportsResult.data ?? []) as PublicReportRow[]; if (!reports.length) return [];
  const valuesResult = await client.from("public_spot_field_report_values").select("id,report_id,item_key,information_state,value_text,value_text_list,value_number,unit,note,created_at").in("report_id", reports.map(({ id }) => id));
  if (valuesResult.error) { if (missing(valuesResult.error, "public_spot_field_report_values")) return []; throw valuesResult.error; }
  const values = (valuesResult.data ?? []) as PublicValueRow[];
  return reports.map((report) => ({ id: report.id, targetType: report.target_type, spotId: report.spot_id ?? report.user_spot_id ?? spotId, observedOn: report.observed_on, summaryNote: report.summary_note, origin: report.origin, createdAt: report.created_at, visibility: "public", values: values.filter(({ report_id }) => report_id === report.id).map((value) => ({ id: value.id, spotId, itemKey: value.item_key, informationState: value.information_state, valueText: value.value_text, valueTextList: value.value_text_list ?? [], valueNumber: value.value_number === null ? null : Number(value.value_number), unit: value.unit, checkedAt: report.observed_on, note: value.note, updatedAt: value.created_at })) }));
}

export async function fetchPublicCatchesForSpot(targetType: SpotFieldReportTargetType, spotId: string): Promise<ExternalCatchRecord[]> {
  const client = configuredClient(); if (!client) return [];
  let query = client.from("public_catch_records").select("id,species,caught_date,caught_time,area_name,estimated_spot_name,spot_id,user_spot_id,latitude,longitude,coordinate_precision,method,catch_count,size_cm,catch_items,acquisition_method,confidence,environment_match_notes,created_at,updated_at");
  query = targetType === "master" ? query.eq("spot_id", spotId) : query.eq("user_spot_id", spotId);
  const { data, error } = await query.order("caught_date", { ascending: false });
  if (error) { if (missing(error, "public_catch_records")) return []; throw error; }
  return ((data ?? []) as PublicCatchRow[]).map((row) => ({ id: row.id, species: row.species, catchItems: row.catch_items?.length ? row.catch_items : [{ species: row.species, ...(row.method ? { method: row.method } : {}), ...(row.catch_count === null ? {} : { catchCount: row.catch_count }), ...(row.size_cm === null ? {} : { sizeCm: row.size_cm }) }], caughtDate: row.caught_date, ...(row.caught_time ? { caughtTime: row.caught_time } : {}), areaName: row.area_name, ...(row.estimated_spot_name ? { estimatedSpotName: row.estimated_spot_name } : {}), ...(row.spot_id ? { spotId: row.spot_id } : {}), ...(row.latitude === null ? {} : { latitude: Number(row.latitude) }), ...(row.longitude === null ? {} : { longitude: Number(row.longitude) }), coordinatePrecision: row.coordinate_precision ?? "unknown", ...(row.method ? { method: row.method } : {}), sourceId: "public", sourceName: "公開投稿", sourceUrl: "", acquisitionMethod: "manual", confidence: row.confidence, ...(row.environment_match_notes ? { environmentMatchNotes: row.environment_match_notes } : {}), createdAt: row.created_at, updatedAt: row.updated_at }));
}
