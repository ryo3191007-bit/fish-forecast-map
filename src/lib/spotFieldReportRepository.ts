import type { SaveSpotFieldObservationInput, SpotFieldObservation, SpotFieldReport, SpotFieldReportTargetType } from "@/domain/spotFieldObservation";
import { getSupabaseClient } from "@/lib/supabaseClient";

type ReportValueRow = { id: string; item_key: string; information_state: SpotFieldObservation["informationState"]; value_text: string | null; value_text_list: string[] | null; value_number: number | string | null; unit: string | null; note: string | null; created_at: string };
type ReportRow = { id: string; target_type: SpotFieldReportTargetType; spot_id: string | null; user_spot_id: string | null; observed_on: string; summary_note: string | null; origin: SpotFieldReport["origin"]; created_at: string; spot_field_report_values: ReportValueRow[] };

function client() {
  const status = getSupabaseClient();
  if (!status.isConfigured) throw new Error("supabase-unavailable");
  return status.client;
}

const payload = (value: SaveSpotFieldObservationInput) => ({ item_key: value.itemKey, information_state: value.informationState, value_text: value.valueText, value_text_list: value.valueTextList, value_number: value.valueNumber, unit: value.unit, note: value.note });

export async function saveMySpotFieldReport(targetType: SpotFieldReportTargetType, spotId: string, observedOn: string, summaryNote: string | null, values: SaveSpotFieldObservationInput[]): Promise<string> {
  const { data, error } = await client().rpc("save_my_spot_field_report", {
    p_target_type: targetType,
    p_spot_id: targetType === "master" ? spotId : null,
    p_user_spot_id: targetType === "user" ? spotId : null,
    p_observed_on: observedOn,
    p_summary_note: summaryNote,
    p_values: values.map(payload),
    p_origin: "user",
    p_idempotency_key: null,
  });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("field-report-save-invalid-response");
  return data;
}

export async function fetchMySpotFieldReports(targetType: SpotFieldReportTargetType, spotId: string): Promise<SpotFieldReport[]> {
  let query = client().from("spot_field_reports")
    .select("id,target_type,spot_id,user_spot_id,observed_on,summary_note,origin,created_at,spot_field_report_values(id,item_key,information_state,value_text,value_text_list,value_number,unit,note,created_at)")
    .eq("target_type", targetType);
  query = targetType === "master" ? query.eq("spot_id", spotId) : query.eq("user_spot_id", spotId);
  const { data, error } = await query.order("observed_on", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ReportRow[]).map((report) => ({
    id: report.id,
    targetType: report.target_type,
    spotId: report.spot_id ?? report.user_spot_id ?? spotId,
    observedOn: report.observed_on,
    summaryNote: report.summary_note,
    origin: report.origin,
    createdAt: report.created_at,
    values: report.spot_field_report_values.map((value) => ({
      id: value.id, spotId, itemKey: value.item_key, informationState: value.information_state,
      valueText: value.value_text, valueTextList: value.value_text_list ?? [],
      valueNumber: value.value_number === null || !Number.isFinite(Number(value.value_number)) ? null : Number(value.value_number),
      unit: value.unit, checkedAt: report.observed_on, note: value.note, updatedAt: value.created_at,
    })),
  }));
}
