# 沿岸水深・海岸線データ調査（Post-MVP-037 / Issue #111）

最終更新: 2026-07-12  
対象範囲: 糸島西岸〜唐津湾〜伊万里湾〜平戸周辺  
調査bounds: west `128.5` / south `32.5` / east `130.8` / north `34.0`

## 結論

同一bounds・同一カメラ・同一生成条件で公式データを比較し、Post-MVP-038の第一sourceを **GEBCO_2026 Grid 15秒 + GEBCO_2026 TID Grid**、広域fallbackを **ETOPO 2022 60秒 Bedrock**、陸海境界の補助を **国土地理院標準地図overlay** としました。

15秒メッシュは60秒より表示密度が上がりますが、港内、岩礁、根、瀬、航路の位置や水深を保証しません。対象cropのTIDはpredicted / mixed / landの割合が高いため、「高解像度だから高精度」とは表現しません。すべて参考表示であり、航海・安全判断には使用不可です。

## 調査ルール

- 根拠はNOAA、GEBCO、国土地理院等の公式資料・公式配布データに限定しました。
- 海しる、海図、ENC、民間アプリ、第三者動画・画面からデータを抽出していません。
- GeoTIFF、NetCDF、PNG、ZIP等の取得バイナリをGitへ追加しません。
- Next.js runtime、Vercel build、通常のdev/testから外部水深データを取得しません。
- JODC J-EGG500は、再配布・Web配信許可が確認できるまで採用しません。

## 比較地点・固定カメラ

| 地点 | center | zoom | pitch | bearing | exaggeration |
| --- | --- | ---: | ---: | ---: | ---: |
| 芥屋大門周辺 | `[130.109, 33.596]` | 11 | 60 | 0 | 1.0 |
| 唐津東港 | `[129.993, 33.459]` | 11 | 60 | 0 | 1.0 |
| 呼子周辺 | `[129.892, 33.543]` | 11 | 60 | 0 | 1.0 |
| 鷹島周辺 | `[129.844, 33.448]` | 11 | 60 | 0 | 1.0 |
| 平戸瀬戸周辺 | `[129.579, 33.354]` | 11 | 60 | 0 | 1.0 |

比較対象は2D水深色分け、20m/50m/100m/200m/500m等深線、hillshade、3D terrain、GSI標準地図overlayです。

## 公式データ取得結果

### ETOPO 2022 60 arc-second Bedrock

- 公式全球NetCDF: 491,284,376 bytes
- SHA-256: `d92483407c6a8f87be6fc8a47e4809332357e2d40c90a49de2e91c39cce08c54`
- 変数: `z(lat,lon)`、10800×21600
- nodata: `-99999`
- 対象crop正本: `139 x 91`
- crop min/max: `-145 / 788m`
- 判断: 生成・表示負荷が小さいためfallbackとして維持。ただし沿岸表現は粗い。

### ETOPO 2022 15 arc-second Bedrock

- NOAA Grid Extractの対象crop GeoTIFF: 430,694 bytes
- SHA-256: `4201d46a2737701e0fe43bb9140f57b0f2ac67b8cce84911d858063ea9d2d3e3`
- shape: `552 x 360`
- cell size: `0.0041666667°`
- nodata: なし
- min/max: `-278 / 1387.152m`
- 判断: 60秒より等深線表現は改善するが、TID相当の由来説明がないため採用第二候補。

### GEBCO_2026 Grid 15 arc-second + TID Grid

公式download appの通常フローでBathymetry + TID / NetCDFを取得しました。

- ZIP: 1,035,746 bytes
- ZIP SHA-256: `d320b67d89403cce3f95e9293e9e97725264dd1512c82e12b2e84187e86ce2ea`
- Bathymetry NetCDF: 409,944 bytes
- Bathymetry SHA-256: `6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151`
- DEM shape: `552 x 360`
- DEM nodata: `-32767`
- DEM min/max: `-277 / 1346m`
- TID NetCDF: 213,304 bytes
- TID SHA-256: `04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84`
- TID shape: `552 x 360`
- TID nodata: `127`
- TID出現コード: `0/11/17/40/43/44`
- 判断: 表示密度とデータ由来説明を両立できるため第一sourceに採用。

## 正本JSON記録

