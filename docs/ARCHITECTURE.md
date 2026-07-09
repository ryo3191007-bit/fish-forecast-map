# アーキテクチャ

## 初期アーキテクチャ

MVP v0.1は、モックデータを利用するフロントエンド中心のWebアプリとして実装します。

推奨構成は以下です。

- フロントエンド: Next.js + TypeScript。
- スタイリング: Tailwind CSS またはシンプルな CSS Modules。
- 地図: MapLibre GL JS。
- データ: まずはローカルのモックデータ。
- CI: GitHub Actionsで install、lint、typecheck、buildを確認。

MapLibre GL JSを第一候補にする理由は、見た目の良い地図UIを作りやすく、将来的な水深レイヤーや3D海底地形表示との相性がよいためです。

## 段階的な構成

### Stage 1: モックデータMVP

- 静的/モックの釣果情報。
- MapLibre GL JSによる地図表示。
- 地図マーカー表示。
- 釣果情報一覧。
- 魚種フィルタ。
- 0〜100点のルールベース釣れそう度スコア。
- スコア根拠表示。
- データベースなし。
- 外部取り込みなし。

### Stage 2: 潮汐・天気・水温連携

- 利用条件を満たす無料の潮汐データ。
- 利用条件を満たす無料の天気、風、波データ。
- 利用条件を満たす無料の水温データ。
- 釣れそう度スコアへの反映検討。

### Stage 3: 3D海底地形表示

- 水深/海底地形レイヤー。
- 3D海底地形表示。
- MapLibre GL JSとの連携、またはThree.js、deck.gl、CesiumJSなどの採用検討。
- 描画性能の最適化。

### Stage 4: 釣果予測スコアの高度化

- 釣果実績、潮汐、天気、水温、季節性を使ったスコア改善。
- スコア理由の詳細化。
- 魚種別、場所別の重み付け。

### Stage 5: 釣果情報取り込み

- まるきん、釣具のポイントなどの情報源を候補として調査。
- 利用規約、robots.txt、著作権、アクセス負荷を確認。
- RSS、公式API、許可を得た情報源、ユーザー提供URL/本文からの抽出を優先。

### Stage 6: データ永続化

- Supabase/PostgreSQLを導入。
- 釣果情報、魚種、釣り場、出典、予測スコア用のテーブルを作成。
- 必要に応じて後から認証機能を追加。

## ドメインモデル案

### FishingReport

- id
- reportDate
- areaName
- spotName
- latitude
- longitude
- speciesId
- speciesName
- catchCount
- sizeCm
- method
- sourceName
- sourceUrl
- forecastScore
- forecastReasons
- notes

### FishSpecies

- id
- nameJa
- category
- seasonMonths

### FishingSpot

- id
- name
- areaName
- latitude
- longitude
- spotType

### ForecastScore

- speciesId
- spotId または areaName
- score
- reasons
- calculatedAt

## 初期魚種

MVP v0.1では以下を扱います。

- アジ
- サバ
- イワシ
- 青物
- シイラ
- ヒラメ
- マゴチ
- シーバス
- アオリイカ
- ヤリイカ
- コウイカ
- チヌ
- 真鯛
- キス
- 根魚

`青物` と `根魚` はカテゴリとして扱います。

## 釣れそう度スコア v1

最初の釣れそう度スコアは、説明可能なルールベースで実装します。

スコアは0〜100点で表示します。

スコア要素の例は以下です。

- 同じエリアの直近釣果。
- 同じ魚種の釣果。
- 月/季節との相性。
- モックデータ上の釣り場実績重み。
- 必要に応じた釣り方の一致。

アプリ上では、スコアだけでなく理由も表示します。

Post-MVP-001以降は、モック釣果レコードに手入力した固定スコアではなく、ローカルのモック釣果データから決定的に算出したスコアを使用します。実績ベースの高度な予測は後続フェーズで対応します。

## 将来のAPI/データ方針

承認済みのIssueがない限り、有料APIや自動取り込みは追加しません。

## Post-MVP-002: 環境データ連携の土台

Post-MVP-002では、表示中リストの先頭にある釣果地点を代表地点として、クライアントサイドからOpen-Meteo Weather Forecast APIとOpen-Meteo Marine Weather APIを取得します。

