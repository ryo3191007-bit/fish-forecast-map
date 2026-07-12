import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'env-tests-'));
function compile(file, outName) {
  const source = fs.readFileSync(file, 'utf8').replaceAll('"@/domain/environment"', '"./environment.mjs"');
  const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  fs.writeFileSync(path.join(tmp, outName), out);
}
compile('src/domain/environment.ts', 'environment.mjs');
compile('src/services/openMeteo.ts', 'openMeteo.mjs');
const env = await import(path.join(tmp, 'environment.mjs'));
const svc = await import(path.join(tmp, 'openMeteo.mjs'));

let passed = 0;
async function test(name, fn) { await fn(); passed += 1; }
const point = { spotId: 'karatsu-east-port', spotName: '唐津東港', latitude: 33.45, longitude: 129.97 };
const baseTime = '2026-07-11T00:00';
const now = () => new Date('2026-07-10T15:10:00.000Z');
function memoryStorage() { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), map: m }; }
function response(hourly, ok = true, status = 200) { return { ok, status, json: async () => ({ hourly }) }; }
function fetcher(weatherHourly, marineHourly, opts = {}) { return async (url, init) => {
  if (opts.abortAware && init?.signal) await new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }));
  if (opts.fail) throw new Error('fail');
  if (opts.httpFail) return response({}, false, 500);
  return url.includes('marine-api') ? response(marineHourly) : response(weatherHourly);
}; }
const weatherHourly = { time: [baseTime, '2026-07-11T01:00'], temperature_2m: [20, 21], weather_code: [0, 1], precipitation: [0, 1], precipitation_probability: [10, 20], wind_speed_10m: [5, 6], wind_direction_10m: [90, 180], wind_gusts_10m: [8, 9] };
const marineHourly = { time: [baseTime, '2026-07-11T01:00'], sea_surface_temperature: [22, 23], sea_level_height_msl: [0.1, 0.2], wave_height: [0.5, 0.6], wave_direction: [180, 270], wave_period: [5, 6], ocean_current_velocity: [1, 2], ocean_current_direction: [45, 90] };
async function seedStaleCache(fetchImpl = fetcher(weatherHourly, marineHourly)) {
  const st = memoryStorage();
  await svc.fetchFishingEnvironment(point, { fetchImpl, storage: st, now });
  const key = [...st.map.keys()][0];
  const payload = JSON.parse(st.map.get(key));
  payload.savedAt = '2026-07-10T14:00:00.000Z';
  st.map.set(key, JSON.stringify(payload));
  return { st, key, payload };
}

