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

The GEBCO crop covers west `128.5`, south `32.5`, east `130.8`, north `34.0` with pixel-centre registered, north-to-south rows and west-to-east columns. The Post-MVP-037 official acquisition record is `552 x 360`, DEM nodata `-32767`, min/max `-277/1346`, bathymetry NetCDF SHA-256 `6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151`; TID nodata `127`, observed codes `0/11/17/40/43/44`, and TID NetCDF SHA-256 `04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84`.

Official acquisition is via the GEBCO download app (`https://download.gebco.net/`) for `GEBCO_2026 Grid` and `GEBCO_2026 TID Grid`; source NetCDF/ZIP files, queue tokens, mail addresses, and credentials must not be committed. `tools/bathymetry/convert-gebco-netcdf.mjs` is a local verifier for source SHA-256 values and documents the non-build conversion entry point.

TID is summarized as `direct` (`10〜17`), `predicted-interpolated` (`40/41/45`), `mixed-unknown-land` (`0/43/44/70〜72`), with nodata `127` excluded from percentage denominators and shown separately when present. The UI presents these percentages as data lineage only; 15秒 mesh does not imply surveyed harbor, reef, rock, or safety accuracy.
