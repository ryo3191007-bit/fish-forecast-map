# 沿岸水深・海岸線データ調査（Post-MVP-037 / Issue #111）

最終更新: 2026-07-12  
対象範囲: 糸島西岸〜唐津湾〜伊万里湾〜平戸周辺（調査bounds: west 128.5 / south 32.5 / east 130.8 / north 34.0）  
結論: 公式Grid Extract / GEBCO download appの通常フローで `ETOPO 2022 60 arc-second Bedrock`、`ETOPO 2022 15 arc-second Bedrock`、`GEBCO_2026 Grid 15 arc-second` の対象cropを取得し、同一bounds・同一生成スクリプト条件で容量、生成時間、等深線量、TID由来を比較した。最終採用は **GEBCO_2026 Grid 15秒 + TID Grid + GSI標準地図overlay** をPost-MVP-038の第一候補とし、現行60秒はfallbackとして維持する。

## 調査ルールと禁止事項

- 根拠は公式資料のみとし、第三者サイトの画面解析、海しる・海図・ENC・民間サービス画面からの抽出は行わない。
- GeoTIFF、NetCDF、PNG、ZIPなどのバイナリをGitに追加しない。今回取得したGeoTIFF/NetCDF/ZIPと一時JSONは `/tmp/bathy-pr112b/` のローカル一時ファイルに限定した。
- 再配布条件が不明または禁止のデータは、変換後データもGit/Vercelへ置かない。
- 通常実行、Next.js/Vercel runtime、Vercel buildから外部水深データを取得しない。
- 水深表示は参考情報であり、航海・安全判断には使用しない。

## 比較地点と固定カメラ条件

| 区分 | 地点ID | 地点名 | center | zoom | pitch | bearing | exaggeration | 比較意図 |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 糸島西岸の岬・磯 | `keya-gate` | 芥屋大門周辺 | `[130.109, 33.596]` | 11 | 60 | 0 | 1.0 | 岬、磯、浅場20m線の粗さ確認 |
| 唐津湾の湾口と湾内 | `karatsu-east-port` | 唐津東港 | `[129.993, 33.459]` | 11 | 60 | 0 | 1.0 | 湾内の緩い水深勾配と港湾近傍の限界確認 |
| 呼子周辺の島・瀬戸 | `yobuko-area` | 呼子周辺 | `[129.892, 33.543]` | 11 | 60 | 0 | 1.0 | 島・瀬戸周辺の地形変化、50m線確認 |
| 伊万里湾の複雑な海岸線 | `takashima-area` | 鷹島周辺 | `[129.844, 33.448]` | 11 | 60 | 0 | 1.0 | 小島・湾・陸海境界の位置ずれ確認 |
| 平戸周辺の瀬戸・急深部 | `hirado-seto` | 平戸瀬戸周辺 | `[129.579, 33.354]` | 11 | 60 | 0 | 1.0 | 急深部、瀬戸、100m/200m線確認 |

比較対象レイヤーは 2D水深色分け、20m/50m/100m/200m等深線、hillshade、3D terrain、国土地理院標準地図の陸海境界重ね合わせとした。画像バイナリはGitへ追加せず、同一スクリプトで生成した等深線feature数・vertex数・容量と、GSI overlayのopacity評価をテキストで記録した。

## 実データ取得結果

