import type { SaveSpotFieldObservationInput, SpotFieldObservation } from "@/domain/spotFieldObservation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { saveMySpotFieldReport } from "@/lib/spotFieldReportRepository";
import { isMissingSupabaseObject } from "@/lib/supabaseObjectError";

type SpotFieldObservationRow = {
  id: string;
  spot_id: string;
  item_key: string;
  information_state: "weak_evidence" | "researched_unknown";
  value_text: string | null;
  value_text_list: string[] | null;
  value_number: number | string | null;
  unit: string | null;
  checked_at: string;
  note: string | null;
  updated_at: string;
};

function mapRow(row: SpotFieldObservationRow): SpotFieldObservation {
  const numeric = row.value_number === null ? null : Number(row.value_number);
  return {
    id: row.id,
    spotId: row.spot_id,
    itemKey: row.item_key,
    informationState: row.information_state,
    valueText: row.value_text,
    valueTextList: Array.isArray(row.value_text_list) ? row.value_text_list : [],
    valueNumber: numeric !== null && Number.isFinite(numeric) ? numeric : null,
    unit: row.unit,
    checkedAt: row.checked_at,
    note: row.note,
    updatedAt: row.updated_at,
  };
}

function configuredClient() {
  const status = getSupabaseClient();
  if (!status.isConfigured) throw new Error("supabase-unavailable");
  return status.client;
}

export async function fetchMySpotFieldObservations(spotId: string): Promise<SpotFieldObservation[]> {
  const client = configuredClient();
  const { data, error } = await client.rpc("get_my_spot_observations", { p_spot_id: spotId });
  if (error) throw new Error("field-observation-fetch-failed");
  return ((data ?? []) as SpotFieldObservationRow[]).map(mapRow);
}

export async function saveMySpotFieldObservation(input: SaveSpotFieldObservationInput): Promise<string> {
  const client = configuredClient();
  try {
    return await saveMySpotFieldReport("master", input.spotId, input.checkedAt, null, [input]);
  } catch (error) {
    if (!isMissingSupabaseObject(error, "save_my_spot_field_report")) throw error;
  }
  const { data, error } = await client.rpc("save_my_spot_observation", {
    p_spot_id: input.spotId,
    p_item_key: input.itemKey,
    p_information_state: input.informationState,
    p_value_text: input.valueText,
    p_value_text_list: input.valueTextList,
    p_value_number: input.valueNumber,
    p_unit: input.unit,
    p_checked_at: input.checkedAt,
    p_note: input.note,
  });
  if (error || typeof data !== "string") throw new Error("field-observation-save-failed");
  return data;
}

export async function deleteMySpotFieldObservation(observationId: string): Promise<void> {
  const client = configuredClient();
  const { data, error } = await client.rpc("delete_my_spot_observation", { p_observation_id: observationId });
  if (error || data !== true) throw new Error("field-observation-delete-failed");
}
