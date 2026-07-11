import assert from "node:assert/strict";
import {
  getNearestForecastTime,
  getTideEventsForDate,
  getTidePhaseName,
  getTideReferenceForSpot,
  parseForecastTime,
  type EnvironmentForecastRow,
  type TidePhaseName,
} from "../src/domain/environment";

const tideRows: EnvironmentForecastRow[] = [
  tideRow("2026-07-11T00:00", 0.2),
  tideRow("2026-07-11T01:00", 0.5),
  tideRow("2026-07-11T02:00", 0.9),
  tideRow("2026-07-11T03:00", 0.4),
  tideRow("2026-07-11T04:00", 0.1),
  tideRow("2026-07-11T05:00", 0.3),
  tideRow("2026-07-12T02:00", 1.2),
];

const tidePhaseExamples: Array<[string, TidePhaseName]> = [
  ["2000-01-06", "大潮"],
  ["2000-01-10", "中潮"],
  ["2000-01-15", "小潮"],
  ["2000-01-18", "長潮"],
  ["2000-01-19", "若潮"],
  ["2026-07-11", "長潮"],
];

for (const [dateText, expected] of tidePhaseExamples) {
  assert.equal(getTidePhaseName(dateText), expected, `${dateText} の潮回り参考を算出できる`);
}

assert.deepEqual(
  getTideEventsForDate(tideRows, "2026-07-11").map((event) => [event.type, event.approximateTime]),
  [["high", "02:00"], ["low", "04:00"]],
  "選択日のOpen-Meteo潮位参考値から満潮/干潮の山谷だけを抽出する",
);
assert.deepEqual(getTideEventsForDate(tideRows, "2026-07-10"), [], "潮位参考値が不足する日は空配列にする");
assert.equal(getTideReferenceForSpot("nokita-port").referenceName, "博多", "既知スポットは手動対応表の参照候補を返す");
assert.equal(getTideReferenceForSpot("unknown-spot").referenceName, null, "未設定スポットは誤った参照候補を返さない");
assert.equal(
  getNearestForecastTime(tideRows, parseForecastTime("2026-07-11T03:20")),
  "2026-07-11T03:00",
  "現在時刻に近い予報時刻を選択する",
);
assert.equal(parseForecastTime("2026-07-11T03:00").getUTCHours(), 18, "Asia/Tokyoの時刻文字列としてパースする");
assert.equal(parseForecastTime("2026-07-11T03:00:00+09:00").getUTCHours(), 18, "タイムゾーン付きISO文字列はそのままパースする");
assert.ok(Number.isNaN(parseForecastTime("not-a-date").getTime()), "不正な時刻文字列はInvalid Dateとして扱い、勝手に補正しない");

function tideRow(forecastTime: string, heightMeters: number): EnvironmentForecastRow {
  return {
    forecastTime,
    weather: null,
    marine: {
      seaSurfaceTemperatureCelsius: null,
      seaLevelHeightMslMeters: heightMeters,
      waveHeightMeters: null,
      waveDirectionDegrees: null,
      waveDirectionLabel: "データなし",
      wavePeriodSeconds: null,
      oceanCurrentVelocityKmh: null,
      oceanCurrentDirectionDegrees: null,
      oceanCurrentDirectionLabel: "データなし",
      observedAt: forecastTime,
    },
  };
}