Post-MVP-038でコミットする正本は、公式NetCDFのpixel-centreセルを補間・水増しせず、north-to-south / west-to-eastのrow-majorへ変換します。公式cropのlatitudeがsouth-to-northであるため、rowを一度だけ反転します。

- DEM values SHA-256: `59f02c67f79aa3edb61548ddd0dcb669880f6164ccc97eb8dd1a9fbfb0fd244b`
- TID values SHA-256: `f39a3d090f387d124c1b5a10ecfff113f186b5f916ad2cc4001d5bebf2a70688`
- DEM先頭値: `-104/-103/-103/-102/-103/-103`
- TID先頭値: `40/40/40/17/17/17`

`tools/bathymetry/convert-gebco-netcdf.mjs` と `convert_gebco_netcdf.py` が、ローカルの公式NetCDFから正本JSONを再生成し、source SHA、座標、shape、nodata、value-array SHA、TIDコードを検証します。

## TID Grid 5地点集計

調査時は各地点中心の5×5セルを比較しました。実装UIでは地図中心周辺17×17セルを動的集計します。

| 地点 | direct | predicted/interpolated | mixed/unknown/land |
| --- | ---: | ---: | ---: |
| 芥屋大門周辺 | 0% | 40% | 60% |
| 唐津東港 | 4% | 68% | 28% |
| 呼子周辺 | 4% | 24% | 72% |
| 鷹島周辺 | 4% | 24% | 72% |
| 平戸瀬戸周辺 | 4% | 20% | 76% |

分類はdirect `10〜17`、predicted/interpolated `40/41/45`、mixed/unknown/land `0/43/44/70〜72`、nodata `127`です。nodataは割合の分母から除外します。

## 生成実測

| 項目 | ETOPO 60秒 | ETOPO 15秒 | GEBCO 2026 15秒 |
| --- | ---: | ---: | ---: |
| 一時テキスト正本 | 44,225 bytes | 1,993,239 bytes | 1,190,423 bytes |
| 生成時間 | 約1.0秒 | 5.427秒 | 3.556秒 |
| 生成物 | 18 files / 486,212 bytes | 18 files / 1,741,901 bytes | 18 files / 1,551,377 bytes |
| contours | 72 features / 2,021 vertices / 194,025 bytes | 702 features / 14,198 vertices / 1,413,982 bytes | 430 features / 12,684 vertices / 1,212,628 bytes |

上記は調査時のz7〜8条件です。Post-MVP-038の実装生成条件ではGEBCOをz7〜9、ETOPO fallbackをz7〜8として生成します。

## GSI標準地図overlay

- tile: `https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png`
- 公式タイル一覧: https://maps.gsi.go.jp/development/ichiran.html
- 推奨opacity: `0.35〜0.45`、実装初期値 `0.40`
- ZL5〜8の追加表示: GEBCO Digital Atlas由来等深線、海上保安庁許可第292502号（水路業務法第25条）、VMAP0 shoreline
- GSI overlayはリアルタイム表示し、タイルをGitやVercel生成物へ複製しません。
- GEBCO正本の出典と、GSI標準地図内素材の出典を分けて表示します。

## 利用条件・注意表示

GEBCO attribution:

`Contains information from the GEBCO_2026 Grid, GEBCO Compilation Group (2026).`

必須注意:

`Reference only; not an official nautical chart; must not be used for navigation or safety decisions.`

## Post-MVP-038実装記録

- 第一source: GEBCO_2026 Grid 15秒
- lineage: GEBCO_2026 TID Grid
- fallback: ETOPO 2022 60秒 Bedrock
- final fallback: 両水深sourceが失敗した場合は水深layer、terrain、GSI overlay、出典を解除して通常地図へ戻す
- UI: 2D色分け、等深線、hillshade、3D ON/OFF、GSI ON/OFF、地図中心連動TID表示
- 人工的な起伏やノイズは追加しない
- pixel-centre登録をsamplingと等深線座標で維持する
- runtime/buildで外部GEBCO/NOAA取得を行わない

PC `1440 x 900` / スマホ `390 x 844` の実ブラウザ性能値はCodexコンテナでは取得できていません。数値は捏造せず、Vercel Previewで初回表示、3D、2D、GSI、fallback、console error、failed request、Long Taskを手動確認します。
