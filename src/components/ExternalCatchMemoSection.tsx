"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ExternalCatchMemoMigrationResult, ExternalCatchMemoStorageStatus } from "@/hooks/useExternalCatchMemos";
import type { ExternalSource } from "@/domain/externalSource";
import type { FishingSpot } from "@/domain/fishingSpot";
import { fishSpeciesNames, type FishSpeciesName, type FishingMethod } from "@/domain/fishing";
import type { ExternalCatchConfidence } from "@/domain/externalCatch";
import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";

const confidenceOptions: { value: ExternalCatchConfidence; label: string }[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];
const methodOptions: FishingMethod[] = ["ジギング", "キャスティング", "コマセ", "泳がせ", "サビキ", "エギング", "その他"];

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

function createMemo(form: FormState, sources: ExternalSource[], editingMemo?: ExternalCatchMemo): ExternalCatchMemo {
  const source = sources.find((item) => item.sourceId === form.sourceId);
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

type ExternalCatchMemoSectionProps = {
  memos: ExternalCatchMemo[];
  onMemoSave: (memo: ExternalCatchMemo) => Promise<boolean>;
  onMemoDelete: (memoId: string) => Promise<boolean>;
  onLocalMemoMigrate: (memoIds: string[]) => Promise<ExternalCatchMemoMigrationResult>;
  localMemoIds: Set<string>;
  storageError: string | null;
  storageStatus: ExternalCatchMemoStorageStatus;
  sources: ExternalSource[];
  spots: FishingSpot[];
};

export function ExternalCatchMemoSection({ memos, onMemoSave, onMemoDelete, onLocalMemoMigrate, localMemoIds, storageError, storageStatus, sources, spots }: ExternalCatchMemoSectionProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const editingMemo = useMemo(() => memos.find((memo) => memo.id === editingId), [editingId, memos]);
  const migrationCandidates = useMemo(() => memos.filter((memo) => localMemoIds.has(memo.id) && memo.acquisitionMethod === "manual"), [localMemoIds, memos]);
  const [selectedMigrationIds, setSelectedMigrationIds] = useState<Set<string>>(() => new Set());
  const [migrationResult, setMigrationResult] = useState<ExternalCatchMemoMigrationResult | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsModalOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    setSelectedMigrationIds((current) => new Set([...current].filter((id) => migrationCandidates.some((memo) => memo.id === id))));
  }, [migrationCandidates]);

  const updateForm = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const resetForm = () => { setForm(initialFormState); setErrors({}); setEditingId(null); };

  const submitMemo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (storageStatus.isMutating) return;
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const nextMemo = createMemo(form, sources, editingMemo);
    if (await onMemoSave(nextMemo)) resetForm();
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

  const deleteMemo = async (memoId: string) => {
    if (storageStatus.isMutating) return;
    if (await onMemoDelete(memoId) && editingId === memoId) resetForm();
  };

  const toggleMigrationCandidate = (memoId: string) => {
    setSelectedMigrationIds((current) => {
      const nextIds = new Set(current);
      if (nextIds.has(memoId)) nextIds.delete(memoId);
      else nextIds.add(memoId);
      return nextIds;
    });
  };

  const migrateSelectedMemos = async () => {
    if (storageStatus.isMutating || selectedMigrationIds.size === 0) return;
    const result = await onLocalMemoMigrate([...selectedMigrationIds]);
    setMigrationResult(result);
    setSelectedMigrationIds(new Set());
  };

  return (
    <>
      <div className="externalMemoLaunch" aria-labelledby="external-memos-launch-heading">
        <div>
          <p className="eyebrow">Manual catch entry</p>
          <h3 id="external-memos-launch-heading">手入力釣果登録</h3>
          <p className="muted">URL先を自動取得せず、手入力した釣果の事実情報と出典だけを保存します。</p>
          <MemoStorageStatusChip status={storageStatus} />
        </div>
        <button type="button" className="button" onClick={() => setIsModalOpen(true)}>
          手入力釣果登録
        </button>
      </div>

      {isModalOpen ? (
        <div className="externalMemoOverlay" role="presentation" onMouseDown={() => setIsModalOpen(false)}>
          <section
            className="externalMemoModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-memos-heading"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="externalMemoModalHeader">
              <div>
                <p className="eyebrow">Manual catch entry</p>
                <h2 id="external-memos-heading">手入力釣果登録</h2>
                <p className="muted">フォーム、登録済みの釣果一覧、編集、削除、出典URLを開く操作をこの画面で行います。</p>
              </div>
              <button type="button" className="externalMemoClose" onClick={() => setIsModalOpen(false)} aria-label="手入力釣果登録を閉じる">×</button>
            </div>
            <MemoStorageStatusChip status={storageStatus} />
            <LocalMemoMigrationPanel candidates={migrationCandidates} selectedIds={selectedMigrationIds} status={storageStatus} result={migrationResult} onToggle={toggleMigrationCandidate} onMigrate={migrateSelectedMemos} />
            {storageError ? <p className="externalMemoError" role="alert">{storageError}</p> : null}
            <form className="externalMemoForm" onSubmit={submitMemo} noValidate>
              <label>情報元URL*<input value={form.sourceUrl} onChange={(e) => updateForm("sourceUrl", e.target.value)} placeholder="https://example.com/report" /></label>
              {errors.sourceUrl ? <p className="fieldError">{errors.sourceUrl}</p> : null}
              <label>情報元*<select value={form.sourceId} onChange={(e) => updateForm("sourceId", e.target.value)}><option value="">選択してください</option>{sources.map((source) => <option key={source.sourceId} value={source.sourceId}>{source.sourceName}</option>)}</select></label>
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
                <label className="externalMemoWide">釣り場マスター紐づけ<select value={form.spotId} onChange={(e) => updateForm("spotId", e.target.value)}><option value="">紐づけなし</option>{spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.name} / {spot.areaName}</option>)}</select></label>
                <label className="externalMemoWide">ユーザーメモ<textarea value={form.userMemo} onChange={(e) => updateForm("userMemo", e.target.value)} maxLength={240} placeholder="本文やコメント全文ではなく、自分用の短いメモだけを保存" /></label>
              </div>
              {errors.species || errors.caughtDate || errors.areaName || errors.catchCount || errors.sizeCm ? <p className="fieldError">{errors.species ?? errors.caughtDate ?? errors.areaName ?? errors.catchCount ?? errors.sizeCm}</p> : null}
              <div className="externalMemoActions"><button className="button" type="submit" disabled={storageStatus.isMutating}>{storageStatus.isMutating ? "保存中..." : editingId ? "更新する" : "登録する"}</button>{editingId ? <button type="button" className="clearSearchButton" onClick={resetForm}>編集をキャンセル</button> : null}</div>
            </form>
            <div className="externalMemoList" aria-live="polite">
              {memos.length === 0 ? <p className="emptyState">登録済みの釣果はありません。</p> : memos.map((memo) => {
                const linkedSpot = memo.spotId ? spots.find((spot) => spot.id === memo.spotId) : undefined;
                return <article className="card" key={memo.id}><div className="cardHeader"><div><p className="eyebrow">{memo.sourceName}</p><h3>{memo.species} / {memo.areaName}</h3></div></div><div className="cardSummary"><span>釣果日: {memo.caughtDate}</span><span>推定地点: {memo.estimatedSpotName ?? "未入力"}</span><span>信頼度: {memo.confidence}</span><span>釣り場: {linkedSpot ? linkedSpot.name : "未紐づけ"}</span></div><dl className="facts"><div><dt>釣り方</dt><dd>{memo.method ?? "未入力"}</dd></div><div><dt>匹数</dt><dd>{memo.catchCount ?? "未入力"}</dd></div><div><dt>サイズ</dt><dd>{memo.sizeCm === undefined ? "未入力" : `${memo.sizeCm}cm`}</dd></div><div><dt>更新日時</dt><dd>{new Date(memo.updatedAt).toLocaleString("ja-JP")}</dd></div><div className="sourceFact"><dt>出典URL</dt><dd><a href={memo.sourceUrl} target="_blank" rel="noreferrer">別タブで開く</a></dd></div></dl>{memo.userMemo ? <p className="externalMemoNote">{memo.userMemo}</p> : null}<div className="externalMemoActions"><button type="button" className="clearSearchButton" onClick={() => startEdit(memo)}>編集</button><button type="button" className="clearSearchButton" onClick={() => deleteMemo(memo.id)} disabled={storageStatus.isMutating}>削除</button></div></article>;
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}


function LocalMemoMigrationPanel({ candidates, selectedIds, status, result, onToggle, onMigrate }: {
  candidates: ExternalCatchMemo[];
  selectedIds: Set<string>;
  status: ExternalCatchMemoStorageStatus;
  result: ExternalCatchMemoMigrationResult | null;
  onToggle: (memoId: string) => void;
  onMigrate: () => void;
}) {
  const canShowCandidates = status.isDbAvailable && status.fallbackReason === "local-data-not-migrated" && candidates.length > 0;
  if (!canShowCandidates && !result) return null;
  return (
    <section className="externalMemoMigration" aria-labelledby="external-memo-migration-heading">
      <div>
        <p className="eyebrow">Explicit localStorage migration</p>
        <h3 id="external-memo-migration-heading">未移行ローカル釣果 {candidates.length}件</h3>
        <p className="muted">自動移行は行いません。選択したlocalStorage由来の釣果だけを、現在ログイン中ユーザーのSupabaseへ1件ずつ保存します。DB保存後も再取得確認が成功するまでlocalStorageから削除しません。</p>
      </div>
      {canShowCandidates ? (
        <>
          <div className="externalMemoMigrationList">
            {candidates.map((memo) => (
              <label className="externalMemoMigrationItem" key={memo.id}>
                <input type="checkbox" checked={selectedIds.has(memo.id)} onChange={() => onToggle(memo.id)} disabled={status.isMutating} />
                <span>{memo.species} / {memo.areaName} / {memo.caughtDate}</span>
              </label>
            ))}
          </div>
          <div className="externalMemoActions">
            <button type="button" className="button" onClick={onMigrate} disabled={status.isMutating || selectedIds.size === 0}>
              {status.isMutating ? "移行確認中..." : `選択した${selectedIds.size}件を移行`}
            </button>
          </div>
        </>
      ) : null}
      {result ? <p className="muted" role="status">移行結果: 成功 {result.succeeded.length}件 / スキップ {result.skipped.length}件 / 失敗 {result.failed.length}件。未移行・失敗分はlocalStorageに残ります。</p> : null}
    </section>
  );
}

const memoStorageFallbackLabels: Record<NonNullable<ExternalCatchMemoStorageStatus["fallbackReason"]>, string> = {
  "not-authenticated": "未ログインのためブラウザ保存",
  "supabase-not-configured": "Supabase未設定のためブラウザ保存",
  "supabase-error": "DBエラーのためブラウザ保存",
  "local-data-not-migrated": "DB利用可。未移行ローカルデータはブラウザ側に残し、新規登録はSupabaseへ保存",
};

function MemoStorageStatusChip({ status }: { status: ExternalCatchMemoStorageStatus }) {
  const label = status.isLoading
    ? "手入力釣果読込中..."
    : status.source === "supabase"
      ? "手入力釣果: Supabase"
      : status.isDbAvailable && status.fallbackReason === "local-data-not-migrated"
        ? "手入力釣果: Supabase + localStorage"
        : status.fallbackReason === "supabase-error"
          ? "手入力釣果: localStorage fallback"
          : "手入力釣果: localStorage";
  const reason = !status.isLoading && status.fallbackReason ? memoStorageFallbackLabels[status.fallbackReason] : null;
  return <p className="dataSourceStatus" aria-live="polite"><span>{label}</span>{reason ? <small>{reason}</small> : null}</p>;
}