await test('Weather/Marine同時成功と時刻統合', async () => {
  const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, marineHourly), storage: memoryStorage(), now });
  assert.equal(result.weatherAvailable, true); assert.equal(result.marineAvailable, true); assert.equal(result.hourly.length, 2);
});
await test('Weatherのみ成功', async () => {
  const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, { time: [baseTime] }), storage: memoryStorage(), now });
  assert.equal(result.weatherAvailable, true); assert.equal(result.marineAvailable, false);
});
await test('Marineのみ成功', async () => {
  const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ time: [baseTime] }, marineHourly), storage: memoryStorage(), now });
  assert.equal(result.weatherAvailable, false); assert.equal(result.marineAvailable, true);
});
await test('両API失敗', async () => assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: memoryStorage(), now })));
await test('HTTP非2xx', async () => assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { httpFail: true }), storage: memoryStorage(), now })));
await test('タイムアウト', async () => assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { abortAware: true }), timeoutMs: 1, storage: memoryStorage(), now })));
await test('呼出元Abort', async () => { const ac = new AbortController(); ac.abort(); await assert.rejects(() => svc.fetchFishingEnvironment(point, { signal: ac.signal, fetchImpl: fetcher(weatherHourly, marineHourly), storage: memoryStorage(), now }), /aborted|Abort/); });
await test('time途中nullでも元indexを維持', async () => {
  const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ ...weatherHourly, time: ['2026-07-11T00:00', null, '2026-07-11T02:00'], temperature_2m: [10, 99, 12] }, marineHourly), storage: memoryStorage(), now });
  assert.equal(result.hourly.find((row) => row.forecastTime === '2026-07-11T02:00').weather.temperatureCelsius, 12);
});
await test('hourly配列長不一致', async () => {
  const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ time: [baseTime, '2026-07-11T01:00'], temperature_2m: [19] }, { time: ['2026-07-11T01:00'], wave_height: [0.7] }), storage: memoryStorage(), now });
  assert.equal(result.hourly.length, 2);
});
await test('NaN/Infinity/文字列値を無効化', async () => {
  const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ time: [baseTime], temperature_2m: [NaN], weather_code: [Infinity], precipitation: ['x'], wind_speed_10m: [4] }, { time: [baseTime], wave_height: [null] }), storage: memoryStorage(), now });
  assert.equal(result.hourly[0].weather.windSpeedKmh, 4); assert.equal(result.marineAvailable, false);
});
await test('全項目欠損APIを利用不可扱い', async () => assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ time: [baseTime], temperature_2m: [null] }, { time: [baseTime], wave_height: [null] }), storage: memoryStorage(), now })));
await test('freshキャッシュ', async () => { const st = memoryStorage(); await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, marineHourly), storage: st, now }); assert.equal((await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now })).cacheStatus, 'cache-fresh'); });
await test('30分超〜24時間以内のstale fallback', async () => { const { st } = await seedStaleCache(); assert.equal((await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now })).warning.includes('キャッシュ'), true); });
await test('24時間超の期限切れ', async () => { const { st, key, payload } = await seedStaleCache(); payload.savedAt = '2026-07-09T00:00:00.000Z'; st.map.set(key, JSON.stringify(payload)); await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now })); });
await test('JSON破損', async () => { const { st, key } = await seedStaleCache(); st.map.set(key, '{'); await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now })); });
await test('version不一致', async () => { const { st, key, payload } = await seedStaleCache(); payload.version = 'old'; st.map.set(key, JSON.stringify(payload)); await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now })); });
await test('hourly行やtideReference等の構造不正', async () => { const { payload } = await seedStaleCache(); payload.environment.tideReference = {}; assert.equal(svc.isFishingEnvironmentLike(payload.environment), false); });
await test('localStorage getItem例外', async () => { const bad = { getItem(){ throw new Error('private'); }, setItem(){} }; const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, marineHourly), storage: bad, now }); assert.equal(result.weatherAvailable, true); });
await test('localStorage setItem例外', async () => { const bad = { getItem(){ return null; }, setItem(){ throw new Error('quota'); } }; const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, marineHourly), storage: bad, now }); assert.equal(result.marineAvailable, true); });
await test('既知/未設定の潮位参照地点', async () => { assert.equal(env.getTideReferenceForSpot('karatsu-east-port').referenceName, '唐津'); assert.equal(env.getTideReferenceForSpot('unknown').referenceName, null); });
await test('5種類の潮回り代表日', async () => { assert.equal(env.getTidePhaseName('2026-07-15'), '大潮'); assert.equal(env.getTidePhaseName('2026-07-18'), '中潮'); assert.equal(env.getTidePhaseName('2026-07-23'), '小潮'); assert.equal(env.getTidePhaseName('2026-07-26'), '長潮'); assert.equal(env.getTidePhaseName('2026-07-27'), '若潮'); });
function tideRow(time, height) { return { forecastTime: time, weather: null, marine: { seaLevelHeightMslMeters: height, seaSurfaceTemperatureCelsius: null, waveHeightMeters: null, waveDirectionDegrees: null, waveDirectionLabel: 'データなし', wavePeriodSeconds: null, oceanCurrentVelocityKmh: null, oceanCurrentDirectionDegrees: null, oceanCurrentDirectionLabel: 'データなし', observedAt: time } }; }
await test('通常時刻の満潮/干潮', async () => { const events = env.getTideEventsForDate([tideRow('2026-07-11T09:00',0), tideRow('2026-07-11T10:00',2), tideRow('2026-07-11T11:00',0)], '2026-07-11'); assert.equal(events[0].type, 'high'); assert.equal(events[0].approximateTime, '10:00'); });
await test('00時・23時境界の満潮/干潮', async () => { const events = env.getTideEventsForDate([tideRow('2026-07-10T23:00',0), tideRow('2026-07-11T00:00',2), tideRow('2026-07-11T01:00',0), tideRow('2026-07-11T22:00',2), tideRow('2026-07-11T23:00',0), tideRow('2026-07-12T00:00',1)], '2026-07-11'); assert(events.some((e) => e.approximateTime === '00:00')); assert(events.some((e) => e.approximateTime === '23:00')); });
await test('Asia/Tokyo時刻処理', async () => { assert.equal(env.parseForecastTime('2026-07-11T00:00').toISOString(), '2026-07-10T15:00:00.000Z'); const rows = [{ forecastTime: '2026-07-11T00:00', weather: { temperatureCelsius: 1, weatherCode: null, weatherLabel: 'x', precipitationMm: null, precipitationProbabilityPercent: null, windSpeedKmh: null, windDirectionDegrees: null, windDirectionLabel: 'データなし', windGustKmh: null, observedAt: '2026-07-11T00:00' }, marine: null }]; assert.equal(env.getNearestForecastTime(rows, new Date('2026-07-10T15:01:00Z')), '2026-07-11T00:00'); });
await test('潮汐バッジは00時台の満潮に決定的に付く', async () => { const badge = env.getTideEventBadgeForForecastTime([{ type: 'high', approximateTime: '00:30', heightMeters: 1.2 }], '2026-07-11T00:00', '2026-07-11'); assert.deepEqual(badge, { type: 'high', label: '満潮' }); });
await test('潮汐バッジは00時台の干潮に決定的に付く', async () => { const badge = env.getTideEventBadgeForForecastTime([{ type: 'low', approximateTime: '00:10', heightMeters: 0.1 }], '2026-07-11T00:00', '2026-07-11'); assert.deepEqual(badge, { type: 'low', label: '干潮' }); });
await test('潮汐バッジは23時台と別日同時刻へ誤付与しない', async () => { const events = [{ type: 'high', approximateTime: '00:10', heightMeters: 1.2 }]; assert.equal(env.getTideEventBadgeForForecastTime(events, '2026-07-11T23:00', '2026-07-11'), null); assert.equal(env.getTideEventBadgeForForecastTime(events, '2026-07-12T00:00', '2026-07-11'), null); });
await test('地点切替の古い応答を無視するロジック', async () => { assert.equal(svc.shouldApplyEnvironmentRequest({ isActive: () => true }), true); assert.equal(svc.shouldApplyEnvironmentRequest({ isActive: () => false }), false); });
await test('timeout＋stale cacheはfallback', async () => { const { st } = await seedStaleCache(); const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { abortAware: true }), timeoutMs: 1, storage: st, now }); assert.equal(result.cacheStatus, 'cache-stale'); });
await test('HTTP非2xx＋stale cacheはfallback', async () => { const { st } = await seedStaleCache(); const result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { httpFail: true }), storage: st, now }); assert.equal(result.cacheStatus, 'cache-stale'); });
await test('caller abort＋stale cacheでもAbort', async () => { const { st } = await seedStaleCache(); const ac = new AbortController(); ac.abort(); await assert.rejects(() => svc.fetchFishingEnvironment(point, { signal: ac.signal, fetchImpl: fetcher(weatherHourly, marineHourly), storage: st, now }), /Abort|aborted/); });
await test('全null weather/marineオブジェクトを含むキャッシュを拒否', async () => { const { payload } = await seedStaleCache(); const row = payload.environment.hourly[0]; row.weather = { ...row.weather, temperatureCelsius: null, weatherCode: null, precipitationMm: null, precipitationProbabilityPercent: null, windSpeedKmh: null, windDirectionDegrees: null, windGustKmh: null }; row.marine = null; assert.equal(svc.isFishingEnvironmentLike(payload.environment), false); });
await test('availability矛盾キャッシュを拒否', async () => { const { payload } = await seedStaleCache(); payload.environment.weatherAvailable = false; assert.equal(svc.isFishingEnvironmentLike(payload.environment), false); });
await test('flat値と複数極値の潮位イベント', async () => { const events = env.getTideEventsForDate([0,1,1,0,2,0].map((h,i)=>tideRow(`2026-07-11T0${i}:00`, h)), '2026-07-11'); assert(events.some((e)=>e.approximateTime === '01:00')); assert(events.some((e)=>e.approximateTime === '04:00')); });

assert(passed >= 24);
console.log(`${passed} environment forecast cases passed`);