- 天気データは気温、天気コードの簡易ラベル、降水量、風速、風向、突風を扱います。
- 海況データは海面水温、`sea_level_height_msl`の潮位参考値、波高、海流速度、海流方向を扱います。
- フィルタ、検索、並び替えで表示中リストが変わると代表地点も変わります。
- 24件すべてに一括リクエストせず、代表地点単位で取得します。
- 同一座標の取得結果は画面表示中にキャッシュし、不要な再取得を抑えます。
- Open-Meteo取得処理は `src/services/openMeteo.ts`、環境データ型は `src/domain/environment.ts` に分離し、後続のスコア反映に備えます。

環境データは釣行前の参考情報であり、正式な満潮・干潮時刻表や航海用・安全判断用の情報としては扱いません。

## Post-MVP-002.5: 地図レイヤー基盤と釣り場マスター

Post-MVP-002.5では、MapLibre GL JSの地図にレイヤー切替の土台を追加します。現在の表示モードは `standard` と `aerial` です。

- `standard`: 既存のMapLibreデモタイルをベースマップとして表示します。
- `aerial`: 国土地理院の地理院タイル `modis`、`lndst`、`seamlessphoto` をMapLibreの `raster` source / `raster` layerとして重ね、ズーム帯ごとに低倍率の衛星モザイク画像、中倍率のランドサットモザイク画像、高倍率の全国最新写真（シームレス）を切り替えます。
- 航空写真レイヤーは `src/domain/mapLayer.ts` で表示モードと出典文言を定義し、`src/components/MapLayerToggle.tsx` と `src/components/FishingMap.tsx` から利用します。
- マーカー、ポップアップ、フィルタ、検索、並び替え、条件リセット、マップ自動移動、環境データパネルは、釣果データの緯度経度を引き続き参照するため、レイヤー切替とは分離します。
- 航空写真モードでは、`modis` をズーム2〜8、`lndst` をズーム8〜14、`seamlessphoto` をズーム14〜18で表示し、全件表示やエリア表示程度の低〜中倍率でも衛星/写真ベースに見えるようにします。
- 世界衛星モザイク画像と全国ランドサットモザイク画像は、国土地理院の地理院タイルとしての出典に加え、元データの追加出所明示が必要になる可能性があるため、公開前に最新の提供条件と出典記載方法を確認します。

釣り場地点は `src/domain/fishingSpot.ts` と `src/data/fishingSpots.ts` にマスター化します。`FishingSpot` は、ID、名称、エリア、代表座標、地点種別、足場情報、対象魚種、推奨釣法、座標精度を持ちます。公開時の釣り場保護や混雑防止に備え、危険な地磯や小場所は `approximate` または `rounded` の代表点として扱います。

既存の `FishingReport` は段階的移行として `spotId` を持ちます。当面は既存UIとスコア計算を壊さないため、`spotName`、`areaName`、`latitude`、`longitude` も釣り場マスターから補完した状態で保持します。将来的には、釣り場詳細ページ、ユーザー釣果登録、外部釣果情報取り込みで `spotId` を主キーとして参照する想定です。

### 将来のレイヤー構想

この段階では以下を本実装しませんが、レイヤー設計では追加できる余地を残します。

- 通常地図 / 航空写真 / 3D地形 / 海底地形 / 予測スコア表示を切り替える。
- `TimeSlot` / `ForecastTimeGrid` のような時間帯単位を導入し、時間帯変更時に各地点またはエリアのスコアを再計算する。
- 高スコアは赤〜オレンジ系、低スコアは青黒系で表示する。
- 表示方式候補は、マーカー色変更、GeoJSONグリッドの `fill` レイヤー、MapLibre `heatmap` レイヤーとする。
- 釣り場マスター、釣果、天気/海況、時間帯、スコア結果を分離し、将来的なDB化や外部データ取り込み時の責務を明確にする。

## Post-MVP-003: 将来の外部釣果情報収集ジョブ設計メモ

Post-MVP-003では、実際のスクレイピング、外部サイトへのHTTPアクセス、定期実行ジョブ、DB保存、`SCORE` 再計算本実装は行いません。将来の自動収集に備えて、情報元レジストリ、外部釣果データ型、データポリシーを先に整備します。

