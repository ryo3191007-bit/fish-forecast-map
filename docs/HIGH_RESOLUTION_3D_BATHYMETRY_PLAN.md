# 高精細3D海底地形ビュー実現方針

確認日: 2026-07-16
対象Issue: #133 / #151
正本: 本ドキュメントは、参考動画に近い3D海底地形ビューを実装する前の技術方針・データ構成・制約判断の正本です。

## 1. 目標と非目標

### 目標

- 海底の山、谷、尾根、瀬、かけ上がり、落ち込みを、地図の回転・傾斜・ズーム・高さ誇張で直感的に把握できる3Dビューへ段階的に近づける。
- 広域データ、沿岸高精細データ、1海域PoCデータを分けて、合法的に加工・Web配信できる候補だけを採用判断に進める。
- 元データの格子解像度、測深由来、実測精度、レンダリング上の見た目を混同しない説明をUI・ドキュメントへ維持する。
- PCとスマホで成立するLOD、fallback、低性能端末向け2D表示を前提にする。

### 非目標

- 本Issueでは本番3D描画コード、高精細データ投入、巨大ファイルcommit、DB/Supabase migration、SCORE変更、地点・魚種・釣果情報収集を行わない。
- スクレイピング、自動巡回、ログイン回避、有料データ購入、第三者サイト本文転載は行わない。
- Phase Dの魚種・季節・回遊・ホットスポットは将来候補として分離し、今回仕様を作り込まない。

## 2. 参考動画から抽出したUX要件

| 優先度 | 要件 | 方針 |
| --- | --- | --- |
| Must | タッチ/マウスで回転・傾斜・ズーム | MapLibre NavigationControlと標準ジェスチャーを維持し、3Dモードでは初期pitch/bearingを設定する。 |
| Must | 高さ誇張スライダー、現在値、リセット | Phase Aで`exaggeration`をUI state化する。現在値を凡例近くに表示し、1.0へ戻すボタンを置く。 |
| Must | 水深色、陰影、等深線 | 色別PNG、hillshade、等深線GeoJSONを重ねる現行構成を維持し、色・opacity・陰影を再調整する。 |
| Must | 海岸線・陸地・海底の分離 | Post-MVP-050以降はGEBCO由来の緑の海岸線ライン・完全不透明の陸地マスクを本番表示せず、陸地pixelはcolor tileで透明のまま扱う。必要な海岸線明瞭化は将来IssueでGSI等の利用条件を確認して検討する。 |
| Must | 参考水深・座標 | Phase Aでクリック/タップ地点の緯度経度と最近傍DEM参考水深を表示する。安全注記を併記する。 |
| Should | 海面表示ON/OFFまたは半透明表現 | Phase Aでは見た目検討、Phase B以降で海面平面や0m透明レイヤーの必要性を評価する。 |
| Should | 等深線ON/OFF、間隔表示 | Phase AでON/OFFを追加し、間隔は元データと表示zoomに応じて固定/段階化を検討する。 |
| Should | PC/スマホ差分 | スマホは初期2D、ユーザー明示ON時のみ3D、誇張上限・最大zoom・同時レイヤー数を抑える。 |
| Should | 低性能端末fallback | WebGL不可、低`deviceMemory`、`prefers-reduced-motion`、tile失敗時は2Dまたは通常地図へ戻す。 |
| Could | 魚種・季節・適性レイヤー | Phase D候補。地点情報収集再開後の別Issueで扱う。 |

## 3. 現行実装と不足点

### 現行実装の事実

