# 高精細3D海底地形ビュー実現方針

確認日: 2026-07-13  
対象Issue: #133  
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
| Must | 海岸線・陸地・海底の分離 | GEBCO 0m境界由来の海岸線ラインと陸地マスクを維持し、海底色が陸地に見える問題を抑える。 |
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
- 現在の3D高さ誇張は`exaggeration: 1`固定、3D ON時のカメラは`pitch: 52`、`bearing: -18`、初期地図は`center: [129.95, 33.48]`、`zoom: 8.2`である。
- 端末判定は、WebGL可、幅720px以上、reduced motionなし、`deviceMemory`が未定義または4GB以上の場合だけ初期3D ONとする。
- 海岸線補助はGEBCO 15秒DEMの非負標高セルから作る完全不透明の陸地マスクと、0m境界から作る海岸線ラインである。
- runtime/build時に外部GEBCO/NOAA/GSIへ取得せず、Vercel/Next.jsでは自サイト内の静的assetを配信する。

### 粗く見える原因の分解

| 原因分類 | 現状 | 改善可能性 |
| --- | --- | --- |
| 元データ解像度 | GEBCO 15秒は緯度33度付近で概ね数百m級、ETOPO 60秒fallbackはさらに粗い。港内、小さな根、細い瀬は元データにない可能性が高い。 | 高さ誇張では解決不可。Phase Bで数十m〜数m級データPoCが必要。 |
| レンダリング | Terrain-RGBはZL7〜9、tileSize 256、MapLibre terrain。表示zoomに対してサンプル不足だと滑らかだが詳細は増えない。 | Phase Aでmaxzoom、overscale、カメラ、opacityを調整。 |
| 配色 | 水深色の段階が広域向けで、浅場の微地形が潰れる場合がある。 | 浅場強調パレット、等深線ON/OFF、海面表現で改善可能。 |
| 陰影 | hillshade誇張はGEBCO 0.28、fallback 0.24で控えめ。光源方向は固定。 | Phase Aでhillshade強度・色・opacityを比較。 |
| カメラ | 3D ON時はpitch/bearing固定で、誇張・カメラプリセットがない。 | Phase Aで高さ誇張、リセット、視点プリセットを追加。 |
| 端末制限 | スマホ幅、低memory、reduced motion、WebGL不可では初期2D。 | 正しいfallback。スマホ3Dは明示ONと軽量LODが必要。 |

## 4. データ解像度と表示精度の関係

- 高さ誇張、補間、平滑化、陰影は視認性を改善するが、元データに存在しない根・瀬・港内形状を生成しない。
- 数百m級データでは、海盆、海溝、大規模斜面、大きな尾根の把握が中心になる。
- 数十m級データでは、沿岸の大きな瀬、かけ上がり、谷筋を見つけられる可能性がある。ただし測深密度と補間方法に依存する。
- 数m級データでは、小規模な根、港内形状、細かな起伏の表示可能性が高まるが、対象海域・再配布条件・容量・スマホ性能が制約になる。
- 実測値、格子化されたDEM、Terrain-RGBタイル、画面上の補間済み見た目は別物である。UIでは「参考水深」「航海・安全判断不可」を維持する。

## 5. 公式データ候補比較表

確認日はすべて2026-07-13。`確認済み`は公式/一次提供元で確認、`推定`は仕様からの推定、`unknown`は公式資料だけでは断定不可を示す。

