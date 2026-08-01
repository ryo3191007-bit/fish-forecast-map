export function isMissingSupabaseObject(error: unknown, expectedObject: string | string[]): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const message = [candidate.message, candidate.details, candidate.hint].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
  const names = Array.isArray(expectedObject) ? expectedObject : [expectedObject];
  const namesExpectedByCaller = names.some((name) => message.includes(name.toLowerCase()));
  if (!namesExpectedByCaller) return false;
  return ["PGRST202", "PGRST205", "42P01"].includes(String(candidate.code ?? ""))
    || /(schema cache|could not find (?:the )?(?:table|function)|relation .+ does not exist)/.test(message);
}
