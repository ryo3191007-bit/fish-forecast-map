"use client";

import { useState } from "react";
import { fishingDetailItems, terrainDetailItems } from "@/domain/spotDetailUiPresentation";
import { buildSaveSpotFieldObservationInput, createSpotFieldObservationDraft, formatSpotFieldObservationDate, formatSpotFieldObservationValue, getTodayInJapan, spotFieldObservationConfigs, type SpotFieldObservationDraft } from "@/domain/spotFieldObservation";
import { userFishingSpotDetailItemKeys } from "@/domain/userFishingSpot";
import type { UserFishingSpotDetailState } from "@/hooks/useUserFishingSpotDetails";
import { ObservationValueInput } from "./SpotFieldObservationCard";
import styles from "./UserSpotFieldReportSection.module.css";

const labels = new Map([...fishingDetailItems, ...terrainDetailItems]);
const items = userFishingSpotDetailItemKeys.map((itemKey) => ({ itemKey, label: labels.get(itemKey) ?? itemKey }));

export function UserSpotFieldReportSection({ spotId, state }: { spotId: string; state: UserFishingSpotDetailState }) {
  const [open, setOpen] = useState(false);
  const [observedOn, setObservedOn] = useState(getTodayInJapan());
  const [summaryNote, setSummaryNote] = useState("");
  const [drafts, setDrafts] = useState<Record<string, SpotFieldObservationDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const selected = Object.keys(drafts);
  const toggle = (key: string, checked: boolean) => setDrafts((current) => {
    if (checked) return { ...current, [key]: createSpotFieldObservationDraft() };
    const next = { ...current }; delete next[key]; return next;
  });
  const submit = async () => {
    const values = selected.map((key) => buildSaveSpotFieldObservationInput(spotId, key, spotFieldObservationConfigs[key], { ...drafts[key], checkedAt: observedOn })).filter((value) => value !== null);
    if (values.length !== selected.length || !values.length) { setError("1項目以上の確認内容を入力してください。"); return; }
    if (await state.saveReport(observedOn, summaryNote.trim() || null, values)) {
      setOpen(false); setDrafts({}); setSummaryNote(""); setObservedOn(getTodayInJapan()); setError(null);
    } else setError("保存できませんでした。入力内容と通信状態を確認してください。");
  };
  return <section className={styles.section} aria-labelledby="field-report-history-heading">
    <div className={styles.heading}><div><p>現在値とは別に、過去の調査を残します。</p><h3 id="field-report-history-heading">現地調査履歴</h3></div><button type="button" disabled={state.status !== "ready" || state.reportStatus !== "ready" || state.isMutating} onClick={() => setOpen(true)}>＋ 現地調査を記録</button></div>
    {state.reportStatus === "loading" ? <p>履歴を取得中…</p> : state.reportStatus === "unavailable" ? <p className={styles.empty}>現地調査履歴は現在利用できません。現在値の閲覧・編集は引き続き利用できます。</p> : state.reportStatus === "failed" ? <p className={styles.empty}>現地調査履歴を取得できませんでした。</p> : state.reports.length === 0 ? <p className={styles.empty}>現地調査履歴はまだありません。</p> : <div className={styles.history}>{state.reports.map((report) => <article key={report.id}>
      <header><strong>{formatSpotFieldObservationDate(report.observedOn)}</strong><small>{report.origin === "snapshot_backfill" ? "既存の現在値から移行" : report.origin === "initial_details" ? "地点登録時" : "現地調査"}</small></header>
      {report.summaryNote ? <p>{report.summaryNote}</p> : null}
      <dl>{report.values.map((value) => <div key={value.id}><dt>{labels.get(value.itemKey) ?? value.itemKey}</dt><dd>{formatSpotFieldObservationValue({ ...value, informationState: "weak_evidence" })}{value.note ? <small>{value.note}</small> : null}</dd></div>)}</dl>
    </article>)}</div>}
    {open ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !state.isMutating) setOpen(false); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="field-report-form-heading">
      <header><h3 id="field-report-form-heading">現地調査を記録</h3><button type="button" aria-label="閉じる" disabled={state.isMutating} onClick={() => setOpen(false)}>×</button></header>
      <label>調査日<input type="date" required max={getTodayInJapan()} value={observedOn} onChange={(event) => setObservedOn(event.target.value)} /></label>
      <label>調査全体メモ（任意）<textarea maxLength={1000} value={summaryNote} onChange={(event) => setSummaryNote(event.target.value)} /></label>
      <fieldset><legend>確認した項目（1項目以上）</legend>{items.map(({ itemKey, label }) => <div className={styles.item} key={itemKey}>
        <label className={styles.itemToggle}><input type="checkbox" checked={Boolean(drafts[itemKey])} onChange={(event) => toggle(itemKey, event.target.checked)} />{label}</label>
        {drafts[itemKey] ? <><ObservationValueInput config={spotFieldObservationConfigs[itemKey]} options={spotFieldObservationConfigs[itemKey].options ?? []} draft={drafts[itemKey]} onChange={(update) => setDrafts((current) => ({ ...current, [itemKey]: typeof update === "function" ? update(current[itemKey]) : update }))} /><label>項目メモ（任意）<textarea maxLength={1000} value={drafts[itemKey].note} onChange={(event) => setDrafts((current) => ({ ...current, [itemKey]: { ...current[itemKey], note: event.target.value } }))} /></label></> : null}
      </div>)}</fieldset>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}<div className={styles.actions}><button type="button" disabled={state.isMutating} onClick={() => setOpen(false)}>キャンセル</button><button type="button" disabled={state.isMutating || selected.length === 0} onClick={() => void submit()}>{state.isMutating ? "保存中…" : "保存"}</button></div>
    </section></div> : null}
  </section>;
}
