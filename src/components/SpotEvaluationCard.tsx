"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getNearestForecastTime,
  getTideEventBadgeForForecastTime,
  getTideEventsForDate,
  getTidePhaseName,
  type FishingEnvironment,
} from "@/domain/environment";
import type { ExternalCatchRecord } from "@/domain/externalCatch";
import type { FishingSpot } from "@/domain/fishingSpot";
import type {
  FishingSpotDetailSet,
  SpotDetailConfidence,
} from "@/domain/fishingSpotDetail";
import { calculateProductionScoreV2 } from "@/domain/scoreV2Production";
import type { JmaWarningDecision } from "@/domain/jmaWarning";
import { getJmaWarningPresentation } from "@/domain/jmaWarningPresentation";
import { findDisplayableSpotDetail, formatSpotDetailValue, getEnvironmentStatusLabel, getEvaluationReferenceTime, resolveSelectedForecastTime, scopeSpotDetails, type SpotDetailLoadStatus } from "@/domain/spotEvaluationPresentation";

export type SpotEvaluationTab = "評価" | "環境" | "釣場" | "地形";

type Props = {
  spots: FishingSpot[];
  selectedSpot: FishingSpot | undefined;
  selectedSpotId: string;
  onSelectedSpotIdChange: (id: string) => void;
  selectedTime: string | null;
  onSelectedTimeChange: (time: string | null) => void;
  activeTab: SpotEvaluationTab;
  onActiveTabChange: (tab: SpotEvaluationTab) => void;
  environment: FishingEnvironment | null;
  details: FishingSpotDetailSet | null;
  detailStatus: SpotDetailLoadStatus;
  catches: ExternalCatchRecord[];
  isLoading: boolean;
  error: string | null;
  jmaWarning: JmaWarningDecision | null;
  onShowAllSpecies: () => void;
  onFocusMap: () => void;
};

const tabs: SpotEvaluationTab[] = ["評価", "環境", "釣場", "地形"];
const fishingItems = [
  ["target_species", "対象魚種"], ["recommended_methods", "推奨釣法"],
  ["shore_access", "足場"], ["toilet", "トイレ"], ["lighting", "常夜灯・照明"],
  ["parking", "駐車場"], ["access", "アクセス情報"], ["fishable_area", "釣り可能範囲"],
  ["restriction_status", "釣り禁止・立入禁止・工事・閉鎖等"],
] as const;
const terrainItems = [
  ["depth", "水深"], ["bottom_material", "底質"], ["coastal_topography", "海底・沿岸地形"],
  ["obstacles", "テトラ・根・障害物"], ["spot_features", "堤防・磯・サーフ等の特徴"],
  ["tidal_flow", "潮通し"], ["river_influence", "河川影響"],
  ["open_sea_bay_character", "外海・湾内特性"],
] as const;
const confidenceLabel: Record<SpotDetailConfidence, string> = { high: "高", medium: "中", low: "低" };

