import type { FishingSpotDetailSet, SpotDetailItemDefinition, SpotDetailSource, SpotDetailSourceRelation, SpotDetailValue } from "@/domain/fishingSpotDetail";
import type { FishingSpot } from "@/domain/fishingSpot";
import issue181Details from "../data/curation/issue-181-detail-initial-data.json";
import issue194Details from "../../data/curation/fishing-spots/issue-194-detail-split.json";
import issue205Details from "../../data/curation/fishing-spots/issue-205-detail-curation.json";
import issue248Details from "../../data/curation/fishing-spots/issue-248-detail-curation.json";
import issue250Details from "../../data/curation/fishing-spots/issue-250-detail-curation.json";
import issue252Details from "../../data/curation/fishing-spots/issue-252-detail-curation.json";

export const staticFishingSpotDetailItemDefinitions: SpotDetailItemDefinition[] = [
  { itemKey: "target_species", category: "basic", valueKind: "text_list", labelJa: "対象魚種", description: "既存釣り場マスターの対象魚種。", displayOrder: 10 },
  { itemKey: "historical_target_species", category: "basic", valueKind: "text_list", labelJa: "過去の対象魚種（参考）", description: "弱い参考情報でありSCOREへ入力しない。", displayOrder: 15 },
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
  { itemKey: "spot_features", category: "terrain", valueKind: "text_list", labelJa: "釣り場の構造・足場", description: "釣り人が立つ場所、または釣り場を構成する人工・自然構造。漁港・第3種漁港等の単独の地点種別は含めない。島の漁港のように立地特性を含む短い複合句は例外として扱える。長い経路説明は含めない。", displayOrder: 130 },
  { itemKey: "fishable_area", category: "access", valueKind: "text_list", labelJa: "釣り可能範囲", description: "釣り可能と確認できた具体的な範囲。利用可否や規制情報とは分けて扱う。", displayOrder: 135 },
  { itemKey: "tidal_flow", category: "hydrology", valueKind: "enum", labelJa: "潮通し", displayOrder: 140 },
  { itemKey: "river_influence", category: "hydrology", valueKind: "enum", labelJa: "河川影響", displayOrder: 150 },
  { itemKey: "open_sea_bay_character", category: "hydrology", valueKind: "enum", labelJa: "外海・湾内特性", displayOrder: 160 },
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
const issue194DetailSpots = issue194Details.spots as Issue181Spot[];
const issue205DetailSpots = issue205Details.spots as Issue181Spot[];
const issue248DetailSpots = [...issue248Details.spots, ...issue250Details.spots, ...issue252Details.spots] as Issue181Spot[];

function buildCuratedStaticValues(spotIds: Set<string>): SpotDetailValue[] {
  return issue181DetailSpots.concat(issue205DetailSpots, issue248DetailSpots)
    .filter((spot) => spotIds.has(spot.spotId))
    .flatMap((spot) => {
      const sourcesById = new Map(spot.sources.map((source) => [source.id, source]));
      const splitSpot = issue194DetailSpots.find((candidate) => candidate.spotId === spot.spotId);
      const activeValues = spot.values.filter((value) => value.itemKey !== "water_flow_influences").concat(splitSpot?.values ?? []);
      const allSources = spot.sources.concat(splitSpot?.sources ?? []);
      const activeSourcesById = new Map(allSources.map((source) => [source.id, source]));
      return activeValues.map((value): SpotDetailValue => ({
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
        note: null,
        checkedAt: value.checkedAt,
        sources: (["supporting", "checked", "contradicting"] as SpotDetailSourceRelation[]).flatMap((relation) =>
          value.sources[relation].flatMap((sourceId) => {
            const source = activeSourcesById.get(sourceId) ?? sourcesById.get(sourceId);
            return source ? [{ source: { ...source, sourceUrl: null, note: null }, relation, note: null }] : [];
          }),
        ),
      }));
    });
}

export function buildStaticFishingSpotDetailsFromSpots(spots: FishingSpot[]): FishingSpotDetailSet {
  const curatedValues = buildCuratedStaticValues(new Set(spots.map((spot) => spot.id)));
  const existingKeys = new Set(curatedValues.map((value) => `${value.spotId}:${value.itemKey}`));
  const fallbackValues = spots.flatMap((spot) => [
    fallbackValue(`${spot.id}:target_species`, spot.id, "target_species", null, spot.targetSpecies),
    fallbackValue(`${spot.id}:recommended_methods`, spot.id, "recommended_methods", null, spot.recommendedMethods),
    fallbackValue(`${spot.id}:shore_access`, spot.id, "shore_access", spot.shoreAccess, []),
  ]).filter((value) => !existingKeys.has(`${value.spotId}:${value.itemKey}`));

  return { itemDefinitions: staticFishingSpotDetailItemDefinitions, values: curatedValues.concat(fallbackValues) };
}
