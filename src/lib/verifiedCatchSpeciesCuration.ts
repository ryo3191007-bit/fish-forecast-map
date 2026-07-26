import issue325VerifiedCatchSpecies from "../../data/curation/fishing-spots/issue-325-verified-catch-species.json";
import type { SpotDetailSource, SpotDetailValue } from "@/domain/fishingSpotDetail";

type VerifiedCatchSpeciesSpot = {
  spotId: string;
  species: string[] | null;
  note?: string;
};

const source = issue325VerifiedCatchSpecies.source as SpotDetailSource;
const spots = issue325VerifiedCatchSpecies.spots as VerifiedCatchSpeciesSpot[];

export function buildVerifiedCatchSpeciesValues(spotIds: Set<string>): SpotDetailValue[] {
  return spots
    .filter((spot) => spotIds.has(spot.spotId))
    .map((spot): SpotDetailValue => {
      const hasSpecies = Array.isArray(spot.species) && spot.species.length > 0;
      return {
        id: `${spot.spotId}:historical_target_species:issue325`,
        spotId: spot.spotId,
        itemKey: "historical_target_species",
        informationState: hasSpecies ? "weak_evidence" : "researched_unknown",
        valueText: null,
        valueTextList: spot.species ?? [],
        valueNumber: null,
        valueBoolean: null,
        valueJson: null,
        unit: null,
        confidence: hasSpecies ? "low" : null,
        contributionOrigin: "curated_research",
        contributorId: null,
        submittedAt: null,
        moderationStatus: "not_required",
        reviewStatus: "reviewed",
        adoptionStatus: "adopted",
        note: null,
        checkedAt: source.checkedOn,
        sources: [{
          source: { ...source, sourceUrl: null, note: null },
          relation: hasSpecies ? "supporting" : "checked",
          note: null,
        }],
      };
    });
}
