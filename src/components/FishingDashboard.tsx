"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fishingSpots } from "@/data/fishingSpots";
import { mockFishingReports } from "@/data/mockFishingReports";
import { fishSpeciesNames, type FishSpeciesName } from "@/domain/fishing";
import type { FishingEnvironment } from "@/domain/environment";
import { fetchFishingEnvironment } from "@/services/openMeteo";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { FishingMap } from "./FishingMap";

const disclaimer = "釣れそう度は、取得可能な釣果情報と簡易ルールに基づく参考情報です。実際の釣果を保証するものではありません。";

type SortOption = "scoreDesc" | "dateDesc" | "dateAsc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "scoreDesc", label: "釣れそう度が高い順" },
  { value: "dateDesc", label: "日付が新しい順" },
  { value: "dateAsc", label: "日付が古い順" },
];

export function FishingDashboard() {
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpeciesName | "all">("all");
  const [selectedArea, setSelectedArea] = useState<string | "all">("all");
  const [selectedSort, setSelectedSort] = useState<SortOption>("scoreDesc");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [environment, setEnvironment] = useState<FishingEnvironment | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [isEnvironmentLoading, setIsEnvironmentLoading] = useState(false);
  const environmentCacheRef = useRef(new Map<string, FishingEnvironment>());
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

  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  const reports = useMemo(() => {
    const filteredReports = mockFishingReports.filter((report) => {
      const matchesSpecies = selectedSpecies === "all" || report.species === selectedSpecies;
      const matchesArea = selectedArea === "all" || report.areaName === selectedArea;
      const searchableText = [
        report.spotName,
        report.areaName,
        report.species,
        report.method,
        report.sourceName,
        ...report.forecast.reasons,
      ].join(" ").toLowerCase();
      const matchesKeyword = normalizedKeyword === "" || searchableText.includes(normalizedKeyword);

      return matchesSpecies && matchesArea && matchesKeyword;
    });

    return [...filteredReports].sort((a, b) => {
      if (selectedSort === "scoreDesc") return b.forecast.score - a.forecast.score;
      if (selectedSort === "dateDesc") return Date.parse(b.reportDate) - Date.parse(a.reportDate);
      return Date.parse(a.reportDate) - Date.parse(b.reportDate);
    });
  }, [normalizedKeyword, selectedArea, selectedSort, selectedSpecies]);

  const representativeReport = reports[0];

  useEffect(() => {
    if (!representativeReport) {
      setEnvironment(null);
      setEnvironmentError(null);
      setIsEnvironmentLoading(false);
      return;
    }

    const cacheKey = `${representativeReport.latitude},${representativeReport.longitude}`;
    const cachedEnvironment = environmentCacheRef.current.get(cacheKey);
    if (cachedEnvironment) {
      setEnvironment(cachedEnvironment);
      setEnvironmentError(null);
      setIsEnvironmentLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsEnvironmentLoading(true);
    setEnvironmentError(null);

    fetchFishingEnvironment(
      {
        spotName: representativeReport.spotName,
        latitude: representativeReport.latitude,
        longitude: representativeReport.longitude,
      },
      abortController.signal,
    )
      .then((nextEnvironment) => {
        environmentCacheRef.current.set(cacheKey, nextEnvironment);
        setEnvironment(nextEnvironment);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEnvironment(null);
        setEnvironmentError("Open-Meteoから環境データを取得できませんでした。");
      })
      .finally(() => {
        if (!abortController.signal.aborted) setIsEnvironmentLoading(false);
      });

    return () => abortController.abort();
  }, [representativeReport]);

  const speciesLabel = selectedSpecies === "all" ? "すべての魚種" : selectedSpecies;
  const areaLabel = selectedArea === "all" ? "すべてのエリア" : selectedArea;
  const sortLabel = sortOptions.find((option) => option.value === selectedSort)?.label ?? "釣れそう度が高い順";
  const searchLabel = normalizedKeyword === "" ? "指定なし" : `「${searchKeyword.trim()}」`;
  const isInitialState = selectedSpecies === "all" && selectedArea === "all" && selectedSort === "scoreDesc" && searchKeyword.length === 0;
  const resetFilters = () => {
    setSelectedSpecies("all");
    setSelectedArea("all");
    setSearchKeyword("");
    setSelectedSort("scoreDesc");
  };

  return (
    <section className="dashboard" id="map">
      <div className="panel filters">
        <div>
          <p className="eyebrow">MVP v0.1 / mock only</p>
          <h2>糸島西岸〜平戸方面のモック釣果マップ</h2>
          <p className="muted">魚種・エリア・キーワードで絞り込み、地図マーカーと一覧で釣れそう度の根拠を確認できます。</p>
          <p className="resultSummary" aria-live="polite">
            魚種: {speciesLabel} / エリア: {areaLabel} / キーワード: {searchLabel} / 並び順: {sortLabel} / 釣り場マスター{fishingSpots.length}地点 / 全{mockFishingReports.length}件中 {reports.length}件を表示中
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

          <div className="filterHeader keywordFilterHeader">
            <span>キーワード検索</span>
            <span className="filterHint">場所・魚種・釣り方など</span>
          </div>
          <div className="searchControl">
            <label className="sortSelectLabel" htmlFor="report-search">釣果情報を検索</label>
            <div className="searchInputRow">
              <input
                id="report-search"
                className="searchInput"
                type="search"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="例: 芥屋、アジ、サビキ"
              />
              <button
                type="button"
                className="clearSearchButton"
                onClick={() => setSearchKeyword("")}
                disabled={searchKeyword.length === 0}
              >
                クリア
              </button>
            </div>
          </div>

          <div className="filterHeader sortFilterHeader">
            <span>並び替え・リセット</span>
            <span className="filterHint">絞り込み後に適用</span>
          </div>
          <div className="sortResetGrid">
            <div className="sortControl">
              <label className="sortSelectLabel" htmlFor="report-sort">現在の並び順</label>
              <select
                id="report-sort"
                className="sortSelect"
                value={selectedSort}
                onChange={(event) => setSelectedSort(event.target.value as SortOption)}
              >
                {sortOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="resetFiltersButton"
              onClick={resetFilters}
              disabled={isInitialState}
              aria-disabled={isInitialState}
            >
              条件をリセット
            </button>
          </div>
        </div>
      </div>

      <div className="mapEnvironmentGrid">
        <div className="mapSection">
          <FishingMap reports={reports} />
        </div>
        <EnvironmentPanel
          report={representativeReport}
          environment={environment}
          isLoading={isEnvironmentLoading}
          error={environmentError}
        />
      </div>

      <p className="notice">{disclaimer}</p>

      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Catch reports</p>
          <h2>釣果情報一覧</h2>
        </div>
        <p className="muted">{sortLabel}で表示中です。スコア、魚種、釣り方、根拠をカードごとに確認できます。</p>
      </div>

      <div className="cards" id="reports">
        {reports.length === 0 ? (
          <div className="emptyState" role="status">
            <p className="eyebrow">No reports</p>
            <h3>該当する釣果情報がありません</h3>
            <p>魚種・エリア・キーワード検索の条件を変更するか、「条件をリセット」で初期表示に戻してください。MVPではモックデータのみを表示しています。</p>
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

            <div className="cardSummary" aria-label="釣果概要">
              <span>魚種: {report.species}</span>
              <span>釣り方: {report.method}</span>
              <span>場所: {report.areaName}</span>
              <span>地点ID: {report.spotId}</span>
              <span>日付: {report.reportDate}</span>
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
