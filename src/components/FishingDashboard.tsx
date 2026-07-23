"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fishSpeciesNames,
  type FishSpeciesName,
} from "@/domain/fishing";
import type { FishingEnvironment } from "@/domain/environment";
import {
  fetchFishingEnvironment,
  readCachedFishingEnvironment,
} from "@/services/openMeteo";
import { SpotEvaluationCard, type SpotEvaluationTab } from "./SpotEvaluationCard";
import type { SpotDetailLoadStatus } from "@/domain/spotEvaluationPresentation";
import { FishingMap, type MapFocusRequest } from "./FishingMap";
import { ExternalCatchMemoSection } from "./ExternalCatchMemoSection";
import { useExternalCatchMemos } from "@/hooks/useExternalCatchMemos";
import type { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { getManualCatchMemos } from "@/domain/manualCatchMemos";
import {
  fetchMasterData,
  getStaticMasterData,
  type MasterDataSet,
} from "@/lib/masterDataRepository";
import { fetchFishingSpotDetails } from "@/lib/fishingSpotDetailRepository";
import type { FishingSpotDetailSet } from "@/domain/fishingSpotDetail";
import { AllSpeciesEvaluation } from "./AllSpeciesEvaluation";
import { calculateProductionScoreV2 } from "@/domain/scoreV2Production";
import type { JmaWarningDecision } from "@/domain/jmaWarning";
import { fetchJmaWarningDecision } from "@/services/jmaWarnings";
import { getEvaluationReferenceTime, isValidAllSpeciesHistoryState, resolveAllSpeciesReturnState, resolveInitialAllSpeciesHash, scopeSpotDetails, type AllSpeciesHistoryState } from "@/domain/spotEvaluationPresentation";
import { filterByFishSpecies } from "@/lib/fishSpeciesResolver";
import { groupSelectableFishSpecies } from "@/lib/fishSpeciesUiGroups";
import { selectFishingSpot, toEnvironmentPoint } from "@/domain/fishingSpotPresentation";

type SortOption = "scoreDesc" | "dateDesc" | "dateAsc";
type DashboardMode = "catchReports" | "spotEvaluation";
const reportSortOptions: { value: SortOption; label: string }[] = [
  { value: "dateDesc", label: "新着順（新しい順）" },
  { value: "dateAsc", label: "日付が古い順" },
];

function getFishSpeciesFilterNames(
  masterData: MasterDataSet,
): FishSpeciesName[] {
  const names = masterData.fishSpecies
    .map((species) => species.nameJa)
    .filter((name): name is FishSpeciesName => fishSpeciesNames.includes(name));
  return names.length > 0 ? names : [...fishSpeciesNames];
}

export function memoMatchesFishSpecies(memoSpecies: string, selectedSpecies: FishSpeciesName | "all", masterData: MasterDataSet) {
  return selectedSpecies === "all" || filterByFishSpecies([memoSpecies], selectedSpecies, (value) => value, masterData.fishSpecies, masterData.fishSpeciesAliases).length === 1;
}

type FishingDashboardProps = { auth: ReturnType<typeof useSupabaseAuth> };

export function FishingDashboard({ auth }: FishingDashboardProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<
    FishSpeciesName | "all"
  >("all");
  const [selectedSpotId, setSelectedSpotId] = useState<string | "all">("all");
  const [speciesCandidateQuery, setSpeciesCandidateQuery] = useState("");
  const [spotCandidateQuery, setSpotCandidateQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState<SortOption>("dateDesc");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dashboardMode, setDashboardMode] =
    useState<DashboardMode>("catchReports");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [spotEvaluationTab, setSpotEvaluationTab] = useState<SpotEvaluationTab>("環境");
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const allSpeciesOrigin = useRef<AllSpeciesHistoryState | null>(null);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const spotEvaluationSectionRef = useRef<HTMLDivElement | null>(null);
  const [spotEvaluationScrollRequest, setSpotEvaluationScrollRequest] = useState(0);
  const mapFocusRequestIdRef = useRef(0);
  const [mapFocusRequest, setMapFocusRequest] = useState<MapFocusRequest | null>(null);
  const [selectedEnvironmentTime, setSelectedEnvironmentTime] = useState<
    string | null
  >(null);
  const {
    memos: externalMemos,
    persistMemo,
    deleteMemo,
    migrateLocalMemosToSupabase,
    localMemoIds,
    storageError,
    memoStorageStatus,
  } = useExternalCatchMemos(auth.status, auth.user);
  const [masterData, setMasterData] = useState<MasterDataSet>(() =>
    getStaticMasterData(),
  );
  const manualCatchMemos = useMemo(
    () => getManualCatchMemos(externalMemos),
    [externalMemos],
  );
  const fishingSpots = masterData.fishingSpots;
  const fishSpeciesFilterNames = useMemo(
    () => getFishSpeciesFilterNames(masterData),
    [masterData],
  );
  const [environmentSpotId, setEnvironmentSpotId] = useState(
    () => getStaticMasterData().fishingSpots[0]?.id ?? "",
  );
  const [environment, setEnvironment] = useState<FishingEnvironment | null>(
    null,
  );
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [jmaWarning, setJmaWarning] = useState<JmaWarningDecision | null>(null);
  const [isEnvironmentLoading, setIsEnvironmentLoading] = useState(false);
  const [environmentRequestSpotId, setEnvironmentRequestSpotId] = useState<string | null>(null);
  const [spotDetails, setSpotDetails] = useState<FishingSpotDetailSet | null>(null);
  const [spotDetailStatus, setSpotDetailStatus] = useState<SpotDetailLoadStatus>("idle");
  const changeSelectedEnvironmentTime = useCallback((time: string | null) => setSelectedEnvironmentTime(time), []);
  const focusSelectedSpotOnMap = useCallback(() => {
    if (!environmentSpotId) return;
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    mapFocusRequestIdRef.current += 1;
    setMapFocusRequest({ spotId: environmentSpotId, requestId: mapFocusRequestIdRef.current });
  }, [environmentSpotId]);
  const openSpotEvaluationFromMap = useCallback((spotId: string) => {
    setEnvironmentSpotId(spotId);
    setDashboardMode("spotEvaluation");
    setSpotEvaluationTab("環境");
    setSpotEvaluationScrollRequest((request) => request + 1);
  }, []);
  useEffect(() => {
    if (!spotEvaluationScrollRequest || dashboardMode !== "spotEvaluation") return;
    spotEvaluationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dashboardMode, spotEvaluationScrollRequest]);
  useEffect(() => {
    let isActive = true;
    fetchMasterData()
      .then((result) => {
        if (!isActive) return;
        setMasterData(result.data);
      })
      .catch(() => {
        if (!isActive) return;
        setMasterData(getStaticMasterData());
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

  const speciesFilterOptions = useMemo(() => {
    const activeSpecies = masterData.fishSpecies.filter((item) => fishSpeciesFilterNames.includes(item.nameJa));
    const normalizedQuery = speciesCandidateQuery.trim().toLowerCase();
    return groupSelectableFishSpecies(activeSpecies, { includeLegacyAggregates: true })
      .flatMap((group) => group.items.map((item) => item.nameJa))
      .filter((species) => `${species}${species === "青物" || species === "根魚" ? "系" : ""}`.toLowerCase().includes(normalizedQuery));
  }, [fishSpeciesFilterNames, masterData.fishSpecies, speciesCandidateQuery]);
  const spotFilterOptions = useMemo(() => {
    const normalizedQuery = spotCandidateQuery.trim().toLowerCase();
    return fishingSpots
      .filter((spot) => `${spot.name} ${spot.id}`.toLowerCase().includes(normalizedQuery));
  }, [fishingSpots, spotCandidateQuery]);

  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  const filteredManualCatchMemos = useMemo(() => {
    const filteredMemos = manualCatchMemos.filter((memo) => {
      const matchesSpecies = memoMatchesFishSpecies(String(memo.species), selectedSpecies, masterData);
      const matchesSpot =
        selectedSpotId === "all" || memo.spotId === selectedSpotId;
      const matchesDate =
        (!startDate || memo.caughtDate >= startDate) &&
        (!endDate || memo.caughtDate <= endDate);
      const searchableText = [
        memo.estimatedSpotName,
        memo.areaName,
        memo.species,
        memo.method,
        memo.sourceName,
        memo.userMemo,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesSpecies &&
        matchesSpot &&
        matchesDate &&
        (normalizedKeyword === "" || searchableText.includes(normalizedKeyword))
      );
    });
    return [...filteredMemos].sort((a, b) => {
      if (selectedSort === "dateAsc")
        return Date.parse(`${a.caughtDate}T${a.caughtTime ?? "00:00:00"}`) - Date.parse(`${b.caughtDate}T${b.caughtTime ?? "00:00:00"}`);
      return Date.parse(`${b.caughtDate}T${b.caughtTime ?? "00:00:00"}`) - Date.parse(`${a.caughtDate}T${a.caughtTime ?? "00:00:00"}`);
    });
  }, [
    endDate,
    manualCatchMemos,
    masterData,
    normalizedKeyword,
    selectedSpotId,
    selectedSort,
    selectedSpecies,
    startDate,
  ]);

  const environmentSpot = useMemo(() => {
    return selectFishingSpot(fishingSpots, environmentSpotId);
  }, [environmentSpotId, fishingSpots]);

  const getForecastTimesBySpot = useCallback(() => ({
    ...(environmentSpot && environment?.point.spotId === environmentSpot.id
      ? { [environmentSpot.id]: environment.hourly.map((row) => row.forecastTime) }
      : {}),
  }), [environment, environmentSpot]);
  const closeAllSpecies = useCallback((historyState: unknown = allSpeciesOrigin.current) => {
    const next = resolveAllSpeciesReturnState(
      historyState,
      fishingSpots.map((spot) => spot.id),
      getForecastTimesBySpot(),
      environmentSpot?.id ?? "",
      selectedEnvironmentTime,
    );
    setEnvironmentSpotId(next.spotId);
    setSelectedEnvironmentTime(next.selectedTime);
    setDashboardMode(next.dashboardMode);
    setSpotEvaluationTab(next.spotEvaluationTab);
    setShowAllSpecies(next.showAllSpecies);
    allSpeciesOrigin.current = null;
  }, [environmentSpot?.id, fishingSpots, getForecastTimesBySpot, selectedEnvironmentTime]);
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (!showAllSpecies) return;
      const candidate = isValidAllSpeciesHistoryState(
        event.state,
        fishingSpots.map((spot) => spot.id),
        typeof event.state?.spotId === "string" ? getForecastTimesBySpot()[event.state.spotId] ?? [] : [],
      ) ? event.state : allSpeciesOrigin.current;
      closeAllSpecies(candidate);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [closeAllSpecies, fishingSpots, getForecastTimesBySpot, showAllSpecies]);
  const handledInitialHash = useRef(false);
  useEffect(() => {
    if (handledInitialHash.current || window.location.hash !== "#all-species" || fishingSpots.length === 0) return;
    const state = window.history.state;
    const environmentMatchesSelection = environment?.point.spotId === environmentSpot?.id;
    const resolution = resolveInitialAllSpeciesHash(
      state,
      fishingSpots.map((spot) => spot.id),
      environmentSpot?.id ?? "",
      environmentRequestSpotId,
      environmentMatchesSelection ? environment.point.spotId : null,
      environmentMatchesSelection ? environment.hourly.map((row) => row.forecastTime) : [],
      isEnvironmentLoading,
      environmentError,
    );
    if (resolution.kind === "switch-spot") {
      setEnvironmentSpotId(resolution.spotId);
      setDashboardMode("spotEvaluation");
      setSpotEvaluationTab("評価");
      return;
    }
    if (resolution.kind === "waiting") return;
    handledInitialHash.current = true;
    if (resolution.kind === "restore") {
      allSpeciesOrigin.current = resolution.state;
      setEnvironmentSpotId(resolution.state.spotId);
      setSelectedEnvironmentTime(resolution.state.selectedTime);
      setDashboardMode("spotEvaluation");
      setSpotEvaluationTab("評価");
      setShowAllSpecies(true);
      return;
    }
    setEnvironmentSpotId(resolution.state.spotId);
    setSelectedEnvironmentTime(resolution.state.selectedTime);
    setDashboardMode(resolution.state.dashboardMode);
    setSpotEvaluationTab(resolution.state.spotEvaluationTab);
    setShowAllSpecies(resolution.state.showAllSpecies);
    allSpeciesOrigin.current = null;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, [environment, environmentError, environmentRequestSpotId, environmentSpot?.id, fishingSpots, isEnvironmentLoading]);

  useEffect(() => {
    if (!environmentSpot) {
      setEnvironmentRequestSpotId(null);
      setEnvironment(null);
      setEnvironmentError(null);
      setIsEnvironmentLoading(false);
      return;
    }

    setEnvironmentRequestSpotId(environmentSpot.id);

    const point = toEnvironmentPoint(environmentSpot);
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
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setEnvironment(cachedEnvironment);
        setEnvironmentError(
          cachedEnvironment
            ? "API更新に失敗したためキャッシュを表示しています。"
            : "Open-Meteoから環境データを取得できませんでした。",
        );
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

  useEffect(() => {
    setJmaWarning(null);
    if (!environmentSpot || !selectedEnvironmentTime) return;
    const controller = new AbortController();
    fetchJmaWarningDecision(environmentSpot.id, selectedEnvironmentTime, controller.signal)
      .then(setJmaWarning)
      .catch(() => setJmaWarning({ state: "unknown", reason: "client-request-failed", phenomena: [], areaName: environmentSpot.name, reportDateTime: null, targetStart: null, targetEnd: null, fetchedAt: new Date().toISOString(), bulletinType: null, lastSuccessfulFetchAt: null }));
    return () => controller.abort();
  }, [environmentSpot, selectedEnvironmentTime]);

  useEffect(() => {
    let active = true;
    setSpotDetails(null);
    if (!environmentSpot) { setSpotDetailStatus("idle"); return; }
    setSpotDetailStatus("loading");
    fetchFishingSpotDetails(environmentSpot.id)
      .then((result) => { if (active) { setSpotDetails(result.data); setSpotDetailStatus("ready"); } })
      .catch(() => { if (active) { setSpotDetails(null); setSpotDetailStatus("failed"); } });
    return () => { active = false; };
  }, [environmentSpot]);

  const activeSortOptions = reportSortOptions;
  const isInitialState =
    selectedSpecies === "all" &&
    selectedSpotId === "all" &&
    speciesCandidateQuery === "" &&
    spotCandidateQuery === "" &&
    selectedSort === "dateDesc" &&
    searchKeyword.length === 0 &&
    startDate === "" &&
    endDate === "";
  const resetFilters = () => {
    setSelectedSpecies("all");
    setSelectedSpotId("all");
    setSpeciesCandidateQuery("");
    setSpotCandidateQuery("");
    setSearchKeyword("");
    setSelectedSort("dateDesc");
    setStartDate("");
    setEndDate("");
  };

  const openAllSpecies = () => {
    if (!environmentSpot) return;
    const origin: AllSpeciesHistoryState = { view: "all-species", spotId: environmentSpot.id, selectedTime: selectedEnvironmentTime };
    allSpeciesOrigin.current = origin;
    setSpotEvaluationTab("評価");
    setShowAllSpecies(true);
    window.history.replaceState(origin, "", `${window.location.pathname}${window.location.search}`);
    window.history.pushState(origin, "", "#all-species");
  };
  const requestCloseAllSpecies = () => {
    if (window.history.state?.view === "all-species") window.history.back();
    else closeAllSpecies(window.history.state);
  };
  const allSpeciesScore = environmentSpot ? calculateProductionScoreV2({
    spot: environmentSpot,
    details: spotDetailStatus === "ready" ? scopeSpotDetails(spotDetails, environmentSpot.id) : null,
    catches: externalMemos,
    environment,
    jmaWarning,
    fishSpecies: masterData.fishSpecies,
    fishSpeciesAliases: masterData.fishSpeciesAliases,
    selectedDateTime: getEvaluationReferenceTime(selectedEnvironmentTime),
  }) : null;

  if (showAllSpecies && environmentSpot && allSpeciesScore) return <AllSpeciesEvaluation
    spotName={environmentSpot.name}
    selectedTime={selectedEnvironmentTime}
    score={allSpeciesScore}
    onBack={requestCloseAllSpecies}
  />;

  return (
    <section className="dashboard" id="map">
      <div className="mapEnvironmentGrid">
        <div className="mapSection" ref={mapSectionRef}>
          <FishingMap
            externalMemos={externalMemos}
            spots={fishingSpots}
            focusRequest={mapFocusRequest}
            onOpenSpotEvaluation={openSpotEvaluationFromMap}
          />
        </div>
      </div>

      <div
        className="dashboardModeSwitch"
        role="group"
        aria-label="メイン表示モードを選択"
      >
        <button
          type="button"
          aria-pressed={dashboardMode === "catchReports"}
          className={
            dashboardMode === "catchReports"
              ? "dashboardModeButton active"
              : "dashboardModeButton"
          }
          onClick={() => setDashboardMode("catchReports")}
        >
          <span>釣果情報</span>
          <small>登録・編集・一覧</small>
        </button>
        <button
          type="button"
          aria-pressed={dashboardMode === "spotEvaluation"}
          className={
            dashboardMode === "spotEvaluation"
              ? "dashboardModeButton active"
              : "dashboardModeButton"
          }
          onClick={() => setDashboardMode("spotEvaluation")}
        >
          <span>地点評価</span>
          <small>環境データ・地点別SCORE</small>
        </button>
      </div>

      {dashboardMode === "catchReports" ? (
        <div>
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Catch reports</p>
              <h2>釣果情報一覧</h2>
            </div>
          </div>

          <div
            className="filterControls reportFilters"
            aria-label="釣果フィルタ"
          >
            <section className="filterCard">
              <div className="filterTopRow">
                <span>魚種フィルタ</span>
                <label className="candidateSearchField">
                  <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
                  <input
                    className="searchInput candidateSearchInput"
                    type="search"
                    value={speciesCandidateQuery}
                    onChange={(event) => setSpeciesCandidateQuery(event.target.value)}
                    placeholder="魚種名で検索"
                    aria-label="魚種名で検索"
                  />
                </label>
              </div>
            <div
              className="speciesChips"
              role="group"
              aria-label="表示する魚種を選択"
            >
              <button
                type="button"
                className={
                  selectedSpecies === "all"
                    ? "speciesChip active"
                    : "speciesChip"
                }
                aria-pressed={selectedSpecies === "all"}
                onClick={() => setSelectedSpecies("all")}
              >
                <span>すべて</span>
              </button>
              {speciesFilterOptions.map((species) => (
                <button
                  type="button"
                  className={selectedSpecies === species ? "speciesChip active" : "speciesChip"}
                  aria-pressed={selectedSpecies === species}
                  key={species}
                  onClick={() => setSelectedSpecies(species)}
                >
                  <span>{species === "青物" || species === "根魚" ? `${species}系` : species}</span>
                </button>
              ))}
              </div>
            </section>

            <section className="filterCard">
              <div className="filterTopRow">
                <span>地点フィルタ</span>
                <label className="candidateSearchField">
                  <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
                  <input
                    className="searchInput candidateSearchInput"
                    type="search"
                    value={spotCandidateQuery}
                    onChange={(event) => setSpotCandidateQuery(event.target.value)}
                    placeholder="地点名で検索"
                    aria-label="地点名で検索"
                  />
                </label>
              </div>
            <div
              className="speciesChips areaChips"
              role="group"
              aria-label="表示する地点を選択"
            >
              <button
                type="button"
                className={
                  selectedSpotId === "all" ? "speciesChip active" : "speciesChip"
                }
                aria-pressed={selectedSpotId === "all"}
                onClick={() => setSelectedSpotId("all")}
              >
                <span>すべて</span>
              </button>
              {spotFilterOptions.map((spot) => (
                <button
                  type="button"
                  className={
                    selectedSpotId === spot.id
                      ? "speciesChip active"
                      : "speciesChip"
                  }
                  aria-pressed={selectedSpotId === spot.id}
                  key={spot.id}
                  onClick={() => setSelectedSpotId(spot.id)}
                >
                  <span>{spot.name}</span>
                </button>
              ))}
              </div>
            </section>

            <section className="filterCard inlineFilterRow keywordFilterRow">
              <span>キーワード検索</span>
              <input
                id="report-search"
                className="searchInput"
                type="search"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="釣果情報を検索"
                aria-label="釣果情報を検索"
              />
              <button
                type="button"
                className="clearSearchButton"
                onClick={() => setSearchKeyword("")}
                disabled={searchKeyword.length === 0}
                aria-label="キーワード検索をクリア"
              >
                ×
              </button>
            </section>

            <section className="filterCard dateFilterCard">
              <span>釣果期間フィルタ</span>
              <div className="dateFilterRow">
              <label className={`dateInputLabel${startDate ? " hasValue" : ""}`}>
                <span className="visuallyHidden">釣果期間の開始日</span>
                {!startDate && <span className="datePlaceholder">開始日を選択</span>}
                <input
                  className="searchInput"
                  type="date"
                  aria-label="釣果期間の開始日"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <svg className="calendarIcon" aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
              </label>
              <span className="dateRangeSeparator" aria-hidden="true">〜</span>
              <label className={`dateInputLabel${endDate ? " hasValue" : ""}`}>
                <span className="visuallyHidden">釣果期間の終了日</span>
                {!endDate && <span className="datePlaceholder">終了日を選択</span>}
                <input
                  className="searchInput"
                  type="date"
                  aria-label="釣果期間の終了日"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
                <svg className="calendarIcon" aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
              </label>
              </div>
            </section>

            <section className="filterCard inlineFilterRow sortFilterRow">
              <span>並び替え</span>
              <select
                id="report-sort"
                className="sortSelect"
                aria-label="並び替え"
                value={selectedSort}
                onChange={(event) =>
                  setSelectedSort(event.target.value as SortOption)
                }
              >
                {activeSortOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="resetFiltersButton"
                onClick={resetFilters}
                disabled={isInitialState}
                aria-disabled={isInitialState}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 11a8 8 0 1 1 2.34 5.66" /><path d="M4 5v6h6" /></svg>
                リセット
              </button>
            </section>
          </div>

          <ExternalCatchMemoSection
            memos={manualCatchMemos}
            displayMemos={filteredManualCatchMemos}
            onMemoSave={persistMemo}
            onMemoDelete={deleteMemo}
            onLocalMemoMigrate={migrateLocalMemosToSupabase}
            localMemoIds={localMemoIds}
            storageError={storageError}
            storageStatus={memoStorageStatus}
            spots={fishingSpots}
            fishSpecies={masterData.fishSpecies}
          />
        </div>
      ) : (
        <div ref={spotEvaluationSectionRef}>
          <SpotEvaluationCard
            selectedSpot={environmentSpot}
            spots={fishingSpots}
            selectedSpotId={environmentSpotId}
            onSelectedSpotIdChange={setEnvironmentSpotId}
            environment={environment}
            jmaWarning={jmaWarning}
            selectedTime={selectedEnvironmentTime}
            onSelectedTimeChange={changeSelectedEnvironmentTime}
            activeTab={spotEvaluationTab}
            onActiveTabChange={setSpotEvaluationTab}
            isLoading={isEnvironmentLoading}
            error={environmentError}
            details={spotDetails}
            detailStatus={spotDetailStatus}
            catches={externalMemos}
            onShowAllSpecies={openAllSpecies}
            onFocusMap={focusSelectedSpotOnMap}
          />
        </div>
      )}
    </section>
  );
}
