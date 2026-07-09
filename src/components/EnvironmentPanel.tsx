import type { FishingEnvironment } from "@/domain/environment";
import type { FishingSpot } from "@/domain/fishing";

type EnvironmentPanelProps = {
  spots: FishingSpot[];
  selectedSpotId: string;
  onSelectedSpotChange: (spotId: string) => void;
  environment: FishingEnvironment | null;
  isLoading: boolean;
  error: string | null;
};

export function EnvironmentPanel({ spots, selectedSpotId, onSelectedSpotChange, environment, isLoading, error }: EnvironmentPanelProps) {
  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId);
  const targetName = selectedSpot?.name ?? "対象地点なし";
  const partialStateMessage = getPartialStateMessage(environment);

  return (
    <aside className="environmentPanel" aria-live="polite">
      <div className="environmentHeader">
        <div>
          <p className="eyebrow">Environment data</p>
          <h2>環境データ: {targetName}</h2>
        </div>
        <span className="environmentBadge">Open-Meteo</span>
      </div>

      <div className="environmentSpotControl">
        <label className="sortSelectLabel" htmlFor="environment-spot">地点フィルタ</label>
        <select
          id="environment-spot"
          className="sortSelect"
          value={selectedSpotId}
          onChange={(event) => onSelectedSpotChange(event.target.value)}
        >
          {spots.map((spot) => (
            <option value={spot.id} key={spot.id}>
              {spot.name} / {spot.areaName}
            </option>
          ))}
        </select>
        {selectedSpot ? (
          <p className="environmentSpotMeta">
            緯度 {selectedSpot.latitude} / 経度 {selectedSpot.longitude}
          </p>
        ) : null}
      </div>

      {!selectedSpot ? (
        <p className="environmentState">環境データの取得対象地点がありません。</p>
      ) : isLoading ? (
        <p className="environmentState">代表地点の天気・海況データを取得中です…</p>
      ) : error ? (
        <p className="environmentState error">環境データを取得できませんでした。釣果一覧と地図はそのまま利用できます。</p>
      ) : !environment || (!environment.weather && !environment.marine) ? (
        <p className="environmentState">この地点で表示できる環境データがありません。</p>
      ) : (
        <div className="environmentContent">
          {partialStateMessage ? <p className="environmentState warning">{partialStateMessage}</p> : null}
          <MetricGroup
            title="天気"
            items={[
              ["気温", formatValue(environment.weather?.temperatureCelsius, "℃")],
              ["天気", environment.weather?.weatherLabel ?? "--"],
              ["降水量", formatValue(environment.weather?.precipitationMm, "mm")],
              ["風速", formatValue(environment.weather?.windSpeedKmh, "km/h")],
              ["風向", formatDirection(environment.weather?.windDirectionLabel, environment.weather?.windDirectionDegrees)],
              ["突風", formatValue(environment.weather?.windGustKmh, "km/h")],
            ]}
          />
          <MetricGroup
            title="海況"
            items={[
              ["海面水温", formatValue(environment.marine?.seaSurfaceTemperatureCelsius, "℃")],
              ["潮位参考値", formatValue(environment.marine?.seaLevelHeightMslMeters, "m")],
              ["波高", formatValue(environment.marine?.waveHeightMeters, "m")],
              ["海流速度", formatValue(environment.marine?.oceanCurrentVelocityKmh, "km/h")],
              ["海流方向", formatDirection(environment.marine?.oceanCurrentDirectionLabel, environment.marine?.oceanCurrentDirectionDegrees)],
            ]}
          />
        </div>
      )}

      <p className="environmentNote">
        表示値はOpen-Meteoの予報値・参考値です。潮位参考値は正式な満潮/干潮時刻表ではなく、航海用・安全判断用には利用しないでください。
      </p>
    </aside>
  );
}

function getPartialStateMessage(environment: FishingEnvironment | null) {
  if (!environment) return null;
  if (environment.weather && !environment.marine) return "天気データのみ表示中です。海況データを取得できませんでした。";
  if (!environment.weather && environment.marine) return "海況データのみ表示中です。天気データを取得できませんでした。";
  return null;
}

function MetricGroup({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="environmentGroup">
      <h3>{title}</h3>
      <dl className="environmentMetrics">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatValue(value: number | null | undefined, unit: string) {
  return typeof value === "number" ? `${Math.round(value * 10) / 10}${unit}` : "--";
}

function formatDirection(label: string | undefined, degrees: number | null | undefined) {
  if (!label || label === "データなし") return "--";
  return typeof degrees === "number" ? `${label} (${Math.round(degrees)}°)` : label;
}
