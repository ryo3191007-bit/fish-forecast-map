# Bathymetry asset generation

The repository stores committed text canons for the primary GEBCO_2026 crop and the ETOPO 2022 60 arc-second fallback. PNG tiles, lightweight TID JSON, metadata, and GeoJSON contours are generated before dev/test/build and are ignored by Git.

```bash
npm run generate:bathymetry
```

The generator reads only committed text canons during normal builds. It does not contact NOAA, GEBCO, GSI, or other external data services during `next dev`, tests, Vercel build, or runtime. Temporary NetCDF/ZIP/GeoTIFF downloads used to refresh the text canons must remain outside Git.

Generated outputs:

- `public/bathymetry/gebco-2026/terrain/{z}/{x}/{y}.png`
- `public/bathymetry/gebco-2026/color/{z}/{x}/{y}.png`
- `public/bathymetry/gebco-2026/contours.geojson`
- `public/bathymetry/gebco-2026/tid-crop.json`
- `public/bathymetry/gebco-2026/metadata.json`
- matching fallback files under `public/bathymetry/etopo-2022/`

## Official GEBCO NetCDF to canonical JSON

The manual converter accepts the locally downloaded official GEBCO bathymetry and TID NetCDF files. It verifies the fixed official source SHA-256 values, exact `552 x 360` pixel-centre grid, coordinate direction, nodata values, value-array checksums, and observed TID codes before replacing the committed JSON canons.

The converter is not run by `npm run build`, Vercel, or the application runtime.

### Local dependency

Install Python 3 and the NetCDF reader once:

```bash
python -m pip install netCDF4
```

On Windows, `py -3 -m pip install netCDF4` is also supported.

### Conversion command

```bash
node tools/bathymetry/convert-gebco-netcdf.mjs \
  /local/path/to/gebco_2026_bathymetry.nc \
  /local/path/to/gebco_2026_tid.nc
```

The Node wrapper selects `python3`, `python`, or Windows `py -3`, then executes `tools/bathymetry/convert_gebco_netcdf.py`.

The command writes:

- `data/bathymetry/gebco-2026-crop.json`
- `data/bathymetry/gebco-2026-tid-crop.json`

Run the converter self-test without NetCDF files or the `netCDF4` package:

```bash
node tools/bathymetry/convert-gebco-netcdf.mjs --self-test
```

After an official data refresh, verify all generated and application checks:

```bash
npm run generate:bathymetry
npm run test:gebco-converter
npm run test:bathymetry-data
npm run test:bathymetry-fallback
npm run test:bathymetry-tid
npm run lint
npm run typecheck
npm run build
```

## Canonical record

The GEBCO crop covers west `128.5`, south `32.5`, east `130.8`, north `34.0` with pixel-centre registered, north-to-south rows and west-to-east columns.

- DEM shape: `552 x 360`
- DEM nodata: `-32767`
- DEM min/max: `-277 / 1346`
- DEM NetCDF SHA-256: `6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151`
- DEM values SHA-256: `59f02c67f79aa3edb61548ddd0dcb669880f6164ccc97eb8dd1a9fbfb0fd244b`
- TID nodata: `127`
- TID observed codes: `0/11/17/40/43/44`
- TID NetCDF SHA-256: `04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84`
- TID values SHA-256: `f39a3d090f387d124c1b5a10ecfff113f186b5f916ad2cc4001d5bebf2a70688`

Official acquisition is via the GEBCO download app (`https://download.gebco.net/`) for `GEBCO_2026 Grid` and `GEBCO_2026 TID Grid`. Source NetCDF/ZIP files, queue tokens, mail addresses, and credentials must not be committed.

The converter preserves the official cells without interpolation or artificial relief. Because the official crop latitude axis is south-to-north, the converter reverses rows once to produce north-to-south row-major JSON. Tile generation then samples those pixel-centre registered cells directly.

TID is summarized as `direct` (`10〜17`), `predicted-interpolated` (`40/41/45`), `mixed-unknown-land` (`0/43/44/70〜72`), with nodata `127` excluded from percentage denominators and shown separately when present. The UI presents these percentages as data lineage only; a 15-second mesh does not imply surveyed harbor, reef, rock, or safety accuracy.
