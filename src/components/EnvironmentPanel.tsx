"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getFishingEnvironmentAvailability,
  getNearestForecastTime,
  getTideEventsForDate,
  getTidePhaseName,
  parseForecastTime,
  type EnvironmentForecastRow,
  type FishingEnvironment,
  type TideEvent,
} from "@/domain/environment";
import type { FishingSpot } from "@/domain/fishingSpot";

type EnvironmentPanelProps = {
  selectedSpot: FishingSpot | undefined;
  spots: FishingSpot[];
  selectedSpotId: string;
  onSelectedSpotIdChange: (spotId: string) => void;
  environment: FishingEnvironment | null;
  isLoading: boolean;
  error: string | null;
};

export function EnvironmentPanel({
  selectedSpot,
  spots,
  selectedSpotId,
  onSelectedSpotIdChange,
  environment,
  isLoading,
  error,
}: EnvironmentPanelProps) {
  const targetName = selectedSpot?.name ?? "対象地点なし";
  const rows = useMemo(() => environment?.hourly ?? [], [environment]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTime(getNearestForecastTime(rows));
  }, [rows]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.forecastTime === selectedTime) ?? rows[0] ?? null,
    [rows, selectedTime],
  );
  const selectedDate = selectedRow?.forecastTime.slice(0, 10) ?? "";
  const dayRows = useMemo(() => rows.filter((row) => row.forecastTime.startsWith(selectedDate)), [rows, selectedDate]);
  const selectedIndex = selectedRow ? rows.findIndex((row) => row.forecastTime === selectedRow.forecastTime) : -1;
  const dataStatus = getDataStatusLabel(environment);
  const tidePhase = selectedDate ? getTidePhaseName(selectedDate) : null;
  const tideEvents = useMemo(() => getTideEventsForDate(rows, selectedDate), [rows, selectedDate]);

  return (
    <aside className="environmentPanel" aria-live="polite">
      <div className="environmentHeader">
        <div>
          <p className="eyebrow">Environment data</p>
          <h2>環境データ: {targetName}</h2>
        </div>
        <span className="environmentBadge">Open-Meteo / 7日間</span>
      </div>

      <div className="environmentSafety">
        この情報は釣行計画の参考情報です。現地の警報・注意報、公式潮汐表、海況を必ず確認してください。航海、立入可否、避難判断などの安全判断には利用できません。
      </div>

      <div className="environmentSpotFilter">
        <label className="sortSelectLabel" htmlFor="environment-spot">地点フィルタ</label>
        <select id="environment-spot" className="sortSelect" value={selectedSpotId} onChange={(event) => onSelectedSpotIdChange(event.target.value)}>
          {spots.map((spot) => (
            <option value={spot.id} key={spot.id}>{spot.name} / {spot.areaName}</option>
          ))}
        </select>
        {selectedSpot ? (
          <p className="environmentSpotMeta">
            {selectedSpot.name}（緯度 {selectedSpot.latitude.toFixed(3)} / 経度 {selectedSpot.longitude.toFixed(3)}）の環境データを表示します。一覧・地図フィルタとは独立しています。
          </p>
        ) : null}
      </div>

      {!selectedSpot ? <p className="environmentState">表示中の釣果地点がないため、環境データの取得対象がありません。</p> : null}
      {isLoading ? <p className="environmentState">選択地点の天気・海況データを取得中です… キャッシュがあれば先に表示します。</p> : null}
      {error ? <p className="environmentState error">環境データを取得できませんでした。釣果一覧と地図はそのまま利用できます。</p> : null}
      {environment?.warning ? <p className="environmentState warning">{environment.warning}</p> : null}

      {environment && selectedRow ? (
        <div className="environmentContentWide">
          <div className="environmentStatusGrid">
            <span>データ状態: {dataStatus}</span>
            <span>予報対象時刻: {formatDateTime(selectedRow.forecastTime)}</span>
            <span>データ取得時刻: {formatIsoDateTime(environment.fetchedAt)}</span>
          </div>

          <div className="environmentTimeControls">
            <label className="sortSelectLabel">
              日付
              <input
                className="searchInput"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedTime(rows.find((row) => row.forecastTime.startsWith(event.target.value))?.forecastTime ?? selectedTime)}
              />
            </label>
            <label className="sortSelectLabel">
              時刻
              <select className="sortSelect" value={selectedRow.forecastTime} onChange={(event) => setSelectedTime(event.target.value)}>
                {dayRows.map((row) => <option key={row.forecastTime} value={row.forecastTime}>{row.forecastTime.slice(11, 16)}</option>)}
              </select>
            </label>
            <button className="environmentNavButton" type="button" onClick={() => setSelectedTime(rows[selectedIndex - 1]?.forecastTime ?? selectedTime)} disabled={selectedIndex <= 0}>前の1時間</button>
            <button className="environmentNavButton" type="button" onClick={() => setSelectedTime(getNearestForecastTime(rows))}>現在時刻へ戻る</button>
            <button className="environmentNavButton" type="button" onClick={() => setSelectedTime(rows[selectedIndex + 1]?.forecastTime ?? selectedTime)} disabled={selectedIndex === -1 || selectedIndex >= rows.length - 1}>次の1時間</button>
          </div>

          <div className="environmentContent">
            <MetricGroup
              title="天気"
              items={[
                ["気温", formatValue(selectedRow.weather?.temperatureCelsius, "℃")],
                ["天気", selectedRow.weather?.weatherLabel ?? "--"],
                ["降水量", formatValue(selectedRow.weather?.precipitationMm, "mm")],
                ["降水確率", formatValue(selectedRow.weather?.precipitationProbabilityPercent, "%")],
                ["風速", formatValue(selectedRow.weather?.windSpeedKmh, "km/h")],
                ["風向", formatDirection(selectedRow.weather?.windDirectionLabel, selectedRow.weather?.windDirectionDegrees)],
                ["突風", formatValue(selectedRow.weather?.windGustKmh, "km/h")],
              ]}
            />
            <MetricGroup
              title="海況"
              items={[
                ["海面水温", formatValue(selectedRow.marine?.seaSurfaceTemperatureCelsius, "℃")],
                ["潮位参考値", formatValue(selectedRow.marine?.seaLevelHeightMslMeters, "m")],
                ["波高", formatValue(selectedRow.marine?.waveHeightMeters, "m")],
                ["波向", formatDirection(selectedRow.marine?.waveDirectionLabel, selectedRow.marine?.waveDirectionDegrees)],
                ["波周期", formatValue(selectedRow.marine?.wavePeriodSeconds, "秒")],
                ["海流速度", formatValue(selectedRow.marine?.oceanCurrentVelocityKmh, "km/h")],
                ["海流方向", formatDirection(selectedRow.marine?.oceanCurrentDirectionLabel, selectedRow.marine?.oceanCurrentDirectionDegrees)],
              ]}
            />
          </div>

          <TideReferenceBlock environment={environment} tidePhase={tidePhase} tideEvents={tideEvents} />
          <HourlyList rows={dayRows} selectedTime={selectedRow.forecastTime} onSelect={setSelectedTime} />
        </div>
      ) : !isLoading && !error ? (
        <p className="environmentState">この地点で表示できる環境データがありません。</p>
      ) : null}

      <p className="environmentNote">
        表示値はOpen-Meteoの予報値・参考値です。潮位参考値は正式な満潮/干潮時刻表ではなく、釣果や安全を保証しません。
      </p>
    </aside>
  );
}

