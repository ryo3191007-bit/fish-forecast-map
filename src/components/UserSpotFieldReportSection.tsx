"use client";

import { useRef, useState } from "react";
import type { PreparedRecordPhoto } from "@/domain/recordPhoto";
import { RecordPhotoBatchError, uploadRecordPhotos } from "@/lib/recordPhotoRepository";
import { resolveRecordPhotoTargetId } from "@/domain/recordPhotoUpload";
import { fishingDetailItems, terrainDetailItems } from "@/domain/spotDetailUiPresentation";
import { buildSaveSpotFieldObservationInput, createSpotFieldObservationDraft, formatSpotFieldObservationDate, formatSpotFieldObservationValue, getTodayInJapan, spotFieldObservationConfigs, type SpotFieldObservationDraft } from "@/domain/spotFieldObservation";
import { userFishingSpotDetailItemKeys } from "@/domain/userFishingSpot";
import type { SpotFieldReportState } from "@/hooks/useSpotFieldObservations";
import { ObservationValueInput } from "./SpotFieldObservationCard";
import { RecordPhotoEditor } from "./RecordPhotoEditor";
import styles from "./UserSpotFieldReportSection.module.css";
import { recordVisibilityLabel, type RecordVisibility } from "@/domain/recordVisibility";
import { updateMySpotFieldReportVisibility } from "@/lib/spotFieldReportRepository";

const labels = new Map<string, string>([...fishingDetailItems, ...terrainDetailItems]);
const items = userFishingSpotDetailItemKeys.map((itemKey) => ({ itemKey, label: labels.get(itemKey) ?? itemKey }));