export function SpotEvaluationCard(props: Props) {
  const { selectedTime, onSelectedTimeChange } = props;
  const rows = useMemo(() => props.environment?.hourly ?? [], [props.environment]);
  const selectedRow = rows.find((row) => row.forecastTime === props.selectedTime) ?? null;
  const selectedIndex = selectedRow ? rows.indexOf(selectedRow) : -1;
  const selectedDate = (selectedRow?.forecastTime ?? "").slice(0, 10);
  const dayRows = rows.filter((row) => row.forecastTime.startsWith(selectedDate));

  useEffect(() => {
    const resolvedTime = resolveSelectedForecastTime(rows, selectedTime);
    if (resolvedTime !== selectedTime) onSelectedTimeChange(resolvedTime);
  }, [rows, selectedTime, onSelectedTimeChange]);

  return (
    <section className="spotEvaluationCard" aria-live="polite">
      <header className="spotEvaluationHeader">
        <div><p className="eyebrow">Spot evaluation</p><h2>地点評価</h2></div>
        <span>{props.selectedSpot?.areaName ?? "対象地点なし"}</span>
      </header>
      <SpotCombobox spots={props.spots} selected={props.selectedSpot} onSelect={props.onSelectedSpotIdChange} />
      <button type="button" className="focusMapButton" disabled={!props.selectedSpot} onClick={props.onFocusMap}>
        マップで場所を確認
      </button>

      <div className="sharedTimeControls" aria-label="評価・環境の共通日時">
        <label>日付<input type="date" value={selectedDate} disabled={!rows.length} onChange={(event) => props.onSelectedTimeChange(rows.find((row) => row.forecastTime.startsWith(event.target.value))?.forecastTime ?? resolveSelectedForecastTime(rows, null))} /></label>
        <label>時刻<select value={selectedRow?.forecastTime ?? ""} disabled={!selectedRow} onChange={(event) => props.onSelectedTimeChange(event.target.value)}>{dayRows.map((row) => <option key={row.forecastTime} value={row.forecastTime}>{row.forecastTime.slice(11, 16)}</option>)}</select></label>
        <button type="button" disabled={selectedIndex <= 0} onClick={() => props.onSelectedTimeChange(rows[selectedIndex - 1]?.forecastTime ?? props.selectedTime)}>前の1時間</button>
        <button type="button" disabled={!rows.length} onClick={() => props.onSelectedTimeChange(getNearestForecastTime(rows))}>現在時刻へ戻る</button>
        <button type="button" disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1} onClick={() => props.onSelectedTimeChange(rows[selectedIndex + 1]?.forecastTime ?? props.selectedTime)}>次の1時間</button>
      </div>

      <div className="spotInternalTabs" role="tablist" aria-label="地点評価の表示内容">
        {tabs.map((tab) => <button type="button" role="tab" id={`spot-tab-${tab}`} aria-selected={props.activeTab === tab} aria-controls={`spot-panel-${tab}`} tabIndex={props.activeTab === tab ? 0 : -1} key={tab} onClick={() => props.onActiveTabChange(tab)}>{tab}</button>)}
      </div>
      <div role="tabpanel" id={`spot-panel-${props.activeTab}`} aria-labelledby={`spot-tab-${props.activeTab}`}>
        {props.activeTab === "評価" && <EvaluationTab {...props} selectedTime={props.selectedTime} />}
        {props.activeTab === "環境" && <EnvironmentTab environment={props.environment} row={selectedRow} loading={props.isLoading} error={props.error} />}
        {props.activeTab === "釣場" && <DetailTab details={scopeSpotDetails(props.details, props.selectedSpotId)} status={props.detailStatus} items={fishingItems} />}
        {props.activeTab === "地形" && <DetailTab details={scopeSpotDetails(props.details, props.selectedSpotId)} status={props.detailStatus} items={terrainItems} />}
      </div>
    </section>
  );
}

function SpotCombobox({ spots, selected, onSelect }: { spots: FishingSpot[]; selected?: FishingSpot; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setQuery(selected?.name ?? ""), [selected]);
  useEffect(() => { const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, []);
  const normalized = query.trim().toLocaleLowerCase("ja");
  const matches = spots.filter((spot) => !normalized || `${spot.name} ${spot.areaName}`.toLocaleLowerCase("ja").includes(normalized));
  const choose = (spot: FishingSpot) => { onSelect(spot.id); setQuery(spot.name); setOpen(false); };
  return <div className="spotCombobox" ref={root}>
    <label htmlFor="spot-search">地点名・エリア名で検索</label>
    <input id="spot-search" role="combobox" aria-expanded={open} aria-controls="spot-options" aria-autocomplete="list" aria-activedescendant={open && matches[active] ? `spot-option-${matches[active].id}` : undefined} value={query} placeholder="例: 芥屋、唐津湾" onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }} onKeyDown={(event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((value) => Math.min(value + 1, matches.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
      if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); choose(matches[active]); }
      if (event.key === "Escape") { setOpen(false); setQuery(selected?.name ?? ""); }
      if (event.key === "Tab") setOpen(false);
    }} />
    {open && <ul id="spot-options" role="listbox">{matches.length ? matches.map((spot, index) => <li id={`spot-option-${spot.id}`} role="option" aria-selected={index === active} key={spot.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(spot)}><strong>{spot.name}</strong><span>{spot.areaName}</span></li>) : <li className="noOptions">候補がありません</li>}</ul>}
  </div>;
}

