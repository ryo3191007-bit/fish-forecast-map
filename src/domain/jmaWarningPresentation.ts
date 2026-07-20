import type { JmaWarningDecision } from "@/domain/jmaWarning";

const UNKNOWN_REASON_LABELS: Record<string, string> = {
  "current-bulletin-unavailable": "現在の警報・注意報を確認できません。",
  "forecast-bulletin-unavailable": "選択時間の予報を確認できません。",
  "release-not-confirmed-after-blocked": "発表済み情報の解除を確認できません。",
  "bulletin-missing-or-stale": "最新の気象庁情報を確認できません。",
};

export function getJmaWarningPresentation(decision: JmaWarningDecision) {
  const heading = decision.state === "blocked"
    ? "気象庁の対象情報があります"
    : decision.state === "unknown"
      ? "気象庁情報を確認できません"
      : decision.state === "out-of-range"
        ? "気象庁の時系列判定対象外"
        : "対象時間帯にゲート対象情報は確認されていません";
  const unknownReason = decision.state === "unknown"
    ? UNKNOWN_REASON_LABELS[decision.reason] ?? "安全判定に必要な気象庁情報を確認できません。"
    : null;
  return { heading, unknownReason, lastSuccessfulFetchAt: decision.state === "unknown" ? decision.lastSuccessfulFetchAt : null };
}
