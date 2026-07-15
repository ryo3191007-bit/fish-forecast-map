# 高精細1海域PoCデータセット調査

確認日: 2026-07-15  
対象Issue: #151 / Post-MVP-054  
正本: Phase Bの高精細1海域PoCを開始できるか判断するため、公式一次提供元だけで候補データ、利用条件、Web配信可否を確認した調査記録です。

## 1. 結論

**No-Go。2026-07-15時点では、採用ゲートをすべて満たす「1データセット＋1海域」は確定しない。**

最も近い候補は海しるAPIの `等深線` コンテンツである。ただし、これは「水深のグリッドデータから作成した等深線」と説明されるAPIコンテンツであり、元グリッドの正式product ID、切り出しbounds、native grid spacing、鉛直基準、nodata、取得容量、Terrain-RGB/PNG/GeoJSON等の派生物生成可否、GitHub/Vercel Previewでの派生物Web配信可否をコンテンツ単位で確認できない。そのため採用ではなく **要問い合わせ** とする。

Phase Bのデータ取得・加工・Terrain-RGB生成・Web配信PoCは開始しない。

## 2. 調査方法と情報源ルール

- 公式一次提供元または公式文書だけを根拠にした。
- 民間釣りサイト、民間地図アプリ、動画、スクリーンショット、非公式ミラー、第三者再配布物は根拠にしない。
- Web配信・再配布可否が公式文書から明示できない場合は、採用ではなく `要問い合わせ` または `不採用` とした。
- 地点名を先に固定せず、対象候補（芥屋大門周辺、唐津東港/唐津湾、呼子周辺、鷹島周辺、平戸瀬戸周辺）を、coverage、解像度、利用条件、容量の観点で比較した。
- 今回は実データ取得、APIキー取得、高頻度アクセス、タイル生成、アプリコード変更を行っていない。

## 3. 候補比較

| 候補 | 正式名称 / 提供機関 / 公式URL | ID | 対象候補海域 | bounds | native resolution / grid spacing / 測線間隔 | 座標系 / 鉛直基準 / 単位 | 形式 / nodata | 容量・取得サイズ | 取得方法 | 利用条件・加工・派生物・Web配信 | GEBCO_2026 15秒との差 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 海しるAPI 等深線 | 海洋状況表示システム公開API `等深線` / 海上保安庁 / https://portal.msil.go.jp/msil-api-list | API項目名: `等深線` | 日本周辺。候補5海域を含む可能性が高いが、個別coverageはAPIで要確認 | 公式項目一覧では個別bounds未確認。問い合わせ・API metadata確認が必要 | 公式説明は「水深のグリッドデータから作成した等深線」。元グリッドspacing、等深線間隔は未確認 | 水平座標系、鉛直基準、単位はコンテンツmetadataで未確認 | API/地理空間情報。GeoJSON等の取得可否はAPI仕様確認が必要。nodataは未確認 | 未確認 | 利用登録、subscription key、API呼び出し。試用keyは予告なく停止・変更可能 | 海しる利用規約は複製・公衆送信・翻訳等や編集加工を認めるが、第三者権利、外部DB連携、制約コンテンツは個別確認が必要。海図類似刊行物や水路業務法関係の申請可能性も残る。派生Terrain-RGB/PNG/GeoJSONおよびGitHub/Vercelでの再配信可否はコンテンツ単位で明示未確認 | 元グリッドが取得できれば有意差の可能性はあるが未確認 | 要問い合わせ。最有力だが採用不可 |
| NOAA NCEI Bathymetric Data Viewer / IHO DCDB等 | Bathymetric Data Viewer / NOAA NCEI / https://www.ncei.noaa.gov/maps/bathymetry/ | 個別survey ID未特定 | 候補5海域周辺 | 個別survey未特定のため未確認 | 個別surveyごと。対象海域で有効な高密度測線を未確認 | 個別survey metadata依存 | 個別survey metadata依存 | 未確認 | BDVで検索し個別surveyを選択。今回、公式文書だけで対象5海域の採用可能surveyを確定できず | NOAA一般公開データでも、個別surveyの出典、利用条件、派生物配信可否を確認する必要がある | 個別マルチビームがあれば大きい可能性。ただし対象海域coverage未確定 | 保留/不採用。今回採用IDなし |
| JODC J-EGG500 | 500m Gridded Bathymetry Data (J-EGG500) / JODC / https://www.jodc.go.jp/jodcweb/JDOSS/infoJEGG.html | J-EGG500 Territory 2 | 候補5海域はTerritory 2内（北緯30〜38度、東経128〜144度） | Territory 2: N30〜38, E128〜144 | Lambert Conformal Conicの500m square grid。緯度経度格子ではない | 世界測地系WGS-84。鉛直基準はページ上未確認。Depth単位m | テキスト: Classification, Latitude, Longitude, Depth。Classification 0/1。nodata未確認 | Territory単位。対象切り出しサイズは未確認 | J-DOSS/J-EGG500配布ページ確認 | 公式ページ末尾が書面許可なしの複製・再掲載禁止を示す。派生物生成やGitHub/Vercel配信は少なくとも要書面許可。500m格子で小起伏を描けない注意もある | GEBCO_2026 15秒（緯度33度付近で数百m級）より有意に細かいとは言いにくい | 不採用 |
| AIST/GSJ 海洋地質・地形系DB | AIST/GSJ Database / 産業技術総合研究所 地質調査総合センター / https://unit.aist.go.jp/igg/en/database/index.html | 個別DB未特定 | 一部日本沿岸。候補5海域coverageは水深DEMとして未確認 | 未確認 | 水深DEMのgrid spacingとして未確認 | 未確認 | 地質情報中心。水深DEM形式/nodata未確認 | 未確認 | 公式DBから個別データ確認 | 地質レイヤー参考にはなり得るが、今回のTerrain-RGB用水深DEMとしてのID、bounds、容量、配信可否を確認できない | 水深DEM比較対象として未確認 | 不採用 |
| 国土地理院 標準地図タイル等 | 地理院タイル / 国土地理院 / https://maps.gsi.go.jp/development/ichiran.html | 標準地図等 | 日本 | タイルcoverageは日本。海底DEM boundsではない | 地形図タイルであり海底水深DEMではない | Web Mercator tile。水深鉛直基準なし | XYZタイル。DEM nodata対象外 | タイル通信量のみ | リアルタイム参照 | 海岸線補助には検討余地があるが、独立ベクトル化や複製・再配布は測量法/規約確認が必要。海底高精細DEMではない | 水深DEMではない | 不採用 |