- 第一sourceは`GEBCO_2026 Grid 15 arc-second`、fallbackは`NOAA NCEI ETOPO 2022 60 Arc-Second Bedrock`で、対象boundsは`128.5,32.5,130.8,34.0`、GEBCO cropは`552 x 360`である。
- Terrain-RGB PNG、色別水深PNG、等深線GeoJSON、metadata、checksum、TID軽量JSON、海岸線GeoJSONは`npm run generate:bathymetry`で静的生成する。
- MapLibreでは`raster-dem`、`hillshade`、`raster`色レイヤー、等深線/ラベル、`setTerrain`を使う。GEBCO表示失敗時はETOPO、ETOPO失敗時は通常地図へ戻る。
- 現在の3D高さ誇張はUI state化済みで、既定`1.0×`、範囲`1.0×〜4.0×`、`0.25×`刻み、リセット可能である。3D ON時の標準カメラは`pitch: 52`、`bearing: -18`、初期地図は`center: [129.95, 33.48]`、`zoom: 8.2`である。
- 端末判定は、WebGL可、幅720px以上、reduced motionなし、`deviceMemory`が未定義または4GB以上の場合だけ `auto-3d` として初期3D ONにする。WebGL可でも幅720px未満、`deviceMemory < 4`、reduced motionは `manual-3d` として2D初期表示にし、ユーザーの明示操作で3D ON可能にする。WebGL不可は `unsupported / no-webgl` として3D関連controlsを無効化する。
- Post-MVP-050以降、海岸線補助の緑ライン・完全不透明陸地マスク・海岸線表示ボタンは削除済みである。半透明海面表現は表示上の演出として維持し、実潮位・実海面高度は示さない。
- runtime/build時に外部GEBCO/NOAA/GSIへ取得せず、Vercel/Next.jsでは自サイト内の静的assetを配信する。

### 粗く見える原因の分解

| 原因分類 | 現状 | 改善可能性 |
| --- | --- | --- |
| 元データ解像度 | GEBCO 15秒は緯度33度付近で概ね数百m級、ETOPO 60秒fallbackはさらに粗い。港内、小さな根、細い瀬は元データにない可能性が高い。 | 高さ誇張では解決不可。Phase Bで数十m〜数m級データPoCが必要。 |
| レンダリング | Terrain-RGBはZL7〜9、tileSize 256、MapLibre terrain。表示zoomに対してサンプル不足だと滑らかだが詳細は増えない。 | Phase Aでmaxzoom、overscale、カメラ、opacityを調整。 |
| 配色 | 浅場7段階palette、半透明海面表現、等深線ON/OFFを維持する。等深線は表示zoom別に主要levelから浅場levelへ段階追加し、compact端末ではlabel密度を抑える。 | Post-MVP-053で表示filterと水深パネル案内を追加。元のcontour生成levelは増やさない。 |
| 陰影 | hillshadeはGEBCO/ETOPO別profileで誇張・shadow/highlight/accent・光源方向/anchorを管理し、浅場7段階paletteと等深線labelを潰さない控えめな値にする。 | Post-MVP-053でprofile化済み。元DEMや参考水深decodeは変更しない。 |
| カメラ | 3D ON時の標準obliqueに加え、高さ誇張、リセット、視点プリセットはPhase A相当として実装済み。 | Post-MVP-052では3D適用失敗時にcamera変更なし・source切替なしで2Dへrollbackする。 |
| 端末制限 | スマホ幅、低memory、reduced motion、WebGL不可では初期2D。 | 正しいfallback。スマホ3Dは明示ONと軽量LODが必要。 |

## 4. データ解像度と表示精度の関係

- 高さ誇張、補間、平滑化、陰影は視認性を改善するが、元データに存在しない根・瀬・港内形状を生成しない。
- 数百m級データでは、海盆、海溝、大規模斜面、大きな尾根の把握が中心になる。
- 数十m級データでは、沿岸の大きな瀬、かけ上がり、谷筋を見つけられる可能性がある。ただし測深密度と補間方法に依存する。
- 数m級データでは、小規模な根、港内形状、細かな起伏の表示可能性が高まるが、対象海域・再配布条件・容量・スマホ性能が制約になる。
- 実測値、格子化されたDEM、Terrain-RGBタイル、画面上の補間済み見た目は別物である。UIでは「参考水深」「航海・安全判断不可」を維持する。

## 5. 公式データ候補比較表

確認日はすべて2026-07-13。`確認済み`は公式/一次提供元で確認、`推定`は仕様からの推定、`unknown`は公式資料だけでは断定不可を示す。確認できない値は推測せず`unknown`とする。