### 情報元レジストリ

外部情報元は `src/domain/externalSource.ts` の型と `src/data/externalSources.ts` のサンプルデータで管理します。

各情報元は以下を持ちます。

- 情報元ID、情報元名、種別。
- 対象エリア名。
- ベースURL。
- 自動収集ポリシー: `allowed` / `manualOnly` / `referenceOnly` / `unknown`。
- robots.txt確認状態。
- 利用規約確認状態。
- 注意事項。

`manualOnly` または `referenceOnly` のサイトは自動収集ジョブの対象にしません。`unknown` のサイトも、利用規約とrobots.txtを確認して明示的に判断するまでは自動収集しません。

### 外部釣果データ

外部釣果は `src/domain/externalCatch.ts` の `ExternalCatchRecord` として扱う想定です。

主な責務は以下です。

- 魚種、釣果日、エリア、釣り方、匹数、サイズなどの構造化データを保持する。
- `sourceId`、情報元名、出典URLを保持する。
- `manual` / `ai_assisted` / `auto` の取得方法を保持する。
- `high` / `medium` / `low` の信頼度を保持する。
- `exact` / `approximate` / `rounded` / `unknown` の座標精度区分を保持する。
- 天気、潮汐、海況などとの照合メモを保持し、将来の `SCORE` 改善に備える。

### 将来の自動収集ジョブ案

将来、自動収集を実装する場合は以下の流れを想定します。

1. 1日1回程度の低頻度で定期実行する。
2. source registryから情報元を読み込む。
3. `crawlPolicy` が `allowed` の情報元だけを候補にする。
4. `manualOnly` / `referenceOnly` / `unknown` の情報元は自動収集しない。
5. 利用規約、robots.txt、アクセス頻度、保存項目をジョブ設定とレビューで確認する。
6. 取得候補から記事本文や画像を保存せず、構造化データと出典URLだけに正規化する。
7. 取得データを直接確定せず、信頼度とレビュー状態を持たせる。
8. レビュー済みデータのみを釣果マスターまたはスコア計算用データに昇格する。
9. `SCORE` 反映時は、魚種、エリア、釣り方、サイズ/匹数、天気/潮汐などの環境条件一致、信頼度、鮮度を考慮する。

初期実装では、DB保存やSupabase連携は行わず、型とドキュメントで責務を分離しておきます。

## Post-MVP-004: 外部情報元レビュー後の収集ジョブ設計メモ

Post-MVP-004では、対象4サイトの調査結果を `docs/EXTERNAL_SOURCE_REVIEW.md` に整理し、`src/data/externalSources.ts` の `crawlPolicy`、`robotsStatus`、`termsStatus`、調査メモを更新しました。この段階では、スクレイピング処理、定期実行ジョブ、DB保存、外部釣果データのUI表示、外部データを使った `SCORE` 再計算は実装しません。

将来の収集ジョブを実装する場合は、起動時に source registry を読み込み、`crawlPolicy === "allowed"` の情報元だけを候補にします。`manualOnly`、`referenceOnly`、`unknown` はジョブ対象から除外します。特に `unknown` は未確認扱いであり、自動収集の暫定許可として扱いません。

収集ジョブ候補の処理順は以下を想定します。

1. `src/data/externalSources.ts` から情報元レジストリを読み込む。
2. `crawlPolicy` が `allowed` の情報元だけに絞る。
3. `robotsStatus` と `termsStatus` が収集可能な状態か再確認する。
4. 公式API、RSS、サイトマップなど、スクレイピングより安全な取得手段を優先する。
5. 取得頻度は初期案として1日1回程度以下に抑え、サイトごとの制約を優先する。
6. 保存対象は `ExternalCatchRecord` のような構造化データと出典URLに限定し、本文全文、画像、コメント全文は保存しない。
7. 取得データはすぐに `SCORE` へ反映せず、信頼度、取得方法、レビュー状態を持たせて検証できるようにする。

この設計により、法務・著作権・アクセス負荷のリスクが残る情報元をコード上でも収集対象から外せるようにします。
