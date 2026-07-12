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

const runtime = await loadTypeScriptModule("src/domain/bathymetryFallback.ts");

let state = runtime.initialBathymetryFallbackState();
assert.equal(state.display, "gebco");
state = runtime.reduceBathymetryFallback(state, {
  type: "source-success",
  source: "gebco",
});
assert.equal(state.display, "gebco", "primary success keeps GEBCO active");

state = runtime.initialBathymetryFallbackState();
state = runtime.reduceBathymetryFallback(state, {
  type: "source-error",
  source: "gebco",
  key: "tile-404",
});
assert.equal(state.display, "etopo", "GEBCO failure activates ETOPO");
state = runtime.reduceBathymetryFallback(state, {
  type: "source-success",
  source: "etopo",
});
assert.equal(state.display, "etopo", "ETOPO success keeps fallback active");

state = runtime.reduceBathymetryFallback(state, {
  type: "source-error",
  source: "etopo",
  key: "decode",
});
assert.equal(state.display, "standard", "ETOPO failure returns to standard map");
assert.equal(state.notice, runtime.BATHYMETRY_STANDARD_NOTICE);

const once = state;
state = runtime.reduceBathymetryFallback(state, {
  type: "source-error",
  source: "etopo",
  key: "decode",
});
assert.deepEqual(state, once, "duplicate source errors are deduplicated");

let stale = runtime.initialBathymetryFallbackState();
stale = runtime.reduceBathymetryFallback(stale, {
  type: "source-error",
  source: "gebco",
  key: "metadata",
});
stale = runtime.reduceBathymetryFallback(stale, {
  type: "source-error",
  source: "gebco",
  key: "late-primary-error",
});
assert.equal(
  stale.display,
  "etopo",
  "a late error from an inactive source must not skip ETOPO",
);

assert.equal(
  runtime.classifyBathymetryError({ sourceId: "gebco-2026-dem" }),
  "gebco",
);
assert.equal(
  runtime.classifyBathymetryError({
    message: "HTTP 404 /bathymetry/etopo-2022/terrain/7/1/1.png",
  }),
  "etopo",
);
assert.equal(runtime.classifyBathymetryError({ message: "unrelated error" }), null);

const gebcoMetadata = {
  dataset: "GEBCO_2026 Grid",
  cropBounds: { west: 128.5, south: 32.5, east: 130.8, north: 34 },
  width: 552,
  height: 360,
  nodata: -32767,
  sourceSha256:
    "6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151",
};
assert.equal(runtime.validateBathymetryMetadata(gebcoMetadata, "gebco"), null);
assert.equal(
  runtime.validateBathymetryMetadata({ ...gebcoMetadata, width: 553 }, "gebco"),
  "metadata-shape",
);
assert.equal(
  runtime.validateBathymetryMetadata(
    { ...gebcoMetadata, sourceSha256: "bad" },
    "gebco",
  ),
  "metadata-source-sha",
);
assert.equal(
  runtime.validateBathymetryMetadata(
    { ...gebcoMetadata, dataset: "ETOPO 2022", width: 139, height: 91 },
    "etopo",
  ),
  null,
);

console.log("bathymetry fallback runtime checks passed");
