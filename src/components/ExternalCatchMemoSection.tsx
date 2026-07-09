"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { externalSources } from "@/data/externalSources";
import { fishingSpots } from "@/data/fishingSpots";
import { fishSpeciesNames, type FishSpeciesName, type FishingMethod } from "@/domain/fishing";
import type { ExternalCatchConfidence, ExternalCatchRecord } from "@/domain/externalCatch";

const STORAGE_KEY = "fish-forecast-map.external-catch-memos";
const confidenceOptions: { value: ExternalCatchConfidence; label: string }[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];
const methodOptions: FishingMethod[] = ["ジギング", "キャスティング", "コマセ", "泳がせ", "サビキ", "エギング", "その他"];

type ExternalCatchMemo = ExternalCatchRecord & { userMemo?: string };
type FormState = {
  sourceUrl: string;
  sourceId: string;
  species: FishSpeciesName | "";
  caughtDate: string;
  areaName: string;
  estimatedSpotName: string;
  method: FishingMethod | "";
  catchCount: string;
  sizeCm: string;
  confidence: ExternalCatchConfidence;
  spotId: string;
  userMemo: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  sourceUrl: "",
  sourceId: "",
  species: "",
  caughtDate: "",
  areaName: "",
  estimatedSpotName: "",
  method: "",
  catchCount: "",
  sizeCm: "",
  confidence: "medium",
  spotId: "",
  userMemo: "",
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isMemo(value: unknown): value is ExternalCatchMemo {
  if (!value || typeof value !== "object") return false;
  const memo = value as Partial<ExternalCatchMemo>;
  return Boolean(
    typeof memo.id === "string" &&
      typeof memo.sourceUrl === "string" &&
      typeof memo.sourceId === "string" &&
      typeof memo.sourceName === "string" &&
      typeof memo.species === "string" &&
      typeof memo.caughtDate === "string" &&
      typeof memo.areaName === "string" &&
      memo.acquisitionMethod === "manual" &&
      typeof memo.createdAt === "string" &&
      typeof memo.updatedAt === "string",
  );
}

function loadMemos(): ExternalCatchMemo[] {
  if (!isBrowser()) return [];
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return [];
    const parsedValue: unknown = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue.filter(isMemo) : [];
  } catch {
    return [];
  }
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.sourceUrl.trim()) errors.sourceUrl = "情報元URLは必須です。";
  else {
    try { new URL(form.sourceUrl.trim()); } catch { errors.sourceUrl = "URL形式で入力してください。"; }
  }
  if (!form.sourceId) errors.sourceId = "情報元を選択してください。";
  if (!form.species) errors.species = "魚種を選択してください。";
  if (!form.caughtDate) errors.caughtDate = "釣果日を入力してください。";
  if (!form.areaName.trim()) errors.areaName = "エリアを入力してください。";
  if (form.catchCount !== "" && (!Number.isFinite(Number(form.catchCount)) || Number(form.catchCount) < 0)) errors.catchCount = "0以上の数値を入力してください。";
  if (form.sizeCm !== "" && (!Number.isFinite(Number(form.sizeCm)) || Number(form.sizeCm) < 0)) errors.sizeCm = "0以上の数値を入力してください。";
  return errors;
}

function toOptionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

function createMemo(form: FormState, editingMemo?: ExternalCatchMemo): ExternalCatchMemo {
  const source = externalSources.find((item) => item.sourceId === form.sourceId);
  const now = new Date().toISOString();
  return {
    id: editingMemo?.id ?? `external-memo-${Date.now()}`,
    species: form.species,
    caughtDate: form.caughtDate,
    areaName: form.areaName.trim(),
    estimatedSpotName: form.estimatedSpotName.trim() || undefined,
    spotId: form.spotId || undefined,
    coordinatePrecision: "unknown",
    method: form.method || undefined,
    catchCount: toOptionalNumber(form.catchCount),
    sizeCm: toOptionalNumber(form.sizeCm),
    sourceId: source?.sourceId ?? form.sourceId,
    sourceName: source?.sourceName ?? "未設定",
    sourceUrl: form.sourceUrl.trim(),
    acquisitionMethod: "manual",
    confidence: form.confidence,
    userMemo: form.userMemo.trim() || undefined,
    createdAt: editingMemo?.createdAt ?? now,
    updatedAt: now,
  };
}

