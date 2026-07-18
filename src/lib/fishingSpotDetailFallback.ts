import type { FishingSpotDetailSet, SpotDetailItemDefinition, SpotDetailValue } from "@/domain/fishingSpotDetail";
import type { FishingSpot } from "@/domain/fishingSpot";

export const staticFishingSpotDetailItemDefinitions: SpotDetailItemDefinition[] = [
  { itemKey: "target_species", category: "basic", valueKind: "text_list", labelJa: "対象魚種", description: "既存釣り場マスターの対象魚種。", displayOrder: 10 },
  { itemKey: "recommended_methods", category: "basic", valueKind: "text_list", labelJa: "推奨釣法", description: "既存釣り場マスターの推奨釣法。", displayOrder: 20 },
  { itemKey: "shore_access", category: "access", valueKind: "status", labelJa: "足場", description: "既存釣り場マスターの足場情報。", displayOrder: 30 },
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

export function buildStaticFishingSpotDetailsFromSpots(spots: FishingSpot[]): FishingSpotDetailSet {
  return {
    itemDefinitions: staticFishingSpotDetailItemDefinitions,
    values: spots.flatMap((spot) => [
      fallbackValue(`${spot.id}:target_species`, spot.id, "target_species", null, spot.targetSpecies),
      fallbackValue(`${spot.id}:recommended_methods`, spot.id, "recommended_methods", null, spot.recommendedMethods),
      fallbackValue(`${spot.id}:shore_access`, spot.id, "shore_access", spot.shoreAccess, []),
    ]),
  };
}
