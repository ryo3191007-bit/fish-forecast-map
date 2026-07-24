import type { FishingSpotDetailSet, SpotDetailValue } from "@/domain/fishingSpotDetail";
import { fishingSpots } from "@/data/fishingSpots";
import { getSupabaseClient, type SupabaseClientStatus } from "@/lib/supabaseClient";
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

const valueKey = (value: Pick<SpotDetailValue, "spotId" | "itemKey">) => `${value.spotId}:${value.itemKey}`;

/**
 * Issue #278 re-research values ship with the application so they can replace older
 * Supabase curated rows immediately after deployment. Approved user contributions keep
 * priority, and the remote database is not modified by this read-time merge.
 */
export function mergeStaticSpotDetailOverrides(
  databaseDetails: FishingSpotDetailSet,
  staticDetails: FishingSpotDetailSet,
): FishingSpotDetailSet {
  const overrides = staticDetails.values.filter((value) => value.id.endsWith(":issue278"));
  if (overrides.length === 0) return databaseDetails;

  const overrideKeys = new Set(overrides.map(valueKey));
  const userValues = databaseDetails.values.filter((value) =>
    value.contributionOrigin === "user_contribution" && overrideKeys.has(valueKey(value))
  );
  const retainedDatabaseValues = databaseDetails.values.filter((value) =>
    !overrideKeys.has(valueKey(value)) || value.contributionOrigin === "user_contribution"
  );
  const retainedWithoutPrioritizedUsers = retainedDatabaseValues.filter((value) => !userValues.includes(value));

  const definitions = new Map(databaseDetails.itemDefinitions.map((definition) => [definition.itemKey, definition]));
  for (const definition of staticDetails.itemDefinitions) {
    if (!definitions.has(definition.itemKey)) definitions.set(definition.itemKey, definition);
  }

  return {
    itemDefinitions: [...definitions.values()],
    values: [...userValues, ...overrides, ...retainedWithoutPrioritizedUsers],
  };
}

export async function fetchFishingSpotDetails(spotId?: string, clientStatus?: SupabaseClientStatus): Promise<MasterDataResult<FishingSpotDetailSet>> {
  const status = clientStatus ?? getSupabaseClient();
  if (!status.isConfigured) return fallback("supabase-not-configured", spotId, `Missing env vars: ${status.missingEnvVars.join(", ")}`);

  const [itemResult, valueResult] = await Promise.all([
    status.client.from("fishing_spot_detail_item_definitions").select("item_key,category,value_kind,label_ja,description,display_order,is_active").order("display_order", { ascending: true }),
    (spotId
      ? status.client.from("fishing_spot_detail_values").select("id,spot_id,item_key,information_state,value_text,value_text_list,value_number,value_boolean,value_json,unit,confidence,contribution_origin,submitted_at,moderation_status,review_status,adoption_status,note,checked_at,fishing_spot_detail_value_sources(relation,note,fishing_spot_detail_sources(id,source_type,source_name,source_url,checked_on,note))").eq("spot_id", spotId)
      : status.client.from("fishing_spot_detail_values").select("id,spot_id,item_key,information_state,value_text,value_text_list,value_number,value_boolean,value_json,unit,confidence,contribution_origin,submitted_at,moderation_status,review_status,adoption_status,note,checked_at,fishing_spot_detail_value_sources(relation,note,fishing_spot_detail_sources(id,source_type,source_name,source_url,checked_on,note))")),
  ]);

  if (itemResult.error) return fallback("supabase-error", spotId, itemResult.error.message);
  if (valueResult.error) return fallback("supabase-error", spotId, valueResult.error.message);

  const databaseDetails = mapFishingSpotDetailRows(
    (itemResult.data ?? []) as SpotDetailItemDefinitionRow[],
    (valueResult.data ?? []) as unknown as SpotDetailValueRow[],
  );
  return {
    data: mergeStaticSpotDetailOverrides(databaseDetails, buildStaticFishingSpotDetails(spotId)),
    meta: { source: "supabase", message: "Supabase data with newer static curated re-research overrides." },
  };
}

export function getStaticFishingSpotDetails(spotId?: string): FishingSpotDetailSet {
  return buildStaticFishingSpotDetails(spotId);
}
