import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

async function loadTypeScriptModule(file) {
  const source = fs.readFileSync(file, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(url);
}

const bathymetry = await loadTypeScriptModule("src/domain/bathymetry.ts");
const grid = JSON.parse(
  fs.readFileSync("data/bathymetry/gebco-2026-tid-crop.json", "utf8"),
);

assert.equal(grid.width, 552);
assert.equal(grid.height, 360);
assert.equal(grid.nodata, 127);

const representativePoints = [
  [130.109, 33.596],
  [129.993, 33.459],
  [129.892, 33.543],
  [129.844, 33.448],
  [129.579, 33.354],
];

const summaries = representativePoints.map(([lon, lat]) => {
  const cell = bathymetry.lonLatToTidCell(
    lon,
    lat,
    grid.width,
    grid.height,
  );
  assert.ok(cell, `representative point must be inside bounds: ${lon},${lat}`);
  const summary = bathymetry.summarizeTidAround(
    grid.values,
    grid.width,
    grid.height,
    cell.col,
    cell.row,
    8,
  );
  assert.ok(summary.sampleCells > 0);
  return summary;
});

assert.ok(
  new Set(summaries.map((summary) => JSON.stringify(summary))).size > 1,
  "TID summary must change when the map center moves",
);

assert.equal(
  bathymetry.lonLatToTidCell(1, 1, grid.width, grid.height),
  null,
  "out-of-bounds center is non-fatal",
);

const cell = bathymetry.lonLatToTidCell(
  130.109,
  33.596,
  grid.width,
  grid.height,
);
const nodataSummary = bathymetry.summarizeTidAround(
  new Array(grid.width * grid.height).fill(127),
  grid.width,
  grid.height,
  cell.col,
  cell.row,
  8,
);
assert.equal(nodataSummary.sampleCells, 0);
assert.ok(nodataSummary.nodata > 0);

const northWest = bathymetry.lonLatToTidCell(
  grid.bounds.west + grid.cellSizeDegrees.longitude / 2,
  grid.bounds.north - grid.cellSizeDegrees.latitude / 2,
  grid.width,
  grid.height,
);
assert.deepEqual(northWest, { col: 0, row: 0 });
assert.equal(grid.values[0], 40);

console.log("bathymetry TID movement checks passed");
