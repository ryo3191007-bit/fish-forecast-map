#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { NetCDFReader } from "netcdfjs";

const EXPECTED = {
  demSha: "6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151",
  tidSha: "04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84",
  bounds: { west: 128.5, south: 32.5, east: 130.8, north: 34 },
  width: 552,
  height: 360,
  cellSizeDegrees: 1 / 240,
};

const [demPath, tidPath] = process.argv.slice(2);
if (!demPath || !tidPath) throw new Error("Usage: node tools/bathymetry/convert-gebco-netcdf.mjs <GEBCO bathymetry.nc> <GEBCO TID.nc>");

function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function readVar(reader, names) {
  const variable = reader.variables.find((item) => names.includes(item.name));
  if (!variable) throw new Error(`Missing variable: ${names.join("/")}`);
  return { variable, data: reader.getDataVariable(variable.name) };
}
function subset(ncPath, expectedSha, valueNames, nodata, isTid) {
  const actualSha = sha(ncPath);
  if (actualSha !== expectedSha && process.env.ALLOW_UNVERIFIED_GEBCO_SOURCE !== "1") throw new Error(`Unexpected source SHA-256 for ${ncPath}: ${actualSha}`);
  const reader = new NetCDFReader(fs.readFileSync(ncPath));
  const lon = Array.from(readVar(reader, ["lon", "longitude", "x"]).data, Number);
  const lat = Array.from(readVar(reader, ["lat", "latitude", "y"]).data, Number);
  const values = readVar(reader, valueNames).data;
  const lonStart = lon.findIndex((v) => Math.abs(v - (EXPECTED.bounds.west + EXPECTED.cellSizeDegrees / 2)) < 1e-7 || v >= EXPECTED.bounds.west);
  const latNorthIndex = lat.findIndex((v) => v <= EXPECTED.bounds.north && v >= EXPECTED.bounds.south);
  if (lonStart < 0 || latNorthIndex < 0) throw new Error("Requested crop bounds are outside source grid");
  const latAscending = lat[1] > lat[0];
  const out = [];
  for (let row = 0; row < EXPECTED.height; row++) {
    const targetLat = EXPECTED.bounds.north - (row + 0.5) * EXPECTED.cellSizeDegrees;
    let sourceRow = nearestIndex(lat, targetLat);
    if (sourceRow < 0) throw new Error("Latitude crop failed");
    for (let col = 0; col < EXPECTED.width; col++) {
      const targetLon = EXPECTED.bounds.west + (col + 0.5) * EXPECTED.cellSizeDegrees;
      const sourceCol = nearestIndex(lon, targetLon);
      const raw = Number(values[sourceRow * lon.length + sourceCol]);
      out.push(Number.isFinite(raw) ? raw : nodata);
    }
  }
  const valid = out.filter((v) => v !== nodata);
  return { values: out, min: Math.min(...valid), max: Math.max(...valid), observedCodes: isTid ? [...new Set(valid)].sort((a, b) => a - b) : undefined, sourceSha256: actualSha, orientation: latAscending ? "source south-to-north; output north-to-south row-major" : "source north-to-south; output north-to-south row-major" };
}
function nearestIndex(values, target) {
  let best = -1, delta = Infinity;
  for (let i = 0; i < values.length; i++) { const next = Math.abs(values[i] - target); if (next < delta) { best = i; delta = next; } }
  return delta <= EXPECTED.cellSizeDegrees / 2 + 1e-8 ? best : -1;
}
function writeJson(file, base) {
  const textSha256 = crypto.createHash("sha256").update(JSON.stringify(base.values)).digest("hex");
  const payload = { ...base, width: EXPECTED.width, height: EXPECTED.height, bounds: EXPECTED.bounds, requestedBounds: EXPECTED.bounds, cellSizeDegrees: EXPECTED.cellSizeDegrees, valuesSha256: textSha256, cropSha256: textSha256 };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`wrote ${file} (${payload.width} x ${payload.height})`);
}
const dem = subset(demPath, EXPECTED.demSha, ["elevation", "z", "Band1"], -32767, false);
const tid = subset(tidPath, EXPECTED.tidSha, ["tid", "sid", "z", "Band1"], 127, true);
writeJson("data/bathymetry/gebco-2026-crop.json", { dataset: "GEBCO_2026 Grid 15 arc-second crop", nodata: -32767, ...dem });
writeJson("data/bathymetry/gebco-2026-tid-crop.json", { dataset: "GEBCO_2026 Type Identifier Grid 15 arc-second crop", nodata: 127, ...tid });
