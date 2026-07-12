# ETOPO 2022 bathymetry tile generation

This app uses pre-generated static tiles only. PNG tiles are restored from base64 text fixtures before dev/test/build and are ignored by Git. Do not download global ETOPO data during Next.js/Vercel runtime.

Reproducible outline:

```bash
python tools/bathymetry/generate_tiles.py \
  --bounds 129.45 33.05 130.55 33.75 \
  --minzoom 7 --maxzoom 10 \
  --output public/bathymetry/etopo-2022
```

Operator steps behind the helper:

1. Download the NOAA NCEI ETOPO 2022 15 arc-second GeoTIFF for the target region only.
2. Crop to west/south/east/north `129.45 33.05 130.55 33.75` using GDAL.
3. Encode DEM tiles as Mapbox Terrain-RGB compatible PNG for MapLibre `raster-dem`.
4. Generate low-zoom color-relief PNG tiles and simplified negative-elevation contours.
5. Update `metadata.json` with DOI, license, citation, access date, bounds, zooms, command and checksums.
6. Store small committed fixtures as base64 JSON under `data/bathymetry/` and restore PNGs with `npm run restore:bathymetry-tiles`.

License/citation: NOAA NCEI ETOPO 2022, CC0-1.0, https://doi.org/10.25921/fd45-gt74. Reference display only; not for navigation or safety decisions.
