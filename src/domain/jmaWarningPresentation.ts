import type { JmaWarningDecision } from "@/domain/jmaWarning";

export type JmaWarningDisplay =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "unknown"; message: "安全情報を取得できませんでした。総合点は表示しません。" }
  | { kind: "blocked"; heading: "気象庁の対象情報があります" };

/** Maps a safety decision to UI only; it must never be used to calculate scores. */
export function getJmaWarningDisplay(decision: JmaWarningDecision | null): JmaWarningDisplay {
  if (!decision) return { kind: "loading" };
  switch (decision.state) {
    case "blocked":
      return { kind: "blocked", heading: "気象庁の対象情報があります" };
    case "unknown":
      return { kind: "unknown", message: "安全情報を取得できませんでした。総合点は表示しません。" };
    case "clear":
    case "out-of-range":
      return { kind: "hidden" };
    default:
      return { kind: "unknown", message: "安全情報を取得できませんでした。総合点は表示しません。" };
  }
}
