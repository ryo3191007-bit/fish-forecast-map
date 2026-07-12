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

The current crop covers west 129.45, south 33.05, east 130.55, north 33.75 at z7-z8. Metadata records checksums for every generated file and the source/crop SHA-256 values.
