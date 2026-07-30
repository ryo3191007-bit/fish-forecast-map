import type { SaveSpotFieldObservationInput } from "@/domain/spotFieldObservation";
import {
  userFishingSpotDetailItemKeys,
  isUserFishingSpotType,
  userSpotRuntimeId,
  validateUserFishingSpotInput,
  type SaveUserFishingSpotInput,
  type UserFishingSpot,
  type UserFishingSpotDetailItemKey,
  type UserFishingSpotDetailValue,
} from "@/domain/userFishingSpot";
import { getSupabaseClient } from "@/lib/supabaseClient";

type UserSpotRow = { id: string; name: string; latitude: number | string; longitude: number | string; area_name: string | null; spot_type: string | null; created_at: string; updated_at: string };
type UserDetailRow = { id: string; user_spot_id: string; item_key: UserFishingSpotDetailItemKey; value_text: string | null; value_text_list: string[] | null; value_number: number | string | null; unit: string | null; checked_at: string; note: string | null; updated_at: string };

function client() {
  const status = getSupabaseClient();
  if (!status.isConfigured) throw new Error("supabase-unavailable");
  return status.client;
}

function mapSpot(row: UserSpotRow): UserFishingSpot {
  if (row.spot_type !== null && !isUserFishingSpotType(row.spot_type)) throw new Error("invalid-user-fishing-spot-type");
  return { id: row.id, runtimeId: userSpotRuntimeId(row.id), name: row.name, latitude: Number(row.latitude), longitude: Number(row.longitude), areaName: row.area_name, spotType: row.spot_type, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapDetail(row: UserDetailRow): UserFishingSpotDetailValue {
  const number = row.value_number === null ? null : Number(row.value_number);
  return { id: row.id, spotId: row.user_spot_id, itemKey: row.item_key, valueText: row.value_text, valueTextList: row.value_text_list ?? [], valueNumber: Number.isFinite(number) ? number : null, unit: row.unit, checkedAt: row.checked_at, note: row.note, updatedAt: row.updated_at };
}

export async function fetchMyUserFishingSpots(): Promise<UserFishingSpot[]> {
  const { data, error } = await client().from("user_fishing_spots").select("id,name,latitude,longitude,area_name,spot_type,created_at,updated_at").eq("is_deleted", false).order("created_at");
  if (error) throw new Error("user-fishing-spots-fetch-failed");
  return ((data ?? []) as UserSpotRow[]).map(mapSpot);
}

export async function createMyUserFishingSpot(input: SaveUserFishingSpotInput): Promise<UserFishingSpot> {
  const valid = validateUserFishingSpotInput(input);
  if (!valid) throw new Error("invalid-user-fishing-spot");
  const { data, error } = await client().from("user_fishing_spots").insert({ name: valid.name, latitude: valid.latitude, longitude: valid.longitude, area_name: valid.areaName, spot_type: valid.spotType }).select("id,name,latitude,longitude,area_name,spot_type,created_at,updated_at").single();
  if (error || !data) throw new Error("user-fishing-spot-create-failed");
  return mapSpot(data as UserSpotRow);
}

export async function createMyUserFishingSpotWithDetails(creationId: string, input: SaveUserFishingSpotInput, details: SaveSpotFieldObservationInput[]): Promise<UserFishingSpot> {
  const valid = validateUserFishingSpotInput(input);
  if (!valid || details.some((detail) => !userFishingSpotDetailItemKeys.includes(detail.itemKey as UserFishingSpotDetailItemKey) || detail.informationState !== "weak_evidence")) throw new Error("invalid-user-fishing-spot");
  const { data, error } = await client().rpc("create_my_user_fishing_spot_with_details", {
    p_spot_id: creationId, p_name: valid.name, p_latitude: valid.latitude, p_longitude: valid.longitude,
    p_area_name: valid.areaName, p_spot_type: valid.spotType,
    p_details: details.map((detail) => ({ item_key: detail.itemKey, value_text: detail.valueText, value_text_list: detail.valueTextList, value_number: detail.valueNumber, unit: detail.unit, checked_at: detail.checkedAt, note: detail.note })),
  });
  if (error || !data) throw new Error("user-fishing-spot-create-failed");
  const { data: row, error: fetchError } = await client().from("user_fishing_spots").select("id,name,latitude,longitude,area_name,spot_type,created_at,updated_at").eq("id", data as string).single();
  if (fetchError || !row) throw new Error("user-fishing-spot-create-result-failed");
  return mapSpot(row as UserSpotRow);
}

export async function updateMyUserFishingSpot(id: string, input: SaveUserFishingSpotInput): Promise<UserFishingSpot> {
  const valid = validateUserFishingSpotInput(input);
  if (!valid) throw new Error("invalid-user-fishing-spot");
  const { data, error } = await client().from("user_fishing_spots").update({ name: valid.name, latitude: valid.latitude, longitude: valid.longitude, area_name: valid.areaName, spot_type: valid.spotType }).eq("id", id).eq("is_deleted", false).select("id,name,latitude,longitude,area_name,spot_type,created_at,updated_at").single();
  if (error || !data) throw new Error("user-fishing-spot-update-failed");
  return mapSpot(data as UserSpotRow);
}

export async function softDeleteMyUserFishingSpot(id: string): Promise<void> {
  const { data, error } = await client().from("user_fishing_spots").update({ is_deleted: true }).eq("id", id).eq("is_deleted", false).select("id").maybeSingle();
  if (error || !data) throw new Error("user-fishing-spot-delete-failed");
}

export async function fetchMyUserFishingSpotDetails(spotId: string): Promise<UserFishingSpotDetailValue[]> {
  const { data, error } = await client().from("user_fishing_spot_detail_values").select("id,user_spot_id,item_key,value_text,value_text_list,value_number,unit,checked_at,note,updated_at").eq("user_spot_id", spotId).order("updated_at");
  if (error) throw new Error("user-fishing-spot-details-fetch-failed");
  return ((data ?? []) as UserDetailRow[]).map(mapDetail);
}

export async function saveMyUserFishingSpotDetail(spotId: string, input: SaveSpotFieldObservationInput): Promise<UserFishingSpotDetailValue> {
  if (!userFishingSpotDetailItemKeys.includes(input.itemKey as UserFishingSpotDetailItemKey) || input.informationState !== "weak_evidence") throw new Error("invalid-user-fishing-spot-detail");
  const { data, error } = await client().from("user_fishing_spot_detail_values").upsert({ user_spot_id: spotId, item_key: input.itemKey, value_text: input.valueText, value_text_list: input.valueTextList, value_number: input.valueNumber, unit: input.unit, checked_at: input.checkedAt, note: input.note }, { onConflict: "user_spot_id,item_key" }).select("id,user_spot_id,item_key,value_text,value_text_list,value_number,unit,checked_at,note,updated_at").single();
  if (error || !data) throw new Error("user-fishing-spot-detail-save-failed");
  return mapDetail(data as UserDetailRow);
}

export async function deleteMyUserFishingSpotDetail(spotId: string, itemKey: UserFishingSpotDetailItemKey): Promise<void> {
  const { error } = await client().from("user_fishing_spot_detail_values").delete().eq("user_spot_id", spotId).eq("item_key", itemKey);
  if (error) throw new Error("user-fishing-spot-detail-delete-failed");
}