## 4. 候補海域の扱い

採用海域は確定しない。要問い合わせの暫定対象を置くなら、海しるAPI `等深線` の確認対象として **平戸瀬戸周辺** を優先する。

暫定問い合わせbounds:

```txt
west=129.52, south=33.31, east=129.62, north=33.40
```

理由:

- 候補5海域のうち、狭い海峡地形でGEBCO_2026 15秒との差が視覚的に出やすい可能性がある。
- 1海域PoCとして切り出し範囲を小さく保ちやすい。
- ただし、このboundsは問い合わせ・metadata確認用の暫定値であり、公式boundsでも採用boundsでもない。

## 5. 利用条件比較

| 候補 | 元データ加工可否 | 派生Terrain-RGB/PNG/GeoJSON作成可否 | GitHub/Vercel Preview等でのWeb配信・再配布可否 | attribution | 商用/非商用 | 申請・問い合わせ |
| --- | --- | --- | --- | --- | --- | --- |
| 海しるAPI 等深線 | 一般規約上は編集・加工利用を想定。ただしコンテンツ単位の第三者権利、外部DB条件、制約コンテンツ該当性が未確認 | 未確認。元グリッド取得可否も未確認 | 未確認。一般規約だけでは派生水深タイルのWeb配信を採用確定できない | 海しるAPIを利用して取得した情報をもとに作成し、海上保安庁が保証しない旨、出典、加工表示 | 提供元が商用利用を認めているコンテンツのみ商用可 | 必須。対象bounds、metadata、派生物、Web配信可否を問い合わせる |
| NOAA NCEI BDV | 個別survey次第 | 個別survey次第 | 個別survey次第 | 個別survey citation | 個別survey次第 | 対象海域surveyの特定が先 |
| JODC J-EGG500 | 書面許可なしでは不可/要問い合わせ | 書面許可なしでは不可/要問い合わせ | 書面許可なしでは不可/要問い合わせ | JODC等、許可条件に従う | 許可条件次第 | 書面許可が必要 |
| AIST/GSJ | 個別データ条件次第。今回DEM未特定 | 未確認 | 未確認 | 個別DB条件次第 | 個別DB条件次第 | DEM候補特定が先 |
| GSI | 海底DEMでは対象外 | 対象外 | 対象外 | GSIタイル利用時は出典 | 規約に従う | 海岸線補助を複製/使用する場合は別途確認 |

