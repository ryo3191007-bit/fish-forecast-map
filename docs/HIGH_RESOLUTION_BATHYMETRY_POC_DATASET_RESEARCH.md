# 高精細1海域PoCデータセット調査

確認日: 2026-07-16
対象Issue: #151 / Post-MVP-054
正本: Phase Bの高精細1海域PoCを開始できるか判断するため、公式一次提供元だけで候補データ、利用条件、Web配信可否を確認した調査記録です。

## 1. 結論

**No-Go。2026-07-16時点では、採用ゲートをすべて満たす「1データセット＋1海域」は確定しない。**

最も近い候補は海しるAPIの `等深線` コンテンツである。海しるAPIの一般仕様として、JSON/GeoJSON/PNGで取得可能、1回最大1,000レコード、1応答最大64MB、`resultOffset` によるページング取得が可能であることは確認済みである。一方、`等深線` コンテンツ固有のendpoint/layer ID/product ID、属性schema、元グリッドの正式名称、native grid spacingまたは等深線間隔、coverage、鉛直基準、nodata、対象boundsでの総レコード数・総容量、Terrain-RGB/PNG/GeoJSON等の派生物生成可否、GitHub/Vercel Previewでの派生物Web配信可否をコンテンツ単位で確認できない。そのため採用ではなく **要問い合わせ** とする。

NOAA NCEI Bathymetric Data ViewerとAIST/GSJ公式DBも候補5海域・代表boundsで再確認したが、2026-07-16時点で本PoCに採用できる具体的dataset/survey/product ID、bounds、解像度、形式、容量、利用条件を揃えて確定できなかった。Phase Bのデータ取得・加工・Terrain-RGB生成・Web配信PoCは開始しない。

## 2. 調査方法と情報源ルール

- 公式一次提供元または公式文書だけを根拠にした。
- 民間釣りサイト、民間地図アプリ、動画、スクリーンショット、非公式ミラー、第三者再配布物は根拠にしない。
- Web配信・再配布可否が公式文書から明示できない場合は、採用ではなく `要問い合わせ` または `不採用` とした。
- 地点名を先に固定せず、対象候補（芥屋大門周辺、唐津東港/唐津湾、呼子周辺、鷹島周辺、平戸瀬戸周辺）を、coverage、解像度、利用条件、容量の観点で比較した。
- NOAA/AIST/GSJは「個別調査をしていない」のではなく、下記の公式検索画面・公式DB・代表boundsで確認し、採用可能な具体IDを特定できなかったものとして記録する。
- 今回は実データ取得、APIキー取得、高頻度アクセス、タイル生成、アプリコード変更を行っていない。

## 3. 候補5海域と代表検索bounds

| 海域 | 代表検索bounds | 備考 |
| --- | --- | --- |
| 芥屋大門周辺 | west=130.05, south=33.55, east=130.14, north=33.66 | 糸島西岸の小範囲確認用 |
| 唐津東港/唐津湾 | west=129.94, south=33.42, east=130.10, north=33.52 | 港湾・湾奥〜湾口の確認用 |
| 呼子周辺 | west=129.82, south=33.50, east=129.94, north=33.61 | 瀬・島周り確認用 |
| 鷹島周辺 | west=129.70, south=33.37, east=129.85, north=33.48 | 伊万里湾口周辺確認用 |
| 平戸瀬戸周辺 | west=129.52, south=33.31, east=129.62, north=33.40 | 暫定問い合わせ最優先bounds |

## 4. 候補比較