| 候補 | 取得結果 | 取得URL/手順 | 取得日 | checksum / 実測 | 判断 |
| --- | --- | --- | --- | --- | --- |
| ETOPO 2022 60 arc-second Bedrock | 成功。現行Git正本 `data/bathymetry/etopo-2022-crop.json` と、公式NetCDF全球ファイルを照合。 | `https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/60s/60s_bed_elev_netcdf/ETOPO_2022_v1_60s_N90W180_bed.nc` | 2026-07-12 | NetCDF 491,284,376 bytes / SHA-256 `d92483407c6a8f87be6fc8a47e4809332357e2d40c90a49de2e91c39cce08c54`。変数 `z(lat,lon)` 10800×21600、nodata `-99999`。対象crop正本 139×91、最小 -145m、最大 788m。 | fallbackとして維持。沿岸高解像度化には不足。 |
| ETOPO 2022 15 arc-second Bedrock | 成功。NOAA Grid Extractのデータセット一覧から `ETOPO_2022 (Bedrock; 15 arcseconds)` を選び、bbox入力後のGeoTIFF export URLを一時取得。 | `https://www.ncei.noaa.gov/maps/grid-extract/` → Dataset `ETOPO_2022 (Bedrock; 15 arcseconds)` → bbox `128.5,32.5,130.8,34.0`。実ダウンロードはArcGIS ImageServer `DEM_mosaics/DEM_all/ImageServer/exportImage`、mosaicRule `Name='ETOPO_2022_v1_15s_bed_elev'`、format `tiff`、pixelType `F32`。 | 2026-07-12 | GeoTIFF 430,694 bytes / SHA-256 `4201d46a2737701e0fe43bb9140f57b0f2ac67b8cce84911d858063ea9d2d3e3`。552×360、cell size 0.0041666667°、nodataなし、最小 -278m、最大 1387.152m。 | 60秒より等深線表現は改善。ただしGEBCOより陸域最大値が異なり、TID相当がないためデータ由来評価は弱い。 |
| GEBCO_2026 Grid 15 arc-second | 成功。公式download appでGlobal / Bathymetry + TID / NetCDFをbasketに追加し、メール未入力でqueue submit、finished後にZIPを一時取得。 | `https://download.gebco.net/` → grid `gebco_2026_global` → data sources `gebco_2026`, `gebco_2026_tid` → format `netcdf` → `/api/queue` → `/api/queue/status/GEBCO_12_Jul_2026_d315c7a33fea` → `/api/queue/download/GEBCO_12_Jul_2026_d315c7a33fea`。 | 2026-07-12 | ZIP 1,035,746 bytes / SHA-256 `d320b67d89403cce3f95e9293e9e97725264dd1512c82e12b2e84187e86ce2ea`。Bathymetry NetCDF 409,944 bytes / SHA-256 `6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151`、552×360、nodata `-32767`、最小 -277m、最大 1346m。TID NetCDF 213,304 bytes / SHA-256 `04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84`、552×360、nodata `127`、出現コード 0/11/17/40/43/44。 | 採用第一候補。15秒DEMとTIDにより、見た目とデータ由来を同時に説明できる。 |

## TID Grid 5地点集計

GEBCO公式ドキュメントのTID定義では、10〜17をdirect measurement系、40/41/45などをpredicted/interpolated系、43/44/70〜72などをmixed/contour/unknown系として扱う。各地点中心の5×5セルを集計した。

| 地点 | direct measurement系 | predicted/interpolated系 | mixed/unknown/land系 | 主なTIDコード | 判断材料 |
| --- | ---: | ---: | ---: | --- | --- |
| 芥屋大門周辺 | 0.0% | 40.0% | 60.0% | 40, 44, 0 | 岸際は陸・mixedが多く、15秒でも実測主体とは言えない。 |
| 唐津東港 | 4.0% | 68.0% | 28.0% | 40, 44, 17, 0 | 港湾近傍はpredicted主体。港内精度は保証しない注記が必要。 |
| 呼子周辺 | 4.0% | 24.0% | 72.0% | 0, 40, 17 | 島・瀬戸付近は陸セル混在が大きい。GSI overlayで陸海境界を補助する。 |
| 鷹島周辺 | 4.0% | 24.0% | 72.0% | 0, 40, 17, 44 | 複雑海岸線ではTID由来の限界説明が必須。 |
| 平戸瀬戸周辺 | 4.0% | 20.0% | 76.0% | 0, 40, 44, 17 | 急深部は細かく見えるが、実測密度は限定的。安全判断不可を強調。 |

## 同条件比較の実測結果

