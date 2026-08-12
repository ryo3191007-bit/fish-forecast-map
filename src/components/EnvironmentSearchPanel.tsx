import type { EnvironmentSearchResult } from "@/domain/environmentSearch";

type Props = {
  date: string; time: string; minDate: string; maxDate: string;
  maxWind: string; maxWave: string; loading: boolean; results: EnvironmentSearchResult[] | null;
  onDateChange: (value: string) => void; onTimeChange: (value: string) => void;
  onMaxWindChange: (value: string) => void; onMaxWaveChange: (value: string) => void;
  onSearch: () => void; onReset: () => void; onSelectSpot: (spotId: string) => void;
};

const labels = { match: "条件一致", outside: "条件外", insufficient: "データ不足", failed: "取得失敗" } as const;

export function EnvironmentSearchPanel(props: Props) {
  const counts = props.results?.reduce((value, result) => ({ ...value, [result.status]: value[result.status] + 1 }), { match: 0, outside: 0, insufficient: 0, failed: 0 }) ?? null;
  return <section className="environmentSearchPanel" aria-label="環境条件で絞り込み">
    <div className="environmentSearchHeading"><div><p className="eyebrow">CONDITION SEARCH</p><h3>環境条件で絞り込み</h3></div><p>Open-Meteoの客観値との一致を表示します。安全や釣果を保証しません。</p></div>
    <div className="environmentSearchFields">
      <label>日付<input type="date" value={props.date} min={props.minDate} max={props.maxDate} onChange={(event) => props.onDateChange(event.target.value)} /></label>
      <label>時刻<input type="time" step="3600" value={props.time} onChange={(event) => props.onTimeChange(event.target.value)} /></label>
      <label>風速上限 km/h<input type="number" min="0" step="0.1" value={props.maxWind} placeholder="未指定" onChange={(event) => props.onMaxWindChange(event.target.value)} /></label>
      <label>波高上限 m<input type="number" min="0" step="0.1" value={props.maxWave} placeholder="未指定" onChange={(event) => props.onMaxWaveChange(event.target.value)} /></label>
    </div>
    <div className="environmentSearchActions"><button type="button" className="button" disabled={props.loading || (!props.maxWind && !props.maxWave) || !props.date || !props.time} onClick={props.onSearch}>{props.loading ? "検索中…" : "検索実行"}</button><button type="button" className="resetFiltersButton" disabled={props.loading && !props.results} onClick={props.onReset}>条件リセット</button></div>
    {counts && <p className="environmentSearchSummary" role="status">完了: 条件一致 {counts.match}件 / 条件外 {counts.outside}件 / データ不足・取得失敗 {counts.insufficient + counts.failed}件</p>}
    {props.loading && <p className="environmentSearchSummary" role="status">各地点の予報を取得しています（同時取得数を制限しています）</p>}
    {props.results && <div className="environmentSearchResults">{props.results.map((result) => <button type="button" className={`environmentSearchResult is-${result.status}`} key={result.spotId} onClick={() => props.onSelectSpot(result.spotId)}>
      <span><strong>{result.spotName}</strong><b>{labels[result.status]}</b></span>
      <small>予報日時: {result.forecastTime.replace("T", " ")}（Asia/Tokyo）</small>
      <small>風速 {result.windSpeedKmh === null ? "データなし" : `${result.windSpeedKmh.toFixed(1)} km/h`} / 風向 {result.windDirectionLabel ?? "データなし"}</small>
      <small>波高 {result.waveHeightMeters === null ? "データなし" : `${result.waveHeightMeters.toFixed(1)} m`} / 波向 {result.waveDirectionLabel ?? "データなし"}</small>
      {result.reason && <small>{result.reason}</small>}
    </button>)}</div>}
  </section>;
}