export function UserSpotFieldReportSection({ spotId, state }: { spotId: string; state: SpotFieldReportState }) {
  const [open, setOpen] = useState(false);
  const [observedOn, setObservedOn] = useState(getTodayInJapan());
  const [summaryNote, setSummaryNote] = useState("");
  const [drafts, setDrafts] = useState<Record<string, SpotFieldObservationDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PreparedRecordPhoto[]>([]);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<RecordVisibility>("private");
  const [visibilityOverrides, setVisibilityOverrides] = useState<Record<string, RecordVisibility>>({});
  const idempotencyKey = useRef(crypto.randomUUID());
  const selected = Object.keys(drafts);
  const closeForm = () => { photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)); setOpen(false); setDrafts({}); setPhotos([]); setSavedReportId(null); setSummaryNote(""); setObservedOn(getTodayInJapan()); setVisibility("private"); idempotencyKey.current = crypto.randomUUID(); setError(null); };
  const toggle = (key: string, checked: boolean) => setDrafts((current) => {
    if (checked) return { ...current, [key]: createSpotFieldObservationDraft() };
    const next = { ...current }; delete next[key]; return next;
  });
  const submit = async () => {
    const values = savedReportId ? [] : selected.map((key) => buildSaveSpotFieldObservationInput(spotId, key, spotFieldObservationConfigs[key], { ...drafts[key], checkedAt: observedOn })).filter((value) => value !== null);
    if (!savedReportId && (values.length !== selected.length || !values.length)) { setError("1項目以上の確認内容を入力してください。"); return; }
    const reportId = await resolveRecordPhotoTargetId(savedReportId, () => state.saveReport(observedOn, summaryNote.trim() || null, values, visibility, `${spotId}:${idempotencyKey.current}`));
    if (reportId) {
      if (!savedReportId) setSavedReportId(reportId);
      if (photos.length) {
        try { await uploadRecordPhotos("field_report", reportId, photos); }
        catch (value) {
          const completed = value instanceof RecordPhotoBatchError ? new Set(value.completedPhotoIds) : new Set<string>();
          setPhotos((current) => current.filter((photo) => !completed.has(photo.id)));
          setError("本文は保存済みです。同じ実地調査へ未完了の写真だけ再試行できます。"); return;
        }
      }
      closeForm();
    } else setError("保存できませんでした。入力内容と通信状態を確認してください。");
  };
  const unavailable = state.reportStatus !== "ready";
  const unavailableReason = "実地調査履歴のbackendが未提供のため、まとめて登録は利用できません。";
  return <>
    <button className={styles.trigger} type="button" disabled={state.status !== "ready" || unavailable || state.isMutating} title={unavailable ? unavailableReason : undefined} onClick={() => setOpen(true)}>+実地調査をまとめて登録</button>
    {open ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !state.isMutating) closeForm(); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="field-report-form-heading">
      <header><h3 id="field-report-form-heading">実地調査をまとめて登録</h3><button type="button" aria-label="閉じる" disabled={state.isMutating} onClick={closeForm}>×</button></header>
      {savedReportId ? <p role="status">実地調査本文は保存済みです。本文は変更せず、未完了の写真だけを再試行します。</p> : <><label>調査日<input type="date" required max={getTodayInJapan()} value={observedOn} onChange={(event) => setObservedOn(event.target.value)} /></label>
      <label>調査全体メモ（任意）<textarea maxLength={1000} value={summaryNote} onChange={(event) => setSummaryNote(event.target.value)} /></label>
      <fieldset><legend>公開範囲</legend><label><input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} />{recordVisibilityLabel.private}</label><label><input type="radio" checked={visibility === "public"} onChange={() => setVisibility("public")} />{recordVisibilityLabel.public}</label></fieldset>
      <fieldset><legend>確認した項目（1項目以上）</legend>{items.map(({ itemKey, label }) => <div className={styles.item} key={itemKey}>
        <label className={styles.itemToggle}><input type="checkbox" checked={Boolean(drafts[itemKey])} onChange={(event) => toggle(itemKey, event.target.checked)} />{label}</label>
        {drafts[itemKey] ? <><ObservationValueInput config={spotFieldObservationConfigs[itemKey]} options={spotFieldObservationConfigs[itemKey].options ?? []} draft={drafts[itemKey]} onChange={(update) => setDrafts((current) => ({ ...current, [itemKey]: typeof update === "function" ? update(current[itemKey]) : update }))} /><label>項目メモ（任意）<textarea maxLength={1000} value={drafts[itemKey].note} onChange={(event) => setDrafts((current) => ({ ...current, [itemKey]: { ...current[itemKey], note: event.target.value } }))} /></label></> : null}
      </div>)}</fieldset></>}
      <RecordPhotoEditor targetType="field_report" targetId={savedReportId ?? undefined} enabled pending={photos} onPendingChange={setPhotos} />
      {error ? <p className={styles.error} role="alert">{error}</p> : null}<div className={styles.actions}><button type="button" disabled={state.isMutating} onClick={closeForm}>キャンセル</button><button type="button" disabled={state.isMutating || (!savedReportId && selected.length === 0)} onClick={() => void submit()}>{state.isMutating ? "保存中…" : savedReportId ? "未完了の写真を再試行" : "保存"}</button></div>
      <div className={styles.history} aria-label="過去の実地調査履歴">{state.reports.length === 0 ? <p className={styles.empty}>履歴はまだありません。</p> : state.reports.map((report) => <article key={report.id}>
        <header><strong>{formatSpotFieldObservationDate(report.observedOn)}</strong><small>{report.origin === "snapshot_backfill" ? "既存の現在値から移行" : report.origin === "initial_details" ? "地点登録時" : "実地調査"}</small><label>公開範囲<select value={visibilityOverrides[report.id] ?? report.visibility} disabled={state.isMutating} onChange={async (event) => { const next = event.target.value as RecordVisibility; try { await updateMySpotFieldReportVisibility(report.id, next); setVisibilityOverrides((current) => ({ ...current, [report.id]: next })); } catch { setError("公開範囲を変更できませんでした。"); } }}><option value="private">自分のみ</option><option value="public">公開</option></select></label></header>
        {report.summaryNote ? <p>{report.summaryNote}</p> : null}
        <dl>{report.values.map((value) => <div key={value.id}><dt>{labels.get(value.itemKey) ?? value.itemKey}</dt><dd>{formatSpotFieldObservationValue(value)}{value.note ? <small>{value.note}</small> : null}</dd></div>)}</dl>
        <RecordPhotoEditor targetType="field_report" targetId={report.id} enabled />
      </article>)}</div>
    </section></div> : null}
  </>;
}