| 候補 | 正式名称 / 提供機関 / 公式URL | ID | 対象候補海域 | bounds | native resolution / grid spacing / 測線間隔 | 座標系 / 鉛直基準 / 単位 | 形式 / nodata | 容量・取得サイズ | 取得方法 | 利用条件・加工・派生物・Web配信 | GEBCO_2026 15秒との差 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 海しるAPI 等深線 | 海洋状況表示システム公開API `等深線` / 海上保安庁 / https://portal.msil.go.jp/msil-api-list | API項目名: `等深線`。endpoint/layer ID/product IDは未確認 | 日本周辺。候補5海域を含む可能性が高いが、個別coverageはコンテンツmetadata/APIで要確認 | 公式項目一覧では個別bounds未確認。問い合わせ・API metadata確認が必要 | 公式説明は「水深のグリッドデータから作成した等深線」。元グリッドspacing、等深線間隔は未確認 | 水平座標系、鉛直基準、単位はコンテンツmetadataで未確認 | 一般API仕様としてJSON/GeoJSON/PNG取得可は確認済み。`等深線` 固有の属性schema、nodataは未確認 | 一般API仕様として1回最大1,000レコード、1応答最大64MBは確認済み。対象boundsの総レコード数・総容量は未確認 | 利用登録、subscription key、API呼び出し。1,000件超は `resultOffset` でページング可能。試用keyは予告なく停止・変更可能 | 一般規約上は条件付きで複製・公衆送信・編集/加工が可能。ただし `等深線` 固有の提供元、第三者権利、外部DB条件、個別制約、派生Terrain-RGB/PNG/GeoJSONおよびGitHub/Vercelでの公開・再配布可否は未確認 | 元グリッドまたは等深線間隔が確認できれば有意差の可能性はあるが未確認 | 要問い合わせ。最有力だが採用不可 |
| NOAA NCEI Bathymetric Data Viewer / IHO DCDB等 | Bathymetric Data Viewer / NOAA NCEI / https://www.ncei.noaa.gov/maps/bathymetry/ | 候補5海域で採用可能な個別survey IDを特定できず | 候補5海域周辺 | 下記検索記録の代表boundsで確認 | 個別surveyごと。対象海域で有効な高密度測線を確認できず | 個別survey metadata依存 | 個別survey metadata依存 | 採用候補ID未特定のため容量未確認 | BDV公式検索で候補boundsを確認。個別survey metadataで採用可否を確認する想定 | NOAA一般公開データでも、個別surveyの出典、利用条件、派生物配信可否を確認する必要がある | 個別マルチビームがあれば大きい可能性。ただし対象海域coverage未確定 | 保留/不採用。今回採用IDなし |
| JODC J-EGG500 | 500m Gridded Bathymetry Data (J-EGG500) / JODC / https://www.jodc.go.jp/jodcweb/JDOSS/infoJEGG.html | J-EGG500 Territory 2 | 候補5海域はTerritory 2内（北緯30〜38度、東経128〜144度） | Territory 2: N30〜38, E128〜144 | Lambert Conformal Conicの500m square grid。緯度経度格子ではない | 世界測地系WGS-84。鉛直基準はページ上未確認。Depth単位m | テキスト: Classification, Latitude, Longitude, Depth。Classification 0/1。nodata未確認 | Territory単位。対象切り出しサイズは未確認 | J-DOSS/J-EGG500配布ページ確認 | 公式ページ末尾は書面許可なしの複製・再掲載禁止を示す。公開・再配布・Web掲載には書面許可が必要。派生物生成や内部加工の可否は許可条件確認まで未確定 | GEBCO_2026 15秒（緯度33度付近で数百m級）より有意に細かいとは言いにくい | 不採用 |
| AIST/GSJ 海洋地質・地形系DB | AIST/GSJ Database / 産業技術総合研究所 地質調査総合センター / https://unit.aist.go.jp/igg/en/database/index.html | 下記確認DBでは水深DEM候補IDを特定できず | 一部日本沿岸。候補5海域coverageは水深DEMとして未確認 | 代表boundsで確認したがDEM boundsは特定できず | 水深DEMのgrid spacingとして確認できず | 未確認 | 地質情報中心。水深DEM形式/nodata未確認 | 水深DEM容量未確認 | 公式DB一覧から海洋地質図、海陸シームレス地質情報集、地質図Navi等を確認 | 地質レイヤー参考にはなり得るが、今回のTerrain-RGB用水深DEMとしてのID、bounds、容量、配信可否を確認できない | 水深DEM比較対象として未確認 | 不採用 |
| 国土地理院 標準地図タイル等 | 地理院タイル / 国土地理院 / https://maps.gsi.go.jp/development/ichiran.html | 標準地図等 | 日本 | タイルcoverageは日本。海底DEM boundsではない | 地形図タイルであり海底水深DEMではない | Web Mercator tile。水深鉛直基準なし | XYZタイル。DEM nodata対象外 | タイル通信量のみ | リアルタイム参照 | 海岸線補助には検討余地があるが、独立ベクトル化や複製・再配布は測量法/規約確認が必要。海底高精細DEMではない | 水深DEMではない | 不採用 |

## 5. 再現可能な公式検索記録

