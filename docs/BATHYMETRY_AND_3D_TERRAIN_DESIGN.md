# 水深・3D海底地形設計

## 採用データ

Post-MVP-037 / Issue #111 の調査結果は `docs/COASTAL_BATHYMETRY_DATA_RESEARCH.md` を正本とします。Post-MVP-038では、第一sourceを `GEBCO_2026 Grid 15 arc-second`、同一boundsのデータ由来説明を `GEBCO_2026 TID Grid`、fallbackを `ETOPO 2022 60 Arc-Second Bedrock` とします。Post-MVP-050以降、GEBCO 0m境界から生成した海岸線ラインと完全不透明の緑の陸地マスクは表示しません。JODC J-EGG500は再配布・Web配信許可が確認できるまで本番採用しません。

### GEBCO_2026 canonical

- bounds: west `128.5` / south `32.5` / east `130.8` / north `34.0`
- shape: `552 x 360`
- pixel registration: pixel-centre
- orientation: north-to-south row-major, west-to-east
- DEM nodata: `-32767`
- DEM min/max: `-277 / 1346`
- DEM source SHA-256: `6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151`
- TID nodata: `127`
- TID observed codes: `0/11/17/40/43/44`
- TID source SHA-256: `04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84`
- attribution: `Contains information from the GEBCO_2026 Grid, GEBCO Compilation Group (2026).`
- restriction: reference only; not an official nautical chart; not for navigation or safety decisions

### ETOPO fallback

- dataset: NOAA NCEI `ETOPO 2022 60 Arc-Second Bedrock Global Relief Model`
- DOI: https://doi.org/10.25921/fd45-gt74
- license: CC0-1.0
- role: GEBCO metadata/tile/decode/terrain initialization failure時の広域fallback
- limitation: 港内、瀬、岩礁、航路水深の精密確認には使用不可

## 描画方式比較

| 候補 | 評価 | 採否 |
| --- | --- | --- |
| MapLibre terrain | 既存MapLibre GL JSへ統合でき、`raster-dem`、hillshade、terrain、等深線、マーカーを同じ地図で維持できる。 | 採用 |
| deck.gl | TerrainLayer等は強力だが別描画管理と依存追加が必要。 | 不採用 |
| Three.js | LOD、座標変換、カメラ同期、クリック判定を独自実装する必要がある。 | 不採用 |
| CesiumJS | 3D Tilesには強いがViewer置換・二重管理・バンドル負荷が大きい。 | 不採用 |

## 実装方針

- UIは `通常地図 / 航空写真 / 水深・3D地形` の3モードです。
- 水深source/layerは水深モード選択時に遅延追加します。
- GEBCO成功時はGEBCOのcolor、hillshade、contour、label、terrainを表示します。
- GEBCO失敗時はETOPOの対応layerとterrainへ切り替えます。
- ETOPOも失敗した場合は水深layer、terrain、各水深出典を解除し、通常地図へ戻します。
- 同じsource errorはdedupeし、遅れて届いた非表示sourceのerrorで状態を飛ばしません。
- metadataはsource追加前後に検証し、GEBCOではbounds、`552 x 360`、nodata、source SHAを固定値と照合します。
- 3D初期値はデスクトップ相当でON、スマホ幅、reduced motion、低deviceMemory、WebGL不可では2D表示です。
- TIDは現在のmap center周辺17×17セルを集計し、nodata `127`を割合の分母から除外します。
- Post-MVP-051では陰影と等深線を任意ON/OFFにします。OFF時もDEM、Terrain-RGB、参考水深decode、fallback状態、cameraは変更しません。

## データ生成

Git管理する正本は次です。

- `data/bathymetry/gebco-2026-crop.json`
- `data/bathymetry/gebco-2026-tid-crop.json`
- `data/bathymetry/etopo-2022-crop.json`

NetCDF、GeoTIFF、ZIP、PNG等のバイナリはGitへコミットしません。`npm run generate:bathymetry` がbuild前に正本JSONからTerrain-RGB PNG、色別水深PNG、等深線GeoJSON、TID軽量JSON、metadata/checksumを生成します。通常のdev/test/build/runtimeではNOAA、GEBCO、GSIへデータ取得リクエストを行いません。Post-MVP-050以降、緑の海岸線ライン・陸地マスク用GeoJSONは本番表示に使いません。

```bash
npm run generate:bathymetry
```

GEBCO公式NetCDFから正本JSONを更新する手動ツールは次です。

```bash
python -m pip install netCDF4
node tools/bathymetry/convert-gebco-netcdf.mjs /local/gebco.nc /local/gebco_tid.nc
```

詳細は `tools/bathymetry/README.md` を参照してください。

## Post-MVP-050以降の海岸線・海面表現

- Post-MVP-045で追加した緑の海岸線ライン・完全不透明の緑の陸地マスク・海岸線表示ボタンは、Post-MVP-050で削除済みです。
- 陸地pixelはcolor tileで完全透明のまま扱い、緑の海岸線枠や緑の陸地塗りを復活させません。
- Post-MVP-051では、海面表現はCodex環境で実画面比較ができないため本番実装しません。実画面比較なしに採用判断できず、海底色・等深線・操作性を悪化させる可能性があり、潮位や実海面高度と誤認させないため保留します。

## テスト

- GEBCO/TID固定source SHA、shape、nodata、min/max、value-array SHA
- pixel-centre samplingと等深線座標
- 生成Terrain-RGB pixelと元DEM sampleの一致
- GEBCO成功、GEBCO失敗→ETOPO成功、両方失敗→通常地図
- 重複errorと遅延errorのdedupe
- 代表5地点のTID集計変化、bounds外、nodata-only
- NetCDF変換ロジックの実行self-test

水深表示は常に参考用途のみで、航海・安全判断には使用できません。
