import type { FishingSpotDetailSet, SpotDetailItemDefinition, SpotDetailSource, SpotDetailSourceRelation, SpotDetailValue } from "@/domain/fishingSpotDetail";
import type { FishingSpot } from "@/domain/fishingSpot";
import issue181Details from "../data/curation/issue-181-detail-initial-data.json";

export const staticFishingSpotDetailItemDefinitions: SpotDetailItemDefinition[] = [
  { itemKey: "target_species", category: "basic", valueKind: "text_list", labelJa: "対象魚種", description: "既存釣り場マスターの対象魚種。", displayOrder: 10 },
  { itemKey: "recommended_methods", category: "basic", valueKind: "text_list", labelJa: "推奨釣法", description: "既存釣り場マスターの推奨釣法。", displayOrder: 20 },
  { itemKey: "shore_access", category: "access", valueKind: "status", labelJa: "足場", description: "既存釣り場マスターの足場情報。", displayOrder: 30 },
  { itemKey: "toilet", category: "facility", valueKind: "status", labelJa: "トイレ", displayOrder: 40 },
  { itemKey: "lighting", category: "facility", valueKind: "status", labelJa: "常夜灯・照明", displayOrder: 50 },
  { itemKey: "parking", category: "facility", valueKind: "status", labelJa: "駐車場", displayOrder: 60 },
  { itemKey: "access", category: "access", valueKind: "text", labelJa: "アクセス情報", displayOrder: 70 },
  { itemKey: "restriction_status", category: "restriction", valueKind: "status", labelJa: "禁止・閉鎖等の状態", displayOrder: 80 },
  { itemKey: "depth", category: "terrain", valueKind: "number", labelJa: "水深", displayOrder: 90 },
  { itemKey: "bottom_material", category: "terrain", valueKind: "text_list", labelJa: "底質", displayOrder: 100 },
  { itemKey: "coastal_topography", category: "terrain", valueKind: "text_list", labelJa: "海底・沿岸地形", displayOrder: 110 },
  { itemKey: "obstacles", category: "terrain", valueKind: "text_list", labelJa: "テトラ・根・障害物", displayOrder: 120 },
  { itemKey: "spot_features", category: "terrain", valueKind: "text_list", labelJa: "堤防・磯・サーフ等の特徴", displayOrder: 130 },
  { itemKey: "water_flow_influences", category: "hydrology", valueKind: "text_list", labelJa: "潮通し・河川影響・外海影響", displayOrder: 140 },
];

export function isNoInformationText(value: string | null): boolean {
  return value === null || value.trim() === "" || value.trim() === "不明";
}

function fallbackValue(id: string, spotId: string, itemKey: string, valueText: string | null, valueTextList: string[]): SpotDetailValue {
  const normalizedValueText = isNoInformationText(valueText) ? null : valueText;
  const hasValue = normalizedValueText !== null || valueTextList.length > 0;
  return {
    id,
    spotId,
    itemKey,
    informationState: hasValue ? "weak_evidence" : "unresearched",
    valueText: normalizedValueText,
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
    adoptionStatus: "candidate",
    note: null,
    checkedAt: null,
    sources: [],
  };
}

type Issue181Source = SpotDetailSource;
type Issue181Value = Pick<SpotDetailValue, "id" | "itemKey" | "informationState" | "valueText" | "valueTextList" | "valueNumber" | "valueBoolean" | "valueJson" | "unit" | "confidence" | "note" | "checkedAt"> & { sources: Record<SpotDetailSourceRelation, string[]> };
type Issue181Spot = { spotId: string; sources: Issue181Source[]; values: Issue181Value[] };
const issue181DetailSpots = issue181Details.spots as Issue181Spot[];

function buildIssue181StaticValues(spotIds: Set<string>): SpotDetailValue[] {
  return issue181DetailSpots
    .filter((spot) => spotIds.has(spot.spotId))
    .flatMap((spot) => {
      const sourcesById = new Map(spot.sources.map((source) => [source.id, source]));
      return spot.values.map((value): SpotDetailValue => ({
        id: value.id,
        spotId: spot.spotId,
        itemKey: value.itemKey,
        informationState: value.informationState,
        valueText: value.valueText,
        valueTextList: value.valueTextList,
        valueNumber: value.valueNumber,
        valueBoolean: value.valueBoolean,
        valueJson: value.valueJson,
        unit: value.unit,
        confidence: value.confidence,
        contributionOrigin: "curated_research",
        contributorId: null,
        submittedAt: null,
        moderationStatus: "not_required",
        reviewStatus: "reviewed",
        adoptionStatus: "adopted",
        note: value.note,
        checkedAt: value.checkedAt,
        sources: (["supporting", "checked", "contradicting"] as SpotDetailSourceRelation[]).flatMap((relation) =>
          value.sources[relation].flatMap((sourceId) => {
            const source = sourcesById.get(sourceId);
            return source ? [{ source, relation, note: null }] : [];
          }),
        ),
      }));
    });
}

export function buildStaticFishingSpotDetailsFromSpots(spots: FishingSpot[]): FishingSpotDetailSet {
  const issue181Values = buildIssue181StaticValues(new Set(spots.map((spot) => spot.id)));
  if (issue181Values.length > 0) {
    return { itemDefinitions: staticFishingSpotDetailItemDefinitions, values: issue181Values };
  }

  return {
    itemDefinitions: staticFishingSpotDetailItemDefinitions,
    values: spots.flatMap((spot) => [
      fallbackValue(`${spot.id}:target_species`, spot.id, "target_species", null, spot.targetSpecies),
      fallbackValue(`${spot.id}:recommended_methods`, spot.id, "recommended_methods", null, spot.recommendedMethods),
      fallbackValue(`${spot.id}:shore_access`, spot.id, "shore_access", spot.shoreAccess, []),
    ]),
  };
}