| 層 | 提供機関 | データ名・版 / 公式URL | 対象海域 | 水平解像度・精度/測深由来 | 形式・容量・更新 | 無料/加工/Web配信 | 出典要件 | 採用可否 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 広域 | GEBCO Compilation Group | GEBCO_2026 Grid / https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid | 全球、現在対象boundsをcrop済み | 15 arc-second。公式は43200 x 86400、pixel-centre registered、TID Gridあり。測深・推定海底地形の混在はTIDで説明。 | NetCDF/GeoTIFF/ASCII等。全球は巨大、対象cropは軽量化可。年次更新傾向。 | Terms of Use上、無料利用・複製・配布は可能と確認済み。ただし航海不可。 | `Contains information from the GEBCO_2026 Grid, GEBCO Compilation Group (2026).` | 採用済み。広域ベースとして継続可。 |
| 広域fallback | NOAA NCEI | ETOPO 2022 15 Arc-Second Global Relief Model / https://www.ncei.noaa.gov/products/etopo-global-relief-model | 全球 | 15 arc-second。航空LiDAR、衛星地形、船舶測深等を統合。現行fallbackは60秒Bedrock crop。 | GeoTIFF/NetCDF等。NOAA DOIあり。 | NOAA/NCEIメタデータではCC0-1.0相当として扱える。現行60秒fallbackは継続可、15秒fallback化は別Issue。 | NOAA NCEI ETOPO 2022 DOIとアクセス日。 | fallback採用済み。15秒化はPhase A/B候補。 |
| 沿岸高精細候補 | JODC | J-EGG500 / https://www.jodc.go.jp/jodcweb/JDOSS/infoJEGG.html | 日本周辺 | 500m格子。海上保安庁海洋情報部や各海洋調査機関の測深データを統合。 | JODC配布。形式・更新・容量は対象単位で追加確認。 | 無料性は公開ページから確認できるが、加工・Web再配信条件はunknown。 | unknown。 | 現時点では本番採用不可。再配布・Web配信許可確認後にPoC候補。 |
| 沿岸/参照 | 海上保安庁 | 海しる/API / https://portal.msil.go.jp/agreement / https://www.msil.go.jp/data/terms-of-use-ja.pdf | 日本周辺の海洋情報 | API提供の地理空間情報。水深レイヤーの詳細仕様・生DEM取得可否はunknown。 | APIは登録・キー管理が必要。リアルタイム参照型。 | 利用規約は公共データ利用規約/CC BY互換、無償、航海図誌代替不可を確認済み。ただしAPIコンテンツ単位の再配信可否は要確認。 | 海しる/海上保安庁、個別コンテンツ出典。 | 直接DEM正本としては保留。参照・公式情報確認用。 |
| 陸地/海岸線補助 | 国土地理院 | 標準地図タイル / https://maps.gsi.go.jp/development/ichiran.html | 日本 | 地形図タイル。海底DEMではない。海岸線・陸地視認性補助。 | XYZタイル。リアルタイム読込可。 | 出典明示でリアルタイム利用は申請不要と確認済み。独立ベクトル化や基盤地図情報加工は測量法確認が必要。 | 国土地理院/地理院タイル、リンク。 | 海底データでは不採用。海岸線補助は条件付き候補。 |
| 1海域PoC候補 | NOAA NCEI | Bathymetric Data Viewer / https://www.ncei.noaa.gov/maps/bathymetry/ | 全球の公開測深データ検索 | マルチビーム等の航跡データ。対象海域にデータがあるか、品質・密度は海域ごとに異なる。 | 生測深/航跡データ。容量は大きくなり得る。 | NOAA公開データは無料候補だが、日本沿岸対象データの有無、処理後DEMの配信条件は個別確認。 | データセット単位の引用。 | 1海域PoC候補。対象海域に有効データがある場合のみ。 |
| 1海域PoC候補 | AIST/GSJ | 沿岸域のシームレス地質情報 / https://unit.aist.go.jp/igg/en/database/index.html | 日本の一部沿岸域 | 地質情報が主で、水深DEMとしての水平解像度・形式・再配信条件はunknown。 | WMS/WMTSやアーカイブ。 | 海底地形DEMとしての加工・Web配信可否はunknown。 | AIST/GSJ個別条件。 | 水深DEMとしては保留。地質レイヤー将来候補。 |
| 参考/有料可能性 | 日本水路協会等 | M7000 Digital Bathymetric Chart等 | 日本近海 | 研究例では2秒等の高精細海底地形に使われることがある。 | 商品/許諾型の可能性。 | 有料または再配布制限の可能性が高く、公式購入条件確認が必要。 | 購入/許諾条件に従う。 | 今回対象外。有料データ購入禁止のため不採用。 |

## 6. ライセンス・再配布判断

- 採用可: GEBCO_2026、現行ETOPO fallback。出典、Terms、航海不可注記を維持する。
- 条件付き: GSI標準地図タイルは海底DEMではなく、リアルタイムタイル参照と出典明示に限定する。独立した海岸線ベクトル化や再配布は別途確認する。
- 保留: J-EGG500、海しる水深関連コンテンツ、AIST沿岸地質情報、NOAA個別マルチビームは、対象海域・形式・加工・Web再配信可否をデータセット単位で確認するまで本番採用不可。
- 不採用: 有料データ、ライセンス不明データ、第三者サービス画面からの抽出、スクレイピング由来データ。

## 7. 技術方式比較

