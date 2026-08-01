"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prepareRecordPhoto, RECORD_PHOTO_LIMIT, type PreparedRecordPhoto, type RecordPhoto, type RecordPhotoTargetType } from "@/domain/recordPhoto";
import { deleteRecordPhoto, fetchRecordPhotos, isRecordPhotoBackendMissing, uploadRecordPhotos } from "@/lib/recordPhotoRepository";
import styles from "./RecordPhotoEditor.module.css";

export function RecordPhotoEditor({ targetType, targetId, enabled, pending, onPendingChange, editable = true }: { targetType: RecordPhotoTargetType; targetId?: string; enabled: boolean; pending?: PreparedRecordPhoto[]; onPendingChange?: (photos: PreparedRecordPhoto[]) => void; editable?: boolean }) {
  const [saved, setSaved] = useState<RecordPhoto[]>([]);
  const [localPending, setLocalPending] = useState<PreparedRecordPhoto[]>([]);
  const selected = pending ?? localPending;
  const setSelected = onPendingChange ?? setLocalPending;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    if (!enabled || !targetId) { setSaved([]); return; }
    try { setSaved(await fetchRecordPhotos(targetType, targetId)); setError(null); }
    catch (value) { setSaved([]); setError(isRecordPhotoBackendMissing(value) ? "写真機能は準備中です。本文は通常どおり利用できます。" : "写真を取得できませんでした。"); }
  }, [enabled, targetId, targetType]);
  useEffect(() => { void load(); }, [load]);

  const choose = async (files: FileList | null) => {
    if (!files) return;
    if (saved.length + selected.length + files.length > RECORD_PHOTO_LIMIT) { setError("写真は1記録につき最大3枚です。"); return; }
    setBusy(true); setError(null);
    try {
      const prepared = await Promise.all([...files].map(prepareRecordPhoto));
      if (targetId) {
        const availableOrders = [0, 1, 2].filter((order) => !saved.some((photo) => photo.sortOrder === order));
        for (const [index, photo] of prepared.entries()) await uploadRecordPhotos(targetType, targetId, [photo], availableOrders[index]);
        prepared.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)); await load();
      }
      else setSelected([...selected, ...prepared]);
    } catch (value) { setError(value instanceof Error ? value.message : "写真を準備できませんでした。"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  const removeSaved = async (photo: RecordPhoto) => {
    if (!confirm("この写真を削除しますか？")) return;
    setBusy(true); setError(null);
    try { await deleteRecordPhoto(photo); setSaved((current) => current.filter((item) => item.id !== photo.id)); }
    catch { setError("写真を削除できませんでした。再試行してください。"); }
    finally { setBusy(false); }
  };
  const removePending = (photo: PreparedRecordPhoto) => { URL.revokeObjectURL(photo.previewUrl); setSelected(selected.filter((item) => item.id !== photo.id)); };
  if (!enabled) return <p className={styles.notice}>写真はログインしてSupabaseへ保存した記録で利用できます。ブラウザ保存の本文は引き続き編集できます。</p>;
  return <div className={styles.editor}>
    <div className={styles.heading}><strong>写真</strong><span>{saved.length + selected.length}/3枚</span></div>
    <div className={styles.grid}>{saved.map((photo) => <figure key={photo.id}><button type="button" onClick={() => setLightbox(photo.signedUrl ?? null)}><img src={photo.signedUrl} alt="記録写真" loading="lazy" /></button>{editable ? <button className={styles.remove} type="button" disabled={busy} onClick={() => void removeSaved(photo)}>削除</button> : null}</figure>)}{selected.map((photo) => <figure key={photo.id}><button type="button" onClick={() => setLightbox(photo.previewUrl)}><img src={photo.previewUrl} alt="追加予定の写真" /></button><span className={styles.pending}>保存前</span><button className={styles.remove} type="button" disabled={busy} onClick={() => removePending(photo)}>削除</button></figure>)}</div>
    {editable && saved.length + selected.length < RECORD_PHOTO_LIMIT ? <><input ref={input} className={styles.input} type="file" accept="image/*" multiple onChange={(event) => void choose(event.target.files)} /><button type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? "圧縮・アップロード中…" : "写真を追加"}</button></> : null}
    <small>長辺1280px以下・WebP・450KiB以下へ端末内で変換し、EXIF/GPS情報は保持しません。</small>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {lightbox ? <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="写真を拡大表示" onClick={() => setLightbox(null)}><button type="button" aria-label="拡大表示を閉じる">×</button><img src={lightbox} alt="拡大した記録写真" /></div> : null}
  </div>;
}
