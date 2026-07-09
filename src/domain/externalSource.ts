export type ExternalSourceType = "shop" | "portal" | "tide" | "sns_like" | "other";

export type CrawlPolicy = "allowed" | "manualOnly" | "referenceOnly" | "unknown";
export type RobotsStatus = "unchecked" | "allowed" | "disallowed" | "partial" | "unknown";
export type TermsStatus = "unchecked" | "allowed" | "restricted" | "unknown";

export type ExternalSource = {
  sourceId: string;
  sourceName: string;
  sourceType: ExternalSourceType;
  targetAreaNames: string[];
  baseUrl: string;
  crawlPolicy: CrawlPolicy;
  robotsStatus: RobotsStatus;
  termsStatus: TermsStatus;
  notes: string[];
  reviewedAt?: string;
  reviewUrls?: string[];
  reviewSummary?: string;
};