function EvaluationTab(props: Props & { selectedTime: string | null }) {
  if (!props.selectedSpot) return <StateMessage>地点が未選択のため、総合評価未算出です。</StateMessage>;
  const details = props.detailStatus === "ready" ? scopeSpotDetails(props.details, props.selectedSpot.id) : null;
  const result = calculateProductionScoreV2({ spot: props.selectedSpot, details, catches: props.catches, environment: props.environment, selectedDateTime: getEvaluationReferenceTime(props.selectedTime), jmaWarning: props.jmaWarning });
  const species = result.speciesResults.filter((item) => item.informationStatus !== "no_information").sort((a, b) => (b.overallScore ?? b.spotCompatibilityScore ?? -1) - (a.overallScore ?? a.spotCompatibilityScore ?? -1)).slice(0, 5);
  const methods = result.methodResults.filter((item) => item.informationStatus !== "no_information").sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1) || (b.spotSuitabilityScore ?? -1) - (a.spotSuitabilityScore ?? -1));
  return <div className="evaluationContent">
    <JmaWarningPanel decision={props.jmaWarning} />
    {result.status !== "available" && <StateMessage>{result.displayMessage}。地点相性のみ参考点として表示します。</StateMessage>}
    <div className="evaluationTitle"><h3>魚種評価</h3><button type="button" onClick={props.onShowAllSpecies}>すべて表示</button></div>
    <div className="scoreCards">{species.map((item) => <article key={item.species} className="scoreCard"><header><h4>{item.species}</h4><strong>{item.overallScore === null ? "総合点未算出" : `総合点 ${item.overallScore}点`}</strong></header><p>地点相性 参考点: {item.spotCompatibilityScore === null ? "情報なし" : `${item.spotCompatibilityScore}点`}</p><ConfidenceSummary spot={item.confidence.spot} environment={item.confidence.environment} /><p>{item.partialData ? "一部情報未反映" : "必要情報を反映"}</p><ul>{item.reasons.slice(0, 2).map((reason, index) => <li key={`${reason.label}-${index}`}>{reason.label}{reason.confidence ? `（信憑性: ${confidenceLabel[reason.confidence]}）` : ""}: {reason.displayNote}</li>)}</ul></article>)}</div>
    {!species.length && <StateMessage>魚種評価に利用できる情報がありません。</StateMessage>}
    <h3>釣法評価</h3><div className="methodScores">{methods.map((item) => <article key={item.method}><h4>{item.method}</h4><strong>{item.overallScore === null ? "総合点未算出" : `総合点 ${item.overallScore}点`}</strong><span>釣り場適性 参考点: {item.spotSuitabilityScore === null ? "情報なし" : `${item.spotSuitabilityScore}点`}</span><span>対応魚種数: {item.contributingSpeciesCount}</span></article>)}</div>
    {!methods.length && <StateMessage>情報のある釣法はありません。</StateMessage>}
  </div>;
}

function JmaWarningPanel({ decision }: { decision: JmaWarningDecision | null }) {
  if (!decision) return <StateMessage>気象庁情報を確認中です。確認できるまで総合点を表示しません。</StateMessage>;
  const { heading, unknownReason } = getJmaWarningPresentation(decision);
  const format = (value: string | null) => value ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "該当なし";
  return <aside className={`jmaWarningPanel ${decision.state}`} aria-label="気象庁警報・注意報の加工判定">
    <h3>{heading}</h3>
    <dl><div><dt>対象区域</dt><dd>{decision.areaName}</dd></div><div><dt>電文</dt><dd>{decision.bulletinType ?? "確認不能"}</dd></div><div><dt>発表時刻</dt><dd>{format(decision.reportDateTime)}</dd></div><div><dt>対象時間帯</dt><dd>{decision.targetStart ? `${format(decision.targetStart)}〜${format(decision.targetEnd)}` : "現在状態または対象外"}</dd></div></dl>
    {decision.phenomena.length > 0 && <p>対象情報: {decision.phenomena.join("、")}</p>}{decision.currentNotice && <p>{decision.currentNotice}</p>}
    {unknownReason && <p>{unknownReason} 総合点は表示しません。</p>}
    {decision.state === "unknown" && <p>最終正常取得時刻: {format(decision.lastSuccessfulFetchAt)}</p>}
    <p>出典: <a href="https://www.jma.go.jp/bosai/warning/" target="_blank" rel="noreferrer">気象庁 防災情報</a>（取得・加工日時: {format(decision.fetchedAt)}）</p>
    <p>この表示は公式XMLを加工した参考判定です。航海・現地の安全判断を代替しません。必ず最新の公式情報と現地状況を確認してください。</p>
  </aside>;
}