| 分類 | 提供機関 | データ名・版 / 公式URL | 対象海域 | 水平解像度 | 垂直精度または公式精度説明 | 測深由来 | データ形式 | 更新日/更新頻度 | ダウンロード単位 | 想定容量 | 無料利用可否 | 加工可否 | Web配信・再配布可否 | 出典要件 | 採用可否 | 確認状態/根拠 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 広域base | GEBCO Compilation Group | GEBCO_2026 Grid / https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid | 全球、現在対象boundsをcrop済み | 15 arc-second | 公式の格子精度説明はデータ由来に依存。TID Gridで測深・推定由来を確認可能 | 測深・推定海底地形の混在。TID Gridあり | NetCDF、GeoTIFF、ASCII等 | 2026版。年次更新傾向 | 全球ファイルまたは範囲抽出 | 全球は巨大。対象cropは軽量化可 | 確認済み | 確認済み | 確認済み。ただし航海不可注記が必要 | `Contains information from the GEBCO_2026 Grid, GEBCO Compilation Group (2026).` | 採用済み。広域baseとして継続 | 確認済み: GEBCO Grid公式ページ、BODC Terms |
| 広域fallback/比較 | NOAA NCEI | ETOPO 2022 Global Relief Model / https://www.ncei.noaa.gov/products/etopo-global-relief-model | 全球 | 15 arc-second版あり。現行fallbackは60 arc-second Bedrock crop | 公式精度は入力データセットに依存 | 航空LiDAR、衛星地形、船舶測深等を統合 | GeoTIFF、NetCDF等 | 2022版。更新頻度はunknown | 全球ファイルまたは範囲抽出 | 全球は大。対象cropは軽量化可 | 確認済み | 確認済み（CC0-1.0相当として扱える） | 確認済み（CC0-1.0相当として扱える） | NOAA NCEI ETOPO 2022 DOIとアクセス日 | fallback採用済み。15秒化は別Issue候補 | 確認済み: NOAA ETOPO公式ページ、NOAAメタデータ |
| 日本周辺の比較・参考候補 | JODC | J-EGG500 / https://www.jodc.go.jp/jodcweb/JDOSS/infoJEGG.html | 日本周辺。Territory 2は北緯30〜38度、東経128〜144度を含む | 500m square grid。緯度経度格子ではなくLambert Conformal Conicの500m格子 | 公式ページは、平滑化により小さな起伏を描けないこと、沿岸・海山付近等で実測水深との差が大きい場所があることを説明 | 海上保安庁海洋情報部や各海洋調査機関の測深データを統合。分類0は実測水深/等深線、分類1は補間 | テキスト: Classification、Latitude、Longitude、Depth | 更新日/更新頻度はunknown | Territory 1〜3 | unknown | unknown | 書面許可が必要または要問い合わせ | 書面許可が必要または要問い合わせ。公式ページ末尾の `No reproduction or republication without written permission.` に基づく | JODC。詳細は許可条件に従う | 現行GEBCO 15秒を明確に高精細化するPhase B本命候補から外す。日本周辺の比較・参考候補 | 確認済み: JODC J-EGG500公式ページ |
| 沿岸/参照 | 海上保安庁 | 海しる/API / https://portal.msil.go.jp/agreement / https://www.msil.go.jp/data/terms-of-use-ja.pdf | 日本周辺の海洋情報 | コンテンツ依存。水深DEMとしてはunknown | unknown | API提供の地理空間情報。DEM取得可否はunknown | API/地図コンテンツ。DEM形式はunknown | unknown | APIリクエスト/コンテンツ単位 | unknown | 確認済み（規約上の無償） | コンテンツ単位でunknown | APIコンテンツ単位の再配信可否はunknown | 海しる/海上保安庁、個別コンテンツ出典 | 直接DEM正本としては保留。参照・公式情報確認用 | 確認済み/unknown混在: 海しる規約 |
| 陸地/海岸線補助 | 国土地理院 | 標準地図タイル / https://maps.gsi.go.jp/development/ichiran.html | 日本 | 地形図タイル。海底DEMではない | 海底水深精度は対象外 | 地形図/海岸線表現。測深DEMではない | XYZタイル | unknown | タイル単位 | runtime通信量のみ | 確認済み | リアルタイム表示は可。独立ベクトル化は測量法確認が必要 | タイル複製・独立ベクトル化は別途確認 | 国土地理院/地理院タイル、リンク | 海底データでは不採用。現行は外部GSI overlayを使用せず、GEBCO由来の海岸線ライン＋陸地マスクを使用 | 確認済み/unknown混在: GSIタイル一覧・利用規約 |
| 検索入口 | NOAA NCEI | Bathymetric Data Viewer / https://www.ncei.noaa.gov/maps/bathymetry/ | 全球の公開測深データ検索 | データセットごとに異なる | データセットごとに異なる | マルチビーム等の航跡データ検索入口 | データセットごとに異なる | データセットごとに異なる | データセットごとに異なる | データセットごとに異なる | データセットごとにunknown | データセットごとにunknown | データセットごとにunknown | データセット単位の引用 | 今回は具体的PoCデータセット未確定。直ちにPoCへ使える候補として扱わない | unknown: 個別データセット未特定 |
| 将来の地質レイヤー参考 | AIST/GSJ | 沿岸域のシームレス地質情報 / https://unit.aist.go.jp/igg/en/database/index.html / https://www.gsj.jp/Map/EN/marine-geology.html / https://gbank.gsj.jp/geonavi/?lang=en / https://www.gsj.jp/Map/EN/seamless-geomap.html | 日本の一部沿岸域 | 水深DEMとしてはunknown | 水深DEMとしてはunknown | 地質情報が主。水深DEMとして未確認 | WMS/WMTSやアーカイブの可能性。水深DEM形式はunknown | unknown | unknown | unknown | unknown | unknown | unknown | AIST/GSJ個別条件 | 水深DEM候補から外す。将来の地質レイヤー参考 | unknown: 水深DEMとして未特定 |
| 参考/有料可能性 | 日本水路協会等 | M7000 Digital Bathymetric Chart等 | 日本近海 | 研究例では2秒等の高精細海底地形に使われることがある | unknown | unknown | 商品/許諾型の可能性 | unknown | 購入/許諾単位 | unknown | unknown。有料可能性あり | 許諾条件次第 | 許諾条件次第 | 購入/許諾条件に従う | 今回対象外。有料データ購入禁止のため不採用 | 推定/unknown: 公式購入条件未確認 |

