"use client";

import { useEffect, useMemo, useState } from "react";
import { mockFishingReports } from "@/data/mockFishingReports";
import { fishSpeciesNames, type FishSpeciesName, type FishingReport } from "@/domain/fishing";
import type { FishingEnvironment } from "@/domain/environment";
import { fetchFishingEnvironment, readCachedFishingEnvironment } from "@/services/openMeteo";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { FishingMap } from "./FishingMap";
import { ExternalCatchMemoSection } from "./ExternalCatchMemoSection";
import { useExternalCatchMemos } from "@/hooks/useExternalCatchMemos";
import type { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { applyExternalMemoScoreAdjustments } from "@/domain/externalMemoScore";
import { getManualCatchMemos } from "@/domain/manualCatchMemos";
import { fetchMasterData, getStaticMasterData, type MasterDataFallbackReason, type MasterDataMeta, type MasterDataSet } from "@/lib/masterDataRepository";

const disclaimer = "SCOREは、取得可能な釣果情報と簡易ルールに基づく参考情報です。実際の釣果を保証するものではありません。";

type SortOption = "scoreDesc" | "dateDesc" | "dateAsc";
type ReportView = "reports" | "areas";
type MasterDataStatus = MasterDataMeta & { isLoading: boolean };

const reportSortOptions: { value: SortOption; label: string }[] = [
  { value: "dateDesc", label: "日付が新しい順" },
  { value: "dateAsc", label: "日付が古い順" },
];

const areaSortOptions: { value: SortOption; label: string }[] = [
  { value: "scoreDesc", label: "平均SCOREが高い順" },
  { value: "dateDesc", label: "日付が新しい順" },
  { value: "dateAsc", label: "日付が古い順" },
];

const fallbackReasonLabels: Record<MasterDataFallbackReason, string> = {
  "supabase-not-configured": "Supabase未設定のため静的データを使用",
  "supabase-error": "Supabaseから取得できないため静的データを使用",
  "empty-supabase-result": "Supabaseの有効データが0件のため静的データを使用",
};

function getFishSpeciesFilterNames(masterData: MasterDataSet): FishSpeciesName[] {
  const names = masterData.fishSpecies.map((species) => species.nameJa).filter((name): name is FishSpeciesName => fishSpeciesNames.includes(name));
  return names.length > 0 ? names : [...fishSpeciesNames];
}

type FishingDashboardProps = { auth: ReturnType<typeof useSupabaseAuth> };

export function FishingDashboard({ auth }: FishingDashboardProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpeciesName | "all">("all");
  const [selectedArea, setSelectedArea] = useState<string | "all">("all");
  const [selectedSort, setSelectedSort] = useState<SortOption>("dateDesc");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [reportView, setReportView] = useState<ReportView>("reports");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { memos: externalMemos, persistMemo, deleteMemo, migrateLocalMemosToSupabase, localMemoIds, storageError, memoStorageStatus } = useExternalCatchMemos(auth.status, auth.user);
  const [masterData, setMasterData] = useState<MasterDataSet>(() => getStaticMasterData());
  const [masterDataStatus, setMasterDataStatus] = useState<MasterDataStatus>({ source: "static-fallback", isLoading: true });
  const manualCatchMemos = useMemo(() => getManualCatchMemos(externalMemos), [externalMemos]);
  const fishingSpots = masterData.fishingSpots;
  const fishSpeciesFilterNames = useMemo(() => getFishSpeciesFilterNames(masterData), [masterData]);
  const [environmentSpotId, setEnvironmentSpotId] = useState(() => getStaticMasterData().fishingSpots[0]?.id ?? "");
  const [environment, setEnvironment] = useState<FishingEnvironment | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [isEnvironmentLoading, setIsEnvironmentLoading] = useState(false);
  useEffect(() => {
    let isActive = true;
    setMasterDataStatus((current) => ({ ...current, isLoading: true }));

    fetchMasterData()
      .then((result) => {
        if (!isActive) return;
        setMasterData(result.data);
        setMasterDataStatus({ ...result.meta, isLoading: false });
      })
      .catch(() => {
        if (!isActive) return;
        setMasterData(getStaticMasterData());
        setMasterDataStatus({ source: "static-fallback", fallbackReason: "supabase-error", isLoading: false });
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (fishingSpots.length === 0) {
      setEnvironmentSpotId("");
      return;
    }
    if (!fishingSpots.some((spot) => spot.id === environmentSpotId)) {
      setEnvironmentSpotId(fishingSpots[0].id);
    }
  }, [environmentSpotId, fishingSpots]);

  const speciesCounts = useMemo(() => {
    return fishSpeciesFilterNames.map((species) => ({
      species,
      count: manualCatchMemos.filter((memo) => memo.species === species).length,
    }));
  }, [fishSpeciesFilterNames, manualCatchMemos]);
  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    manualCatchMemos.forEach((memo) => {
      counts.set(memo.areaName, (counts.get(memo.areaName) ?? 0) + 1);
    });

    return Array.from(counts, ([areaName, count]) => ({ areaName, count }));
  }, [manualCatchMemos]);

  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  const adjustedMockFishingReports = useMemo(() => {
    return applyExternalMemoScoreAdjustments(mockFishingReports, externalMemos);
  }, [externalMemos]);

  const reports = useMemo(() => {
    const filteredReports = adjustedMockFishingReports.filter((report) => {
      const matchesSpecies = selectedSpecies === "all" || report.species === selectedSpecies;
      const matchesArea = selectedArea === "all" || report.areaName === selectedArea;
      const matchesDate = reportView !== "reports" || ((!startDate || report.reportDate >= startDate) && (!endDate || report.reportDate <= endDate));
      const searchableText = [report.spotName, report.areaName, report.species, report.method, report.sourceName, ...report.forecast.reasons].join(" ").toLowerCase();
      return matchesSpecies && matchesArea && matchesDate && (normalizedKeyword === "" || searchableText.includes(normalizedKeyword));
    });
    return [...filteredReports].sort((a, b) => {
      if (selectedSort === "scoreDesc") return b.forecast.score - a.forecast.score;
      if (selectedSort === "dateDesc") return Date.parse(b.reportDate) - Date.parse(a.reportDate);
      return Date.parse(a.reportDate) - Date.parse(b.reportDate);
    });
  }, [adjustedMockFishingReports, endDate, normalizedKeyword, reportView, selectedArea, selectedSort, selectedSpecies, startDate]);

  const filteredManualCatchMemos = useMemo(() => {
    const filteredMemos = manualCatchMemos.filter((memo) => {
      const matchesSpecies = selectedSpecies === "all" || memo.species === selectedSpecies;
      const matchesArea = selectedArea === "all" || memo.areaName === selectedArea;
      const matchesDate = reportView !== "reports" || ((!startDate || memo.caughtDate >= startDate) && (!endDate || memo.caughtDate <= endDate));
      const searchableText = [memo.estimatedSpotName, memo.areaName, memo.species, memo.method, memo.sourceName, memo.userMemo].join(" ").toLowerCase();
      return matchesSpecies && matchesArea && matchesDate && (normalizedKeyword === "" || searchableText.includes(normalizedKeyword));
    });
    return [...filteredMemos].sort((a, b) => {
      if (selectedSort === "dateAsc") return Date.parse(a.caughtDate) - Date.parse(b.caughtDate);
      return Date.parse(b.caughtDate) - Date.parse(a.caughtDate);
    });
  }, [endDate, manualCatchMemos, normalizedKeyword, reportView, selectedArea, selectedSort, selectedSpecies, startDate]);

  const filteredExternalMemosForMap = useMemo(() => {
    return externalMemos.filter((memo) => {
      const matchesSpecies = selectedSpecies === "all" || memo.species === selectedSpecies;
      const matchesArea = selectedArea === "all" || memo.areaName === selectedArea;
      const matchesDate = reportView !== "reports" || ((!startDate || memo.caughtDate >= startDate) && (!endDate || memo.caughtDate <= endDate));
      const searchableText = [memo.estimatedSpotName, memo.areaName, memo.species, memo.method, memo.sourceName, memo.userMemo].join(" ").toLowerCase();
      return matchesSpecies && matchesArea && matchesDate && (normalizedKeyword === "" || searchableText.includes(normalizedKeyword));
    });
  }, [endDate, externalMemos, normalizedKeyword, reportView, selectedArea, selectedSpecies, startDate]);

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
  }, [environmentSpotId, fishingSpots]);

  useEffect(() => {
    if (!environmentSpot) {
      setEnvironment(null);
      setEnvironmentError(null);
      setIsEnvironmentLoading(false);
      return;
    }

    const point = { spotId: environmentSpot.id, spotName: environmentSpot.name, latitude: environmentSpot.latitude, longitude: environmentSpot.longitude };
    const cachedEnvironment = readCachedFishingEnvironment(point);
    if (cachedEnvironment) {
      setEnvironment(cachedEnvironment);
      setEnvironmentError(null);
      setIsEnvironmentLoading(cachedEnvironment.cacheStatus !== "cache-fresh");
    } else {
      setEnvironment(null);
      setEnvironmentError(null);
      setIsEnvironmentLoading(true);
    }

    let isActive = true;
    const abortController = new AbortController();

    fetchFishingEnvironment(point, abortController.signal)
      .then((nextEnvironment) => {
        if (!isActive) return;
        setEnvironment(nextEnvironment);
        setEnvironmentError(null);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEnvironment(cachedEnvironment);
        setEnvironmentError(cachedEnvironment ? null : "Open-Meteoから環境データを取得できませんでした。");
      })
      .finally(() => {
        if (!isActive) return;
        if (!abortController.signal.aborted) setIsEnvironmentLoading(false);
      });

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [environmentSpot]);

  const speciesLabel = selectedSpecies === "all" ? "すべての魚種" : selectedSpecies;
  const areaLabel = selectedArea === "all" ? "すべてのエリア" : selectedArea;
  const activeSortOptions = reportView === "reports" ? reportSortOptions : areaSortOptions;
  const sortLabel = activeSortOptions.find((option) => option.value === selectedSort)?.label ?? (reportView === "reports" ? "日付が新しい順" : "平均SCOREが高い順");
  const searchLabel = normalizedKeyword === "" ? "指定なし" : `「${searchKeyword.trim()}」`;
  const isInitialState = selectedSpecies === "all" && selectedArea === "all" && selectedSort === "dateDesc" && searchKeyword.length === 0 && startDate === "" && endDate === "";
  useEffect(() => {
    if (reportView === "reports" && selectedSort === "scoreDesc") {
      setSelectedSort("dateDesc");
    }
  }, [reportView, selectedSort]);

  const resetFilters = () => {
    setSelectedSpecies("all");
    setSelectedArea("all");
    setSearchKeyword("");
    setSelectedSort("dateDesc");
    setStartDate("");
    setEndDate("");
  };

  return (
    <section className="dashboard" id="map">
      <div className="panel filters">
        <div>
          <p className="eyebrow">Post-MVP / 自分の釣果記録</p>
          <h2>糸島西岸〜平戸方面の釣果予報マップ</h2>
          <p className="muted">モック釣果は地図・地点評価・SCOREの参考に維持し、釣果一覧は自分の釣果記録だけを魚種・エリア・キーワードで確認できます。</p>
          <p className="resultSummary" aria-live="polite">
            魚種: {speciesLabel} / エリア: {areaLabel} / キーワード: {searchLabel} / 並び順: {sortLabel} / 釣り場マスター{fishingSpots.length}地点 / 地図・地点評価用モック{mockFishingReports.length}件 / 自分の釣果 全{manualCatchMemos.length}件中 {filteredManualCatchMemos.length}件を一覧表示中
          </p>
          <MasterDataStatusChip status={masterDataStatus} />
        </div>
      </div>

      <div className="mapEnvironmentGrid">
        <div className="mapSection">
          <FishingMap reports={reports} externalMemos={filteredExternalMemosForMap} spots={fishingSpots} />
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
        <p className="muted">{sortLabel}で表示中です。魚種、釣り方、日付、メモをカードごとに確認できます。</p>
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
              <strong>{manualCatchMemos.length}</strong>
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
              <strong>{manualCatchMemos.length}</strong>
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

          {reportView === "reports" ? (
            <>
              <div className="filterHeader keywordFilterHeader">
                <span>自分の釣果期間フィルタ</span>
                <span className="filterHint">開始日と終了日で絞り込み</span>
              </div>
              <div className="advancedFilterGrid">
                <label className="sortSelectLabel">釣果期間の開始日<input className="searchInput" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
                <label className="sortSelectLabel">釣果期間の終了日<input className="searchInput" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
              </div>
            </>
          ) : null}

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
                {activeSortOptions.map((option) => (
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
          <ExternalCatchMemoSection memos={manualCatchMemos} displayMemos={filteredManualCatchMemos} onMemoSave={persistMemo} onMemoDelete={deleteMemo} onLocalMemoMigrate={migrateLocalMemosToSupabase} localMemoIds={localMemoIds} storageError={storageError} storageStatus={memoStorageStatus} spots={fishingSpots} />
        </>
      ) : (
        <div className="cards" id="reports">
          {areaEvaluations.length === 0 ? (
            <div className="emptyState" role="status"><p className="eyebrow">No areas</p><h3>該当する地点評価がありません</h3><p>フィルタ条件を変更してください。</p></div>
          ) : areaEvaluations.map((evaluation) => (
            <article className="card" key={`${evaluation.placeName}-${evaluation.areaName}`}>
              <div className="cardHeader"><div><p className="eyebrow">{evaluation.areaName}</p><h3>{evaluation.placeName}</h3></div><div className="scoreBox" aria-label={`平均SCORE ${evaluation.averageScore}点`}><span>平均SCORE</span><strong className="score">{evaluation.averageScore}<span>点</span></strong></div></div>
              <div className="cardSummary"><span>代表魚種: {evaluation.representativeSpecies.join(" / ")}</span><span>直近釣果日: {evaluation.latestReportDate}</span><span>釣果件数: {evaluation.reportCount}</span><span>本人の釣果件数: {evaluation.externalMemoCount}（参考 / SCORE反映候補）</span></div>
              <dl className="facts"><div><dt>地点/エリア</dt><dd>{evaluation.placeName}</dd></div><div><dt>評価値</dt><dd>平均SCORE {evaluation.averageScore}点</dd></div><div><dt>代表魚種</dt><dd>{evaluation.representativeSpecies.join("、")}</dd></div><div><dt>直近釣果日</dt><dd>{evaluation.latestReportDate}</dd></div></dl>
              <div className="reasonBlock"><p>簡易メモ</p><p className="muted">{evaluation.memo}</p><p className="muted">条件に合う本人の釣果は、平均SCOREに使う既存地点SCOREへ参考反映しています。</p></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}



function MasterDataStatusChip({ status }: { status: MasterDataStatus }) {
  const label = status.isLoading ? "データ読込中..." : status.source === "supabase" ? "データ: Supabase" : "データ: 静的fallback";
  const reason = !status.isLoading && status.fallbackReason ? fallbackReasonLabels[status.fallbackReason] : null;

  return (
    <p className="dataSourceStatus" aria-live="polite">
      <span>{label}</span>
      {reason ? <small>{reason}</small> : null}
    </p>
  );
}
