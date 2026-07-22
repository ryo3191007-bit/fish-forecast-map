import type { JmaWarningDecision } from "@/domain/jmaWarning";

export type JmaWarningDisplay =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "unknown"; message: "安全情報を取得できませんでした" }
  | { kind: "blocked"; heading: "気象庁の対象情報があります" };

/** Maps a safety decision to UI only; it must never be used to calculate scores. */
export function getJmaWarningDisplay(decision: JmaWarningDecision | null): JmaWarningDisplay {
  if (!decision) return { kind: "loading" };
  if (decision.state === "blocked") return { kind: "blocked", heading: "気象庁の対象情報があります" };
  if (decision.state === "unknown") return { kind: "unknown", message: "安全情報を取得できませんでした" };
  return { kind: "hidden" };
}
