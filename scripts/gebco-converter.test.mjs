import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["tools/bathymetry/convert-gebco-netcdf.mjs", "--self-test"],
  { encoding: "utf8" },
);
assert.equal(
  result.status,
  0,
  `converter self-test failed:\n${result.stdout}\n${result.stderr}`,
);
assert.match(result.stdout, /GEBCO converter self-test passed/);

const dem = JSON.parse(
  fs.readFileSync("data/bathymetry/gebco-2026-crop.json", "utf8"),
);
const tid = JSON.parse(
  fs.readFileSync("data/bathymetry/gebco-2026-tid-crop.json", "utf8"),
);
const digest = (values) =>
  crypto.createHash("sha256").update(JSON.stringify(values)).digest("hex");

assert.equal(dem.width, 552);
assert.equal(dem.height, 360);
assert.equal(dem.nodata, -32767);
assert.equal(
  digest(dem.values),
  "59f02c67f79aa3edb61548ddd0dcb669880f6164ccc97eb8dd1a9fbfb0fd244b",
);
assert.equal(tid.width, 552);
assert.equal(tid.height, 360);
assert.equal(tid.nodata, 127);
assert.equal(
  digest(tid.values),
  "f39a3d090f387d124c1b5a10ecfff113f186b5f916ad2cc4001d5bebf2a70688",
);
assert.deepEqual([...new Set(tid.values)].sort((a, b) => a - b), [
  0, 11, 17, 40, 43, 44,
]);

console.log("GEBCO converter and canonical checks passed");
