import type { ExternalCatchRecord } from "@/domain/externalCatch";

function speciesKey(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function getRegisteredCatchSpeciesForSpot(
  catches: readonly ExternalCatchRecord[],
  spotId: string,
): string[] {
  const seen = new Set<string>();
  const species: string[] = [];

  for (const catchRecord of catches) {
    if (catchRecord.acquisitionMethod !== "manual" || catchRecord.spotId !== spotId) continue;
    const displayName = String(catchRecord.species).trim();
    const key = speciesKey(displayName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    species.push(displayName);
  }

  return species;
}
