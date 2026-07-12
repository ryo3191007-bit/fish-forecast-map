# 水深・3D海底地形設計

## 採用データ

初期実装は NOAA NCEI `ETOPO 2022 15 Arc-Second Global Relief Model` を採用します。対象範囲は糸島西岸、唐津湾、伊万里湾、平戸周辺に限定し、全世界データや不要に巨大な生成物はリポジトリに含めません。

- DOI: https://doi.org/10.25921/fd45-gt74
- Source: https://www.ncei.noaa.gov/products/etopo-global-relief-model
- License: CC0-1.0
- Citation: NOAA National Centers for Environmental Information. 2022: ETOPO 2022 15 Arc-Second Global Relief Model. https://doi.org/10.25921/fd45-gt74
- 制限: 15 arc-second の広域DEMであり、港内、瀬、岩礁、航路水深の精密確認には使えません。参考表示であり、航海・安全判断には使用不可です。

## 描画方式比較

| 候補             | 評価                                                                                                                                                                       | 採否   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| MapLibre terrain | 既存MapLibre GL JSに統合でき、`raster-dem` を hillshade、terrain、等深線生成元として共有しやすい。追加依存を抑え、マーカー・ポップアップ・既存レイヤー切替を維持しやすい。 | 採用   |
| deck.gl          | TerrainLayerや独自シェーダーに強いが、別描画管理と依存追加が必要。現Issueでは過剰。                                                                                        | 不採用 |
| Three.js         | 表現自由度は高いが、タイルLOD、座標変換、カメラ同期、クリック判定を独自実装する必要がある。                                                                                | 不採用 |
| CesiumJS         | Globe/3D Tilesには強いが、MapLibreからの地図基盤置換または二重Viewer管理が必要で、バンドル・UI統合コストが大きい。                                                         | 不採用 |

## 実装方針

- UIは `通常地図 / 航空写真 / 水深・3D地形` の3モードです。
- 水深source/layerは初回の水深モード選択まで追加しません。
- 水深モードでは静的Terrain-RGBタイル、色別水深タイル、簡略化等深線GeoJSON、hillshade、MapLibre `setTerrain()` を使います。
- 通常地図・航空写真へ戻る際は terrain を解除し、pitch/bearingを2D向けに戻します。
- 3D初期値はデスクトップ相当でON、スマホ幅、reduced motion、低deviceMemory、WebGL不可では2D軽量表示です。
- 3D初期化失敗は非致命的に扱い、2D水深色分け、等深線、陰影を維持します。
- 水深タイル取得失敗時もアプリ全体を落とさず、MapLibreの通常地図・マーカー操作を維持します。

## データ生成

生成済み静的ファイルは `public/bathymetry/etopo-2022/` に配置します。ただしPNGバイナリはGit管理対象にせず、CI/実装検証用の最小サンプルは `data/bathymetry/etopo-2022-sample-tiles.json` のbase64テキストから `scripts/restore-bathymetry-tiles.mjs` で復元します。実運用では同じパス構造で対象地域のみのタイルへ差し替えます。

```bash
python tools/bathymetry/generate_tiles.py \
  --bounds 129.45 33.05 130.55 33.75 \
  --minzoom 7 --maxzoom 10 \
  --output public/bathymetry/etopo-2022
```

`metadata.json` には dataset、DOI、source URL、license、citation、access date、source resolution、crop bounds、generated zoom range、generation command、チェックサムを保存します。`npm run predev`、`npm run pretest`、`npm run prebuild` はbase64 fixtureからPNGを事前復元しますが、Next.js実行時・Vercelアクセス時のHTTPリクエストごとにNOAA取得、切り出し、タイル生成は行いません。

## 依存関係

新しい大きな描画依存は追加していません。既存の `maplibre-gl` の `raster-dem`、`hillshade`、`setTerrain()` を使います。等深線は初期実装では事前生成GeoJSONを使い、`maplibre-contour` はCSP/worker/負荷検証を別Issueに分離できるよう採用しません。
