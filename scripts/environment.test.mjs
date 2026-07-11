import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'env-tests-'));
function compile(file, outName) {
  let source = fs.readFileSync(file, 'utf8')
    .replaceAll('"@/domain/environment"', '"./environment.mjs"')
    .replaceAll('from "@/services/openMeteo"', 'from "./openMeteo.mjs"');
  const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  fs.writeFileSync(path.join(tmp, outName), out);
}
compile('src/domain/environment.ts', 'environment.mjs');
compile('src/services/openMeteo.ts', 'openMeteo.mjs');
const env = await import(path.join(tmp, 'environment.mjs'));
const svc = await import(path.join(tmp, 'openMeteo.mjs'));

const point = { spotId: 'karatsu-port', spotName: '唐津港', latitude: 33.45, longitude: 129.97 };
const baseTime = '2026-07-11T00:00';
function storage(seed = {}) { const m = new Map(Object.entries(seed)); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), map: m }; }
function response(hourly, ok = true, status = 200) { return { ok, status, json: async () => ({ hourly }) }; }
function fetcher(weatherHourly, marineHourly, opts = {}) { return async (url, init) => {
  if (opts.abortAware && init?.signal) await new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }));
  if (opts.fail) throw new Error('fail');
  if (opts.httpFail) return response({}, false, 500);
  return url.includes('marine-api') ? response(marineHourly) : response(weatherHourly);
}; }
const weatherHourly = { time: [baseTime, '2026-07-11T01:00'], temperature_2m: [20, 21], weather_code: [0, 1], precipitation: [0, 1], precipitation_probability: [10, 20], wind_speed_10m: [5, 6], wind_direction_10m: [90, 180], wind_gusts_10m: [8, 9] };
const marineHourly = { time: [baseTime, '2026-07-11T01:00'], sea_surface_temperature: [22, 23], sea_level_height_msl: [0.1, 0.2], wave_height: [0.5, 0.6], wave_direction: [180, 270], wave_period: [5, 6], ocean_current_velocity: [1, 2], ocean_current_direction: [45, 90] };
const now = () => new Date('2026-07-11T00:10:00+09:00');

// 1 Weather/Marine success and integration
let result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, marineHourly), storage: storage(), now });
assert.equal(result.weatherAvailable, true); assert.equal(result.marineAvailable, true); assert.equal(result.hourly.length, 2);
// 2 weather only, 3 marine only
result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, { time: [baseTime] }), storage: storage(), now }); assert.equal(result.weatherAvailable, true); assert.equal(result.marineAvailable, false);
result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ time: [baseTime] }, marineHourly), storage: storage(), now }); assert.equal(result.weatherAvailable, false); assert.equal(result.marineAvailable, true);
// 4 both fail, 5 http fail, 6 timeout, 7 caller abort
await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: storage(), now }));
await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { httpFail: true }), storage: storage(), now }));
await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { abortAware: true }), timeoutMs: 1, storage: storage(), now }));
const ac = new AbortController(); ac.abort(); await assert.rejects(() => svc.fetchFishingEnvironment(point, { signal: ac.signal, fetchImpl: fetcher(weatherHourly, marineHourly), storage: storage(), now }), /aborted|Abort/);
// 8 null time preserves original index, 9 length mismatch
result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ ...weatherHourly, time: ['2026-07-11T00:00', null, '2026-07-11T02:00'], temperature_2m: [10, 99, 12] }, marineHourly), storage: storage(), now });
assert.equal(result.hourly.find(r => r.forecastTime === '2026-07-11T02:00').weather.temperatureCelsius, 12);
result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ time: [baseTime, '2026-07-11T01:00'], temperature_2m: [19] }, { time: ['2026-07-11T01:00'], wave_height: [0.7] }), storage: storage(), now }); assert.equal(result.hourly.length, 2);
// 10 invalid finite, 11 all missing unavailable
result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ time: [baseTime], temperature_2m: [NaN], weather_code: [Infinity], precipitation: ['x'], wind_speed_10m: [4] }, { time: [baseTime], wave_height: [null] }), storage: storage(), now }); assert.equal(result.weather.windSpeedKmh, 4); assert.equal(result.marineAvailable, false);
await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({ time: [baseTime], temperature_2m: [null] }, { time: [baseTime], wave_height: [null] }), storage: storage(), now }));
// 12-18 cache validation and storage exceptions
const st = storage(); result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, marineHourly), storage: st, now });
await assert.deepEqual((await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now })).cacheStatus, 'fresh');
const key = [...st.map.keys()][0]; const cached = JSON.parse(st.map.get(key)); cached.fetchedAt = '2026-07-10T14:00:00.000Z'; st.map.set(key, JSON.stringify(cached)); assert.equal((await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now })).fetchStatus, 'fallback');
cached.fetchedAt = '2026-07-09T00:00:00.000Z'; st.map.set(key, JSON.stringify(cached)); await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now }));
st.map.set(key, '{'); await assert.rejects(() => svc.fetchFishingEnvironment(point, { fetchImpl: fetcher({}, {}, { fail: true }), storage: st, now }));
st.map.set(key, JSON.stringify({ ...cached, version: 'old' })); assert.equal(svc.isFishingEnvironmentLike(JSON.parse(st.map.get(key))), false);
st.map.set(key, JSON.stringify({ ...cached, tideReference: {} })); assert.equal(svc.isFishingEnvironmentLike(JSON.parse(st.map.get(key))), false);
const badStorage = { getItem(){ throw new Error('private'); }, setItem(){ throw new Error('quota'); } }; result = await svc.fetchFishingEnvironment(point, { fetchImpl: fetcher(weatherHourly, marineHourly), storage: badStorage, now }); assert.equal(result.weatherAvailable, true);
// 19 reference known/unknown
assert.equal(svc.getTideReference(point).referenceName, '唐津'); assert.equal(svc.getTideReference({ ...point, spotId: 'unknown' }).referenceName, '博多');
// 20 five tide cycles
assert.deepEqual(new Set(Array.from({ length: 30 }, (_, i) => env.getTideCycleForDate(new Date(Date.UTC(2026,6,10+i))).toString())).size, 5);
// 21-23 tide events boundaries and Tokyo date
const rows = ['2026-07-10T23:00:00+09:00','2026-07-11T00:00:00+09:00','2026-07-11T01:00:00+09:00','2026-07-11T12:00:00+09:00','2026-07-11T23:00:00+09:00','2026-07-12T00:00:00+09:00'].map((t,i)=>({ forecastTime:t, weather:null, marine:{ seaLevelHeightMslMeters:[0,2,0,3,0,1][i], seaSurfaceTemperatureCelsius:null, waveHeightMeters:null, waveDirectionDegrees:null, waveDirectionLabel:'データなし', wavePeriodSeconds:null, oceanCurrentVelocityKmh:null, oceanCurrentDirectionDegrees:null, oceanCurrentDirectionLabel:'データなし', observedAt:t }}));
const events = env.getTideEventsForDate(rows, '2026-07-11'); assert(events.some(e=>e.forecastTime.includes('00:00'))); assert(events.some(e=>e.forecastTime.includes('12:00'))); assert(events.some(e=>e.forecastTime.includes('23:00')));
// 24 stale response guard in component source
const dashboard = fs.readFileSync('src/components/FishingDashboard.tsx','utf8'); assert(dashboard.includes('let isActive = true')); assert((dashboard.match(/if \(!isActive\) return/g) ?? []).length >= 3); assert(dashboard.includes('isActive = false')); assert(dashboard.includes('abortController.abort()'));
console.log('24 environment forecast cases passed');