function ConfidenceSummary({ spot, environment }: { spot: { high: number; medium: number; low: number }; environment: { high: number; medium: number; low: number } }) {
  return <div className="confidenceSummary"><span>地点相性: 高{spot.high}・中{spot.medium}・低{spot.low}</span><span>環境評価: 高{environment.high}・中{environment.medium}・低{environment.low}</span></div>;
}

function EnvironmentTab({ environment, row, loading, error }: { environment: FishingEnvironment | null; row: FishingEnvironment["hourly"][number] | null; loading: boolean; error: string | null }) {
  if (loading && !environment) return <StateMessage>環境データを取得中です…</StateMessage>;
  if (error && !environment) return <StateMessage>APIエラー: 環境データを取得できませんでした。</StateMessage>;
  if (!environment) return <StateMessage>予報対象外: この地点で表示できる予報がありません。</StateMessage>;
  if (!row) return <StateMessage>対象行欠落: 選択日時の予報行がありません。</StateMessage>;
  const date = row.forecastTime.slice(0, 10); const events = getTideEventsForDate(environment.hourly, date); const badge = getTideEventBadgeForForecastTime(events, row.forecastTime, date);
  const value = (v: number | null | undefined, unit: string) => v == null ? "情報なし" : `${v}${unit}`;
  const fields = [
    ["天気", row.weather?.weatherLabel], ["気温", value(row.weather?.temperatureCelsius, "℃")], ["雨", `${value(row.weather?.precipitationMm, "mm")} / ${value(row.weather?.precipitationProbabilityPercent, "%")}`],
    ["風", `${value(row.weather?.windSpeedKmh, "km/h")} ${row.weather?.windDirectionLabel ?? "情報なし"} / 突風 ${value(row.weather?.windGustKmh, "km/h")}`], ["海面水温", value(row.marine?.seaSurfaceTemperatureCelsius, "℃")],
    ["波", `${value(row.marine?.waveHeightMeters, "m")} ${row.marine?.waveDirectionLabel ?? "情報なし"} / ${value(row.marine?.wavePeriodSeconds, "秒")}`], ["潮位参考", value(row.marine?.seaLevelHeightMslMeters, "m")],
    ["潮汐参考", `${getTidePhaseName(date)}${badge ? ` / ${badge.label}` : ""}`], ["海流", `${value(row.marine?.oceanCurrentVelocityKmh, "km/h")} ${row.marine?.oceanCurrentDirectionLabel ?? "情報なし"}`],
    ["データ状態", getEnvironmentStatusLabel(environment, error)],
  ];
  return <dl className="detailGrid">{fields.map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text || "情報なし"}</dd></div>)}</dl>;
}

function DetailTab({ details, status, items }: { details: FishingSpotDetailSet | null; status: SpotDetailLoadStatus; items: readonly (readonly [string, string])[] }) {
  if (status === "loading") return <StateMessage>地点詳細を取得中です…</StateMessage>;
  if (status === "failed") return <StateMessage>地点詳細を取得できませんでした。状態を表示できません。</StateMessage>;
  return <dl className="detailGrid">{items.flatMap(([key, label]) => { const item = findDisplayableSpotDetail(details, key); return item ? [<div key={key}><dt>{label}</dt><dd>{formatSpotDetailValue(item)}{item.confidence ? <span className={`confidence ${item.confidence}`}>信憑性: {confidenceLabel[item.confidence]}</span> : null}</dd></div>] : []; })}</dl>;
}
function StateMessage({ children }: { children: React.ReactNode }) { return <p className="spotEvaluationState" role="status">{children}</p>; }