### 5.1 海しるAPI

| 項目 | 記録 |
| --- | --- |
| 検索日 | 2026-07-16 |
| 使用した公式ページ | 海しるAPI Home、項目一覧、利用方法、利用規約 |
| 検索条件 | 項目一覧で `等深線` を確認し、利用方法で一般API仕様、利用規約で加工・公衆送信条件を確認 |
| 確認済み一般仕様 | JSON/GeoJSON/PNG取得可、1回最大1,000レコード、1応答最大64MB、`exceededTransferLimit` と `resultOffset` によるページング |
| `等深線` 固有の未確認 | endpoint/layer ID/product ID、属性schema、coverage、公式bounds、等深線間隔、元グリッド正式名称・spacing、水平座標系、鉛直基準、単位、nodata、対象bounds総レコード数・総容量、派生物生成・Web公開可否 |
| 採否理由 | 一般API仕様はゲート未達から外す。ただし水深DEM/Terrain-RGB PoCに必要なコンテンツ固有条件と配信条件が未確認のため採用保留/No-Go |

### 5.2 NOAA NCEI Bathymetric Data Viewer

| 海域 | 検索日 | 使用した公式検索画面 | 検索条件 | ヒットしたdataset/survey/product ID | bounds/解像度/形式/容量/利用条件を確認できた範囲 | 水深DEM PoC採否理由 |
| --- | --- | --- | --- | --- | --- | --- |
| 芥屋大門周辺 | 2026-07-16 | NOAA NCEI Bathymetric Data Viewer | 代表bounds `130.05,33.55,130.14,33.66` 周辺をBDVで確認 | 採用可能な個別survey IDを特定できず | 個別metadataへ進める採用候補なし。bounds、解像度、形式、容量は未確定 | 対象boundsでTerrain-RGB候補として確定できる公式surveyがないため不採用 |
| 唐津東港/唐津湾 | 2026-07-16 | NOAA NCEI Bathymetric Data Viewer | 代表bounds `129.94,33.42,130.10,33.52` 周辺をBDVで確認 | 採用可能な個別survey IDを特定できず | 個別metadataへ進める採用候補なし。bounds、解像度、形式、容量は未確定 | 港湾・湾内の高精細DEM候補を確定できないため不採用 |
| 呼子周辺 | 2026-07-16 | NOAA NCEI Bathymetric Data Viewer | 代表bounds `129.82,33.50,129.94,33.61` 周辺をBDVで確認 | 採用可能な個別survey IDを特定できず | 個別metadataへ進める採用候補なし。bounds、解像度、形式、容量は未確定 | 個別survey ID・容量・利用条件が揃わないため不採用 |
| 鷹島周辺 | 2026-07-16 | NOAA NCEI Bathymetric Data Viewer | 代表bounds `129.70,33.37,129.85,33.48` 周辺をBDVで確認 | 採用可能な個別survey IDを特定できず | 個別metadataへ進める採用候補なし。bounds、解像度、形式、容量は未確定 | 個別survey ID・容量・利用条件が揃わないため不採用 |
| 平戸瀬戸周辺 | 2026-07-16 | NOAA NCEI Bathymetric Data Viewer | 代表bounds `129.52,33.31,129.62,33.40` 周辺をBDVで確認 | 採用可能な個別survey IDを特定できず | 個別metadataへ進める採用候補なし。bounds、解像度、形式、容量は未確定 | 最優先候補boundsでも公式surveyを確定できないため不採用 |

補足: BDVは検索入口であり、採用するには個別survey metadataでcoverage、測線/格子解像度、形式、容量、利用条件、citationを確認する必要がある。今回は上表の代表boundsで採用可能な個別IDを確定できなかったため、推測でIDや解像度を補わない。

### 5.3 AIST/GSJ公式DB

| 検索日 | 使用した公式DB/metadataページ | 検索条件 | 確認した個別DB | ヒットしたdataset/product ID | 確認できた範囲 | 水深DEM PoC採否理由 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-16 | AIST/GSJ Database | 候補5海域名（芥屋大門、唐津湾、呼子、鷹島、平戸瀬戸）と水深DEM/Terrain-RGB用途を想定して公式DB一覧を確認 | Marine geological map、Seamless digital geological map of Japan、Geological Map Navi等の地質・海洋地質系入口 | Terrain-RGB用の水深DEMとして採用できる個別product IDは特定できず | 地質図・海洋地質情報として参照余地はあるが、bounds、grid spacing、DEM形式、容量、Web配信可否を揃えた水深DEM候補は確認できず | 水深DEMではなく地質レイヤー候補として後続分離。不採用 |

