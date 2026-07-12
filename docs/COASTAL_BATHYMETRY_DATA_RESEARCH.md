# 沿岸水深・海岸線データ調査（Post-MVP-037 / Issue #111）

最終更新: 2026-07-12  
対象範囲: 糸島西岸〜唐津湾〜伊万里湾〜平戸周辺（調査bounds: west 128.5 / south 32.5 / east 130.8 / north 34.0）  
結論: 受け入れ条件を満たす実データ比較は、現行 `ETOPO 2022 60 arc-second Bedrock` については完了したが、`ETOPO 2022 15 arc-second Bedrock` と `GEBCO_2026 Grid 15 arc-second` は2026-07-12時点の公式手順で対象boundsのローカルsubset取得を完了できなかった。そのため、本PRでは採用データを固定せず、現行60秒を維持し、Post-MVP-038で公式subset取得手順の復旧確認後に同条件比較を再実行する。

## 調査ルールと禁止事項

- 根拠は公式資料のみとし、第三者サイトの画面解析、海しる・海図・ENC・民間サービス画面からの抽出は行わない。
- GeoTIFF、NetCDF、PNG、ZIPなどのバイナリをGitに追加しない。今回取得したNetCDFは `/tmp/bathy-pr112/` のローカル一時ファイルに限定した。
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

比較対象レイヤーは 2D水深色分け、20m/50m/100m/200m等深線、hillshade、3D terrain、国土地理院標準地図の陸海境界重ね合わせとした。画像バイナリはGitへ追加していない。

## 実データ取得結果

| 候補 | 取得結果 | 取得URL/手順 | 取得日 | checksum / 実測 | 判断 |
| --- | --- | --- | --- | --- | --- |
| ETOPO 2022 60 arc-second Bedrock | 成功。現行Git正本 `data/bathymetry/etopo-2022-crop.json` と、公式NetCDF全球ファイルを照合。 | `https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/60s/60s_bed_elev_netcdf/ETOPO_2022_v1_60s_N90W180_bed.nc` | 2026-07-12 | NetCDF 491,284,376 bytes / SHA-256 `d92483407c6a8f87be6fc8a47e4809332357e2d40c90a49de2e91c39cce08c54`。変数 `z(lat,lon)` 10800×21600、nodata `-99999`。対象cropは現行正本 139×91、最小 -145m、最大 788m。 | 現行維持。沿岸高解像度化には不足。 |
| ETOPO 2022 15 arc-second Bedrock | 失敗。公式THREDDS catalogの15秒NetCDFタイルから `S60E120` を取得したが、緯度範囲が -74.997916〜-60.002083 で対象bounds外だった。catalog上で対象bounds（北緯32.5〜34.0、東経128.5〜130.8）に該当する15秒タイル名を確認できず、推測値で比較しない。 | `https://www.ngdc.noaa.gov/thredds/catalog/global/ETOPO2022/15s/15s_bed_elev_netcdf/catalog.xml` と `https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/15s/15s_bed_elev_netcdf/ETOPO_2022_v1_15s_S60E120_bed.nc` | 2026-07-12 | 取得NetCDF 21,206,803 bytes / SHA-256 `d9b91ca8519d967f0afdeb3d60d6c6509cd9c6e99034c16ef022236680018bad`。変数 `z(lat,lon)` 3600×3600、nodata `-99999`。対象boundsとの交差は0行。 | 実比較未完了。第一候補に固定しない。 |
| GEBCO_2026 Grid 15 arc-second | 失敗。公式subsetting appの公開APIメタデータ（`/api/grids`, `/api/formats`）は確認できたが、旧式の直接download URLは404で、queue APIはブラウザbasket送信前提だった。メール任意のqueue生成を自動化してGitに記録することは避け、推測値で完了扱いしない。 | `https://download.gebco.net/api/grids`, `https://download.gebco.net/api/formats`, 失敗URL `https://download.gebco.net/api/download?format=netcdf&grid=gebco_2026&west=128.5&east=130.8&south=32.5&north=34.0` | 2026-07-12 | `/api/grids` で `gebco_2026_global`、data source `gebco_2026` / `gebco_2026_tid`、最大面積14400平方度、EPSG:4326を確認。直接download URLは HTTP 404。対象crop NetCDF checksum、行列数、最小/最大値は未取得。 | 実比較未完了。採用判断保留。 |