## 6. 採用ゲート判定

| ゲート | 判定 | 根拠 |
| --- | --- | --- |
| 対象海域を具体的boundsで切り出せる | 未達 | 海しるAPI等深線の公式bounds/API metadataを未確認。暫定boundsは問い合わせ用に留まる |
| GEBCO_2026 15秒より有意に細かい地形比較が期待できる | 未達 | 元グリッドspacingまたは等深線間隔が未確認。J-EGG500は500m格子で有意な高精細化とは言いにくい |
| 取得方法が公式手順として再現可能 | 一部達成 | 海しるAPIは登録/key/API利用手順があるが、対象コンテンツの実取得手順と容量は未確認 |
| 元データ加工が許可される | 未達 | 海しる一般規約は加工を想定するが、対象コンテンツ単位の権利・制約が未確認 |
| 派生Terrain-RGB/PNG/GeoJSON等の作成が許可される | 未達 | 明示確認なし |
| GitHub/Vercel Preview等で派生物を公開できる | 未達 | 明示確認なし。採用確定不可 |
| attributionと注意表示を実装可能 | 一部達成 | 海しるAPI文言、出典、加工表示、非保証注記は把握。ただしコンテンツ個別条件が未確認 |
| データ量が1海域PoCとして現実的 | 未達 | 取得サイズ未確認 |

## 7. No-Go判断

採用ゲートのうち、Web配信・再配布可否、派生物生成可否、native resolution、容量、対象boundsが未達である。したがって **Phase Bの高精細データ取得・加工・Terrain-RGB化・Vercel Preview配信はNo-Go** とする。

次の判断は推測しない。

- 海しるAPI一般規約があるため、等深線や元グリッドの派生Terrain-RGBをGitHub/Vercelで配信できる、とは判断しない。
- J-EGG500を500mであることだけを理由に高精細PoC採用とはしない。
- NOAA BDVを検索入口として見つけただけで、対象海域の個別survey採用とはしない。

## 8. 次Issueで可能な作業

- 海しるAPI `等深線` について、平戸瀬戸暫定boundsを添えて、提供機関へ次を問い合わせる。
  - 元グリッドの正式名称/product ID
  - 対象boundsで取得可能なcoverage
  - native grid spacing/等深線間隔
  - 水平座標系、鉛直基準、単位、nodata
  - 取得形式、APIレスポンス形式、対象範囲の概算容量
  - 元データ加工、Terrain-RGB/PNG/GeoJSON派生物生成、GitHub/Vercel PreviewでのWeb配信・再配布可否
  - attribution、非保証文言、商用/非商用条件、申請要否
- NOAA BDVで対象5海域の個別survey IDを公式metadata単位で再調査する。
- AIST/GSJは水深DEM候補ではなく、将来の地質レイヤー候補として分離して調査する。

## 9. 次Issueで禁止する作業

- 高精細データ本体、GeoTIFF、NetCDF、XYZ、LAS、CSV等をGitへ追加すること。
- Terrain-RGB、color tile、contour GeoJSON等を生成すること。
- Next.js/MapLibreの描画コード、DB、Supabase、localStorage、地点・魚種・釣果情報、SCORE、予報を変更すること。
- 利用条件不明のデータをVercel Preview、GitHub Pages、GitHub repository、public assetへ配置すること。
- 元データにない地形を補間・生成すること。

## 10. 公式根拠URL

- 海しるAPI 項目一覧: https://portal.msil.go.jp/msil-api-list
- 海しるAPI 利用規約: https://portal.msil.go.jp/agreement
- 海洋状況表示システム利用規約PDF: https://www.msil.go.jp/data/terms-of-use-ja.pdf
- NOAA NCEI Bathymetric Data Viewer: https://www.ncei.noaa.gov/maps/bathymetry/
- JODC J-EGG500: https://www.jodc.go.jp/jodcweb/JDOSS/infoJEGG.html
- AIST/GSJ Database: https://unit.aist.go.jp/igg/en/database/index.html
- 国土地理院 地理院タイル一覧: https://maps.gsi.go.jp/development/ichiran.html