| 案 | 見た目/精度 | 実装難易度 | スマホ性能/通信 | Vercel/更新/fallback | 保守/費用 | 判断 |
| --- | --- | --- | --- | --- | --- | --- |
| A. 現行Terrain-RGB高品質化 | 見た目は大きく改善できるが、GEBCO 15秒以上の地形情報は増えない。 | 低。既存MapLibre構成を維持。 | 軽量。現行静的タイル中心。 | 現行生成・fallbackを流用。 | 低コスト、保守容易。 | Phase A推奨。短期でUX改善。 |
| B. 広域+沿岸高精細の多段階Terrain-RGB | 高精細データがある海域では瀬・かけ上がりの粒度が上がる。 | 中。source切替、bounds、LOD、段差対策が必要。 | 高精細tileは拡大時のみ読む。スマホ上限が必要。 | Vercel静的配信可能な小範囲から開始。広域fallback維持。 | データ更新・ライセンス管理が増えるが現実的。 | 中長期推奨。Phase B/Cの本命。 |
| C. PMTiles/高密度メッシュ/別レンダラー | 見た目は最も自由。点群/meshなら動画風表現に近い。 | 高。座標同期、クリック判定、LOD、アクセシビリティ、既存marker連携が重い。 | 通信・GPU負荷が大。スマホfallback必須。 | Vercelで大容量配信・キャッシュ設計が難化。 | 依存・保守コスト増。 | 当面不採用。Bで不足が明確な場合の研究候補。 |

推奨は、Phase Aで案Aを実施し、Phase B/Cで案Bへ進むこと。案Cは参考動画に近い自由な表現には有利だが、現時点の個人利用・低コスト・スマホ対応・既存MapLibre資産を優先すると過剰である。

## 8. 推奨アーキテクチャ

1. 広域base: GEBCO_2026 15秒Terrain-RGB + 色PNG + hillshade + contours。
2. fallback: ETOPO 2022を同一UIに接続。Phase Aで15秒fallback化の可否を検討し、60秒fallbackは最低限維持。
3. 沿岸高精細overlay: Phase Bでは1海域だけ高精細DEMをTerrain-RGBタイル化し、bounds/zoomでGEBCOから切替。データなし/失敗時はGEBCOへ戻す。
4. LOD: ZL低〜中は広域、沿岸拡大時だけ高精細source。画面外・全域高精細は読み込まない。
5. 表示: 色、hillshade、等深線、海岸線/陸地マスク、安全注記、参考水深/座標を同じMapLibre map上に維持。

## 9. PC/スマホ性能方針

- PC: 初期3D可。高さ誇張上限はPhase Aで試験し、過度な誤認を避けるため既定1.0、候補上限3〜5程度から検証する。
- スマホ: 初期2D。ユーザーが明示ONした場合だけ3D。高精細source、等深線、hillshadeの同時表示は端末性能に応じて抑制する。
- fallback条件: WebGL不可、`deviceMemory < 4`、幅720px未満、`prefers-reduced-motion`、tile/metadata/decode失敗、操作不能なFPS低下。
- PoC合格基準案: 初期表示で高精細全域を読まない、スマホで巨大GeoJSONを読まない、同一tileを毎回再取得しない、source失敗時も広域水深または通常地図を維持する。FPSやLCP等の数値はPhase Bで実測して確定する。

## 10. fallback・安全注記

- GEBCO失敗時はETOPO、ETOPO失敗時は通常地図へ戻す現行方針を維持する。
- 高精細source失敗時はGEBCOへ戻し、表示上は「高精細水深を読み込めなかったため広域水深で表示」とする。
- 水深は参考表示であり、航海、立入可否、避難、安全判断に使用不可。港内、岩礁、根、瀬の正確な位置は保証しない。
- 高さ誇張・補間・平滑化は視認性改善であり、精度向上ではないことを凡例またはヘルプに明記する。

## 11. 段階的ロードマップ

### Phase A: 現行データで3D視認性改善

- 高さ誇張スライダー、現在値、1.0リセット。
- カメラプリセット、pitch/bearing/zoomの見直し。
- 浅場色、hillshade、等深線ON/OFF、海面表現の比較。
- タップ地点の参考水深・緯度経度。
- PC/スマホ操作と2D fallbackのUI改善。

### Phase B: 1海域限定の高精細データPoC

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

- J-EGG500の加工後Terrain-RGB/PNG/GeoJSONのWeb配信・再配布可否。
- 海しるAPIでDEM相当の水深格子を取得できるか、APIコンテンツ単位の再配信可否。
- 対象海域にNOAA NCEI Bathymetric Data ViewerでPoCに足るマルチビーム等の公開測深が存在するか。
- 高精細sourceのVercel配信容量、tile数、スマホFPS、メモリ使用量の実測値。
- GSI等を使った海岸線補助を独立ベクトル化する場合の測量法上の申請要否。

## 13. 後続Issue案

1. Phase A: 現行GEBCO/ETOPOで高さ誇張UI・水深/座標表示・カメラプリセットを追加する。
2. Phase A: 水深色・hillshade・等深線・海面表現の視認性比較を行い、PC/スマホの推奨初期値を決める。
3. Phase B: 1海域PoC候補データのライセンス確認と小範囲Terrain-RGB生成手順を作る。
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
