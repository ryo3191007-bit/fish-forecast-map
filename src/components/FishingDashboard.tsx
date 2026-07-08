"use client";

import { useMemo, useState } from "react";
import { mockFishingReports } from "@/data/mockFishingReports";
import { fishSpeciesNames, type FishSpeciesName } from "@/domain/fishing";
import { FishingMap } from "./FishingMap";

const disclaimer = "釣れそう度は、取得可能な釣果情報と簡易ルールに基づく参考情報です。実際の釣果を保証するものではありません。";

export function FishingDashboard() {
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpeciesName | "all">("all");
  const reports = useMemo(
    () => selectedSpecies === "all" ? mockFishingReports : mockFishingReports.filter((report) => report.species === selectedSpecies),
    [selectedSpecies],
  );

  return (
    <section className="dashboard" id="map">
      <div className="panel filters">
        <div>
          <p className="eyebrow">MVP v0.1 / mock only</p>
          <h2>糸島西岸〜平戸方面のモック釣果マップ</h2>
          <p className="muted">魚種で絞り込み、地図マーカーと一覧で釣れそう度の根拠を確認できます。</p>
          <p className="resultSummary" aria-live="polite">
            {selectedSpecies === "all" ? "すべての魚種" : selectedSpecies} / {reports.length}件を表示中
          </p>
        </div>
        <label>
          魚種フィルタ
          <select value={selectedSpecies} onChange={(event) => setSelectedSpecies(event.target.value as FishSpeciesName | "all")}>
            <option value="all">すべて</option>
            {fishSpeciesNames.map((species) => <option key={species} value={species}>{species}</option>)}
          </select>
        </label>
      </div>

      <FishingMap reports={reports} />
      <p className="notice">{disclaimer}</p>

      <div className="cards" id="reports">
        {reports.length === 0 ? (
          <div className="emptyState" role="status">
            <p className="eyebrow">No reports</p>
            <h3>該当する釣果情報がありません</h3>
            <p>魚種フィルタを「すべて」に戻すか、別の魚種を選択してください。MVPではモックデータのみを表示しています。</p>
          </div>
        ) : reports.map((report) => (
          <article className="card" key={report.id}>
            <div className="cardHeader">
              <div>
                <p className="eyebrow">{report.areaName}</p>
                <h3>{report.spotName}</h3>
              </div>
              <strong className="score">{report.forecast.score}<span>点</span></strong>
            </div>
            <dl className="facts">
              <div><dt>日付</dt><dd>{report.reportDate}</dd></div>
              <div><dt>魚種</dt><dd>{report.species}</dd></div>
              <div><dt>釣果数</dt><dd>{report.catchCount}</dd></div>
              <div><dt>サイズ</dt><dd>{report.sizeCm}cm</dd></div>
              <div><dt>釣り方</dt><dd>{report.method}</dd></div>
              <div><dt>出典</dt><dd><a href={report.sourceUrl}>{report.sourceName}</a></dd></div>
            </dl>
            <ul className="reasons">{report.forecast.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </article>
        ))}
      </div>
    </section>
  );
}
