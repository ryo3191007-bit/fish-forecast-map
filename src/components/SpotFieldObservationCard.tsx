"use client";

import { useMemo, useState } from "react";
import type { SpotDetailUiPresentation } from "@/domain/spotDetailUiPresentation";
import {
  buildSaveSpotFieldObservationInput,
  createSpotFieldObservationDraft,
  formatSpotFieldObservationDate,
  formatSpotFieldObservationValue,
  getTodayInJapan,
  spotFieldObservationConfigs,
  type SaveSpotFieldObservationInput,
  type SpotFieldObservation,
  type SpotFieldObservationDraft,
} from "@/domain/spotFieldObservation";
import type { SpotFieldObservationStatus } from "@/hooks/useSpotFieldObservations";
import styles from "./SpotFieldObservationCard.module.css";

const confidenceLabel = { high: "高", medium: "中", low: "低" } as const;

type Props = {
  spotId: string;
  itemKey: string;
  label: string;
  icon: string;
  research: SpotDetailUiPresentation;
  observation: SpotFieldObservation | undefined;
  status: SpotFieldObservationStatus;
  isMutating: boolean;
  error: string | null;
  speciesOptions?: readonly string[];
  onSave: (input: SaveSpotFieldObservationInput) => Promise<boolean>;
  onDelete: (observationId: string) => Promise<boolean>;
};

export function SpotFieldObservationCard({
  spotId,
  itemKey,
  label,
  icon,
  research,
  observation,
  status,
  isMutating,
  error,
  speciesOptions,
  onSave,
  onDelete,
}: Props) {
  const config = spotFieldObservationConfigs[itemKey];
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<SpotFieldObservationDraft>(() => createSpotFieldObservationDraft(observation));
  const [formError, setFormError] = useState<string | null>(null);
  const options = itemKey === "target_species" ? speciesOptions ?? [] : config?.options ?? [];

  const openEditor = () => {
    setDraft(createSpotFieldObservationDraft(observation));
    setFormError(null);
    setIsOpen(true);
  };

  const closeEditor = () => {
    if (isMutating) return;
    setIsOpen(false);
    setFormError(null);
  };

  const submit = async () => {
    if (!config) return;
    const input = buildSaveSpotFieldObservationInput(spotId, itemKey, config, draft);
    if (!input) {
      setFormError("確認日と確認内容を入力してください。");
      return;
    }
    const saved = await onSave(input);
    if (saved) setIsOpen(false);
    else setFormError("保存できませんでした。入力内容と通信状態を確認してください。");
  };

  const remove = async () => {
    if (!observation || !window.confirm("この実地調査情報を削除しますか？")) return;
    const deleted = await onDelete(observation.id);
    if (deleted) setIsOpen(false);
    else setFormError("削除できませんでした。");
  };

  const researchConfidence = research.confidence ? `信憑性: ${confidenceLabel[research.confidence]}` : null;

  return <div>
    <dt><span className="detailIcon" aria-hidden="true">{icon}</span>{label}</dt>
    <dd className={styles.content}>
      <section className={styles.section} aria-label={`${label}の事前調査`}>
        <strong className={styles.sectionTitle}>事前調査</strong>
        <p className={styles.value}>{research.text}{researchConfidence ? <span className={styles.confidence}>{researchConfidence}</span> : null}</p>
      </section>
      <hr className={styles.divider} />
      <section className={styles.section} aria-label={`${label}の実地調査`}>
        <strong className={styles.sectionTitle}>実地調査</strong>
        <FieldObservationDisplay status={status} observation={observation} />
        {error ? <p className={styles.errorText}>{error}</p> : null}
        {status === "ready" ? <div className={styles.actionRow}>
          <button type="button" className={observation ? styles.editButton : styles.addButton} disabled={isMutating || !config} onClick={openEditor}>
            {observation ? "編集" : "＋ 追加"}
          </button>
        </div> : null}
      </section>
    </dd>
    {isOpen && config ? <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={`field-observation-${itemKey}`}>
        <header className={styles.modalHeader}>
          <h3 id={`field-observation-${itemKey}`}>{label}の実地調査</h3>
          <button type="button" className={styles.closeButton} aria-label="閉じる" disabled={isMutating} onClick={closeEditor}>×</button>
        </header>
        <div className={styles.form}>
          {config.safetyNotice ? <p className={styles.safetyNotice}>{config.safetyNotice}</p> : null}
          <label className={styles.field}>
            確認日
            <input type="date" required max={getTodayInJapan()} value={draft.checkedAt} onChange={(event) => setDraft((current) => ({ ...current, checkedAt: event.target.value }))} />
          </label>
          <label className={styles.choice}>
            <input type="checkbox" checked={draft.isUnknown} onChange={(event) => setDraft((current) => ({ ...current, isUnknown: event.target.checked }))} />
            確認できず
          </label>
          {!draft.isUnknown ? <ObservationValueInput config={config} options={options} draft={draft} onChange={setDraft} /> : null}
          <label className={styles.field}>
            メモ（任意）
            <textarea maxLength={1000} value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="現地で確認した補足があれば入力" />
          </label>
          {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} disabled={isMutating} onClick={closeEditor}>キャンセル</button>
            <button type="button" className={styles.saveButton} disabled={isMutating} onClick={() => void submit()}>{isMutating ? "保存中…" : "保存"}</button>
            {observation ? <button type="button" className={styles.deleteButton} disabled={isMutating} onClick={() => void remove()}>削除</button> : null}
          </div>
        </div>
      </section>
    </div> : null}
  </div>;
}

