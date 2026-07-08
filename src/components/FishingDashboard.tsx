"use client";

import { useMemo, useState } from "react";
import { mockFishingReports } from "@/data/mockFishingReports";
import { fishSpeciesNames, type FishSpeciesName } from "@/domain/fishing";
import { FishingMap } from "./FishingMap";

const disclaimer = "釣れそう度は、取得可能な釣果情報と簡易ルールに基づく参考情報です。実際の釣果を保証するものではありません。";

export function FishingDashboard() {
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpeciesName | "all">("all");
  const [selectedArea, setSelectedArea] = useState<string | "all">("all");
  const speciesCounts = useMemo(() => {
    return fishSpeciesNames.map((species) => ({
      species,
      count: mockFishingReports.filter((report) => report.species === species).length,
    }));
  }, []);
  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    mockFishingReports.forEach((report) => {
      counts.set(report.areaName, (counts.get(report.areaName) ?? 0) + 1);
    });

    return Array.from(counts, ([areaName, count]) => ({ areaName, count }));
  }, []);

  const reports = useMemo(
    () => mockFishingReports.filter((report) => {
      const matchesSpecies = selectedSpecies === "all" || report.species === selectedSpecies;
      const matchesArea = selectedArea === "all" || report.areaName === selectedArea;

      return matchesSpecies && matchesArea;
    }),
    [selectedArea, selectedSpecies],
  );

  const speciesLabel = selectedSpecies === "all" ? "すべての魚種" : selectedSpecies;
  const areaLabel = selectedArea === "all" ? "すべてのエリア" : selectedArea;

  return (
    <section className="dashboard" id="map">
      <div className="panel filters">
        <div>
          <p className="eyebrow">MVP v0.1 / mock only</p>
          <h2>糸島西岸〜平戸方面のモック釣果マップ</h2>
          <p className="muted">魚種とエリアで絞り込み、地図マーカーと一覧で釣れそう度の根拠を確認できます。</p>
          <p className="resultSummary" aria-live="polite">
            魚種: {speciesLabel} / エリア: {areaLabel} / 全{mockFishingReports.length}件中 {reports.length}件を表示中
          </p>
        </div>
        <div className="filterControls" aria-label="釣果フィルタ">
          <div className="filterHeader">
            <span>魚種フィルタ</span>
            <span className="filterHint">タップして絞り込み</span>
          </div>
          <div className="speciesChips" role="group" aria-label="表示する魚種を選択">
            <button
              type="button"
              className={selectedSpecies === "all" ? "speciesChip active" : "speciesChip"}
              aria-pressed={selectedSpecies === "all"}
              onClick={() => setSelectedSpecies("all")}
            >
              <span>すべて</span>
              <strong>{mockFishingReports.length}</strong>
            </button>
            {speciesCounts.map(({ species, count }) => (
              <button
                type="button"
                className={selectedSpecies === species ? "speciesChip active" : "speciesChip"}
                aria-pressed={selectedSpecies === species}
                key={species}
                onClick={() => setSelectedSpecies(species)}
              >
                <span>{species}</span>
                <strong>{count}</strong>
              </button>
            ))}
          </div>

          <div className="filterHeader areaFilterHeader">
            <span>エリアフィルタ</span>
            <span className="filterHint">魚種とAND条件</span>
          </div>
          <div className="speciesChips areaChips" role="group" aria-label="表示するエリアを選択">
            <button
              type="button"
              className={selectedArea === "all" ? "speciesChip active" : "speciesChip"}
              aria-pressed={selectedArea === "all"}
              onClick={() => setSelectedArea("all")}
            >
              <span>すべてのエリア</span>
              <strong>{mockFishingReports.length}</strong>
            </button>
            {areaCounts.map(({ areaName, count }) => (
              <button
                type="button"
                className={selectedArea === areaName ? "speciesChip active" : "speciesChip"}
                aria-pressed={selectedArea === areaName}
                key={areaName}
                onClick={() => setSelectedArea(areaName)}
              >
                <span>{areaName}</span>
                <strong>{count}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mapSection">
        <FishingMap reports={reports} />
      </div>

      <p className="notice">{disclaimer}</p>

      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Catch reports</p>
          <h2>釣果情報一覧</h2>
        </div>
        <p className="muted">スコア、魚種、釣り方、根拠をカードごとに確認できます。</p>
      </div>

      <div className="cards" id="reports">
        {reports.length === 0 ? (
          <div className="emptyState" role="status">
            <p className="eyebrow">No reports</p>
            <h3>該当する釣果情報がありません</h3>
            <p>魚種フィルタやエリアフィルタを「すべて」に戻すか、別の条件を選択してください。MVPではモックデータのみを表示しています。</p>
          </div>
        ) : reports.map((report) => (
          <article className="card" key={report.id}>
            <div className="cardHeader">
              <div>
                <p className="eyebrow">{report.areaName}</p>
                <h3>{report.spotName}</h3>
              </div>
              <div className="scoreBox" aria-label={`釣れそう度 ${report.forecast.score}点`}>
                <span>釣れそう度</span>
                <strong className="score">{report.forecast.score}<span>点</span></strong>
              </div>
            </div>

            <div className="cardSummary">
              <span>{report.species}</span>
              <span>{report.method}</span>
              <span>{report.catchCount}匹 / {report.sizeCm}cm</span>
            </div>

            <dl className="facts">
              <div><dt>日付</dt><dd>{report.reportDate}</dd></div>
              <div><dt>場所</dt><dd>{report.areaName}</dd></div>
              <div><dt>魚種</dt><dd>{report.species}</dd></div>
              <div><dt>釣果数</dt><dd>{report.catchCount}</dd></div>
              <div><dt>サイズ</dt><dd>{report.sizeCm}cm</dd></div>
              <div><dt>釣り方</dt><dd>{report.method}</dd></div>
              <div className="sourceFact"><dt>出典</dt><dd><a href={report.sourceUrl}>{report.sourceName}</a></dd></div>
            </dl>

            <div className="reasonBlock">
              <p>スコア根拠</p>
              <ul className="reasons">{report.forecast.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
