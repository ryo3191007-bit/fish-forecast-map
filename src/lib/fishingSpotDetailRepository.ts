import type { FishingSpotDetailSet } from "@/domain/fishingSpotDetail";
import { fishingSpots } from "@/data/fishingSpots";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { buildStaticFishingSpotDetailsFromSpots } from "@/lib/fishingSpotDetailFallback";
import { mapFishingSpotDetailRows, type SpotDetailItemDefinitionRow, type SpotDetailValueRow } from "@/lib/fishingSpotDetailMapper";
import type { MasterDataMeta, MasterDataResult } from "@/lib/masterDataRepository";

function buildStaticFishingSpotDetails(spotId?: string): FishingSpotDetailSet {
  const spots = spotId ? fishingSpots.filter((spot) => spot.id === spotId) : fishingSpots;
  return buildStaticFishingSpotDetailsFromSpots(spots);
}

function fallback(fallbackReason: NonNullable<MasterDataMeta["fallbackReason"]>, spotId?: string, message?: string): MasterDataResult<FishingSpotDetailSet> {
  return { data: buildStaticFishingSpotDetails(spotId), meta: { source: "static-fallback", fallbackReason, message } };
}

export async function fetchFishingSpotDetails(spotId?: string): Promise<MasterDataResult<FishingSpotDetailSet>> {
  const status = getSupabaseClient();
  if (!status.isConfigured) return fallback("supabase-not-configured", spotId, `Missing env vars: ${status.missingEnvVars.join(", ")}`);

  const [itemResult, valueResult] = await Promise.all([
    status.client.from("fishing_spot_detail_item_definitions").select("item_key,category,value_kind,label_ja,description,display_order,is_active").order("display_order", { ascending: true }),
    (spotId
      ? status.client.from("fishing_spot_detail_values").select("id,spot_id,item_key,information_state,value_text,value_text_list,value_number,value_boolean,value_json,unit,confidence,submitted_at,moderation_status,review_status,adoption_status,note,checked_at,fishing_spot_detail_value_sources(relation,note,fishing_spot_detail_sources(id,source_type,source_name,source_url,checked_on,note))").eq("spot_id", spotId)
      : status.client.from("fishing_spot_detail_values").select("id,spot_id,item_key,information_state,value_text,value_text_list,value_number,value_boolean,value_json,unit,confidence,submitted_at,moderation_status,review_status,adoption_status,note,checked_at,fishing_spot_detail_value_sources(relation,note,fishing_spot_detail_sources(id,source_type,source_name,source_url,checked_on,note))")),
  ]);

  if (itemResult.error) return fallback("supabase-error", spotId, itemResult.error.message);
  if (valueResult.error) return fallback("supabase-error", spotId, valueResult.error.message);

  return { data: mapFishingSpotDetailRows((itemResult.data ?? []) as SpotDetailItemDefinitionRow[], (valueResult.data ?? []) as unknown as SpotDetailValueRow[]), meta: { source: "supabase" } };
}

export function getStaticFishingSpotDetails(spotId?: string): FishingSpotDetailSet {
  return buildStaticFishingSpotDetails(spotId);
}
