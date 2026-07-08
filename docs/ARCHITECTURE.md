# アーキテクチャ

## 初期アーキテクチャ

MVP v0.1は、モックデータを利用するフロントエンド中心のWebアプリとして実装します。

推奨構成は以下です。

- フロントエンド: Next.js + TypeScript。
- スタイリング: Tailwind CSS またはシンプルな CSS Modules。
- 地図: 初期実装では MapLibre GL JS または Leaflet。
- データ: まずはローカルのモックデータ。
- CI: GitHub Actionsで install、lint、typecheck、buildを確認。

## 段階的な構成

### Stage 1: モックデータMVP

- 静的/モックの釣果情報。
- 地図マーカー表示。
- 魚種フィルタ。
- ルールベースの釣れそう度スコア。
- データベースなし。
- 外部スクレイピングなし。

### Stage 2: データ永続化

- Supabase/PostgreSQLを導入。
- 釣果情報、魚種、釣り場、出典、予測スコア用のテーブルを作成。
- 必要に応じて後から認証機能を追加。

### Stage 3: データ拡張

- 利用条件を満たす無料の潮汐データ。
- 利用条件を満たす無料の天気、風、波、水温データ。
- ユーザー提供のURL/本文からの釣果情報抽出。

### Stage 4: 高度な可視化

- 水深/海底地形レイヤー。
- 海底地形表示。
- Three.js、deck.gl、CesiumJSなどを使った任意の3D表示。

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
- sizeText
- resultLevel
- method
- sourceName
- sourceUrl
- notes

### FishSpecies

- id
- nameJa
- nameEn
- category
- seasonMonths

### FishingSpot

- id
- name
- areaName
- latitude
- longitude
- depthMeters
- spotType

### ForecastScore

- speciesId
- areaName または spotId
- score
- reasons
- calculatedAt

## 釣れそう度スコア v1

最初の釣れそう度スコアは、説明可能なルールベースで実装します。

スコア要素の例は以下です。

- 同じエリアの直近釣果。
- 同じ魚種の釣果。
- 月/季節との相性。
- モックデータ上の釣り場実績重み。
- 必要に応じた釣り方の一致。

アプリ上では、スコアだけでなく理由も表示します。

## 将来のAPI/データ方針

承認済みのIssueがない限り、有料APIや自動スクレイピングは追加しません。
