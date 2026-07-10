import { fishSpeciesNames, type FishSpecies } from "@/domain/fishing";
import { fishingSpots } from "@/data/fishingSpots";
import { externalSources } from "@/data/externalSources";
import type { FishingSpot } from "@/domain/fishingSpot";
import type { ExternalSource } from "@/domain/externalSource";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { mapFishSpeciesRow, mapFishingSpotRow, mapSourceRegistryRow, type FishSpeciesRow, type FishingSpotRow, type SourceRegistryRow } from "@/lib/masterDataMapper";

export type MasterDataSource = "supabase" | "static-fallback";
export type MasterDataFallbackReason = "supabase-not-configured" | "supabase-error" | "empty-supabase-result";
export type MasterDataMeta = { source: MasterDataSource; fallbackReason?: MasterDataFallbackReason; message?: string };
export type MasterDataResult<T> = { data: T; meta: MasterDataMeta };
export type MasterDataSet = { fishSpecies: FishSpecies[]; fishingSpots: FishingSpot[]; externalSources: ExternalSource[] };

const staticFishSpecies: FishSpecies[] = fishSpeciesNames.map((nameJa) => ({ id: nameJa, nameJa, category: nameJa === "青物" || nameJa === "根魚" ? "category" : nameJa.includes("イカ") ? "squid" : "fish", seasonMonths: [], }));
const staticMasterData: MasterDataSet = { fishSpecies: staticFishSpecies, fishingSpots, externalSources };

function fallback<T>(data: T, fallbackReason: MasterDataFallbackReason, message?: string): MasterDataResult<T> {
  return { data, meta: { source: "static-fallback", fallbackReason, message } };
}

async function selectRows<T>(tableName: string, columns = "*"): Promise<MasterDataResult<T[]>> {
  const status = getSupabaseClient();
  if (!status.isConfigured) {
    return fallback([], "supabase-not-configured", `Missing env vars: ${status.missingEnvVars.join(", ")}`);
  }

  const { data, error } = await status.client.from(tableName).select(columns);
  if (error) return fallback([], "supabase-error", error.message);

  return { data: (data ?? []) as T[], meta: { source: "supabase" } };
}

export async function fetchFishSpeciesMaster(): Promise<MasterDataResult<FishSpecies[]>> {
  const result = await selectRows<FishSpeciesRow>("fish_species", "id,name_ja,category,season_months,display_order,is_active");
  if (result.meta.source !== "supabase") return fallback(staticFishSpecies, result.meta.fallbackReason ?? "supabase-error", result.meta.message);
  const mapped = result.data.map(mapFishSpeciesRow).filter((row): row is FishSpecies => row !== null);
  return mapped.length > 0 ? { data: mapped, meta: result.meta } : fallback(staticFishSpecies, "empty-supabase-result");
}

export async function fetchFishingSpotsMaster(): Promise<MasterDataResult<FishingSpot[]>> {
  const result = await selectRows<FishingSpotRow>("fishing_spots", "id,name,area_name,latitude,longitude,spot_type,shore_access,target_species,recommended_methods,notes,coordinate_precision,is_active");
  if (result.meta.source !== "supabase") return fallback(fishingSpots, result.meta.fallbackReason ?? "supabase-error", result.meta.message);
  const mapped = result.data.map(mapFishingSpotRow).filter((row): row is FishingSpot => row !== null);
  return mapped.length > 0 ? { data: mapped, meta: result.meta } : fallback(fishingSpots, "empty-supabase-result");
}

export async function fetchSourceRegistryMaster(): Promise<MasterDataResult<ExternalSource[]>> {
  const result = await selectRows<SourceRegistryRow>("source_registry", "source_id,source_name,source_type,target_area_names,base_url,crawl_policy,robots_status,terms_status,notes,reviewed_at,review_urls,review_summary,is_active");
  if (result.meta.source !== "supabase") return fallback(externalSources, result.meta.fallbackReason ?? "supabase-error", result.meta.message);
  const mapped = result.data.map(mapSourceRegistryRow).filter((row): row is ExternalSource => row !== null);
  return mapped.length > 0 ? { data: mapped, meta: result.meta } : fallback(externalSources, "empty-supabase-result");
}

export async function fetchMasterData(): Promise<MasterDataResult<MasterDataSet>> {
  const [fishSpeciesResult, fishingSpotsResult, sourceRegistryResult] = await Promise.all([fetchFishSpeciesMaster(), fetchFishingSpotsMaster(), fetchSourceRegistryMaster()]);
  const results = [fishSpeciesResult, fishingSpotsResult, sourceRegistryResult];
  const fallbackResult = results.find((result) => result.meta.source === "static-fallback");

  return {
    data: { fishSpecies: fishSpeciesResult.data, fishingSpots: fishingSpotsResult.data, externalSources: sourceRegistryResult.data },
    meta: fallbackResult ? { source: "static-fallback", fallbackReason: fallbackResult.meta.fallbackReason, message: fallbackResult.meta.message } : { source: "supabase" },
  };
}

export function getStaticMasterData(): MasterDataSet {
  return staticMasterData;
}