| 地点 | ETOPO 60秒 | ETOPO 15秒 | GEBCO 2026 15秒 | GSI標準地図overlay |
| --- | --- | --- | --- | --- |
| 芥屋大門周辺 | 20m線は岸際凹凸を追えず、磯判断には粗い。 | 20m/50m線の頂点密度が増え、岬周辺の浅場帯が60秒より細分化。 | ETOPO15と同程度の細分化に加え、TIDでpredicted/mixed主体と説明可能。 | zoom 11、opacity 0.35〜0.45で海岸線補助が有効。 |
| 唐津東港 | 港湾・湾奥は陸海境界と水深変化がずれ、20m/50m線が港内判断に使えない。 | 湾内勾配は改善するが、港湾形状はDEMだけでは不足。 | predicted主体のため港内精度は限定的だが、説明可能性は最も高い。 | opacity 0.4前後で埋立地・港形状の読解が改善。0.6以上は水深色を阻害。 |
| 呼子周辺 | 島・瀬戸の50m線が単純化され、3D起伏は滑らかすぎる。 | 島周辺の等深線が増え、hillshade/terrainの谷筋が読みやすい。 | ETOPO15同等の改善にTIDの陸セル混在警告を加えられる。 | 陸島境界は改善するが、水深DEM正本ではない。 |
| 鷹島周辺 | 小島・湾入部はセルサイズに対して複雑すぎる。 | 等深線は増えるが、陸海境界の補助なしでは読み違いリスクが残る。 | TIDでmixed/landが多いことを出せるため、見た目だけの過信を抑制できる。 | opacity 0.35〜0.45で島影と道路/海岸線を補助。 |
| 平戸瀬戸周辺 | 100m/200m線は広域傾向のみ。 | 斜面表現が増え、3D terrainの急深部は60秒より明瞭。 | 急深部の見た目は改善するが、direct比率は低く注意表示が必要。 | 海峡形状の読解は改善するが、航海・安全判断不可。 |

数値面では、現行60秒の等深線は72 features / 2,021 vertices / 194,025 bytes、ETOPO15は702 features / 14,198 vertices / 1,413,982 bytes、GEBCO2026は430 features / 12,684 vertices / 1,212,628 bytesだった。15秒候補はいずれも60秒より等深線密度が大きく増え、GEBCOはETOPO15よりfeatures数と容量が少ない一方でTIDを併用できる。

## 実測した容量・生成時間・描画負荷

測定環境: GitHub Codespaces相当のLinuxコンテナ、Node.js v20.20.2、npm、Python 3.12.13、`rasterio` / `netCDF4` / `numpy` / `pypdf` をユーザー領域へ一時install。日時は2026-07-12 UTC。

| 項目 | ETOPO 60秒 | ETOPO 15秒 | GEBCO 2026 15秒 |
| --- | ---: | ---: | ---: |
| crop元データサイズ | 491,284,376 bytes（公式全球NetCDF） | 430,694 bytes（Grid Extract GeoTIFF） | 1,035,746 bytes（ZIP）、409,944 bytes（bathymetry NetCDF）、213,304 bytes（TID NetCDF） |
| テキスト正本サイズ | 44,225 bytes | 1,993,239 bytes（一時JSON） | 1,190,423 bytes（一時JSON） |
| 行列数 / cell size / nodata / min-max | 139×91 / 約0.0166667° / null（正本） / -145〜788m | 552×360 / 0.0041667° / なし / -278〜1387.152m | 552×360 / 0.0041667° / -32767 / -277〜1346m |
| Terrain-RGB + color + contour生成時間 | 約1.0秒 | 5.427秒 | 3.556秒 |
| 生成タイル数・合計容量 | 18 files、486,212 bytes | 18 files、1,741,901 bytes | 18 files、1,551,377 bytes |
| contours GeoJSON | 72 features、2,021 vertices、194,025 bytes | 702 features、14,198 vertices、1,413,982 bytes | 430 features、12,684 vertices、1,212,628 bytes |
| `npm run build`時間への増分 | prebuild生成単体が約1秒 | 現行スクリプト同条件では約+4.4秒 | 現行スクリプト同条件では約+2.6秒 |
| PC初回水深モード表示完了 | 生成物容量486KBのため現行維持可能。実ブラウザFPSは未測定。 | 生成物容量1.74MB。初回読込は増えるがz7〜8範囲では許容見込み。FPSは未測定。 | 生成物容量1.55MB。ETOPO15より軽く、TID説明を追加可能。FPSは未測定。 |
| PC 3D ON表示完了 | Terrain-RGB 8枚で現行運用済み。 | Terrain-RGB 8枚、容量増により初回3Dは60秒より遅い。 | Terrain-RGB 8枚、ETOPO15より容量が小さい。 |
| スマホ相当2D fallback | 2D fallback方針維持。 | 3Dを既定OFFにし、2D color/contourのみ遅延読込。 | 3Dを既定OFFにし、2D color/contour + TID説明を優先。 |

FPSとMapLibre実ブラウザの厳密なフレーム時間は未測定。Post-MVP-038でPlaywright計測を導入する場合は、PC viewportとスマホviewportで水深モード初回表示、3D ON、2D fallbackを同じcenter/zoom/pitch/bearingで測る。

## GEBCO利用条件の結論

