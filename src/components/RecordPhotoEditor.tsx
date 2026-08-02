"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyDiagnosticText, initialDiagnosticCopyState, transitionDiagnosticCopyState } from "@/domain/diagnosticClipboard";
import { formatRecordPhotoDiagnostic, prepareRecordPhoto, RECORD_PHOTO_LIMIT, RecordPhotoDecodeError, type PreparedRecordPhoto, type RecordPhoto, type RecordPhotoTargetType } from "@/domain/recordPhoto";
import { mergePendingRecordPhotos, remainingRecordPhotos } from "@/domain/recordPhotoUpload";
import { checkRecordPhotoBackend, deleteRecordPhoto, fetchRecordPhotos, isRecordPhotoBackendMissing, reconcileRecordPhotoObjects, RecordPhotoBatchError, uploadRecordPhotos } from "@/lib/recordPhotoRepository";
import styles from "./RecordPhotoEditor.module.css";

export function RecordPhotoEditor({ targetType, targetId, enabled, pending, onPendingChange, editable = true }: { targetType: RecordPhotoTargetType; targetId?: string; enabled: boolean; pending?: PreparedRecordPhoto[]; onPendingChange?: (photos: PreparedRecordPhoto[]) => void; editable?: boolean }) {
  const [saved, setSaved] = useState<RecordPhoto[]>([]);
  const [localPending, setLocalPending] = useState<PreparedRecordPhoto[]>([]);
  const selected = pending ?? localPending;
  const setSelected = onPendingChange ?? setLocalPending;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [copyState, setCopyState] = useState(initialDiagnosticCopyState);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [backendReady, setBackendReady] = useState(false);
  const [backendChecked, setBackendChecked] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const diagnosticText = useRef<HTMLTextAreaElement>(null);
  const ownedPreviewUrls = useRef(new Set<string>());
  const revokePreview = useCallback((url: string | undefined) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    ownedPreviewUrls.current.delete(url);
  }, []);
  useEffect(() => () => {
    ownedPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    ownedPreviewUrls.current.clear();
  }, []);
  const load = useCallback(async () => {
    if (!enabled) { setSaved([]); setBackendReady(false); setBackendChecked(true); return; }
    try {
      const ready = await checkRecordPhotoBackend(); setBackendReady(ready); setBackendChecked(true);
      if (!ready) { setSaved([]); setError("写真機能は準備中です。本文は通常どおり利用できます。"); return; }
      if (!targetId) { setSaved([]); setError(null); return; }
      await reconcileRecordPhotoObjects(targetType, targetId);
      setSaved(await fetchRecordPhotos(targetType, targetId)); setError(null);
    }
    catch (value) { setSaved([]); setError(isRecordPhotoBackendMissing(value) ? "写真機能は準備中です。本文は通常どおり利用できます。" : "写真を取得できませんでした。"); }
  }, [enabled, targetId, targetType]);
  useEffect(() => { void load(); }, [load]);

  const choose = async (files: FileList | null) => {
    if (!files) return;
    if (saved.length + selected.length + files.length > RECORD_PHOTO_LIMIT) { setError("写真は1記録につき最大3枚です。"); return; }
    setBusy(true); setError(null); setDiagnostic(null); setCopyState(initialDiagnosticCopyState);
    const prepared: PreparedRecordPhoto[] = [];
    let retainedForRetry = false;
    try {
      for (const file of [...files]) {
        const photo = await prepareRecordPhoto(file);
        prepared.push(photo);
        ownedPreviewUrls.current.add(photo.previewUrl);
      }
      if (targetId) {
        try {
          await uploadRecordPhotos(targetType, targetId, prepared);
          prepared.forEach((photo) => revokePreview(photo.previewUrl)); await load();
        } catch (value) {
          const completed = value instanceof RecordPhotoBatchError ? value.completedPhotoIds : [];
          completed.forEach((id) => revokePreview(prepared.find((photo) => photo.id === id)?.previewUrl));
          setSelected(mergePendingRecordPhotos(selected, prepared, completed));
          retainedForRetry = true;
          if (completed.length) await load();
          throw value;
        }
      }
      else { setSelected([...selected, ...prepared]); retainedForRetry = true; }
    } catch (value) {
      if (!retainedForRetry) prepared.forEach((photo) => revokePreview(photo.previewUrl));
      if (value instanceof RecordPhotoBatchError && value.completedPhotoIds.length) await load();
      setError(value instanceof Error ? value.message : "写真を準備できませんでした。");
      if (value instanceof RecordPhotoDecodeError) setDiagnostic(formatRecordPhotoDiagnostic(value.diagnostic));
    }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  const retryPending = async () => {
    if (!targetId || !selected.length) return;
    setBusy(true); setError(null);
    try {
      const completed = await uploadRecordPhotos(targetType, targetId, selected);
      completed.forEach((id) => revokePreview(selected.find((photo) => photo.id === id)?.previewUrl));
      setSelected([]); await load();
    } catch (value) {
      const completed = value instanceof RecordPhotoBatchError ? value.completedPhotoIds : [];
      completed.forEach((id) => revokePreview(selected.find((photo) => photo.id === id)?.previewUrl));
      setSelected(remainingRecordPhotos(selected, completed));
      if (completed.length) await load();
      setError(value instanceof Error ? value.message : "写真を保存できませんでした。");
    } finally { setBusy(false); }
  };
  const removeSaved = async (photo: RecordPhoto) => {
    if (!confirm("この写真を削除しますか？")) return;
    setBusy(true); setError(null);
    try { await deleteRecordPhoto(photo); setSaved((current) => current.filter((item) => item.id !== photo.id)); }
    catch { setError("写真を削除できませんでした。再試行してください。"); }
    finally { setBusy(false); }
  };
  const removePending = (photo: PreparedRecordPhoto) => { revokePreview(photo.previewUrl); setSelected(selected.filter((item) => item.id !== photo.id)); };
  const copyDiagnostic = async () => {
    if (!diagnostic) return;
    const result = await copyDiagnosticText(diagnostic, typeof navigator === "undefined" ? undefined : navigator.clipboard);
    setCopyState((state) => transitionDiagnosticCopyState(state, result));
  };
  const selectDiagnostic = () => {
    try { diagnosticText.current?.focus(); diagnosticText.current?.select(); setCopyState((state) => transitionDiagnosticCopyState(state, "selection-success")); }
    catch { setCopyState((state) => transitionDiagnosticCopyState(state, "selection-failed")); }
  };
  if (!enabled) return <p className={styles.notice}>写真はログインしてSupabaseへ保存した記録で利用できます。ブラウザ保存の本文は引き続き編集できます。</p>;
  const photoDisabled = !backendChecked || !backendReady;
  return <div className={styles.editor}>
    <div className={styles.heading}><strong>写真</strong><span>{saved.length + selected.length}/3枚</span></div>
    <div className={styles.grid}>{saved.map((photo) => <figure key={photo.id}>{photo.signedUrl ? <button type="button" onClick={() => setLightbox(photo.signedUrl ?? null)}><img src={photo.signedUrl} alt="記録写真" loading="lazy" /></button> : <div className={styles.stale}>画像を取得できません<br />削除して再追加できます</div>}{editable ? <button className={styles.remove} type="button" disabled={busy || photoDisabled} onClick={() => void removeSaved(photo)}>削除</button> : null}</figure>)}{selected.map((photo) => <figure key={photo.id}><button type="button" onClick={() => setLightbox(photo.previewUrl)}><img src={photo.previewUrl} alt="追加予定の写真" /></button><span className={styles.pending}>保存前</span><button className={styles.remove} type="button" disabled={busy} onClick={() => removePending(photo)}>削除</button></figure>)}</div>
    {targetId && selected.length ? <button type="button" disabled={busy || photoDisabled} onClick={() => void retryPending()}>未完了の写真を再試行</button> : null}
    {editable && saved.length + selected.length < RECORD_PHOTO_LIMIT ? <><input ref={input} className={styles.input} type="file" accept="image/*" multiple disabled={photoDisabled || selected.length > 0} onChange={(event) => void choose(event.target.files)} /><button type="button" disabled={busy || photoDisabled || selected.length > 0} onClick={() => input.current?.click()}>{!backendChecked ? "写真機能を確認中…" : selected.length ? "未完了の写真を先に再試行" : busy ? "圧縮・アップロード中…" : "写真を追加"}</button></> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {diagnostic ? <div className={styles.diagnostic}>
      <button type="button" onClick={() => void copyDiagnostic()}>診断情報をコピー</button>
      {copyState.result === "success" ? <p role="status">診断情報をコピーしました。</p> : null}
      {copyState.result === "fallback" ? <div role="dialog" aria-modal="false" aria-label="診断情報を手動コピー"><p role="status">自動コピーを利用できません。下の診断情報を選択して手動でコピーしてください。</p><textarea ref={diagnosticText} readOnly value={diagnostic} aria-label="コピーする診断情報" /><button type="button" onClick={selectDiagnostic}>診断情報をすべて選択</button>{copyState.selectionFailed ? <p className={styles.error} role="alert">診断情報を選択できませんでした。下の欄を長押しして手動で選択してください。</p> : null}</div> : null}
    </div> : null}
    {lightbox ? <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="写真を拡大表示" onClick={() => setLightbox(null)}><button type="button" aria-label="拡大表示を閉じる">×</button><img src={lightbox} alt="拡大した記録写真" /></div> : null}
  </div>;
}