### 5.1 Phase B PoCデータセット確定状況

Issue #151 / Post-MVP-054で、公式一次提供元だけを根拠に高精細1海域PoC候補を再調査した。調査正本は `docs/HIGH_RESOLUTION_BATHYMETRY_POC_DATASET_RESEARCH.md` とする。

結論は **No-Go**。2026-07-16時点では、合法的に加工・Web配信でき、GEBCO_2026 15秒より有意に細かい比較が期待できる具体的な `1データセット + 1海域` を採用確定できない。最有力の海しるAPI `等深線` は要問い合わせであり、元グリッドproduct ID、bounds、native grid spacing、鉛直基準、nodata、取得容量、Terrain-RGB/PNG/GeoJSON派生物生成可否、GitHub/Vercel PreviewでのWeb配信・再配布可否が未確認である。

そのため案Bは、現時点では推奨アーキテクチャ候補までとする。Phase Bを開始する条件は、`具体的データセット、bounds、解像度、容量、加工・配信許可の公式確認` とする。

## 6. ライセンス・再配布判断

- 採用可: GEBCO_2026、現行ETOPO fallback。出典、Terms、航海不可注記を維持する。
- 条件付き: GSI標準地図タイルは海底DEMではなく、リアルタイムタイル参照と出典明示に限定する。独立した海岸線ベクトル化や再配布は別途確認する。
- 保留: 海しる水深関連コンテンツ、NOAA個別マルチビームは、対象海域・形式・加工・Web再配信可否をデータセット単位で確認するまで本番採用不可。J-EGG500は500m格子で現行GEBCO 15秒を明確に高精細化する候補ではなく、加工・複製・Web配信には書面許可が必要または要問い合わせのため、Phase B本命候補から外す。AIST/GSJ沿岸域のシームレス地質情報は水深DEM候補から外し、将来の地質レイヤー参考に分離する。
- 不採用: 有料データ、ライセンス不明データ、第三者サービス画面からの抽出、スクレイピング由来データ。

