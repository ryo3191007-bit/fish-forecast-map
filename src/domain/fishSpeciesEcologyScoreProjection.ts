export const SCORE_V2_SPECIES_ID_MAP = {
  aji: null,
  maaji: "マアジ",
  maruaji: null,
  seabass: "スズキ",
  chinu: "チヌ",
} as const;

export type FishSpeciesEcologyId = keyof typeof SCORE_V2_SPECIES_ID_MAP;
export type EcologyScorePurpose =
  | "score_v2_water_temperature"
  | "score_v2_season_time"
  | "score_v2_spot_affinity"
  | "score_v2_method_affinity";
export type EcologyDecision = "adopt" | "adopt_with_warning" | "hold" | "reject";
export type EcologyConfidence = "high" | "medium" | "low" | "unknown";
export type EcologyClaim = {
  value: unknown;
  status: "confirmed" | "inferred" | "unknown" | "not_applicable";
  confidence: EcologyConfidence;
  regionScope?: string;
  evidenceSources: {
    supportingSourceIds: string[];
    checkedSourceIds: string[];
    contradictingSourceIds: string[];
  };
  note: string;
};

export type EcologyProjectionDocument = {
  speciesId: string;
  sources: { id: string; supports: string[]; regionScope: string }[];
  review: {
    attributeDecisions: {
      path: string;
      decision: EcologyDecision;
      purposes: string[];
      sourceIds: string[];
      confidence: EcologyConfidence;
      regionScope: string;
    }[];
    productionAdoption: { acceptedPaths: string[] };
  };
  [key: string]: unknown;
};

export type EcologyScoreProjection = {
  speciesId: FishSpeciesEcologyId;
  scoreSpecies: "マアジ" | "スズキ" | "チヌ";
  path: string;
  purpose: EcologyScorePurpose;
  value: unknown;
  decision: "adopt" | "adopt_with_warning";
  confidence: Exclude<EcologyConfidence, "unknown">;
  regionScope: string;
  sourceIds: string[];
};

const PURPOSE_PATHS: Record<EcologyScorePurpose, ReadonlySet<string>> = {
  score_v2_water_temperature: new Set(["/ecology/regionalCatchability/waterTemperature"]),
  score_v2_season_time: new Set(["/ecology/regionalCatchability/seasonality", "/ecology/regionalCatchability/dayNightTiming"]),
  score_v2_spot_affinity: new Set(["/ecology/regionalCatchability/substrateHabitat", "/ecology/regionalCatchability/salinityAndWaterBody"]),
  score_v2_method_affinity: new Set(["/ecology/regionalCatchability/fishingMethods"]),
};

const scorePurposes = new Set(Object.keys(PURPOSE_PATHS) as EcologyScorePurpose[]);

function valueAtPointer(document: EcologyProjectionDocument, pointer: string): unknown {
  if (!pointer.startsWith("/")) return undefined;
  return pointer.slice(1).split("/").reduce<unknown>((value, token) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[token.replaceAll("~1", "/").replaceAll("~0", "~")];
  }, document);
}

function isClaim(value: unknown): value is EcologyClaim {
  if (value === null || typeof value !== "object") return false;
  const claim = value as Partial<EcologyClaim>;
  const evidence = claim.evidenceSources;
  return "value" in claim
    && ["confirmed", "inferred", "unknown", "not_applicable"].includes(claim.status ?? "")
    && ["high", "medium", "low", "unknown"].includes(claim.confidence ?? "")
    && typeof claim.note === "string"
    && evidence !== undefined
    && Array.isArray(evidence.supportingSourceIds)
    && Array.isArray(evidence.checkedSourceIds)
    && Array.isArray(evidence.contradictingSourceIds);
}

/** Strict build-time projection. Invalid accepted data fails generation rather than becoming a fallback. */
export function projectEcologyForScore(document: EcologyProjectionDocument): EcologyScoreProjection[] {
  if (!(document.speciesId in SCORE_V2_SPECIES_ID_MAP)) throw new Error(`${document.speciesId}: unknown speciesId`);
  const speciesId = document.speciesId as FishSpeciesEcologyId;
  const scoreSpecies = SCORE_V2_SPECIES_ID_MAP[speciesId];
  const decisions = new Map(document.review.attributeDecisions.map((decision) => [decision.path, decision]));
  if (scoreSpecies === null) {
    const hasAcceptedScorePurpose = document.review.productionAdoption.acceptedPaths.some((path) =>
      decisions.get(path)?.purposes.some((purpose) => scorePurposes.has(purpose as EcologyScorePurpose)),
    );
    if (hasAcceptedScorePurpose) throw new Error(`${speciesId}: unsupported species has an accepted SCORE purpose`);
    return [];
  }
  const projections: EcologyScoreProjection[] = [];

  for (const path of document.review.productionAdoption.acceptedPaths) {
    const decision = decisions.get(path);
    if (!decision) throw new Error(`${speciesId}:${path}: accepted path has no decision`);
    const purposes = decision.purposes.filter((purpose): purpose is EcologyScorePurpose => scorePurposes.has(purpose as EcologyScorePurpose));
    if (purposes.length === 0) continue;
    if (decision.decision !== "adopt" && decision.decision !== "adopt_with_warning") continue;
    for (const purpose of purposes) if (!PURPOSE_PATHS[purpose].has(path)) throw new Error(`${speciesId}:${path}: path is not allowed for ${purpose}`);
    const claim = valueAtPointer(document, path);
    if (!isClaim(claim)) throw new Error(`${speciesId}:${path}: accepted SCORE path is not a claim`);
    if (claim.value === undefined || claim.value === null || claim.status === "unknown" || claim.status === "not_applicable") {
      throw new Error(`${speciesId}:${path}: accepted SCORE path has no usable value`);
    }
    if (claim.confidence === "unknown" || decision.confidence === "unknown") throw new Error(`${speciesId}:${path}: SCORE input requires known confidence`);
    if (!claim.regionScope || !decision.regionScope || decision.sourceIds.length === 0) throw new Error(`${speciesId}:${path}: SCORE input requires region and source`);
    if (decision.confidence !== claim.confidence) throw new Error(`${speciesId}:${path}: decision confidence must match claim confidence`);
    if (decision.regionScope !== claim.regionScope) throw new Error(`${speciesId}:${path}: decision regionScope must match claim regionScope`);
    for (const purpose of purposes) {
      for (const sourceId of decision.sourceIds) {
        const source = document.sources.find(({ id }) => id === sourceId);
        if (!claim.evidenceSources.supportingSourceIds.includes(sourceId)) throw new Error(`${speciesId}:${path}: source ${sourceId} is not supporting claim evidence`);
        if (!source || !source.supports.includes(path) || !source.regionScope) throw new Error(`${speciesId}:${path}: invalid source ${sourceId}`);
      }
      projections.push({ speciesId, scoreSpecies, path, purpose, value: claim.value, decision: decision.decision, confidence: decision.confidence, regionScope: decision.regionScope, sourceIds: [...decision.sourceIds] });
    }
  }
  return projections;
}