## 同条件比較の実測結果

| 地点 | ETOPO 60秒の実画面評価 | ETOPO 15秒 | GEBCO 2026 15秒 | 国土地理院標準地図重ね合わせ評価 |
| --- | --- | --- | --- | --- |
| 芥屋大門周辺 | 2D色分けは岬周辺の浅場が広い帯で表現され、20m線は岸際の凹凸を追えない。hillshade/3Dは海底斜面の向きは分かるが磯・根の判断には粗い。 | 対象bounds取得失敗のため未比較。 | 対象bounds取得失敗のため未比較。 | zoom 11、opacity 0.35〜0.45で海岸線は水深色を隠しすぎず改善。ZL5〜8表示時は追加クレジット要。 |
| 唐津東港 | 港湾・湾奥は60秒格子では陸海境界と水深変化がずれ、20m/50m線が港内判断に使えない。 | 未比較。 | 未比較。 | 標準地図を薄く重ねると埋立地・港形状の読解は改善。ただし全面ラスターopacity 0.6以上は水深色分けを阻害。 |
| 呼子周辺 | 島・瀬戸の50m線が単純化され、狭い水道の3D起伏は過度に滑らか。 | 未比較。 | 未比較。 | 陸島境界は改善。水深DEM正本ではないため等深線改善には寄与しない。 |
| 鷹島周辺 | 小島・湾入部はセルサイズに対して複雑すぎ、2D/hillshade/terrainとも陸海境界の読み違いリスクが高い。 | 未比較。 | 未比較。 | opacity 0.4前後なら島影と道路/海岸線を補助できる。 |
| 平戸瀬戸周辺 | 急深部の100m/200m線は広域傾向のみ。瀬戸内の狭い谷筋や斜面は粗い。 | 未比較。 | 未比較。 | 海峡形状の読解は改善するが、水深の安全判断には不可。 |

## 実測した容量・生成時間・描画負荷

測定環境: GitHub Codespaces相当のLinuxコンテナ、Node.js/npmは本リポジトリ既存環境、Python 3.12.13、追加確認用に `netCDF4` と `numpy` をユーザー領域へ一時install。日時は2026-07-12 UTC。

| 項目 | ETOPO 60秒 | ETOPO 15秒 | GEBCO 2026 15秒 |
| --- | ---: | ---: | ---: |
| crop元データサイズ | 491,284,376 bytes（公式全球NetCDF） | 21,206,803 bytes（取得できた南緯タイル。対象bounds外） | 未取得（直接URL 404） |
| テキスト正本サイズ | 44,225 bytes（`data/bathymetry/etopo-2022-crop.json`） | 未生成 | 未生成 |
| 行列数 / nodata / min-max | 139×91 / null（正本） / -145〜788m | 対象bounds 0行 | 未取得 |
| Terrain-RGB + color + contour生成時間 | `node scripts/generate-bathymetry-assets.mjs`: 約0.9〜1.1秒 | 未測定 | 未測定 |
| 生成タイル数・合計容量 | z7〜8、Terrain-RGB 8枚 + color 8枚 + contours/metadata、合計約132KB（生成物はGit無視） | 未生成 | 未生成 |
| contours GeoJSON | 34 features、約1,920 vertices、約61KB | 未生成 | 未生成 |
| `npm run build`時間への増分 | prebuild生成を含む現行buildで約8〜10秒台。生成単体は約1秒なので増分は小さい。 | 未測定 | 未測定 |
| MapLibre初回表示/簡易FPS | 実ブラウザ自動計測は未導入。現行60秒は既存UIでPC/スマホ2D fallbackを維持。 | 未測定 | 未測定 |
| PC vs スマホ相当 | PCは3D terrain可、スマホ相当は2D fallback方針維持。 | 未測定 | 未測定 |

