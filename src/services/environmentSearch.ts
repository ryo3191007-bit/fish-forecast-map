import type { FishingSpot } from "@/domain/fishingSpot";
import { toEnvironmentPoint } from "@/domain/fishingSpotPresentation";
import { evaluateEnvironmentSearch, failedEnvironmentSearchResult, type EnvironmentSearchCriteria, type EnvironmentSearchResult } from "@/domain/environmentSearch";
import { fetchFishingEnvironment, readCachedFishingEnvironment } from "./openMeteo";

const SEARCH_CONCURRENCY = 4;

export async function searchFishingSpotEnvironments(
  spots: FishingSpot[],
  criteria: EnvironmentSearchCriteria,
  signal?: AbortSignal,
): Promise<EnvironmentSearchResult[]> {
  const results = new Array<EnvironmentSearchResult>(spots.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < spots.length) {
      if (signal?.aborted) throw new DOMException("Environment search aborted.", "AbortError");
      const index = nextIndex++;
      const spot = spots[index];
      try {
        const point = toEnvironmentPoint(spot);
        const cached = readCachedFishingEnvironment(point);
        const environment = cached?.cacheStatus === "cache-fresh" ? cached : await fetchFishingEnvironment(point, signal);
        results[index] = evaluateEnvironmentSearch(environment, criteria);
      } catch (error) {
        if (signal?.aborted) throw error;
        results[index] = failedEnvironmentSearchResult(spot.id, spot.name, criteria.forecastTime);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(SEARCH_CONCURRENCY, spots.length) }, worker));
  return results;
}
