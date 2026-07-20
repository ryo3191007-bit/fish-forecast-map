"use client";

import { useMemo, useState } from "react";
import type { ScoreV2SpeciesResult } from "@/domain/scoreV2";
import { filterSpeciesResults, sortAllSpeciesResults } from "@/domain/spotEvaluationPresentation";

const confidenceLabel = { high: "高", medium: "中", low: "低" } as const;

type Props = {
  spotName: string;
  selectedTime: string | null;
  results: ScoreV2SpeciesResult[];
  onBack: () => void;
};

export function AllSpeciesEvaluation({ spotName, selectedTime, results, onBack }: Props) {
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => sortAllSpeciesResults(results), [results]);
  const displayed = useMemo(() => filterSpeciesResults(sorted, query), [sorted, query]);
  return <main className="allSpeciesScreen">
    <header className="allSpeciesHeader">
      <div className="allSpeciesHeaderTop">
        <button type="button" className="allSpeciesBack" aria-label="地点評価の評価タブへ戻る" onClick={onBack}>← 地点評価へ戻る</button>
        <div><p className="eyebrow">All species</p><h1>{spotName}</h1><p>評価日時: {selectedTime ? selectedTime.replace("T", " ") : "日時未選択"}</p></div>
      </div>
      <label htmlFor="all-species-search">魚種名検索</label>
      <input id="all-species-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例: イカ" autoComplete="off" />
    </header>
    <section className="allSpeciesList" aria-label="魚種評価一覧">
      {displayed.map((item) => <SpeciesEvaluation key={item.species} item={item} />)}
      {!displayed.length && <p className="allSpeciesEmpty" role="status">検索条件に一致する魚種はありません。</p>}
    </section>
  </main>;
}

function SpeciesEvaluation({ item }: { item: ScoreV2SpeciesResult }) {
  const noInformation = item.informationStatus === "no_information";
  const reasons = noInformation ? [] : item.reasons.slice(0, 2);
  return <article className="allSpeciesCard">
    <header><h2>{item.species}</h2><strong>{noInformation ? "情報なし" : item.overallScore === null ? "総合点未算出" : `総合点 ${item.overallScore}点`}</strong></header>
    {!noInformation && <>
      <p>地点相性 参考点: {item.spotCompatibilityScore === null ? "情報なし" : `${item.spotCompatibilityScore}点`}</p>
      <div className="confidenceSummary">
        <span>地点相性: {confidenceText(item.confidence.spot)}</span>
        <span>環境評価: {confidenceText(item.confidence.environment)}</span>
      </div>
      <p>{item.partialData ? "一部情報未反映" : "必要情報を反映"}</p>
      {reasons.length > 0 && <ul>{reasons.map((reason, index) => <li key={`${reason.label}-${index}`}>{reason.label}{reason.confidence ? `（信憑性: ${confidenceLabel[reason.confidence]}）` : ""}: {reason.displayNote}</li>)}</ul>}
      {!reasons.length && <p>総合評価に利用できる根拠が不足しています。</p>}
    </>}
  </article>;
}

function confidenceText(counts: { high: number; medium: number; low: number }) {
  return `高${counts.high}・中${counts.medium}・低${counts.low}`;
}