未測定セルは失敗理由を上に記録し、概算で埋めない。

## GEBCO利用条件の結論

GEBCO公式Terms of Useでは、GEBCO Gridはpublic domainとして、コピー、公開、配布、改変、商用利用を認める一方、出典表示、GEBCO/IHO/IOC等の公式成果と誤認させないこと、航海利用不可などの免責表示が必要である。したがって、対象boundsのGEBCO_2026 cropおよび派生したTerrain-RGB/color/contourタイルは、Terms of Useに従う限りWeb配信可能と判断する。

必要な表示案:

- Attribution: `Contains information from the GEBCO_2026 Grid, GEBCO Compilation Group (2026).`
- Disclaimer: `GEBCO data and derived tiles are for reference only, are not an official nautical chart, and must not be used for navigation or safety decisions.`
- UI上ではNOAA/GEBCO/GSIを同時に表示し、派生タイルであることを明記する。

ただし、今回GEBCO対象cropの取得が完了していないため、採用判断は保留する。

## 国土地理院タイルの追加クレジットと表示方式

- 本アプリの水深モードで想定する表示zoomは広域確認 z7〜z8、地点確認 z9〜z13。地理院標準地図はリアルタイム読込、ラスターoverlay、opacity 0.35〜0.45を初期候補にする。
- ZL5〜8を表示し得る場合、標準地図の出典「国土地理院」に加え、地理院タイル一覧で案内されるGEBCO由来等深線、海上保安庁許可関連の追加出所表記を併記する。
- 水深色分けを隠す全面背景にはせず、通常は水深color/hillshade/contourの上に低opacityで重ねる。opacity 0.6以上は唐津東港・鷹島周辺で水深色の読解を阻害するため初期値にしない。
- 地理院タイルを複製・同梱せず、リアルタイム表示と出典表示を前提にする。

## 採用判断

1. 現時点では `ETOPO 2022 15秒` を第一候補に固定しない。
2. `GEBCO_2026 Grid 15秒` はTerms of Use上は対象crop・派生タイルをWeb配信可能と判断できるが、対象bounds取得とTID Grid確認が未完了のため採用保留。
3. 現行 `ETOPO 2022 60秒` は安定しているが、5地点すべてで沿岸・港湾・島嶼・瀬戸表現が粗く、Issue #111の改善目的には不足。
4. Post-MVP-038では、公式subset取得の再現性を最初の受け入れ条件にし、ETOPO 15秒とGEBCO 2026 15秒の実データ・TID Grid・レンダリング負荷が揃った時点で採用データを決める。
5. JODC J-EGG500は、無断複製・第三者提供不可の条件により、書面等で再配布・Web配信許可が確認できるまで本番採用しない。

## 再現コマンド

```bash
mkdir -p /tmp/bathy-pr112
curl -L --fail -o /tmp/bathy-pr112/etopo60.nc \
  'https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/60s/60s_bed_elev_netcdf/ETOPO_2022_v1_60s_N90W180_bed.nc'
curl -L --fail -o /tmp/bathy-pr112/etopo15_S60E120.nc \
  'https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/15s/15s_bed_elev_netcdf/ETOPO_2022_v1_15s_S60E120_bed.nc'
curl -s 'https://download.gebco.net/api/grids'
curl -s 'https://download.gebco.net/api/formats'
node scripts/generate-bathymetry-assets.mjs
```

## 次Issueへの引き継ぎ

- GEBCO download appのbasket/queue APIを、公式利用方法に沿って手動またはスクリプトで再現し、メールなしでローカル一時ファイルを取得できるか確認する。
- NOAA ETOPO 15秒はGrid Extractまたは正しい対象タイルの取得手順を公式ページで確認し、対象boundsの行列数、checksum、min/max、nodataを記録する。
- 両15秒候補のTID/sourceID相当を同時に取得し、対象海域が実測主体か補間主体かを地点別に記録する。
- 実データが揃うまで `docs/ROADMAP.md` のPost-MVP-037は「実施済み」ではなく「追加検証中」として扱う。
