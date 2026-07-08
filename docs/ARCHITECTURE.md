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
