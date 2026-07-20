import type { JmaWarningDecision } from "@/domain/jmaWarning";

export async function fetchJmaWarningDecision(spotId: string, selected: string, signal?: AbortSignal): Promise<JmaWarningDecision> {
  const response = await fetch(`/api/jma-warnings?spotId=${encodeURIComponent(spotId)}&selected=${encodeURIComponent(selected)}`, { signal });
  if (!response.ok) throw new Error(`JMA warning request failed: ${response.status}`);
  return response.json() as Promise<JmaWarningDecision>;
}