補足: AIST/GSJは地質情報の公式一次提供元として有用だが、今回の目的は海底地形Terrain-RGB用の高精細DEMである。候補5海域に対してDEM grid spacing、形式、容量、派生物配信条件を確認できる個別DBを特定できなかったため、PoC採用候補から外す。

## 6. 候補海域の扱い

採用海域は確定しない。要問い合わせの暫定対象を置くなら、海しるAPI `等深線` の確認対象として **平戸瀬戸周辺** を優先する。

暫定問い合わせbounds:

```txt
west=129.52, south=33.31, east=129.62, north=33.40
```

理由:

- 候補5海域のうち、狭い海峡地形でGEBCO_2026 15秒との差が視覚的に出やすい可能性がある。
- 1海域PoCとして切り出し範囲を小さく保ちやすい。
- ただし、このboundsは問い合わせ・metadata確認用の暫定値であり、公式boundsでも採用boundsでもない。

## 7. 利用条件比較

| 候補 | 元データ加工可否 | 派生Terrain-RGB/PNG/GeoJSON作成可否 | GitHub/Vercel Preview等でのWeb配信・再配布可否 | attribution | 商用/非商用 | 申請・問い合わせ |
| --- | --- | --- | --- | --- | --- | --- |
| 海しるAPI 等深線 | 一般規約上は条件付きで複製、公衆送信、編集・加工が可能。ただし `等深線` 固有の第三者権利、外部DB条件、個別制約コンテンツ該当性が未確認 | 未確認。元グリッド取得可否も未確認。派生Terrain-RGB/PNG/GeoJSONはコンテンツ単位で確認が必要 | 未確認。一般規約だけでは派生水深タイルのGitHub/Vercel Preview公開・再配布を採用確定できない | 海しるAPIを利用して取得した情報をもとに作成し、海上保安庁が保証しない旨、出典、加工表示 | 提供元が商用利用を認めているコンテンツのみ商用可 | 必須。対象bounds、metadata、派生物、Web配信可否を問い合わせる |
| NOAA NCEI BDV | 個別survey次第 | 個別survey次第 | 個別survey次第 | 個別survey citation | 個別survey次第 | 対象海域surveyの特定が先 |
| JODC J-EGG500 | 内部加工・派生物生成の可否は許可条件確認まで未確定 | 派生物生成の可否は許可条件確認まで未確定 | 公開・再配布・再掲載には書面許可が必要 | JODC等、許可条件に従う | 許可条件次第 | 公開・再配布・Web掲載には書面許可が必要。内部加工条件も問い合わせる |
| AIST/GSJ | 個別データ条件次第。今回DEM未特定 | 未確認 | 未確認 | 個別DB条件次第 | 個別DB条件次第 | DEM候補特定が先 |
| GSI | 海底DEMでは対象外 | 対象外 | 対象外 | GSIタイル利用時は出典 | 規約に従う | 海岸線補助を複製/使用する場合は別途確認 |

## 8. 採用ゲート判定

| ゲート | 判定 | 具体的な未達/達成根拠 |
| --- | --- | --- |
| 対象海域を具体的boundsで切り出せる | 未達 | 海しるAPI `等深線` の公式coverage/bounds、endpoint/layer ID、対象bounds総件数が未確認。暫定boundsは問い合わせ用に留まる |
| GEBCO_2026 15秒より有意に細かい地形比較が期待できる | 未達 | 海しるの元グリッドspacingまたは等深線間隔が未確認。J-EGG500は500m格子で有意な高精細化とは言いにくい。NOAA/AISTは採用IDなし |
| 取得方法が公式手順として再現可能 | 一部達成 | 海しるAPIの一般取得手順、JSON/GeoJSON/PNG、1,000件/64MB制限、`resultOffset` pagingは確認済み。ただし `等深線` 固有endpoint・属性schema・総容量は未確認 |
| 元データ加工が許可される | 未達 | 海しる一般規約は条件付き加工を認めるが、`等深線` 固有の第三者権利・外部DB条件・個別制約が未確認。J-EGG500の内部加工条件も未確定 |
| 派生Terrain-RGB/PNG/GeoJSON等の作成が許可される | 未達 | 海しる `等深線` 派生物とJ-EGG500派生物はいずれも条件確認が必要。NOAA/AISTは採用IDなし |
| GitHub/Vercel Preview等で派生物を公開できる | 未達 | 海しる派生物の公開・再配布条件が未確認。J-EGG500は公開・再配布・再掲載に書面許可が必要。NOAA/AISTは採用IDなし |
| attributionと注意表示を実装可能 | 一部達成 | 海しるAPI文言、出典、加工表示、非保証注記は把握。ただしコンテンツ個別条件が未確認 |
| データ量が1海域PoCとして現実的 | 未達 | 海しる対象boundsの総レコード数・総容量、NOAA/AIST個別候補の容量が未確認 |

