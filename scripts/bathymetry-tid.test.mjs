import assert from 'node:assert/strict';
import fs from 'node:fs';
const REPRESENTATIVE_TID_POINTS = [[130.109,33.596],[129.993,33.459],[129.892,33.543],[129.844,33.448],[129.579,33.354]];
function summarizeTidAt(grid, lon, lat, radius = 8) {
  if (!grid) return { status: 'error', codes: {}, centerCode: null };
  const { west, east, north, south } = grid.bounds;
  if (lon < west || lon > east || lat < south || lat > north) return { status: 'out-of-bounds', codes: {}, centerCode: null };
  const col = Math.round(((lon - west) / (east - west)) * (grid.width - 1));
  const row = Math.round(((north - lat) / (north - south)) * (grid.height - 1));
  const codes = {}; let centerCode = null;
  for (let y = Math.max(0, row - radius); y <= Math.min(grid.height - 1, row + radius); y++) for (let x = Math.max(0, col - radius); x <= Math.min(grid.width - 1, col + radius); x++) {
    const code = grid.values[y * grid.width + x]; if (x === col && y === row && code !== grid.nodata) centerCode = code; if (code !== grid.nodata) codes[String(code)] = (codes[String(code)] ?? 0) + 1;
  }
  return Object.keys(codes).length ? { status: 'ok', codes, centerCode } : { status: 'nodata-only', codes, centerCode: null };
}
const grid = JSON.parse(fs.readFileSync('data/bathymetry/gebco-2026-tid-crop.json','utf8'));
assert.equal(grid.width, 552); assert.equal(grid.height, 360); assert.equal(grid.nodata, 127);
assert.deepEqual(grid.observedCodes, [0,11,17,40,43,44]);
const summaries = REPRESENTATIVE_TID_POINTS.map(([lon,lat]) => summarizeTidAt(grid, lon, lat));
assert.ok(summaries.every((s) => s.status === 'ok'));
assert.ok(new Set(summaries.map((s) => JSON.stringify(s.codes))).size > 1, 'TID summary changes when map center moves');
assert.equal(summarizeTidAt(grid, 1, 1).status, 'out-of-bounds');
assert.equal(summarizeTidAt(null, 130, 33).status, 'error');
const nodata = { ...grid, values: grid.values.map(() => 127) };
assert.equal(summarizeTidAt(nodata, 130.109, 33.596).status, 'nodata-only');
console.log('bathymetry TID movement and non-fatal states passed');