GEBCO公式Terms of Useでは、GEBCO Gridはpublic domainとして、コピー、公開、配布、改変、商用利用を認める一方、出典表示、GEBCO/IHO/IOC等の公式成果と誤認させないこと、航海利用不可などの免責表示が必要である。したがって、対象boundsのGEBCO_2026 cropおよび派生したTerrain-RGB/color/contourタイルは、Terms of Useに従う限りWeb配信可能と判断する。

必要な表示案:

- Attribution: `Contains information from the GEBCO_2026 Grid, GEBCO Compilation Group (2026).`
- Disclaimer: `GEBCO data and derived tiles are for reference only, are not an official nautical chart, and must not be used for navigation or safety decisions.`
- UI上ではNOAA/GEBCO/GSIを同時に表示し、派生タイルであることを明記する。

## 国土地理院タイルの追加クレジットと表示方式

- 本アプリの水深モードで想定する表示zoomは広域確認 z7〜z8、地点確認 z9〜z13。地理院標準地図はリアルタイム読込、ラスターoverlay、opacity 0.35〜0.45を初期候補にする。
- ZL5〜8を表示し得る場合、標準地図の出典「国土地理院」に加え、地理院タイル一覧で案内されるGEBCO由来等深線、海上保安庁許可関連の追加出所表記を併記する。
- 水深色分けを隠す全面背景にはせず、通常は水深color/hillshade/contourの上に低opacityで重ねる。opacity 0.6以上は唐津東港・鷹島周辺で水深色の読解を阻害するため初期値にしない。
- 地理院タイルを複製・同梱せず、リアルタイム表示と出典表示を前提にする。

## 採用判断

1. Post-MVP-038の第一候補は `GEBCO_2026 Grid 15秒` とし、TID Gridを同梱または集計済みmetadataとしてUI説明に使う。
2. `ETOPO 2022 15秒` はNOAA公式Grid Extractで取得でき、60秒より等深線表現は改善するが、TID相当の由来説明がないため第二候補とする。
3. 現行 `ETOPO 2022 60秒` はfallbackとして維持する。生成・表示負荷は最小だが、5地点すべてで沿岸・港湾・島嶼・瀬戸表現が粗い。
4. GEBCOの5地点TIDはdirect measurement主体ではなく、predicted/mixed/land混在が多い。したがって「15秒だから高精度」とは表現せず、参考表示・航海利用不可・TID由来の限界をUIとドキュメントへ明記する。
5. JODC J-EGG500は、無断複製・第三者提供不可の条件により、書面等で再配布・Web配信許可が確認できるまで本番採用しない。

## 再現コマンド

```bash
mkdir -p /tmp/bathy-pr112b
curl -L --fail -o /tmp/bathy-pr112b/etopo15.tif \
  'https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_all/ImageServer/exportImage?bbox=128.50000%2C32.50000%2C130.80000%2C34.00000&bboxSR=4326&size=552,360&imageSR=4326&format=tiff&pixelType=F32&interpolation=+RSP_NearestNeighbor&compression=LZ77&renderingRule=%7B%22rasterFunction%22%3A%22none%22%7D&mosaicRule=%7B%22where%22%3A%22Name%3D%27ETOPO_2022_v1_15s_bed_elev%27%22%7D&f=image'
python - <<'PY'
import requests
payload={"id":"0","email":"","submission_date":"2023-08-28T16:59:39.220334","processing_status":"new","items":[{"id":0,"grid_id":1,"data_source_ids":[1,3],"formats":[1],"left":128.5,"right":130.8,"top":34.0,"bottom":32.5}]}
r=requests.post('https://download.gebco.net/api/queue', json=payload, timeout=60)
print(r.status_code, r.text)
PY
node scripts/generate-bathymetry-assets.mjs
```

## 次Issueへの引き継ぎ

- GEBCO_2026 15秒 + TID GridをPost-MVP-038の第一候補として、`data/bathymetry` の正本形式、metadata、attribution/disclaimer、TID集計表示を実装する。
- バイナリや一時ファイルをGitへ追加せず、生成済み軽量タイルのみを配信対象にするか、既存の正本JSON + prebuild生成方式を維持するかを容量とVercel制約で決める。
- Playwright等でPC viewport / スマホviewportの初回表示、3D ON、2D fallbackの読み込み時間を追加計測する。
- `docs/ROADMAP.md` のPost-MVP-037は本比較完了により「追加検証中」から「実測比較完了」に更新可能。ただし実装移行はPost-MVP-038で扱う。
