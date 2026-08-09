export const recordVisibilities = ["private", "public"] as const;
export type RecordVisibility = (typeof recordVisibilities)[number];

export const recordVisibilityLabel: Record<RecordVisibility, string> = {
  private: "自分のみ",
  public: "公開",
};

export function normalizeRecordVisibility(value: unknown): RecordVisibility {
  return value === "public" ? "public" : "private";
}