function TideReferenceBlock({ environment, tidePhase, tideEvents }: { environment: FishingEnvironment; tidePhase: string | null; tideEvents: TideEvent[] }) {
  return (
    <div className="tideReference">
      <strong>潮汐参考情報</strong>
      <span>選択日の潮回り参考: {tidePhase ?? "--"}（月齢からの簡易算出）</span>
      <span>満潮・干潮参考: {formatTideEvents(tideEvents)}</span>
      <span>{environment.tideReference.referenceName ? `気象庁参照候補: ${environment.tideReference.referenceName}` : "気象庁参照地点: 未設定"}</span>
      <a href={environment.tideReference.url} target="_blank" rel="noopener noreferrer">気象庁の公式潮位表を新しいタブで開く</a>
      <small>{environment.tideReference.note} Open-Meteoの潮位参考値から抽出した「○時ごろ」は満潮・干潮の公式時刻ではなく、安全判断には利用できません。</small>
    </div>
  );
}

function HourlyList({ rows, selectedTime, onSelect }: { rows: EnvironmentForecastRow[]; selectedTime: string; onSelect: (time: string) => void }) {
  return (
    <div className="hourlyScroller" aria-label="選択日の時間別一覧">
      {rows.map((row) => (
        <button type="button" key={row.forecastTime} className={row.forecastTime === selectedTime ? "hourlyCard active" : "hourlyCard"} onClick={() => onSelect(row.forecastTime)}>
          <strong>{row.forecastTime.slice(11, 16)}</strong>
          <span>{row.weather?.weatherLabel ?? "天気--"}</span>
          <span>降水 {formatValue(row.weather?.precipitationMm, "mm")}</span>
          <span>風 {formatValue(row.weather?.windSpeedKmh, "km/h")}</span>
          <span>波 {formatValue(row.marine?.waveHeightMeters, "m")}</span>
          <span>水温 {formatValue(row.marine?.seaSurfaceTemperatureCelsius, "℃")}</span>
        </button>
      ))}
    </div>
  );
}

function MetricGroup({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="environmentGroup">
      <h3>{title}</h3>
      <dl className="environmentMetrics">
        {items.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function getDataStatusLabel(environment: FishingEnvironment | null) {
  if (!environment) return "キャッシュなしエラー";
  const availability = getFishingEnvironmentAvailability(environment);
  const cache = environment.cacheStatus === "fresh" ? "最新" : environment.cacheStatus === "cache-fresh" ? "キャッシュ" : environment.cacheStatus === "cache-stale" ? "古いキャッシュ" : "キャッシュなし";
  const partial = availability === "weather-only" ? " / 天気のみ" : availability === "marine-only" ? " / 海況のみ" : "";
  return `${cache}${partial}`;
}

function formatTideEvents(events: TideEvent[]) {
  if (events.length === 0) return "潮位参考値が不足しているため抽出できません";
  return events.map((event) => `${event.type === "high" ? "満潮" : "干潮"} ${event.approximateTime.slice(0, 2)}時ごろ`).join(" / ");
}

function formatValue(value: number | null | undefined, unit: string) {
  return typeof value === "number" ? `${Math.round(value * 10) / 10}${unit}` : "--";
}

function formatDirection(label: string | undefined, degrees: number | null | undefined) {
  if (!label || label === "データなし") return "--";
  return typeof degrees === "number" ? `${label} (${Math.round(degrees)}°)` : label;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(parseForecastTime(value));
}

function formatIsoDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(value));
}