## 7. 技術方式比較

| 案 | 見た目/精度 | 実装難易度 | スマホ性能/通信 | Vercel/更新/fallback | 保守/費用 | 判断 |
| --- | --- | --- | --- | --- | --- | --- |
| A. 現行Terrain-RGB高品質化 | 見た目は大きく改善できるが、GEBCO 15秒以上の地形情報は増えない。 | 低。既存MapLibre構成を維持。 | 軽量。現行静的タイル中心。 | 現行生成・fallbackを流用。 | 低コスト、保守容易。 | Phase A推奨。短期でUX改善。 |
| B. 広域+沿岸高精細の多段階Terrain-RGB | 合法的に加工・Web配信できる高精細データが確定した海域では瀬・かけ上がりの粒度が上がる。 | 中。source切替、bounds、LOD、段差対策が必要。 | 高精細tileは拡大時のみ読む。スマホ上限が必要。 | Vercel静的配信可能な小範囲から開始。広域fallback維持。 | データ更新・ライセンス管理が増えるが現実的。 | 条件付き中長期推奨。現時点では推奨アーキテクチャ候補であり、Phase B開始には具体的データセット、bounds、解像度、容量、加工・配信許可の確認が必要。 |
| C. PMTiles/高密度メッシュ/別レンダラー | 見た目は最も自由。点群/meshなら動画風表現に近い。 | 高。座標同期、クリック判定、LOD、アクセシビリティ、既存marker連携が重い。 | 通信・GPU負荷が大。スマホfallback必須。 | Vercelで大容量配信・キャッシュ設計が難化。 | 依存・保守コスト増。 | 当面不採用。Bで不足が明確な場合の研究候補。 |

Phase AはPost-MVP-046〜053で完了扱いとする。Phase B/Cの案Bは、Issue #151でNo-Goとなった未確認事項が解消され、採用ゲートをすべて満たす公式データセットが確定した場合だけ進める。案Cは参考動画に近い自由な表現には有利だが、現時点の個人利用・低コスト・スマホ対応・既存MapLibre資産を優先すると過剰である。

## 8. 推奨アーキテクチャ

1. 広域base: GEBCO_2026 15秒Terrain-RGB + 色PNG + hillshade + contours。
2. fallback: ETOPO 2022を同一UIに接続。Phase Aで15秒fallback化の可否を検討し、60秒fallbackは最低限維持。
3. 沿岸高精細overlay: Phase Bでは、具体的データセット、bounds、解像度、容量、加工・配信許可を確認できた場合に限り、1海域だけ高精細DEMをTerrain-RGBタイル化し、bounds/zoomでGEBCOから切替。データなし/失敗時はGEBCOへ戻す。
4. LOD: ZL低〜中は広域、沿岸拡大時だけ高精細source。画面外・全域高精細は読み込まない。
5. 表示: 色、hillshade、等深線、半透明海面表現、安全注記、参考水深/座標を同じMapLibre map上に維持する。Post-MVP-050以降の方針に合わせ、緑の海岸線ライン・完全不透明陸地マスクは復活させない。

## 9. PC/スマホ性能方針

- PC: 初期3D可。高さ誇張上限はPhase Aで試験し、過度な誤認を避けるため既定1.0、候補上限3〜5程度から検証する。
- スマホ: 初期2D。ユーザーが明示ONした場合だけ3D。高精細source、等深線、hillshadeの同時表示は端末性能に応じて抑制する。
- fallback条件: WebGL不可、`deviceMemory < 4`、幅720px未満、`prefers-reduced-motion`、tile/metadata/decode失敗、操作不能なFPS低下。ただし3D適用失敗は2D terrain rollbackに限定し、それだけを理由にGEBCO→ETOPO source fallbackは発火させない。
- PoC合格基準案: 初期表示で高精細全域を読まない、スマホで巨大GeoJSONを読まない、同一tileを毎回再取得しない、source失敗時も広域水深または通常地図を維持する。FPSやLCP等の数値はPhase Bで実測して確定する。

## 10. fallback・安全注記

