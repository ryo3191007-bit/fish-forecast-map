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
import type { JmaWarningDecision } from "@/domain/jmaWarning";
import { fetchJmaWarningDecision } from "@/services/jmaWarnings";
import { filterByFishSpecies } from "@/lib/fishSpeciesResolver";
import { groupSelectableFishSpecies } from "@/lib/fishSpeciesUiGroups";
import { selectFishingSpot, toEnvironmentPoint } from "@/domain/fishingSpotPresentation";
import { fetchMyUserFishingSpotDetails, fetchMyUserFishingSpots } from "@/lib/userFishingSpotRepository";
import { mapUserSpotDetailsForDisplay, userFishingSpotToFishingSpot, type UserFishingSpot } from "@/domain/userFishingSpot";
import type { CurrentLocation } from "@/domain/geolocation";
import { UserFishingSpotRegistrationModal } from "./UserFishingSpotRegistrationModal";
import { fetchPublicUserFishingSpots, mergeOwnerAndPublicSpots } from "@/lib/publicReadRepository";
import { EnvironmentSearchPanel } from "./EnvironmentSearchPanel";
import { searchFishingSpotEnvironments } from "@/services/environmentSearch";
import type { EnvironmentSearchResult } from "@/domain/environmentSearch";
import { invalidateEnvironmentSearchRequest, shouldApplyEnvironmentSearchResponse } from "@/domain/environmentSearch";

type SortOption = "scoreDesc" | "dateDesc" | "dateAsc";
type DashboardMode = "map" | "catchReports" | "spotEvaluation";
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

function tokyoDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
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
  const [isRegistrationRequested, setIsRegistrationRequested] = useState(false);
  const handleRegistrationRequest = useCallback(() => setIsRegistrationRequested(true), []);
  const handleRegistrationRequestHandled = useCallback(() => setIsRegistrationRequested(false), []);
  const [dashboardMode, setDashboardMode] =
    useState<DashboardMode>("map");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [spotEvaluationTab, setSpotEvaluationTab] = useState<SpotEvaluationTab>("環境");
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
  const [userFishingSpots, setUserFishingSpots] = useState<UserFishingSpot[]>([]);
  const [publicFishingSpots, setPublicFishingSpots] = useState<UserFishingSpot[]>([]);
  const [isSpotRegistrationOpen, setIsSpotRegistrationOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [environmentSearchDate, setEnvironmentSearchDate] = useState(() => tokyoDate());
  const [environmentSearchTime, setEnvironmentSearchTime] = useState("12:00");
  const [environmentSearchMaxWind, setEnvironmentSearchMaxWind] = useState("");
  const [environmentSearchMaxWave, setEnvironmentSearchMaxWave] = useState("");
  const [environmentSearchResults, setEnvironmentSearchResults] = useState<EnvironmentSearchResult[] | null>(null);
  const [isEnvironmentSearchLoading, setIsEnvironmentSearchLoading] = useState(false);
  const environmentSearchRequestRef = useRef(0);
  const environmentSearchAbortRef = useRef<AbortController | null>(null);
  const manualCatchMemos = useMemo(
    () => getManualCatchMemos(externalMemos),
    [externalMemos],
  );
  const scoreCatchRecords = useMemo(
    () => externalMemos.flatMap((memo) => memo.catchItems.map((item) => ({
      ...memo,
      species: item.species,
      catchCount: item.catchCount,
      sizeCm: item.sizeCm,
      method: item.method,
    }))),
    [externalMemos],
  );
  const visibleUserSpots = useMemo(() => mergeOwnerAndPublicSpots(userFishingSpots, publicFishingSpots), [publicFishingSpots, userFishingSpots]);
  const publicUserSpotIds = useMemo<Set<string>>(() => new Set(publicFishingSpots.filter((spot) => !userFishingSpots.some((owner) => owner.id === spot.id)).map((spot) => spot.runtimeId)), [publicFishingSpots, userFishingSpots]);
  const viewingFishingSpots = useMemo(
    () => [...masterData.fishingSpots, ...visibleUserSpots.map(userFishingSpotToFishingSpot)],
    [masterData.fishingSpots, visibleUserSpots],
  );
  const ownerWritableFishingSpots = useMemo(
    () => [...masterData.fishingSpots, ...userFishingSpots.map(userFishingSpotToFishingSpot)],
    [masterData.fishingSpots, userFishingSpots],
  );
  useEffect(() => {
    let active = true;
    fetchPublicUserFishingSpots().then((spots) => { if (active) setPublicFishingSpots(spots); }).catch(() => { if (active) setPublicFishingSpots([]); });
    return () => { active = false; };
  }, [auth.status, auth.user?.id]);
  useEffect(() => {
    let active = true;
    if (auth.status !== "signed-in") { setUserFishingSpots([]); return; }
    fetchMyUserFishingSpots().then(spots => { if (active) setUserFishingSpots(spots); }).catch(() => { if (active) setUserFishingSpots([]); });
    return () => { active = false; };
  }, [auth.status, auth.user?.id]);
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
  const [spotDetails, setSpotDetails] = useState<FishingSpotDetailSet | null>(null);
  const [spotDetailStatus, setSpotDetailStatus] = useState<SpotDetailLoadStatus>("idle");
  const changeSelectedEnvironmentTime = useCallback((time: string | null) => setSelectedEnvironmentTime(time), []);
  const focusSelectedSpotOnMap = useCallback(() => {
    if (!environmentSpotId) return;
    setDashboardMode("map");
    mapFocusRequestIdRef.current += 1;
    setMapFocusRequest({ spotId: environmentSpotId, requestId: mapFocusRequestIdRef.current });
    requestAnimationFrame(() => mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [environmentSpotId]);
  const openSpotEvaluationFromMap = useCallback((spotId: string) => {
    setEnvironmentSpotId(spotId);
    setDashboardMode("spotEvaluation");
    setSpotEvaluationTab("環境");
    setSpotEvaluationScrollRequest((request) => request + 1);
  }, []);
  const runEnvironmentSearch = useCallback(() => {
    const maxWindSpeedKmh = environmentSearchMaxWind === "" ? null : Number(environmentSearchMaxWind);
    const maxWaveHeightMeters = environmentSearchMaxWave === "" ? null : Number(environmentSearchMaxWave);
    const requestId = ++environmentSearchRequestRef.current;
    environmentSearchAbortRef.current?.abort();
    const controller = new AbortController();
    environmentSearchAbortRef.current = controller;
    setIsEnvironmentSearchLoading(true);
    searchFishingSpotEnvironments(viewingFishingSpots, {
      forecastTime: `${environmentSearchDate}T${environmentSearchTime}`,
      maxWindSpeedKmh,
      maxWaveHeightMeters,
    }, controller.signal).then((results) => {
      if (shouldApplyEnvironmentSearchResponse(requestId, environmentSearchRequestRef.current)) setEnvironmentSearchResults(results);
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError") && shouldApplyEnvironmentSearchResponse(requestId, environmentSearchRequestRef.current)) setEnvironmentSearchResults([]);
    }).finally(() => {
      if (shouldApplyEnvironmentSearchResponse(requestId, environmentSearchRequestRef.current)) setIsEnvironmentSearchLoading(false);
    });
  }, [environmentSearchDate, environmentSearchMaxWave, environmentSearchMaxWind, environmentSearchTime, viewingFishingSpots]);
  const invalidateEnvironmentSearch = useCallback(() => {
    environmentSearchRequestRef.current = invalidateEnvironmentSearchRequest(
      environmentSearchRequestRef.current,
      environmentSearchAbortRef.current,
    );
    environmentSearchAbortRef.current = null;
    setEnvironmentSearchResults(null);
    setIsEnvironmentSearchLoading(false);
  }, []);
  const resetEnvironmentSearch = useCallback(() => {
    invalidateEnvironmentSearch();
    setEnvironmentSearchMaxWind(""); setEnvironmentSearchMaxWave("");
  }, [invalidateEnvironmentSearch]);
  const selectEnvironmentSearchSpot = useCallback((spotId: string) => {
    setEnvironmentSpotId(spotId);
    mapFocusRequestIdRef.current += 1;
    setMapFocusRequest({ spotId, requestId: mapFocusRequestIdRef.current });
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
    if (viewingFishingSpots.length === 0) {
      setEnvironmentSpotId("");
      return;
    }
    if (!viewingFishingSpots.some((spot) => spot.id === environmentSpotId)) {
      setEnvironmentSpotId(viewingFishingSpots[0].id);
    }
  }, [environmentSpotId, viewingFishingSpots]);

  const speciesFilterOptions = useMemo(() => {
    const activeSpecies = masterData.fishSpecies.filter((item) => fishSpeciesFilterNames.includes(item.nameJa));
    const normalizedQuery = speciesCandidateQuery.trim().toLowerCase();
    return groupSelectableFishSpecies(activeSpecies, { includeLegacyAggregates: true })
      .flatMap((group) => group.items.map((item) => item.nameJa))
      .filter((species) => `${species}${species === "青物" || species === "根魚" ? "系" : ""}`.toLowerCase().includes(normalizedQuery));
  }, [fishSpeciesFilterNames, masterData.fishSpecies, speciesCandidateQuery]);
  const spotFilterOptions = useMemo(() => {
    const normalizedQuery = spotCandidateQuery.trim().toLowerCase();
    return viewingFishingSpots
      .filter((spot) => `${spot.name} ${spot.id}`.toLowerCase().includes(normalizedQuery));
  }, [spotCandidateQuery, viewingFishingSpots]);

  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  const filteredManualCatchMemos = useMemo(() => {
    const filteredMemos = manualCatchMemos.filter((memo) => {
      const matchesSpecies = memo.catchItems.some((item) => memoMatchesFishSpecies(String(item.species), selectedSpecies, masterData));
      const matchesSpot =
        selectedSpotId === "all" || memo.spotId === selectedSpotId;
      const matchesDate =
        (!startDate || memo.caughtDate >= startDate) &&
        (!endDate || memo.caughtDate <= endDate);
      const searchableText = [
        memo.estimatedSpotName,
        memo.areaName,
        ...memo.catchItems.map((item) => item.species),
        ...memo.catchItems.map((item) => item.method),
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
    return selectFishingSpot(viewingFishingSpots, environmentSpotId);
  }, [environmentSpotId, viewingFishingSpots]);

  useEffect(() => {
    if (!environmentSpot) {
      setEnvironment(null);
      setEnvironmentError(null);
      setIsEnvironmentLoading(false);
      return;
    }

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
    const userSpot = userFishingSpots.find(spot => spot.runtimeId === environmentSpot.id);
    (userSpot
      ? Promise.all([fetchFishingSpotDetails(), fetchMyUserFishingSpotDetails(userSpot.id)]).then(([definitions, values]) => ({ data: mapUserSpotDetailsForDisplay(values, definitions.data.itemDefinitions) }))
      : fetchFishingSpotDetails(environmentSpot.id))
      .then((result) => { if (active) { setSpotDetails(result.data); setSpotDetailStatus("ready"); } })
      .catch(() => { if (active) { setSpotDetails(null); setSpotDetailStatus("failed"); } });
    return () => { active = false; };
  }, [environmentSpot, userFishingSpots]);

  const handleUserSpotCreated = useCallback((spot: UserFishingSpot) => {
    setUserFishingSpots(current => [...current.filter(item => item.id !== spot.id), spot]);
    setEnvironmentSpotId(spot.runtimeId);
    setDashboardMode("spotEvaluation");
    setSpotEvaluationTab("釣場");
    setIsSpotRegistrationOpen(false);
    mapFocusRequestIdRef.current += 1;
    setMapFocusRequest({ spotId: spot.runtimeId, requestId: mapFocusRequestIdRef.current });
  }, []);

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

  return (
    <section className="dashboard" id="map">
      <div className="dashboardView" hidden={dashboardMode !== "map"}>
        <div className="sectionHeading reportSectionHeading">
          <div>
            <p className="eyebrow">MAP</p>
            <h2>地図</h2>
          </div>
        </div>
        <div className="mapEnvironmentGrid">
        <div className="mapSection" ref={mapSectionRef}>
          <FishingMap
            externalMemos={externalMemos}
            spots={viewingFishingSpots}
            focusRequest={mapFocusRequest}
            onOpenSpotEvaluation={openSpotEvaluationFromMap}
            currentLocation={currentLocation}
            onCurrentLocationChange={setCurrentLocation}
            environmentMatchSpotIds={environmentSearchResults ? new Set(environmentSearchResults.filter((result) => result.status === "match").map((result) => result.spotId)) : null}
          />
        </div>
        <EnvironmentSearchPanel
          date={environmentSearchDate} time={environmentSearchTime} minDate={tokyoDate()} maxDate={tokyoDate(6)}
          maxWind={environmentSearchMaxWind} maxWave={environmentSearchMaxWave} loading={isEnvironmentSearchLoading} results={environmentSearchResults}
          onDateChange={(value) => { invalidateEnvironmentSearch(); setEnvironmentSearchDate(value); }} onTimeChange={(value) => { invalidateEnvironmentSearch(); setEnvironmentSearchTime(value); }}
          onMaxWindChange={(value) => { invalidateEnvironmentSearch(); setEnvironmentSearchMaxWind(value); }} onMaxWaveChange={(value) => { invalidateEnvironmentSearch(); setEnvironmentSearchMaxWave(value); }}
          onSearch={runEnvironmentSearch} onReset={resetEnvironmentSearch} onSelectSpot={selectEnvironmentSearchSpot}
        />
      </div>
      </div>

      <div className="dashboardView" hidden={dashboardMode !== "catchReports"}>
          <div className="sectionHeading reportSectionHeading dashboardScreenHeader">
            <div>
              <p className="eyebrow">CATCH REPORTS</p>
              <h2>釣果情報</h2>
            </div>
            <button type="button" className="button catchReportRegisterButton" onClick={handleRegistrationRequest}>＋釣果登録</button>
          </div>

          <div
            className="filterControls reportFilters"
            aria-label="釣果フィルタ"
          >
            <section className="filterCard">
              <div className="filterTopRow">
                <span className="filterCardTitle">魚種フィルタ</span>
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
                <span className="filterCardTitle">地点フィルタ</span>
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
              <span className="filterCardTitle">キーワード検索</span>
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
              <span className="filterCardTitle">釣果期間フィルタ</span>
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
              <span className="filterCardTitle">並び替え</span>
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
            spots={ownerWritableFishingSpots}
            masterSpotIds={new Set(masterData.fishingSpots.map((spot) => spot.id))}
            canCreateUserSpot={auth.status === "signed-in"}
            onUserSpotCreated={(spot) => setUserFishingSpots(current => [...current.filter(item => item.id !== spot.id), spot])}
            fishSpecies={masterData.fishSpecies}
            isRegistrationRequested={isRegistrationRequested}
            onRegistrationRequestHandled={handleRegistrationRequestHandled}
          />
      </div>
      <div className="dashboardView" hidden={dashboardMode !== "spotEvaluation"} ref={spotEvaluationSectionRef}>
          <SpotEvaluationCard
            selectedSpot={environmentSpot}
            spots={viewingFishingSpots}
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
            catches={scoreCatchRecords}
            excludedPublicCatchIds={externalMemos.map(({ id }) => id)}
            onFocusMap={focusSelectedSpotOnMap}
            onOpenSpotRegistration={() => setIsSpotRegistrationOpen(true)}
            isUserSpot={Boolean(userFishingSpots.some(spot => spot.runtimeId === environmentSpotId))}
            isPublicUserSpot={publicUserSpotIds.has(environmentSpotId)}
          />
      </div>
      <nav className="appFooterNav" aria-label="アプリ内メインナビゲーション">
        <button type="button" className={dashboardMode === "map" ? "active" : ""} aria-label="マップ画面を表示" aria-current={dashboardMode === "map" ? "page" : undefined} onClick={() => setDashboardMode("map")}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></svg><span>マップ</span>
        </button>
        <button type="button" className={dashboardMode === "catchReports" ? "active" : ""} aria-label="釣果画面を表示" aria-current={dashboardMode === "catchReports" ? "page" : undefined} onClick={() => setDashboardMode("catchReports")}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg><span>釣果</span>
        </button>
        <button type="button" className={dashboardMode === "spotEvaluation" ? "active" : ""} aria-label="地点画面を表示" aria-current={dashboardMode === "spotEvaluation" ? "page" : undefined} onClick={() => setDashboardMode("spotEvaluation")}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>地点</span>
        </button>
      </nav>
      {isSpotRegistrationOpen && (auth.status === "signed-in" ? <UserFishingSpotRegistrationModal
        initialLongitude={environmentSpot?.longitude ?? 130.1}
        initialLatitude={environmentSpot?.latitude ?? 33.5}
        currentLocation={currentLocation}
        onCurrentLocationChange={setCurrentLocation}
        onClose={() => setIsSpotRegistrationOpen(false)}
        onCreated={handleUserSpotCreated}
      /> : <div className="userSpotAuthNotice" role="dialog" aria-modal="true" aria-label="地点登録にはログインが必要"><p>地点を登録するには、ヘッダーからログインしてください。</p><button type="button" onClick={() => setIsSpotRegistrationOpen(false)}>閉じる</button></div>)}
    </section>
  );
}
