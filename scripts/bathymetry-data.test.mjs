import crypto from "node:crypto";
import fs from "node:fs";

const dem = JSON.parse(fs.readFileSync("data/bathymetry/gebco-2026-crop.json", "utf8"));
const tid = JSON.parse(fs.readFileSync("data/bathymetry/gebco-2026-tid-crop.json", "utf8"));
const expectedBounds = { west: 128.5, south: 32.5, east: 130.8, north: 34.0 };
function assert(condition, message) { if (!condition) throw new Error(message); }
function digest(record) { const copy = { ...record }; delete copy.textSha256; return crypto.createHash("sha256").update(JSON.stringify(copy)).digest("hex"); }
assert(dem.dataset === "GEBCO_2026 Grid", "primary bathymetry must be GEBCO_2026 Grid");
assert(dem.width > 500 && dem.height > 300, "15-second crop must contain enough cells");
assert(dem.values.length === dem.width * dem.height, "DEM values length must match shape");
assert(tid.values.length === dem.values.length && tid.width === dem.width && tid.height === dem.height, "TID shape must match DEM");
assert(JSON.stringify(dem.bounds) === JSON.stringify(expectedBounds), "DEM bounds must match Issue #113 crop");
assert(JSON.stringify(tid.bounds) === JSON.stringify(dem.bounds), "TID bounds must match DEM bounds");
assert(dem.cellSizeDegrees.longitude > 0 && dem.cellSizeDegrees.latitude > 0, "cell size must be positive");
assert(dem.values.some((value) => value < 0) && dem.values.some((value) => value >= 0), "DEM must include sea and land values");
assert(digest(dem) === dem.textSha256, "DEM text checksum must match");
assert(digest(tid) === tid.textSha256, "TID text checksum must match");
const allowed = new Set([...tid.classification.direct, ...tid.classification.predictedInterpolated, ...tid.classification.mixedUnknownLand]);
assert(tid.values.every((code) => allowed.has(code)), "TID codes must be known classification codes");
console.log("bathymetry data checks passed");
