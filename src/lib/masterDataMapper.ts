import { fishSpeciesIds, fishSpeciesNames, type FishSpecies, type FishSpeciesAlias, type FishSpeciesAliasApprovalStatus, type FishSpeciesName, type SpeciesCategory, type FishingMethod } from "@/domain/fishing";
import type { CoordinatePrecision, FishingSpot, FishingSpotType, ShoreAccess } from "@/domain/fishingSpot";
import type { CrawlPolicy, ExternalSource, ExternalSourceType, RobotsStatus, TermsStatus } from "@/domain/externalSource";

export type FishSpeciesRow = { id: string; name_ja: string; category: string; season_months: unknown; display_order?: number | null; is_active?: boolean | null };
export type FishSpeciesAliasRow = { id: string; fish_species_id: string; alias_name: string; match_key: string; approval_status: string; is_active: boolean };
export type FishingSpotRow = { id: string; name: string; area_name: string; latitude: number | string; longitude: number | string; spot_type: string; shore_access: string; target_species: unknown; recommended_methods: unknown; notes?: unknown; coordinate_precision: string; is_active?: boolean | null };
export type SourceRegistryRow = { source_id: string; source_name: string; source_type: string; target_area_names: unknown; base_url: string; crawl_policy: string; robots_status: string; terms_status: string; notes?: unknown; reviewed_at?: string | null; review_urls?: unknown; review_summary?: string | null; is_active?: boolean | null };

const speciesNameSet = new Set<string>(fishSpeciesNames);
const speciesIdSet = new Set<string>(fishSpeciesIds);
const aliasApprovalStatuses = new Set<FishSpeciesAliasApprovalStatus>(["pending", "approved", "rejected"]);
const speciesCategories = new Set<SpeciesCategory>(["fish", "category", "squid"]);
const fishingMethods = new Set<FishingMethod>(["ジギング", "キャスティング", "コマセ", "泳がせ", "サビキ", "エギング", "その他"]);
const spotTypes = new Set<FishingSpotType>(["漁港", "堤防", "サーフ", "地磯", "磯場", "河口", "湾岸", "その他"]);
const shoreAccessValues = new Set<ShoreAccess>(["足場良い", "注意必要", "上級者向け", "不明"]);
const coordinatePrecisions = new Set<CoordinatePrecision>(["exact", "approximate", "rounded"]);
const sourceTypes = new Set<ExternalSourceType>(["shop", "portal", "tide", "sns_like", "other"]);
const crawlPolicies = new Set<CrawlPolicy>(["allowed", "manualOnly", "referenceOnly", "unknown"]);
const robotsStatuses = new Set<RobotsStatus>(["unchecked", "allowed", "disallowed", "partial", "unknown"]);
const termsStatuses = new Set<TermsStatus>(["unchecked", "allowed", "restricted", "unknown"]);

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : [];
}

function enumValue<T extends string>(value: string, allowed: Set<T>, fallback: T): T {
  return allowed.has(value as T) ? (value as T) : fallback;
}

export function mapFishSpeciesRow(row: FishSpeciesRow): FishSpecies | null {
  if (row.is_active === false || !speciesNameSet.has(row.name_ja) || !speciesIdSet.has(row.id)) return null;

  return {
    id: row.id as FishSpecies["id"],
    nameJa: row.name_ja as FishSpeciesName,
    category: enumValue(row.category, speciesCategories, "fish"),
    seasonMonths: numberArray(row.season_months),
  };
}

export function mapFishSpeciesAliasRow(row: FishSpeciesAliasRow): FishSpeciesAlias | null {
  if (!speciesIdSet.has(row.fish_species_id) || !aliasApprovalStatuses.has(row.approval_status as FishSpeciesAliasApprovalStatus)) return null;
  return { id: row.id, fishSpeciesId: row.fish_species_id as FishSpeciesAlias["fishSpeciesId"], aliasName: row.alias_name, matchKey: row.match_key, approvalStatus: row.approval_status as FishSpeciesAliasApprovalStatus, isActive: row.is_active };
}

export function mapFishingSpotRow(row: FishingSpotRow): FishingSpot | null {
  if (row.is_active === false) return null;

  const targetSpecies = stringArray(row.target_species).filter((species): species is FishSpeciesName => speciesNameSet.has(species));
  const recommendedMethods = stringArray(row.recommended_methods).filter((method): method is FishingMethod => fishingMethods.has(method as FishingMethod));

  return {
    id: row.id,
    name: row.name,
    areaName: row.area_name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    spotType: enumValue(row.spot_type, spotTypes, "その他"),
    shoreAccess: enumValue(row.shore_access, shoreAccessValues, "不明"),
    targetSpecies,
    recommendedMethods,
    notes: stringArray(row.notes),
    coordinatePrecision: enumValue(row.coordinate_precision, coordinatePrecisions, "approximate"),
  };
}

export function mapSourceRegistryRow(row: SourceRegistryRow): ExternalSource | null {
  if (row.is_active === false) return null;

  return {
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceType: enumValue(row.source_type, sourceTypes, "other"),
    targetAreaNames: stringArray(row.target_area_names),
    baseUrl: row.base_url,
    crawlPolicy: enumValue(row.crawl_policy, crawlPolicies, "unknown"),
    robotsStatus: enumValue(row.robots_status, robotsStatuses, "unknown"),
    termsStatus: enumValue(row.terms_status, termsStatuses, "unknown"),
    notes: stringArray(row.notes),
    reviewedAt: row.reviewed_at ?? undefined,
    reviewUrls: stringArray(row.review_urls),
    reviewSummary: row.review_summary ?? undefined,
  };
}
