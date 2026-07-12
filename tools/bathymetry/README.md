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


### GEBCO_2026 15秒正本とfallback（Post-MVP-038.1）

- DEM/TID正本は `552 x 360`、bounds west `128.5` / south `32.5` / east `130.8` / north `34.0`。
- DEM nodataは `-32767`、min/maxは `-277 / 1346`。
- TID nodataは `127`、出現コードは `0/11/17/40/43/44`。
- 第一sourceは `GEBCO_2026 Grid 15 arc-second`、fallbackは `ETOPO 2022 60 arc-second Bedrock`。GEBCO失敗時はETOPOへ切替え、ETOPOも失敗した場合は水深layer/terrain/GSI overlayを解除して通常地図へ戻します。
- GSI標準地図overlayの出典は国土地理院ウェブサイト/地理院タイルとして表示し、標準地図内素材（GEBCO Digital Atlas由来等深線、海上保安庁許可第292502号、VMAP0 shoreline等）とGEBCO正本の出典を混同しません。