function FieldObservationDisplay({ status, observation }: { status: SpotFieldObservationStatus; observation: SpotFieldObservation | undefined }) {
  if (status === "loading") return <p className={styles.statusText}>取得中…</p>;
  if (status === "signed-out") return <p className={styles.statusText}>ログインすると実地調査を登録できます。</p>;
  if (status === "unavailable") return <p className={styles.statusText}>実地調査を利用できません。</p>;
  if (status === "failed") return <p className={styles.statusText}>実地調査情報を取得できませんでした。</p>;
  if (!observation) return <p className={styles.statusText}>まだ登録されていません</p>;
  return <>
    <p className={styles.date}>確認日:{formatSpotFieldObservationDate(observation.checkedAt)}</p>
    <p className={styles.value}>{formatSpotFieldObservationValue(observation)}</p>
    {observation.note ? <p className={styles.note}>{observation.note}</p> : null}
  </>;
}

function ObservationValueInput({
  config,
  options,
  draft,
  onChange,
}: {
  config: (typeof spotFieldObservationConfigs)[string];
  options: readonly string[];
  draft: SpotFieldObservationDraft;
  onChange: React.Dispatch<React.SetStateAction<SpotFieldObservationDraft>>;
}) {
  const sortedOptions = useMemo(() => [...options], [options]);
  if (config.kind === "single") {
    return <fieldset className={styles.field}>
      <legend>確認内容</legend>
      <div className={styles.choiceGrid}>{sortedOptions.map((option) => <label className={styles.choice} key={option}>
        <input type="radio" name="field-observation-value" value={option} checked={draft.textValue === option} onChange={() => onChange((current) => ({ ...current, textValue: option }))} />
        {option}
      </label>)}</div>
    </fieldset>;
  }
  if (config.kind === "multi") {
    return <fieldset className={styles.field}>
      <legend>確認内容</legend>
      <div className={styles.choiceGrid}>{sortedOptions.map((option) => <label className={styles.choice} key={option}>
        <input type="checkbox" checked={draft.listValue.includes(option)} onChange={(event) => onChange((current) => ({
          ...current,
          listValue: event.target.checked ? [...current.listValue, option] : current.listValue.filter((value) => value !== option),
        }))} />
        {option}
      </label>)}</div>
    </fieldset>;
  }
  if (config.kind === "number") {
    return <label className={styles.field}>
      確認値{config.unit ? `（${config.unit}）` : ""}
      <input type="number" min="0" step="0.1" value={draft.numberValue} onChange={(event) => onChange((current) => ({ ...current, numberValue: event.target.value }))} />
    </label>;
  }
  return <label className={styles.field}>
    確認内容
    <textarea maxLength={config.maxLength ?? 300} value={draft.textValue} onChange={(event) => onChange((current) => ({ ...current, textValue: event.target.value }))} placeholder={config.placeholder} />
  </label>;
}
