export type SpotFieldObservationInformationState = "weak_evidence" | "researched_unknown";

export type SpotFieldObservation = {
  id: string;
  spotId: string;
  itemKey: string;
  informationState: SpotFieldObservationInformationState;
  valueText: string | null;
  valueTextList: string[];
  valueNumber: number | null;
  unit: string | null;
  checkedAt: string;
  note: string | null;
  updatedAt: string;
};

export type SpotFieldObservationInputKind = "single" | "multi" | "text" | "number";

export type SpotFieldObservationConfig = {
  kind: SpotFieldObservationInputKind;
  options?: readonly string[];
  unit?: string;
  placeholder?: string;
  maxLength?: number;
  safetyNotice?: string;
};

export type SpotFieldObservationDraft = {
  checkedAt: string;
  note: string;
  isUnknown: boolean;
  textValue: string;
  listValue: string[];
  numberValue: string;
};

export type SaveSpotFieldObservationInput = {
  spotId: string;
  itemKey: string;
  informationState: SpotFieldObservationInformationState;
  valueText: string | null;
  valueTextList: string[];
  valueNumber: number | null;
  unit: string | null;
  checkedAt: string;
  note: string | null;
};

export type SpotFieldReportTargetType = "master" | "user";

export type SpotFieldReport = {
  id: string;
  spotId: string;
  targetType: SpotFieldReportTargetType;
  observedOn: string;
  summaryNote: string | null;
  origin: "user" | "initial_details" | "snapshot_backfill";
  createdAt: string;
  values: SpotFieldObservation[];
};

export const spotFieldObservationConfigs: Readonly<Record<string, SpotFieldObservationConfig>> = {
  target_species: { kind: "multi" },
  shore_access: {
    kind: "single",
    options: ["安定した足場を確認", "足場が不安定", "足場が滑りやすい"],
  },
  toilet: { kind: "single", options: ["あり", "なし"] },
  lighting: { kind: "single", options: ["あり", "なし"] },
  parking: {
    kind: "single",
    options: ["駐車スペースを確認", "駐車スペースを確認できず"],
    safetyNotice: "駐車スペースの存在のみを記録します。利用許可や駐車可否を確定する情報ではありません。",
  },
  access: {
    kind: "text",
    placeholder: "現地で確認した経路や目印を入力",
    maxLength: 300,
  },
  fishable_area: {
    kind: "multi",
    options: ["釣り人の利用を確認", "柵・封鎖を確認"],
    safetyNotice: "現地で見た事実だけを記録します。釣り可能・立入可能・安全であることの確定には使いません。",
  },
  restriction_status: {
    kind: "multi",
    options: ["立入禁止看板", "釣り禁止看板", "工事", "通行止め", "柵・封鎖", "その他の規制・注意表示"],
    safetyNotice: "危険側・規制側の確認情報のみ登録できます。既存の警告や安全情報は解除されません。",
  },
  depth: { kind: "number", unit: "m" },
  bottom_material: { kind: "multi", options: ["砂", "砂泥", "泥", "岩", "藻場", "その他"] },
  coastal_topography: { kind: "multi", options: ["砂浜", "磯", "河口", "湾奥", "かけ上がり", "浅場", "深場", "その他"] },
  obstacles: { kind: "multi", options: ["テトラ", "根", "岩礁", "構造物", "その他"] },
  spot_features: { kind: "multi", options: ["堤防", "岸壁", "護岸", "テトラ", "磯", "砂浜", "その他"] },
  tidal_flow: { kind: "single", options: ["強い", "普通", "弱い"] },
  river_influence: { kind: "single", options: ["影響あり", "影響が弱い", "見当たらない"] },
  open_sea_bay_character: { kind: "single", options: ["外海", "湾口", "湾内", "内湾"] },
};

export function formatSpotFieldObservationDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${Number(match[1])}/${Number(match[2])}/${Number(match[3])}`;
}

export function getTodayInJapan(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatSpotFieldObservationValue(observation: SpotFieldObservation): string {
  if (observation.informationState === "researched_unknown") return "確認できず";
  if (observation.valueTextList.length > 0) return observation.valueTextList.join("、");
  if (observation.valueNumber !== null) return `${observation.valueNumber}${observation.unit ?? ""}`;
  return observation.valueText?.trim() || "確認できず";
}

export function createSpotFieldObservationDraft(observation?: SpotFieldObservation | null): SpotFieldObservationDraft {
  return {
    checkedAt: observation?.checkedAt ?? getTodayInJapan(),
    note: observation?.note ?? "",
    isUnknown: observation?.informationState === "researched_unknown",
    textValue: observation?.valueText ?? "",
    listValue: observation?.valueTextList ?? [],
    numberValue: observation?.valueNumber === null || observation?.valueNumber === undefined ? "" : String(observation.valueNumber),
  };
}

export function buildSaveSpotFieldObservationInput(
  spotId: string,
  itemKey: string,
  config: SpotFieldObservationConfig,
  draft: SpotFieldObservationDraft,
): SaveSpotFieldObservationInput | null {
  if (!spotId || !draft.checkedAt) return null;
  const note = draft.note.trim() || null;
  if (draft.isUnknown) {
    return {
      spotId,
      itemKey,
      informationState: "researched_unknown",
      valueText: null,
      valueTextList: [],
      valueNumber: null,
      unit: null,
      checkedAt: draft.checkedAt,
      note,
    };
  }

  if (config.kind === "single" || config.kind === "text") {
    const valueText = draft.textValue.trim();
    if (!valueText) return null;
    return { spotId, itemKey, informationState: "weak_evidence", valueText, valueTextList: [], valueNumber: null, unit: null, checkedAt: draft.checkedAt, note };
  }
  if (config.kind === "multi") {
    const valueTextList = [...new Set(draft.listValue.map((value) => value.trim()).filter(Boolean))];
    if (valueTextList.length === 0) return null;
    return { spotId, itemKey, informationState: "weak_evidence", valueText: null, valueTextList, valueNumber: null, unit: null, checkedAt: draft.checkedAt, note };
  }

  if (!draft.numberValue.trim()) return null;
  const valueNumber = Number(draft.numberValue);
  if (!Number.isFinite(valueNumber) || valueNumber < 0) return null;
  return { spotId, itemKey, informationState: "weak_evidence", valueText: null, valueTextList: [], valueNumber, unit: config.unit ?? null, checkedAt: draft.checkedAt, note };
}
