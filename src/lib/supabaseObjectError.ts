export function isMissingSupabaseObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  if (["PGRST202", "PGRST205", "42P01"].includes(String(candidate.code ?? ""))) return true;
  const message = [candidate.message, candidate.details, candidate.hint].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
  return /(schema cache|could not find (?:the )?(?:table|function)|relation .+ does not exist)/.test(message);
}
