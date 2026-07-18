import type { FishingSpotDetailSet, SpotDetailItemDefinition, SpotDetailValue } from "@/domain/fishingSpotDetail";
import { fishingSpots } from "@/data/fishingSpots";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { mapFishingSpotDetailRows, type SpotDetailItemDefinitionRow, type SpotDetailValueRow } from "@/lib/fishingSpotDetailMapper";
import type { MasterDataMeta, MasterDataResult } from "@/lib/masterDataRepository";

const staticItemDefinitions: SpotDetailItemDefinition[] = [
  { itemKey: "target_species", category: "basic", valueKind: "text_list", labelJa: "対象魚種", description: "既存釣り場マスターの対象魚種。", displayOrder: 10 },
  { itemKey: "recommended_methods", category: "basic", valueKind: "text_list", labelJa: "推奨釣法", description: "既存釣り場マスターの推奨釣法。", displayOrder: 20 },
  { itemKey: "shore_access", category: "access", valueKind: "status", labelJa: "足場", description: "既存釣り場マスターの足場情報。", displayOrder: 30 },
];

function fallbackValue(id: string, spotId: string, itemKey: string, valueText: string | null, valueTextList: string[]): SpotDetailValue {
  const hasValue = valueText !== null || valueTextList.length > 0;
  return {
    id,
    spotId,
    itemKey,
    informationState: hasValue ? "weak_evidence" : "unresearched",
    valueText,
    valueTextList,
    valueNumber: null,
    valueBoolean: null,
    valueJson: null,
    unit: null,
    confidence: hasValue ? "low" : null,
    contributionOrigin: "curated_research",
    contributorId: null,
    submittedAt: null,
    moderationStatus: "not_required",
    reviewStatus: "pending_review",
    adoptionStatus: "adopted",
    note: null,
    checkedAt: null,
    sources: [],
  };
}

function buildStaticFishingSpotDetails(spotId?: string): FishingSpotDetailSet {
  const spots = spotId ? fishingSpots.filter((spot) => spot.id === spotId) : fishingSpots;
  return {
    itemDefinitions: staticItemDefinitions,
    values: spots.flatMap((spot) => [
      fallbackValue(`${spot.id}:target_species`, spot.id, "target_species", null, spot.targetSpecies),
      fallbackValue(`${spot.id}:recommended_methods`, spot.id, "recommended_methods", null, spot.recommendedMethods),
      fallbackValue(`${spot.id}:shore_access`, spot.id, "shore_access", spot.shoreAccess, []),
    ]),
  };
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
