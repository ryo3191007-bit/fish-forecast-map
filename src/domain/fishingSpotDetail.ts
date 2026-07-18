export type SpotDetailCategory = "basic" | "facility" | "access" | "restriction" | "terrain" | "hydrology" | "safety";
export type SpotDetailValueKind = "text" | "text_list" | "boolean" | "number" | "status" | "enum" | "json";
export type SpotDetailInformationState = "has_evidence" | "weak_evidence" | "researched_unknown" | "unresearched" | "rejected";
export type SpotDetailConfidence = "high" | "medium" | "low";
export type SpotDetailContributionOrigin = "curated_research" | "user_contribution";
export type SpotDetailModerationStatus = "not_required" | "pending" | "approved" | "rejected";
export type SpotDetailReviewStatus = "pending_review" | "reviewed" | "needs_recheck";
export type SpotDetailAdoptionStatus = "adopted" | "candidate" | "not_adopted";
export type SpotDetailSourceType = "official" | "shop" | "portal" | "map" | "field_research" | "user_report" | "other";
export type SpotDetailSourceRelation = "supporting" | "checked" | "contradicting";

export type SpotDetailItemDefinition = {
  itemKey: string;
  category: SpotDetailCategory;
  valueKind: SpotDetailValueKind;
  labelJa: string;
  description?: string;
  displayOrder: number;
};

export type SpotDetailSource = {
  id: string;
  sourceType: SpotDetailSourceType;
  sourceName: string;
  sourceUrl: string | null;
  checkedOn: string | null;
  note: string | null;
};

export type SpotDetailValueSource = {
  source: SpotDetailSource;
  relation: SpotDetailSourceRelation;
  note: string | null;
};

export type SpotDetailValue = {
  id: string;
  spotId: string;
  itemKey: string;
  informationState: SpotDetailInformationState;
  valueText: string | null;
  valueTextList: string[];
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueJson: unknown | null;
  unit: string | null;
  confidence: SpotDetailConfidence | null;
  contributionOrigin: SpotDetailContributionOrigin;
  contributorId: string | null;
  submittedAt: string | null;
  moderationStatus: SpotDetailModerationStatus;
  reviewStatus: SpotDetailReviewStatus;
  adoptionStatus: SpotDetailAdoptionStatus;
  note: string | null;
  checkedAt: string | null;
  sources: SpotDetailValueSource[];
};

export type FishingSpotDetailSet = {
  itemDefinitions: SpotDetailItemDefinition[];
  values: SpotDetailValue[];
};
