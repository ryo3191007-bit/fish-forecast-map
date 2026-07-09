"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fishingSpots } from "@/data/fishingSpots";
import { mockFishingReports } from "@/data/mockFishingReports";
import { externalSources } from "@/data/externalSources";
import { fishSpeciesNames, type FishSpeciesName, type FishingReport } from "@/domain/fishing";
import type { FishingEnvironment } from "@/domain/environment";
import { fetchFishingEnvironment } from "@/services/openMeteo";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { FishingMap } from "./FishingMap";
import { ExternalCatchMemoSection } from "./ExternalCatchMemoSection";
import { useExternalCatchMemos } from "@/hooks/useExternalCatchMemos";
import type { ExternalCatchConfidence } from "@/domain/externalCatch";
import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";
import { applyExternalMemoScoreAdjustments } from "@/domain/externalMemoScore";

const disclaimer = "SCOREは、取得可能な釣果情報と簡易ルールに基づく参考情報です。実際の釣果を保証するものではありません。";

type SortOption = "scoreDesc" | "dateDesc" | "dateAsc";
type ReportView = "reports" | "areas";
type DataTypeFilter = "all" | "mock" | "external";
type LinkStatusFilter = "all" | "mapped" | "unlinked";
type ConfidenceFilter = "all" | ExternalCatchConfidence;

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "scoreDesc", label: "SCOREが高い順" },
  { value: "dateDesc", label: "日付が新しい順" },
  { value: "dateAsc", label: "日付が古い順" },
];

