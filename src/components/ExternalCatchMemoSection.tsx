"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

export type CatchItemFormState = { species: FishSpeciesName | ""; catchCount: string; sizeCm: string };
export type FormState = {
  catchItems: CatchItemFormState[];
  caughtDateTime: string;
  method: FishingMethod | "";
  spotId: string;
  userMemo: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const emptyCatchItem = (): CatchItemFormState => ({ species: "", catchCount: "", sizeCm: "" });
const initialFormState = (): FormState => ({
  catchItems: [emptyCatchItem()], caughtDateTime: "", method: "", spotId: "", userMemo: "",
});

export function validateForm(form: FormState, editingMemo?: ExternalCatchMemo): FormErrors {
  const errors: FormErrors = {};
  if (form.catchItems.length === 0 || form.catchItems.some((item) => !item.species)) errors.catchItems = "すべての魚種を選択してください。";
  const selected = form.catchItems.map((item) => item.species).filter(Boolean);
  if (new Set(selected).size !== selected.length) errors.catchItems = "同じ魚種は重複して登録できません。";
  if (form.catchItems.some((item) => [item.catchCount, item.sizeCm].some((value) => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)))) errors.catchItems = "数とサイズは0以上の数値を入力してください。";
  if (!form.spotId) errors.spotId = "地図上の釣り場を選択してください。";
  if ((!editingMemo || editingMemo.caughtTime) && !form.caughtDateTime) errors.caughtDateTime = "釣果日時を入力してください。";
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

export function createMemo(
  form: FormState,
  spots: FishingSpot[],
  editingMemo?: ExternalCatchMemo,
): ExternalCatchMemo {
  const now = new Date().toISOString();
  const selectedSpot = spots.find((spot) => spot.id === form.spotId);
  if (!selectedSpot) throw new Error("Selected fishing spot was not found.");
  const [enteredDate, enteredTime] = form.caughtDateTime.split("T");
  const caughtDate = enteredDate || editingMemo?.caughtDate;
  const caughtTime = enteredTime || undefined;
  if (!caughtDate)
    throw new Error("Catch date is required when creating a memo.");
  return {
    id: editingMemo?.id ?? `external-memo-${Date.now()}`,
    species: form.catchItems[0].species,
    catchItems: form.catchItems.map((item) => ({
      species: item.species,
      catchCount: toOptionalNumber(item.catchCount),
      sizeCm: toOptionalNumber(item.sizeCm),
    })),
    caughtDate,
    caughtTime,
    areaName: selectedSpot.areaName,
    estimatedSpotName: editingMemo?.estimatedSpotName,
    spotId: selectedSpot.id,
    coordinatePrecision: editingMemo?.coordinatePrecision ?? "unknown",
    method: form.method || undefined,
    catchCount: toOptionalNumber(form.catchItems[0].catchCount),
    sizeCm: toOptionalNumber(form.catchItems[0].sizeCm),
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

export function formFromMemo(memo: ExternalCatchMemo): FormState {
  return {
    catchItems: memo.catchItems.map((item) => ({
      species: fishSpeciesNames.includes(item.species as FishSpeciesName) ? item.species as FishSpeciesName : "",
      catchCount: item.catchCount?.toString() ?? "",
      sizeCm: item.sizeCm?.toString() ?? "",
    })),
    caughtDateTime: memo.caughtTime ? `${memo.caughtDate}T${memo.caughtTime.slice(0, 5)}` : "",
    method: (memo.method as FishingMethod) ?? "", spotId: memo.spotId ?? "", userMemo: memo.userMemo ?? "",
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
  const [form, setForm] = useState<FormState>(initialFormState());
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

  const updateForm = (key: Exclude<keyof FormState, "catchItems">, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateCatchItem = (index: number, key: keyof CatchItemFormState, value: string) => setForm((current) => ({ ...current, catchItems: current.catchItems.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const addCatchItem = () => setForm((current) => ({ ...current, catchItems: [...current.catchItems, emptyCatchItem()] }));
  const removeCatchItem = (index: number) => setForm((current) => current.catchItems.length === 1 ? current : ({ ...current, catchItems: current.catchItems.filter((_, itemIndex) => itemIndex !== index) }));
  const openNew = () => {
    setEditingId(null);
    setForm(initialFormState());
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
    const nextErrors = validateForm(form, editingMemo);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const nextMemo = createMemo(form, spots, editingMemo);
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
              onDelete={onMemoDelete}
              isMutating={storageStatus.isMutating}
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
            <button type="button" className="externalMemoClose" onClick={closeModal} aria-label={`${title}を閉じる`}>×</button>
            <div className="externalMemoModalHeader">
              <div>
                <p className="eyebrow">My catch log</p>
                <h2 id="external-memos-heading">{title}</h2>
              </div>
            </div>
            {storageError ? (
              <p className="externalMemoError" role="alert">
                {storageError}
              </p>
            ) : null}
            <form className="externalMemoForm" onSubmit={submitMemo} noValidate>
              <div className="externalMemoSections">
                <fieldset className="externalMemoFormSection externalMemoBasicInfo">
                  <legend>基本情報</legend>
                  <label>
                    地図上の釣り場 <span className="requiredBadge">必須</span>
                    <select
                      value={form.spotId}
                      onChange={(e) => updateForm("spotId", e.target.value)}
                    >
                      <option value="">選択してください</option>
                      {buildCatchRegistrationSpotOptions(spots).map((spot) => (
                        <option key={spot.id} value={spot.id}>{spot.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    釣果日時{" "}
                    {!editingMemo || editingMemo.caughtTime ? (
                      <span className="requiredBadge">必須</span>
                    ) : (
                      <span className="optionalBadge">任意</span>
                    )}
                    <input
                      type="datetime-local"
                      value={form.caughtDateTime}
                      onChange={(e) => updateForm("caughtDateTime", e.target.value)}
                    />
                    {editingMemo && !editingMemo.caughtTime ? (
                      <span className="muted">
                        登録済み日付: {editingMemo.caughtDate}（時刻未登録）。空欄のまま保存すると、この日付と時刻未登録の状態を維持します。
                      </span>
                    ) : null}
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
                </fieldset>
                <fieldset className="externalMemoFormSection externalMemoFishItems">
                  <legend>釣れた魚 <span className="requiredBadge">必須</span></legend>
                  {form.catchItems.map((item, index) => (
                    <div className="externalMemoFishItem" key={index}>
                      <h3>魚種 {index + 1}</h3>
                      <label>魚種
                        <select value={item.species} onChange={(event) => updateCatchItem(index, "species", event.target.value)}>
                          <option value="">選択してください</option>
                          {editingMemo && item.species && !fishSpecies.find((fish) => fish.nameJa === item.species)?.isSelectable ? <option value={item.species}>{legacySpeciesLabel(item.species)}</option> : null}
                          {groupSelectableFishSpecies(fishSpecies).map(({ label, items }) => <optgroup key={label} label={label}>{items.map((fish) => <option key={fish.id} value={fish.nameJa}>{fish.nameJa}</option>)}</optgroup>)}
                        </select>
                      </label>
                      <div className="externalMemoFishNumbers">
                        <label>数 <span className="optionalBadge">任意</span><input type="number" min="0" value={item.catchCount} onChange={(event) => updateCatchItem(index, "catchCount", event.target.value)} /></label>
                        <label>サイズ（cm） <span className="optionalBadge">任意</span><input type="number" min="0" value={item.sizeCm} onChange={(event) => updateCatchItem(index, "sizeCm", event.target.value)} /></label>
                      </div>
                      <button type="button" className="externalMemoItemRemove" aria-label={`${index + 1}行目の魚種明細を削除`} disabled={form.catchItems.length === 1} onClick={() => removeCatchItem(index)}>×</button>
                    </div>
                  ))}
                  <button type="button" className="clearSearchButton externalMemoAddFish" onClick={addCatchItem}>＋ 魚種を追加</button>
                  {errors.catchItems ? <p className="fieldError" role="alert">{errors.catchItems}</p> : null}
                </fieldset>
                <section className="externalMemoFormSection externalMemoMemoSection">
                  <label>
                  メモ <span className="optionalBadge">任意</span>
                  <textarea
                    value={form.userMemo}
                    onChange={(e) => updateForm("userMemo", e.target.value)}
                    maxLength={240}
                    placeholder="釣れた状況や次回のための短いメモ"
                  />
                  </label>
                </section>
              </div>
              {Object.keys(errors).length > 0 ? (
                <p className="fieldError" role="alert">
                  {errors.spotId ?? errors.caughtDateTime}
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
                <button type="button" className="clearSearchButton" onClick={closeModal} disabled={storageStatus.isMutating} aria-label="釣果入力をキャンセル">キャンセル</button>
              </div>
              {editingMemo ? <div className="externalMemoDangerActions"><button type="button" className="dangerButton" onClick={deleteEditingMemo} disabled={storageStatus.isMutating}>{storageStatus.isMutating ? "削除中..." : "この釣果を削除"}</button></div> : null}
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
  onDelete,
  isMutating,
}: {
  memo: ExternalCatchMemo;
  spots: FishingSpot[];
  onEdit: (memo: ExternalCatchMemo) => void;
  onDelete: (memoId: string) => Promise<boolean>;
  isMutating: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const linkedSpot = memo.spotId
    ? spots.find((spot) => spot.id === memo.spotId)
    : undefined;
  const displayLocationName = linkedSpot?.name ?? memo.estimatedSpotName ?? memo.areaName;
  const locationLabel = linkedSpot
    ? `${displayLocationName}（${linkedSpot.areaName}）`
    : displayLocationName;
  const speciesLabels = memo.catchItems.map((item) =>
    legacySpeciesLabel(item.species as FishSpeciesName),
  );
  const isMultipleSpecies = memo.catchItems.length > 1;
  const detailsId = `catch-details-${memo.id}`;
  const summaryParts = isMultipleSpecies
    ? buildMultipleCatchSummary(memo)
    : buildCatchMeasurements(memo.catchItems[0]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!window.confirm("この釣果を削除します。よろしいですか？")) return;
    await onDelete(memo.id);
  };

  const handleSummaryClick = () => {
    if (isMultipleSpecies) setIsExpanded((current) => !current);
  };

  return (
    <article className={`externalMemoCard${isExpanded ? " isExpanded" : ""}`}>
      <p className="externalMemoCardLabel">自分の釣果</p>
      <div
        className={`externalMemoSummary${isMultipleSpecies ? " isExpandable" : ""}`}
        onClick={handleSummaryClick}
        onKeyDown={(event) => {
          if (isMultipleSpecies && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            handleSummaryClick();
          }
        }}
        role={isMultipleSpecies ? "button" : undefined}
        tabIndex={isMultipleSpecies ? 0 : undefined}
        aria-expanded={isMultipleSpecies ? isExpanded : undefined}
        aria-controls={isMultipleSpecies ? detailsId : undefined}
      >
        <div className={`externalMemoFishIcon${isMultipleSpecies ? " isMultiple" : ""}`} aria-hidden="true">
          {speciesLabels.slice(0, 3).map((species, index) => (
            <FishIcon key={`${species}-${index}`} />
          ))}
        </div>
        <div className="externalMemoCardBody">
          <div className="externalMemoTitleRow">
            <h3>{speciesLabels.join("・")}</h3>
            {memo.method ? <span className="externalMemoMethod">{memo.method}</span> : null}
          </div>
          <p className="externalMemoLocation"><LocationIcon />{locationLabel}</p>
          <p className="externalMemoMeta">
            {summaryParts ? <><span>{summaryParts}</span><span aria-hidden="true">・</span></> : null}
            <time dateTime={memo.caughtDate}>{memo.caughtDate}</time>
          </p>
        </div>
        {isMultipleSpecies ? <span className="externalMemoChevron" aria-hidden="true">⌄</span> : null}
      </div>
      <div className="externalMemoMenu" ref={menuRef} onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="externalMemoMenuButton"
          aria-label={`${speciesLabels.join("・")}の操作メニュー`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        ><span aria-hidden="true">⋮</span></button>
        {isMenuOpen ? (
          <div className="externalMemoMenuPopover" role="menu">
            <button type="button" role="menuitem" onClick={() => { setIsMenuOpen(false); onEdit(memo); }}>編集</button>
            <button type="button" role="menuitem" className="isDanger" disabled={isMutating} onClick={handleDelete}>削除</button>
          </div>
        ) : null}
      </div>
      {isMultipleSpecies && isExpanded ? (
        <div className="externalMemoDetails" id={detailsId}>
          <p className="externalMemoDetailsLabel">釣れた魚</p>
          <ul>
            {memo.catchItems.map((item) => (
              <li key={item.species}>
                <strong>{legacySpeciesLabel(item.species as FishSpeciesName)}</strong>
                {buildCatchMeasurements(item) ? <span>{buildCatchMeasurements(item)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

type CatchMeasurement = ExternalCatchMemo["catchItems"][number];

export function buildCatchMeasurements(item: CatchMeasurement) {
  const measurements = [];
  if (item.catchCount !== undefined) measurements.push(`${item.catchCount}匹`);
  if (item.sizeCm !== undefined) measurements.push(`${item.sizeCm}cm`);
  return measurements.join(" / ");
}

export function buildMultipleCatchSummary(memo: ExternalCatchMemo) {
  const enteredCounts = memo.catchItems
    .map((item) => item.catchCount)
    .filter((count): count is number => count !== undefined);
  return [
    `${memo.catchItems.length}` + "魚種",
    enteredCounts.length > 0 ? `${enteredCounts.reduce((sum, count) => sum + count, 0)}匹` : null,
  ].filter(Boolean).join(" ・ ");
}

function FishIcon() {
  return <svg viewBox="0 0 24 16" focusable="false"><path d="M15.8 2.3c-4.7-2-9.3.5-11.6 4.1L.8 3.8v8.4l3.4-2.6c2.3 3.6 6.9 6.1 11.6 4.1 3.1-1.3 5.3-5.7 7.4-5.7-2.1 0-4.3-4.4-7.4-5.7Zm.2 4.4a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" /></svg>;
}

function LocationIcon() {
  return <svg viewBox="0 0 16 20" aria-hidden="true"><path d="M8 0a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 10.2A3.2 3.2 0 1 1 8 3.8a3.2 3.2 0 0 1 0 6.4Z" /></svg>;
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
