"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  ExternalCatchMemoMigrationResult,
  ExternalCatchMemoStorageStatus,
} from "@/hooks/useExternalCatchMemos";
import type { FishingSpot } from "@/domain/fishingSpot";
import { buildCatchRegistrationSpotOptions } from "@/domain/fishingSpotPresentation";
import {
  fishSpeciesNames,
  legacySpeciesLabel,
  type FishSpecies,
  type FishSpeciesName,
  type FishingMethod,
} from "@/domain/fishing";
import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";
import { groupSelectableFishSpecies } from "@/lib/fishSpeciesUiGroups";

const methodOptions: FishingMethod[] = [
  "ジギング",
  "キャスティング",
  "コマセ",
  "泳がせ",
  "サビキ",
  "エギング",
  "その他",
];
const USER_SELF_REPORT_SOURCE_ID = "user-self-report";
const USER_SELF_REPORT_SOURCE_NAME = "本人の釣果";
const PUBLIC_APP_URL = "https://fish-forecast-map.vercel.app";

type FormState = {
  species: FishSpeciesName | "";
  caughtDate: string;
  areaName: string;
  estimatedSpotName: string;
  method: FishingMethod | "";
  catchCount: string;
  sizeCm: string;
  spotId: string;
  userMemo: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  species: "",
  caughtDate: "",
  areaName: "",
  estimatedSpotName: "",
  method: "",
  catchCount: "",
  sizeCm: "",
  spotId: "",
  userMemo: "",
};

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.species) errors.species = "魚種を選択してください。";
  if (!form.caughtDate) errors.caughtDate = "釣果日を入力してください。";
  if (!form.areaName.trim()) errors.areaName = "エリアを入力してください。";
  if (
    form.catchCount !== "" &&
    (!Number.isFinite(Number(form.catchCount)) || Number(form.catchCount) < 0)
  )
    errors.catchCount = "0以上の数値を入力してください。";
  if (
    form.sizeCm !== "" &&
    (!Number.isFinite(Number(form.sizeCm)) || Number(form.sizeCm) < 0)
  )
    errors.sizeCm = "0以上の数値を入力してください。";
  return errors;
}

function toOptionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

function getSelfReportSourceUrl() {
  if (typeof window !== "undefined" && window.location.origin)
    return window.location.origin;
  return PUBLIC_APP_URL;
}

function createMemo(
  form: FormState,
  editingMemo?: ExternalCatchMemo,
): ExternalCatchMemo {
  const now = new Date().toISOString();
  return {
    id: editingMemo?.id ?? `external-memo-${Date.now()}`,
    species: form.species,
    caughtDate: form.caughtDate,
    areaName: form.areaName.trim(),
    estimatedSpotName: form.estimatedSpotName.trim() || undefined,
    spotId: form.spotId || undefined,
    coordinatePrecision: editingMemo?.coordinatePrecision ?? "unknown",
    method: form.method || undefined,
    catchCount: toOptionalNumber(form.catchCount),
    sizeCm: toOptionalNumber(form.sizeCm),
    sourceId: editingMemo?.sourceId ?? USER_SELF_REPORT_SOURCE_ID,
    sourceName: editingMemo?.sourceName ?? USER_SELF_REPORT_SOURCE_NAME,
    sourceUrl: editingMemo?.sourceUrl ?? getSelfReportSourceUrl(),
    acquisitionMethod: "manual",
    confidence: editingMemo?.confidence ?? "high",
    userMemo: form.userMemo.trim() || undefined,
    createdAt: editingMemo?.createdAt ?? now,
    updatedAt: now,
  };
}

function formFromMemo(memo: ExternalCatchMemo): FormState {
  return {
    species: fishSpeciesNames.includes(memo.species as FishSpeciesName)
      ? (memo.species as FishSpeciesName)
      : "",
    caughtDate: memo.caughtDate,
    areaName: memo.areaName,
    estimatedSpotName: memo.estimatedSpotName ?? "",
    method: (memo.method as FishingMethod) ?? "",
    catchCount: memo.catchCount?.toString() ?? "",
    sizeCm: memo.sizeCm?.toString() ?? "",
    spotId: memo.spotId ?? "",
    userMemo: memo.userMemo ?? "",
  };
}

type ExternalCatchMemoSectionProps = {
  memos: ExternalCatchMemo[];
  displayMemos: ExternalCatchMemo[];
  onMemoSave: (memo: ExternalCatchMemo) => Promise<boolean>;
  onMemoDelete: (memoId: string) => Promise<boolean>;
  onLocalMemoMigrate: (
    memoIds: string[],
  ) => Promise<ExternalCatchMemoMigrationResult>;
  localMemoIds: Set<string>;
  storageError: string | null;
  storageStatus: ExternalCatchMemoStorageStatus;
  spots: FishingSpot[];
  fishSpecies: FishSpecies[];
};

