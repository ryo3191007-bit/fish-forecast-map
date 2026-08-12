"use client";

import { useEffect, useState } from "react";
import type { ExternalCatchRecord } from "@/domain/externalCatch";
import { formatSpotFieldObservationDate, formatSpotFieldObservationValue, type SpotFieldReport, type SpotFieldReportTargetType } from "@/domain/spotFieldObservation";
import { fishingDetailItems, terrainDetailItems } from "@/domain/spotDetailUiPresentation";
import { fetchPublicCatchesForSpot, fetchPublicSpotFieldReports } from "@/lib/publicReadRepository";
import styles from "./UserSpotFieldReportSection.module.css";

const labels = new Map<string, string>([...fishingDetailItems, ...terrainDetailItems]);

export function PublicSpotActivity({ targetType, spotId, excludedReportIds = [], excludedCatchIds = [] }: { targetType: SpotFieldReportTargetType; spotId: string; excludedReportIds?: string[]; excludedCatchIds?: string[] }) {
  const [reports, setReports] = useState<SpotFieldReport[]>([]);
  const [catches, setCatches] = useState<ExternalCatchRecord[]>([]);
  const [failed, setFailed] = useState(false);
  const excludedKey = excludedReportIds.join(",");
  const excludedCatchKey = excludedCatchIds.join(",");
  useEffect(() => {
    let active = true; setFailed(false); setReports([]); setCatches([]);
    Promise.all([fetchPublicSpotFieldReports(targetType, spotId), fetchPublicCatchesForSpot(targetType, spotId)])
      .then(([nextReports, nextCatches]) => { if (active) { const excluded = new Set(excludedKey ? excludedKey.split(",") : []); const excludedCatches = new Set(excludedCatchKey ? excludedCatchKey.split(",") : []); setReports(nextReports.filter(({ id }) => !excluded.has(id))); setCatches(nextCatches.filter(({ id }) => !excludedCatches.has(id))); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [excludedCatchKey, excludedKey, spotId, targetType]);
  return <section className={styles.history} aria-label="公開された地点投稿">
    <h3>公開された現地情報</h3>
    {failed ? <p role="alert">公開情報を取得できませんでした。本人向け・基本地点情報は引き続き利用できます。</p> : null}
    {!failed && reports.length === 0 ? <p className={styles.empty}>公開された現地調査はまだありません。</p> : reports.map((report) => <article key={report.id}>
      <header><strong>確認日 {formatSpotFieldObservationDate(report.observedOn)}</strong><small>公開投稿</small></header>
      {report.summaryNote ? <p>{report.summaryNote}</p> : null}
      <dl>{report.values.map((value) => <div key={value.id}><dt>{labels.get(value.itemKey) ?? value.itemKey}</dt><dd>{formatSpotFieldObservationValue(value)}{value.note ? <small>{value.note}</small> : null}</dd></div>)}</dl>
    </article>)}
    <h3>この地点の公開釣果</h3>
    {!failed && catches.length === 0 ? <p className={styles.empty}>公開された釣果はまだありません。</p> : catches.map((record) => <article key={record.id}>
      <header><strong>{record.caughtDate}</strong><small>公開投稿</small></header>
      <p>{record.catchItems.map((item) => `${item.species}${item.catchCount === undefined ? "" : ` ${item.catchCount}匹`}${item.sizeCm === undefined ? "" : ` ${item.sizeCm}cm`}`).join(" / ")}</p>
    </article>)}
  </section>;
}
