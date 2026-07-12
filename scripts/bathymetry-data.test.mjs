import crypto from "node:crypto";
import fs from "node:fs";

const dem = JSON.parse(fs.readFileSync("data/bathymetry/gebco-2026-crop.json", "utf8"));
const tid = JSON.parse(fs.readFileSync("data/bathymetry/gebco-2026-tid-crop.json", "utf8"));
const expectedBounds = { west: 128.5, south: 32.5, east: 130.8, north: 34.0 };
function assert(condition, message) { if (!condition) throw new Error(message); }
function digest(record) { const copy = { ...record }; delete copy.textSha256; return crypto.createHash("sha256").update(JSON.stringify(copy)).digest("hex"); }
function valuesDigest(values) { return crypto.createHash("sha256").update(JSON.stringify(values)).digest("hex"); }
assert(dem.dataset === "GEBCO_2026 Grid", "primary bathymetry must be GEBCO_2026 Grid");
assert(dem.width === 552 && dem.height === 360, "GEBCO official crop shape must be 552 x 360");
assert(dem.nodata === -32767, "GEBCO DEM nodata must match official NetCDF");
assert(dem.min === -277 && dem.max === 1346, "GEBCO DEM min/max must match official NetCDF");
assert(dem.sourceSha256 === "6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151", "DEM source SHA-256 must match Post-MVP-037 official NetCDF");
assert(/^[a-f0-9]{64}$/.test(dem.sourceSha256), "DEM source SHA-256 must be real 64-char hex");
assert(dem.values.length === dem.width * dem.height, "DEM values length must match shape");
assert(dem.valuesSha256 === "59f02c67f79aa3edb61548ddd0dcb669880f6164ccc97eb8dd1a9fbfb0fd244b", "DEM value-array checksum must match official NetCDF row-major crop");
assert(valuesDigest(dem.values) === dem.valuesSha256, "DEM value-array checksum must validate");
assert(dem.values.slice(0, 6).join("/") === "-104/-103/-103/-102/-103/-103", "DEM values must start with the official north-west NetCDF row, not synthetic min/max sentinels");
assert(tid.values.length === dem.values.length && tid.width === dem.width && tid.height === dem.height, "TID shape must match DEM");
assert(tid.nodata === 127, "GEBCO TID nodata must be 127");
assert(tid.valuesSha256 === "f39a3d090f387d124c1b5a10ecfff113f186b5f916ad2cc4001d5bebf2a70688", "TID value-array checksum must match official NetCDF row-major crop");
assert(valuesDigest(tid.values) === tid.valuesSha256, "TID value-array checksum must validate");
assert(tid.values.slice(0, 6).join("/") === "40/40/40/17/17/17", "TID values must start with the official north-west NetCDF row, not synthetic code sentinels");
assert(tid.sourceSha256 === "04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84", "TID source SHA-256 must match Post-MVP-037 official NetCDF");
assert(/^[a-f0-9]{64}$/.test(tid.sourceSha256), "TID source SHA-256 must be real 64-char hex");
assert(JSON.stringify(dem.bounds) === JSON.stringify(expectedBounds), "DEM bounds must match Issue #113 crop");
assert(JSON.stringify(tid.bounds) === JSON.stringify(dem.bounds), "TID bounds must match DEM bounds");
assert(dem.cellSizeDegrees.longitude > 0 && dem.cellSizeDegrees.latitude > 0, "cell size must be positive");
assert(dem.values.some((value) => value < 0) && dem.values.some((value) => value >= 0), "DEM must include sea and land values");
assert(digest(dem) === dem.textSha256, "DEM text checksum must match");
assert(digest(tid) === tid.textSha256, "TID text checksum must match");
const observed = [...new Set(tid.values)].sort((a,b)=>a-b).join("/");
assert(observed === "0/11/17/40/43/44", "TID observed codes must match official crop record");
const allowed = new Set([...tid.classification.direct, ...tid.classification.predictedInterpolated, ...tid.classification.mixedUnknownLand, ...tid.classification.nodata]);
assert(tid.values.every((code) => allowed.has(code)), "TID codes must be known classification codes");
console.log("bathymetry data checks passed");