- GEBCO失敗時はETOPO、ETOPO失敗時は通常地図へ戻す現行方針を維持する。
- 高精細source失敗時はGEBCOへ戻し、表示上は「高精細水深を読み込めなかったため広域水深で表示」とする。
- 水深は参考表示であり、航海、立入可否、避難、安全判断に使用不可。港内、岩礁、根、瀬の正確な位置は保証しない。
- 高さ誇張・補間・平滑化は視認性改善であり、精度向上ではないことを凡例またはヘルプに明記する。

## 11. 段階的ロードマップ

### Phase A: 現行データで3D視認性改善（完了）

Post-MVP-046〜053で完了扱いとする。高さ誇張スライダー、現在値、1.0リセット、カメラプリセット、浅場7段階palette、hillshade profile、等深線ON/OFF、zoom別等深線filter、compact端末のlabel抑制、タップ地点の参考水深・緯度経度、PC/スマホの2D fallback案内を実装済みである。

### Phase B: 1海域限定の高精細データPoC（開始保留 / No-Go）

- Issue #151の調査では具体的な高精細1海域PoCデータセットを確定できていないため、開始前に `具体的データセット、bounds、解像度、容量、加工・配信許可の公式確認` を必須条件とする。
- 海しるAPIは一般仕様としてJSON/GeoJSON取得、1回最大1,000レコード、1応答最大64MB、`resultOffset` pagingを確認済みだが、`等深線` 固有のendpoint/layer ID、属性schema、coverage、等深線間隔/元グリッドspacing、鉛直基準、nodata、対象bounds総容量、派生Terrain-RGB/PNG/GeoJSON生成・GitHub/Vercel Preview公開可否が未確認である。
- NOAA NCEI Bathymetric Data ViewerとAIST/GSJ公式DBは候補5海域・代表boundsで確認したが、採用可能な個別survey/product ID、bounds、解像度、形式、容量、利用条件を揃えて確定できなかった。
- 海しるAPI `等深線` は平戸瀬戸周辺の暫定問い合わせ候補に留め、採用データセットとはしない。
- ライセンス確認済みデータだけを小範囲で加工。
- GEBCOとの切替、見た目、容量、速度、スマホ可否を比較。
- 本番DB、全国展開、定期取得は行わない。

### Phase C: 多解像度3Dの本番化

- 対応海域metadata、source選択、fallback、キャッシュ、tile生成手順を整備。
- Vercel配信容量とGit管理範囲を制限。
- スマホ向けLODと低性能端末fallbackを確定。

### Phase D: 将来付加レイヤー

- 魚種、季節、回遊・適性、ホットスポットは地点情報収集再開後の別Issueで扱う。今回仕様を作り込まない。

## 12. 未確認事項

- J-EGG500は公式ページ上の500m格子、平滑化による小起伏不可視、実測値との差が大きい場所、書面許可なしの複製・再掲載禁止を踏まえ、Phase B本命候補から外した。公開・再配布・Web掲載には書面許可が必要であり、派生物生成や内部加工の可否は許可条件確認まで未確定とする。
- 海しるAPI `等深線` について、endpoint/layer ID/product ID、属性schema、元グリッドproduct ID、平戸瀬戸周辺暫定boundsでのcoverage、native grid spacingまたは等深線間隔、鉛直基準、nodata、対象bounds総レコード数・取得容量、派生Terrain-RGB/PNG/GeoJSON生成可否、GitHub/Vercel PreviewでのWeb配信・再配布可否。
- 対象海域にNOAA NCEI Bathymetric Data Viewer等でPoCに足るマルチビーム等の公開測深が存在し、具体的データセット、bounds、解像度、容量、加工・配信許可まで確認できるか。2026-07-16の候補5海域代表bounds確認では採用可能な個別survey IDを確定できていない。
- 高精細sourceのVercel配信容量、tile数、スマホFPS、メモリ使用量の実測値。
- GSI等を使った海岸線補助を独立ベクトル化する場合の測量法上の申請要否。

## 13. 後続Issue案