export function ExternalCatchMemoSection() {
  const [memos, setMemos] = useState<ExternalCatchMemo[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const editingMemo = useMemo(() => memos.find((memo) => memo.id === editingId), [editingId, memos]);

  useEffect(() => setMemos(loadMemos()), []);

  const saveMemos = (nextMemos: ExternalCatchMemo[]) => {
    try {
      if (!isBrowser()) return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMemos));
      setMemos(nextMemos);
      setStorageError(null);
    } catch {
      setStorageError("外部釣果メモを保存できませんでした。ブラウザの保存容量や設定を確認してください。");
    }
  };

  const updateForm = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const resetForm = () => { setForm(initialFormState); setErrors({}); setEditingId(null); };

  const submitMemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const nextMemo = createMemo(form, editingMemo);
    const nextMemos = editingId ? memos.map((memo) => (memo.id === editingId ? nextMemo : memo)) : [nextMemo, ...memos];
    saveMemos(nextMemos);
    resetForm();
  };

  const startEdit = (memo: ExternalCatchMemo) => {
    setEditingId(memo.id);
    setForm({
      sourceUrl: memo.sourceUrl,
      sourceId: memo.sourceId,
      species: fishSpeciesNames.includes(memo.species as FishSpeciesName) ? memo.species as FishSpeciesName : "",
      caughtDate: memo.caughtDate,
      areaName: memo.areaName,
      estimatedSpotName: memo.estimatedSpotName ?? "",
      method: (memo.method as FishingMethod) ?? "",
      catchCount: memo.catchCount?.toString() ?? "",
      sizeCm: memo.sizeCm?.toString() ?? "",
      confidence: memo.confidence,
      spotId: memo.spotId ?? "",
      userMemo: memo.userMemo ?? "",
    });
  };

  const deleteMemo = (memoId: string) => {
    saveMemos(memos.filter((memo) => memo.id !== memoId));
    if (editingId === memoId) resetForm();
  };

  return (
    <section className="externalMemoSection" id="external-memos" aria-labelledby="external-memos-heading">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Manual external sources</p>
          <h2 id="external-memos-heading">外部釣果メモ</h2>
        </div>
        <p className="muted">URL先は自動取得せず、ユーザーが確認した事実情報と出典だけをlocalStorageに保存します。</p>
      </div>
      {storageError ? <p className="externalMemoError" role="alert">{storageError}</p> : null}
      <form className="externalMemoForm" onSubmit={submitMemo} noValidate>
        <label>情報元URL*<input value={form.sourceUrl} onChange={(e) => updateForm("sourceUrl", e.target.value)} placeholder="https://example.com/report" /></label>
        {errors.sourceUrl ? <p className="fieldError">{errors.sourceUrl}</p> : null}
        <label>情報元*<select value={form.sourceId} onChange={(e) => updateForm("sourceId", e.target.value)}><option value="">選択してください</option>{externalSources.map((source) => <option key={source.sourceId} value={source.sourceId}>{source.sourceName}</option>)}</select></label>
        {errors.sourceId ? <p className="fieldError">{errors.sourceId}</p> : null}
        <div className="externalMemoGrid">
          <label>魚種*<select value={form.species} onChange={(e) => updateForm("species", e.target.value)}><option value="">選択してください</option>{fishSpeciesNames.map((species) => <option key={species} value={species}>{species}</option>)}</select></label>
          <label>釣果日*<input type="date" value={form.caughtDate} onChange={(e) => updateForm("caughtDate", e.target.value)} /></label>
          <label>エリア*<input value={form.areaName} onChange={(e) => updateForm("areaName", e.target.value)} placeholder="例: 唐津湾" /></label>
          <label>推定地点名<input value={form.estimatedSpotName} onChange={(e) => updateForm("estimatedSpotName", e.target.value)} placeholder="例: 呼子周辺" /></label>
          <label>釣り方<select value={form.method} onChange={(e) => updateForm("method", e.target.value)}><option value="">未選択</option>{methodOptions.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
          <label>信頼度<select value={form.confidence} onChange={(e) => updateForm("confidence", e.target.value)}>{confidenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>匹数<input type="number" min="0" value={form.catchCount} onChange={(e) => updateForm("catchCount", e.target.value)} /></label>
          <label>サイズcm<input type="number" min="0" value={form.sizeCm} onChange={(e) => updateForm("sizeCm", e.target.value)} /></label>
          <label className="externalMemoWide">釣り場マスター紐づけ<select value={form.spotId} onChange={(e) => updateForm("spotId", e.target.value)}><option value="">紐づけなし</option>{fishingSpots.map((spot) => <option key={spot.id} value={spot.id}>{spot.name} / {spot.areaName}</option>)}</select></label>
          <label className="externalMemoWide">ユーザーメモ<textarea value={form.userMemo} onChange={(e) => updateForm("userMemo", e.target.value)} maxLength={240} placeholder="本文やコメント全文ではなく、自分用の短いメモだけを保存" /></label>
        </div>
        {errors.species || errors.caughtDate || errors.areaName || errors.catchCount || errors.sizeCm ? <p className="fieldError">{errors.species ?? errors.caughtDate ?? errors.areaName ?? errors.catchCount ?? errors.sizeCm}</p> : null}
        <div className="externalMemoActions"><button className="button" type="submit">{editingId ? "更新する" : "登録する"}</button>{editingId ? <button type="button" className="clearSearchButton" onClick={resetForm}>編集をキャンセル</button> : null}</div>
      </form>
      <div className="externalMemoList" aria-live="polite">
        {memos.length === 0 ? <p className="emptyState">登録済みの外部釣果メモはありません。</p> : memos.map((memo) => {
          const linkedSpot = memo.spotId ? fishingSpots.find((spot) => spot.id === memo.spotId) : undefined;
          return <article className="card" key={memo.id}><div className="cardHeader"><div><p className="eyebrow">{memo.sourceName}</p><h3>{memo.species} / {memo.areaName}</h3></div></div><div className="cardSummary"><span>釣果日: {memo.caughtDate}</span><span>推定地点: {memo.estimatedSpotName ?? "未入力"}</span><span>信頼度: {memo.confidence}</span><span>釣り場: {linkedSpot ? linkedSpot.name : "未紐づけ"}</span></div><dl className="facts"><div><dt>釣り方</dt><dd>{memo.method ?? "未入力"}</dd></div><div><dt>匹数</dt><dd>{memo.catchCount ?? "未入力"}</dd></div><div><dt>サイズ</dt><dd>{memo.sizeCm === undefined ? "未入力" : `${memo.sizeCm}cm`}</dd></div><div><dt>更新日時</dt><dd>{new Date(memo.updatedAt).toLocaleString("ja-JP")}</dd></div><div className="sourceFact"><dt>出典URL</dt><dd><a href={memo.sourceUrl} target="_blank" rel="noreferrer">別タブで開く</a></dd></div></dl>{memo.userMemo ? <p className="externalMemoNote">{memo.userMemo}</p> : null}<div className="externalMemoActions"><button type="button" className="clearSearchButton" onClick={() => startEdit(memo)}>編集</button><button type="button" className="clearSearchButton" onClick={() => deleteMemo(memo.id)}>削除</button></div></article>;
        })}
      </div>
    </section>
  );
}