export function ExternalCatchMemoSection({
  memos,
  displayMemos,
  onMemoSave,
  onMemoDelete,
  onLocalMemoMigrate,
  localMemoIds,
  storageError,
  storageStatus,
  spots,
  fishSpecies,
}: ExternalCatchMemoSectionProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const editingMemo = useMemo(
    () => memos.find((memo) => memo.id === editingId),
    [editingId, memos],
  );
  const migrationCandidates = useMemo(
    () =>
      memos.filter(
        (memo) =>
          localMemoIds.has(memo.id) && memo.acquisitionMethod === "manual",
      ),
    [localMemoIds, memos],
  );
  const [selectedMigrationIds, setSelectedMigrationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [migrationResult, setMigrationResult] =
    useState<ExternalCatchMemoMigrationResult | null>(null);

  const closeModal = () => {
    setIsModalOpen(false);
    setErrors({});
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    setSelectedMigrationIds(
      (current) =>
        new Set(
          [...current].filter((id) =>
            migrationCandidates.some((memo) => memo.id === id),
          ),
        ),
    );
  }, [migrationCandidates]);

  const updateForm = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const openNew = () => {
    setEditingId(null);
    setForm(initialFormState);
    setErrors({});
    setIsModalOpen(true);
  };
  const openEdit = (memo: ExternalCatchMemo) => {
    setEditingId(memo.id);
    setForm(formFromMemo(memo));
    setErrors({});
    setIsModalOpen(true);
  };

  const submitMemo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (storageStatus.isMutating) return;
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const nextMemo = createMemo(form, editingMemo);
    if (await onMemoSave(nextMemo)) closeModal();
  };

  const deleteEditingMemo = async () => {
    if (!editingMemo || storageStatus.isMutating) return;
    if (!window.confirm("この釣果を削除します。よろしいですか？")) return;
    if (await onMemoDelete(editingMemo.id)) closeModal();
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

  const title = editingMemo ? "釣果を編集" : "釣果を登録";

  return (
    <>
      <div
        className="externalMemoLaunch"
        aria-labelledby="external-memos-launch-heading"
      >
        <div>
          <p className="eyebrow">My catch log</p>
          <h3 id="external-memos-launch-heading">自分の釣果を記録</h3>
          <MemoStorageStatusChip status={storageStatus} />
        </div>
        <button type="button" className="button" onClick={openNew}>
          釣果を登録
        </button>
      </div>

      <LocalMemoMigrationPanel
        candidates={migrationCandidates}
        selectedIds={selectedMigrationIds}
        status={storageStatus}
        result={migrationResult}
        onToggle={toggleMigrationCandidate}
        onMigrate={migrateSelectedMemos}
      />

      <div className="cards" id="reports">
        {displayMemos.length === 0 ? (
          <div className="emptyState" role="status">
            <p className="eyebrow">No reports</p>
            <h3>該当する釣果記録がありません</h3>
            <p>
              魚種・エリア・キーワード検索・釣果期間の条件を変更するか、「条件をリセット」で初期表示に戻してください。
            </p>
          </div>
        ) : (
          displayMemos.map((memo) => (
            <ExternalMemoCard
              key={memo.id}
              memo={memo}
              spots={spots}
              onEdit={openEdit}
            />
          ))
        )}
      </div>

      {isModalOpen ? (
        <div
          className="externalMemoOverlay"
          role="presentation"
          onMouseDown={closeModal}
        >
          <section
            className="externalMemoModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-memos-heading"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="externalMemoModalHeader">
              <div>
                <p className="eyebrow">My catch log</p>
                <h2 id="external-memos-heading">{title}</h2>
                <p className="muted">
                  自分の釣果記録として必要な項目だけを入力します。
                </p>
              </div>
              <button
                type="button"
                className="externalMemoClose"
                onClick={closeModal}
                aria-label={`${title}を閉じる`}
              >
                ×
              </button>
            </div>
            {storageError ? (
              <p className="externalMemoError" role="alert">
                {storageError}
              </p>
            ) : null}
            <form className="externalMemoForm" onSubmit={submitMemo} noValidate>
              <div className="externalMemoGrid">
                <label>
                  魚種 <span className="requiredBadge">必須</span>
                  <select
                    value={form.species}
                    onChange={(e) => updateForm("species", e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {editingMemo && !fishSpecies.find((item) => item.nameJa === editingMemo.species)?.isSelectable ? <option value={editingMemo.species}>{legacySpeciesLabel(editingMemo.species as FishSpeciesName)}</option> : null}
                    {groupSelectableFishSpecies(fishSpecies).map(({ label, items }) => <optgroup key={label} label={label}>{items.map((item) => <option key={item.id} value={item.nameJa}>{item.nameJa}</option>)}</optgroup>)}
                  </select>
                </label>
                <label>
                  釣果日 <span className="requiredBadge">必須</span>
                  <input
                    type="date"
                    value={form.caughtDate}
                    onChange={(e) => updateForm("caughtDate", e.target.value)}
                  />
                </label>
                <label>
                  エリア <span className="requiredBadge">必須</span>
                  <input
                    value={form.areaName}
                    onChange={(e) => updateForm("areaName", e.target.value)}
                    placeholder="例: 唐津湾"
                  />
                </label>
                <label>
                  場所・ポイント名 <span className="optionalBadge">任意</span>
                  <input
                    value={form.estimatedSpotName}
                    onChange={(e) =>
                      updateForm("estimatedSpotName", e.target.value)
                    }
                    placeholder="例: 呼子周辺"
                  />
                </label>
                <label>
                  釣り方 <span className="optionalBadge">任意</span>
                  <select
                    value={form.method}
                    onChange={(e) => updateForm("method", e.target.value)}
                  >
                    <option value="">未選択</option>
                    {methodOptions.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  匹数 <span className="optionalBadge">任意</span>
                  <input
                    type="number"
                    min="0"
                    value={form.catchCount}
                    onChange={(e) => updateForm("catchCount", e.target.value)}
                  />
                </label>
                <label>
                  サイズcm <span className="optionalBadge">任意</span>
                  <input
                    type="number"
                    min="0"
                    value={form.sizeCm}
                    onChange={(e) => updateForm("sizeCm", e.target.value)}
                  />
                </label>
                <label className="externalMemoWide">
                  地図上の釣り場 <span className="optionalBadge">任意</span>
                  <select
                    value={form.spotId}
                    onChange={(e) => updateForm("spotId", e.target.value)}
                  >
                    <option value="">紐づけなし</option>
                    {buildCatchRegistrationSpotOptions(spots).map((spot) => (
                      <option key={spot.id} value={spot.id}>
                        {spot.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="externalMemoWide">
                  メモ <span className="optionalBadge">任意</span>
                  <textarea
                    value={form.userMemo}
                    onChange={(e) => updateForm("userMemo", e.target.value)}
                    maxLength={240}
                    placeholder="釣れた状況や次回のための短いメモ"
                  />
                </label>
              </div>
              {Object.keys(errors).length > 0 ? (
                <p className="fieldError" role="alert">
                  {errors.species ??
                    errors.caughtDate ??
                    errors.areaName ??
                    errors.catchCount ??
                    errors.sizeCm}
                </p>
              ) : null}
              <div className="externalMemoActions">
                <button
                  className="button"
                  type="submit"
                  disabled={storageStatus.isMutating}
                >
                  {storageStatus.isMutating
                    ? "保存中..."
                    : editingMemo
                      ? "更新する"
                      : "登録する"}
                </button>
                {editingMemo ? (
                  <button
                    type="button"
                    className="dangerButton"
                    onClick={deleteEditingMemo}
                    disabled={storageStatus.isMutating}
                  >
                    {storageStatus.isMutating ? "削除中..." : "この釣果を削除"}
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ExternalMemoCard({
  memo,
  spots,
  onEdit,
}: {
  memo: ExternalCatchMemo;
  spots: FishingSpot[];
  onEdit: (memo: ExternalCatchMemo) => void;
}) {
  const linkedSpot = memo.spotId
    ? spots.find((spot) => spot.id === memo.spotId)
    : undefined;
  return (
    <article className="card externalMemoCard">
      <div className="cardHeader">
        <div>
          <p className="eyebrow">自分の釣果</p>
          <h3>
            {legacySpeciesLabel(memo.species as FishSpeciesName)} / {memo.areaName}
          </h3>
          <p className="muted">自分で記録した釣果です。</p>
        </div>
        <button
          type="button"
          className="clearSearchButton"
          onClick={() => onEdit(memo)}
          aria-label={`${memo.caughtDate} ${legacySpeciesLabel(memo.species as FishSpeciesName)} ${memo.areaName}の釣果を編集`}
        >
          編集
        </button>
      </div>
      <div className="cardSummary">
        <span>釣果日: {memo.caughtDate}</span>
        <span>場所・ポイント名: {memo.estimatedSpotName ?? "未入力"}</span>
        <span>
          {linkedSpot
            ? `地図上の釣り場: ${linkedSpot.name}`
            : "地図上の釣り場: 未紐づけ"}
        </span>
      </div>
      <dl className="facts">
        <div>
          <dt>魚種</dt>
          <dd>{legacySpeciesLabel(memo.species as FishSpeciesName)}</dd>
        </div>
        <div>
          <dt>エリア</dt>
          <dd>{memo.areaName}</dd>
        </div>
        <div>
          <dt>釣り方</dt>
          <dd>{memo.method ?? "未入力"}</dd>
        </div>
        <div>
          <dt>匹数</dt>
          <dd>{memo.catchCount ?? "未入力"}</dd>
        </div>
        <div>
          <dt>サイズ</dt>
          <dd>{memo.sizeCm === undefined ? "未入力" : `${memo.sizeCm}cm`}</dd>
        </div>
        <div>
          <dt>地図上の釣り場</dt>
          <dd>
            {linkedSpot
              ? `${linkedSpot.name}に紐づけ`
              : "未紐づけ / 地図未表示"}
          </dd>
        </div>
      </dl>
      {memo.userMemo ? (
        <p className="externalMemoNote">{memo.userMemo}</p>
      ) : null}
    </article>
  );
}

function LocalMemoMigrationPanel({
  candidates,
  selectedIds,
  status,
  result,
  onToggle,
  onMigrate,
}: {
  candidates: ExternalCatchMemo[];
  selectedIds: Set<string>;
  status: ExternalCatchMemoStorageStatus;
  result: ExternalCatchMemoMigrationResult | null;
  onToggle: (memoId: string) => void;
  onMigrate: () => void;
}) {
  const canShowCandidates =
    status.isDbAvailable &&
    status.fallbackReason === "local-data-not-migrated" &&
    candidates.length > 0;
  if (!canShowCandidates && !result) return null;
  return (
    <details className="externalMemoMigration">
      <summary>未移行のブラウザ保存釣果をSupabaseへ移行する</summary>
      <p className="muted">
        自動移行は行いません。選択したlocalStorage由来の釣果だけを、現在ログイン中ユーザーのSupabaseへ1件ずつ保存します。DB保存後も再取得確認が成功するまでlocalStorageから削除しません。
      </p>
      {canShowCandidates ? (
        <>
          <div className="externalMemoMigrationList">
            {candidates.map((memo) => (
              <label className="externalMemoMigrationItem" key={memo.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(memo.id)}
                  onChange={() => onToggle(memo.id)}
                  disabled={status.isMutating}
                />
                <span>
                  {legacySpeciesLabel(memo.species as FishSpeciesName)} / {memo.areaName} / {memo.caughtDate}
                </span>
              </label>
            ))}
          </div>
          <div className="externalMemoActions">
            <button
              type="button"
              className="button"
              onClick={onMigrate}
              disabled={status.isMutating || selectedIds.size === 0}
            >
              {status.isMutating
                ? "移行確認中..."
                : `選択した${selectedIds.size}件を移行`}
            </button>
          </div>
        </>
      ) : null}
      {result ? (
        <p className="muted" role="status">
          移行結果: 成功 {result.succeeded.length}件 / スキップ{" "}
          {result.skipped.length}件 / 失敗 {result.failed.length}
          件。未移行・失敗分はlocalStorageに残ります。
        </p>
      ) : null}
    </details>
  );
}

const memoStorageFallbackLabels: Record<
  NonNullable<ExternalCatchMemoStorageStatus["fallbackReason"]>,
  string
> = {
  "not-authenticated": "未ログインのためブラウザ保存",
  "supabase-not-configured": "Supabase未設定のためブラウザ保存",
  "supabase-error": "DBエラーのためブラウザ保存",
  "local-data-not-migrated":
    "DB利用可。未移行ローカルデータはブラウザ側に残し、新規登録はSupabaseへ保存",
};

function MemoStorageStatusChip({
  status,
}: {
  status: ExternalCatchMemoStorageStatus;
}) {
  const label = status.isLoading
    ? "釣果記録読込中..."
    : status.source === "supabase"
      ? "釣果記録: Supabase"
      : status.isDbAvailable &&
          status.fallbackReason === "local-data-not-migrated"
        ? "釣果記録: Supabase + localStorage"
        : status.fallbackReason === "supabase-error"
          ? "釣果記録: localStorage fallback"
          : "釣果記録: localStorage";
  const reason =
    !status.isLoading && status.fallbackReason
      ? memoStorageFallbackLabels[status.fallbackReason]
      : null;
  return (
    <p className="dataSourceStatus" aria-live="polite">
      <span>{label}</span>
      {reason ? <small>{reason}</small> : null}
    </p>
  );
}
