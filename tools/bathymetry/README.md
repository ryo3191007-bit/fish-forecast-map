# Bathymetry asset generation

The repository stores the cropped ETOPO 2022 DEM as text at `data/bathymetry/etopo-2022-crop.json`. PNG tiles and GeoJSON contours are generated before dev/test/build and are ignored by Git.

```bash
node scripts/generate-bathymetry-assets.mjs
```

The generator reads only the committed text DEM during normal builds. It does not contact NOAA during `next dev`, tests, Vercel build, or runtime. Temporary GeoTIFF downloads used to refresh the text DEM must not be committed.

Generated outputs:

- `public/bathymetry/etopo-2022/terrain/{z}/{x}/{y}.png`
- `public/bathymetry/etopo-2022/color/{z}/{x}/{y}.png`
- `public/bathymetry/etopo-2022/contours.geojson`
- `public/bathymetry/etopo-2022/metadata.json`

The current crop covers west 128.5, south 32.5, east 130.8, north 34.0 at z7-z8. Contours are generated with marching squares and segment stitching from the same DEM and include positive `depth` plus `major` properties. Metadata records checksums for every generated file and the source/crop SHA-256 values.

## Post-MVP-038 GEBCO_2026 15秒 source

Issue #113 switches the primary prebuild source to `data/bathymetry/gebco-2026-crop.json` and keeps `data/bathymetry/etopo-2022-crop.json` as the 60秒 fallback. The GEBCO and TID text canons use bounds `128.5,32.5,130.8,34.0`, north-to-south rows, west-to-east columns, and matching `553 x 361` cells. Official acquisition is via the GEBCO download app (`https://download.gebco.net/`) for `GEBCO_2026 Grid` and `GEBCO_2026 TID Grid`; GeoTIFF/NetCDF/ZIP/PNG source binaries, queue tokens, mail addresses, and credentials must not be committed.

Generate static assets only from committed text canons:

```bash
BATHYMETRY_SOURCE=gebco-2026 node scripts/generate-bathymetry-assets.mjs
BATHYMETRY_SOURCE=etopo-2022 node scripts/generate-bathymetry-assets.mjs
```

The generated `public/bathymetry/**` PNG/GeoJSON/metadata outputs are deterministic build artifacts and must stay ignored by Git. Runtime, Vercel runtime, and Vercel build must not fetch GEBCO; `prebuild` only reads the text canon in `data/bathymetry/`.

TID is summarized as `direct` (`10/11/12`), `predicted-interpolated` (`40/41/42`), and `mixed-unknown-land` (land, mixed, unknown, and other known TID values). The UI presents these percentages as data lineage only; 15秒 does not imply surveyed harbor, reef, rock, or safety accuracy.
