import type { FishingSpotDetailSet, SpotDetailAdoptionStatus, SpotDetailCategory, SpotDetailConfidence, SpotDetailContributionOrigin, SpotDetailInformationState, SpotDetailItemDefinition, SpotDetailModerationStatus, SpotDetailReviewStatus, SpotDetailSourceRelation, SpotDetailSourceType, SpotDetailValue, SpotDetailValueKind } from "@/domain/fishingSpotDetail";

export type SpotDetailItemDefinitionRow = { item_key: string; category: string; value_kind: string; label_ja: string; description?: string | null; display_order?: number | null; is_active?: boolean | null };
export type SpotDetailValueRow = { id: string; spot_id: string; item_key: string; information_state: string; value_text?: string | null; value_text_list?: unknown; value_number?: number | string | null; value_boolean?: boolean | null; value_json?: unknown | null; unit?: string | null; confidence?: string | null; contribution_origin?: string | null; contributor_id?: string | null; submitted_at?: string | null; moderation_status: string; review_status: string; adoption_status: string; note?: string | null; checked_at?: string | null; fishing_spot_detail_value_sources?: SpotDetailValueSourceJoinRow[] | null };
export type SpotDetailValueSourceJoinRow = { relation: string; note?: string | null; fishing_spot_detail_sources?: { id: string; source_type: string; source_name: string; source_url?: string | null; checked_on?: string | null; note?: string | null } | null };

const categories = new Set<SpotDetailCategory>(["basic", "facility", "access", "restriction", "terrain", "hydrology", "safety"]);
const valueKinds = new Set<SpotDetailValueKind>(["text", "text_list", "boolean", "number", "status", "enum", "json"]);
const informationStates = new Set<SpotDetailInformationState>(["has_evidence", "weak_evidence", "researched_unknown", "unresearched", "rejected"]);
const confidences = new Set<SpotDetailConfidence>(["high", "medium", "low"]);
const origins = new Set<SpotDetailContributionOrigin>(["curated_research", "user_contribution"]);
const moderationStatuses = new Set<SpotDetailModerationStatus>(["not_required", "pending", "approved", "rejected"]);
const reviewStatuses = new Set<SpotDetailReviewStatus>(["pending_review", "reviewed", "needs_recheck"]);
const adoptionStatuses = new Set<SpotDetailAdoptionStatus>(["adopted", "candidate", "not_adopted"]);
const sourceTypes = new Set<SpotDetailSourceType>(["official", "shop", "portal", "map", "field_research", "user_report", "other"]);
const relations = new Set<SpotDetailSourceRelation>(["supporting", "checked", "contradicting"]);

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return [];
  return value.every((item): item is string => typeof item === "string") ? value : null;
}

function enumOrNull<T extends string>(value: string | null | undefined, allowed: Set<T>): T | null {
  return value && allowed.has(value as T) ? (value as T) : null;
}

export function mapSpotDetailItemDefinitionRow(row: SpotDetailItemDefinitionRow): SpotDetailItemDefinition | null {
  if (row.is_active === false) return null;
  const category = enumOrNull(row.category, categories);
  const valueKind = enumOrNull(row.value_kind, valueKinds);
  if (!category || !valueKind) return null;
  return { itemKey: row.item_key, category, valueKind, labelJa: row.label_ja, description: row.description ?? undefined, displayOrder: row.display_order ?? 0 };
}

export function mapSpotDetailValueRow(row: SpotDetailValueRow, itemDefinition?: SpotDetailItemDefinition): SpotDetailValue | null {
  if (!itemDefinition) return null;
  const informationState = enumOrNull(row.information_state, informationStates);
  const contributionOrigin = enumOrNull(row.contribution_origin ?? "curated_research", origins);
  const moderationStatus = enumOrNull(row.moderation_status, moderationStatuses);
  const reviewStatus = enumOrNull(row.review_status, reviewStatuses);
  const adoptionStatus = enumOrNull(row.adoption_status, adoptionStatuses);
  if (!informationState || !contributionOrigin || !moderationStatus || !reviewStatus || !adoptionStatus) return null;

  const valueTextList = stringArray(row.value_text_list);
  const valueNumber = row.value_number === null || row.value_number === undefined ? null : Number(row.value_number);
  if (valueTextList === null || !Number.isFinite(valueNumber ?? 0)) return null;

  const valueText = row.value_text ?? null;
  const valueBoolean = row.value_boolean ?? null;
  const valueJson = row.value_json ?? null;
  const concreteValueCount = [valueText !== null, valueTextList.length > 0, valueNumber !== null, valueBoolean !== null, valueJson !== null].filter(Boolean).length;
  const confidence = enumOrNull(row.confidence, confidences);
  const hasConcreteInformation = informationState === "has_evidence" || informationState === "weak_evidence";
  if (hasConcreteInformation && (concreteValueCount !== 1 || confidence === null)) return null;
  if (!hasConcreteInformation && (concreteValueCount !== 0 || row.confidence !== null && row.confidence !== undefined)) return null;
  if (!valueMatchesKind(itemDefinition.valueKind, { valueText, valueTextList, valueNumber, valueBoolean, valueJson })) return null;

  const sources = (row.fishing_spot_detail_value_sources ?? []).flatMap((join) => {
    const source = Array.isArray(join.fishing_spot_detail_sources) ? join.fishing_spot_detail_sources[0] : join.fishing_spot_detail_sources;
    const relation = enumOrNull(join.relation, relations);
    const sourceType = enumOrNull(source?.source_type, sourceTypes);
    if (!source || !relation || !sourceType) return [];
    return [{ relation, note: join.note ?? null, source: { id: source.id, sourceType, sourceName: source.source_name, sourceUrl: source.source_url ?? null, checkedOn: source.checked_on ?? null, note: source.note ?? null } }];
  });
  if (hasConcreteInformation && !sources.some((source) => source.relation === "supporting")) return null;

  return {
    id: row.id,
    spotId: row.spot_id,
    itemKey: row.item_key,
    informationState,
    valueText,
    valueTextList,
    valueNumber,
    valueBoolean,
    valueJson,
    unit: row.unit ?? null,
    confidence,
    contributionOrigin,
    contributorId: row.contributor_id ?? null,
    submittedAt: row.submitted_at ?? null,
    moderationStatus,
    reviewStatus,
    adoptionStatus,
    note: row.note ?? null,
    checkedAt: row.checked_at ?? null,
    sources,
  };
}

function valueMatchesKind(valueKind: SpotDetailValueKind, value: { valueText: string | null; valueTextList: string[]; valueNumber: number | null; valueBoolean: boolean | null; valueJson: unknown | null }): boolean {
  switch (valueKind) {
    case "text":
    case "status":
    case "enum":
      return value.valueText !== null;
    case "text_list":
      return value.valueTextList.length > 0;
    case "number":
      return value.valueNumber !== null;
    case "boolean":
      return value.valueBoolean !== null;
    case "json":
      return value.valueJson !== null;
  }
}

export function mapFishingSpotDetailRows(itemRows: SpotDetailItemDefinitionRow[], valueRows: SpotDetailValueRow[]): FishingSpotDetailSet {
  const itemDefinitions = itemRows.map(mapSpotDetailItemDefinitionRow).filter((row): row is SpotDetailItemDefinition => row !== null);
  const definitionsByKey = new Map(itemDefinitions.map((definition) => [definition.itemKey, definition]));
  return {
    itemDefinitions,
    values: valueRows.map((row) => mapSpotDetailValueRow(row, definitionsByKey.get(row.item_key))).filter((row): row is SpotDetailValue => row !== null),
  };
}