export function FishingDashboard() {
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpeciesName | "all">("all");
  const [selectedArea, setSelectedArea] = useState<string | "all">("all");
  const [selectedSort, setSelectedSort] = useState<SortOption>("scoreDesc");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [reportView, setReportView] = useState<ReportView>("reports");
  const [selectedDataType, setSelectedDataType] = useState<DataTypeFilter>("all");
  const [selectedSourceId, setSelectedSourceId] = useState<string | "all">("all");
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceFilter>("all");
  const [selectedLinkStatus, setSelectedLinkStatus] = useState<LinkStatusFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { memos: externalMemos, persistMemos, storageError } = useExternalCatchMemos();
  const [environmentSpotId, setEnvironmentSpotId] = useState(fishingSpots[0]?.id ?? "");
  const [environment, setEnvironment] = useState<FishingEnvironment | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [isEnvironmentLoading, setIsEnvironmentLoading] = useState(false);
  const environmentCacheRef = useRef(new Map<string, FishingEnvironment>());
  const speciesCounts = useMemo(() => {
    return fishSpeciesNames.map((species) => ({
      species,
      count: mockFishingReports.filter((report) => report.species === species).length + externalMemos.filter((memo) => memo.species === species).length,
    }));
  }, [externalMemos]);
  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    mockFishingReports.forEach((report) => {
      counts.set(report.areaName, (counts.get(report.areaName) ?? 0) + 1);
    });
    externalMemos.forEach((memo) => {
      counts.set(memo.areaName, (counts.get(memo.areaName) ?? 0) + 1);
    });

    return Array.from(counts, ([areaName, count]) => ({ areaName, count }));
  }, [externalMemos]);

  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  const adjustedMockFishingReports = useMemo(() => {
    return applyExternalMemoScoreAdjustments(mockFishingReports, externalMemos);
  }, [externalMemos]);

  const reports = useMemo(() => {
    const filteredReports = adjustedMockFishingReports.filter((report) => {
      const matchesSpecies = selectedSpecies === "all" || report.species === selectedSpecies;
      const matchesArea = selectedArea === "all" || report.areaName === selectedArea;
      const matchesDataType = selectedDataType !== "external";
      const matchesDate = (!startDate || report.reportDate >= startDate) && (!endDate || report.reportDate <= endDate);
      const searchableText = [report.spotName, report.areaName, report.species, report.method, report.sourceName, ...report.forecast.reasons].join(" ").toLowerCase();
      return matchesSpecies && matchesArea && matchesDataType && matchesDate && (normalizedKeyword === "" || searchableText.includes(normalizedKeyword));
    });
    return [...filteredReports].sort((a, b) => {
      if (selectedSort === "scoreDesc") return b.forecast.score - a.forecast.score;
      if (selectedSort === "dateDesc") return Date.parse(b.reportDate) - Date.parse(a.reportDate);
      return Date.parse(a.reportDate) - Date.parse(b.reportDate);
    });
  }, [adjustedMockFishingReports, endDate, normalizedKeyword, selectedArea, selectedDataType, selectedSort, selectedSpecies, startDate]);

  const filteredExternalMemos = useMemo(() => {
    const filteredMemos = externalMemos.filter((memo) => {
      const hasLinkedSpot = Boolean(memo.spotId && fishingSpots.some((spot) => spot.id === memo.spotId));
      const matchesSpecies = selectedSpecies === "all" || memo.species === selectedSpecies;
      const matchesArea = selectedArea === "all" || memo.areaName === selectedArea;
      const matchesDataType = selectedDataType !== "mock";
      const matchesSource = selectedSourceId === "all" || memo.sourceId === selectedSourceId;
      const matchesConfidence = selectedConfidence === "all" || memo.confidence === selectedConfidence;
      const matchesLink = selectedLinkStatus === "all" || (selectedLinkStatus === "mapped" ? hasLinkedSpot : !hasLinkedSpot);
      const matchesDate = (!startDate || memo.caughtDate >= startDate) && (!endDate || memo.caughtDate <= endDate);
      const searchableText = [memo.estimatedSpotName, memo.areaName, memo.species, memo.method, memo.sourceName, memo.userMemo].join(" ").toLowerCase();
      return matchesSpecies && matchesArea && matchesDataType && matchesSource && matchesConfidence && matchesLink && matchesDate && (normalizedKeyword === "" || searchableText.includes(normalizedKeyword));
    });
    return [...filteredMemos].sort((a, b) => {
      if (selectedSort === "dateAsc") return Date.parse(a.caughtDate) - Date.parse(b.caughtDate);
      return Date.parse(b.caughtDate) - Date.parse(a.caughtDate);
    });
  }, [endDate, externalMemos, normalizedKeyword, selectedArea, selectedConfidence, selectedDataType, selectedLinkStatus, selectedSort, selectedSourceId, selectedSpecies, startDate]);

  const areaEvaluations = useMemo(() => {
    const groupedReports = new Map<string, FishingReport[]>();
    reports.forEach((report) => {
      const key = report.spotName || report.areaName;
      groupedReports.set(key, [...(groupedReports.get(key) ?? []), report]);
    });

    return Array.from(groupedReports, ([placeName, placeReports]) => {
      const averageScore = Math.round(placeReports.reduce((total, report) => total + report.forecast.score, 0) / placeReports.length);
      const latestReport = [...placeReports].sort((a, b) => Date.parse(b.reportDate) - Date.parse(a.reportDate))[0];
      const representativeSpecies = Array.from(new Set(placeReports.map((report) => report.species))).slice(0, 3);
      const bestReason = [...placeReports].sort((a, b) => b.forecast.score - a.forecast.score)[0]?.forecast.reasons[0] ?? "既存のモック釣果から簡易集計しています。";

      return {
        placeName,
        areaName: latestReport.areaName,
        averageScore,
        representativeSpecies,
        latestReportDate: latestReport.reportDate,
        reportCount: placeReports.length,
        memo: bestReason,
        externalMemoCount: externalMemos.filter((memo) => memo.spotId && placeReports.some((report) => report.spotId === memo.spotId)).length,
      };
    }).sort((a, b) => {
      if (selectedSort === "dateDesc") return Date.parse(b.latestReportDate) - Date.parse(a.latestReportDate);
      if (selectedSort === "dateAsc") return Date.parse(a.latestReportDate) - Date.parse(b.latestReportDate);
      return b.averageScore - a.averageScore;
    });
  }, [externalMemos, reports, selectedSort]);

  const environmentSpot = useMemo(() => {
    return fishingSpots.find((spot) => spot.id === environmentSpotId) ?? fishingSpots[0];
  }, [environmentSpotId]);

  useEffect(() => {
    if (!environmentSpot) {
      setEnvironment(null);
      setEnvironmentError(null);
      setIsEnvironmentLoading(false);
      return;
    }

    const cacheKey = `${environmentSpot.latitude},${environmentSpot.longitude}`;
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
        spotName: environmentSpot.name,
        latitude: environmentSpot.latitude,
        longitude: environmentSpot.longitude,
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
  }, [environmentSpot]);

  const speciesLabel = selectedSpecies === "all" ? "すべての魚種" : selectedSpecies;
  const areaLabel = selectedArea === "all" ? "すべてのエリア" : selectedArea;
  const sortLabel = sortOptions.find((option) => option.value === selectedSort)?.label ?? "SCOREが高い順";
  const searchLabel = normalizedKeyword === "" ? "指定なし" : `「${searchKeyword.trim()}」`;
  const isInitialState = selectedSpecies === "all" && selectedArea === "all" && selectedSort === "scoreDesc" && searchKeyword.length === 0 && selectedDataType === "all" && selectedSourceId === "all" && selectedConfidence === "all" && selectedLinkStatus === "all" && startDate === "" && endDate === "";
  const resetFilters = () => {
    setSelectedSpecies("all");
    setSelectedArea("all");
    setSearchKeyword("");
    setSelectedSort("scoreDesc");
    setSelectedDataType("all");
    setSelectedSourceId("all");
    setSelectedConfidence("all");
    setSelectedLinkStatus("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <section className="dashboard" id="map">
      <div className="panel filters">
        <div>
          <p className="eyebrow">Post-MVP / mock + manual memo</p>
          <h2>糸島西岸〜平戸方面の釣果予報マップ</h2>
          <p className="muted">モック釣果と手動登録した外部釣果メモを、魚種・エリア・キーワードで絞り込み、地図マーカーと一覧で確認できます。</p>
          <p className="resultSummary" aria-live="polite">
            魚種: {speciesLabel} / エリア: {areaLabel} / キーワード: {searchLabel} / 並び順: {sortLabel} / 釣り場マスター{fishingSpots.length}地点 / 全{mockFishingReports.length + externalMemos.length}件中 {reports.length + filteredExternalMemos.length}件を表示中
          </p>
        </div>
      </div>

      <div className="mapEnvironmentGrid">
        <div className="mapSection">
          <FishingMap reports={reports} externalMemos={filteredExternalMemos} />
        </div>
        <EnvironmentPanel
          selectedSpot={environmentSpot}
          spots={fishingSpots}
          selectedSpotId={environmentSpotId}
          onSelectedSpotIdChange={setEnvironmentSpotId}
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

        <div className="filterControls reportFilters" aria-label="釣果フィルタ">
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
              <strong>{mockFishingReports.length + externalMemos.length}</strong>
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
              <strong>{mockFishingReports.length + externalMemos.length}</strong>
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

          <div className="filterHeader keywordFilterHeader">
            <span>外部メモ・期間フィルタ</span>
            <span className="filterHint">外部メモにも適用</span>
          </div>
          <div className="advancedFilterGrid">
            <label className="sortSelectLabel">データ種別<select className="sortSelect" value={selectedDataType} onChange={(event) => setSelectedDataType(event.target.value as DataTypeFilter)}><option value="all">すべて</option><option value="mock">モック釣果</option><option value="external">外部メモ</option></select></label>
            <label className="sortSelectLabel">外部メモの情報元<select className="sortSelect" value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}><option value="all">すべて</option>{externalSources.map((source) => <option key={source.sourceId} value={source.sourceId}>{source.sourceName}</option>)}</select></label>
            <label className="sortSelectLabel">信頼度<select className="sortSelect" value={selectedConfidence} onChange={(event) => setSelectedConfidence(event.target.value as ConfidenceFilter)}><option value="all">すべて</option><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
            <label className="sortSelectLabel">釣り場紐づけ<select className="sortSelect" value={selectedLinkStatus} onChange={(event) => setSelectedLinkStatus(event.target.value as LinkStatusFilter)}><option value="all">すべて</option><option value="mapped">地図表示あり</option><option value="unlinked">未紐づけ</option></select></label>
            <label className="sortSelectLabel">開始日<input className="searchInput" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className="sortSelectLabel">終了日<input className="searchInput" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
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


      <div className="reportViewBar" role="group" aria-label="釣果情報一覧の表示切替">
        <button type="button" className={reportView === "reports" ? "reportViewButton active" : "reportViewButton"} aria-pressed={reportView === "reports"} onClick={() => setReportView("reports")}>釣果一覧</button>
        <button type="button" className={reportView === "areas" ? "reportViewButton active" : "reportViewButton"} aria-pressed={reportView === "areas"} onClick={() => setReportView("areas")}>地点評価一覧</button>
      </div>

      {reportView === "reports" ? (
        <>
          <ExternalCatchMemoSection memos={externalMemos} onMemosChange={persistMemos} storageError={storageError} />
          <div className="cards" id="reports">
            {reports.length === 0 && filteredExternalMemos.length === 0 ? (
              <div className="emptyState" role="status">
                <p className="eyebrow">No reports</p>
                <h3>該当する釣果情報がありません</h3>
                <p>魚種・エリア・キーワード検索の条件を変更するか、「条件をリセット」で初期表示に戻してください。モック釣果と手動登録した外部釣果メモを表示対象にしています。外部メモ単体のSCOREは未計算です。条件に合うメモは既存地点SCOREへ参考反映されます。</p>
              </div>
            ) : <> {reports.map((report) => (
              <article className="card" key={report.id}>
                <div className="cardHeader"><div><p className="eyebrow">{report.areaName}</p><h3>{report.species} / {report.areaName}</h3><p className="muted">{report.spotName}</p></div><div className="scoreBox" aria-label={`SCORE ${report.forecast.score}点`}><span>SCORE</span><strong className="score">{report.forecast.score}<span>点</span></strong></div></div>
                <div className="cardSummary" aria-label="釣果概要"><span>魚種: {report.species}</span><span>釣り方: {report.method}</span><span>場所: {report.areaName}</span><span>地点ID: {report.spotId}</span><span>日付: {report.reportDate}</span><span>{report.catchCount}匹 / {report.sizeCm}cm</span></div>
                <dl className="facts"><div><dt>日付</dt><dd>{report.reportDate}</dd></div><div><dt>場所</dt><dd>{report.areaName}</dd></div><div><dt>魚種</dt><dd>{report.species}</dd></div><div><dt>釣果数</dt><dd>{report.catchCount}</dd></div><div><dt>サイズ</dt><dd>{report.sizeCm}cm</dd></div><div><dt>釣り方</dt><dd>{report.method}</dd></div><div className="sourceFact"><dt>出典</dt><dd><a href={report.sourceUrl}>{report.sourceName}</a></dd></div></dl>
                <div className="reasonBlock"><p>スコア根拠</p><ul className="reasons">{report.forecast.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
              </article>
            ))}
            {filteredExternalMemos.map((memo) => <ExternalMemoCard key={memo.id} memo={memo} />)}
          </>}
          </div>
        </>
      ) : (
        <div className="cards" id="reports">
          {areaEvaluations.length === 0 ? (
            <div className="emptyState" role="status"><p className="eyebrow">No areas</p><h3>該当する地点評価がありません</h3><p>フィルタ条件を変更してください。</p></div>
          ) : areaEvaluations.map((evaluation) => (
            <article className="card" key={`${evaluation.placeName}-${evaluation.areaName}`}>
              <div className="cardHeader"><div><p className="eyebrow">{evaluation.areaName}</p><h3>{evaluation.placeName}</h3></div><div className="scoreBox" aria-label={`平均SCORE ${evaluation.averageScore}点`}><span>平均SCORE</span><strong className="score">{evaluation.averageScore}<span>点</span></strong></div></div>
              <div className="cardSummary"><span>代表魚種: {evaluation.representativeSpecies.join(" / ")}</span><span>直近釣果日: {evaluation.latestReportDate}</span><span>釣果件数: {evaluation.reportCount}</span><span>外部メモ件数: {evaluation.externalMemoCount}（参考 / SCORE反映候補）</span></div>
              <dl className="facts"><div><dt>地点/エリア</dt><dd>{evaluation.placeName}</dd></div><div><dt>評価値</dt><dd>平均SCORE {evaluation.averageScore}点</dd></div><div><dt>代表魚種</dt><dd>{evaluation.representativeSpecies.join("、")}</dd></div><div><dt>直近釣果日</dt><dd>{evaluation.latestReportDate}</dd></div></dl>
              <div className="reasonBlock"><p>簡易メモ</p><p className="muted">{evaluation.memo}</p><p className="muted">条件に合う外部メモは、平均SCOREに使う既存地点SCOREへ参考反映しています。</p></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


function ExternalMemoCard({ memo }: { memo: ExternalCatchMemo }) {
  const linkedSpot = memo.spotId ? fishingSpots.find((spot) => spot.id === memo.spotId) : undefined;
  return (
    <article className="card externalMemoCard">
      <div className="cardHeader"><div><p className="eyebrow">外部メモ / 手動メモ</p><h3>{memo.species} / {memo.areaName}</h3><p className="muted">外部メモ単体のSCOREは未計算です。条件に合うメモは既存地点SCOREへ参考反映されます。</p></div><div className="scoreBox externalScoreBox"><span>SCORE</span><strong>未計算</strong></div></div>
      <div className="cardSummary"><span>外部メモ</span><span>釣果日: {memo.caughtDate}</span><span>推定地点: {memo.estimatedSpotName ?? "未入力"}</span><span>{linkedSpot ? `地図表示あり: ${linkedSpot.name}` : "未紐づけ / 地図未表示"}</span></div>
      <dl className="facts"><div><dt>魚種</dt><dd>{memo.species}</dd></div><div><dt>釣り方</dt><dd>{memo.method ?? "未入力"}</dd></div><div><dt>匹数</dt><dd>{memo.catchCount ?? "未入力"}</dd></div><div><dt>サイズ</dt><dd>{memo.sizeCm === undefined ? "未入力" : `${memo.sizeCm}cm`}</dd></div><div><dt>情報元名</dt><dd>{memo.sourceName}</dd></div><div><dt>信頼度</dt><dd>{memo.confidence}</dd></div><div><dt>釣り場マスター</dt><dd>{linkedSpot ? `${linkedSpot.name}に紐づけ` : "未紐づけ / 地図未表示"}</dd></div><div className="sourceFact"><dt>出典URL</dt><dd><a href={memo.sourceUrl} target="_blank" rel="noreferrer">別タブで開く</a></dd></div></dl>
    </article>
  );
}
