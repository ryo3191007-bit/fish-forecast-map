import type {
  FishingSpotDetailSet,
  SpotDetailConfidence,
  SpotDetailValue,
} from "@/domain/fishingSpotDetail";
import {
  findDisplayableSpotDetail,
  formatSpotDetailValue,
  formatTerrainDetailForPresentation,
} from "@/domain/spotEvaluationPresentation";

export const fishingDetailItems = [
  ["target_species", "対象魚種"],
  ["recommended_methods", "推奨釣法"],
  ["shore_access", "足場"],
  ["toilet", "トイレ"],
  ["lighting", "常夜灯・照明"],
  ["parking", "駐車場"],
  ["access", "アクセス情報"],
  ["fishable_area", "釣り可能範囲"],
  ["restriction_status", "釣り禁止・立入禁止・工事・閉鎖等"],
] as const;

export const terrainDetailItems = [
  ["depth", "水深"],
  ["bottom_material", "底質"],
  ["coastal_topography", "海底・沿岸地形"],
  ["obstacles", "テトラ・根・障害物"],
  ["spot_features", "釣り場の構造・足場"],
  ["tidal_flow", "潮通し"],
  ["river_influence", "河川影響"],
  ["open_sea_bay_character", "外海・湾内特性"],
] as const;

export type SpotDetailUiPresentation = {
  text: string;
  confidence: SpotDetailConfidence | null;
  state: "displayable" | "uncertain" | "not_applicable";
};

const NOT_APPLICABLE_VALUES = new Set(["not_applicable", "該当なし"]);

function rawDisplayValues(item: SpotDetailValue): string[] {
  if (item.valueTextList.length > 0) return item.valueTextList;
  return item.valueText ? [item.valueText] : [];
}

function isExplicitNotApplicable(item: SpotDetailValue) {
  const values = rawDisplayValues(item).map((value) => value.trim());
  return values.length === 1 && NOT_APPLICABLE_VALUES.has(values[0]);
}

function uncertain(): SpotDetailUiPresentation {
  return { text: "未確定", confidence: null, state: "uncertain" };
}

/**
 * Resolve one common spot-detail row for the ordinary UI without mutating the
 * underlying research state. Missing, unresearched and researched-unknown
 * values collapse to "未確定". weak_evidence / low remains visible with its
 * low-confidence badge, matching the existing UI policy.
 *
 * The species tab keeps field observations on target_species, but its research
 * presentation uses historical_target_species so historical catches never become
 * direct SCORE v2 target-species evidence.
 */
export function resolveSpotDetailUiPresentation(
  details: FishingSpotDetailSet | null,
  itemKey: string,
): SpotDetailUiPresentation {
  const presentationKey = itemKey === "target_species" ? "historical_target_species" : itemKey;
  const item = findDisplayableSpotDetail(details, presentationKey);
  if (
    !item ||
    item.informationState === "unresearched" ||
    item.informationState === "researched_unknown"
  ) {
    return uncertain();
  }

  if (isExplicitNotApplicable(item)) {
    return {
      text: "該当なし",
      confidence: item.confidence,
      state: "not_applicable",
    };
  }

  if (presentationKey === "coastal_topography" || presentationKey === "spot_features") {
    const terrainPresentation = formatTerrainDetailForPresentation(details, presentationKey);
    return terrainPresentation
      ? {
          text: terrainPresentation.text,
          confidence: terrainPresentation.confidence,
          state: "displayable",
        }
      : uncertain();
  }

  return {
    text: formatSpotDetailValue(item),
    confidence: item.confidence,
    state: "displayable",
  };
}