1. Phase A: 現行GEBCO/ETOPOで高さ誇張UI・水深/座標表示・カメラプリセットを追加する。
2. Phase A: 水深色・hillshade・等深線・海面表現の視認性比較を行い、PC/スマホの推奨初期値を決める（Post-MVP-053でzoom別等深線filter、compact label抑制、GEBCO/ETOPO hillshade profileを実装）。
3. Phase B: 海しるAPI `等深線` またはNOAA個別surveyについて、具体的データセット、bounds、解像度、容量、加工・配信許可を公式一次提供元で確認し、合法的に加工・Web配信できる場合だけ小範囲Terrain-RGB生成手順を作る。
4. Phase B: 高精細PoCタイルをローカル/Previewで比較し、容量・速度・見た目・fallbackの合格基準を検証する。
5. Phase C: 多解像度source選択、metadata管理、Vercel配信・cache方針を本番化する。
6. Phase D: 魚種・季節・適性レイヤーの情報源ポリシーを地点情報収集再開後に別途設計する。

## 14. 主要根拠URL

- GEBCO_2026 Grid: https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid
- GEBCO gridded bathymetry terms: https://www.bodc.ac.uk/data/documents/nodb/289621/
- NOAA NCEI ETOPO Global Relief Model: https://www.ncei.noaa.gov/products/etopo-global-relief-model
- NOAA NCEI ETOPO metadata: https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.dem%3Aetopo_2022
- JODC J-EGG500: https://www.jodc.go.jp/jodcweb/JDOSS/infoJEGG.html
- 海しるAPI利用規約: https://portal.msil.go.jp/agreement
- 海しる利用規約PDF: https://www.msil.go.jp/data/terms-of-use-ja.pdf
- 国土地理院タイル一覧: https://maps.gsi.go.jp/development/ichiran.html
- 国土地理院コンテンツ利用規約: https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html
- NOAA Bathymetric Data Viewer: https://www.ncei.noaa.gov/maps/bathymetry/
- AIST/GSJ Database: https://unit.aist.go.jp/igg/en/database/index.html
- AIST/GSJ Marine Geology Map Series: https://www.gsj.jp/Map/EN/marine-geology.html
- AIST/GSJ Geological Map Navi: https://gbank.gsj.jp/geonavi/?lang=en
- AIST/GSJ Seamless Digital Geological Map of Japan (WMS/WMTS): https://gbank.gsj.jp/owscontents/contents/seamless200k_en.html
- AIST/GSJ Seamless Geological Map of Coastal Zone: https://www.gsj.jp/Map/EN/seamless-geomap.html

- 高精細1海域PoCデータセット調査: docs/HIGH_RESOLUTION_BATHYMETRY_POC_DATASET_RESEARCH.md

## 15. Post-MVP-055: 海しるAPI `等深線` 問い合わせ状況

2026-07-16時点で、海しるAPI開発者ポータルの利用方法ページから、公式問い合わせ窓口として「海上保安庁海洋情報部問い合わせフォーム」を確認した。送信前の問い合わせ文面、送信先、送信手順、未送信であること、未回答であることは `docs/HIGH_RESOLUTION_BATHYMETRY_POC_DATASET_RESEARCH.md` のPost-MVP-055記録を正本とする。

Phase Bは、公式回答または公式文書により次の全条件を満たすまで開始しない。

- 海しるAPI `等深線` のendpoint、layer ID、product ID等を一意に特定できる。
- 平戸瀬戸周辺の暫定boundsまたは公式に指定されたPoC boundsでcoverage、取得手順、総レコード数、総容量、paging回数を確認できる。
- 元グリッドまたは等深線間隔、水平座標系、鉛直基準、単位、nodataを確認できる。
- GEBCO_2026 15秒より有意に細かい地形比較が期待できる根拠を確認できる。
- 元データ加工、Terrain-RGB変換、PNGタイル生成、GeoJSON等深線生成・加工が許可される。
- GitHub repositoryへの派生物格納、Vercel Previewまたは公開Webアプリでの配信、再配布が明示的に許可される。
- attribution、加工表示、非保証表示、商用／非商用条件、第三者権利、書面許可要否を実装・運用可能な形で確認できる。

1項目でも未確認の場合は、Phase Bを `回答待ち`、`要追加問い合わせ`、または `No-Go継続` とし、高精細データ取得、Terrain-RGB/PNG/GeoJSON生成、Vercel配置は行わない。
