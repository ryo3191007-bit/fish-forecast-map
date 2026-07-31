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
    const catchItemSpecies = Array.isArray(catchRecord.catchItems)
      ? catchRecord.catchItems.map((item) => String(item.species).trim()).filter((name) => speciesKey(name))
      : [];
    const displayNames = catchItemSpecies.length > 0
      ? catchItemSpecies
      : [String(catchRecord.species).trim()];

    for (const displayName of displayNames) {
      const key = speciesKey(displayName);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      species.push(displayName);
    }
  }

  return species;
}