## 9. No-Go判断

採用ゲートのうち、対象bounds、native resolution/等深線間隔、コンテンツ固有取得手順、派生物生成可否、Web配信・再配布可否、データ量が未達である。したがって **Phase Bの高精細データ取得・加工・Terrain-RGB化・Vercel Preview配信はNo-Go** とする。

一般API仕様まで未確認とは扱わない。海しるAPIの一般取得仕様は確認済みだが、`等深線` 固有の条件と派生物配信条件が未確認であることをNo-Go理由とする。

次の判断は推測しない。

- 海しるAPI一般規約があるため、等深線や元グリッドの派生Terrain-RGBをGitHub/Vercelで配信できる、とは判断しない。
- J-EGG500を500mであることだけを理由に高精細PoC採用とはしない。
- J-EGG500の内部加工まで全面禁止とは断定しないが、公開・再配布・再掲載には書面許可が必要であり、派生物生成条件も問い合わせる。
- NOAA BDVを検索入口として見つけただけで、対象海域の個別survey採用とはしない。
- AIST/GSJの地質系DBを水深DEM/Terrain-RGB用データセットとはみなさない。

## 10. 次Issueで可能な作業

- 海しるAPI `等深線` について、平戸瀬戸暫定boundsを添えて、提供機関へ次を問い合わせる。
  - endpoint/layer ID/product ID、属性schema
  - 元グリッドの正式名称/product ID
  - 対象boundsで取得可能なcoverage、公式bounds
  - native grid spacing/等深線間隔
  - 水平座標系、鉛直基準、単位、nodata
  - 対象boundsの総レコード数、総取得容量、paging回数
  - 元データ加工、Terrain-RGB/PNG/GeoJSON派生物生成、GitHub/Vercel PreviewでのWeb配信・再配布可否
  - attribution、非保証文言、商用/非商用条件、申請要否
- NOAA BDVで対象5海域の個別survey IDを公式metadata単位で再調査する。採用候補が出た場合のみbounds、解像度/測線間隔、形式、容量、利用条件、citationを記録する。
- AIST/GSJは水深DEM候補ではなく、将来の地質レイヤー候補として分離して調査する。

## 11. 次Issueで禁止する作業

- 高精細データ本体、GeoTIFF、NetCDF、XYZ、LAS、CSV等をGitへ追加すること。
- Terrain-RGB、color tile、contour GeoJSON等を生成すること。
- Next.js/MapLibreの描画コード、DB、Supabase、localStorage、地点・魚種・釣果情報、SCORE、予報を変更すること。
- 利用条件不明のデータをVercel Preview、GitHub Pages、GitHub repository、public assetへ配置すること。
- 元データにない地形を補間・生成すること。

## 12. 公式根拠URL

- 海しるAPI Home: https://portal.msil.go.jp/
- 海しるAPI 項目一覧: https://portal.msil.go.jp/msil-api-list
- 海しるAPI 利用方法: https://portal.msil.go.jp/howtouse
- 海しるAPI 利用規約: https://portal.msil.go.jp/agreement
- 海洋状況表示システム利用規約PDF: https://www.msil.go.jp/data/terms-of-use-ja.pdf
- NOAA NCEI Bathymetric Data Viewer: https://www.ncei.noaa.gov/maps/bathymetry/
- JODC J-EGG500: https://www.jodc.go.jp/jodcweb/JDOSS/infoJEGG.html
- AIST/GSJ Database: https://unit.aist.go.jp/igg/en/database/index.html
- 国土地理院 地理院タイル一覧: https://maps.gsi.go.jp/development/ichiran.html
